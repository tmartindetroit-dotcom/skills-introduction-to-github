import type { Claim, ActivityLog, Profile } from '@/types/database'

const STATUS_MESSAGES: Record<string, string> = {
  draft: '📋 Your claim is open. Documents are being collected.',
  submitted: '📬 Your estimate has been submitted to your insurance adjuster.',
  under_review: '🔍 The adjuster is currently reviewing your estimate.',
  changes_requested: '📝 Your contractor is updating the estimate. No action needed from you.',
  approved: '✅ Approved! Your contractor will be in touch to schedule repairs.',
  denied: '❌ Your claim was denied. Your contractor will contact you with next steps.',
}

interface Props {
  claim: Claim & { contractor?: Profile }
  activity: ActivityLog[]
}

export function HomeownerTab({ claim, activity }: Props) {
  const statusMsg = STATUS_MESSAGES[claim.status] || ''

  return (
    <div>
      {/* Light-mode card — always light regardless of app theme */}
      <div className="bg-slate-50 rounded-2xl p-5" style={{ color: '#0f1117' }}>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
          ClaimFlow · Homeowner Update
        </div>
        <h2 className="text-lg font-black text-slate-900 leading-tight mb-1">{claim.property_address}</h2>
        <p className="text-xs text-slate-500 mb-5">
          {claim.claim_number ? `Claim #${claim.claim_number}` : claim.id.slice(0, 8).toUpperCase()} · {claim.insurance_company || 'Insurance Claim'}
        </p>

        {/* Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Current Status</p>
          <p className="text-base font-bold text-slate-900 leading-relaxed">{statusMsg}</p>
        </div>

        {/* Recent updates */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Recent Updates</p>
          {activity.slice(0, 5).map(item => (
            <div key={item.id} className="flex gap-3 mb-2 items-start">
              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap pt-0.5">
                {item.created_at.slice(5, 10)}
              </span>
              <p className="text-sm text-slate-600 leading-relaxed">{item.action}</p>
            </div>
          ))}
          {activity.length === 0 && (
            <p className="text-sm text-slate-400">No updates yet.</p>
          )}
        </div>

        {/* Contractor */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Your Contractor</p>
          <p className="text-base font-bold text-slate-900">{claim.contractor?.full_name || 'Your contractor'}</p>
          <p className="text-xs text-slate-500 mt-1">Contact them with questions about your repair.</p>
        </div>
      </div>

      {/* Public URL hint */}
      <div className="mt-4 bg-[--card] border border-[--bdr] rounded-xl p-4">
        <p className="text-xs text-[--muted] mb-1 font-bold uppercase tracking-wider">Public Status Link</p>
        <p className="text-xs text-amber-400 font-mono break-all">
          {typeof window !== 'undefined' ? window.location.origin : ''}/claim/{claim.id}/status
        </p>
        <p className="text-xs text-[--muted] mt-1">Share this with the homeowner — no login required.</p>
      </div>
    </div>
  )
}
