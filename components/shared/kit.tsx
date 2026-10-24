'use client'

// Shared building blocks for the supervisor portal: square, bordered, document-like.
import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/* --------------------------------- form bits --------------------------------- */
export const fieldCls =
  'h-10 w-full rounded-sm border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-60'
export const areaCls =
  'min-h-24 w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25'

export function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[12px] font-bold text-foreground">{label}{required && <span className="text-destructive"> *</span>}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  )
}

/* ----------------------------------- tags ----------------------------------- */
const TONES = {
  neutral: 'border-border bg-muted text-muted-foreground',
  brand: 'border-[color:var(--brand-strong)]/30 bg-secondary text-secondary-foreground',
  solid: 'border-transparent bg-[color:var(--brand-strong)] text-white',
  warn: 'border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 text-[color:var(--warning)]',
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
  success: 'border-[color:var(--success)]/40 bg-[color:var(--success)]/10 text-[color:var(--success)]',
} as const
export type Tone = keyof typeof TONES

export function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.08em] ${TONES[tone]}`}>{children}</span>
}

/* --------------------------------- structure --------------------------------- */
export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/70 px-4 py-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{title}</h3>
        {aside}
      </div>
      <div className="px-4 py-1">{children}</div>
    </section>
  )
}

export function KV({ label, value, bad }: { label: string; value?: ReactNode; bad?: boolean }) {
  if (value === undefined || value === null || value === '' || value === false) return null
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-border/70 py-2 text-[13px] last:border-b-0 sm:grid-cols-[150px_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`min-w-0 break-words font-semibold ${bad ? 'text-destructive' : 'text-foreground'}`}>{value}</dd>
    </div>
  )
}

export function Empty({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body?: string }) {
  return (
    <div className="border border-dashed border-border bg-card px-6 py-12 text-center">
      <Icon className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-sm font-bold">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">{body}</p>}
    </div>
  )
}

/* ---------------------------------- overlays ---------------------------------- */
function useOverlay(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])
}

/** Side panel on desktop, full screen on phones. Header and footer stay put; the body scrolls. */
export function Drawer({ title, subtitle, onClose, children, footer, size = 'md' }: {
  title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'md' | 'lg'
}) {
  useOverlay(onClose)
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/45" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <aside role="dialog" aria-modal="true" aria-label={title}
        className={`flex h-dvh w-full flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-200 sm:border-l sm:border-border ${size === 'lg' ? 'sm:max-w-[660px]' : 'sm:max-w-[500px]'}`}>
        <header className="flex items-start justify-between gap-4 border-b border-border bg-background px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-heading text-xl font-bold leading-tight">{title}</h2>
            {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
          </div>
          <Button variant="outline" size="icon" onClick={onClose} aria-label="Close"><X /></Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F6F8F7] px-5 py-5">{children}</div>
        {footer && <footer className="border-t border-border bg-background px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{footer}</footer>}
      </aside>
    </div>
  )
}

/** Small centred confirmation. Use for anything that can't be undone. */
export function ConfirmDialog({ title, body, confirmLabel = 'Confirm', tone = 'default', busy, disabled, onConfirm, onCancel, children }: {
  title: string; body?: ReactNode; confirmLabel?: string; tone?: 'default' | 'danger'; busy?: boolean; disabled?: boolean
  onConfirm: () => void; onCancel: () => void; children?: ReactNode
}) {
  useOverlay(onCancel)
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div role="alertdialog" aria-modal="true" aria-label={title} className="w-full max-w-[400px] border border-border bg-background shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
        <div className={`h-1 ${tone === 'danger' ? 'bg-destructive' : 'bg-[color:var(--brand-strong)]'}`} />
        <div className="px-5 pb-5 pt-4">
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          {body && <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{body}</p>}
          {children && <div className="mt-4">{children}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-muted/60 px-5 py-3">
          <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'destructive' : 'brand'} onClick={onConfirm} disabled={busy || disabled}>{busy ? 'Please wait…' : confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}