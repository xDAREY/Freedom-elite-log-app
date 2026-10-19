// lib/supervisor/api.ts  (log app) — Supabase data layer for the supervisor dashboard.
// RLS lets only supervisors read all rows; every write below is also checked by the database.
'use client'
import { supabase } from '@/lib/supabase'
import type { Application, ApplicationStatus, Inquiry, InquiryStatus } from '@/components/supervisor/supervisor-inbox'

/* ------------------------------- shapes (match the dashboard) ------------------------------- */
export type Diagnosis = { name: string; description?: string }
export type Patient = { id: string; name: string; location: string; dob: string; medicaid: string; diagnoses: Diagnosis[] }
export type StaffMember = { id: string; name: string; phone: string; role: 'Nurse' | 'CNA/PNA'; status: 'awaiting' | 'active'; patientIds: string[] }
export type TimelineItem = { id: string; time: string; type: string; text: string }
export type Shift = {
  id: string; status: 'pending' | 'incident' | 'approved' | 'rejected'; date: string
  staff: { name: string; role: string }
  patient: { name: string; dob: string; medicaid: string; diagnoses: Diagnosis[] }
  incident?: string; timeline: TimelineItem[]
  summary: string; observations: string; recommendations: string
  reviewer?: string; reviewComment?: string
}
export type Activity = { id: string; actor: string; action: string; at: string }

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const roleLabel = (r: string) => (r === 'pca_cna' ? 'CNA/PNA' : 'Nurse') as 'Nurse' | 'CNA/PNA'
const fail = (e: { message?: string } | null) => { if (e) throw new Error(e.message ?? 'Request failed') }

/* ---------------------------------- who am I ---------------------------------- */
export async function currentSupervisor() {
  const { data: u } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('supervisors').select('id,name').eq('auth_user_id', u.user?.id ?? '').single()
  fail(error)
  return data as { id: string; name: string }
}

/* ----------------------------------- mappers ----------------------------------- */
function entryText(e: any): string {
  switch (e.kind) {
    case 'medication': return `${e.drug ?? 'Medication'} ${e.dose ?? ''} ${e.route ? `· ${e.route}` : ''} — ${e.med_status ?? ''}${e.reason ? ` (${e.reason})` : ''}${e.detail ? `. ${e.detail}` : ''}`.replace(/\s+/g, ' ').trim()
    case 'vitals': return [e.blood_pressure && `BP ${e.blood_pressure}`, e.pulse && `Pulse ${e.pulse}`, e.respiratory_rate && `Resp ${e.respiratory_rate}`, e.oxygen_saturation && `SpO₂ ${e.oxygen_saturation}`].filter(Boolean).join(' · ') + (e.detail ? `. ${e.detail}` : '')
    case 'temperature': return `${e.temperature_value ?? ''}°${e.temperature_unit ?? ''}${e.temperature_method ? ` (${e.temperature_method})` : ''}${e.detail ? `. ${e.detail}` : ''}`
    case 'incident': return `${e.length_of_event ? `Lasted ${e.length_of_event}. ` : ''}${(e.observations ?? []).join(', ')}${e.detail ? `. ${e.detail}` : ''}`
    case 'task': return `${(e.tasks ?? []).join(', ')}${e.detail ? `. ${e.detail}` : ''}`
    default: return `${e.care_status ? `${e.care_status}. ` : ''}${e.detail ?? ''}`
  }
}

const ACTION_TEXT: Record<string, string> = {
  account_created: 'created an account', login: 'signed in', logout: 'signed out', session_timeout: 'was signed out (inactive)',
  viewed: 'viewed a record', created: 'created a record', edited: 'edited a record', submitted: 'submitted a shift',
  approved: 'approved a shift', rejected: 'requested a correction', pin_reset: 'reset a PIN', assigned: 'updated patient assignments',
  nurse_approved: 'approved a staff account',
}

/* ----------------------------------- reading ----------------------------------- */
export async function loadSupervisorData() {
  const [sh, nu, pa, asg, au, ap, iq] = await Promise.all([
    supabase.from('shifts')
      .select('*, nurses(name,role), supervisors:reviewed_by(name), shift_patients(patients(id,name,room,dob,medicaid_number,patient_diagnoses(name,description))), entries(*)')
      .neq('status', 'in_progress').order('submitted_at', { ascending: false, nullsFirst: false }),
    supabase.from('nurses').select('id,name,phone,role,status,active').order('created_at', { ascending: false }),
    supabase.from('patients').select('id,name,room,dob,medicaid_number,patient_diagnoses(name,description)').order('name'),
    supabase.from('nurse_patient_assignments').select('nurse_id,patient_id'),
    supabase.from('audit_events').select('id,actor_name,action,created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('job_applications').select('*').order('created_at', { ascending: false }),
    supabase.from('inquiries').select('*').order('created_at', { ascending: false }),
  ])
  for (const r of [sh, nu, pa, asg, au, ap, iq]) fail(r.error)

  const toPatient = (p: any): Patient => ({
    id: p.id, name: p.name, location: p.room, dob: p.dob, medicaid: p.medicaid_number,
    diagnoses: (p.patient_diagnoses ?? []).map((d: any) => ({ name: d.name, description: d.description ?? undefined })),
  })

  const shifts: Shift[] = (sh.data ?? []).map((s: any) => {
    const pats = (s.shift_patients ?? []).map((x: any) => toPatient({ ...x.patients, patient_diagnoses: x.patients?.patient_diagnoses }))
    const first = pats[0]
    const entries = [...(s.entries ?? [])].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
    const inc = entries.find((e: any) => e.kind === 'incident')
    return {
      id: s.id,
      status: s.status === 'approved' ? 'approved' : s.status === 'rejected' ? 'rejected' : s.incident ? 'incident' : 'pending',
      date: dayLabel(s.started_at),
      staff: { name: s.nurses?.name ?? 'Unknown', role: roleLabel(s.nurses?.role) },
      patient: {
        name: pats.map((p: Patient) => p.name).join(', ') || '—',
        dob: first?.dob ?? '—', medicaid: first?.medicaid ?? '—', diagnoses: first?.diagnoses ?? [],
      },
      incident: s.incident ? (inc ? entryText(inc) || 'Seizure reported' : 'Incident reported') : undefined,
      timeline: entries.map((e: any) => ({ id: e.id, time: clock(e.occurred_at), type: e.kind, text: entryText(e) })),
      summary: s.summary ?? '—', observations: s.observations ?? '—', recommendations: s.recommendations ?? '—',
      reviewer: s.supervisors?.name ?? undefined, reviewComment: s.review_comment ?? undefined,
    }
  })

  const assigned = new Map<string, string[]>()
  for (const a of asg.data ?? []) assigned.set(a.nurse_id, [...(assigned.get(a.nurse_id) ?? []), a.patient_id])
  const staff: StaffMember[] = (nu.data ?? []).filter((n: any) => n.active).map((n: any) => ({
    id: n.id, name: n.name, phone: n.phone, role: roleLabel(n.role),
    status: n.status === 'pending' ? 'awaiting' : 'active', patientIds: assigned.get(n.id) ?? [],
  }))

  const activity: Activity[] = (au.data ?? []).map((a: any) => ({
    id: a.id, actor: a.actor_name, action: ACTION_TEXT[a.action] ?? a.action, at: new Date(a.created_at).toLocaleString(),
  }))

  const applications: Application[] = (ap.data ?? []).map((r: any) => ({
    id: r.id, status: r.status, createdAt: r.created_at, firstName: r.first_name, lastName: r.last_name, phone: r.phone, email: r.email,
    city: r.city, countyOrZip: r.county_or_zip, workAuthorized: r.work_authorized, hasTransportation: r.has_transportation, role: r.role,
    licenseNumber: r.license_number ?? undefined, licenseState: r.license_state ?? undefined, licenseExpiration: r.license_expiration ?? undefined,
    licenseStatus: r.license_status ?? undefined, registryNumber: r.registry_number ?? undefined,
    certificationExpiration: r.certification_expiration ?? undefined, training: r.training ?? undefined, cprStatus: r.cpr_status ?? undefined,
    yearsExperience: r.years_experience, pediatricExperience: r.pediatric_experience, immunizationsCurrent: r.immunizations_current ?? undefined,
    skills: r.skills ?? [], experience: r.experience ?? undefined, availability: r.availability ?? [], employmentType: r.employment_type,
    hoursPerWeek: r.hours_per_week ?? undefined, earliestStart: r.earliest_start ?? undefined, travelCounties: r.travel_counties ?? undefined,
    referenceName: r.reference_name ?? undefined, referencePhone: r.reference_phone ?? undefined, resumePath: r.resume_path ?? undefined,
    source: r.source ?? undefined, notes: r.notes ?? undefined,
  }))

  const inquiries: Inquiry[] = (iq.data ?? []).map((r: any) => ({
    id: r.id, status: r.status, createdAt: r.created_at, name: r.name, phone: r.phone ?? undefined, email: r.email ?? undefined,
    careFor: r.care_for ?? undefined, service: r.service ?? undefined, location: r.location ?? undefined, bestTime: r.best_time ?? undefined,
    message: r.message ?? '', details: r.details ?? {}, sourcePage: r.source_page, notes: r.notes ?? undefined,
  }))

  return { shifts, staff, patients: (pa.data ?? []).map(toPatient), activity, applications, inquiries }
}

/* ---------------------------------- shift review ---------------------------------- */
async function review(shiftId: string, status: 'approved' | 'rejected', comment?: string) {
  const me = await currentSupervisor()
  const { data: shift, error: e0 } = await supabase.from('shifts').select('nurse_id, started_at, shift_patients(patient_id)').eq('id', shiftId).single()
  fail(e0)
  const { error: e1 } = await supabase.from('shifts').update({
    status, review_comment: status === 'rejected' ? comment : null, reviewed_at: new Date().toISOString(), reviewed_by: me.id,
  }).eq('id', shiftId)
  fail(e1)
  const day = new Date(shift!.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const { error: e2 } = await supabase.from('notifications').insert({
    nurse_id: shift!.nurse_id, shift_id: shiftId, type: status,
    message: status === 'approved' ? `Your ${day} shift was approved.` : `Correction requested on your ${day} shift: ${comment}`,
  })
  fail(e2)
  await supabase.from('audit_events').insert({
    actor_name: me.name, actor_role: 'supervisor', actor_supervisor_id: me.id, action: status === 'approved' ? 'approved' : 'rejected',
    patient_ids: (shift!.shift_patients ?? []).map((p: any) => p.patient_id),
  })
}
export const approveShift = (id: string) => review(id, 'approved')
export const requestCorrection = (id: string, comment: string) => review(id, 'rejected', comment.trim())

/* ------------------------------------ staff ------------------------------------ */
export async function approveStaff(id: string) { fail((await supabase.rpc('approve_nurse', { p_nurse_id: id })).error) }
export async function declineStaff(id: string) { fail((await supabase.from('nurses').delete().eq('id', id)).error) }
export async function resetStaffPin(id: string, pin: string) { fail((await supabase.rpc('reset_nurse_pin', { p_nurse_id: id, p_new_pin: pin })).error) }
export async function setStaffActive(id: string, active: boolean) { fail((await supabase.from('nurses').update({ active }).eq('id', id)).error) }

/** Replace a staff member's patient list with exactly `patientIds`. */
export async function setAssignments(nurseId: string, patientIds: string[]) {
  const me = await currentSupervisor()
  const { data, error } = await supabase.from('nurse_patient_assignments').select('patient_id').eq('nurse_id', nurseId)
  fail(error)
  const have = new Set((data ?? []).map((r) => r.patient_id))
  const want = new Set(patientIds)
  const add = [...want].filter((p) => !have.has(p))
  const drop = [...have].filter((p) => !want.has(p))
  if (add.length) fail((await supabase.from('nurse_patient_assignments').insert(add.map((p) => ({ nurse_id: nurseId, patient_id: p, assigned_by: me.id })))).error)
  if (drop.length) fail((await supabase.from('nurse_patient_assignments').delete().eq('nurse_id', nurseId).in('patient_id', drop)).error)
  await supabase.from('audit_events').insert({ actor_name: me.name, actor_role: 'supervisor', actor_supervisor_id: me.id, action: 'assigned', patient_ids: patientIds })
}

/* ----------------------------------- patients ----------------------------------- */
export async function addPatient(p: { name: string; location: string; dob: string; medicaid: string; diagnoses: Diagnosis[] }) {
  const me = await currentSupervisor()
  const { data, error } = await supabase.from('patients')
    .insert({ name: p.name.trim(), room: p.location.trim(), dob: p.dob, medicaid_number: p.medicaid.trim(), created_by: me.id }).select('id').single()
  fail(error)
  const rows = p.diagnoses.filter((d) => d.name.trim()).map((d) => ({ patient_id: data!.id, name: d.name.trim(), description: d.description?.trim() || null }))
  if (rows.length) fail((await supabase.from('patient_diagnoses').insert(rows)).error)
}
export async function removePatient(id: string) {
  const { error } = await supabase.from('patients').delete().eq('id', id)
  if (error) throw new Error(error.message.includes('foreign key') ? 'This patient has shift records and can’t be deleted.' : error.message)
}

/* ------------------------------------- inbox ------------------------------------- */
export async function updateApplication(id: string, patch: { status?: ApplicationStatus; notes?: string }) {
  fail((await supabase.from('job_applications').update(patch).eq('id', id)).error)   // a trigger stamps who/when
}
export async function updateInquiry(id: string, patch: { status?: InquiryStatus; notes?: string }) {
  fail((await supabase.from('inquiries').update(patch).eq('id', id)).error)   // a trigger stamps who/when
}
export async function deleteApplication(id: string) {
  const { data } = await supabase.from('job_applications').select('resume_path').eq('id', id).single()
  if (data?.resume_path) await supabase.storage.from('resumes').remove([data.resume_path])
  fail((await supabase.from('job_applications').delete().eq('id', id)).error)
}
export async function deleteInquiry(id: string) { fail((await supabase.from('inquiries').delete().eq('id', id)).error) }
export async function openResume(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('resumes').createSignedUrl(path, 60)   // link works for 60 seconds
  return data?.signedUrl ?? null
}