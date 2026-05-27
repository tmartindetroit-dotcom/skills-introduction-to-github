import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import { sendEstimateSubmittedEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const claimId = req.nextUrl.searchParams.get('claimId')
    if (!claimId) return NextResponse.json({ error: 'claimId required' }, { status: 400 })

    const { data } = await supabase
      .from('estimates')
      .select('*, submitter:profiles!submitted_by(*), decisions:estimate_decisions(*, decider:profiles!decided_by(*))')
      .eq('claim_id', claimId)
      .order('version', { ascending: false })

    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || profile.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can submit estimates' }, { status: 403 })
    }

    const { claimId, totalAmount, notes } = await req.json()

    // Get current version count
    const { count } = await supabase
      .from('estimates')
      .select('*', { count: 'exact', head: true })
      .eq('claim_id', claimId)

    const version = (count || 0) + 1

    const { data: estimate, error } = await supabase
      .from('estimates')
      .insert({
        claim_id: claimId,
        submitted_by: user.id,
        version,
        total_amount: totalAmount,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Update claim status and total
    await supabase
      .from('claims')
      .update({ status: 'submitted', total_estimate: totalAmount })
      .eq('id', claimId)

    await logActivity(claimId, user.id, 'contractor',
      `Submitted Estimate v${version} — $${totalAmount.toFixed(2)}${notes ? ` — "${notes}"` : ''}`,
      { version, totalAmount }
    )

    // Send email to adjuster
    const { data: claim } = await supabase
      .from('claims')
      .select('*, adjuster:profiles!adjuster_id(*), contractor:profiles!contractor_id(*)')
      .eq('id', claimId)
      .single()

    if (claim?.adjuster) {
      await sendEstimateSubmittedEmail({
        adjusterEmail: claim.adjuster.email,
        adjusterName: claim.adjuster.full_name,
        contractorName: profile.full_name,
        claimTitle: claim.title,
        claimId,
        totalAmount,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      })
    }

    return NextResponse.json(estimate)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
