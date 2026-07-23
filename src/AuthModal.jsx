import React, { useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "./AuthContext";

export default function AuthModal({ open, onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); 
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password, form.phone);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-head">
          <h3>{mode === "login" ? "Log In" : "Create Account"}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <>
              <input placeholder="Full Name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
              <input placeholder="Phone Number" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </>
          )}
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          <input type="password" placeholder="Password" value={form.password} onChange={(e) => update("password", e.target.value)} required />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-primary full" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? (
            <>Don't have an account? <a onClick={() => setMode("register")}>Sign up</a></>
          ) : (
            <>Already have an account? <a onClick={() => setMode("login")}>Log in</a></>
          )}
        </p>
      </div>

      <style>{`
        .auth-overlay{position:fixed; inset:0; background:rgba(11,43,36,0.5); z-index:300; display:flex; align-items:center; justify-content:center; padding:20px;}
        .auth-modal{background:var(--paper); border-radius:16px; width:380px; max-width:100%; padding:24px;}
        .auth-head{display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;}
        .auth-head h3{font-size:20px;}
        .auth-form{display:flex; flex-direction:column; gap:12px;}
        .auth-form input{border:1.5px solid var(--line); border-radius:9px; padding:11px 14px; font-size:14px; background:var(--cream);}
        .auth-error{color:var(--terracotta); font-size:13px; margin:0;}
        .auth-switch{text-align:center; font-size:13px; margin-top:16px; color:#5c6f68;}
        .auth-switch a{color:var(--forest); font-weight:700;}
      `}</style>
    </div>
  );
}
