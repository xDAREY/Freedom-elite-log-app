'use client'

import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Phone } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/shared/auth-shell'
import { signInSupervisor } from '@/lib/auth'

const field = 'h-11.5 rounded-[11px] border-[1.5px] px-3 pl-10 text-sm'
const icon = 'pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground'

export function SupervisorAuth({ onBack, onSignedIn }: { onBack: () => void; onSignedIn: (profile: { id: string; name: string }) => void }) {
  const [showPin, setShowPin] = useState(false)
  const [expired] = useState(false)
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await signInSupervisor(phone, pin)
    setBusy(false)
    if (!res.ok) return setError(res.message)
    onSignedIn({ id: res.profile.id, name: res.profile.name })
  }

  return (
    <AuthShell>
      <section className="w-full">
        <button onClick={onBack} className="mb-4 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-secondary-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to roles
        </button>

        {expired && (
          <div role="alert" className="mb-4 rounded-2xl border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 p-3.5 text-[13px] text-foreground">
            <strong>Your session ended.</strong> For your security, you were signed out after 15 minutes of inactivity.
          </div>
        )}

        <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-secondary-foreground">Supervisor</p>
        <h1 className="mt-1.5 font-heading text-[28px] font-bold leading-[1.15] tracking-tight">Sign in to review care</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Use your supervisor credentials to access staff requests and shift records.</p>

        <form className="mt-5 flex flex-col gap-3.5" onSubmit={submit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supervisor-phone" className="text-[13px] font-bold">Phone number</Label>
            <div className="relative">
              <Phone className={icon} aria-hidden="true" />
              <Input id="supervisor-phone" required type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, ''))} placeholder="+1 555 000 0000" className={field} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supervisor-pin" className="text-[13px] font-bold">PIN</Label>
            <div className="relative">
              <LockKeyhole className={icon} aria-hidden="true" />
              <Input id="supervisor-pin" required type={showPin ? 'text' : 'password'} inputMode="numeric" minLength={4} maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="Enter your PIN" className={`${field} pr-11`} />
              <button type="button" aria-label={showPin ? 'Hide PIN' : 'Show PIN'} onClick={() => setShowPin(!showPin)} className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring">
                {showPin ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {error && <p role="alert" className="text-[13px] font-semibold text-destructive">{error}</p>}

          <Button type="submit" disabled={busy} className="mt-1 h-12 w-full rounded-xl text-[13px] font-bold">
            {busy ? 'Signing in…' : 'Continue'} {!busy && <ArrowRight className="size-4" data-icon="inline-end" aria-hidden="true" />}
          </Button>
        </form>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">Supervisor accounts are issued by your administrator.</p>
      </section>
    </AuthShell>
  )
}