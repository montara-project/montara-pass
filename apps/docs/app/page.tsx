import { redirect } from 'next/navigation'

// The site is the documentation: there is no separate landing page.
export default function HomePage() {
  redirect('/docs')
}
