import { APP_URL } from "@/components/links";

/** The envelope the Go API wraps every body in. */
export type ItemResponse<T> = { data: T };

/**
 * The one client every service uses. It is `fetch` rather than axios because
 * the site renders on the server, where `next.revalidate` caches the answer
 * between requests and axios would bypass that cache.
 */
export const api = {
  async get<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${APP_URL}${path}`, init);
    if (!res.ok) {
      throw new Error(`GET ${path} answered ${res.status}`);
    }
    return (await res.json()) as T;
  },
};
