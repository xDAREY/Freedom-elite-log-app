'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Prints ONLY `children` (a clean document), never the app around it.
 * It mounts the document in #print-root (hidden on screen, the only thing shown when printing),
 * waits for images, opens the print dialog, and removes itself afterwards.
 * `title` becomes the suggested PDF file name.
 */
export function PrintSheet({ title, onDone, children }: { title: string; onDone: () => void; children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.createElement('div')
    el.id = 'print-root'
    document.body.appendChild(el)
    setHost(el)
    return () => { el.remove() }
  }, [])

  useEffect(() => {
    if (!host) return
    const prevTitle = document.title
    document.title = title
    let cancelled = false
    const finish = () => { document.title = prevTitle; onDone() }
    window.addEventListener('afterprint', finish, { once: true })
    const imgs = Array.from(host.querySelectorAll('img'))
    Promise.all(imgs.map((i) => (i.decode ? i.decode().catch(() => undefined) : Promise.resolve())))
      .then(() => new Promise((r) => setTimeout(r, 120)))
      .then(() => { if (!cancelled) window.print() })
    return () => { cancelled = true; window.removeEventListener('afterprint', finish); document.title = prevTitle }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host])

  return host ? createPortal(children, host) : null
}

/** Shared page frame for printed documents: repeating top/bottom margins on every page. */
export function PrintFrame({ children }: { children: ReactNode }) {
  return (
    <table className="print-frame">
      <thead><tr><td><div className="print-spacer" /></td></tr></thead>
      <tbody><tr><td>{children}</td></tr></tbody>
      <tfoot><tr><td><div className="print-spacer" /></td></tr></tfoot>
    </table>
  )
}

/** Letterhead used at the top of every printed document. */
export function Letterhead({ kind, meta }: { kind: string; meta: { label: string; value: string }[] }) {
  return (
    <header className="pd-head">
      <div className="pd-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="pd-icon" />
        <div>
          <p className="pd-name">FREEDOM ELITE HOME CARE</p>
          <p className="pd-tag">Compassionate care, documented with integrity</p>
        </div>
      </div>
      <div className="pd-meta">
        <p className="pd-kind">{kind}</p>
        {meta.map((m) => <p key={m.label}><span>{m.label}</span> {m.value}</p>)}
      </div>
    </header>
  )
}

export function PrintFooter({ note }: { note: string }) {
  return (
    <footer className="pd-foot">
      <p>{note}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Freedom Elite Home Care" className="pd-logo" />
    </footer>
  )
}