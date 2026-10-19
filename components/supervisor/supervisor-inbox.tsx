'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BriefcaseMedical, Check, FileText, Inbox, Mail, MessageSquare, Phone, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/* ---------------------------------- types ---------------------------------- */
export type ApplicationStatus = 'new' | 'reviewing' | 'interview' | 'hired' | 'rejected'
export type InquiryStatus = 'new' | 'contacted' | 'scheduled' | 'closed'

export type Application = {
  id: string
  status: ApplicationStatus
  createdAt: string
  firstName: string
  lastName: string
  phone: string
  email: string
  city: string
  countyOrZip: string
  workAuthorized: boolean
  hasTransportation: boolean
  role: string
  licenseNumber?: string
  licenseState?: string
  licenseExpiration?: string
  licenseStatus?: string
  registryNumber?: string
  certificationExpiration?: string
  training?: string
  cprStatus?: string
  yearsExperience: string
  pediatricExperience: boolean
  immunizationsCurrent?: string
  skills: string[]
  experience?: string
  availability: string[]
  employmentType: string
  hoursPerWeek?: string
  earliestStart?: string
  travelCounties?: string
  referenceName?: string
  referencePhone?: string
  resumePath?: string
  source?: string
  notes?: string
}

export type Inquiry = {
  id: string
  status: InquiryStatus
  createdAt: string
  name: string
  phone?: string
  email?: string
  careFor?: string
  service?: string
  location?: string
  bestTime?: string
  message: string
  details: Record<string, string>
  sourcePage: string
  notes?: string
}

export type InboxProps = {
  applications?: Application[]
  inquiries?: Inquiry[]
  onUpdateApplication?: (id: string, patch: { status?: ApplicationStatus; notes?: string }) => void | Promise<void>
  onUpdateInquiry?: (id: string, patch: { status?: InquiryStatus; notes?: string }) => void | Promise<void>
  onDeleteApplication?: (id: string) => void | Promise<void>
  onDeleteInquiry?: (id: string) => void | Promise<void>
  /** Return a short-lived signed URL for a private resume path. */
  onOpenResume?: (path: string) => Promise<string | null>
}

const NONE_A: Application[] = []
const NONE_I: Inquiry[] = []

/* --------------------------------- styles ---------------------------------- */
const inputCls = 'h-11.5 rounded-[11px] border-[1.5px] px-3 text-sm'
const areaCls = 'min-h-20 w-full rounded-[11px] border-[1.5px] border-input bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30'
const eyebrow = 'text-[10px] font-bold uppercase tracking-[0.11em]'

const APP_STATUSES: ApplicationStatus[] = ['new', 'reviewing', 'interview', 'hired', 'rejected']
const INQ_STATUSES: InquiryStatus[] = ['new', 'contacted', 'scheduled', 'closed']
const LABEL: Record<string, string> = { new: 'New', reviewing: 'Reviewing', interview: 'Interview', hired: 'Hired', rejected: 'Not moving forward', contacted: 'Contacted', scheduled: 'Scheduled', closed: 'Closed' }
const TONE: Record<string, string> = {
  new: 'bg-primary text-primary-foreground',
  reviewing: 'bg-[color:var(--gold)]/25 text-foreground',
  interview: 'bg-secondary text-secondary-foreground',
  hired: 'bg-[color:var(--success)] text-white',
  rejected: 'bg-muted text-muted-foreground',
  contacted: 'bg-[color:var(--gold)]/25 text-foreground',
  scheduled: 'bg-secondary text-secondary-foreground',
  closed: 'bg-muted text-muted-foreground',
}

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const fullName = (a: Application) => `${a.firstName} ${a.lastName}`.trim()
const dateLabel = (d?: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : undefined)
const dayDiff = (d?: string) => (d ? Math.ceil((new Date(`${d}T00:00:00`).getTime() - Date.now()) / 86_400_000) : undefined)

// Expired or expiring-soon credentials are the one thing worth flagging in red.
function expiry(d?: string): { text: string; bad: boolean } | undefined {
  const n = dayDiff(d)
  if (n === undefined) return undefined
  if (n < 0) return { text: `${dateLabel(d)} · expired`, bad: true }
  if (n <= 30) return { text: `${dateLabel(d)} · expires in ${n} day${n === 1 ? '' : 's'}`, bad: true }
  return { text: dateLabel(d)!, bad: false }
}

/* ---------------------------------- inbox ---------------------------------- */
export function SupervisorInbox({
  applications: appsProp = NONE_A, inquiries: inqProp = NONE_I,
  onUpdateApplication, onUpdateInquiry, onDeleteApplication, onDeleteInquiry, onOpenResume,
}: InboxProps) {
  const [apps, setApps] = useState(appsProp)
  const [inqs, setInqs] = useState(inqProp)
  const [seg, setSeg] = useState<'applications' | 'inquiries'>('applications')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [openApp, setOpenApp] = useState<string | null>(null)
  const [openInq, setOpenInq] = useState<string | null>(null)

  useEffect(() => setApps(appsProp), [appsProp])
  useEffect(() => setInqs(inqProp), [inqProp])
  useEffect(() => setFilter('all'), [seg])

  const newApps = apps.filter((a) => a.status === 'new').length
  const newInqs = inqs.filter((i) => i.status === 'new').length

  const appList = useMemo(() => apps
    .filter((a) => (filter === 'all' || a.status === filter) && `${fullName(a)} ${a.role} ${a.city} ${a.email}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [apps, q, filter])
  const inqList = useMemo(() => inqs
    .filter((i) => (filter === 'all' || i.status === filter) && `${i.name} ${i.message} ${i.location ?? ''} ${i.email ?? ''} ${i.phone ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [inqs, q, filter])

  const statuses = seg === 'applications' ? APP_STATUSES : INQ_STATUSES

  async function patchApp(id: string, patch: { status?: ApplicationStatus; notes?: string }) {
    setApps((all) => all.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    await onUpdateApplication?.(id, patch)
  }
  async function patchInq(id: string, patch: { status?: InquiryStatus; notes?: string }) {
    setInqs((all) => all.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    await onUpdateInquiry?.(id, patch)
  }

  const selectedApp = apps.find((a) => a.id === openApp)
  const selectedInq = inqs.find((i) => i.id === openInq)

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1 rounded-[11px] bg-muted p-1">
        {([['applications', 'Applications', newApps], ['inquiries', 'Inquiries', newInqs]] as const).map(([k, label, n]) => (
          <button key={k} onClick={() => setSeg(k)} className={`flex min-h-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold ${seg === k ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
            {label}{n > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] leading-4 text-primary-foreground">{n}</span>}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
        <Input aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={seg === 'applications' ? 'Search name, role, city' : 'Search name, phone, message'} className={`${inputCls} pl-10`} />
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
        {['all', ...statuses].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`min-h-0 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === s ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border text-muted-foreground'}`}>
            {s === 'all' ? 'All' : LABEL[s]}
          </button>
        ))}
      </div>

      {seg === 'applications' ? (
        appList.length ? appList.map((a) => {
          const lic = expiry(a.licenseExpiration ?? a.certificationExpiration)
          return (
            <button key={a.id} onClick={() => setOpenApp(a.id)} className="flex w-full min-h-0 items-start gap-3 rounded-2xl border border-border bg-card p-3 text-left hover:border-secondary-foreground">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><BriefcaseMedical className="size-[18px]" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold">{fullName(a)}</span><span className="shrink-0 text-[11px] text-muted-foreground">{when(a.createdAt)}</span></span>
                <span className="block truncate text-xs text-muted-foreground">{a.role} · {a.city} · {a.yearsExperience} yrs</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[a.status]}`}>{LABEL[a.status]}</span>
                  {lic?.bad && <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"><AlertTriangle className="size-3" /> Credential {lic.text.includes('expired') ? 'expired' : 'expiring'}</span>}
                  {!a.workAuthorized && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">Not work authorized</span>}
                </span>
              </span>
            </button>
          )
        }) : <Empty icon={BriefcaseMedical} title="No applications" body={apps.length ? 'Nothing matches this filter.' : 'Applications from the Careers page will appear here.'} />
      ) : (
        inqList.length ? inqList.map((i) => (
          <button key={i.id} onClick={() => setOpenInq(i.id)} className="flex w-full min-h-0 items-start gap-3 rounded-2xl border border-border bg-card p-3 text-left hover:border-secondary-foreground">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><MessageSquare className="size-[18px]" /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold">{i.name}</span><span className="shrink-0 text-[11px] text-muted-foreground">{when(i.createdAt)}</span></span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{i.message || [i.careFor && `For: ${i.careFor}`, i.location, i.bestTime && `Call ${i.bestTime.toLowerCase()}`].filter(Boolean).join(' · ') || 'No message'}</span>
              <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[i.status]}`}>{LABEL[i.status]}</span>
            </span>
          </button>
        )) : <Empty icon={Inbox} title="No inquiries" body={inqs.length ? 'Nothing matches this filter.' : 'Messages from the Contact page will appear here.'} />
      )}

      {selectedApp && (
        <Sheet title={fullName(selectedApp)} onClose={() => setOpenApp(null)}>
          <ApplicationDetail
            a={selectedApp}
            onStatus={(status) => patchApp(selectedApp.id, { status })}
            onNotes={(notes) => patchApp(selectedApp.id, { notes })}
            onOpenResume={onOpenResume}
            onDelete={onDeleteApplication ? async () => { await onDeleteApplication(selectedApp.id); setApps((all) => all.filter((x) => x.id !== selectedApp.id)); setOpenApp(null) } : undefined}
          />
        </Sheet>
      )}
      {selectedInq && (
        <Sheet title={selectedInq.name} onClose={() => setOpenInq(null)}>
          <InquiryDetail
            i={selectedInq}
            onStatus={(status) => patchInq(selectedInq.id, { status })}
            onNotes={(notes) => patchInq(selectedInq.id, { notes })}
            onDelete={onDeleteInquiry ? async () => { await onDeleteInquiry(selectedInq.id); setInqs((all) => all.filter((x) => x.id !== selectedInq.id)); setOpenInq(null) } : undefined}
          />
        </Sheet>
      )}
    </div>
  )
}

/* -------------------------------- details ---------------------------------- */
function ApplicationDetail({ a, onStatus, onNotes, onOpenResume, onDelete }: {
  a: Application; onStatus: (s: ApplicationStatus) => void; onNotes: (n: string) => void
  onOpenResume?: (path: string) => Promise<string | null>; onDelete?: () => void
}) {
  const [notes, setNotes] = useState(a.notes ?? '')
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [resumeBusy, setResumeBusy] = useState(false)
  const lic = expiry(a.licenseExpiration)
  const cert = expiry(a.certificationExpiration)

  async function openResume() {
    if (!a.resumePath || !onOpenResume) return
    setResumeBusy(true)
    const url = await onOpenResume(a.resumePath)
    setResumeBusy(false)
    if (url) window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className={`${eyebrow} mb-1.5 text-muted-foreground`}>Status</p>
        <div className="flex flex-wrap gap-1.5">
          {APP_STATUSES.map((s) => <button key={s} onClick={() => onStatus(s)} className={`min-h-0 rounded-full border px-3 py-1.5 text-xs font-bold ${a.status === s ? `${TONE[s]} border-transparent` : 'border-border text-muted-foreground'}`}>{LABEL[s]}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <a href={`tel:${a.phone}`} className="flex min-h-0 flex-col items-center gap-1 rounded-xl border border-border py-2.5 text-[11px] font-bold"><Phone className="size-4" />Call</a>
        <a href={`sms:${a.phone}`} className="flex min-h-0 flex-col items-center gap-1 rounded-xl border border-border py-2.5 text-[11px] font-bold"><MessageSquare className="size-4" />Text</a>
        <a href={`mailto:${a.email}`} className="flex min-h-0 flex-col items-center gap-1 rounded-xl border border-border py-2.5 text-[11px] font-bold"><Mail className="size-4" />Email</a>
      </div>

      <Group title="Applying for">
        <Row label="Role" value={a.role} />
        <Row label="Experience" value={`${a.yearsExperience} years${a.pediatricExperience ? ' · pediatric' : ''}`} />
        <Row label="Employment" value={a.employmentType} />
        {!!a.availability.length && <Row label="Availability" value={a.availability.join(', ')} />}
        <Row label="Hours / week" value={a.hoursPerWeek} />
        <Row label="Earliest start" value={dateLabel(a.earliestStart)} />
        <Row label="Can travel to" value={a.travelCounties} />
      </Group>

      <Group title="Credentials">
        <Row label="License #" value={a.licenseNumber} />
        <Row label="State" value={a.licenseState} />
        <Row label="License status" value={a.licenseStatus} />
        <Row label="License expires" value={lic?.text} bad={lic?.bad} />
        <Row label="Registry #" value={a.registryNumber} />
        <Row label="Certification expires" value={cert?.text} bad={cert?.bad} />
        <Row label="Training" value={a.training} />
        <Row label="CPR / BLS" value={a.cprStatus} />
        <Row label="TB / immunizations" value={a.immunizationsCurrent} />
      </Group>

      <Group title="Contact & eligibility">
        <Row label="Phone" value={a.phone} />
        <Row label="Email" value={a.email} />
        <Row label="Location" value={`${a.city} · ${a.countyOrZip}`} />
        <Row label="Work authorized" value={a.workAuthorized ? 'Yes' : 'No'} bad={!a.workAuthorized} />
        <Row label="Transportation" value={a.hasTransportation ? 'Yes' : 'No'} bad={!a.hasTransportation} />
        <Row label="Heard about us" value={a.source} />
      </Group>

      {(!!a.skills.length || a.experience) && (
        <Group title="Skills & experience">
          {!!a.skills.length && <div className="flex flex-wrap gap-1.5 pb-1">{a.skills.map((s) => <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">{s}</span>)}</div>}
          {a.experience && <p className="text-[13px] leading-5">{a.experience}</p>}
        </Group>
      )}

      {(a.referenceName || a.referencePhone) && (
        <Group title="Reference"><Row label="Name" value={a.referenceName} /><Row label="Phone" value={a.referencePhone} /></Group>
      )}

      {a.resumePath && (
        <Button variant="outline" disabled={resumeBusy || !onOpenResume} onClick={openResume} className="h-11 w-full rounded-xl border-[1.5px] text-[13px] font-bold">
          <FileText className="size-4" /> {resumeBusy ? 'Opening…' : 'View resume'}
        </Button>
      )}

      <Notes value={notes} onChange={(v) => { setNotes(v); setSaved(false) }} saved={saved} onSave={() => { onNotes(notes.trim()); setSaved(true) }} />
      <Remove show={!!onDelete} confirming={confirmDelete} setConfirming={setConfirmDelete} onDelete={onDelete} what="application" />
    </div>
  )
}

function InquiryDetail({ i, onStatus, onNotes, onDelete }: { i: Inquiry; onStatus: (s: InquiryStatus) => void; onNotes: (n: string) => void; onDelete?: () => void }) {
  const [notes, setNotes] = useState(i.notes ?? '')
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className={`${eyebrow} mb-1.5 text-muted-foreground`}>Status</p>
        <div className="flex flex-wrap gap-1.5">
          {INQ_STATUSES.map((s) => <button key={s} onClick={() => onStatus(s)} className={`min-h-0 rounded-full border px-3 py-1.5 text-xs font-bold ${i.status === s ? `${TONE[s]} border-transparent` : 'border-border text-muted-foreground'}`}>{LABEL[s]}</button>)}
        </div>
      </div>
      <div className={`grid gap-2 ${i.phone && i.email ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {i.phone && <a href={`tel:${i.phone}`} className="flex min-h-0 flex-col items-center gap-1 rounded-xl border border-border py-2.5 text-[11px] font-bold"><Phone className="size-4" />Call</a>}
        {i.phone && <a href={`sms:${i.phone}`} className="flex min-h-0 flex-col items-center gap-1 rounded-xl border border-border py-2.5 text-[11px] font-bold"><MessageSquare className="size-4" />Text</a>}
        {i.email && <a href={`mailto:${i.email}`} className="flex min-h-0 flex-col items-center gap-1 rounded-xl border border-border py-2.5 text-[11px] font-bold"><Mail className="size-4" />Email</a>}
      </div>
      <Group title="Request">
        <Row label="Care for" value={i.careFor} />
        <Row label="Service" value={i.service ? i.service.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) : undefined} />
        <Row label="Location" value={i.location} />
        <Row label="Best time to call" value={i.bestTime} />
        <p className="pt-1 text-[11px] text-muted-foreground">Received {new Date(i.createdAt).toLocaleString()}</p>
      </Group>
      {i.message && <Group title="Message"><p className="whitespace-pre-wrap text-[13px] leading-5">{i.message}</p></Group>}
      <Group title="Contact">
        <Row label="Phone" value={i.phone} />
        <Row label="Email" value={i.email} />
        {Object.entries(i.details).map(([k, v]) => <Row key={k} label={k.replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase())} value={v} />)}
      </Group>
      <Notes value={notes} onChange={(v) => { setNotes(v); setSaved(false) }} saved={saved} onSave={() => { onNotes(notes.trim()); setSaved(true) }} />
      <Remove show={!!onDelete} confirming={confirmDelete} setConfirming={setConfirmDelete} onDelete={onDelete} what="inquiry" />
    </div>
  )
}

/* --------------------------------- pieces ---------------------------------- */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card p-3"><p className={`${eyebrow} mb-2 text-muted-foreground`}>{title}</p><div className="flex flex-col gap-1.5">{children}</div></section>
}
function Row({ label, value, bad }: { label: string; value?: string; bad?: boolean }) {
  if (!value) return null
  return <div className="flex items-baseline justify-between gap-4 text-[13px]"><span className="shrink-0 text-muted-foreground">{label}</span><span className={`text-right font-semibold ${bad ? 'text-destructive' : ''}`}>{value}</span></div>
}
function Notes({ value, onChange, onSave, saved }: { value: string; onChange: (v: string) => void; onSave: () => void; saved: boolean }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-bold">Internal notes
      <textarea className={areaCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Call outcome, interview notes… (visible to supervisors only)" />
      <Button variant="outline" onClick={onSave} className="h-10 w-full rounded-xl border-[1.5px] text-[13px] font-bold">{saved ? <><Check className="size-4" /> Saved</> : 'Save notes'}</Button>
    </label>
  )
}
function Remove({ show, confirming, setConfirming, onDelete, what }: { show: boolean; confirming: boolean; setConfirming: (v: boolean) => void; onDelete?: () => void; what: string }) {
  if (!show) return null
  return confirming ? (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3">
      <p className="text-[13px] font-bold">Permanently delete this {what}?</p>
      <p className="mt-0.5 text-xs text-muted-foreground">This can&apos;t be undone.</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-10 rounded-xl text-[13px] font-bold" onClick={() => setConfirming(false)}>Cancel</Button>
        <Button className="h-10 rounded-xl bg-destructive text-[13px] font-bold text-white hover:bg-destructive/90" onClick={onDelete}>Delete</Button>
      </div>
    </div>
  ) : (
    <button onClick={() => setConfirming(true)} className="flex min-h-0 items-center justify-center gap-1.5 py-2 text-xs font-semibold text-destructive"><Trash2 className="size-3.5" /> Delete {what}</button>
  )
}
function Empty({ icon: Icon, title, body }: { icon: typeof Inbox; title: string; body: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-6 text-center"><Icon className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-[13px] font-bold">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{body}</p></div>
}
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-foreground/30" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="mx-auto max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-background px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-center justify-between"><h2 className="font-heading text-lg font-bold">{title}</h2><button onClick={onClose} aria-label="Close" className="flex size-9 min-h-0 items-center justify-center rounded-full hover:bg-muted"><X className="size-5" /></button></div>
        {children}
      </section>
    </div>
  )
}

export default SupervisorInbox