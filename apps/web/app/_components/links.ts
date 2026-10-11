export const REPO_URL = "https://github.com/montara-project/montara-pass";

/** A page of the documentation site; no argument gives its home. */
export function docsUrl(page = "") {
  return `https://docs.montarapass.com/docs${page && `/${page}`}`;
}
