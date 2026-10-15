import { LEDGER, LEDGER_LABEL } from "@/components/pricing/ledger";

/**
 * The proof column: what the server holds, and what it cannot read.
 *
 * Static evidence, deliberately. It never competes with the tape for attention
 * — it is the answer to the question a pricing page for a password manager has
 * to answer before the price matters.
 */
export function PricingLedger() {
  return (
    <aside className="ledger" aria-labelledby="ledger-title">
      <h2 id="ledger-title" className="ledger-title">
        What our server can see
      </h2>

      <dl className="ledger-rows">
        {LEDGER.map((row) => (
          <div key={row.field} className="ledger-row" data-state={row.state}>
            <dt>{row.field}</dt>
            <dd>
              <span className="ledger-dot" aria-hidden="true" />
              {row.label ?? LEDGER_LABEL[row.state]}
            </dd>
          </div>
        ))}
      </dl>

      <p className="ledger-foot">
        The same on every tier, the free one included. Paying buys the running of a server, never a
        key to the vault.
      </p>
    </aside>
  );
}
