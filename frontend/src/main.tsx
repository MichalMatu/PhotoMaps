import React from "react";
import ReactDOM from "react-dom/client";

import { AdminPlacesPage } from "./pages/AdminPlacesPage";
import { PublicMapPage } from "./pages/PublicMapPage";
import "./styles/app.css";

function App() {
  const path = window.location.pathname;
  if (path === "/admin") {
    return <AdminPlacesPage />;
  }
  return <PublicMapPage />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
