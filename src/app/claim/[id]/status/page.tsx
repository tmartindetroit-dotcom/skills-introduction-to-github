import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

const STATUS_MESSAGES: Record<string, { heading: string; body: string; emoji: string }> = {
  draft: {
    emoji: '📋',
    heading: 'Claim Open',
    body: 'Your claim is open and documents are being collected by your contractor.',
  },
  submitted: {
    emoji: '📬',
    heading: 'Estimate Submitted',
    body: 'Your contractor has submitted an estimate to your insurance adjuster for review.',
  },
  under_review: {
    emoji: '🔍',
    heading: 'Under Review',
    body: 'Your insurance adjuster is currently reviewing the estimate.',
  },
  changes_requested: {
    emoji: '📝',
    heading: 'Updates in Progress',
    body: 'Your contractor is updating the estimate. No action is needed from you right now.',
  },
  approved: {
    emoji: '✅',
    heading: 'Approved',
    body: 'Great news — your claim estimate has been approved! Your contractor will be in touch to schedule repairs.',
  },
  denied: {
    emoji: '❌',
    heading: 'Claim Denied',
    body: 'Your claim was not approved at this time. Your contractor will contact you with next steps.',
  },
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: 'Claim Status · ClaimFlow' }
}

export default async function HomeownerStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServiceClient()

  const { data: claim } = await supabase
    .from('claims')
    .select('*, contractor:profiles!contractor_id(*)')
    .eq('id', id)
    .single()

  if (!claim) notFound()

  const { data: activity } = await supabase
    .from('activity_log')
    .select('*')
    .eq('claim_id', id)
    .order('created_at', { ascending: false })
    .limit(5)

  const statusInfo = STATUS_MESSAGES[claim.status] || STATUS_MESSAGES.draft

  return (
    <div className="min-h-screen bg-[--bg] flex flex-col items-center justify-start p-4 pt-8">
      {/* Logo */}
      <div className="text-xl font-black text-amber-400 mb-6 tracking-tight">⚡ ClaimFlow</div>

      {/* Light-mode card — always light */}
      <div className="w-full max-w-sm bg-slate-50 rounded-2xl overflow-hidden shadow-xl" style={{ color: '#0f1117' }}>
        {/* Header */}
        <div className="bg-slate-900 px-5 pt-5 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">Homeowner Status</p>
          <h1 className="text-base font-black text-white leading-tight">{claim.property_address}</h1>
          <p className="text-xs text-slate-400 mt-1">
            {claim.claim_number ? `Claim #${claim.claim_number}` : claim.id.slice(0, 8).toUpperCase()} · {claim.insurance_company || 'Insurance Claim'}
          </p>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Status */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Current Status</p>
            <div className="text-2xl mb-1">{statusInfo.emoji}</div>
            <h2 className="text-lg font-black text-slate-900 mb-1">{statusInfo.heading}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{statusInfo.body}</p>
          </div>

          {/* Timeline */}
          {activity && activity.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Recent Updates</p>
              <div className="flex flex-col gap-2.5">
                {activity.map(item => (
                  <div key={item.id} className="flex gap-3 items-start">
                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap pt-0.5">
                      {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <p className="text-sm text-slate-700 leading-relaxed">{item.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contractor */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Your Contractor</p>
            <p className="text-base font-bold text-slate-900">{claim.contractor?.full_name || 'Your contractor'}</p>
            <p className="text-xs text-slate-500 mt-1">Contact them with any questions about your repair timeline.</p>
          </div>

          <p className="text-[10px] text-center text-slate-400">
            This page updates automatically. Last updated: {new Date(claim.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}
