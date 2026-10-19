'use client'

import { useState } from 'react'
import { AuthShell } from '@/components/shared/auth-shell'
import { RolePicker } from '@/components/shared/role-picker'
import { StaffAuth } from '@/components/staff/staff-auth'
import { SupervisorAuth } from '@/components/supervisor/supervisor-auth'
import { SupervisorLanding } from '@/components/supervisor/supervisor-dashboard'
import { StaffWorkspace } from '@/components/staff/staff-workspace'
import { useStaffWorkspace } from '@/lib/staff/api'
import { signOut } from '@/lib/auth'

type RoleLabel = 'Nurse' | 'CNA/PNA'
type Profile = { id: string; name: string }

function StaffSession({ user, onSignOut }: { user: { id: string; name: string; role: RoleLabel }; onSignOut: () => void }) {
  const d = useStaffWorkspace(user.id)
  return (
    <StaffWorkspace
      user={user}
      patients={d.patients}
      shifts={d.shifts}
      notifications={d.notifications}
      onStartShift={d.onStartShift}
      onAddEntry={d.onAddEntry}
      onSubmitShift={d.onSubmitShift}
      onReopenShift={d.onReopenShift}
      onNotificationsRead={d.onNotificationsRead}
      onSignOut={onSignOut}
    />
  )
}

export default function Page() {
  const [role, setRole] = useState<'Nurse' | 'CNA/PNA' | 'Supervisor' | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const leave = async () => {
    await signOut()          // ends this device's session and clears stored tokens
    setProfile(null)
    setRole(null)
  }

  if (role === 'Supervisor' && profile) return <SupervisorLanding onBack={leave} />
  if (role === 'Supervisor') return <SupervisorAuth onBack={() => setRole(null)} onSignedIn={setProfile} />
  if ((role === 'Nurse' || role === 'CNA/PNA') && profile)
    return <StaffSession user={{ id: profile.id, name: profile.name, role }} onSignOut={leave} />
  if (role === 'Nurse' || role === 'CNA/PNA') return <StaffAuth role={role} onBack={() => setRole(null)} onSignedIn={setProfile} />
  return <AuthShell><RolePicker onSelect={setRole} /></AuthShell>
}