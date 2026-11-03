import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const TOKEN_KEY = "crm_token";
const WAKING_AFTER_MS = 3000;

const api = axios.create({
  baseURL: API_BASE_URL,
  // Generous timeout so a free-tier cold start is not aborted.
  timeout: 60000,
});

// ---------- token helpers ----------
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

// ---------- cold-start ("waking") state ----------
const listeners = new Set();
let waking = false;
let pending = 0;
let timer = null;

function setWaking(value) {
  if (waking === value) return;
  waking = value;
  listeners.forEach((cb) => cb(waking));
}

export function onWaking(callback) {
  listeners.add(callback);
  callback(waking);
  return () => listeners.delete(callback);
}

function requestStarted() {
  pending += 1;
  if (!timer) timer = setTimeout(() => setWaking(true), WAKING_AFTER_MS);
}

function requestFinished() {
  pending = Math.max(0, pending - 1);
  if (pending === 0 && timer) {
    clearTimeout(timer);
    timer = null;
  }
}

api.interceptors.request.use((config) => {
  requestStarted();
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    requestFinished();
    setWaking(false);
    return response;
  },
  (error) => {
    requestFinished();
    const status = error.response?.status;
    if ([502, 503, 504].includes(status) || (!error.response && !axios.isCancel(error))) {
      setWaking(true);
    } else {
      setWaking(false);
    }
    if (status === 401 && !String(error.config?.url || "").includes("/auth/")) {
      setToken(null);
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export default api;
