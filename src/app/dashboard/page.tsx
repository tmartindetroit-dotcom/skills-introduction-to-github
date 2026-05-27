import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Bell, ChevronRight, AlertCircle } from 'lucide-react'
import type { Claim, Profile } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // Fetch claims with pending actions first
  const query = supabase
    .from('claims')
    .select('*, contractor:profiles!contractor_id(*), adjuster:profiles!adjuster_id(*)')
    .order('last_activity_at', { ascending: false })
    .limit(20)

  if (profile.role === 'contractor') {
    query.eq('contractor_id', user.id)
  } else if (profile.role === 'adjuster') {
    query.eq('adjuster_id', user.id)
  }

  const { data: claims } = await query

  const pendingActions = claims?.filter(c =>
    (profile.role === 'contractor' && c.status === 'changes_requested') ||
    (profile.role === 'adjuster' && c.status === 'submitted')
  ) || []

  const otherClaims = claims?.filter(c => !pendingActions.includes(c)) || []

  return (
    <div className="max-w-lg mx-auto px-4 pt-safe">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div>
          <p className="text-slate-400 text-sm">Good day,</p>
          <h1 className="text-xl font-bold text-slate-100">{profile.full_name.split(' ')[0]}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full capitalize">{profile.role}</span>
          <button className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            <Bell size={18} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Total Claims"
          value={String(claims?.length ?? 0)}
        />
        <StatCard
          label="Pending"
          value={String(pendingActions.length)}
          highlight={pendingActions.length > 0}
        />
        <StatCard
          label={profile.role === 'contractor' ? 'Approved' : 'In Review'}
          value={String(claims?.filter(c => c.status === (profile.role === 'contractor' ? 'approved' : 'under_review')).length ?? 0)}
        />
      </div>

      {/* Pending actions */}
      {pendingActions.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">Needs Action</h2>
          </div>
          <div className="flex flex-col gap-2">
            {pendingActions.map(claim => (
              <ClaimCard key={claim.id} claim={claim as Claim & { contractor: Profile; adjuster: Profile | null }} role={profile.role} urgent />
            ))}
          </div>
        </section>
      )}

      {/* All claims */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {pendingActions.length > 0 ? 'Other Claims' : 'Your Claims'}
        </h2>
        {otherClaims.length === 0 && pendingActions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">No claims yet.</p>
            <Link href="/dashboard/claims/new" className="text-amber-400 text-sm hover:text-amber-300 mt-2 inline-block">
              Create your first claim →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {otherClaims.map(claim => (
              <ClaimCard key={claim.id} claim={claim as Claim & { contractor: Profile; adjuster: Profile | null }} role={profile.role} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`bg-slate-900 rounded-xl border p-3 ${highlight ? 'border-amber-500/30' : 'border-slate-700/50'}`}>
      <p className={`text-2xl font-bold ${highlight ? 'text-amber-400' : 'text-slate-100'}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function ClaimCard({ claim, role, urgent }: { claim: Claim & { contractor: Profile; adjuster: Profile | null }; role: string; urgent?: boolean }) {
  return (
    <Link href={`/claim/${claim.id}`}>
      <div className={`bg-slate-900 rounded-xl border p-4 hover:border-slate-500 transition-colors ${urgent ? 'border-amber-500/30' : 'border-slate-700/50'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-100 text-sm truncate">{claim.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{claim.property_address}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={claim.status} />
            <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-mono text-amber-400">{formatCurrency(claim.total_estimate)}</span>
          <span className="text-xs text-slate-600">{formatRelativeTime(claim.last_activity_at)}</span>
        </div>
      </div>
    </Link>
  )
}
