import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Token 自动刷新的 Axios 封装
 *
 * 核心思路：响应拦截器捕获 401 → 刷新 Token → 重放失败请求
 * 刷新期间的并发请求排队等待，避免多次刷新
 */

type TokenPair = { accessToken: string; refreshToken: string };
type RefreshFn = (currentRefreshToken: string) => Promise<TokenPair>;

interface RequestConfig {
  getToken: () => TokenPair | null;
  setToken: (token: TokenPair) => void;
  clearToken: () => void;
  refreshTokenFn: RefreshFn;
  onRefreshFailed?: () => void;
}

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processPendingQueue = (token: string | null, error?: any) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    token ? resolve(token) : reject(error);
  });
  pendingQueue = [];
};

export const createRequest = (config: RequestConfig) => {
  const { getToken, setToken, clearToken, refreshTokenFn, onRefreshFailed } = config;

  const instance = axios.create({
    timeout: 60_000,
    headers: { 'Content-Type': 'application/json' },
  });

  // 请求拦截：注入 Token
  instance.interceptors.request.use((reqConfig: InternalAxiosRequestConfig) => {
    const tokenPair = getToken();
    if (tokenPair?.accessToken) {
      reqConfig.headers.Authorization = `Bearer ${tokenPair.accessToken}`;
    }
    return reqConfig;
  });

  // 响应拦截：401 时自动刷新 + 重放
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retried?: boolean };

      if (error.response?.status !== 401 || originalRequest._retried) {
        return Promise.reject(error);
      }

      originalRequest._retried = true;

      if (isRefreshing) {
        // 已经在刷新中，排队等待
        return new Promise<string>((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        const currentToken = getToken();
        if (!currentToken?.refreshToken) throw new Error('No refresh token');

        const newTokenPair = await refreshTokenFn(currentToken.refreshToken);
        setToken(newTokenPair);

        // 通知排队的请求
        processPendingQueue(newTokenPair.accessToken);

        // 重放当前请求
        originalRequest.headers.Authorization = `Bearer ${newTokenPair.accessToken}`;
        return instance(originalRequest);
      } catch (refreshError) {
        processPendingQueue(null, refreshError);
        clearToken();
        onRefreshFailed?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );

  return instance;
};

export default createRequest;
