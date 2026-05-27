import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'
import { sendSupplementRequestedEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || profile.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can request supplements' }, { status: 403 })
    }

    const { claimId, line_item, description, amount, justification } = await req.json()

    const { data: supplement, error } = await supabase
      .from('supplements')
      .insert({
        claim_id: claimId,
        requested_by: user.id,
        line_item,
        description: description || '',
        amount,
        justification,
        status: 'pending',
      })
      .select('*, requester:profiles!requested_by(*)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await logActivity(claimId, user.id, 'contractor',
      `Requested supplement — "${line_item}" ($${amount.toFixed(2)})`,
      { lineItem: line_item, amount }
    )

    // Email adjuster
    const { data: claim } = await supabase
      .from('claims')
      .select('*, adjuster:profiles!adjuster_id(*)')
      .eq('id', claimId)
      .single()

    if (claim?.adjuster) {
      await sendSupplementRequestedEmail({
        adjusterEmail: claim.adjuster.email,
        adjusterName: claim.adjuster.full_name,
        contractorName: profile.full_name,
        claimTitle: claim.title,
        claimId,
        lineItem: line_item,
        amount,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      })
    }

    return NextResponse.json(supplement)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
