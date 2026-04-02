import { useState, useCallback, useRef } from 'react';

// --- 类型 ---

export type TaskStatus = 'pending' | 'downloading' | 'done' | 'error' | 'cancelled';

export interface DownloadTask {
  id: string;
  fileName: string;
  url: string;
  size: number;
  status: TaskStatus;
  progress: number;       // 0-100
  loaded: number;         // 已下载字节
  error?: string;
  blob?: Blob;
}

export interface DownloadOptions {
  concurrency?: number;   // 最大并发数，默认 3
  retryCount?: number;    // 失败重试次数，默认 1
}

interface QueueItem {
  task: DownloadTask;
  retries: number;
  controller: AbortController;
}

// --- Hook ---

export function useConcurrentDownload(options: DownloadOptions = {}) {
  const { concurrency = 3, retryCount = 1 } = options;

  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // 用 ref 持有运行时状态，避免闭包陷阱
  const queueRef = useRef<QueueItem[]>([]);
  const activeCountRef = useRef(0);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const cancelledRef = useRef(false);

  // 更新单个任务状态
  const updateTask = useCallback((id: string, patch: Partial<DownloadTask>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  // 模拟单个文件下载（用 setTimeout 分段模拟进度）
  const downloadOne = useCallback((item: QueueItem): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const { task, controller } = item;
      const totalChunks = 10 + Math.floor(Math.random() * 10);
      const chunkSize = Math.ceil(task.size / totalChunks);
      // 随机决定是否模拟失败（约 15% 概率）
      const willFail = Math.random() < 0.15;
      const failAtChunk = willFail ? Math.floor(totalChunks * 0.6) : -1;
      let currentChunk = 0;
      let loaded = 0;

      const tick = () => {
        if (controller.signal.aborted) {
          reject(new DOMException('Download cancelled', 'AbortError'));
          return;
        }

        if (currentChunk >= totalChunks) {
          // 下载完成，生成一个假 blob
          const blob = new Blob([`fake-content-of-${task.fileName}`], { type: 'application/octet-stream' });
          resolve(blob);
          return;
        }

        if (currentChunk === failAtChunk) {
          reject(new Error('Network error (simulated)'));
          return;
        }

        currentChunk++;
        loaded = Math.min(loaded + chunkSize, task.size);
        const progress = Math.round((loaded / task.size) * 100);

        updateTask(task.id, { progress, loaded });

        // 每个 chunk 间隔 80-200ms，模拟网络延迟
        setTimeout(tick, 80 + Math.random() * 120);
      };

      // 启动前先延迟一小段，模拟连接建立
      setTimeout(tick, 100 + Math.random() * 200);
    });
  }, [updateTask]);

  // 从队列中取下一个 pending 任务执行
  const processNext = useCallback(() => {
    if (cancelledRef.current) return;

    const nextItem = queueRef.current.find(
      item => item.task.status === 'pending' || item.task.status === 'error',
    );
    if (!nextItem || activeCountRef.current >= concurrency) return;

    activeCountRef.current++;
    const { task } = nextItem;

    // 标记为下载中
    updateTask(task.id, { status: 'downloading', progress: 0, loaded: 0, error: undefined });
    nextItem.task = { ...nextItem.task, status: 'downloading' };

    const controller = new AbortController();
    nextItem.controller = controller;
    controllersRef.current.set(task.id, controller);

    downloadOne(nextItem)
      .then(blob => {
        updateTask(task.id, { status: 'done', progress: 100, loaded: task.size, blob });
        nextItem.task = { ...nextItem.task, status: 'done' };
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          updateTask(task.id, { status: 'cancelled', error: '已取消' });
          nextItem.task = { ...nextItem.task, status: 'cancelled' };
        } else if (nextItem.retries < retryCount) {
          // 重试
          nextItem.retries++;
          updateTask(task.id, { status: 'pending', progress: 0, loaded: 0, error: `失败，第 ${nextItem.retries} 次重试...` });
          nextItem.task = { ...nextItem.task, status: 'pending' };
        } else {
          updateTask(task.id, { status: 'error', error: err.message || '下载失败' });
          nextItem.task = { ...nextItem.task, status: 'error' };
        }
      })
      .finally(() => {
        activeCountRef.current--;
        controllersRef.current.delete(task.id);

        // 检查是否全部完成
        const allDone = queueRef.current.every(
          item => ['done', 'error', 'cancelled'].includes(item.task.status),
        );
        if (allDone) {
          setIsRunning(false);
        } else {
          // 继续处理队列
          processNext();
        }
      });

    // 尝试填满并发槽
    if (activeCountRef.current < concurrency) {
      setTimeout(processNext, 0);
    }
  }, [concurrency, retryCount, downloadOne, updateTask]);

  // 开始批量下载
  const startDownload = useCallback((files: Omit<DownloadTask, 'status' | 'progress' | 'loaded'>[]) => {
    cancelledRef.current = false;
    activeCountRef.current = 0;
    controllersRef.current.clear();

    const newTasks: DownloadTask[] = files.map(f => ({
      ...f,
      status: 'pending' as const,
      progress: 0,
      loaded: 0,
    }));

    setTasks(newTasks);
    setIsRunning(true);

    queueRef.current = newTasks.map(task => ({
      task,
      retries: 0,
      controller: new AbortController(),
    }));

    // 启动并发
    for (let i = 0; i < Math.min(concurrency, newTasks.length); i++) {
      processNext();
    }
  }, [concurrency, processNext]);

  // 重试失败的任务
  const retryFailed = useCallback(() => {
    const failedItems = queueRef.current.filter(item => item.task.status === 'error');
    if (failedItems.length === 0) return;

    cancelledRef.current = false;
    setIsRunning(true);

    for (const item of failedItems) {
      item.retries = 0;
      item.task = { ...item.task, status: 'pending' };
      updateTask(item.task.id, { status: 'pending', progress: 0, loaded: 0, error: undefined });
    }

    for (let i = 0; i < Math.min(concurrency, failedItems.length); i++) {
      processNext();
    }
  }, [concurrency, processNext, updateTask]);

  // 取消全部
  const cancelAll = useCallback(() => {
    cancelledRef.current = true;
    controllersRef.current.forEach(c => c.abort());
    controllersRef.current.clear();
    activeCountRef.current = 0;
    setIsRunning(false);

    setTasks(prev =>
      prev.map(t =>
        t.status === 'downloading' || t.status === 'pending'
          ? { ...t, status: 'cancelled' as const, error: '已取消' }
          : t,
      ),
    );
    queueRef.current.forEach(item => {
      if (item.task.status === 'downloading' || item.task.status === 'pending') {
        item.task = { ...item.task, status: 'cancelled' };
      }
    });
  }, []);

  // 取消单个
  const cancelOne = useCallback((id: string) => {
    const controller = controllersRef.current.get(id);
    if (controller) controller.abort();

    const item = queueRef.current.find(i => i.task.id === id);
    if (item && (item.task.status === 'pending' || item.task.status === 'downloading')) {
      item.task = { ...item.task, status: 'cancelled' };
      updateTask(id, { status: 'cancelled', error: '已取消' });
    }
  }, [updateTask]);

  // 清空
  const reset = useCallback(() => {
    cancelAll();
    setTasks([]);
    queueRef.current = [];
  }, [cancelAll]);

  return {
    tasks,
    isRunning,
    startDownload,
    retryFailed,
    cancelAll,
    cancelOne,
    reset,
  };
}
