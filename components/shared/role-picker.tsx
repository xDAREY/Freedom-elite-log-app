'use client'

import { ArrowRight, BriefcaseBusiness, ClipboardCheck, HeartHandshake } from 'lucide-react'

const roles = [
  { name: 'Nurse', detail: 'Document visits and care provided.', icon: HeartHandshake },
  { name: 'CNA/PNA', detail: 'Record daily support and observations.', icon: ClipboardCheck },
  { name: 'Supervisor', detail: 'Review requests and oversee documentation.', icon: BriefcaseBusiness },
] as const

export function RolePicker({ onSelect }: { onSelect: (role: (typeof roles)[number]['name']) => void }) {
  return (
    <section className="w-full">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary-foreground">Welcome to your care workspace</p>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.15] tracking-tight">Choose your access type.</h1>
        <p className="mt-3 text-base text-muted-foreground">Select the role that matches your work with Freedom Elite Home Care.</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {roles.map(({ name, detail, icon: Icon }) => (
          <button
            key={name}
            onClick={() => onSelect(name)}
            className="group flex w-full items-center gap-3 rounded-[15px] border border-border bg-card p-3.5 text-left transition hover:border-primary hover:bg-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon aria-hidden="true" className="size-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-base font-bold">{name}</h2>
              <p className="truncate text-xs text-muted-foreground">{detail}</p>
            </div>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1" />
          </button>
        ))}
      </div>
    </section>
  )
}