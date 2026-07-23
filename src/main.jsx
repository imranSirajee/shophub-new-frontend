import React from "react";
import ReactDOM from "react-dom/client";
import ShopHubApp from "./ShopHubApp.jsx";
import { AuthProvider } from "./AuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ShopHubApp />
    </AuthProvider>
  </React.StrictMode>
);
