import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

function manualChunks(id: string) {
  const moduleId = id.replace(/\\/g, "/");
  if (
    moduleId.includes("/node_modules/leaflet/") ||
    moduleId.includes("/node_modules/react-leaflet/") ||
    moduleId.includes("/node_modules/@react-leaflet/")
  ) {
    return "map-vendor";
  }
  if (moduleId.includes("/node_modules/react/") || moduleId.includes("/node_modules/react-dom/")) {
    return "react-vendor";
  }
  if (moduleId.includes("/node_modules/@tanstack/react-query/")) {
    return "query-vendor";
  }
  if (moduleId.includes("/src/components/admin/") || moduleId.includes("/src/pages/AdminPlacesPage.tsx")) {
    return "admin";
  }
  if (moduleId.includes("/src/components/map/") || moduleId.includes("/src/pages/PublicMapPage.tsx")) {
    return "public-map";
  }
  return undefined;
}

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
  },
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
