import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ClaimTabs } from '@/components/claim/ClaimTabs'
import { OverviewTab } from '@/components/claim/OverviewTab'
import { DocumentsTab } from '@/components/claim/DocumentsTab'
import { SupplementsTab } from '@/components/claim/SupplementsTab'
import { ActivityTab } from '@/components/claim/ActivityTab'
import { HomeownerTab } from '@/components/claim/HomeownerTab'
import { ClaimActions } from '@/components/claim/ClaimActions'
import { formatCurrency } from '@/lib/utils'

type Tab = 'overview' | 'docs' | 'supplements' | 'activity' | 'homeowner'

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params
  const sp = await searchParams
  const tab = (sp.tab as Tab) || 'overview'

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const { data: claim } = await supabase
    .from('claims')
    .select('*, contractor:profiles!contractor_id(*), adjuster:profiles!adjuster_id(*)')
    .eq('id', id)
    .single()

  if (!claim) notFound()

  // Load tab data
  const [{ data: documents }, { data: estimates }, { data: supplements }, { data: activity }] = await Promise.all([
    supabase.from('documents').select('*, uploader:profiles!uploaded_by(*)').eq('claim_id', id).order('created_at', { ascending: false }),
    supabase.from('estimates').select('*, submitter:profiles!submitted_by(*), decisions:estimate_decisions(*, decider:profiles!decided_by(*))').eq('claim_id', id).order('version', { ascending: false }),
    supabase.from('supplements').select('*, requester:profiles!requested_by(*), decider:profiles!decided_by(*)').eq('claim_id', id).order('created_at', { ascending: false }),
    supabase.from('activity_log').select('*, actor:profiles!actor_id(*)').eq('claim_id', id).order('created_at', { ascending: false }),
  ])

  const isContractor = claim.contractor_id === user.id
  const isAdjuster = claim.adjuster_id === user.id
  const canAct = isContractor || isAdjuster

  const approvedSupps = supplements?.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.amount, 0) || 0

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[--surf] border-b border-[--bdr]">
        <div className="px-4 pt-safe pb-0">
          <div className="py-3 flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-1 text-blue-400 text-sm font-bold">
              <ChevronLeft size={18} />
              Back
            </Link>
          </div>

          <div className="pb-3">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-xs text-amber-400 font-bold">
                {claim.claim_number || claim.id.slice(0, 8).toUpperCase()}
              </span>
              <StatusBadge status={claim.status} />
            </div>
            <h1 className="text-base font-extrabold text-[--text] leading-tight">{claim.property_address}</h1>
            <p className="text-xs text-[--muted] mt-0.5">{claim.homeowner_name} · {claim.insurance_company || 'No carrier'}</p>

            {/* Financials */}
            <div className="flex gap-2.5 mt-3 flex-wrap">
              {claim.total_estimate > 0 && (
                <div className="border border-[--bdr] rounded-xl px-3 py-2 bg-[--card]">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[--muted]">Estimate</p>
                  <p className="text-base font-black text-[--text] mt-0.5 font-mono">{formatCurrency(claim.total_estimate)}</p>
                </div>
              )}
              {claim.approved_amount > 0 && (
                <div className="border border-emerald-500/30 rounded-xl px-3 py-2 bg-emerald-500/10">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Approved</p>
                  <p className="text-base font-black text-emerald-400 mt-0.5 font-mono">{formatCurrency(claim.approved_amount)}</p>
                </div>
              )}
              {approvedSupps > 0 && (
                <div className="border border-amber-500/30 rounded-xl px-3 py-2 bg-amber-500/10">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400">Supplements</p>
                  <p className="text-base font-black text-amber-400 mt-0.5 font-mono">+{formatCurrency(approvedSupps)}</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {canAct && (
              <ClaimActions
                claim={claim}
                profile={profile}
                isContractor={isContractor}
                isAdjuster={isAdjuster}
              />
            )}
          </div>
        </div>

        <ClaimTabs claimId={id} currentTab={tab} />
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">
        {tab === 'overview' && <OverviewTab claim={claim} />}
        {tab === 'docs' && <DocumentsTab claimId={id} documents={documents || []} isContractor={isContractor} />}
        {tab === 'supplements' && (
          <SupplementsTab
            claimId={id}
            supplements={supplements || []}
            isContractor={isContractor}
            isAdjuster={isAdjuster}
            claimStatus={claim.status}
          />
        )}
        {tab === 'activity' && <ActivityTab activity={activity || []} />}
        {tab === 'homeowner' && (
          <HomeownerTab
            claim={claim}
            activity={(activity || []).slice(0, 5)}
          />
        )}
      </div>
    </div>
  )
}
