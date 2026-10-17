import { environmentManager, QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Above zero so what the server rendered is not fetched again on mount.
      queries: { staleTime: 60 * 1000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * A new client per server render, so no visitor's cache reaches another; one
 * client for the browser's whole visit. Kept out of the "use client" provider
 * so server components can prefetch with it.
 */
export function getQueryClient() {
  if (environmentManager.isServer()) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
