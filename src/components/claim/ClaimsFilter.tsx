'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ClaimStatus } from '@/types/database'

const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'changes_requested', label: 'Changes' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
]

export function ClaimsFilter({ current }: { current: string }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
      {FILTERS.map(f => (
        <button
          key={f.value}
          onClick={() => router.push(f.value === 'all' ? pathname : `${pathname}?status=${f.value}`)}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
            current === f.value
              ? 'border-amber-500 bg-amber-500/10 text-amber-400'
              : 'border-[--bdr] text-[--dim] hover:border-[--bdrhi]'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
