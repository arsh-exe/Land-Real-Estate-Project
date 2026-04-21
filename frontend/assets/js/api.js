const SERVER_URL = "https://land-real-estate-project-production.up.railway.app";
const API_BASE_URL = `${SERVER_URL}/api`;

const getToken = () => localStorage.getItem("lrs_token");
const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("lrs_user") || "null");
  } catch (error) {
    return null;
  }
};

const setAuth = (token, user) => {
  localStorage.setItem("lrs_token", token);
  localStorage.setItem("lrs_user", JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem("lrs_token");
  localStorage.removeItem("lrs_user");
};

// Toast notification system
const showToast = (message, type = "success", duration = 3000) => {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  // Add icon based on type
  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️"
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("toast-closing");
    setTimeout(() => toast.remove(), 400);
  }, duration);
};

const roleKey = (role) => String(role || "").trim().toLowerCase();

const buildHeaders = (isFormData = false) => {
  const headers = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const apiRequest = async (path, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(isFormData),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAuth();
      window.location.href = "/pages/login.html";
      throw new Error("Session expired. Please log in again.");
    }
    const message = data.message || "Request failed";
    throw new Error(message);
  }

  return data;
};
