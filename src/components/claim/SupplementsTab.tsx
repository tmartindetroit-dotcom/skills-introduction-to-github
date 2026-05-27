'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { formatCurrency, formatTimestamp } from '@/lib/utils'
import type { Supplement, ClaimStatus } from '@/types/database'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

interface Props {
  claimId: string
  supplements: Supplement[]
  isContractor: boolean
  isAdjuster: boolean
  claimStatus: ClaimStatus
}

export function SupplementsTab({ claimId, supplements, isContractor, isAdjuster, claimStatus }: Props) {
  const [openRequest, setOpenRequest] = useState(false)
  const [openDecide, setOpenDecide] = useState<string | null>(null)
  const [localSupps, setLocalSupps] = useState(supplements)
  const [loading, setLoading] = useState(false)
  const [decisionNotes, setDecisionNotes] = useState('')

  const [form, setForm] = useState({ line_item: '', amount: '', justification: '', description: '' })

  const canRequest = isContractor && ['approved', 'changes_requested', 'submitted'].includes(claimStatus)

  async function handleRequest() {
    if (!form.line_item || !form.amount) return
    setLoading(true)
    try {
      const res = await fetch('/api/supplements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, ...form, amount: parseFloat(form.amount) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLocalSupps(prev => [data, ...prev])
      setOpenRequest(false)
      setForm({ line_item: '', amount: '', justification: '', description: '' })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to request supplement')
    } finally {
      setLoading(false)
    }
  }

  async function handleDecision(suppId: string, decision: 'approved' | 'denied') {
    if (!decisionNotes.trim()) { alert('Notes are required'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/supplements/${suppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: decisionNotes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLocalSupps(prev => prev.map(s => s.id === suppId ? { ...s, status: decision, decision_notes: decisionNotes } : s))
      setOpenDecide(null)
      setDecisionNotes('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record decision')
    } finally {
      setLoading(false)
    }
  }

  const pendingSupps = localSupps.filter(s => s.status === 'pending')
  const decidedSupps = localSupps.filter(s => s.status !== 'pending')

  return (
    <div>
      {canRequest && (
        <Button variant="secondary" size="sm" onClick={() => setOpenRequest(true)} className="mb-4">
          + Request Supplement
        </Button>
      )}

      {pendingSupps.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted] mb-2">Pending</p>
          {pendingSupps.map(s => (
            <SupplementCard
              key={s.id}
              supp={s}
              isAdjuster={isAdjuster}
              onDecide={() => setOpenDecide(s.id)}
            />
          ))}
        </div>
      )}

      {decidedSupps.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted] mb-2">Decided</p>
          {decidedSupps.map(s => <SupplementCard key={s.id} supp={s} isAdjuster={false} />)}
        </div>
      )}

      {localSupps.length === 0 && (
        <p className="text-center text-[--muted] text-sm py-10">No supplements yet.</p>
      )}

      {/* Request sheet */}
      <BottomSheet open={openRequest} onClose={() => setOpenRequest(false)} title="Request Supplement">
        <div className="flex flex-col gap-4 py-4">
          <Input
            label="Line Item *"
            value={form.line_item}
            onChange={e => setForm(f => ({ ...f, line_item: e.target.value }))}
            placeholder="e.g. Full gutter replacement"
          />
          <Input
            label="Amount ($) *"
            type="number"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="e.g. 2800"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Details about this line item…"
          />
          <Textarea
            label="Justification *"
            value={form.justification}
            onChange={e => setForm(f => ({ ...f, justification: e.target.value }))}
            placeholder="Why was this item missed or added?"
          />
          <Button onClick={handleRequest} loading={loading} fullWidth>
            Submit Supplement Request
          </Button>
        </div>
      </BottomSheet>

      {/* Decision sheet */}
      {openDecide && (
        <BottomSheet open={true} onClose={() => setOpenDecide(null)} title="Supplement Decision">
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-[--dim]">
              {localSupps.find(s => s.id === openDecide)?.line_item}
              <span className="ml-2 text-amber-400 font-mono font-bold">
                {formatCurrency(localSupps.find(s => s.id === openDecide)?.amount || 0)}
              </span>
            </p>
            <Textarea
              label="Notes * (required)"
              value={decisionNotes}
              onChange={e => setDecisionNotes(e.target.value)}
              placeholder="Reason for this decision…"
            />
            <div className="flex gap-3">
              <Button
                variant="danger"
                fullWidth
                loading={loading}
                onClick={() => handleDecision(openDecide, 'denied')}
              >
                Deny
              </Button>
              <Button
                fullWidth
                loading={loading}
                onClick={() => handleDecision(openDecide, 'approved')}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900"
              >
                Approve
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}

function SupplementCard({
  supp,
  isAdjuster,
  onDecide,
}: {
  supp: Supplement
  isAdjuster: boolean
  onDecide?: () => void
}) {
  const statusConfig = {
    pending: { icon: <Clock size={14} className="text-amber-400" />, color: 'text-amber-400' },
    approved: { icon: <CheckCircle size={14} className="text-emerald-400" />, color: 'text-emerald-400' },
    denied: { icon: <XCircle size={14} className="text-red-400" />, color: 'text-red-400' },
  }[supp.status]

  return (
    <div className="bg-[--card] border border-[--bdr] rounded-[14px] p-4 mb-3">
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-bold text-[--text] flex-1 mr-2">{supp.line_item}</p>
        <div className="flex items-center gap-1.5">{statusConfig.icon}<span className={`text-xs font-bold capitalize ${statusConfig.color}`}>{supp.status}</span></div>
      </div>
      {supp.description && <p className="text-xs text-[--dim] mb-2">{supp.description}</p>}
      {supp.justification && <p className="text-xs text-[--muted] mb-2 italic">&ldquo;{supp.justification}&rdquo;</p>}
      <p className="text-lg font-black text-amber-400 font-mono">{formatCurrency(supp.amount)}</p>
      {supp.decision_notes && (
        <p className="text-xs text-[--muted] mt-2 bg-[--bg] rounded-lg px-3 py-2">{supp.decision_notes}</p>
      )}
      {isAdjuster && supp.status === 'pending' && onDecide && (
        <Button variant="secondary" size="sm" onClick={onDecide} className="mt-3 w-full">
          Record Decision
        </Button>
      )}
    </div>
  )
}
