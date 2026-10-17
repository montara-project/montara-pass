import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig({
  // Its modules carry "use client" one by one. Pre-bundled, the RSC
  // environment loses those directives (createContext runs on the server) and
  // the browser loads two copies of its context ("No QueryClient set").
  optimizeDeps: { exclude: ["@tanstack/react-query"] },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
