const API_BASE_URL = "http://localhost:5000/api";

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

const roleKey = (role) => (role || "").toLowerCase();

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
    const message = data.message || "Request failed";
    throw new Error(message);
  }

  return data;
};
