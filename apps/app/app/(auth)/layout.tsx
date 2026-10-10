import { GuestGuard } from '@/components/block/auth/auth-guard'

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <GuestGuard>
      <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </GuestGuard>
  )
}
