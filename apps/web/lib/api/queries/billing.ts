import { queryOptions } from "@tanstack/react-query";

import { services } from "../services";

export const BILLING_QUERY_KEY = "billing";

/**
 * Prefetched on the server and hydrated. The API does not answer this site's
 * origin from the browser (CORS is off unless configured), so the plans a page
 * was rendered with are never refetched there, and a failure is not retried.
 */
const plans = () =>
  queryOptions({
    queryKey: [BILLING_QUERY_KEY, "plans"],
    queryFn: async () => (await services.billing.plans()).data ?? [],
    staleTime: Infinity,
    retry: false,
  });

export const billingQueries = { plans } as const;
