export const REPO_URL = "https://github.com/montara-project/montara-pass";

/** A page of the documentation, as its source file in the repository. */
export function docsUrl(page: string) {
  return `${REPO_URL}/blob/main/apps/docs/content/docs/${page}.mdx`;
}
