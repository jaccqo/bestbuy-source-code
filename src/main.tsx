import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTheme, getPreferredTheme } from "./lib/theme.ts";
import { HashRouter } from "react-router-dom";

// Apply saved or system theme before React renders (no flash!)
applyTheme(getPreferredTheme());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);