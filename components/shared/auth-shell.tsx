import type { ReactNode } from 'react'
import { BrandLockup } from './brand-mark'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#F3F6F4] px-0">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background px-5 py-4 sm:px-6">
        <header className="flex items-center justify-between">
          <BrandLockup />
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-secondary-foreground">Secure staff portal</span>
        </header>
        <div className="flex flex-1 items-center justify-center py-6">{children}</div>
        <p className="pb-1 text-center text-[11px] text-muted-foreground">For authorized Freedom Elite Home Care team members</p>
      </div>
    </main>
  )
}