import type { BillingResources } from "./types/billing";

import { api } from "../client-fetch";

const resources = (): BillingResources => ({
  plans: () => api.get("/api/v1/plans", { next: { revalidate: 300 } }),
});

export const billingServices = resources();
