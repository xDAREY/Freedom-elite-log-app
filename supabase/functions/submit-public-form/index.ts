// supabase/functions/submit-public-form/index.ts
// Public intake for the marketing site: career applications + contact inquiries.
// Deploy:  supabase functions deploy submit-public-form
// Secrets: supabase secrets set ALLOWED_ORIGINS="https://freedomelitehomecare.com,http://localhost:3000" IP_HASH_SALT="<random string>"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const RESUME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}
const MAX_RESUME = 5 * 1024 * 1024

const corsFor = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
})

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? ''
  const originOk = allowed.length === 0 ? false : allowed.includes(origin)
  const cors = originOk ? corsFor(origin) : {}
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response(null, { status: originOk ? 204 : 403, headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!originOk) return json({ error: 'origin_not_allowed' }, 403)

  let body: any
  try { body = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }

  // Honeypot: real visitors never fill this hidden field. Pretend success to bots.
  if (typeof body.website === 'string' && body.website.trim() !== '') return json({ ok: true })

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const ipHash = await sha256(`${ip}|${Deno.env.get('IP_HASH_SALT') ?? ''}`)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const fail = (message: string) => {
    if (message.includes('rate_limited')) return json({ error: 'rate_limited' }, 429)
    const known = ['invalid_request', 'invalid_email', 'invalid_role', 'license_required', 'registry_required', 'consent_required', 'contact_required']
    const hit = known.find((k) => message.includes(k))
    if (hit) return json({ error: hit }, 422)
    console.error('submit-public-form', message)
    return json({ error: 'server_error' }, 500)
  }

  if (body.type === 'inquiry') {
    const { data, error } = await admin.rpc('submit_inquiry', { p: body.data ?? {}, p_ip_hash: ipHash })
    if (error) return fail(error.message)
    return json({ ok: true, id: data })
  }

  if (body.type === 'application') {
    const resume = body.resume as { name?: string; type?: string; size?: number } | undefined
    if (resume) {
      if (!resume.type || !(resume.type in RESUME_TYPES)) return json({ error: 'invalid_resume_type' }, 422)
      if (!resume.size || resume.size > MAX_RESUME) return json({ error: 'resume_too_large' }, 422)
    }
    const { data: id, error } = await admin.rpc('submit_application', { p: body.data ?? {}, p_ip_hash: ipHash })
    if (error) return fail(error.message)

    if (!resume) return json({ ok: true, id })

    const path = `${id}/resume.${RESUME_TYPES[resume.type!]}`
    const { data: signed, error: signErr } = await admin.storage.from('resumes').createSignedUploadUrl(path)
    if (signErr || !signed) {
      console.error('signed upload', signErr?.message)
      return json({ ok: true, id, resume: null }) // application is saved; resume upload just wasn't possible
    }
    await admin.rpc('set_application_resume', { p_id: id, p_path: path })
    return json({ ok: true, id, resume: { path, token: signed.token } })
  }

  return json({ error: 'invalid_type' }, 400)
})
