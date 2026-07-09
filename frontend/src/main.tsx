import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PublicMapPage } from "./pages/PublicMapPage";
import { TtsProvider } from "./components/ui/TtsProvider";
import "./styles/app.css";

const queryClient = new QueryClient();
const AdminPlacesPage = lazy(() =>
  import("./pages/AdminPlacesPage").then((module) => ({ default: module.AdminPlacesPage })),
);
const GuidesPage = lazy(() => import("./pages/GuidesPage").then((module) => ({ default: module.GuidesPage })));
const PlaceDetailPage = lazy(() =>
  import("./pages/PlaceDetailPage").then((module) => ({ default: module.PlaceDetailPage })),
);

function RouteLoadingState() {
  return (
    <main className="page-shell">
      <section className="ui-panel" role="status">
        <p>Ładowanie widoku...</p>
      </section>
    </main>
  );
}

function App() {
  const path = window.location.pathname;
  if (path === "/admin") {
    return (
      <Suspense fallback={<RouteLoadingState />}>
        <AdminPlacesPage />
      </Suspense>
    );
  }
  if (path === "/guides" || path.startsWith("/guides/")) {
    return (
      <Suspense fallback={<RouteLoadingState />}>
        <GuidesPage />
      </Suspense>
    );
  }
  if (path.startsWith("/places/")) {
    return (
      <Suspense fallback={<RouteLoadingState />}>
        <PlaceDetailPage />
      </Suspense>
    );
  }
  return <PublicMapPage />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TtsProvider>
        <App />
      </TtsProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
