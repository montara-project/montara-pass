import { ArrowRightIcon } from "@/components/icons";
import { APP_URL } from "@/components/links";
import { Dim, Statement, Check, chip, card } from "@/components/shared";

/** A plan of the hosted service (apps/server internal/models/billing.go). */
type Plan = {
  code: string;
  name: string;
  billing: "recurring" | "one_time";
  billing_interval: "month" | "year" | null;
  amount: number;
  currency: string;
};

/**
 * The plans the hosted service has on offer, read again at most every five
 * minutes. None when it cannot be reached: the card then says Cloud is not
 * for sale yet, as it did before there were plans.
 */
async function plansOnOffer(): Promise<Plan[]> {
  try {
    const res = await fetch(`${APP_URL}/api/v1/plans`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: Plan[] };
    return body.data ?? [];
  } catch {
    return [];
  }
}

/** Its price, from cents, which the API counts every currency in. */
function price(plan: Plan) {
  const digits = 2;
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency: plan.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(plan.amount / 10 ** digits);
  return { amount, per: plan.billing_interval ? `per ${plan.billing_interval}` : "once" };
}

export async function Pricing() {
  const plans = await plansOnOffer();

  return (
    <section className="border-t border-line pb-20 sm:pb-28">
      <Statement
        title={
          <>
            Free to run. <Dim>Or let us host it.</Dim>
          </>
        }
      >
        Self-hosting costs you a server and nothing to us. Cloud runs the server for you, from $3 a
        month.
      </Statement>

      <div className="mx-auto -mt-8 grid max-w-4xl gap-6 px-6 md:grid-cols-2">
        <article className={`${card} flex flex-col`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">Self-hosted</h3>
            <span className={`${chip} inline-flex items-center gap-1.5`}>
              <span className="size-1.5 rounded-full bg-accent-bright" />
              available now
            </span>
          </div>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="font-heading text-5xl font-medium tracking-tight">$0</span>
            <span className="font-mono text-xs lowercase text-mist">forever</span>
          </p>
          <ul className="mt-6 flex flex-1 flex-col gap-3">
            <Check>Web app, browser extension and API</Check>
            <Check>Sharing with roles and key rotation</Check>
            <Check>Your server, your PostgreSQL, your backups</Check>
            <Check>No tiers. Every feature is in the image</Check>
          </ul>
          <a href="#self-host" className="btn btn-primary mt-8">
            Self-host
            <ArrowRightIcon className="size-4" />
          </a>
        </article>

        {plans.length > 0 ? (
          <CloudPlans plans={plans} />
        ) : (
          <article className={`${card} flex flex-col`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium">Cloud</h3>
              <span className={chip}>priced</span>
            </div>
            <p className="mt-5 text-[15px] leading-7 text-mist">
              We run the server and PostgreSQL for you. The same encryption, done in your browser —
              and a free account if you are not ready to pay for it.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              <Check>Free account, or Pro from $3 a month</Check>
              <Check>The same encryption, done in your browser</Check>
              <Check>No Docker, no migrations</Check>
            </ul>
            <a href="/pricing" className="btn btn-primary mt-8">
              See the prices
              <ArrowRightIcon className="size-4" />
            </a>
          </article>
        )}
      </div>

      <p className="mx-auto mt-10 max-w-xl text-balance px-6 text-center font-mono text-xs leading-5 text-mist">
        Self-hosting needs Docker, PostgreSQL 18, a domain and a Resend API key for sign-in emails.
      </p>
      <p className="mt-3 px-6 text-center text-sm text-mist">
        Need a business plan?{" "}
        <a
          href="/contact"
          className="cursor-pointer font-medium text-fg underline-offset-4 hover:underline"
        >
          Contact us
        </a>
      </p>
    </section>
  );
}

/** The hosted service once it has plans: each one leads to billing in the web app. */
function CloudPlans({ plans }: { plans: Plan[] }) {
  return (
    <article className={`${card} flex flex-col`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">Cloud</h3>
        <span className={`${chip} inline-flex items-center gap-1.5`}>
          <span className="size-1.5 rounded-full bg-accent-bright" />
          available now
        </span>
      </div>
      <ul className="mt-5 flex flex-1 flex-col divide-y divide-line">
        {plans.map((plan) => {
          const { amount, per } = price(plan);
          return (
            <li key={plan.code} className="flex items-center justify-between gap-4 py-3 first:pt-0">
              <div className="flex min-w-0 flex-col">
                <span className="font-medium">{plan.name}</span>
                <span className="flex items-baseline gap-2">
                  <span className="font-heading text-2xl font-medium tracking-tight">{amount}</span>
                  <span className="font-mono text-xs lowercase text-mist">{per}</span>
                </span>
              </div>
              <a
                href={`${APP_URL}/billing?plan=${encodeURIComponent(plan.code)}`}
                className="btn btn-primary shrink-0"
              >
                {plan.billing === "recurring" ? "Subscribe" : "Buy"}
                <ArrowRightIcon className="size-4" />
              </a>
            </li>
          );
        })}
      </ul>
      <ul className="mt-6 flex flex-col gap-3">
        <Check>The same encryption, done in your browser</Check>
        <Check>We run the server and PostgreSQL</Check>
        <Check>Paid through Lemon Squeezy</Check>
      </ul>
    </article>
  );
}
