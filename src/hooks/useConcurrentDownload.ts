import { useState, useCallback, useRef, useEffect } from 'react';

// --- 类型 ---

export type TaskStatus = 'pending' | 'downloading' | 'done' | 'error' | 'cancelled';

export interface DownloadTask {
  id: string;
  fileName: string;
  url: string;
  size: number;
  status: TaskStatus;
  progress: number;
  loaded: number;
  error?: string;
  blob?: Blob;
}

export interface DownloadOptions {
  concurrency?: number;
  retryCount?: number;
}

interface QueueItem {
  task: DownloadTask;
  retries: number;
  controller: AbortController;
}

// --- Hook ---

export function useConcurrentDownload(options: DownloadOptions = {}) {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // 用 ref 持有运行时配置，避免闭包捕获旧值
  const concurrencyRef = useRef(options.concurrency ?? 3);
  const retryCountRef = useRef(options.retryCount ?? 1);

  // options 变化时同步到 ref
  useEffect(() => {
    concurrencyRef.current = options.concurrency ?? 3;
  }, [options.concurrency]);
  useEffect(() => {
    retryCountRef.current = options.retryCount ?? 1;
  }, [options.retryCount]);

  const queueRef = useRef<QueueItem[]>([]);
  const activeCountRef = useRef(0);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);

  // 组件卸载时标记，防止对已卸载组件 setState
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // 卸载时中断所有进行中的下载
      controllersRef.current.forEach(c => c.abort());
      controllersRef.current.clear();
    };
  }, []);

  // 安全的 setState 包装
  const safeSetTasks: typeof setTasks = useCallback(
    (action) => { if (mountedRef.current) setTasks(action); },
    [],
  );

  // 更新单个任务状态
  const updateTask = useCallback((id: string, patch: Partial<DownloadTask>) => {
    safeSetTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, [safeSetTasks]);

  // 模拟单个文件下载（用 setTimeout 分段模拟进度）
  const downloadOne = useCallback((item: QueueItem): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const { task, controller } = item;
      const totalChunks = 10 + Math.floor(Math.random() * 10);
      const chunkSize = Math.ceil(task.size / totalChunks);
      const willFail = Math.random() < 0.15;
      const failAtChunk = willFail ? Math.floor(totalChunks * 0.6) : -1;
      let currentChunk = 0;
      let loaded = 0;
      let timerId: ReturnType<typeof setTimeout>;

      // abort 时清理 timer
      const onAbort = () => {
        clearTimeout(timerId);
        reject(new DOMException('Download cancelled', 'AbortError'));
      };
      controller.signal.addEventListener('abort', onAbort, { once: true });

      const tick = () => {
        if (controller.signal.aborted) return;

        if (currentChunk >= totalChunks) {
          controller.signal.removeEventListener('abort', onAbort);
          const blob = new Blob([`fake-content-of-${task.fileName}`], { type: 'application/octet-stream' });
          resolve(blob);
          return;
        }

        if (currentChunk === failAtChunk) {
          controller.signal.removeEventListener('abort', onAbort);
          reject(new Error('Network error (simulated)'));
          return;
        }

        currentChunk++;
        loaded = Math.min(loaded + chunkSize, task.size);
        const progress = Math.round((loaded / task.size) * 100);
        updateTask(task.id, { progress, loaded });

        timerId = setTimeout(tick, 80 + Math.random() * 120);
      };

      timerId = setTimeout(tick, 100 + Math.random() * 200);
    });
  }, [updateTask]);

  // 从队列中取下一个 pending 任务执行（只拾取 pending，不拾取 error）
  const processNext = useCallback(() => {
    if (cancelledRef.current) return;
    if (activeCountRef.current >= concurrencyRef.current) return;

    const nextItem = queueRef.current.find(item => item.task.status === 'pending');
    if (!nextItem) return;

    activeCountRef.current++;
    const { task } = nextItem;

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
        } else if (nextItem.retries < retryCountRef.current) {
          nextItem.retries++;
          updateTask(task.id, {
            status: 'pending', progress: 0, loaded: 0,
            error: `失败，第 ${nextItem.retries} 次重试...`,
          });
          nextItem.task = { ...nextItem.task, status: 'pending' };
        } else {
          updateTask(task.id, { status: 'error', error: err.message || '下载失败' });
          nextItem.task = { ...nextItem.task, status: 'error' };
        }
      })
      .finally(() => {
        activeCountRef.current--;
        controllersRef.current.delete(task.id);

        const allSettled = queueRef.current.every(
          item => ['done', 'error', 'cancelled'].includes(item.task.status),
        );
        if (allSettled) {
          if (mountedRef.current) setIsRunning(false);
        } else {
          processNext();
        }
      });

    // 尝试填满并发槽
    if (activeCountRef.current < concurrencyRef.current) {
      setTimeout(processNext, 0);
    }
  }, [downloadOne, updateTask]);

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

    safeSetTasks(newTasks);
    setIsRunning(true);

    queueRef.current = newTasks.map(task => ({
      task,
      retries: 0,
      controller: new AbortController(),
    }));

    const startCount = Math.min(concurrencyRef.current, newTasks.length);
    for (let i = 0; i < startCount; i++) {
      processNext();
    }
  }, [processNext, safeSetTasks]);

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

    const startCount = Math.min(concurrencyRef.current, failedItems.length);
    for (let i = 0; i < startCount; i++) {
      processNext();
    }
  }, [processNext, updateTask]);

  // 取消全部
  const cancelAll = useCallback(() => {
    cancelledRef.current = true;
    controllersRef.current.forEach(c => c.abort());
    controllersRef.current.clear();
    activeCountRef.current = 0;
    setIsRunning(false);

    safeSetTasks(prev =>
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
  }, [safeSetTasks]);

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
    safeSetTasks([]);
    queueRef.current = [];
  }, [cancelAll, safeSetTasks]);

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
