const AUTH_STORAGE_KEYS = {
  token: "token",
  role: "role",
  userName: "user_name",
  user: "user",
  loginAt: "auth_login_at",
  lastActivityAt: "auth_last_activity_at",
} as const;

const AUTH_LOGOUT_EVENT = "auth:logout";
const DEFAULT_IDLE_TIMEOUT_MINUTES = 40; // 5 minutes of inactivity before considering the session idle and eligible for automatic logout
const DEFAULT_VALIDATION_INTERVAL_MS = 60_000;
const ACTIVITY_WRITE_THROTTLE_MS = 15_000;

const resolvePositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const AUTH_IDLE_TIMEOUT_MS =
  resolvePositiveNumber(
    import.meta.env.VITE_AUTH_IDLE_TIMEOUT_MINUTES,
    DEFAULT_IDLE_TIMEOUT_MINUTES
  ) * 60_000;

export const AUTH_SESSION_VALIDATION_INTERVAL_MS = resolvePositiveNumber(
  import.meta.env.VITE_AUTH_SESSION_VALIDATION_INTERVAL_MS,
  DEFAULT_VALIDATION_INTERVAL_MS
);

export const getAuthToken = () => localStorage.getItem(AUTH_STORAGE_KEYS.token);

export const hasAuthToken = () => Boolean(getAuthToken());

export const setAuthSession = (session: {
  token: string;
  role: string;
  userName: string;
  user?: unknown;
}) => {
  const now = Date.now().toString();

  localStorage.setItem(AUTH_STORAGE_KEYS.token, session.token);
  localStorage.setItem(AUTH_STORAGE_KEYS.role, session.role);
  localStorage.setItem(AUTH_STORAGE_KEYS.userName, session.userName);
  localStorage.setItem(AUTH_STORAGE_KEYS.loginAt, now);
  localStorage.setItem(AUTH_STORAGE_KEYS.lastActivityAt, now);

  if (session.user !== undefined) {
    localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(session.user));
  }
};

export const updateStoredUser = (user: { role?: string; name?: string } & Record<string, unknown>) => {
  localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
  localStorage.setItem(AUTH_STORAGE_KEYS.role, user.role ?? "user");
  localStorage.setItem(AUTH_STORAGE_KEYS.userName, user.name ?? "");
};

export const clearAuthStorage = () => {
  Object.values(AUTH_STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
};

export const touchSessionActivity = (now = Date.now()) => {
  if (!hasAuthToken()) {
    return;
  }

  const previousActivity = Number(localStorage.getItem(AUTH_STORAGE_KEYS.lastActivityAt));
  if (Number.isFinite(previousActivity) && now - previousActivity < ACTIVITY_WRITE_THROTTLE_MS) {
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEYS.lastActivityAt, now.toString());
};

export const ensureSessionTimestamps = (now = Date.now()) => {
  if (!hasAuthToken()) {
    return;
  }

  if (!localStorage.getItem(AUTH_STORAGE_KEYS.loginAt)) {
    localStorage.setItem(AUTH_STORAGE_KEYS.loginAt, now.toString());
  }

  if (!localStorage.getItem(AUTH_STORAGE_KEYS.lastActivityAt)) {
    localStorage.setItem(AUTH_STORAGE_KEYS.lastActivityAt, now.toString());
  }
};

export const isIdleSessionExpired = (now = Date.now()) => {
  const lastActivity = Number(localStorage.getItem(AUTH_STORAGE_KEYS.lastActivityAt));
  const loginAt = Number(localStorage.getItem(AUTH_STORAGE_KEYS.loginAt));
  const reference = Number.isFinite(lastActivity)
    ? lastActivity
    : Number.isFinite(loginAt)
      ? loginAt
      : now;

  return now - reference >= AUTH_IDLE_TIMEOUT_MS;
};

export const redirectToLogin = () => {
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
};

export const logoutClient = (reason = "manual", redirect = true) => {
  clearAuthStorage();
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT, { detail: { reason } }));

  if (redirect) {
    redirectToLogin();
  }
};

export const revokeCurrentToken = async () => {
  const token = getAuthToken();
  if (!token) {
    return;
  }

  const baseUrl = String(import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
  if (!baseUrl) {
    return;
  }

  try {
    await fetch(`${baseUrl}/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch {
    // Client cleanup still proceeds when the revoke request cannot be completed.
  }
};

export const performLogout = async (reason = "manual", redirect = true) => {
  await revokeCurrentToken();
  logoutClient(reason, redirect);
};

export { AUTH_LOGOUT_EVENT, AUTH_STORAGE_KEYS };
