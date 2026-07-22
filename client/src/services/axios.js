import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,

  timeout: 15000,
});


let accessToken = null;
let unauthorizedHandler = null;

export const setAccessToken = (token) => {
  accessToken = token;
};


export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});


let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh-token');


    if (status === 401 && !originalRequest?._retry && !isRefreshCall) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh-token').finally(() => {
            refreshPromise = null;
          });
        }
        const refreshResponse = await refreshPromise;
        const newToken = refreshResponse.data?.data?.accessToken;

        if (newToken) {
          setAccessToken(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest); 
        }
      } catch {
        // Refresh itself failed — fall through to unauthorizedHandler below.
      }

      if (unauthorizedHandler) unauthorizedHandler();
    }

    return Promise.reject(error);
  }
);


export const unwrap = async (requestPromise) => {
  try {
    const response = await requestPromise;
    return response.data.data;
  } catch (error) {
    const backendError = error.response?.data?.error;
    let message = backendError?.message;
    if (!message) {
      if (error.code === 'ECONNABORTED') {
        message = 'The request took too long to respond. Please check your connection and try again.';
      } else if (!error.response) {
        message = 'Unable to reach the server. Please check your connection and try again.';
      } else {
        message = error.message || 'Something went wrong. Please try again.';
      }
    }
    const wrapped = new Error(message);
    wrapped.code = backendError?.code;
    wrapped.details = backendError?.details;
    wrapped.status = error.response?.status;
    throw wrapped;
  }
};

export default api;