import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000",
  withCredentials: true,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message = error.response.data?.error ?? "Something went wrong";
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  },
);
