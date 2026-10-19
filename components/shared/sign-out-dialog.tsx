'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function SignOutDialog({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"><LogOut aria-hidden="true" /></div>
          <DialogTitle>Sign out of your account?</DialogTitle>
          <DialogDescription>You can sign back in anytime with your phone number and PIN.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Stay signed in</Button>
          <Button className="rounded-full" onClick={onConfirm}>Sign out</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
