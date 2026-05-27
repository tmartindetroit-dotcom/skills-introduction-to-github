import type { Claim, Profile } from '@/types/database'

interface Props {
  claim: Claim & { contractor?: Profile; adjuster?: Profile | null }
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-center bg-[--card] border border-[--bdr] rounded-xl px-4 py-3">
      <span className="text-xs font-bold uppercase tracking-widest text-[--muted]">{label}</span>
      <span className="text-sm font-semibold text-[--text] text-right max-w-[55%]">{value || '—'}</span>
    </div>
  )
}

export function OverviewTab({ claim }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <InfoRow label="Carrier" value={claim.insurance_company} />
      <InfoRow label="Policy #" value={claim.policy_number} />
      <InfoRow label="Claim #" value={claim.claim_number} />
      <InfoRow label="Loss Type" value={claim.loss_type} />
      <InfoRow label="Date of Loss" value={claim.loss_date} />
      <InfoRow label="Adjuster" value={claim.adjuster?.full_name || 'Not assigned'} />
      <InfoRow label="Contractor" value={claim.contractor?.full_name} />
      <InfoRow label="HO Email" value={claim.homeowner_email} />
      <InfoRow label="HO Phone" value={claim.homeowner_phone} />
      {claim.description && (
        <div className="bg-[--card] border border-[--bdr] rounded-xl px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted] mb-2">Description</p>
          <p className="text-sm text-[--text] leading-relaxed">{claim.description}</p>
        </div>
      )}
    </div>
  )
}
