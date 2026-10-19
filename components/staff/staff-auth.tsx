'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, LogIn, Phone, UserPlus, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/shared/auth-shell'
import { setOwnPin, signInStaff, signUpStaff } from '@/lib/auth'

type Mode = 'choose' | 'login' | 'signup' | 'waiting' | 'new-pin'

const field = 'h-11.5 rounded-[11px] border-[1.5px] px-3 pl-10 text-sm'
const icon = 'pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground'
const primary = 'mt-1 h-12 w-full rounded-xl text-[13px] font-bold'

type Profile = { id: string; name: string }

export function StaffAuth({ role, onBack, onSignedIn }: { role: 'Nurse' | 'CNA/PNA'; onBack: () => void; onSignedIn: (profile: Profile) => void }) {
  const [mode, setMode] = useState<Mode>('choose')
  const [showPin, setShowPin] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Profile | null>(null) // signed in, but must choose a new PIN first
  const roleCode = role === 'Nurse' ? 'nurse' : 'pca_cna'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    if (mode === 'signup') {
      const res = await signUpStaff(name, phone, pin, roleCode)
      setBusy(false)
      if (!res.ok) return setError(res.message)
      setPin('')
      return setMode('waiting')
    }
    const res = await signInStaff(phone, pin, roleCode)
    setBusy(false)
    if (!res.ok) return setError(res.message)
    const p = { id: res.profile.id, name: res.profile.name }
    if (res.profile.mustResetPin) { setPending(p); return setMode('new-pin') }
    onSignedIn(p)
  }

  if (mode === 'waiting')
    return (
      <AuthShell>
        <section className="w-full text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Check size={22} aria-hidden="true" />
          </div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.11em] text-secondary-foreground">Request received</p>
          <h1 className="font-heading text-[28px] font-bold leading-[1.15] tracking-tight">You&apos;re on the review list.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">A supervisor will review your request. Once approved, you can return here to sign in.</p>
          <Button className={`${primary} mt-6`} onClick={() => setMode('login')}>Back to sign in</Button>
        </section>
      </AuthShell>
    )

  if (mode === 'new-pin')
    return (
      <AuthShell>
        <PinForm title="Set a new PIN" description="Create a new PIN before continuing to your staff account." submitLabel="Save new PIN" onSubmit={async (newPin) => {
          const res = await setOwnPin(newPin)
          if (!res.ok) return res.message
          if (pending) onSignedIn(pending)
          return null
        }} />
      </AuthShell>
    )

  const back = () => { setError(null); if (mode === 'choose') onBack(); else setMode('choose') }

  return (
    <AuthShell>
      <section className="w-full">
        <button onClick={back} className="mb-4 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-secondary-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> {mode === 'choose' ? 'Back to roles' : 'Back'}
        </button>
        <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-secondary-foreground">{role}</p>
        <h1 className="mt-1.5 font-heading text-[28px] font-bold leading-[1.15] tracking-tight">
          {mode === 'choose' ? `${role} workspace` : mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {mode === 'choose' ? 'Choose how you want to continue.' : mode === 'signup' ? 'Send your details to your supervisor for approval.' : 'Sign in to continue your shift documentation.'}
        </p>

        {mode === 'choose' ? (
          <div className="mt-5 flex flex-col gap-2.5">
            {[
              { m: 'signup' as const, t: 'Create account', d: 'New here? Request access for supervisor approval.', I: UserPlus },
              { m: 'login' as const, t: 'Log in', d: 'Already approved? Sign in with your phone and PIN.', I: LogIn },
            ].map(({ m, t, d, I }) => (
              <button key={m} onClick={() => setMode(m)} className="flex w-full items-center gap-3 rounded-[15px] border bg-card p-3.5 text-left transition-colors hover:bg-secondary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><I className="size-4" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold leading-tight">{t}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{d}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <form className="mt-5 flex flex-col gap-3.5" onSubmit={submit}>
            {mode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full-name" className="text-[13px] font-bold">Full name</Label>
                <div className="relative"><UserRound className={icon} aria-hidden="true" /><Input id="full-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" className={field} /></div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone" className="text-[13px] font-bold">Phone number</Label>
              <div className="relative"><Phone className={icon} aria-hidden="true" /><Input id="phone" required type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, ''))} placeholder="+1 555 000 0000" className={field} /></div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pin" className="text-[13px] font-bold">{mode === 'signup' ? 'Create a 4–6 digit PIN' : 'PIN'}</Label>
              <div className="relative">
                <LockKeyhole className={icon} aria-hidden="true" />
                <Input id="pin" required inputMode="numeric" minLength={4} maxLength={6} type={showPin ? 'text' : 'password'} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="Enter your PIN" className={`${field} pr-11`} />
                <button type="button" aria-label={showPin ? 'Hide PIN' : 'Show PIN'} onClick={() => setShowPin(!showPin)} className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-3 focus-visible:outline-ring">
                  {showPin ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
            {error && <p role="alert" className="text-[13px] font-semibold text-destructive">{error}</p>}
            {mode === 'login' && <p className="text-xs text-muted-foreground">Forgot PIN? Contact your supervisor.</p>}
            <Button type="submit" disabled={busy} className={primary}>{busy ? 'Please wait…' : mode === 'signup' ? 'Request account approval' : 'Sign in'} {!busy && <ArrowRight className="size-4" data-icon="inline-end" aria-hidden="true" />}</Button>
          </form>
        )}
      </section>
    </AuthShell>
  )
}

function PinForm({ title, description, submitLabel, onSubmit }: { title: string; description: string; submitLabel: string; onSubmit: (pin: string) => Promise<string | null> }) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const f = 'h-11.5 rounded-[11px] border-[1.5px] px-3 text-sm'
  return (
    <section className="w-full">
      <LockKeyhole className="mb-4 size-6 text-secondary-foreground" aria-hidden="true" />
      <h1 className="font-heading text-[28px] font-bold leading-[1.15] tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <form className="mt-5 flex flex-col gap-3.5" onSubmit={async (e) => {
        e.preventDefault()
        if (pin !== confirm) return setError('The two PINs do not match.')
        setError(null); setBusy(true)
        const msg = await onSubmit(pin)
        setBusy(false)
        if (msg) setError(msg)
      }}>
        <div className="flex flex-col gap-1.5"><Label htmlFor="new-pin" className="text-[13px] font-bold">New PIN</Label><Input id="new-pin" required type="password" inputMode="numeric" minLength={4} maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="4–6 digits" className={f} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="confirm-pin" className="text-[13px] font-bold">Confirm new PIN</Label><Input id="confirm-pin" required type="password" inputMode="numeric" minLength={4} maxLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))} placeholder="Repeat your PIN" className={f} /></div>
        {error && <p role="alert" className="text-[13px] font-semibold text-destructive">{error}</p>}
        <Button className="mt-1 h-12 w-full rounded-xl text-[13px] font-bold" type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</Button>
      </form>
    </section>
  )
}