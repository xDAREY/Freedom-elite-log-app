// lib/staff/data.ts
// Shapes and option lists mirror Golden Serenity (lib/types.ts + lib/data.ts)
// so the same Supabase schema and mappers can be reused later.

export type StaffRoleLabel = 'Nurse' | 'CNA/PNA' // maps to 'nurse' | 'pca_cna' in the DB
export type ShiftStatus = 'in_progress' | 'submitted' | 'approved' | 'rejected'
export type EntryKind = 'note' | 'medication' | 'incident' | 'task' | 'vitals' | 'temperature'
export type CareStatus = 'Stable' | 'Needs attention'
export type MedicationStatus = 'Given' | 'Refused'

export type Diagnosis = { id: string; name: string; description?: string }

export type Patient = {
  id: string
  name: string
  room: string
  dob: string
  medicaidNumber: string
  diagnoses: Diagnosis[]
}

export type Entry = {
  id: string
  kind: EntryKind
  time: string
  timestamp: string
  status?: CareStatus
  tags?: string[]
  detail: string
  drug?: string
  dose?: string
  route?: string
  medStatus?: MedicationStatus
  reason?: string
  administeredAt?: string
  observations?: string[]
  lengthOfEvent?: string
  timeframe?: string
  tasks?: string[]
  bloodPressure?: string
  pulse?: string
  respiratoryRate?: string
  oxygenSaturation?: string
  temperatureValue?: string
  temperatureUnit?: 'F' | 'C'
  temperatureMethod?: string
}

export type Shift = {
  id: string
  nurseId: string
  patientIds: string[]
  status: ShiftStatus
  startedAt: string
  submittedAt?: string
  entries: Entry[]
  incident: boolean
  summary?: string
  observations?: string
  recommendations?: string
  followUp: boolean
  signature?: string
  reviewComment?: string
}

export type NotificationItem = {
  id: string
  message: string
  type: 'approved' | 'rejected'
  shiftId: string
  read: boolean
  timestamp: string
}

export type SubmitPayload = {
  summary: string
  observations: string
  recommendations: string
  followUp: boolean
  signature: string
}

export const CARE_TAGS = ['Medication', 'Meal & Fluids', 'Activity', 'Rest & Sleep', 'Behavior & Mood', 'Other']

export const SEIZURE_OBSERVATIONS = [
  'Sudden stare',
  'Unresponsive to name',
  'Prompt recovery',
  'Sudden onset nausea',
  'Vision problems',
  'Jerking of a limb',
  'Gradual recovery',
  'Stiffening / convulsive activity',
  'Laboured breathing',
  'Unconsciousness',
  'Slow recovery',
]

export const ROUTES_OF_ADMINISTRATION = [
  'Oral',
  'Topical',
  'Subcutaneous',
  'Intramuscular',
  'Intravenous',
  'Inhalation',
  'Sublingual',
  'Rectal',
  'Ophthalmic',
  'Otic',
  'Nasal',
  'Enteral (G-tube/feeding tube)',
  'Other',
]

export const TASK_GROUPS: { label: string; tasks: string[] }[] = [
  {
    label: 'Household tasks',
    tasks: ['Pick up prescriptions', 'Accompany client to medical appointment', 'Provide / arrange oversight', 'Light housekeeping'],
  },
  {
    label: 'Nursing care tasks',
    tasks: [
      'Catheter care',
      'Ventilator care',
      'Tracheostomy care',
      'Medication administration',
      'G-tube feeding / care',
      'Wound care',
      'Diabetic care',
      'Injections',
      'Colostomy care / teaching',
      'Enteral / parenteral feedings',
      'IV therapy',
      'Post-op / recovery care',
    ],
  },
]

export const TEMPERATURE_METHODS = ['Oral', 'Tympanic', 'Axillary', 'Temporal', 'Rectal']

export const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
export const nowTime = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
export const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
export const formatClock = (value: string) => {
  if (!value) return ''
  const [h, m] = value.split(':')
  const hour = Number(h)
  return `${((hour + 11) % 12) + 1}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}