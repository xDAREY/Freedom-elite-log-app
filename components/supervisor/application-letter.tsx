import { Letterhead, PrintFooter, PrintFrame } from '@/components/shared/print-sheet'
import type { Application } from '@/components/supervisor/supervisor-inbox'

const day = (d?: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' }) : undefined)
const stamp = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const LABEL: Record<string, string> = { new: 'New', reviewing: 'Reviewing', interview: 'Interview', hired: 'Hired', rejected: 'Not moving forward' }

function Cell({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  if (!value) return null
  return <div className={`pd-cell${wide ? ' wide' : ''}`}><small>{label}</small><b>{value}</b></div>
}

/** The printable application. Rendered inside <PrintSheet>; never shown on screen. */
export function ApplicationLetter({ a }: { a: Application }) {
  const name = `${a.firstName} ${a.lastName}`.trim()
  return (
    <PrintFrame>
      <Letterhead
        kind="Employment Application"
        meta={[
          { label: 'Reference', value: a.id.slice(0, 8).toUpperCase() },
          { label: 'Received', value: stamp(a.createdAt) },
          { label: 'Status', value: LABEL[a.status] ?? a.status },
        ]}
      />

      <h2 style={{ marginTop: 16, fontSize: 20, fontWeight: 800 }}>{name}</h2>
      <p style={{ color: '#0f7a57', fontWeight: 700 }}>Applying for: {a.role}</p>

      <h3 className="pd-h">Applicant</h3>
      <div className="pd-grid" style={{ marginTop: 0 }}>
        <Cell label="Phone" value={a.phone} />
        <Cell label="Email" value={a.email} />
        <Cell label="City" value={a.city} />
        <Cell label="County or ZIP" value={a.countyOrZip} />
        <Cell label="Authorized to work in the U.S." value={a.workAuthorized ? 'Yes' : 'No'} />
        <Cell label="Reliable transportation" value={a.hasTransportation ? 'Yes' : 'No'} />
      </div>

      <h3 className="pd-h">Credentials</h3>
      <div className="pd-grid" style={{ marginTop: 0 }}>
        <Cell label="License number" value={a.licenseNumber} />
        <Cell label="Issuing state" value={a.licenseState} />
        <Cell label="License status" value={a.licenseStatus} />
        <Cell label="License expires" value={day(a.licenseExpiration)} />
        <Cell label="Registry number" value={a.registryNumber} />
        <Cell label="Certification expires" value={day(a.certificationExpiration)} />
        <Cell label="Training" value={a.training} />
        <Cell label="CPR / BLS" value={a.cprStatus} />
        <Cell label="Years of experience" value={a.yearsExperience} />
        <Cell label="Pediatric experience" value={a.pediatricExperience ? 'Yes' : 'No'} />
        <Cell label="TB / immunizations current" value={a.immunizationsCurrent} />
      </div>

      {(a.skills.length > 0 || a.experience) && (
        <>
          <h3 className="pd-h">Skills and experience</h3>
          <div className="pd-block">
            {a.skills.length > 0 && <p style={{ fontWeight: 700 }}>{a.skills.join(' · ')}</p>}
            {a.experience && <p style={{ marginTop: a.skills.length ? 6 : 0 }}>{a.experience}</p>}
          </div>
        </>
      )}

      <h3 className="pd-h">Availability</h3>
      <div className="pd-grid" style={{ marginTop: 0 }}>
        <Cell label="Employment type" value={a.employmentType} />
        <Cell label="Hours per week" value={a.hoursPerWeek} />
        <Cell label="Shifts" value={a.availability.join(', ')} />
        <Cell label="Earliest start" value={day(a.earliestStart)} />
        <Cell label="Can travel to" value={a.travelCounties} wide />
      </div>

      {(a.referenceName || a.referencePhone) && (
        <>
          <h3 className="pd-h">Reference</h3>
          <div className="pd-grid" style={{ marginTop: 0 }}>
            <Cell label="Name" value={a.referenceName} />
            <Cell label="Phone" value={a.referencePhone} />
          </div>
        </>
      )}

      {a.notes && (<><h3 className="pd-h">Internal notes</h3><div className="pd-block">{a.notes}</div></>)}

      <div className="pd-sign">
        <div><b>{name}</b>Applicant. Consented to a background check and credential verification.</div>
        <div><b>&nbsp;</b>Reviewed by (Freedom Elite Home Care)</div>
      </div>

      <PrintFooter note="CONFIDENTIAL — applicant personal information. For hiring use only. Freedom Elite Home Care." />
    </PrintFrame>
  )
}