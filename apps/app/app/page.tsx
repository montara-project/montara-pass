import { redirect } from 'next/navigation'

import { HOME_PATH } from '@/lib/constants/auth'

export default function Home() {
  redirect(HOME_PATH)
}
