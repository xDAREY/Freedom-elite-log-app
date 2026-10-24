'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BriefcaseMedical, Check, FileText, Inbox, Mail, MessageSquare, Phone, Printer, Search, Trash2 } from 'lucide-react'
import { ApplicationLetter } from '@/components/supervisor/application-letter'
import { PrintSheet } from '@/components/shared/print-sheet'
import { ConfirmDialog, Drawer, Empty, KV, Section, Tag, areaCls, fieldCls, type Tone } from '@/components/shared/kit'
import { Button } from '@/components/ui/button'

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

const APP_STATUSES: ApplicationStatus[] = ['new', 'reviewing', 'interview', 'hired', 'rejected']
const INQ_STATUSES: InquiryStatus[] = ['new', 'contacted', 'scheduled', 'closed']
const LABEL: Record<string, string> = { new: 'New', reviewing: 'Reviewing', interview: 'Interview', hired: 'Hired', rejected: 'Not moving forward', contacted: 'Contacted', scheduled: 'Scheduled', closed: 'Closed' }
const TONE: Record<string, Tone> = { new: 'solid', reviewing: 'warn', interview: 'brand', hired: 'success', rejected: 'neutral', contacted: 'warn', scheduled: 'brand', closed: 'neutral' }

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const fullName = (a: Application) => `${a.firstName} ${a.lastName}`.trim()
const dateLabel = (d?: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : undefined)
const dayDiff = (d?: string) => (d ? Math.ceil((new Date(`${d}T00:00:00`).getTime() - Date.now()) / 86_400_000) : undefined)
const pretty = (s?: string) => (s ? s.replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase()) : undefined)

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
  useEffect(() => { setFilter('all'); setQ('') }, [seg])

  const newApps = apps.filter((a) => a.status === 'new').length
  const newInqs = inqs.filter((i) => i.status === 'new').length

  const appList = useMemo(() => apps
    .filter((a) => (filter === 'all' || a.status === filter) && `${fullName(a)} ${a.role} ${a.city} ${a.email} ${a.phone}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [apps, q, filter])
  const inqList = useMemo(() => inqs
    .filter((i) => (filter === 'all' || i.status === filter) && `${i.name} ${i.message} ${i.location ?? ''} ${i.email ?? ''} ${i.phone ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [inqs, q, filter])

  const statuses = seg === 'applications' ? APP_STATUSES : INQ_STATUSES
  const counts = (s: string) => (seg === 'applications' ? apps : inqs).filter((x) => s === 'all' || x.status === s).length

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
    <div className="flex flex-col gap-4">
      <div className="flex border-b border-border">
        {([['applications', 'Applications', BriefcaseMedical, newApps], ['inquiries', 'Care requests', MessageSquare, newInqs]] as const).map(([k, label, Icon, n]) => (
          <button key={k} onClick={() => setSeg(k)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold ${seg === k ? 'border-[color:var(--brand-strong)] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Icon className="size-4" />{label}
            {n > 0 && <span className="bg-[color:var(--brand-strong)] px-1.5 text-[10px] font-bold leading-[18px] text-white">{n} new</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <input aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} className={`${fieldCls} pl-9`}
            placeholder={seg === 'applications' ? 'Search name, role, city' : 'Search name, phone, message'} />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {['all', ...statuses].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 text-xs font-semibold ${filter === s ? 'border-[color:var(--brand-strong)] bg-secondary text-secondary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted'}`}>
              {s === 'all' ? 'All' : LABEL[s]}<span className="text-[10px] opacity-70">{counts(s)}</span>
            </button>
          ))}
        </div>
      </div>

      {seg === 'applications' ? (
        appList.length ? (
          <div className="border border-border bg-card">
            <div className="hidden grid-cols-[1.5fr_1.2fr_1fr_130px_70px] gap-4 border-b border-border bg-muted/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground md:grid">
              <span>Applicant</span><span>Role</span><span>Location</span><span>Status</span><span className="text-right">Received</span>
            </div>
            {appList.map((a) => {
              const lic = expiry(a.licenseExpiration ?? a.certificationExpiration)
              return (
                <button key={a.id} onClick={() => setOpenApp(a.id)}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-secondary/50 md:grid-cols-[1.5fr_1.2fr_1fr_130px_70px]">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{fullName(a)}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5 md:hidden"><span className="text-xs text-muted-foreground">{a.role} · {a.city}</span></div>
                    {(lic?.bad || !a.workAuthorized) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {lic?.bad && <Tag tone="danger"><AlertTriangle className="mr-1 size-3" />Credential {lic.text.includes('expired') ? 'expired' : 'expiring'}</Tag>}
                        {!a.workAuthorized && <Tag tone="danger">Not work authorized</Tag>}
                      </div>
                    )}
                  </div>
                  <p className="hidden truncate text-[13px] md:block">{a.role}<span className="block text-xs text-muted-foreground">{a.yearsExperience} yrs</span></p>
                  <p className="hidden truncate text-[13px] text-muted-foreground md:block">{a.city}</p>
                  <div className="flex flex-col items-end gap-1 md:items-start"><Tag tone={TONE[a.status]}>{LABEL[a.status]}</Tag><span className="text-[11px] text-muted-foreground md:hidden">{when(a.createdAt)}</span></div>
                  <p className="hidden text-right text-xs text-muted-foreground md:block">{when(a.createdAt)}</p>
                </button>
              )
            })}
          </div>
        ) : <Empty icon={BriefcaseMedical} title="No applications" body={apps.length ? 'Nothing matches this filter.' : 'Applications from the Careers page will appear here.'} />
      ) : (
        inqList.length ? (
          <div className="border border-border bg-card">
            <div className="hidden grid-cols-[1.3fr_1.6fr_1fr_130px_70px] gap-4 border-b border-border bg-muted/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground md:grid">
              <span>Contact</span><span>Request</span><span>Location</span><span>Status</span><span className="text-right">Received</span>
            </div>
            {inqList.map((i) => (
              <button key={i.id} onClick={() => setOpenInq(i.id)}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-secondary/50 md:grid-cols-[1.3fr_1.6fr_1fr_130px_70px]">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold">{i.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{i.phone || i.email}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground md:hidden">{i.careFor ? `For: ${i.careFor}` : i.message}</p>
                </div>
                <p className="hidden min-w-0 text-[13px] md:block"><span className="block truncate">{i.careFor ? `For: ${i.careFor}` : 'Care request'}</span><span className="block truncate text-xs text-muted-foreground">{pretty(i.service) ?? (i.message || '—')}</span></p>
                <p className="hidden truncate text-[13px] text-muted-foreground md:block">{i.location || '—'}</p>
                <div className="flex flex-col items-end gap-1 md:items-start"><Tag tone={TONE[i.status]}>{LABEL[i.status]}</Tag><span className="text-[11px] text-muted-foreground md:hidden">{when(i.createdAt)}</span></div>
                <p className="hidden text-right text-xs text-muted-foreground md:block">{when(i.createdAt)}</p>
              </button>
            ))}
          </div>
        ) : <Empty icon={Inbox} title="No care requests" body={inqs.length ? 'Nothing matches this filter.' : 'Messages from the Contact page will appear here.'} />
      )}

      {selectedApp && (
        <ApplicationDrawer a={selectedApp} onClose={() => setOpenApp(null)} onOpenResume={onOpenResume}
          onStatus={(status) => patchApp(selectedApp.id, { status })} onNotes={(notes) => patchApp(selectedApp.id, { notes })}
          onDelete={onDeleteApplication ? async () => { await onDeleteApplication(selectedApp.id); setApps((all) => all.filter((x) => x.id !== selectedApp.id)); setOpenApp(null) } : undefined} />
      )}
      {selectedInq && (
        <InquiryDrawer i={selectedInq} onClose={() => setOpenInq(null)}
          onStatus={(status) => patchInq(selectedInq.id, { status })} onNotes={(notes) => patchInq(selectedInq.id, { notes })}
          onDelete={onDeleteInquiry ? async () => { await onDeleteInquiry(selectedInq.id); setInqs((all) => all.filter((x) => x.id !== selectedInq.id)); setOpenInq(null) } : undefined} />
      )}
    </div>
  )
}

/* -------------------------------- shared pieces -------------------------------- */
function StatusBar<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (s: T) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Status</p>
      <div className="flex flex-wrap border border-border bg-card">
        {options.map((s) => (
          <button key={s} onClick={() => onChange(s)}
            className={`flex-1 whitespace-nowrap border-r border-border px-3 py-2 text-xs font-semibold last:border-r-0 ${value === s ? 'bg-[color:var(--brand-strong)] text-white' : 'text-muted-foreground hover:bg-muted'}`}>
            {LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  )
}

function ContactBar({ phone, email }: { phone?: string; email?: string }) {
  const items = [phone && { href: `tel:${phone}`, Icon: Phone, label: 'Call' }, phone && { href: `sms:${phone}`, Icon: MessageSquare, label: 'Text' }, email && { href: `mailto:${email}`, Icon: Mail, label: 'Email' }].filter(Boolean) as { href: string; Icon: React.ElementType; label: string }[]
  return (
    <div className="grid border border-border bg-card" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map(({ href, Icon, label }) => (
        <a key={label} href={href} className="flex items-center justify-center gap-2 border-r border-border py-2.5 text-[13px] font-semibold last:border-r-0 hover:bg-secondary/60"><Icon className="size-4 text-[color:var(--brand-strong)]" />{label}</a>
      ))}
    </div>
  )
}

function NotesBox({ initial, onSave }: { initial?: string; onSave: (n: string) => void }) {
  const [notes, setNotes] = useState(initial ?? '')
  const [saved, setSaved] = useState(false)
  return (
    <Section title="Internal notes" aside={<span className="text-[10px] text-muted-foreground">Supervisors only</span>}>
      <div className="flex flex-col gap-2 py-3">
        <textarea className={areaCls} value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false) }} placeholder="Call outcome, interview notes…" />
        <Button variant="outline" size="sm" className="self-end" onClick={() => { onSave(notes.trim()); setSaved(true) }}>{saved ? <><Check />Saved</> : 'Save notes'}</Button>
      </div>
    </Section>
  )
}

/* ---------------------------------- details ---------------------------------- */
function ApplicationDrawer({ a, onClose, onStatus, onNotes, onOpenResume, onDelete }: {
  a: Application; onClose: () => void; onStatus: (s: ApplicationStatus) => void; onNotes: (n: string) => void
  onOpenResume?: (path: string) => Promise<string | null>; onDelete?: () => Promise<void>
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resumeBusy, setResumeBusy] = useState(false)
  const [printing, setPrinting] = useState(false)
  const lic = expiry(a.licenseExpiration)
  const cert = expiry(a.certificationExpiration)

  async function viewResume() {
    if (!a.resumePath || !onOpenResume) return
    setResumeBusy(true)
    const url = await onOpenResume(a.resumePath)
    setResumeBusy(false)
    if (url) window.open(url, '_blank', 'noopener')
  }

  return (
    <>
      <Drawer size="lg" title={fullName(a)} onClose={onClose}
        subtitle={<span className="flex flex-wrap items-center gap-2"><Tag tone={TONE[a.status]}>{LABEL[a.status]}</Tag>{a.role} · received {new Date(a.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {onDelete ? <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}><Trash2 />Delete</Button> : <span />}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setPrinting(true)}><Printer />Export PDF</Button>
              {a.resumePath && <Button variant="brand" disabled={resumeBusy || !onOpenResume} onClick={viewResume}><FileText />{resumeBusy ? 'Opening…' : 'View resume'}</Button>}
            </div>
          </div>
        }>
        <div className="flex flex-col gap-4">
          <StatusBar value={a.status} options={APP_STATUSES} onChange={onStatus} />
          <ContactBar phone={a.phone} email={a.email} />

          {(lic?.bad || cert?.bad || !a.workAuthorized || !a.hasTransportation) && (
            <div className="flex gap-3 border border-destructive/40 border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-[13px]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <ul className="list-inside list-disc">
                {lic?.bad && <li>License: {lic.text}</li>}
                {cert?.bad && <li>Certification: {cert.text}</li>}
                {!a.workAuthorized && <li>Not authorized to work in the U.S.</li>}
                {!a.hasTransportation && <li>No reliable transportation</li>}
              </ul>
            </div>
          )}

          <Section title="Applying for">
            <KV label="Role" value={a.role} />
            <KV label="Experience" value={`${a.yearsExperience} years${a.pediatricExperience ? ' · pediatric experience' : ''}`} />
            <KV label="Employment" value={a.employmentType} />
            <KV label="Availability" value={a.availability.join(', ')} />
            <KV label="Hours / week" value={a.hoursPerWeek} />
            <KV label="Earliest start" value={dateLabel(a.earliestStart)} />
            <KV label="Can travel to" value={a.travelCounties} />
          </Section>

          <Section title="Credentials">
            <KV label="License no." value={a.licenseNumber} />
            <KV label="State" value={a.licenseState} />
            <KV label="License status" value={a.licenseStatus} />
            <KV label="License expires" value={lic?.text} bad={lic?.bad} />
            <KV label="Registry no." value={a.registryNumber} />
            <KV label="Certification expires" value={cert?.text} bad={cert?.bad} />
            <KV label="Training" value={a.training} />
            <KV label="CPR / BLS" value={a.cprStatus} />
            <KV label="TB / immunizations" value={a.immunizationsCurrent} />
          </Section>

          <Section title="Contact and eligibility">
            <KV label="Phone" value={a.phone} />
            <KV label="Email" value={a.email} />
            <KV label="Location" value={`${a.city} · ${a.countyOrZip}`} />
            <KV label="Work authorized" value={a.workAuthorized ? 'Yes' : 'No'} bad={!a.workAuthorized} />
            <KV label="Transportation" value={a.hasTransportation ? 'Yes' : 'No'} bad={!a.hasTransportation} />
            <KV label="Heard about us" value={a.source} />
          </Section>

          {(a.skills.length > 0 || a.experience) && (
            <Section title="Skills and experience">
              <div className="flex flex-col gap-3 py-3">
                {a.skills.length > 0 && <div className="flex flex-wrap gap-1.5">{a.skills.map((s) => <Tag key={s} tone="brand">{s}</Tag>)}</div>}
                {a.experience && <p className="whitespace-pre-wrap text-[13px] leading-5">{a.experience}</p>}
              </div>
            </Section>
          )}

          {(a.referenceName || a.referencePhone) && (
            <Section title="Reference"><KV label="Name" value={a.referenceName} /><KV label="Phone" value={a.referencePhone} /></Section>
          )}

          <NotesBox initial={a.notes} onSave={onNotes} />
        </div>
      </Drawer>

      {confirmDelete && (
        <ConfirmDialog title="Delete this application?" body={`${fullName(a)}'s application and resume will be permanently removed. This can't be undone.`}
          confirmLabel="Delete application" tone="danger" busy={deleting} onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => { setDeleting(true); await onDelete?.(); setDeleting(false) }} />
      )}
      {printing && (
        <PrintSheet title={`Application - ${fullName(a)} - ${a.role}`} onDone={() => setPrinting(false)}>
          <ApplicationLetter a={a} />
        </PrintSheet>
      )}
    </>
  )
}

function InquiryDrawer({ i, onClose, onStatus, onNotes, onDelete }: {
  i: Inquiry; onClose: () => void; onStatus: (s: InquiryStatus) => void; onNotes: (n: string) => void; onDelete?: () => Promise<void>
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  return (
    <>
      <Drawer size="lg" title={i.name} onClose={onClose}
        subtitle={<span className="flex flex-wrap items-center gap-2"><Tag tone={TONE[i.status]}>{LABEL[i.status]}</Tag>Received {new Date(i.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>}
        footer={onDelete ? <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}><Trash2 />Delete request</Button> : undefined}>
        <div className="flex flex-col gap-4">
          <StatusBar value={i.status} options={INQ_STATUSES} onChange={onStatus} />
          <ContactBar phone={i.phone} email={i.email} />
          <Section title="Request">
            <KV label="Care for" value={i.careFor} />
            <KV label="Service" value={pretty(i.service)} />
            <KV label="Location" value={i.location} />
            <KV label="Best time to call" value={i.bestTime} />
          </Section>
          {i.message && <Section title="Message"><p className="whitespace-pre-wrap py-3 text-[13px] leading-5">{i.message}</p></Section>}
          <Section title="Contact">
            <KV label="Phone" value={i.phone} />
            <KV label="Email" value={i.email} />
            {Object.entries(i.details).map(([k, v]) => <KV key={k} label={pretty(k) ?? k} value={v} />)}
          </Section>
          <NotesBox initial={i.notes} onSave={onNotes} />
        </div>
      </Drawer>
      {confirmDelete && (
        <ConfirmDialog title="Delete this request?" body="It will be permanently removed. This can't be undone." confirmLabel="Delete request" tone="danger" busy={deleting}
          onCancel={() => setConfirmDelete(false)} onConfirm={async () => { setDeleting(true); await onDelete?.(); setDeleting(false) }} />
      )}
    </>
  )
}

export default SupervisorInbox