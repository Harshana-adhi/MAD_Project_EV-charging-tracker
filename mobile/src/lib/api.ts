import axios from 'axios';
import { API_URL } from './config';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export const api = axios.create({ baseURL: API_URL, timeout: 30000 });

api.interceptors.request.use((requestConfig) => {
  if (authToken) {
    requestConfig.headers.Authorization = `Bearer ${authToken}`;
  }
  return requestConfig;
});

api.interceptors.response.use(
  (response) => response.data.data,
  (error) => {
    if (!error.response) return Promise.reject(new Error('NETWORK_ERROR'));
    const code = error.response.data?.error?.code ?? 'SERVER_ERROR';
    // A blocked account is signed out the same way as an expired login.
    if (error.response.status === 401 || code === 'USER_BLOCKED') onUnauthorized?.();
    return Promise.reject(new Error(code));
  },
);
