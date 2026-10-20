import axios from "axios";

const API_BASE_URL = "https://yuvatimes.onrender.com";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Abort requests that hang so optimistic UI rollback always fires.
  timeout: 15000,
});

// Response interceptor — unwrap data, normalize errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  },
);

export default api;
export { API_BASE_URL };
