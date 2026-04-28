import axios from "axios";
import { logoutClient } from "./auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

// Request interceptor (auth token)
api.interceptors.request.use((config) => {
  const requestUrl = config.url || "";
  const isPublicMarketplaceRequest = requestUrl.startsWith("/marketplace/services");
  const token = localStorage.getItem("token");

  if (token && !isPublicMarketplaceRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor (global error handling)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if the failed request was the login endpoint and prevents an infinite loop of redirects if the user is already on the login page
      const requestUrl = error.config?.url || "";
      const onLoginPage = window.location.pathname === "/login";
      const isLoginRequest = requestUrl.includes("/login");

      if (!isLoginRequest) {
        logoutClient("unauthorized", !onLoginPage);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
