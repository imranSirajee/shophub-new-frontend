const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/";

function getToken() {
  return localStorage.getItem("shophub_token");
}
function setToken(token) {
  if (token) localStorage.setItem("shophub_token", token);
  else localStorage.removeItem("shophub_token");
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const authApi = {
  register: (payload) =>
    request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  logout: () => request("/auth/logout", { method: "POST", auth: true }),
  me: () => request("/auth/me", { auth: true }),
  updateMe: (payload) =>
    request("/auth/me", { method: "PUT", body: payload, auth: true }),
  forgotPassword: (email) =>
    request("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (oobCode, password) =>
    request(`/auth/reset-password/${oobCode}`, {
      method: "PUT",
      body: { password },
    }),
};


export const productsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(
          ([, v]) => v !== undefined && v !== "" && v !== "All",
        ),
      ),
    ).toString();
    return request(`/products${qs ? `?${qs}` : ""}`);
  },
  get: (idOrSlug) => request(`/products/${idOrSlug}`),
  related: (id) => request(`/products/${id}/related`),
};


export const cartApi = {
  get: () => request("/cart", { auth: true }),
  addItem: (productId, qty = 1, color, size) =>
    request("/cart/items", {
      method: "POST",
      body: { productId, qty, color, size },
      auth: true,
    }),
  updateQty: (productId, qty) =>
    request(`/cart/items/${productId}`, {
      method: "PUT",
      body: { qty },
      auth: true,
    }),
  removeItem: (productId) =>
    request(`/cart/items/${productId}`, { method: "DELETE", auth: true }),
  clear: () => request("/cart", { method: "DELETE", auth: true }),
};


export const ordersApi = {
  create: (payload) =>
    request("/orders", { method: "POST", body: payload, auth: true }),
  myOrders: () => request("/orders/my", { auth: true }),
  get: (id) => request(`/orders/${id}`, { auth: true }),
  getByNumber: (orderNumber) =>
    request(`/orders/by-number/${orderNumber}`, { auth: true }),
};


export const paymentsApi = {
  initiateBkash: (orderId) =>
    request("/payments/bkash/initiate", {
      method: "POST",
      body: { orderId },
      auth: true,
    }),
  initiateSslcommerz: (orderId) =>
    request("/payments/sslcommerz/initiate", {
      method: "POST",
      body: { orderId },
      auth: true,
    }),
};

export const adminApi = {
  listUsers: () => request("/admin/users", { auth: true }),
  changeUserRole: (uid, role) =>
    request(`/admin/users/${uid}/role`, {
      method: "PUT",
      body: { role },
      auth: true,
    }),

  listProducts: () => request("/admin/products", { auth: true }),
  createProduct: (payload) =>
    request("/admin/products", { method: "POST", body: payload, auth: true }),
  updateProduct: (id, payload) =>
    request(`/admin/products/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    }),
  deleteProduct: (id) =>
    request(`/admin/products/${id}`, { method: "DELETE", auth: true }),

  listOrders: (status) =>
    request(`/admin/orders${status ? `?status=${status}` : ""}`, {
      auth: true,
    }),
  updateOrderStatus: (id, orderStatus) =>
    request(`/admin/orders/${id}/status`, {
      method: "PUT",
      body: { orderStatus },
      auth: true,
    }),

  updateSettings: (payload) =>
    request("/admin/settings", { method: "PUT", body: payload, auth: true }),
};


export const settingsApi = {
  get: () => request("/settings"),
};

export { getToken, setToken };