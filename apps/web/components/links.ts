export const REPO_URL = "https://github.com/montara-project/montara-pass";

/** The hosted service (Cloud Edition): the web app and its API. */
export const APP_URL = "https://app.montarapass.com";

/** A page of the documentation site; no argument gives its home. */
export function docsUrl(page = "") {
  return `https://docs.montarapass.com/docs${page && `/${page}`}`;
}
