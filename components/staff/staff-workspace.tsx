'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, Bell, CalendarDays, Check, CheckCircle2, ChevronRight, ClipboardCheck, ClipboardList,
  Clock3, FileText, History as HistoryIcon, Home, LogOut, Pill, Search, ShieldCheck, Stethoscope, Thermometer,
  UserRound, UsersRound, X, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SignOutDialog } from '@/components/shared/sign-out-dialog' // adjust path to where your dialog lives
import {
  CARE_TAGS, ROUTES_OF_ADMINISTRATION, SEIZURE_OBSERVATIONS, TASK_GROUPS, TEMPERATURE_METHODS,
  formatClock, initials, newId, nowTime,
  type CareStatus, type Entry, type NotificationItem, type Patient, type Shift, type StaffRoleLabel, type SubmitPayload,
} from '@/lib/staff/data'

/* ------------------------------ shared styles ------------------------------ */
const inputCls = 'h-11.5 rounded-[11px] border-[1.5px] px-3 text-sm'
const areaCls = 'min-h-24 w-full rounded-[11px] border-[1.5px] border-input bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30'
const selectCls = 'h-11.5 w-full rounded-[11px] border-[1.5px] border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30'
const labelCls = 'flex flex-col gap-1.5 text-[13px] font-bold'
const primaryCls = 'h-12 w-full rounded-xl text-[13px] font-bold'
const eyebrow = 'text-[10px] font-bold uppercase tracking-[0.11em]'

const ACTIONS = [
  { kind: 'note', label: 'Add note', helper: 'Hourly care update', icon: FileText, tone: 'bg-secondary text-secondary-foreground' },
  { kind: 'medication', label: 'Log medication', helper: 'Record administration', icon: Pill, tone: 'bg-[color:var(--brand-soft)] text-secondary-foreground' },
  { kind: 'incident', label: 'Report incident', helper: 'Document an event', icon: AlertTriangle, tone: 'bg-destructive/10 text-destructive' },
  { kind: 'task', label: 'Tasks', helper: 'Check off completed', icon: ClipboardCheck, tone: 'bg-[color:var(--gold)]/20 text-foreground' },
  { kind: 'vitals', label: 'Log vitals', helper: 'BP, pulse, resp, O2', icon: Activity, tone: 'bg-secondary text-secondary-foreground' },
  { kind: 'temperature', label: 'Log temperature', helper: 'Record a reading', icon: Thermometer, tone: 'bg-[color:var(--warning)]/10 text-[color:var(--warning)]' },
] as const

type SheetKind = 'start' | 'note' | 'medication' | 'incident' | 'task' | 'vitals' | 'temperature' | 'end' | null
type Tab = 'home' | 'patients' | 'history'

const STATUS_LABEL: Record<Shift['status'], string> = { in_progress: 'In progress', submitted: 'Awaiting review', approved: 'Approved', rejected: 'Needs correction' }
const STATUS_TONE: Record<Shift['status'], string> = {
  in_progress: 'bg-muted text-muted-foreground',
  submitted: 'bg-[color:var(--gold)]/20 text-foreground',
  approved: 'bg-secondary text-secondary-foreground',
  rejected: 'bg-destructive/10 text-destructive',
}

const NO_PATIENTS: Patient[] = []
const NO_SHIFTS: Shift[] = []
const NO_NOTES: NotificationItem[] = []

function entryStamp(e: Entry) {
  return `${new Date(e.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${e.timeframe || e.time}`
}

/* --------------------------------- props ---------------------------------- */
// Everything dynamic comes in through props. Nothing is hard-coded here.
// With no props the screen shows real empty states (no patients, no shifts).
export type StaffWorkspaceProps = {
  user: { id: string; name: string; role: StaffRoleLabel }
  patients?: Patient[]
  shifts?: Shift[]
  notifications?: NotificationItem[]
  onSignOut: () => void
  // Optional persistence hooks. Wire these to Supabase later; the UI updates locally either way.
  onStartShift?: (patientIds: string[]) => void | Promise<void>
  onAddEntry?: (shiftId: string, entry: Entry) => void | Promise<void>
  onSubmitShift?: (shiftId: string, payload: SubmitPayload) => void | Promise<void>
  onReopenShift?: (shiftId: string) => void | Promise<void>
  onNotificationsRead?: () => void | Promise<void>
}

export function StaffWorkspace({
  user, patients = NO_PATIENTS, shifts: initialShifts = NO_SHIFTS, notifications: initialNotes = NO_NOTES, onSignOut,
  onStartShift, onAddEntry, onSubmitShift, onReopenShift, onNotificationsRead,
}: StaffWorkspaceProps) {
  const [tab, setTab] = useState<Tab>('home')
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [shifts, setShifts] = useState<Shift[]>(initialShifts)
  const [notes, setNotes] = useState<NotificationItem[]>(initialNotes)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [confirmEditId, setConfirmEditId] = useState<string | null>(null)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => setShifts(initialShifts), [initialShifts])
  useEffect(() => setNotes(initialNotes), [initialNotes])
  useEffect(() => { setNow(new Date()) }, [])

  const myShifts = useMemo(() => shifts.filter((s) => s.nurseId === user.id), [shifts, user.id])
  const active = myShifts.find((s) => s.status === 'in_progress')
  const unread = notes.filter((n) => !n.read).length
  const firstName = user.name.trim().split(' ')[0] || 'there'
  const hour = now?.getHours() ?? 12
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateLabel = now ? now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''
  const patientName = (id: string) => patients.find((p) => p.id === id)?.name
  const namesFor = (s: Shift) => s.patientIds.map(patientName).filter(Boolean).join(', ') || 'Patient'

  /* ------------------------------- actions -------------------------------- */
  const patchShift = (id: string, fn: (s: Shift) => Shift) => setShifts((all) => all.map((s) => (s.id === id ? fn(s) : s)))

  async function startShift(patientId: string) {
    const shift: Shift = { id: newId(), nurseId: user.id, patientIds: [patientId], status: 'in_progress', startedAt: new Date().toISOString(), entries: [], incident: false, followUp: false }
    setShifts((all) => [shift, ...all])
    setSheet(null)
    setTab('home')
    await onStartShift?.([patientId])
  }

  async function addEntry(entry: Entry) {
    if (!active) return
    patchShift(active.id, (s) => ({ ...s, incident: s.incident || entry.kind === 'incident', entries: [entry, ...s.entries] }))
    setSheet(null)
    await onAddEntry?.(active.id, entry)
  }

  async function submitShift(payload: SubmitPayload) {
    if (!active) return
    patchShift(active.id, (s) => ({ ...s, ...payload, status: 'submitted', submittedAt: new Date().toISOString(), reviewComment: undefined }))
    setSheet(null)
    setTab('history')
    await onSubmitShift?.(active.id, payload)
  }

  async function reopenShift(id: string) {
    if (active) return
    patchShift(id, (s) => ({ ...s, status: 'in_progress' }))
    setTab('home')
    await onReopenShift?.(id)
  }

  async function toggleNotices() {
    const next = !noticeOpen
    setNoticeOpen(next)
    if (next && unread) {
      setNotes((n) => n.map((x) => ({ ...x, read: true })))
      await onNotificationsRead?.()
    }
  }

  /* -------------------------------- render -------------------------------- */
  return (
    <main className="min-h-dvh bg-[#F3F6F4] text-foreground">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-background pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <header className="border-b border-border px-4 pb-3.5 pt-3">
          <div className="flex items-center justify-between">
            <p className="font-heading text-[13px] font-bold tracking-tight text-secondary-foreground">Freedom Elite</p>
            <div className="flex items-center gap-1">
              <button aria-label={unread ? `${unread} unread notifications` : 'Notifications'} onClick={toggleNotices} className="relative flex size-9 items-center justify-center rounded-full hover:bg-muted">
                <Bell className="size-[18px]" />
                {unread > 0 && <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-white">{unread}</span>}
              </button>
              <div aria-label={user.name} className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{initials(user.name)}</div>
            </div>
          </div>
          <p className={`${eyebrow} mt-3 text-muted-foreground`}>{dateLabel || ' '}</p>
          <h1 className="mt-1 font-heading text-[22px] font-bold leading-tight">
            {tab === 'home' ? `${greeting}, ${firstName}` : tab === 'patients' ? 'Patients' : 'History'}
          </h1>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">{user.role}</span>
            {active && <span className="flex items-center gap-1 text-[11px] font-semibold text-secondary-foreground"><span className="size-1.5 rounded-full bg-primary" /> Shift in progress</span>}
          </div>
          {noticeOpen && (
            <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold">Notifications</p><button aria-label="Close notifications" onClick={() => setNoticeOpen(false)} className="flex size-7 items-center justify-center"><X className="size-4" /></button></div>
              {notes.length ? (
                <div className="flex flex-col gap-2.5">
                  {[...notes].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).map((n) => (
                    <div key={n.id} className="flex gap-2.5">
                      <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${n.type === 'approved' ? 'bg-secondary text-secondary-foreground' : 'bg-destructive/10 text-destructive'}`}>{n.type === 'approved' ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}</span>
                      <div><p className="text-[13px] leading-5">{n.message}</p><p className="text-[11px] text-muted-foreground">{new Date(n.timestamp).toLocaleString()}</p></div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[13px] text-muted-foreground">No notifications yet. You&apos;ll be notified here when a supervisor reviews your shift.</p>}
            </div>
          )}
        </header>

        <div className="px-4 py-4">
          {tab === 'home' && <HomeView active={active} role={user.role} hasPatients={patients.length > 0} namesFor={namesFor} onOpen={setSheet} />}
          {tab === 'patients' && <PatientsView patients={patients} />}
          {tab === 'history' && <HistoryView shifts={myShifts} namesFor={namesFor} hasActive={!!active} onReopen={reopenShift} onEdit={setConfirmEditId} />}
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur">
          <div className="mx-auto grid w-full max-w-[430px] grid-cols-4">
            <NavButton active={tab === 'home'} icon={Home} label="Home" onClick={() => setTab('home')} />
            <NavButton active={tab === 'patients'} icon={UserRound} label="Patients" onClick={() => setTab('patients')} />
            <NavButton active={tab === 'history'} icon={CalendarDays} label="History" onClick={() => setTab('history')} />
            <NavButton active={false} icon={LogOut} label="Sign out" onClick={() => setSignOutOpen(true)} />
          </div>
        </nav>

        {sheet === 'start' && <Sheet title="Who are you caring for?" onClose={() => setSheet(null)}><StartShift patients={patients} onStart={startShift} /></Sheet>}
        {sheet === 'note' && active && <Sheet title="Add hourly note" onClose={() => setSheet(null)}><NoteForm subtitle={namesFor(active)} onSave={addEntry} /></Sheet>}
        {sheet === 'medication' && active && <Sheet title="Log medication" onClose={() => setSheet(null)}><MedicationForm onSave={addEntry} /></Sheet>}
        {sheet === 'incident' && active && <Sheet title="Report an incident" onClose={() => setSheet(null)}><IncidentForm onSave={addEntry} /></Sheet>}
        {sheet === 'task' && active && <Sheet title="Log tasks completed" onClose={() => setSheet(null)}><TaskForm onSave={addEntry} /></Sheet>}
        {sheet === 'vitals' && active && <Sheet title="Log vitals" onClose={() => setSheet(null)}><VitalsForm onSave={addEntry} /></Sheet>}
        {sheet === 'temperature' && active && <Sheet title="Log temperature" onClose={() => setSheet(null)}><TemperatureForm onSave={addEntry} /></Sheet>}
        {sheet === 'end' && active && <Sheet title={active.reviewComment ? 'Fix & resubmit shift' : active.summary ? 'Edit & resubmit shift' : 'End shift'} onClose={() => setSheet(null)}><EndShiftForm shift={active} name={user.name} role={user.role} onSubmit={submitShift} /></Sheet>}

        {confirmEditId && (
          <Sheet title="Edit this shift?" onClose={() => setConfirmEditId(null)}>
            <p className="text-sm leading-6 text-muted-foreground">This pulls the shift back from your supervisor&apos;s review queue. You can add entries and update your notes, but you&apos;ll need to sign and submit it again.</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Button variant="outline" className="h-12 rounded-xl text-[13px] font-bold" onClick={() => setConfirmEditId(null)}>Cancel</Button>
              <Button className="h-12 rounded-xl text-[13px] font-bold" onClick={() => { const id = confirmEditId; setConfirmEditId(null); reopenShift(id) }}>Edit shift</Button>
            </div>
          </Sheet>
        )}

        <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} onConfirm={onSignOut} />
      </div>
    </main>
  )
}

/* ---------------------------------- home ---------------------------------- */
function HomeView({ active, role, hasPatients, namesFor, onOpen }: { active?: Shift; role: StaffRoleLabel; hasPatients: boolean; namesFor: (s: Shift) => string; onOpen: (k: SheetKind) => void }) {
  const count = active?.entries.length ?? 0
  return (
    <div className="flex flex-col gap-3.5">
      {active?.reviewComment && (
        <div className="flex gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-[13px]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div><p className="font-bold">Your supervisor requested changes to this shift.</p><p className="mt-0.5 text-muted-foreground">{active.reviewComment}</p></div>
        </div>
      )}

      {active ? (
        <button onClick={() => onOpen('note')} className="flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-primary bg-secondary/60 p-3.5 text-left">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Stethoscope className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className={`${eyebrow} text-secondary-foreground`}>Active shift</span>
            <span className="block truncate font-heading text-base font-bold">{namesFor(active)}</span>
            <span className="block text-xs text-muted-foreground">Started {new Date(active.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      ) : (
        <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
          <Clock3 className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold">No active shift</h2>
            <p className="text-xs leading-5 text-muted-foreground">{hasPatients ? 'Select a patient before starting a shift.' : 'Ask your supervisor to assign you a patient to get started.'}</p>
          </div>
          <Button disabled={!hasPatients} onClick={() => onOpen('start')} className="h-10 rounded-xl px-3.5 text-[13px] font-bold">Choose patient</Button>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-full bg-secondary text-secondary-foreground"><span className="text-base font-bold leading-none">{count}</span><span className="text-[9px] font-semibold">entries</span></span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold">Shift documentation</p>
            <p className="text-xs text-muted-foreground">{active ? `${count} entr${count === 1 ? 'y' : 'ies'} recorded this shift` : 'Start a shift to begin recording care'}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: active ? `${Math.min(count * 12, 100)}%` : '0%' }} /></div>
          </div>
        </div>
      </section>


      <section>
        <div className="mb-2.5 flex items-baseline justify-between"><h2 className="font-heading text-base font-bold">Quick actions</h2><span className="text-xs text-muted-foreground">Add to today&apos;s record</span></div>
        <div className="grid grid-cols-2 gap-2.5">
          {ACTIONS.map((a) => (
            <button key={a.kind} disabled={!active} onClick={() => onOpen(a.kind)} className="flex min-h-0 flex-col items-start gap-2 rounded-2xl border border-border bg-card p-3 text-left transition hover:border-secondary-foreground disabled:cursor-not-allowed disabled:opacity-45">
              <span className={`flex size-9 items-center justify-center rounded-xl ${a.tone}`}><a.icon className="size-[18px]" /></span>
              <span><span className="block text-[13px] font-bold">{a.label}</span><span className="block text-[11px] text-muted-foreground">{a.helper}</span></span>
            </button>
          ))}
        </div>
      </section>

      
      {active && (
        <>
          <section>
            <h2 className="mb-2.5 font-heading text-base font-bold">Care timeline</h2>
            {active.entries.length ? (
              <div className="flex flex-col gap-2.5">{active.entries.map((e) => <TimelineItem key={e.id} entry={e} />)}</div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-5 text-center"><FileText className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-[13px] font-bold">Nothing logged yet</p><p className="text-xs text-muted-foreground">Your notes, medications, and incidents will appear here.</p></div>
            )}
          </section>
          <Button variant="outline" className={`${primaryCls} border-[1.5px]`} onClick={() => onOpen('end')}>End shift &amp; review</Button>
        </>
      )}
    </div>
  )
}

function TimelineItem({ entry }: { entry: Entry }) {
  const Icon = entry.kind === 'incident' ? AlertTriangle : entry.kind === 'medication' ? Pill : entry.kind === 'task' ? ClipboardList : entry.kind === 'vitals' ? Activity : entry.kind === 'temperature' ? Thermometer : FileText
  const title =
    entry.kind === 'medication' ? `${entry.drug} · ${entry.medStatus}` :
    entry.kind === 'incident' ? 'Seizure incident' :
    entry.kind === 'task' ? 'Tasks completed' :
    entry.kind === 'vitals' ? 'Vitals recorded' :
    entry.kind === 'temperature' ? 'Temperature recorded' : 'Hourly note'
  const critical = entry.kind === 'incident'
  return (
    <div className={`rounded-2xl border p-3 ${critical ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'}`}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span>{entryStamp(entry)}</span>
        {critical && <span className="critical-flash rounded-full px-2 py-0.5 text-[10px] font-bold">⚠ SEIZURE</span>}
        {entry.status === 'Needs attention' && <span className="rounded-full bg-[color:var(--gold)]/25 px-2 py-0.5 text-[10px] font-bold text-foreground">Needs attention</span>}
      </div>
      <h3 className={`mt-1 flex items-center gap-1.5 text-sm font-bold ${critical ? 'text-destructive' : ''}`}><Icon className="size-4" /> {title}</h3>
      {entry.kind === 'medication' && (entry.route || entry.administeredAt) && (
        <p className="text-xs text-muted-foreground">{entry.route ? `Route: ${entry.route}` : ''}{entry.route && entry.administeredAt ? ' · ' : ''}{entry.administeredAt ? `Given at ${entry.administeredAt}` : ''}</p>
      )}
      <p className="mt-1 text-[13px] leading-5">{entry.detail}</p>
      {[...(entry.tags ?? []), ...(entry.tasks ?? []), ...(entry.observations ?? [])].length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[...(entry.tags ?? []), ...(entry.tasks ?? []), ...(entry.observations ?? [])].map((t) => <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">{t}</span>)}
        </div>
      )}
    </div>
  )
}

/* -------------------------------- patients -------------------------------- */
function PatientsView({ patients }: { patients: Patient[] }) {
  const [q, setQ] = useState('')
  const list = patients.filter((p) => `${p.name} ${p.room}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="flex flex-col gap-3">
      <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><Input aria-label="Search patients" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or room" className={`${inputCls} pl-10`} /></div>
      {list.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{initials(p.name)}</span>
          <div className="min-w-0"><p className="truncate text-sm font-bold">{p.name}</p><p className="text-xs text-muted-foreground">{p.room}</p>{!!p.diagnoses.length && <p className="truncate text-[11px] text-muted-foreground">{p.diagnoses.map((d) => d.name).join(', ')}</p>}</div>
        </div>
      ))}
      {!list.length && <Empty icon={UsersRound} title="No patients assigned yet" body="Your supervisor assigns patients to your account. Reach out to them if you're expecting one." />}
      <div className="flex gap-2.5 rounded-2xl bg-secondary/60 p-3 text-xs leading-5"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-secondary-foreground" /><span><strong>Patient records are protected.</strong> Only you and your supervisor can see this information.</span></div>
    </div>
  )
}

/* --------------------------------- history -------------------------------- */
function HistoryView({ shifts, namesFor, hasActive, onReopen, onEdit }: { shifts: Shift[]; namesFor: (s: Shift) => string; hasActive: boolean; onReopen: (id: string) => void; onEdit: (id: string) => void }) {
  const sorted = [...shifts].sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt))
  if (!sorted.length) return <Empty icon={HistoryIcon} title="No shifts yet" body="Your signed shift notes will appear here." />
  return (
    <div className="flex flex-col gap-2.5">
      {sorted.map((s) => (
        <div key={s.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground">{new Date(s.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
              <p className="truncate text-sm font-bold">{namesFor(s)}</p>
              <p className="text-xs text-muted-foreground">{s.entries.length} entr{s.entries.length === 1 ? 'y' : 'ies'} · {s.submittedAt ? `Submitted ${new Date(s.submittedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'In progress'}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_TONE[s.status]}`}>{STATUS_LABEL[s.status]}</span>
              {s.incident && <span className="critical-flash rounded-full px-2 py-0.5 text-[10px] font-bold">⚠ SEIZURE</span>}
            </div>
          </div>
          {s.reviewComment && s.status === 'rejected' && <p className="mt-2 text-xs text-destructive">{s.reviewComment}</p>}
          {(s.status === 'rejected' || s.status === 'submitted') && (
            <Button variant="outline" disabled={hasActive} onClick={() => (s.status === 'rejected' ? onReopen(s.id) : onEdit(s.id))} className="mt-2.5 h-10 w-full rounded-xl border-[1.5px] text-[13px] font-bold">
              {hasActive ? 'Finish your current shift first' : s.status === 'rejected' ? 'Fix & resubmit' : 'Edit shift'}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

/* --------------------------------- sheets --------------------------------- */
function StartShift({ patients, onStart }: { patients: Patient[]; onStart: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const list = patients.filter((p) => `${p.name} ${p.room}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Select the assigned patient you&apos;re caring for. Finish and submit one shift before starting the next.</p>
      <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients" className={`${inputCls} pl-10`} /></div>
      {list.map((p) => (
        <button key={p.id} onClick={() => setPicked(p.id)} className={`flex items-center gap-3 rounded-2xl border-[1.5px] p-3 text-left ${picked === p.id ? 'border-primary bg-secondary/60' : 'border-border'}`}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{initials(p.name)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{p.name}</span><span className="block text-xs text-muted-foreground">{p.room}</span></span>
          {picked === p.id && <Check className="size-4 text-secondary-foreground" />}
        </button>
      ))}
      {!list.length && <Empty icon={UsersRound} title="No assigned patients found" body="Ask your supervisor to assign you a patient." />}
      <Button disabled={!picked} onClick={() => picked && onStart(picked)} className={primaryCls}>Start shift</Button>
    </div>
  )
}

type SaveProps = { onSave: (e: Entry) => void }
const base = () => ({ id: newId(), time: nowTime(), timestamp: new Date().toISOString() })

function Segmented<T extends string>({ value, options, onChange, danger }: { value: T; options: T[]; onChange: (v: T) => void; danger?: T }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-[11px] bg-muted p-1">
      {options.map((o) => <button type="button" key={o} onClick={() => onChange(o)} className={`min-h-0 rounded-lg px-3 py-2 text-[13px] font-bold ${value === o ? (o === danger ? 'bg-[color:var(--gold)]/30 shadow-sm' : 'bg-background shadow-sm') : 'text-muted-foreground'}`}>{o}</button>)}
    </div>
  )
}
function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`min-h-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border text-muted-foreground'}`}>{children}</button>
}
const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

function WhenField({ mode, setMode, from, setFrom, to, setTo }: { mode: 'now' | 'timeframe'; setMode: (m: 'now' | 'timeframe') => void; from: string; setFrom: (v: string) => void; to: string; setTo: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-bold">When did this happen?</p>
      <Segmented value={mode === 'now' ? 'Logging now' : 'Add a timeframe'} options={['Logging now', 'Add a timeframe']} onChange={(v) => setMode(v === 'Logging now' ? 'now' : 'timeframe')} />
      {mode === 'timeframe' && (
        <div className="grid grid-cols-2 gap-2.5">
          <label className={labelCls}>From<Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></label>
          <label className={labelCls}>To<Input type="time" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></label>
        </div>
      )}
    </div>
  )
}

function NoteForm({ subtitle, onSave }: SaveProps & { subtitle: string }) {
  const [status, setStatus] = useState<CareStatus>('Stable')
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [mode, setMode] = useState<'now' | 'timeframe'>('now')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const frame = from && to ? `${formatClock(from)} – ${formatClock(to)}` : ''
  const valid = (note.trim() || tags.length) && (mode === 'now' || frame)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <div className="flex flex-col gap-2"><p className="text-[13px] font-bold">How is the patient doing?</p><Segmented value={status} options={['Stable', 'Needs attention'] as CareStatus[]} danger="Needs attention" onChange={setStatus} /></div>
      <div className="flex flex-col gap-2"><p className="text-[13px] font-bold">What happened this hour?</p><div className="flex flex-wrap gap-1.5">{CARE_TAGS.map((t) => <Chip key={t} on={tags.includes(t)} onClick={() => setTags(toggleIn(tags, t))}>{t}</Chip>)}</div></div>
      <label className={labelCls}>Notes<textarea className={areaCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add any details for this hour" /></label>
      <WhenField mode={mode} setMode={setMode} from={from} setFrom={setFrom} to={to} setTo={setTo} />
      <Button disabled={!valid} className={primaryCls} onClick={() => onSave({ ...base(), kind: 'note', status, tags, detail: note.trim() || 'Routine care observed.', timeframe: mode === 'timeframe' ? frame : undefined })}><Check className="size-4" /> Save note</Button>
      <p className="text-center text-[11px] text-muted-foreground">This entry stays editable until you sign and submit the shift.</p>
    </div>
  )
}

function MedicationForm({ onSave }: SaveProps) {
  const [drug, setDrug] = useState('')
  const [dose, setDose] = useState('')
  const [route, setRoute] = useState('')
  const [at, setAt] = useState(() => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` })
  const [result, setResult] = useState<'Given' | 'Refused'>('Given')
  const [reason, setReason] = useState('')
  const valid = drug.trim() && dose.trim() && route && (result === 'Given' || reason.trim())
  return (
    <div className="flex flex-col gap-3.5">
      <label className={labelCls}>Medication name<Input value={drug} onChange={(e) => setDrug(e.target.value)} placeholder="e.g. Acetaminophen" className={inputCls} /></label>
      <div className="grid grid-cols-2 gap-2.5">
        <label className={labelCls}>Dose<Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 500 mg" className={inputCls} /></label>
        <label className={labelCls}>Route<select value={route} onChange={(e) => setRoute(e.target.value)} className={selectCls}><option value="">Select</option>{ROUTES_OF_ADMINISTRATION.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
      </div>
      <label className={labelCls}>Time of administration<Input type="time" value={at} onChange={(e) => setAt(e.target.value)} className={inputCls} /></label>
      <div className="flex flex-col gap-2"><p className="text-[13px] font-bold">Result</p><Segmented value={result} options={['Given', 'Refused'] as const} danger="Refused" onChange={setResult} /></div>
      {result === 'Refused' && <label className={labelCls}>Reason<textarea className={areaCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why was it refused?" /></label>}
      <Button disabled={!valid} className={primaryCls} onClick={() => onSave({ ...base(), kind: 'medication', drug: drug.trim(), dose: dose.trim(), route, administeredAt: formatClock(at), medStatus: result, reason: reason.trim(), detail: result === 'Given' ? `${dose.trim()} administered.` : `Refused — ${reason.trim()}` })}><Check className="size-4" /> Save medication</Button>
    </div>
  )
}

function IncidentForm({ onSave }: SaveProps) {
  const [length, setLength] = useState('')
  const [obs, setObs] = useState<string[]>([])
  const [comment, setComment] = useState('')
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-[13px]"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" /><p className="font-bold">This will flag the shift for priority supervisor attention.</p></div>
      <label className={labelCls}>Length of seizure<Input value={length} onChange={(e) => setLength(e.target.value)} placeholder="e.g. 30 seconds" className={inputCls} /></label>
      <div className="flex flex-col gap-2"><p className="text-[13px] font-bold">Observations</p><div className="flex flex-wrap gap-1.5">{SEIZURE_OBSERVATIONS.map((o) => <Chip key={o} on={obs.includes(o)} onClick={() => setObs(toggleIn(obs, o))}>{o}</Chip>)}</div></div>
      <label className={labelCls}>Recovery observations &amp; comments<textarea className={areaCls} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What happened during recovery?" /></label>
      <Button disabled={!length.trim() && !obs.length && !comment.trim()} className={primaryCls} onClick={() => onSave({ ...base(), kind: 'incident', lengthOfEvent: length.trim(), observations: obs, detail: comment.trim() || 'Seizure observed — see recorded observations.' })}><Check className="size-4" /> Save incident report</Button>
    </div>
  )
}

function TaskForm({ onSave }: SaveProps) {
  const [checked, setChecked] = useState<string[]>([])
  const [other, setOther] = useState('')
  const [note, setNote] = useState('')
  const all = [...checked, ...(other.trim() ? [other.trim()] : [])]
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Check off everything you completed this shift.</p>
      {TASK_GROUPS.map((g) => (
        <fieldset key={g.label} className="flex flex-col gap-2">
          <legend className="mb-1 text-[13px] font-bold">{g.label}</legend>
          {g.tasks.map((t) => (
            <label key={t} className="flex min-h-0 items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-[13px]">
              <input type="checkbox" checked={checked.includes(t)} onChange={() => setChecked(toggleIn(checked, t))} className="size-4 accent-[var(--brand-strong)]" />{t}
            </label>
          ))}
        </fieldset>
      ))}
      <label className={labelCls}>Other (optional)<Input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Anything not listed above" className={inputCls} /></label>
      <label className={labelCls}>Notes<textarea className={areaCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add any details" /></label>
      <Button disabled={!all.length} className={primaryCls} onClick={() => onSave({ ...base(), kind: 'task', tasks: all, detail: note.trim() || `${all.length} task${all.length === 1 ? '' : 's'} completed.` })}><Check className="size-4" /> Save tasks</Button>
    </div>
  )
}

function VitalsForm({ onSave }: SaveProps) {
  const [bp, setBp] = useState('')
  const [pulse, setPulse] = useState('')
  const [resp, setResp] = useState('')
  const [o2, setO2] = useState('')
  const [note, setNote] = useState('')
  const num = (v: string) => v.replace(/[^\d./]/g, '')
  return (
    <div className="flex flex-col gap-3.5">
      <label className={labelCls}>Blood pressure<Input inputMode="numeric" value={bp} onChange={(e) => setBp(num(e.target.value))} placeholder="e.g. 120/80" className={inputCls} /></label>
      <div className="grid grid-cols-2 gap-2.5">
        <label className={labelCls}>Pulse (bpm)<Input inputMode="numeric" value={pulse} onChange={(e) => setPulse(num(e.target.value))} className={inputCls} /></label>
        <label className={labelCls}>Resp. rate<Input inputMode="numeric" value={resp} onChange={(e) => setResp(num(e.target.value))} className={inputCls} /></label>
      </div>
      <label className={labelCls}>O2 saturation (%)<Input inputMode="numeric" value={o2} onChange={(e) => setO2(num(e.target.value))} className={inputCls} /></label>
      <label className={labelCls}>Notes<textarea className={areaCls} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <Button disabled={!(bp || pulse || resp || o2)} className={primaryCls} onClick={() => onSave({ ...base(), kind: 'vitals', bloodPressure: bp, pulse, respiratoryRate: resp, oxygenSaturation: o2, detail: note.trim() || [bp && `BP ${bp}`, pulse && `Pulse ${pulse}`, resp && `Resp ${resp}`, o2 && `O2 ${o2}%`].filter(Boolean).join(' · ') })}><Check className="size-4" /> Save vitals</Button>
    </div>
  )
}

function TemperatureForm({ onSave }: SaveProps) {
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<'F' | 'C'>('F')
  const [method, setMethod] = useState('')
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-[1fr_96px] gap-2.5">
        <label className={labelCls}>Temperature<Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))} placeholder="e.g. 98.6" className={inputCls} /></label>
        <label className={labelCls}>Unit<select value={unit} onChange={(e) => setUnit(e.target.value as 'F' | 'C')} className={selectCls}><option value="F">°F</option><option value="C">°C</option></select></label>
      </div>
      <label className={labelCls}>Method<select value={method} onChange={(e) => setMethod(e.target.value)} className={selectCls}><option value="">Select method</option>{TEMPERATURE_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <Button disabled={!value.trim() || !method} className={primaryCls} onClick={() => onSave({ ...base(), kind: 'temperature', temperatureValue: value.trim(), temperatureUnit: unit, temperatureMethod: method, detail: `${value.trim()}°${unit} (${method})` })}><Check className="size-4" /> Save temperature</Button>
    </div>
  )
}

function EndShiftForm({ shift, name, role, onSubmit }: { shift: Shift; name: string; role: StaffRoleLabel; onSubmit: (p: SubmitPayload) => void }) {
  const [summary, setSummary] = useState(shift.summary ?? '')
  const [observations, setObservations] = useState(shift.observations ?? '')
  const [recommendations, setRecommendations] = useState(shift.recommendations ?? '')
  const [followUp, setFollowUp] = useState(shift.followUp)
  const [confirmed, setConfirmed] = useState(false)
  const [signature, setSignature] = useState('')
  const resubmit = !!shift.reviewComment || !!shift.summary
  const checklist = [
    { label: 'At least one entry recorded', met: shift.entries.length > 0 },
    { label: 'Summary of care completed', met: summary.trim().length > 0 },
    { label: 'Follow-up status identified', met: true },
  ]
  const ok = checklist.every((c) => c.met) && confirmed && signature.trim().toLowerCase() === name.trim().toLowerCase()
  return (
    <div className="flex flex-col gap-3.5">
      {shift.reviewComment && <div className="flex gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-[13px]"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" /><div><p className="font-bold">Your supervisor requested changes:</p><p className="mt-0.5 text-muted-foreground">{shift.reviewComment}</p></div></div>}
      <label className={labelCls}>Summary of care<textarea className={`${areaCls} min-h-28`} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Share the most important handoff details." /></label>
      <label className={labelCls}>Clinical observations<textarea className={areaCls} value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Anything clinically relevant this shift" /></label>
      {role === 'Nurse' && <label className={labelCls}>Recommendations<textarea className={areaCls} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="Any recommendations worth flagging" /></label>}
      <div className="flex flex-col gap-2"><p className="text-[13px] font-bold">Anything unusual or needing follow-up?</p><Segmented value={followUp ? 'Yes' : 'No'} options={['No', 'Yes']} danger="Yes" onChange={(v) => setFollowUp(v === 'Yes')} /></div>
      <div className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-3">
        {checklist.map((c) => (
          <div key={c.label} className="flex items-center gap-2.5 text-[13px] font-semibold">
            <span className={`flex size-5 items-center justify-center rounded-full ${c.met ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><Check className="size-3" /></span>{c.label}
          </div>
        ))}
      </div>
      <label className="flex min-h-0 items-start gap-2.5 text-[13px]"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand-strong)]" />I confirm this note is accurate.</label>
      <label className={labelCls}>Type your name to sign<Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={name} className={inputCls} /></label>
      <Button disabled={!ok} className={primaryCls} onClick={() => onSubmit({ summary: summary.trim(), observations: observations.trim(), recommendations: role === 'Nurse' ? recommendations.trim() : '', followUp, signature: signature.trim() })}>{resubmit ? 'Resubmit shift' : 'Sign & submit shift'}</Button>
    </div>
  )
}

/* --------------------------------- chrome --------------------------------- */
function NavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Home; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative flex min-h-0 flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-semibold ${active ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>
      <Icon className="size-5" /><span>{label}</span>
      {active && <span className="absolute -bottom-1.5 h-0.5 w-8 rounded-full bg-accent" />}
    </button>
  )
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

function Empty({ icon: Icon, title, body }: { icon: typeof Home; title: string; body: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-6 text-center"><Icon className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-[13px] font-bold">{title}</p><p className="mt-0.5 text-xs text-muted-foreground">{body}</p></div>
}

export default StaffWorkspace