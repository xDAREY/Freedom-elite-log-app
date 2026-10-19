// lib/auth.ts  (log app) — all sign-in / sign-up / sign-out calls live here.
import { supabase } from './supabase'

export type StaffRole = 'nurse' | 'pca_cna'
export type AuthResult =
  | { ok: true; profile: { id: string; name: string; role?: StaffRole; mustResetPin?: boolean } }
  | { ok: false; error: string; message: string }

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Wrong phone number or PIN.',
  pending_approval: 'Your account is waiting for supervisor approval.',
  account_deactivated: 'This account has been deactivated. Contact your supervisor.',
  wrong_role: 'This account is registered under a different role. Go back and pick the other one.',
  too_many_attempts: 'Too many wrong attempts. Try again in 15 minutes.',
  invalid_pin: 'PIN must be 4 to 6 digits.',
  phone_taken: 'That phone number already has an account.',
  server_error: 'Something went wrong. Please try again.',
}
const msg = (code: string) => MESSAGES[code] ?? MESSAGES.server_error

export const toE164 = (raw: string) => {
  const d = raw.replace(/[^\d+]/g, '')
  return d.startsWith('+') ? d : d.length === 10 ? `+1${d}` : `+${d}`
}

async function login(
  role: 'nurse' | 'supervisor', phone: string, pin: string, expectedStaffRole?: StaffRole,
): Promise<AuthResult> {
  const { data, error } = await supabase.functions.invoke('auth-login', {
    body: { role, phone: toE164(phone), pin, expectedStaffRole },
  })
  // functions.invoke puts non-2xx bodies in error.context (a Response)
  if (error) {
    let code = 'server_error'
    try { code = (await (error as any).context.json()).error ?? code } catch {}
    return { ok: false, error: code, message: msg(code) }
  }
  const { error: sErr } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
  if (sErr) return { ok: false, error: 'server_error', message: msg('server_error') }
  return { ok: true, profile: data.profile }
}

export const signInStaff = (phone: string, pin: string, role: StaffRole) => login('nurse', phone, pin, role)
export const signInSupervisor = (phone: string, pin: string) => login('supervisor', phone, pin)

export async function signUpStaff(name: string, phone: string, pin: string, role: StaffRole): Promise<AuthResult> {
  const { error } = await supabase.rpc('register_nurse', {
    p_name: name.trim(), p_phone: toE164(phone), p_pin: pin, p_role: role,
  })
  if (error) {
    const code = ['invalid_pin', 'phone_taken'].find((c) => error.message.includes(c)) ?? 'server_error'
    return { ok: false, error: code, message: msg(code) }
  }
  return { ok: true, profile: { id: '', name } }   // lands as 'pending' -> show the waiting screen
}

/** After a supervisor reset: staff picks a new PIN (must already be signed in). */
export async function setOwnPin(pin: string) {
  const { error } = await supabase.rpc('set_own_nurse_pin', { p_new_pin: pin })
  return error ? { ok: false as const, message: msg('invalid_pin') } : { ok: true as const }
}

/**
 * Sign out. scope 'local' ends THIS device's session and wipes it from storage;
 * other devices stay signed in. Use 'global' to also revoke every other device.
 */
export async function signOut(scope: 'local' | 'global' = 'local') {
  await supabase.auth.signOut({ scope })
}