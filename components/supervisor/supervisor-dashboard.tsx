'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, Check, ChevronRight, ClipboardList, FileText, Inbox, LogOut, Plus, RotateCcw, ShieldCheck, Trash2, UserRound, Users, X } from 'lucide-react'
import { SupervisorInbox, type Application, type Inquiry } from '@/components/supervisor/supervisor-inbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  addPatient, approveShift, approveStaff, declineStaff, deleteApplication, deleteInquiry, currentSupervisor, loadSupervisorData,
  openResume, removePatient, requestCorrection, resetStaffPin, setAssignments, setStaffActive, updateApplication, updateInquiry,
  type Activity as ActivityItem, type Patient, type Shift, type StaffMember,
} from '@/lib/supervisor/api'

type View = 'Queue' | 'Staff' | 'Patients' | 'Activity' | 'Inbox'
const nav = [{ name: 'Queue', icon: ClipboardList }, { name: 'Inbox', icon: Inbox }, { name: 'Staff', icon: Users }, { name: 'Patients', icon: UserRound }, { name: 'Activity', icon: Activity }]

export function SupervisorDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [view, setView] = useState<View>('Queue')
  const [me, setMe] = useState('Supervisor')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [selected, setSelected] = useState<Shift | null>(null)
  const [correction, setCorrection] = useState(false)
  const [comment, setComment] = useState('')
  const [showPatient, setShowPatient] = useState(false)
  const [assigning, setAssigning] = useState<StaffMember | null>(null)
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

  const inboxNew = applications.filter((a) => a.status === 'new').length + inquiries.filter((i) => i.status === 'new').length
  const queueOpen = shifts.filter((s) => s.status === 'pending' || s.status === 'incident').length
  const awaiting = staff.filter((s) => s.status === 'awaiting').length
  const badge = (name: string) => name === 'Queue' ? queueOpen : name === 'Inbox' ? inboxNew : name === 'Staff' ? awaiting : 0

  return (
    <div className="min-h-dvh bg-[#F3F6F4] text-foreground">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-5 backdrop-blur lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck /></div>
          <div><p className="font-heading font-bold leading-none">Freedom Elite</p><p className="mt-1 text-xs text-muted-foreground">Supervisor portal</p></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">{me}</span>
          <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Sign out"><LogOut /></Button>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1100px]">
        <aside className="hidden min-h-[calc(100vh-4rem)] w-64 shrink-0 border-r bg-background p-5 lg:block">
          <p className="mb-4 px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Workspace</p>
          <nav className="flex flex-col gap-1">
            {nav.map(({ name, icon: Icon }) => (
              <button key={name} onClick={() => setView(name as View)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${view === name ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Icon data-icon="inline-start" />{name}{badge(name) > 0 && <Badge className="ml-auto" variant={name === 'Queue' ? 'secondary' : 'default'}>{badge(name)}</Badge>}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-12"><div className="rounded-2xl bg-secondary/60 p-4"><p className="text-sm font-bold">Care records, handled well.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Review every detail before it becomes part of the record.</p></div></div>
        </aside>

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-7 sm:px-6 lg:px-10 lg:pb-10">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-secondary-foreground">Supervisor workspace</p>
              <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">{view}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{view === 'Queue' ? 'Review submitted shift records and incidents.' : view === 'Staff' ? 'Manage access and patient assignments.' : view === 'Patients' ? 'Keep patient details current and complete.' : view === 'Inbox' ? 'Job applications and care requests from the website.' : 'A read-only record of workspace activity.'}</p>
            </div>
            {view === 'Patients' && <Button onClick={() => setShowPatient(true)}><Plus data-icon="inline-start" />Add patient</Button>}
          </div>

          {error && (
            <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-[13px]">
              <p>{error}</p><button onClick={() => setError(null)} aria-label="Dismiss" className="shrink-0"><X className="size-4" /></button>
            </div>
          )}
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {!loading && view === 'Queue' && <Queue shifts={shifts} onSelect={setSelected} />}
          {!loading && view === 'Staff' && (
            <StaffList staff={staff}
              onApprove={(s) => act(() => approveStaff(s.id))}
              onDecline={(s) => { if (confirm(`Decline ${s.name}? Their request will be deleted.`)) act(() => declineStaff(s.id)) }}
              onAssign={setAssigning}
              onResetPin={(s) => { const pin = prompt(`New temporary PIN for ${s.name} (4–6 digits). They must change it at next sign-in.`); if (pin) act(() => resetStaffPin(s.id, pin)) }}
              onRemove={(s) => { if (confirm(`Deactivate ${s.name}? They will no longer be able to sign in.`)) act(() => setStaffActive(s.id, false)) }} />
          )}
          {!loading && view === 'Patients' && <PatientList patients={patients} onRemove={(p) => { if (confirm(`Remove ${p.name}?`)) act(() => removePatient(p.id)) }} />}
          {!loading && view === 'Activity' && <ActivityList items={activity} />}
          {!loading && view === 'Inbox' && (
            <SupervisorInbox applications={applications} inquiries={inquiries}
              onUpdateApplication={(id, patch) => act(() => updateApplication(id, patch))}
              onUpdateInquiry={(id, patch) => act(() => updateInquiry(id, patch))}
              onDeleteApplication={(id) => act(() => deleteApplication(id))}
              onDeleteInquiry={(id) => act(() => deleteInquiry(id))}
              onOpenResume={openResume} />
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-background/95 p-2 backdrop-blur lg:hidden">
        {nav.map(({ name, icon: Icon }) => (
          <button key={name} onClick={() => setView(name as View)} className={`relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${view === name ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>
            <Icon /><span>{name}</span>
            {badge(name) > 0 && <span className="absolute right-[22%] top-1 rounded-full bg-primary px-1.5 text-[10px] leading-4 text-primary-foreground">{badge(name)}</span>}
          </button>
        ))}
      </nav>

      {selected && (
        <ShiftDetail shift={selected} onClose={() => { setSelected(null); setCorrection(false); setComment('') }}
          onApprove={async () => { await act(() => approveShift(selected.id)); setSelected(null) }}
          onCorrection={async () => { if (!comment.trim()) return; await act(() => requestCorrection(selected.id, comment)); setSelected(null); setCorrection(false); setComment('') }}
          correction={correction} setCorrection={setCorrection} comment={comment} setComment={setComment} />
      )}
      {showPatient && <PatientModal onClose={() => setShowPatient(false)} onSave={async (p) => { await act(() => addPatient(p)); setShowPatient(false) }} />}
      {assigning && <AssignModal member={assigning} patients={patients} onClose={() => setAssigning(null)} onSave={async (ids) => { await act(() => setAssignments(assigning.id, ids)); setAssigning(null) }} />}
    </div>
  )
}

function Queue({ shifts, onSelect }: { shifts: Shift[]; onSelect: (s: Shift) => void }) {
  const [filter, setFilter] = useState<'all' | 'incident' | 'pending'>('all')
  const shown = shifts.filter((s) => filter === 'all' || (filter === 'incident' ? s.status === 'incident' : s.status === 'pending'))
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Pending" value={shifts.filter((s) => s.status === 'pending').length} />
        <Metric label="Incidents" value={shifts.filter((s) => s.status === 'incident').length} />
        <Metric label="Approved" value={shifts.filter((s) => s.status === 'approved').length} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'incident', 'pending'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}><Badge variant={filter === f ? 'secondary' : 'outline'}>{f === 'all' ? 'All' : f === 'incident' ? 'Incidents' : 'Pending'}</Badge></button>
        ))}
      </div>
      {!shown.length && <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No shifts to show yet. Submitted shifts will appear here.</p>}
      <div className="grid gap-3">
        {shown.map((s) => (
          <button key={s.id} onClick={() => onSelect(s)} className="group flex w-full items-center justify-between rounded-2xl border bg-background p-4 text-left shadow-sm transition hover:border-primary sm:p-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${s.status === 'incident' ? 'bg-[color:var(--warning)]/15 text-[color:var(--warning)]' : 'bg-secondary text-secondary-foreground'}`}>{s.status === 'incident' ? <AlertTriangle /> : <FileText />}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-bold">{s.staff.name}</p><Badge variant={s.status === 'incident' ? 'destructive' : 'secondary'}>{s.status}</Badge></div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{s.patient.name} · {s.date}</p>
              </div>
            </div>
            <ChevronRight className="shrink-0 text-muted-foreground transition group-hover:translate-x-1" />
          </button>
        ))}
      </div>
    </div>
  )
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border bg-background p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 font-heading text-3xl font-bold">{value}</p></div> }

function ShiftDetail({ shift, onClose, onApprove, onCorrection, correction, setCorrection, comment, setComment }: any) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-background"><div className="mx-auto min-h-dvh w-full max-w-[1100px] px-5 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-8 lg:pb-6">
      <div className="mb-8 flex items-center justify-between"><Button variant="ghost" onClick={onClose}><X data-icon="inline-start" />Close</Button><Badge variant={shift.status === 'incident' ? 'destructive' : 'secondary'}>{shift.status}</Badge></div>
      <div className="border-b pb-7">
        <p className="text-sm font-semibold text-secondary-foreground">Shift detail · {shift.date}</p>
        <h2 className="mt-2 font-heading text-3xl font-bold">{shift.patient.name}</h2>
        <div className="mt-5 grid min-w-0 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Staff" value={`${shift.staff.name} · ${shift.staff.role}`} />
          <Info label="Date of birth" value={shift.patient.dob} />
          <Info label="Medicaid number" value={shift.patient.medicaid} />
          <Info label="Diagnoses" value={shift.patient.diagnoses.map((d: any) => d.name).join(', ') || '—'} />
        </div>
      </div>
      {shift.incident && <div className="my-7 flex gap-3 rounded-2xl border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 p-4 text-sm"><AlertTriangle className="shrink-0 text-[color:var(--warning)]" /><p><strong>Incident reported.</strong> {shift.incident}</p></div>}
      <section className="py-7"><h3 className="font-heading text-xl font-bold">Care timeline</h3>
        <div className="mt-5 flex flex-col gap-4">
          {!shift.timeline.length && <p className="text-sm text-muted-foreground">No entries were recorded.</p>}
          {shift.timeline.map((item: any) => <div key={item.id} className="flex gap-4"><span className="w-16 shrink-0 pt-0.5 text-sm font-bold text-muted-foreground">{item.time}</span><div className="border-l-2 border-secondary pl-4"><p className="text-xs font-bold uppercase tracking-wide text-secondary-foreground">{item.type}</p><p className="mt-1 text-sm">{item.text}</p></div></div>)}
        </div>
      </section>
      <section className="grid gap-5 border-t py-7 sm:grid-cols-3"><Info label="Summary" value={shift.summary} /><Info label="Observations" value={shift.observations} /><Info label="Recommendations" value={shift.recommendations} /></section>
      {shift.status === 'approved' ? (
        <div className="flex items-center justify-between rounded-2xl bg-secondary p-5"><p className="font-bold"><Check className="mr-2 inline" />Approved by {shift.reviewer || 'a supervisor'}</p><Button onClick={() => window.print()}>Export PDF</Button></div>
      ) : shift.status === 'rejected' ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5"><p className="font-bold">Correction requested by {shift.reviewer || 'a supervisor'}</p><p className="mt-1 text-sm">{shift.reviewComment}</p></div>
      ) : (
        <div className="flex flex-wrap justify-end gap-3 border-t pt-6">
          {correction ? <><Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Required correction comment" className="max-w-sm" /><Button onClick={onCorrection}>Send correction</Button></> : <Button variant="outline" onClick={() => setCorrection(true)}>Request correction</Button>}
          <Button onClick={onApprove}><Check data-icon="inline-start" />Approve</Button>
        </div>
      )}
    </div></div>
  )
}
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm leading-6">{value}</p></div> }

function StaffList({ staff, onApprove, onDecline, onAssign, onResetPin, onRemove }: {
  staff: StaffMember[]; onApprove: (s: StaffMember) => void; onDecline: (s: StaffMember) => void
  onAssign: (s: StaffMember) => void; onResetPin: (s: StaffMember) => void; onRemove: (s: StaffMember) => void
}) {
  const waiting = staff.filter((s) => s.status === 'awaiting')
  const active = staff.filter((s) => s.status === 'active')
  return (
    <div className="flex flex-col gap-7">
      <section><h2 className="font-heading text-xl font-bold">Awaiting approval</h2>
        <div className="mt-3 grid gap-3">
          {!waiting.length && <p className="text-sm text-muted-foreground">No pending requests.</p>}
          {waiting.map((s) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background p-4" key={s.id}>
              <div><p className="font-bold">{s.name}</p><p className="text-sm text-muted-foreground">{s.role} · {s.phone}</p></div>
              <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => onDecline(s)}>Decline</Button><Button size="sm" onClick={() => onApprove(s)}>Approve</Button></div>
            </div>
          ))}
        </div>
      </section>
      <section><h2 className="font-heading text-xl font-bold">Active staff</h2>
        <div className="mt-3 grid gap-3">
          {!active.length && <p className="text-sm text-muted-foreground">No approved staff yet.</p>}
          {active.map((s) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background p-4" key={s.id}>
              <div><p className="font-bold">{s.name}</p><p className="text-sm text-muted-foreground">{s.phone} · {s.patientIds.length} patient{s.patientIds.length === 1 ? '' : 's'}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{s.role}</Badge>
                <Button variant="outline" size="sm" onClick={() => onAssign(s)}>Assign patients</Button>
                <Button variant="ghost" size="icon" aria-label={`Reset PIN for ${s.name}`} onClick={() => onResetPin(s)}><RotateCcw /></Button>
                <Button variant="ghost" size="icon" aria-label={`Deactivate ${s.name}`} onClick={() => onRemove(s)}><Trash2 /></Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function PatientList({ patients, onRemove }: { patients: Patient[]; onRemove: (p: Patient) => void }) {
  return (
    <div className="grid gap-3">
      {!patients.length && <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No patients yet. Use “Add patient” to create the first one.</p>}
      {patients.map((p) => (
        <div key={p.id} className="rounded-2xl border bg-background p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-heading text-lg font-bold">{p.name}</h2><p className="mt-1 text-sm text-muted-foreground">{p.location} · DOB {p.dob} · {p.medicaid}</p></div>
            <Button variant="ghost" size="icon" aria-label={`Remove ${p.name}`} onClick={() => onRemove(p)}><Trash2 /></Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{p.diagnoses.map((d) => <Badge key={d.name} variant="secondary">{d.name}</Badge>)}</div>
        </div>
      ))}
    </div>
  )
}

function ActivityList({ items }: { items: ActivityItem[] }) {
  if (!items.length) return <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
  return (
    <div className="rounded-2xl border bg-background"><div className="divide-y">
      {items.map((item) => <div key={item.id} className="flex gap-4 p-5"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><Activity /></div><div><p className="text-sm"><strong>{item.actor}</strong> {item.action}</p><p className="mt-1 text-xs text-muted-foreground">{item.at}</p></div></div>)}
    </div></div>
  )
}

function PatientModal({ onClose, onSave }: { onClose: () => void; onSave: (p: { name: string; location: string; dob: string; medicaid: string; diagnoses: { name: string; description?: string }[] }) => Promise<void> }) {
  const [name, setName] = useState(''); const [location, setLocation] = useState(''); const [dob, setDob] = useState(''); const [medicaid, setMedicaid] = useState('')
  const [dx, setDx] = useState([{ name: '', description: '' }]); const [busy, setBusy] = useState(false)
  const ok = name.trim() && location.trim() && dob && medicaid.trim() && dx[0].name.trim()
  const setDxAt = (i: number, patch: Partial<{ name: string; description: string }>) => setDx((all) => all.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/40 p-4">
      <div role="dialog" aria-modal="true" className="mx-auto w-full max-w-[430px] rounded-3xl bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><h2 className="font-heading text-2xl font-bold">Add patient</h2><p className="mt-1 text-sm text-muted-foreground">Add the details needed for care records.</p></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X /></Button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input placeholder="Patient name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Location / room" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input type="date" aria-label="Date of birth" value={dob} onChange={(e) => setDob(e.target.value)} />
          <Input placeholder="Medicaid number" value={medicaid} onChange={(e) => setMedicaid(e.target.value)} />
          {dx.map((d, i) => (
            <div key={i} className="grid gap-2 sm:col-span-2">
              <Input placeholder={i === 0 ? 'Diagnosis' : 'Additional diagnosis'} value={d.name} onChange={(e) => setDxAt(i, { name: e.target.value })} />
              <Input placeholder="Description (optional)" value={d.description} onChange={(e) => setDxAt(i, { description: e.target.value })} />
            </div>
          ))}
        </div>
        <button className="mt-4 text-sm font-bold text-secondary-foreground" onClick={() => setDx((all) => [...all, { name: '', description: '' }])}><Plus className="mr-1 inline" />Add another diagnosis</button>
        <div className="mt-7 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!ok || busy} onClick={async () => { setBusy(true); await onSave({ name, location, dob, medicaid, diagnoses: dx }); setBusy(false) }}>{busy ? 'Saving…' : 'Add patient'}</Button></div>
      </div>
    </div>
  )
}

function AssignModal({ member, patients, onClose, onSave }: { member: StaffMember; patients: Patient[]; onClose: () => void; onSave: (ids: string[]) => Promise<void> }) {
  const [ids, setIds] = useState<string[]>(member.patientIds); const [busy, setBusy] = useState(false)
  const toggle = (id: string) => setIds((all) => (all.includes(id) ? all.filter((x) => x !== id) : [...all, id]))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/40 p-4">
      <div role="dialog" aria-modal="true" className="mx-auto w-full max-w-[430px] rounded-3xl bg-background p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><h2 className="font-heading text-2xl font-bold">Assign patients</h2><p className="mt-1 text-sm text-muted-foreground">{member.name} can document care only for these patients.</p></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X /></Button></div>
        <div className="mt-5 flex max-h-[50dvh] flex-col gap-2 overflow-y-auto">
          {!patients.length && <p className="text-sm text-muted-foreground">Add a patient first (Patients tab).</p>}
          {patients.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm">
              <input type="checkbox" checked={ids.includes(p.id)} onChange={() => toggle(p.id)} className="size-4" />
              <span className="min-w-0"><span className="block font-bold">{p.name}</span><span className="block truncate text-xs text-muted-foreground">{p.location}</span></span>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={async () => { setBusy(true); await onSave(ids); setBusy(false) }}>{busy ? 'Saving…' : 'Save'}</Button></div>
      </div>
    </div>
  )
}

export function SupervisorLanding({ onBack, onSignOut }: { onBack: () => void; onSignOut?: () => void }) { return <SupervisorDashboard onSignOut={onSignOut || onBack} /> }