import type { ItemResponse } from "../../client-fetch";
import type { Models } from "../../models";

export type BillingResources = {
  /** The plans on offer; public, and read again at most every five minutes. */
  plans: () => Promise<ItemResponse<Models.Plan[]>>;
};
