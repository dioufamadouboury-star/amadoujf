import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Google OAuth Configuration - Direct (sans Emergent)
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "966683628684-al8bu5bd9bhp1ftrc0oat9fkua6smpfq.apps.googleusercontent.com";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("auth_token"));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Check auth status on mount
  const checkAuth = useCallback(async () => {
    const savedToken = localStorage.getItem("auth_token");
    if (!savedToken) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      setUser(response.data);
      setToken(savedToken);
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      setToken(null);
      localStorage.removeItem("auth_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Register
  const register = async (name, email, password, phone = null) => {
    const response = await axios.post(
      `${API_URL}/api/auth/register`,
      { name, email, password, phone }
    );
    
    const { token: newToken, ...userData } = response.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("auth_token", newToken);
    
    return userData;
  };

  // Login
  const login = async (email, password) => {
    const response = await axios.post(
      `${API_URL}/api/auth/login`,
      { email, password }
    );
    
    const { token: newToken, ...userData } = response.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("auth_token", newToken);
    
    return userData;
  };

  // Google OAuth Login - Direct Implementation
  const loginWithGoogle = () => {
    const currentUrl = window.location.origin;
    const redirectUri = `${currentUrl}/auth/callback`;
    const scope = "openid email profile";
    const responseType = "code";
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=${responseType}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent`;
    
    window.location.href = googleAuthUrl;
  };

  // Process Google OAuth callback with authorization code
  const processGoogleCallback = async (code) => {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const response = await axios.post(`${API_URL}/api/auth/google/callback`, {
        code: code,
        redirect_uri: redirectUri
      });
      
      const { token: newToken, ...userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem("auth_token", newToken);
      
      return userData;
    } catch (error) {
      console.error("Google callback error:", error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem("auth_token");
    }
  };

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    register,
    login,
    loginWithGoogle,
    processGoogleCallback,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
