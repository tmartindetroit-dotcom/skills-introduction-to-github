import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import { sendDecisionEmail } from '@/lib/email'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || profile.role !== 'adjuster') {
      return NextResponse.json({ error: 'Only adjusters can record decisions' }, { status: 403 })
    }

    const { id: estimateId } = await params
    const { decision, notes, approvedAmount } = await req.json()

    if (!notes?.trim()) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 })
    }

    const { data: estimate } = await supabase
      .from('estimates')
      .select('*')
      .eq('id', estimateId)
      .single()

    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

    // Record decision (immutable)
    const { data: decisionRecord, error } = await supabase
      .from('estimate_decisions')
      .insert({
        estimate_id: estimateId,
        decided_by: user.id,
        decision,
        notes,
        approved_amount: decision === 'approved' ? (approvedAmount || estimate.total_amount) : null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Update estimate status
    await supabase.from('estimates').update({ status: decision }).eq('id', estimateId)

    // Update claim status
    const claimUpdate: Record<string, unknown> = { status: decision }
    if (decision === 'approved') {
      claimUpdate.approved_amount = approvedAmount || estimate.total_amount
    }
    await supabase.from('claims').update(claimUpdate).eq('id', estimate.claim_id)

    const decisionLabels: Record<string, string> = { approved: 'Approved', changes_requested: 'Requested changes', denied: 'Denied' }
    const decisionLabel = decisionLabels[decision] || decision

    await logActivity(estimate.claim_id, user.id, 'adjuster',
      `${decisionLabel} — "${notes}"`,
      { decision, estimateId, approvedAmount }
    )

    // Send email to contractor
    const { data: claim } = await supabase
      .from('claims')
      .select('*, contractor:profiles!contractor_id(*)')
      .eq('id', estimate.claim_id)
      .single()

    if (claim?.contractor) {
      await sendDecisionEmail({
        contractorEmail: claim.contractor.email,
        contractorName: claim.contractor.full_name,
        adjusterName: profile.full_name,
        claimTitle: claim.title,
        claimId: estimate.claim_id,
        decision,
        notes,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      })
    }

    return NextResponse.json(decisionRecord)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
