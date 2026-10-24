import type { ReactNode } from 'react'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#F3F6F4] px-0">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background px-5 py-4 sm:px-6">
        <header className="flex items-center justify-between border-b border-border pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Freedom Elite Home Care" className="h-10 w-auto" />
          <span className="border border-[color:var(--brand-strong)]/25 bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-secondary-foreground">Secure staff portal</span>
        </header>
        <div className="flex flex-1 items-center justify-center py-6">{children}</div>
        <p className="pb-1 text-center text-[11px] text-muted-foreground">For authorized Freedom Elite Home Care team members</p>
      </div>
    </main>
  )
}