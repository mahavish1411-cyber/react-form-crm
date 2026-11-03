/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import api, { getToken, setToken } from "../api/client";

const AuthContext = createContext(null);
const USER_KEY = "crm_user";

function readUser() {
  if (!getToken()) return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || { email: "", role: "admin" };
  } catch {
    return { email: "", role: "admin" };
  }
}

function persist(data) {
  setToken(data.token);
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  } catch {
    /* storage unavailable */
  }
  return data.user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(persist(data));
  }, []);

  const demoLogin = useCallback(async () => {
    const { data } = await api.post("/auth/demo");
    setUser(persist(data));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* storage unavailable */
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, demoLogin, logout }),
    [user, login, demoLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
