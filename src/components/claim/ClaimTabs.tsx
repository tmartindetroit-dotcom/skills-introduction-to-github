'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'overview', label: 'Info' },
  { id: 'docs', label: 'Docs' },
  { id: 'supplements', label: 'Supps' },
  { id: 'activity', label: 'Log' },
  { id: 'homeowner', label: 'HO View' },
]

export function ClaimTabs({ claimId, currentTab }: { claimId: string; currentTab: string }) {
  return (
    <div className="flex overflow-x-auto border-t border-[--bdr] bg-[--surf]" style={{ scrollbarWidth: 'none' }}>
      {TABS.map(tab => (
        <Link
          key={tab.id}
          href={`/claim/${claimId}?tab=${tab.id}`}
          className={cn(
            'flex-shrink-0 px-4 py-3 border-b-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors',
            currentTab === tab.id
              ? 'text-amber-400 border-amber-500'
              : 'text-[--muted] border-transparent hover:text-[--dim]'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
