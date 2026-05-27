import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ClaimsFilter } from '@/components/claim/ClaimsFilter'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import type { Claim, Profile } from '@/types/database'

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const params = await searchParams
  const filterStatus = params.status || 'all'

  const query = supabase
    .from('claims')
    .select('*, contractor:profiles!contractor_id(*), adjuster:profiles!adjuster_id(*)')
    .order('last_activity_at', { ascending: false })

  if (profile.role === 'contractor') query.eq('contractor_id', user.id)
  else if (profile.role === 'adjuster') query.eq('adjuster_id', user.id)

  if (filterStatus !== 'all') {
    query.eq('status', filterStatus)
  }

  const { data: claims } = await query

  return (
    <div className="max-w-lg mx-auto px-4 pt-safe">
      <div className="py-4">
        <h1 className="text-2xl font-black text-[--text]">Claims</h1>
      </div>

      <ClaimsFilter current={filterStatus} />

      <div className="flex flex-col gap-2 pb-4">
        {!claims?.length ? (
          <div className="text-center py-12">
            <p className="text-[--muted] text-sm">No claims found.</p>
            <Link href="/dashboard/claims/new" className="text-amber-400 text-sm hover:text-amber-300 mt-2 inline-block">
              Create your first claim →
            </Link>
          </div>
        ) : (
          claims.map(claim => (
            <Link key={claim.id} href={`/claim/${claim.id}`}>
              <div className="bg-[--card] border border-[--bdr] rounded-[14px] p-4 hover:border-[--bdrhi] active:border-[--amber] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs text-amber-400 font-bold">
                        {claim.claim_number || claim.id.slice(0, 8).toUpperCase()}
                      </span>
                      <StatusBadge status={claim.status} />
                    </div>
                    <p className="text-sm font-bold text-[--text] truncate">{claim.property_address}</p>
                    <p className="text-xs text-[--muted] mt-0.5">{claim.homeowner_name} · {claim.insurance_company || 'No carrier'}</p>
                  </div>
                  <ChevronRight size={18} className="text-amber-400 flex-shrink-0 mt-1" />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-base font-black text-amber-400 font-mono">{formatCurrency(claim.total_estimate)}</span>
                  <span className="text-xs text-[--muted] font-mono">{formatRelativeTime(claim.last_activity_at)}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
