'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import type { Claim, Profile } from '@/types/database'

interface Props {
  claim: Claim
  profile: Profile
  isContractor: boolean
  isAdjuster: boolean
}

export function ClaimActions({ claim, profile, isContractor, isAdjuster }: Props) {
  const router = useRouter()

  const canSubmitEstimate = isContractor && ['draft', 'changes_requested'].includes(claim.status)
  const canApprove = isAdjuster && ['submitted', 'under_review'].includes(claim.status)

  const [sheetOpen, setSheetOpen] = useState<'estimate' | 'approve' | 'invite' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Estimate form
  const [estAmount, setEstAmount] = useState('')
  const [estNotes, setEstNotes] = useState('')

  // Approve form
  const [decision, setDecision] = useState<'approved' | 'changes_requested' | 'denied'>('approved')
  const [approvedAmt, setApprovedAmt] = useState('')
  const [decisionNotes, setDecisionNotes] = useState('')

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')

  async function handleEstimate() {
    if (!estAmount) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: claim.id,
          totalAmount: parseFloat(estAmount),
          notes: estNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSheetOpen(null)
      setEstAmount('')
      setEstNotes('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit estimate')
    } finally {
      setLoading(false)
    }
  }

  async function handleDecision() {
    if (!decisionNotes.trim()) { setError('Notes are required'); return }
    setLoading(true)
    setError('')
    try {
      const latestEstimate = await fetch(`/api/estimates?claimId=${claim.id}`).then(r => r.json())
      if (!latestEstimate?.[0]?.id) throw new Error('No estimate found')

      const res = await fetch(`/api/estimates/${latestEstimate[0].id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          notes: decisionNotes,
          approvedAmount: approvedAmt ? parseFloat(approvedAmt) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSheetOpen(null)
      setDecisionNotes('')
      setApprovedAmt('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record decision')
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/claims/${claim.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSheetOpen(null)
      setInviteEmail('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite adjuster')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex gap-2 mt-3 flex-wrap">
        {isContractor && !claim.adjuster_id && (
          <button
            onClick={() => { setError(''); setSheetOpen('invite') }}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[--bdr] text-xs font-bold text-[--dim] hover:border-[--bdrhi] transition-colors"
          >
            + Invite Adjuster
          </button>
        )}
        {canSubmitEstimate && (
          <button
            onClick={() => { setError(''); setSheetOpen('estimate') }}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-900 text-xs font-bold"
          >
            Submit Estimate
          </button>
        )}
        {canApprove && (
          <button
            onClick={() => { setError(''); setSheetOpen('approve') }}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-900 text-xs font-bold"
          >
            Record Decision
          </button>
        )}
      </div>

      {/* Estimate sheet */}
      <BottomSheet open={sheetOpen === 'estimate'} onClose={() => setSheetOpen(null)} title="Submit Estimate">
        <div className="flex flex-col gap-4 py-4">
          <Input
            label="Total Amount ($) *"
            type="number"
            value={estAmount}
            onChange={e => setEstAmount(e.target.value)}
            placeholder="e.g. 21200"
          />
          <Textarea
            label="Notes to Adjuster"
            value={estNotes}
            onChange={e => setEstNotes(e.target.value)}
            placeholder="Any context for this submission…"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button onClick={handleEstimate} loading={loading} fullWidth size="lg">
            Submit Estimate
          </Button>
        </div>
      </BottomSheet>

      {/* Approve/Decide sheet */}
      <BottomSheet open={sheetOpen === 'approve'} onClose={() => setSheetOpen(null)} title="Record Decision">
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Decision</label>
            <select
              value={decision}
              onChange={e => setDecision(e.target.value as typeof decision)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="approved">✓ Approve</option>
              <option value="changes_requested">↩ Request Changes</option>
              <option value="denied">✕ Deny</option>
            </select>
          </div>
          {decision === 'approved' && (
            <Input
              label="Approved Amount ($)"
              type="number"
              value={approvedAmt}
              onChange={e => setApprovedAmt(e.target.value)}
              placeholder={`${claim.total_estimate}`}
              hint="Leave blank to use the full estimate amount"
            />
          )}
          <Textarea
            label="Notes * (required)"
            value={decisionNotes}
            onChange={e => setDecisionNotes(e.target.value)}
            placeholder="Reason for this decision…"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button
            onClick={handleDecision}
            loading={loading}
            fullWidth
            size="lg"
            className={cn(
              decision === 'approved' && 'bg-emerald-500 hover:bg-emerald-400 text-slate-900',
              decision === 'denied' && 'bg-red-500/20 text-red-400 border border-red-500/30',
              decision === 'changes_requested' && 'bg-amber-500 text-slate-900'
            )}
          >
            Confirm Decision
          </Button>
        </div>
      </BottomSheet>

      {/* Invite adjuster sheet */}
      <BottomSheet open={sheetOpen === 'invite'} onClose={() => setSheetOpen(null)} title="Invite Adjuster">
        <div className="flex flex-col gap-4 py-4">
          <Input
            label="Adjuster Email *"
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="adjuster@insurer.com"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button onClick={handleInvite} loading={loading} fullWidth size="lg">
            Send Invitation
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}
