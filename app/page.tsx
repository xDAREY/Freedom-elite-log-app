'use client'

import { useEffect, useState } from 'react'
import { AuthShell } from '@/components/shared/auth-shell'
import { RolePicker } from '@/components/shared/role-picker'
import { StaffAuth } from '@/components/staff/staff-auth'
import { SupervisorAuth } from '@/components/supervisor/supervisor-auth'
import { SupervisorLanding } from '@/components/supervisor/supervisor-dashboard'
import { StaffWorkspace } from '@/components/staff/staff-workspace'
import { useStaffWorkspace } from '@/lib/staff/api'
import { signOut } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

type Role = 'Nurse' | 'CNA/PNA' | 'Supervisor'
type Profile = { id: string; name: string }

function StaffSession({ user, onSignOut }: { user: { id: string; name: string; role: 'Nurse' | 'CNA/PNA' }; onSignOut: () => void }) {
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

/** If a saved session exists, work out who it belongs to so a refresh keeps you signed in. */
async function restoreSession(): Promise<{ role: Role; profile: Profile } | null> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user.id
  if (!uid) return null

  const { data: sup } = await supabase.from('supervisors').select('id,name').eq('auth_user_id', uid).maybeSingle()
  if (sup) return { role: 'Supervisor', profile: sup }

  const { data: nurse } = await supabase.from('nurses').select('id,name,role,status,active').eq('auth_user_id', uid).maybeSingle()
  if (nurse && nurse.status === 'approved' && nurse.active) {
    return { role: nurse.role === 'pca_cna' ? 'CNA/PNA' : 'Nurse', profile: { id: nurse.id, name: nurse.name } }
  }
  await signOut()   // a saved session that no longer maps to an allowed account is cleared
  return null
}

export default function Page() {
  const [role, setRole] = useState<Role | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restoring, setRestoring] = useState(true)

  useEffect(() => {
    let alive = true
    restoreSession()
      .then((r) => { if (alive && r) { setRole(r.role); setProfile(r.profile) } })
      .catch(() => {})
      .finally(() => { if (alive) setRestoring(false) })

    // If the session ends elsewhere (expired, signed out in another tab), return to the sign-in screen.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setProfile(null); setRole(null) }
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  const leave = async () => {
    await signOut()          // ends this device's session and clears stored tokens
    setProfile(null)
    setRole(null)
  }

  if (restoring) return <AuthShell><p className="text-sm text-muted-foreground">Loading…</p></AuthShell>

  if (role === 'Supervisor' && profile) return <SupervisorLanding onBack={leave} />
  if (role === 'Supervisor') return <SupervisorAuth onBack={() => setRole(null)} onSignedIn={setProfile} />
  if ((role === 'Nurse' || role === 'CNA/PNA') && profile)
    return <StaffSession user={{ id: profile.id, name: profile.name, role }} onSignOut={leave} />
  if (role === 'Nurse' || role === 'CNA/PNA') return <StaffAuth role={role} onBack={() => setRole(null)} onSignedIn={setProfile} />
  return <AuthShell><RolePicker onSelect={setRole} /></AuthShell>
}