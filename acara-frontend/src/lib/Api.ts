import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor (auth token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor (global error handling)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");

      // Don't redirect if the failed request was the login endpoint and prevents an infinite loop of redirects if the user is already on the login page
      const requestUrl = error.config?.url || "";
      const onLoginPage = window.location.pathname === "/login";
      const isLoginRequest = requestUrl.includes("/login");

      if (!onLoginPage && !isLoginRequest) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
