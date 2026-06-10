import React from "react";
import ReactDOM from "react-dom/client";

import { APP_NAME } from "./config/app";
import { AdminPlacesPage } from "./pages/AdminPlacesPage";
import { PublicMapPage } from "./pages/PublicMapPage";
import "./styles/app.css";

document.title = APP_NAME;

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
