// Billing, Cloud Edition only (apps/server internal/models/billing.go).
// Amounts are in the currency's minor unit.

/** A plan as `GET /api/v1/plans` serves it; only the fields the site reads. */
export interface Plan {
  code: string;
  name: string;
  billing: "recurring" | "one_time";
  billing_interval: "month" | "year" | null;
  amount: number;
  currency: string;
}
