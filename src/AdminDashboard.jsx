import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { adminApi, settingsApi } from "./api";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("products");

  
  if (!user || user.role !== "admin") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Access denied</h2>
        <p>You must be an admin to view this page.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 20 }}>Admin Dashboard</h1>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          borderBottom: "1px solid #444",
        }}
      >
        {["products", "orders", "users", "settings"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 18px",
              background: "none",
              border: "none",
              borderBottom:
                tab === t ? "2px solid #F0A202" : "2px solid transparent",
              color: tab === t ? "#F0A202" : "#ccc",
              cursor: "pointer",
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t === "products"
              ? "Products"
              : t === "orders"
                ? "Orders"
                : t === "users"
                  ? "Users"
                  : "Settings"}
          </button>
        ))}
      </div>

      {tab === "products" && <ProductsTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "users" && <UsersTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}


function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // product object or null

  async function load() {
    setLoading(true);
    try {
      const { products } = await adminApi.listProducts();
      setProducts(products);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    if (!confirm("Remove this product?")) return;
    try {
      await adminApi.deleteProduct(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <p>Loading products...</p>;
  if (error) return <p style={{ color: "salmon" }}>{error}</p>;

  return (
    <div>
      <button
        onClick={() => setEditing({})}
        style={{
          marginBottom: 16,
          padding: "8px 16px",
          background: "#F0A202",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        + Add Product
      </button>
      <button
        onClick={() => window.print()}
        style={{
          marginBottom: 16,
          marginLeft: 10,
          padding: "8px 16px",
          background: "#333",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Print Product List
      </button>

      {editing && (
        <ProductForm
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #444" }}>
            <th style={{ padding: 8 }}>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #333" }}>
              <td style={{ padding: 8 }}>{p.name}</td>
              <td>{p.cat}</td>
              <td>৳{p.price}</td>
              <td>{p.stock}</td>
              <td>{p.isActive ? "Active" : "Removed"}</td>
              <td>
                <button
                  onClick={() => setEditing(p)}
                  style={{ marginRight: 8 }}
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductForm({ product, onClose, onSaved }) {
  const isNew = !product.id;
  const [form, setForm] = useState({
    name: product.name || "",
    cat: product.cat || "",
    price: product.price || "",
    stock: product.stock || 0,
    img: product.img || "",
    desc: product.desc || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
      };
      if (isNew) await adminApi.createProduct(payload);
      else await adminApi.updateProduct(product.id, payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#1a1a1a",
        padding: 16,
        borderRadius: 8,
        marginBottom: 20,
        display: "grid",
        gap: 10,
      }}
    >
      <h3>{isNew ? "New Product" : "Edit Product"}</h3>
      {error && <p style={{ color: "salmon" }}>{error}</p>}
      <input
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
      <input
        placeholder="Category"
        value={form.cat}
        onChange={(e) => setForm({ ...form, cat: e.target.value })}
        required
      />
      <input
        placeholder="Price"
        type="number"
        value={form.price}
        onChange={(e) => setForm({ ...form, price: e.target.value })}
        required
      />
      <input
        placeholder="Stock"
        type="number"
        value={form.stock}
        onChange={(e) => setForm({ ...form, stock: e.target.value })}
      />
      <input
        placeholder="Image URL"
        value={form.img}
        onChange={(e) => setForm({ ...form, img: e.target.value })}
      />
      <textarea
        placeholder="Description"
        value={form.desc}
        onChange={(e) => setForm({ ...form, desc: e.target.value })}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}


function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    const { orders } = await adminApi.listOrders(filter || undefined);
    setOrders(orders);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function handleStatusChange(id, orderStatus) {
    try {
      await adminApi.updateOrderStatus(id, orderStatus);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  const statuses = [
    "placed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  return (
    <div>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: 16 }}
      >
        <option value="">All statuses</option>
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <button
        onClick={() => window.print()}
        style={{
          marginBottom: 16,
          marginLeft: 10,
          padding: "8px 16px",
          background: "#333",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Print Order List
      </button>

      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #444" }}>
              <th style={{ padding: 8 }}>Order #</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} style={{ borderBottom: "1px solid #333" }}>
                <td style={{ padding: 8 }}>{o.orderNumber}</td>
                <td>৳{o.total}</td>
                <td>
                  {o.paymentMethod} ({o.paymentStatus})
                </td>
                <td>{o.orderStatus}</td>
                <td>
                  <select
                    value={o.orderStatus}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => printOrder(o)}
                    style={{ marginLeft: 8 }}
                  >
                    Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  function printOrder(o) {
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Order ${o.orderNumber}</title>
      <style>
        body{font-family:sans-serif;padding:24px;color:#000;}
        h2{margin-bottom:4px;} table{width:100%;border-collapse:collapse;margin-top:16px;}
        td,th{border:1px solid #ccc;padding:8px;text-align:left;}
      </style></head><body>
      <h2>ShopHub — Order ${o.orderNumber}</h2>
      <p>Status: ${o.orderStatus} | Payment: ${o.paymentMethod} (${o.paymentStatus})</p>
      <p><b>Delivery Address:</b> ${o.shippingAddress?.fullName}, ${o.shippingAddress?.phone}, ${o.shippingAddress?.street}, ${o.shippingAddress?.city}</p>
      <table>
        <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
        ${(o.items || []).map((i) => `<tr><td>${i.name}</td><td>${i.qty}</td><td>৳${i.price}</td></tr>`).join("")}
      </table>
      <p style="margin-top:16px;"><b>Total: ৳${o.total}</b></p>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }
}


function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { users } = await adminApi.listUsers();
    setUsers(users);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRoleChange(uid, role) {
    try {
      await adminApi.changeUserRole(uid, role);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <p>Loading users...</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "1px solid #444" }}>
          <th style={{ padding: 8 }}>Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.uid} style={{ borderBottom: "1px solid #333" }}>
            <td style={{ padding: 8 }}>{u.name}</td>
            <td>{u.email}</td>
            <td>{u.phone || "-"}</td>
            <td>
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u.uid, e.target.value)}
              >
                <option value="customer">customer</option>
                <option value="seller">seller</option>
                <option value="admin">admin</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


function SettingsTab() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi.get().then(({ settings }) => setForm(settings));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const { settings } = await adminApi.updateSettings(form);
      setForm(settings);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <p>Loading settings...</p>;

  return (
    <div style={{ display: "grid", gap: 28, maxWidth: 640 }}>
      {error && <p style={{ color: "salmon" }}>{error}</p>}
      {saved && <p style={{ color: "#4caf50" }}>Settings saved.</p>}

      <section>
        <h3>Site Identity</h3>
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <label>
            Site Name
            <input
              value={form.siteName}
              onChange={(e) => update("siteName", e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Logo URL
            <input
              value={form.logoUrl}
              onChange={(e) => update("logoUrl", e.target.value)}
              placeholder="https://..."
              style={{ width: "100%" }}
            />
          </label>
          {form.logoUrl && (
            <img
              src={form.logoUrl}
              alt="logo preview"
              style={{ height: 40, marginTop: 4 }}
            />
          )}
        </div>
      </section>

      <section>
        <h3>Flash Sale</h3>
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <label>
            Flash Sale End Time
            <input
              type="datetime-local"
              value={
                form.flashSaleEndTime ? form.flashSaleEndTime.slice(0, 16) : ""
              }
              onChange={(e) =>
                update(
                  "flashSaleEndTime",
                  e.target.value ? new Date(e.target.value).toISOString() : "",
                )
              }
              style={{ width: "100%" }}
            />
          </label>
          <p style={{ fontSize: 13, color: "#999" }}>
            Countdown on the homepage counts down to this moment. Leave empty to
            hide the timer.
          </p>
        </div>
      </section>

      <section>
        <h3>Hero Banner</h3>
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <label>
            Eyebrow text
            <input
              value={form.heroEyebrow}
              onChange={(e) => update("heroEyebrow", e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Headline
            <input
              value={form.heroTitle}
              onChange={(e) => update("heroTitle", e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Subtitle
            <textarea
              value={form.heroSubtitle}
              onChange={(e) => update("heroSubtitle", e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
        </div>
      </section>

      <section>
        <h3>Promo Cards</h3>
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <label>
            Promo 1 — Tag
            <input
              value={form.promo1Tag}
              onChange={(e) => update("promo1Tag", e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Promo 1 — Title
            <input
              value={form.promo1Title}
              onChange={(e) => update("promo1Title", e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Promo 2 — Tag
            <input
              value={form.promo2Tag}
              onChange={(e) => update("promo2Tag", e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Promo 2 — Title
            <input
              value={form.promo2Title}
              onChange={(e) => update("promo2Title", e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "10px 20px",
          background: "#F0A202",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
