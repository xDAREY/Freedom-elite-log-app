import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex size-11 items-center justify-center rounded-2xl bg-primary text-sm font-bold tracking-[-0.08em] text-primary-foreground', className)} aria-label="Freedom Elite Home Care">
      FE
    </div>
  )
}

export function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      <div>
        <p className="font-heading text-sm font-bold tracking-tight text-foreground">Freedom Elite</p>
        <p className="text-xs text-muted-foreground">Home Care</p>
      </div>
    </div>
  )
}
