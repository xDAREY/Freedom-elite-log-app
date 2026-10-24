import { Letterhead, PrintFooter, PrintFrame } from '@/components/shared/print-sheet'
import type { Shift } from '@/lib/supervisor/api'

const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—')

/** The printable record for one shift. Rendered inside <PrintSheet>; never shown on screen. */
export function ShiftReport({ shift }: { shift: Shift }) {
  const approved = shift.status === 'approved'
  return (
    <PrintFrame>
      <Letterhead
        kind="Shift Documentation Report"
        meta={[
          { label: 'Record', value: shift.id.slice(0, 8).toUpperCase() },
          { label: 'Printed', value: when(new Date().toISOString()) },
        ]}
      />

      <div className={`pd-banner${approved ? '' : ' warn'}`}>
        <strong>{approved ? 'Approved record' : shift.status === 'rejected' ? 'Correction requested' : 'Pending review'}</strong>
        <span>
          {approved ? `Approved by ${shift.reviewer ?? 'a supervisor'} · ${when(shift.reviewedAt)}` : 'Not yet approved. This copy is not final.'}
        </span>
      </div>

      <div className="pd-grid">
        <div className="pd-cell"><small>Patient name</small><b>{shift.patient.name}</b></div>
        <div className="pd-cell"><small>Date of birth</small><b>{shift.patient.dob}</b></div>
        <div className="pd-cell"><small>Medicaid number</small><b>{shift.patient.medicaid}</b></div>
        <div className="pd-cell"><small>Diagnoses</small><b>{shift.patient.diagnoses.map((d) => d.name).join(', ') || '—'}</b></div>
        <div className="pd-cell"><small>Staff name</small><b>{shift.staff.name}</b></div>
        <div className="pd-cell"><small>Staff role</small><b>{shift.staff.role}</b></div>
        <div className="pd-cell"><small>Shift date</small><b>{shift.date}</b></div>
        <div className="pd-cell"><small>Shift submitted</small><b>{when(shift.submittedAt)}</b></div>
      </div>

      {shift.incident && (
        <div className="pd-alert"><b>Incident reported.</b> {shift.incident}</div>
      )}

      <h3 className="pd-h">Care timeline</h3>
      <table className="pd-table">
        <thead><tr><th>Time</th><th>Type</th><th>Details</th></tr></thead>
        <tbody>
          {shift.timeline.length === 0 && <tr><td colSpan={3}>No entries were recorded for this shift.</td></tr>}
          {shift.timeline.map((e) => (
            <tr key={e.id}><td className="t">{e.time}</td><td className="k">{e.type}</td><td>{e.text}</td></tr>
          ))}
        </tbody>
      </table>

      <div className="pd-cols" style={{ marginTop: 18 }}>
        <div><h3 className="pd-h">Summary</h3><div className="pd-block">{shift.summary}</div></div>
        <div><h3 className="pd-h">Observations</h3><div className="pd-block">{shift.observations}</div></div>
        <div><h3 className="pd-h">Recommendations</h3><div className="pd-block">{shift.recommendations}</div></div>
      </div>

      <div className="pd-sign">
        <div><b>{shift.signature || shift.staff.name}</b>Documented by {shift.staff.name} ({shift.staff.role}) · e-signed {when(shift.submittedAt)}</div>
        <div><b>{approved ? shift.reviewer ?? 'Supervisor' : '—'}</b>{approved ? `Reviewed and approved · ${when(shift.reviewedAt)}` : 'Supervisor review pending'}</div>
      </div>

      <PrintFooter note="CONFIDENTIAL — contains protected health information. For authorized use only. Freedom Elite Home Care." />
    </PrintFrame>
  )
}