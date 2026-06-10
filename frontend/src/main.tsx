import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { APP_NAME } from "./config/app";
import { AdminPlacesPage } from "./pages/AdminPlacesPage";
import { GuidesPage } from "./pages/GuidesPage";
import { PublicMapPage } from "./pages/PublicMapPage";
import "./styles/app.css";

document.title = APP_NAME;

const queryClient = new QueryClient();

function App() {
  const path = window.location.pathname;
  if (path === "/admin") {
    return <AdminPlacesPage />;
  }
  if (path === "/guides" || path.startsWith("/guides/")) {
    return <GuidesPage />;
  }
  return <PublicMapPage />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
