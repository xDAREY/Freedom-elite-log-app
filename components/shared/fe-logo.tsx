import { cn } from '@/lib/utils'

type FeLogoProps = { className?: string; compact?: boolean }

export function FeLogo({ className, compact = false }: FeLogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex size-11 items-center justify-center rounded-[14px] bg-primary text-sm font-extrabold tracking-[-0.08em] text-primary-foreground shadow-[0_4px_0_var(--brand-strong)]">
        FE
      </div>
      {!compact && <span className="text-[15px] font-extrabold tracking-[-0.03em] text-foreground">Freedom Elite <span className="font-medium text-muted-foreground">Home Care</span></span>}
    </div>
  )
}

export function Monogram({ className }: { className?: string }) {
  return <div className={cn('flex size-10 items-center justify-center rounded-[13px] bg-primary text-xs font-extrabold tracking-[-0.08em] text-primary-foreground', className)}>FE</div>
}

export function IconBubble({ children }: { children: React.ReactNode }) {
  return <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">{children}</div>
}

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return <label htmlFor={htmlFor} className="mb-2 block text-sm font-bold text-foreground">{children}</label>
}

export function PillButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn('inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-extrabold text-primary-foreground transition hover:bg-brand-strong hover:text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}>{children}</button>
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-bold text-brand-strong underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring">← Back</button>
}

export function TextInput({ id, type = 'text', placeholder, value, onChange }: { id: string; type?: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return <input id={id} type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border-[1.5px] border-input bg-white px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand-strong focus:ring-[3px] focus:ring-primary/30" />
}

export function PinInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return <input id={id} inputMode="numeric" maxLength={6} type="password" placeholder="4–6 digits" value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))} className="h-12 w-full rounded-xl border-[1.5px] border-input bg-white px-4 text-sm tracking-[0.35em] text-foreground outline-none placeholder:tracking-normal placeholder:text-muted-foreground focus:border-brand-strong focus:ring-[3px] focus:ring-primary/30" />
}

export function AuthShell({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) {
  return <main className="min-h-screen bg-background px-5 py-7 sm:px-8"><div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col"><header className="flex items-center justify-between"><FeLogo /><span className="hidden rounded-full bg-brand-soft px-4 py-2 text-xs font-bold text-brand-strong sm:block">{eyebrow ?? 'Staff workspace'}</span></header>{children}</div></main>
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <div role="status" className="rounded-2xl border border-[#b9dcc8] bg-brand-soft px-4 py-3 text-sm font-semibold leading-6 text-brand-strong">{children}</div>
}

export function FooterNote() {
  return <p className="text-center text-xs leading-5 text-muted-foreground">Your information is kept private and is only used for your care team workspace.</p>
}

export function RoleIcon({ children }: { children: React.ReactNode }) {
  return <div className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">{children}</div>
}

export function Divider() { return <div className="h-px bg-border" /> }

export function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="min-h-11 rounded-full px-3 text-sm font-bold text-brand-strong underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring">{children}</button>
}

export function ClockBadge() { return <span className="inline-flex items-center gap-2 rounded-full bg-[#fff5d8] px-3 py-1.5 text-xs font-bold text-[#8a6200]">● 15-minute security timeout</span> }

export function CloseButton({ onClick }: { onClick: () => void }) { return <button aria-label="Close" onClick={onClick} className="flex size-10 items-center justify-center rounded-full text-2xl text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">×</button> }

export function Card({ children, className }: { children: React.ReactNode; className?: string }) { return <section className={cn('rounded-2xl border border-border bg-card p-5 sm:p-7', className)}>{children}</section> }

export function Heading({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) { return <div className="flex flex-col gap-2">{eyebrow && <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-strong">{eyebrow}</p>}<h1 className="text-3xl font-extrabold tracking-[-0.045em] text-foreground sm:text-4xl">{children}</h1></div> }

export function StepDots({ step }: { step: number }) { return <div aria-label={`Step ${step} of 3`} className="flex items-center gap-2">{[1,2,3].map((item) => <span key={item} className={cn('h-1.5 rounded-full transition-all', item === step ? 'w-8 bg-brand-strong' : 'w-1.5 bg-border')} />)}</div> }

export function FooterBrand() { return <div className="mt-auto flex items-center justify-between border-t border-border pt-5 text-xs text-muted-foreground"><span>Freedom Elite Home Care</span><span>Support: your supervisor</span></div> }

export function ScreenWrap({ children }: { children: React.ReactNode }) { return <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-7 py-12">{children}</div> }

export function Stack({ children }: { children: React.ReactNode }) { return <div className="flex flex-col gap-4">{children}</div> }

export function PinHint() { return <p className="mt-2 text-xs text-muted-foreground">Use a PIN you can remember. Never share it with another team member.</p> }

export function LegalLine() { return <p className="text-center text-xs text-muted-foreground">By continuing, you agree to use this workspace only for approved care documentation.</p> }

export function RoleCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) { return <button onClick={onClick} className="group flex min-h-[92px] w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-brand-strong hover:bg-brand-soft/50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"><RoleIcon>{icon}</RoleIcon><span className="flex flex-1 flex-col gap-1"><strong className="text-base font-extrabold text-foreground">{title}</strong><span className="text-sm leading-5 text-muted-foreground">{description}</span></span><span aria-hidden="true" className="text-xl text-brand-strong transition-transform group-hover:translate-x-1">→</span></button> }

export function SignOutDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) { if (!open) return null; return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 p-4 sm:items-center"><div role="dialog" aria-modal="true" aria-labelledby="signout-title" className="w-full max-w-sm rounded-3xl border border-border bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-strong">Leaving workspace</p><h2 id="signout-title" className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Sign out now?</h2></div><CloseButton onClick={onClose} /></div><p className="mt-3 text-sm leading-6 text-muted-foreground">You can sign back in with your phone number and PIN.</p><div className="mt-6 flex gap-3"><button onClick={onClose} className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm font-bold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Stay signed in</button><PillButton onClick={onConfirm} className="flex-1">Sign out</PillButton></div></div></div> }

export function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center"><p className="font-extrabold text-foreground">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p></div> }

export function BellIcon() { return <span aria-hidden="true" className="text-lg">◌</span> }

export function UserMenu({ onSignOut }: { onSignOut: () => void }) { return <div className="rounded-2xl border border-border bg-white p-4"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Account</p><button onClick={onSignOut} className="mt-3 min-h-11 w-full rounded-xl bg-muted px-4 text-left text-sm font-bold text-foreground hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-ring">Sign out</button></div> }

export function BottomNav({ onLog }: { onLog: () => void }) { return <nav aria-label="Staff navigation" className="fixed inset-x-0 bottom-0 border-t border-border bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:static sm:mt-6 sm:rounded-2xl sm:border sm:p-2"><div className="mx-auto flex max-w-md items-end justify-around"><button className="flex min-h-12 flex-col items-center gap-1 px-3 text-xs font-bold text-brand-strong" aria-current="page"><span className="text-lg">⌂</span>Home</button><button className="flex min-h-12 flex-col items-center gap-1 px-3 text-xs font-bold text-muted-foreground"><span className="text-lg">♧</span>Patients</button><button onClick={onLog} className="-mt-7 flex size-16 flex-col items-center justify-center gap-0 rounded-full border-4 border-white bg-accent text-xs font-extrabold text-accent-foreground shadow-md focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"><span className="text-xl">+</span>Log</button><button className="flex min-h-12 flex-col items-center gap-1 px-3 text-xs font-bold text-muted-foreground"><span className="text-lg">◷</span>History</button><button className="flex min-h-12 flex-col items-center gap-1 px-3 text-xs font-bold text-muted-foreground"><span className="text-lg">⋯</span>More</button></div></nav> }

export function Status({ children, tone = 'success' }: { children: React.ReactNode; tone?: 'success' | 'warning' | 'danger' }) { const styles = { success: 'bg-[#e1f3e7] text-[#1e7b4f]', warning: 'bg-[#fff0dc] text-[#b45a00]', danger: 'bg-[#fbe3e2] text-[#a52e2a]' }; return <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold', styles[tone])}><span aria-hidden="true">{tone === 'success' ? '✓' : '!'}</span>{children}</span> }

export function SectionTitle({ children }: { children: React.ReactNode }) { return <h2 className="text-lg font-extrabold tracking-tight text-foreground">{children}</h2> }

export function Avatar({ initials = 'FE' }: { initials?: string }) { return <div className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-brand-soft text-xs font-extrabold text-brand-strong">{initials}</div> }

export function TopBand({ children, onSignOut }: { children: React.ReactNode; onSignOut: () => void }) { return <header className="rounded-b-[24px] bg-primary px-5 pb-7 pt-5 text-primary-foreground sm:px-8"><div className="mx-auto flex max-w-6xl items-center justify-between"><div>{children}</div><div className="flex items-center gap-3"><button aria-label="Notifications" className="flex size-11 items-center justify-center rounded-full hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"><BellIcon /></button><button onClick={onSignOut} aria-label="Open account menu" className="focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"><Avatar /></button></div></div></header> }

export function DesktopSidebar({ onSignOut }: { onSignOut: () => void }) { return <aside className="hidden w-64 shrink-0 flex-col gap-8 border-r border-border px-5 py-7 lg:flex"><FeLogo /><nav aria-label="Supervisor navigation" className="flex flex-col gap-2"><button className="rounded-xl bg-brand-soft px-4 py-3 text-left text-sm font-bold text-brand-strong">Overview</button><button className="rounded-xl px-4 py-3 text-left text-sm font-bold text-muted-foreground hover:bg-muted">Staff approvals</button><button className="rounded-xl px-4 py-3 text-left text-sm font-bold text-muted-foreground hover:bg-muted">Shift logs</button><button className="rounded-xl px-4 py-3 text-left text-sm font-bold text-muted-foreground hover:bg-muted">Team settings</button></nav><button onClick={onSignOut} className="mt-auto rounded-xl px-4 py-3 text-left text-sm font-bold text-muted-foreground hover:bg-muted">Sign out</button></aside> }

export function MobileSupervisorNav() { return <nav aria-label="Supervisor navigation" className="flex border-t border-border bg-white px-3 py-2 lg:hidden"><div className="flex w-full justify-around"><button className="min-h-11 px-3 text-xs font-bold text-brand-strong">Overview</button><button className="min-h-11 px-3 text-xs font-bold text-muted-foreground">Approvals</button><button className="min-h-11 px-3 text-xs font-bold text-muted-foreground">Logs</button></div></nav> }

export function PageShell({ children }: { children: React.ReactNode }) { return <div className="flex min-h-screen bg-background">{children}</div> }

export function MainContent({ children }: { children: React.ReactNode }) { return <main className="flex min-w-0 flex-1 flex-col">{children}</main> }

export function ContentContainer({ children }: { children: React.ReactNode }) { return <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-7 sm:px-8">{children}</div> }
