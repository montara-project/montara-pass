import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'

/** What the components expect around them, mounted once in the root route. */
export default function DecorationProvider({ children }: { children: React.ReactNode }) {
  return <NuqsAdapter>{children}</NuqsAdapter>
}
