export type Role = 'Nurse' | 'CNA/PNA'
export type ShiftStatus = 'pending' | 'incident' | 'approved' | 'rejected'
export type StaffMember = { id: string; name: string; role: Role; phone: string; status: 'active' | 'awaiting' }
export type Patient = { id: string; name: string; location: string; dob: string; medicaid: string; diagnoses: { name: string; description?: string }[] }
export type Shift = { id: string; staff: StaffMember; patient: Patient; date: string; status: ShiftStatus; summary: string; incident?: string; observations: string; recommendations: string; timeline: { time: string; type: string; text: string }[]; reviewer?: string; reviewComment?: string }
export type Activity = { id: string; actor: string; action: string; at: string }

const staff: StaffMember[] = [
  { id: 's1', name: 'Marisol Green', role: 'Nurse', phone: '(555) 010-2211', status: 'active' },
  { id: 's2', name: 'Darius Cole', role: 'CNA/PNA', phone: '(555) 010-4472', status: 'active' },
  { id: 's3', name: 'Elena Vasquez', role: 'Nurse', phone: '(555) 010-8934', status: 'awaiting' },
]
const patients: Patient[] = [
  { id: 'p1', name: 'Robert Williams', location: 'Room 214B', dob: '04/12/1943', medicaid: 'MCD-4821-9042', diagnoses: [{ name: 'Congestive heart failure', description: 'Stage II' }, { name: 'Type 2 diabetes' }] },
  { id: 'p2', name: 'June Foster', location: 'Room 108A', dob: '09/28/1938', medicaid: 'MCD-7702-1189', diagnoses: [{ name: 'Alzheimer\'s disease' }] },
]
const shifts: Shift[] = [{ id: 'sh1', staff: staff[0], patient: patients[0], date: 'October 14, 2026', status: 'incident', incident: 'Patient experienced a fall at 14:20 while transferring from bed to chair. No visible injury reported.', summary: 'Completed 8-hour shift with one documented incident requiring supervisor review.', observations: 'Patient was alert and responsive throughout the shift. Appetite was fair and vital signs remained within baseline.', recommendations: 'Continue fall precautions and remind patient to use call light before transfers.', timeline: [{ time: '08:00', type: 'Note', text: 'Received handoff. Patient resting comfortably.' }, { time: '09:15', type: 'Medication', text: 'Administered morning medications per MAR.' }, { time: '11:30', type: 'Vitals', text: 'BP 128/76 · Pulse 74 · SpO2 97%' }, { time: '14:20', type: 'Incident', text: 'Fall during transfer. Assessed patient and notified charge nurse.' }, { time: '16:00', type: 'Task', text: 'Completed evening hygiene and meal assistance.' }] }]
const activity: Activity[] = [{ id: 'a1', actor: 'Marisol Green', action: 'Submitted shift record for Robert Williams', at: 'Today, 4:18 PM' }, { id: 'a2', actor: 'System', action: 'Elena Vasquez requested staff access', at: 'Today, 9:02 AM' }]
export async function listShifts(): Promise<Shift[]> { return shifts }
export async function getShift(id: string): Promise<Shift | undefined> { return shifts.find((item) => item.id === id) }
export async function approveShift(id: string): Promise<void> { const item = shifts.find((shift) => shift.id === id); if (item) item.status = 'approved' }
export async function requestCorrection(id: string, comment: string): Promise<void> { const item = shifts.find((shift) => shift.id === id); if (item) { item.status = 'rejected'; item.reviewComment = comment; item.reviewer = 'You' } }
export async function listStaff(): Promise<StaffMember[]> { return staff }
export async function assignPatients(_staffId: string, _patientIds: string[]): Promise<void> {}
export async function resetPin(_staffId: string): Promise<string> { return '4829' }
export async function removeStaff(id: string): Promise<void> { const index = staff.findIndex((item) => item.id === id); if (index >= 0) staff.splice(index, 1) }
export async function listPatients(): Promise<Patient[]> { return patients }
export async function addPatient(patient: Omit<Patient, 'id'>): Promise<Patient> { const created = { ...patient, id: `p${patients.length + 1}` }; patients.push(created); return created }
export async function listActivity(): Promise<Activity[]> { return activity }
