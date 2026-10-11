import { chip } from "@/components/shared";
import pkg from "@/package.json";

const surfaces = [
  { id: "all", label: "all" },
  { id: "app", label: "web app" },
  { id: "extension", label: "extension" },
  { id: "api", label: "api" },
];

const features = [
  {
    title: "Logins and secure notes",
    body: "Two item types. The type is the only field stored in the clear, so clients can filter by it.",
    on: ["app", "extension", "api"],
  },
  {
    title: "Fill on click",
    body: "A badge in login fields lists the logins saved for that site. Nothing is filled until you pick one.",
    on: ["extension"],
  },
  {
    title: "Host matching",
    body: "A login is offered on its saved host and that host's subdomains. example.com.evil.net gets nothing.",
    on: ["extension"],
  },
  {
    title: "Password generator",
    body: "Saving a login from the popup generates a password for it. 20 characters by default.",
    on: ["extension"],
  },
  {
    title: "Sharing with roles",
    body: "Share one item with another user as editor or viewer. Every item has exactly one owner.",
    on: ["app", "api"],
  },
  {
    title: "Key rotation on revoke",
    body: "Removing a member re-encrypts the item under a new key, wrapped for whoever is left.",
    on: ["app", "api"],
  },
  {
    title: "Folders, favorites, trash",
    body: "Folder names are encrypted. Folder and favorite stay personal, even on a shared item.",
    on: ["app", "api"],
  },
  {
    title: "Auto-lock",
    body: "The web app locks on reload. The extension locks after 15 minutes without use, or when the browser closes.",
    on: ["app", "extension"],
  },
  {
    title: "Conflict-safe edits",
    body: "Every write names the revision it read. A stale one gets 409 Conflict instead of overwriting.",
    on: ["app", "api"],
  },
];

export function FeatureMatrix() {
  return (
    <section id="features" className="matrix border-t border-line">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-10">
        <p className="font-mono text-xs lowercase text-mist">
          {features.length} features in v{pkg.version}. filter by where they run.
        </p>
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">Filter features by where they run</legend>
          {surfaces.map((surface) => (
            <label
              key={surface.id}
              className="cursor-pointer rounded-full border border-line px-3 py-1 font-mono text-xs text-mist transition-colors duration-200 hover:border-mist/50 has-checked:border-fg has-checked:bg-fg has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-bright"
            >
              <input
                type="radio"
                name="surface"
                id={`surface-${surface.id}`}
                defaultChecked={surface.id === "all"}
                className="sr-only"
              />
              {surface.label}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="grid gap-px border-t border-line bg-line md:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="flex flex-col bg-ink p-6 sm:p-8">
            <div
              data-surfaces={feature.on.join(" ")}
              className="flex flex-1 flex-col transition-opacity duration-200 motion-reduce:transition-none"
            >
              <h3 className="font-medium">{feature.title}</h3>
              <p className="mt-2 flex-1 text-[15px] leading-7 text-mist">{feature.body}</p>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {feature.on.map((id) => (
                  <li key={id} className={chip}>
                    {surfaces.find((surface) => surface.id === id)?.label}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
