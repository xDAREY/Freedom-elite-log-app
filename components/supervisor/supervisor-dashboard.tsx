'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowLeft, Check, ChevronRight, ClipboardList, Inbox, KeyRound, LogOut, Plus, Printer,
  Search, Trash2, UserRound, UserX, Users, X,
} from 'lucide-react'
import { SupervisorInbox, type Application, type Inquiry } from '@/components/supervisor/supervisor-inbox'
import { ShiftReport } from '@/components/supervisor/shift-report'
import { PrintSheet } from '@/components/shared/print-sheet'
import { ConfirmDialog, Drawer, Empty, Field, KV, Section, Tag, fieldCls, type Tone } from '@/components/shared/kit'
import { Button } from '@/components/ui/button'
import {
  addPatient, approveShift, approveStaff, declineStaff, deleteApplication, deleteInquiry, currentSupervisor, loadSupervisorData,
  openResume, removePatient, requestCorrection, resetStaffPin, setAssignments, setStaffActive, updateApplication, updateInquiry,
  type Activity as ActivityItem, type Patient, type Shift, type StaffMember,
} from '@/lib/supervisor/api'

type View = 'Queue' | 'Inbox' | 'Staff' | 'Patients' | 'Activity'
const NAV: { name: View; icon: React.ElementType; blurb: string }[] = [
  { name: 'Queue', icon: ClipboardList, blurb: 'Review submitted shift records and incidents.' },
  { name: 'Inbox', icon: Inbox, blurb: 'Job applications and care requests from the website.' },
  { name: 'Staff', icon: Users, blurb: 'Approve new accounts and manage patient assignments.' },
  { name: 'Patients', icon: UserRound, blurb: 'Keep patient details current and complete.' },
  { name: 'Activity', icon: Activity, blurb: 'A read-only record of workspace activity.' },
]
const STATUS: Record<Shift['status'], { label: string; tone: Tone }> = {
  pending: { label: 'Pending review', tone: 'warn' },
  incident: { label: 'Incident', tone: 'danger' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Correction requested', tone: 'neutral' },
}
const stamp = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—')

type Ask = { title: string; body?: string; confirmLabel: string; tone?: 'danger'; run: () => Promise<unknown> }

export function SupervisorDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [view, setView] = useState<View>('Queue')
  const [me, setMe] = useState('Supervisor')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showPatient, setShowPatient] = useState(false)
  const [assigning, setAssigning] = useState<StaffMember | null>(null)
  const [pinFor, setPinFor] = useState<StaffMember | null>(null)
  const [ask, setAsk] = useState<Ask | null>(null)
  const [askBusy, setAskBusy] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [printing, setPrinting] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const d = await loadSupervisorData()
      setShifts(d.shifts); setStaff(d.staff); setPatients(d.patients); setActivity(d.activity)
      setApplications(d.applications); setInquiries(d.inquiries); setError(null)
    } catch (e: any) { setError(e?.message ?? 'Could not load data.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh(); currentSupervisor().then((s) => setMe(s.name)).catch(() => {}) }, [refresh])

  // Run an action, show any error, then reload so the screen matches the database.
  const act = async (fn: () => Promise<unknown>) => {
    try { await fn(); await refresh() } catch (e: any) { setError(e?.message ?? 'Something went wrong.') }
  }
  const confirmThen = (a: Ask) => setAsk(a)

  const inboxNew = applications.filter((a) => a.status === 'new').length + inquiries.filter((i) => i.status === 'new').length
  const queueOpen = shifts.filter((s) => s.status === 'pending' || s.status === 'incident').length
  const awaiting = staff.filter((s) => s.status === 'awaiting').length
  const count = (n: View) => (n === 'Queue' ? queueOpen : n === 'Inbox' ? inboxNew : n === 'Staff' ? awaiting : 0)
  const selected = shifts.find((s) => s.id === selectedId) ?? null
  const current = NAV.find((n) => n.name === view)!

  return (
    <div className="min-h-dvh bg-[#F6F8F7] text-foreground">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:px-8">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="size-9 shrink-0" />
          <div className="leading-none">
            <p className="font-heading text-[15px] font-extrabold uppercase tracking-[0.06em]">Freedom Elite</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Home Care · Supervisor</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-[13px] font-semibold">{me}</p>
            <p className="text-[11px] text-muted-foreground">Supervisor</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSignOutOpen(true)}><LogOut />Sign out</Button>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1180px]">
        <aside className="hidden w-60 shrink-0 border-r border-border bg-background lg:block">
          <p className="px-5 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
          <nav className="flex flex-col">
            {NAV.map(({ name, icon: Icon }) => (
              <button key={name} onClick={() => setView(name)}
                className={`flex h-11 items-center gap-3 border-l-[3px] px-5 text-[13px] font-semibold transition-colors ${view === name ? 'border-[color:var(--brand-strong)] bg-secondary text-secondary-foreground' : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Icon className="size-4" />{name}
                {count(name) > 0 && <span className="ml-auto bg-[color:var(--brand-strong)] px-1.5 text-[10px] font-bold leading-[18px] text-white">{count(name)}</span>}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:px-9 lg:pb-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-strong)]">Supervisor workspace</p>
              <h1 className="mt-1 font-heading text-[28px] font-extrabold leading-tight tracking-tight">{view}</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">{current.blurb}</p>
            </div>
            {view === 'Patients' && <Button variant="brand" onClick={() => setShowPatient(true)}><Plus />Add patient</Button>}
          </div>

          {error && (
            <div role="alert" className="mb-5 flex items-start justify-between gap-3 border border-destructive/40 border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-[13px]">
              <p>{error}</p><button onClick={() => setError(null)} aria-label="Dismiss" className="shrink-0"><X className="size-4" /></button>
            </div>
          )}
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {!loading && view === 'Queue' && <Queue shifts={shifts} onSelect={(s) => setSelectedId(s.id)} />}
          {!loading && view === 'Inbox' && (
            <SupervisorInbox applications={applications} inquiries={inquiries}
              onUpdateApplication={(id, patch) => act(() => updateApplication(id, patch))}
              onUpdateInquiry={(id, patch) => act(() => updateInquiry(id, patch))}
              onDeleteApplication={(id) => act(() => deleteApplication(id))}
              onDeleteInquiry={(id) => act(() => deleteInquiry(id))}
              onOpenResume={openResume} />
          )}
          {!loading && view === 'Staff' && (
            <StaffView staff={staff}
              onApprove={(s) => act(() => approveStaff(s.id))}
              onDecline={(s) => confirmThen({ title: `Decline ${s.name}?`, body: 'Their request will be deleted and they will need to register again.', confirmLabel: 'Decline request', tone: 'danger', run: () => act(() => declineStaff(s.id)) })}
              onAssign={setAssigning}
              onResetPin={setPinFor}
              onDeactivate={(s) => confirmThen({ title: `Deactivate ${s.name}?`, body: 'They will no longer be able to sign in. Their past records are kept.', confirmLabel: 'Deactivate', tone: 'danger', run: () => act(() => setStaffActive(s.id, false)) })} />
          )}
          {!loading && view === 'Patients' && (
            <PatientsView patients={patients} onAdd={() => setShowPatient(true)}
              onRemove={(p) => confirmThen({ title: `Remove ${p.name}?`, body: 'This deletes the patient. It is blocked if they already have shift records.', confirmLabel: 'Remove patient', tone: 'danger', run: () => act(() => removePatient(p.id)) })} />
          )}
          {!loading && view === 'Activity' && <ActivityView items={activity} />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map(({ name, icon: Icon }) => (
          <button key={name} onClick={() => setView(name)}
            className={`relative flex h-14 flex-col items-center justify-center gap-0.5 border-t-2 text-[10.5px] font-semibold ${view === name ? 'border-[color:var(--brand-strong)] bg-secondary text-secondary-foreground' : 'border-transparent text-muted-foreground'}`}>
            <Icon className="size-[18px]" /><span>{name}</span>
            {count(name) > 0 && <span className="absolute right-[18%] top-1 bg-[color:var(--brand-strong)] px-1 text-[9px] font-bold leading-4 text-white">{count(name)}</span>}
          </button>
        ))}
      </nav>

      {selected && (
        <ShiftDetail shift={selected} onClose={() => setSelectedId(null)} onExport={() => setPrinting(selected)}
          onApprove={async () => { await act(() => approveShift(selected.id)); setSelectedId(null) }}
          onCorrection={async (comment) => { await act(() => requestCorrection(selected.id, comment)); setSelectedId(null) }} />
      )}
      {showPatient && <PatientDrawer onClose={() => setShowPatient(false)} onSave={async (p) => { await act(() => addPatient(p)); setShowPatient(false) }} />}
      {assigning && <AssignDrawer member={assigning} patients={patients} onClose={() => setAssigning(null)} onSave={async (ids) => { await act(() => setAssignments(assigning.id, ids)); setAssigning(null) }} />}
      {pinFor && <PinDialog member={pinFor} onCancel={() => setPinFor(null)} onSave={async (pin) => { await act(() => resetStaffPin(pinFor.id, pin)); setPinFor(null) }} />}

      {ask && (
        <ConfirmDialog title={ask.title} body={ask.body} confirmLabel={ask.confirmLabel} tone={ask.tone} busy={askBusy}
          onCancel={() => setAsk(null)}
          onConfirm={async () => { setAskBusy(true); await ask.run(); setAskBusy(false); setAsk(null) }} />
      )}
      {signOutOpen && (
        <ConfirmDialog title="Sign out of Freedom Elite?" body="You will need your phone number and PIN to sign back in."
          confirmLabel="Sign out" onCancel={() => setSignOutOpen(false)} onConfirm={() => { setSignOutOpen(false); onSignOut() }} />
      )}
      {printing && (
        <PrintSheet title={`Shift Report - ${printing.patient.name} - ${printing.date}`} onDone={() => setPrinting(null)}>
          <ShiftReport shift={printing} />
        </PrintSheet>
      )}
    </div>
  )
}

/* ----------------------------------- queue ----------------------------------- */
function Queue({ shifts, onSelect }: { shifts: Shift[]; onSelect: (s: Shift) => void }) {
  const [filter, setFilter] = useState<'all' | 'incident' | 'pending' | 'approved'>('all')
  const n = (st: Shift['status']) => shifts.filter((s) => s.status === st).length
  const shown = shifts.filter((s) => filter === 'all' || s.status === filter)
  const stats = [['Pending review', n('pending')], ['Incidents', n('incident')], ['Approved', n('approved')]] as const
  const tabs = [['all', 'All', shifts.length], ['incident', 'Incidents', n('incident')], ['pending', 'Pending', n('pending')], ['approved', 'Approved', n('approved')]] as const

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-3 divide-x divide-border border border-border bg-card">
        {stats.map(([label, value]) => (
          <div key={label} className="px-4 py-3.5">
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-heading text-3xl font-extrabold leading-none">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex gap-0 overflow-x-auto border-b border-border">
        {tabs.map(([k, label, c]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold ${filter === k ? 'border-[color:var(--brand-strong)] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}<span className="bg-muted px-1.5 text-[10px] font-bold leading-[18px] text-muted-foreground">{c}</span>
          </button>
        ))}
      </div>

      {!shown.length ? (
        <Empty icon={ClipboardList} title="No shifts to show" body="Submitted shifts will appear here for review." />
      ) : (
        <div className="border border-border bg-card">
          <div className="hidden grid-cols-[1.3fr_1.5fr_1fr_150px_20px] gap-4 border-b border-border bg-muted/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground md:grid">
            <span>Staff</span><span>Patient</span><span>Shift date</span><span>Status</span><span />
          </div>
          {shown.map((s) => (
            <button key={s.id} onClick={() => onSelect(s)}
              className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-secondary/50 md:grid-cols-[1.3fr_1.5fr_1fr_150px_20px]">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{s.staff.name}</p>
                <p className="truncate text-xs text-muted-foreground md:hidden">{s.patient.name} · {s.date}</p>
                <p className="hidden text-xs text-muted-foreground md:block">{s.staff.role}</p>
              </div>
              <p className="hidden truncate text-[13px] md:block">{s.patient.name}</p>
              <p className="hidden text-[13px] text-muted-foreground md:block">{s.date}</p>
              <div className="flex items-center gap-1.5">
                {s.status === 'incident' && <AlertTriangle className="size-3.5 text-destructive md:hidden" />}
                <Tag tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Tag>
              </div>
              <ChevronRight className="hidden size-4 text-muted-foreground md:block" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------- shift record view ------------------------------- */
function ShiftDetail({ shift, onClose, onExport, onApprove, onCorrection }: {
  shift: Shift; onClose: () => void; onExport: () => void; onApprove: () => Promise<void>; onCorrection: (comment: string) => Promise<void>
}) {
  const [correcting, setCorrecting] = useState(false)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const open = shift.status === 'pending' || shift.status === 'incident'
  const run = async (fn: () => Promise<void>) => { setBusy(true); await fn(); setBusy(false) }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#F6F8F7]">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 lg:px-8">
        <Button variant="outline" onClick={onClose}><ArrowLeft />Back to queue</Button>
        <div className="flex items-center gap-2">
          <Tag tone={STATUS[shift.status].tone}>{STATUS[shift.status].label}</Tag>
          {shift.status === 'approved' && <Button variant="brand" onClick={onExport}><Printer />Export PDF</Button>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[980px] flex-col gap-5 px-4 py-6 pb-10 lg:px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-strong)]">Shift record · {shift.date}</p>
            <h2 className="mt-1 font-heading text-[30px] font-extrabold leading-tight">{shift.patient.name}</h2>
          </div>

          <Section title="Patient and staff">
            <dl className="grid sm:grid-cols-2 sm:gap-x-10">
              <KV label="Patient" value={shift.patient.name} />
              <KV label="Date of birth" value={shift.patient.dob} />
              <KV label="Medicaid no." value={shift.patient.medicaid} />
              <KV label="Diagnoses" value={shift.patient.diagnoses.map((d) => d.name).join(', ') || '—'} />
              <KV label="Staff" value={shift.staff.name} />
              <KV label="Role" value={shift.staff.role} />
              <KV label="Shift date" value={shift.date} />
              <KV label="Submitted" value={stamp(shift.submittedAt)} />
            </dl>
          </Section>

          {shift.incident && (
            <div className="flex gap-3 border border-destructive/40 border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-[13px]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p><strong className="uppercase tracking-wide text-destructive">Incident reported.</strong> {shift.incident}</p>
            </div>
          )}

          <Section title={`Care timeline · ${shift.timeline.length} ${shift.timeline.length === 1 ? 'entry' : 'entries'}`}>
            {!shift.timeline.length && <p className="py-3 text-[13px] text-muted-foreground">No entries were recorded.</p>}
            {shift.timeline.map((e) => (
              <div key={e.id} className="grid grid-cols-[64px_1fr] gap-3 border-b border-border/70 py-3 last:border-b-0 sm:grid-cols-[72px_100px_1fr]">
                <span className="text-[13px] font-bold text-muted-foreground">{e.time}</span>
                <span className="hidden self-start sm:block"><Tag tone={e.type === 'incident' ? 'danger' : 'brand'}>{e.type}</Tag></span>
                <div className="min-w-0 text-[13px] leading-5">
                  <span className="mb-1 block sm:hidden"><Tag tone={e.type === 'incident' ? 'danger' : 'brand'}>{e.type}</Tag></span>
                  {e.text}
                </div>
              </div>
            ))}
          </Section>

          <div className="grid gap-5 md:grid-cols-3">
            {([['Summary', shift.summary], ['Observations', shift.observations], ['Recommendations', shift.recommendations]] as const).map(([t, v]) => (
              <Section key={t} title={t}><p className="whitespace-pre-wrap py-2.5 text-[13px] leading-5">{v}</p></Section>
            ))}
          </div>

          {shift.status === 'approved' && (
            <div className="flex items-center gap-3 border border-[color:var(--success)]/40 border-l-4 border-l-[color:var(--success)] bg-[color:var(--success)]/10 px-4 py-3 text-[13px]">
              <Check className="size-4 shrink-0 text-[color:var(--success)]" />
              <p><strong>Approved by {shift.reviewer || 'a supervisor'}</strong> · {stamp(shift.reviewedAt)}</p>
            </div>
          )}
          {shift.status === 'rejected' && (
            <div className="border border-border border-l-4 border-l-destructive bg-card px-4 py-3 text-[13px]">
              <p className="font-semibold">Correction requested by {shift.reviewer || 'a supervisor'}</p>
              <p className="mt-1 text-muted-foreground">{shift.reviewComment}</p>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:px-8">
          <div className="mx-auto flex w-full max-w-[980px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {correcting ? (
              <>
                <input autoFocus value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What needs to be corrected? (required)" className={`${fieldCls} sm:max-w-md`} />
                <div className="flex gap-2 sm:justify-end">
                  <Button variant="outline" onClick={() => { setCorrecting(false); setComment('') }} disabled={busy}>Cancel</Button>
                  <Button variant="destructive" disabled={!comment.trim() || busy} onClick={() => run(() => onCorrection(comment.trim()))}>Send correction</Button>
                </div>
              </>
            ) : (
              <div className="flex gap-2 sm:justify-end">
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setCorrecting(true)}>Request correction</Button>
                <Button variant="brand" className="flex-1 sm:flex-none" disabled={busy} onClick={() => run(onApprove)}><Check />Approve shift</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ----------------------------------- staff ----------------------------------- */
function StaffView({ staff, onApprove, onDecline, onAssign, onResetPin, onDeactivate }: {
  staff: StaffMember[]; onApprove: (s: StaffMember) => void; onDecline: (s: StaffMember) => void
  onAssign: (s: StaffMember) => void; onResetPin: (s: StaffMember) => void; onDeactivate: (s: StaffMember) => void
}) {
  const waiting = staff.filter((s) => s.status === 'awaiting')
  const active = staff.filter((s) => s.status === 'active')
  const groups: { title: string; role: StaffMember['role'] }[] = [{ title: 'Nurses', role: 'Nurse' }, { title: 'CNA / PNA', role: 'CNA/PNA' }]

  return (
    <div className="flex flex-col gap-7">
      {waiting.length > 0 && (
        <section>
          <SectionTitle title="Awaiting approval" count={waiting.length} tone="warn" />
          <div className="border border-border border-l-4 border-l-[color:var(--warning)] bg-card">
            {waiting.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[14px] font-semibold">{s.name}<Tag tone="brand">{s.role}</Tag></p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.phone}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onDecline(s)}>Decline</Button>
                  <Button variant="brand" size="sm" onClick={() => onApprove(s)}><Check />Approve</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {groups.map(({ title, role }) => {
        const rows = active.filter((s) => s.role === role)
        return (
          <section key={role}>
            <SectionTitle title={title} count={rows.length} />
            {!rows.length ? (
              <p className="border border-dashed border-border bg-card px-4 py-6 text-center text-[13px] text-muted-foreground">No approved {title.toLowerCase()} yet.</p>
            ) : (
              <div className="border border-border bg-card">
                <div className="hidden grid-cols-[1.4fr_1.1fr_110px_auto] gap-4 border-b border-border bg-muted/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground md:grid">
                  <span>Name</span><span>Phone</span><span>Patients</span><span className="w-[250px] text-right">Actions</span>
                </div>
                {rows.map((s) => (
                  <div key={s.id} className="grid items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[1.4fr_1.1fr_110px_auto]">
                    <p className="text-[14px] font-semibold">{s.name}</p>
                    <p className="text-[13px] text-muted-foreground">{s.phone}</p>
                    <p className="text-[13px]">{s.patientIds.length} assigned</p>
                    <div className="flex items-center gap-2 md:w-[250px] md:justify-end">
                      <Button variant="outline" size="sm" onClick={() => onAssign(s)}>Assign patients</Button>
                      <Button variant="outline" size="icon-sm" title="Reset PIN" aria-label={`Reset PIN for ${s.name}`} onClick={() => onResetPin(s)}><KeyRound /></Button>
                      <Button variant="destructive" size="icon-sm" title="Deactivate" aria-label={`Deactivate ${s.name}`} onClick={() => onDeactivate(s)}><UserX /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
function SectionTitle({ title, count, tone }: { title: string; count: number; tone?: Tone }) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <h2 className="font-heading text-base font-extrabold">{title}</h2>
      <Tag tone={tone ?? 'neutral'}>{count}</Tag>
    </div>
  )
}

/* ---------------------------------- patients ---------------------------------- */
function PatientsView({ patients, onAdd, onRemove }: { patients: Patient[]; onAdd: () => void; onRemove: (p: Patient) => void }) {
  const [q, setQ] = useState('')
  const shown = useMemo(() => patients.filter((p) => `${p.name} ${p.location} ${p.medicaid} ${p.diagnoses.map((d) => d.name).join(' ')}`.toLowerCase().includes(q.toLowerCase())), [patients, q])
  if (!patients.length)
    return (
      <div className="border border-dashed border-border bg-card px-6 py-14 text-center">
        <UserRound className="mx-auto size-7 text-muted-foreground" />
        <p className="mt-3 text-sm font-bold">No patients yet</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">Add the first patient, then assign them to a nurse or CNA from the Staff tab.</p>
        <Button variant="brand" className="mt-5" onClick={onAdd}><Plus />Add patient</Button>
      </div>
    )
  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, location, Medicaid, diagnosis" aria-label="Search patients" className={`${fieldCls} pl-9`} />
      </div>
      <div className="border border-border bg-card">
        <div className="hidden grid-cols-[1.3fr_1fr_1.1fr_1.5fr_40px] gap-4 border-b border-border bg-muted/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground md:grid">
          <span>Patient</span><span>Date of birth</span><span>Medicaid no.</span><span>Diagnoses</span><span />
        </div>
        {!shown.length && <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">No patients match “{q}”.</p>}
        {shown.map((p) => (
          <div key={p.id} className="grid items-start gap-x-4 gap-y-1.5 border-b border-border px-4 py-3.5 last:border-b-0 md:grid-cols-[1.3fr_1fr_1.1fr_1.5fr_40px]">
            <div className="min-w-0"><p className="text-[14px] font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.location}</p></div>
            <p className="text-[13px]"><span className="text-muted-foreground md:hidden">DOB · </span>{p.dob}</p>
            <p className="text-[13px]"><span className="text-muted-foreground md:hidden">Medicaid · </span>{p.medicaid}</p>
            <div className="flex flex-wrap gap-1.5">{p.diagnoses.length ? p.diagnoses.map((d) => <Tag key={d.name} tone="brand">{d.name}</Tag>) : <span className="text-xs text-muted-foreground">None listed</span>}</div>
            <div className="md:text-right"><Button variant="destructive" size="icon-sm" title="Remove patient" aria-label={`Remove ${p.name}`} onClick={() => onRemove(p)}><Trash2 /></Button></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PatientDrawer({ onClose, onSave }: { onClose: () => void; onSave: (p: { name: string; location: string; dob: string; medicaid: string; diagnoses: { name: string; description?: string }[] }) => Promise<void> }) {
  const [name, setName] = useState(''); const [location, setLocation] = useState(''); const [dob, setDob] = useState(''); const [medicaid, setMedicaid] = useState('')
  const [dx, setDx] = useState([{ name: '', description: '' }]); const [busy, setBusy] = useState(false)
  const ok = name.trim() && location.trim() && dob && medicaid.trim() && dx[0].name.trim()
  const setAt = (i: number, patch: Partial<{ name: string; description: string }>) => setDx((all) => all.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  return (
    <Drawer title="Add patient" subtitle="These details appear on every shift record and printed report." onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="brand" disabled={!ok || busy} onClick={async () => { setBusy(true); await onSave({ name, location, dob, medicaid, diagnoses: dx }); setBusy(false) }}>{busy ? 'Saving…' : 'Add patient'}</Button>
        </div>
      }>
      <div className="flex flex-col gap-5">
        <Section title="Patient details">
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Full name" required><input className={fieldCls} value={name} onChange={(e) => setName(e.target.value.replace(/[^\p{L}\p{M}\s'’.\-]/gu, ''))} autoFocus /></Field></div>
            <Field label="Location / room" required><input className={fieldCls} value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
            <Field label="Date of birth" required><input type="date" className={fieldCls} value={dob} onChange={(e) => setDob(e.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Medicaid number" required><input className={fieldCls} value={medicaid} onChange={(e) => setMedicaid(e.target.value.replace(/[^A-Za-z0-9\-]/g, ''))} /></Field></div>
          </div>
        </Section>
        <Section title="Diagnoses" aside={<Button variant="outline" size="xs" onClick={() => setDx((all) => [...all, { name: '', description: '' }])}><Plus />Add</Button>}>
          <div className="flex flex-col divide-y divide-border">
            {dx.map((d, i) => (
              <div key={i} className="flex flex-col gap-3 py-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1"><Field label={i === 0 ? 'Primary diagnosis' : `Diagnosis ${i + 1}`} required={i === 0}><input className={fieldCls} value={d.name} onChange={(e) => setAt(i, { name: e.target.value })} /></Field></div>
                  {i > 0 && <Button variant="outline" size="icon" aria-label="Remove diagnosis" onClick={() => setDx((all) => all.filter((_, j) => j !== i))}><X /></Button>}
                </div>
                <Field label="Description (optional)"><input className={fieldCls} value={d.description} onChange={(e) => setAt(i, { description: e.target.value })} /></Field>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </Drawer>
  )
}

function AssignDrawer({ member, patients, onClose, onSave }: { member: StaffMember; patients: Patient[]; onClose: () => void; onSave: (ids: string[]) => Promise<void> }) {
  const [ids, setIds] = useState<string[]>(member.patientIds); const [busy, setBusy] = useState(false)
  const toggle = (id: string) => setIds((all) => (all.includes(id) ? all.filter((x) => x !== id) : [...all, id]))
  return (
    <Drawer title="Assign patients" subtitle={<>{member.name} · {member.role} can document care only for the patients selected here.</>} onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{ids.length} selected</span>
          <div className="flex gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button variant="brand" disabled={busy} onClick={async () => { setBusy(true); await onSave(ids); setBusy(false) }}>{busy ? 'Saving…' : 'Save assignments'}</Button></div>
        </div>
      }>
      {!patients.length ? <Empty icon={UserRound} title="No patients yet" body="Add a patient first from the Patients tab." /> : (
        <div className="border border-border bg-card">
          {patients.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-secondary/40">
              <input type="checkbox" checked={ids.includes(p.id)} onChange={() => toggle(p.id)} className="size-4 accent-[color:var(--brand-strong)]" />
              <span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold">{p.name}</span><span className="block truncate text-xs text-muted-foreground">{p.location} · {p.diagnoses.map((d) => d.name).join(', ') || 'No diagnoses'}</span></span>
            </label>
          ))}
        </div>
      )}
    </Drawer>
  )
}

function PinDialog({ member, onCancel, onSave }: { member: StaffMember; onCancel: () => void; onSave: (pin: string) => Promise<void> }) {
  const [pin, setPin] = useState(''); const [busy, setBusy] = useState(false)
  return (
    <ConfirmDialog title={`Reset PIN for ${member.name}`} body="Give them this temporary PIN. They will be asked to choose their own when they sign in."
      confirmLabel="Reset PIN" busy={busy} disabled={pin.length < 4} onCancel={onCancel}
      onConfirm={async () => { setBusy(true); await onSave(pin); setBusy(false) }}>
      <Field label="Temporary PIN" hint="4 to 6 digits"><input className={fieldCls} inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} autoFocus /></Field>
    </ConfirmDialog>
  )
}

/* ---------------------------------- activity ---------------------------------- */
function ActivityView({ items }: { items: ActivityItem[] }) {
  if (!items.length) return <Empty icon={Activity} title="No activity recorded yet" />
  return (
    <div className="border border-border bg-card">
      <div className="hidden grid-cols-[1.2fr_2fr_1.3fr] gap-4 border-b border-border bg-muted/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground md:grid">
        <span>Who</span><span>What</span><span>When</span>
      </div>
      {items.map((i) => (
        <div key={i.id} className="grid gap-x-4 gap-y-0.5 border-b border-border px-4 py-3 text-[13px] last:border-b-0 md:grid-cols-[1.2fr_2fr_1.3fr]">
          <p className="font-semibold">{i.actor}</p><p>{i.action}</p><p className="text-xs text-muted-foreground md:text-[13px]">{i.at}</p>
        </div>
      ))}
    </div>
  )
}

export function SupervisorLanding({ onBack, onSignOut }: { onBack: () => void; onSignOut?: () => void }) { return <SupervisorDashboard onSignOut={onSignOut || onBack} /> }