// lib/staff/api.ts  (log app) — Supabase data layer for StaffWorkspace.
// Reads: RLS already limits staff to their own rows. Writes: triggers enforce shift rules.
'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Entry, NotificationItem, Patient, Shift, SubmitPayload } from '@/lib/staff/data'

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const nz = <T,>(v: T | null | undefined) => (v ?? undefined)
const nzArr = (v: string[] | null) => (v && v.length ? v : undefined)

export const toEntry = (r: any): Entry => ({
  id: r.id, kind: r.kind, time: clock(r.occurred_at), timestamp: r.occurred_at, detail: r.detail,
  status: nz(r.care_status), tags: nzArr(r.tags), timeframe: nz(r.timeframe),
  drug: nz(r.drug), dose: nz(r.dose), route: nz(r.route), administeredAt: nz(r.administered_at),
  medStatus: nz(r.med_status), reason: nz(r.reason),
  lengthOfEvent: nz(r.length_of_event), observations: nzArr(r.observations), tasks: nzArr(r.tasks),
  bloodPressure: nz(r.blood_pressure), pulse: nz(r.pulse), respiratoryRate: nz(r.respiratory_rate),
  oxygenSaturation: nz(r.oxygen_saturation),
  temperatureValue: nz(r.temperature_value), temperatureUnit: nz(r.temperature_unit), temperatureMethod: nz(r.temperature_method),
})

const fromEntry = (shiftId: string, e: Entry) => ({
  id: e.id, shift_id: shiftId, kind: e.kind, occurred_at: e.timestamp || new Date().toISOString(), detail: e.detail,
  care_status: e.status ?? null, tags: e.tags ?? [], timeframe: e.timeframe ?? null,
  drug: e.drug ?? null, dose: e.dose ?? null, route: e.route ?? null, administered_at: e.administeredAt ?? null,
  med_status: e.medStatus ?? null, reason: e.reason ?? null,
  length_of_event: e.lengthOfEvent ?? null, observations: e.observations ?? [], tasks: e.tasks ?? [],
  blood_pressure: e.bloodPressure ?? null, pulse: e.pulse ?? null, respiratory_rate: e.respiratoryRate ?? null,
  oxygen_saturation: e.oxygenSaturation ?? null,
  temperature_value: e.temperatureValue ?? null, temperature_unit: e.temperatureUnit ?? null,
  temperature_method: e.temperatureMethod ?? null,
})

export async function loadStaffData(nurseId: string) {
  const [pat, sh, nt] = await Promise.all([
    supabase.from('nurse_patient_assignments')
      .select('patients(id,name,room,dob,medicaid_number,patient_diagnoses(id,name,description))')
      .eq('nurse_id', nurseId),
    supabase.from('shifts')
      .select('*, shift_patients(patient_id), entries(*)')
      .eq('nurse_id', nurseId).order('started_at', { ascending: false }),
    supabase.from('notifications').select('*').eq('nurse_id', nurseId).order('created_at', { ascending: false }).limit(50),
  ])
  for (const r of [pat, sh, nt]) if (r.error) throw r.error

  const patients: Patient[] = (pat.data ?? []).map((a: any) => a.patients).filter(Boolean).map((p: any) => ({
    id: p.id, name: p.name, room: p.room, dob: p.dob, medicaidNumber: p.medicaid_number,
    diagnoses: (p.patient_diagnoses ?? []).map((d: any) => ({ id: d.id, name: d.name, description: d.description ?? undefined })),
  }))
  const shifts: Shift[] = (sh.data ?? []).map((s: any) => ({
    id: s.id, nurseId: s.nurse_id, patientIds: (s.shift_patients ?? []).map((x: any) => x.patient_id),
    status: s.status, startedAt: s.started_at, submittedAt: nz(s.submitted_at), incident: s.incident,
    summary: nz(s.summary), observations: nz(s.observations), recommendations: nz(s.recommendations),
    followUp: s.follow_up, signature: nz(s.signature), reviewComment: nz(s.review_comment),
    entries: (s.entries ?? []).map(toEntry).sort((a: Entry, b: Entry) => a.timestamp.localeCompare(b.timestamp)),
  }))
  const notifications: NotificationItem[] = (nt.data ?? []).map((n: any) => ({
    id: n.id, message: n.message, type: n.type, shiftId: n.shift_id, read: n.read, timestamp: n.created_at,
  }))
  return { patients, shifts, notifications }
}

/** Drop-in state + handlers for <StaffWorkspace />. */
export function useStaffWorkspace(nurseId: string) {
  const [state, setState] = useState<{ patients: Patient[]; shifts: Shift[]; notifications: NotificationItem[] }>(
    { patients: [], shifts: [], notifications: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try { setState(await loadStaffData(nurseId)); setError(null) }
    catch (e: any) { setError(e?.message ?? 'Could not load your data.') }
    finally { setLoading(false) }
  }, [nurseId])
  useEffect(() => { refresh() }, [refresh])

  // Run a write, then re-read so the UI always shows what the database actually holds.
  const run = async (fn: () => PromiseLike<{ error: any }>) => {
    const { error } = await fn()
    if (error) { setError(error.message?.includes('shift_not_editable') ? 'This shift is locked.' : error.message); throw error }
    await refresh()
  }

  return {
    loading, error, ...state,
    onStartShift: (patientIds: string[]) => run(async () => {
      const { data, error } = await supabase.from('shifts').insert({ nurse_id: nurseId }).select('id').single()
      if (error) return { error }
      return supabase.from('shift_patients').insert(patientIds.map((p) => ({ shift_id: data.id, patient_id: p })))
    }),
    onAddEntry: (shiftId: string, e: Entry) => run(() => supabase.from('entries').insert(fromEntry(shiftId, e))),
    onSubmitShift: (shiftId: string, p: SubmitPayload) => run(() => supabase.from('shifts').update({
      status: 'submitted', ended_at: new Date().toISOString(), submitted_at: new Date().toISOString(),
      summary: p.summary, observations: p.observations, recommendations: p.recommendations,
      follow_up: p.followUp, signature: p.signature,
    }).eq('id', shiftId)),
    onReopenShift: (shiftId: string) => run(() => supabase.from('shifts').update({ status: 'in_progress' }).eq('id', shiftId)),
    onNotificationsRead: () => run(() => supabase.from('notifications').update({ read: true }).eq('nurse_id', nurseId).eq('read', false)),
  }
}