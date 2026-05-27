import { formatTimestamp } from '@/lib/utils'
import type { ActivityLog } from '@/types/database'

export function ActivityTab({ activity }: { activity: ActivityLog[] }) {
  if (!activity.length) {
    return <p className="text-center text-[--muted] text-sm py-10">No activity yet.</p>
  }

  return (
    <div className="relative pl-5">
      {/* Timeline line */}
      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-[--bdr]" />

      {activity.map(item => {
        const isContractor = item.actor_role === 'contractor'
        const dotColor = isContractor ? '#3b82f6' : '#f59e0b'
        const nameColor = isContractor ? 'text-blue-400' : 'text-amber-400'

        return (
          <div key={item.id} className="relative mb-5">
            {/* Dot */}
            <div
              className="absolute -left-[17px] top-1 w-3 h-3 rounded-full border-2 border-[--bg]"
              style={{ background: dotColor }}
            />
            <p className="text-[10px] font-mono text-[--muted] mb-1">
              {formatTimestamp(item.created_at)}
            </p>
            <p className="text-sm text-[--text] leading-relaxed">
              <span className={`font-bold ${nameColor}`}>
                {item.actor?.full_name || 'Unknown'}
              </span>
              {' — '}
              {item.action}
            </p>
          </div>
        )
      })}
    </div>
  )
}
