// supabase/functions/auth-login/index.ts
//
// Called from the frontend with { role: 'nurse' | 'supervisor', phone, pin,
// expectedStaffRole? }. Verifies the PIN via the verify_*_login RPCs, then
// mints a real Supabase Auth session for that profile.
//
// expectedStaffRole ('nurse' | 'pca_cna') is only meaningful when
// role === 'nurse' — nurses and PCA/CNAs share the same `nurses` table and
// login RPC, distinguished by nurses.role. If the account's actual role
// doesn't match which button the person clicked, this rejects with
// 'wrong_role' BEFORE minting a session, so there's never a moment where a
// PCA/CNA is authenticated under the Nurse flow or vice versa.
//
// SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are
// injected automatically by the platform at runtime — do not set these
// yourself in the dashboard's function secrets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type Role = 'nurse' | 'supervisor'
type StaffRole = 'nurse' | 'pca_cna'

type LoginRequest = {
  role: Role
  phone: string
  pin: string
  expectedStaffRole?: StaffRole
}

const MAX_FAILS_PER_PHONE = 5      // wrong PINs allowed per phone ...
const MAX_FAILS_PER_IP = 20        // ... and per network address ...
const WINDOW_MINUTES = 15          // ... within this window, then locked

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function isLocked(phoneHash: string, ipHash: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString()
  const count = async (col: 'phone_hash' | 'ip_hash', val: string) => {
    const { count, error } = await adminClient
      .from('login_attempts')
      .select('id', { count: 'exact', head: true })
      .eq(col, val).eq('success', false).gte('created_at', since)
    if (error) throw error
    return count ?? 0
  }
  return (await count('phone_hash', phoneHash)) >= MAX_FAILS_PER_PHONE ||
         (await count('ip_hash', ipHash)) >= MAX_FAILS_PER_IP
}

async function recordAttempt(phoneHash: string, ipHash: string, success: boolean) {
  await adminClient.from('login_attempts').insert({ phone_hash: phoneHash, ip_hash: ipHash, success })
  if (success) {
    // a good login clears that phone's recent failures
    await adminClient.from('login_attempts').delete().eq('phone_hash', phoneHash).eq('success', false)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405)
  }

  let body: LoginRequest
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400)
  }

  const { role, phone, pin, expectedStaffRole } = body
  if (!role || !phone || !pin) {
    return jsonResponse({ error: 'missing_fields' }, 400)
  }
  if (role !== 'nurse' && role !== 'supervisor') {
    return jsonResponse({ error: 'invalid_role' }, 400)
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const ipHash = await sha256(`${Deno.env.get('IP_HASH_SALT') ?? ''}:${ip}`)
  const phoneHash = await sha256(`${role}:${phone}`)

  try {
    if (await isLocked(phoneHash, ipHash)) {
      return jsonResponse({ error: 'too_many_attempts', retryAfterMinutes: WINDOW_MINUTES }, 429)
    }

    if (role === 'nurse') {
      const { data, error } = await adminClient.rpc('verify_nurse_login', {
        p_phone: phone,
        p_pin: pin,
      })
      if (error) throw error

      const match = data?.[0]
      if (!match) {
        await recordAttempt(phoneHash, ipHash, false)
        return jsonResponse({ error: 'invalid_credentials' }, 401)
      }
      await recordAttempt(phoneHash, ipHash, true)   // PIN was correct (status checks below are not guessing)
      if (!match.active) return jsonResponse({ error: 'account_deactivated' }, 403)
      if (match.status === 'pending') {
        return jsonResponse({ error: 'pending_approval' }, 403)
      }
      if (expectedStaffRole && match.role !== expectedStaffRole) {
        return jsonResponse({ error: 'wrong_role', actualRole: match.role }, 403)
      }

      const session = await ensureSessionForProfile('nurses', match.nurse_id)
      return jsonResponse({
        session,
        profile: {
          id: match.nurse_id,
          name: match.name,
          mustResetPin: match.must_reset_pin,
          role: match.role,
        },
      })
    } else {
      const { data, error } = await adminClient.rpc('verify_supervisor_login', {
        p_phone: phone,
        p_pin: pin,
      })
      if (error) throw error

      const match = data?.[0]
      if (!match) {
        await recordAttempt(phoneHash, ipHash, false)
        return jsonResponse({ error: 'invalid_credentials' }, 401)
      }
      await recordAttempt(phoneHash, ipHash, true)

      const session = await ensureSessionForProfile('supervisors', match.supervisor_id)
      return jsonResponse({
        session,
        profile: { id: match.supervisor_id, name: match.name },
      })
    }
  } catch (err) {
    console.error('auth-login error:', err)
    return jsonResponse({ error: 'server_error' }, 500)
  }
})

async function ensureSessionForProfile(table: 'nurses' | 'supervisors', profileId: string) {
  const { data: row, error: fetchErr } = await adminClient
    .from(table)
    .select('auth_user_id')
    .eq('id', profileId)
    .single()
  if (fetchErr) throw fetchErr

  let authUserId: string | null = row?.auth_user_id ?? null
  const kind = table === 'nurses' ? 'nurse' : 'supervisor'
  const syntheticEmail = `${kind}-${profileId}@users.freedomelite.internal`

  if (!authUserId) {
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      email_confirm: true,
      user_metadata: { role: kind, profile_id: profileId },
    })
    if (createErr) throw createErr

    authUserId = created.user.id
    const { error: linkErr } = await adminClient.from(table).update({ auth_user_id: authUserId }).eq('id', profileId)
    if (linkErr) throw linkErr
  }

  const { data: linkData, error: genErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: syntheticEmail,
  })
  if (genErr) throw genErr

  const tokenHash = linkData.properties?.hashed_token
  if (!tokenHash) throw new Error('no_token_hash_returned')

  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: verified, error: verifyErr } = await anonClient.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  })
  if (verifyErr) throw verifyErr
  if (!verified.session) throw new Error('no_session_returned')

  return {
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
    expires_at: verified.session.expires_at,
  }
}
