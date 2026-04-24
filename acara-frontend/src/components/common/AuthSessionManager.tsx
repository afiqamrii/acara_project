import { useEffect } from "react";
import api from "../../lib/Api";
import {
  AUTH_LOGOUT_EVENT,
  AUTH_SESSION_VALIDATION_INTERVAL_MS,
  ensureSessionTimestamps,
  hasAuthToken,
  isIdleSessionExpired,
  logoutClient,
  performLogout,
  touchSessionActivity,
} from "../../lib/auth";

const AuthSessionManager = () => {
  useEffect(() => {
    let lastValidationAt = 0;
    let isLoggingOut = false;

    const validateServerSession = async (force = false) => {
      if (!hasAuthToken()) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastValidationAt < AUTH_SESSION_VALIDATION_INTERVAL_MS) {
        return;
      }

      lastValidationAt = now;

      try {
        await api.get("/user");
      } catch {
        // The global axios interceptor handles unauthorized responses.
      }
    };

    const enforceSession = async (validateServer = false, forceServer = false) => {
      if (!hasAuthToken()) {
        return;
      }

      ensureSessionTimestamps();

      if (isIdleSessionExpired()) {
        if (!isLoggingOut) {
          isLoggingOut = true;
          await performLogout("idle");
        }
        return;
      }

      if (validateServer) {
        await validateServerSession(forceServer);
      }
    };

    const handleActivity = () => {
      touchSessionActivity();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void enforceSession(true, false);
      }
    };

    const handleFocus = () => {
      void enforceSession(true, false);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "token" && !event.newValue) {
        logoutClient("remote_logout");
        return;
      }

      if (event.key === "token" && event.newValue) {
        ensureSessionTimestamps();
        void enforceSession(true, true);
      }
    };

    const resetLogoutFlag = () => {
      isLoggingOut = false;
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "click",
      "focus",
      "keydown",
      "mousedown",
      "scroll",
      "touchstart",
    ];

    ensureSessionTimestamps();
    void enforceSession(true, true);

    const intervalId = window.setInterval(() => {
      void enforceSession(false, false);
    }, 30_000);

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    window.addEventListener(AUTH_LOGOUT_EVENT, resetLogoutFlag as EventListener);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(AUTH_LOGOUT_EVENT, resetLogoutFlag as EventListener);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
};

export default AuthSessionManager;
