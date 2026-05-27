'use client'

import { cn, getStatusConfig } from '@/lib/utils'
import type { ClaimStatus } from '@/types/database'

interface StatusBadgeProps {
  status: ClaimStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = getStatusConfig(status)
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.bg, config.color, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
