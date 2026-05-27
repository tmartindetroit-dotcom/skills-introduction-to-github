import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || profile.role !== 'adjuster') {
      return NextResponse.json({ error: 'Only adjusters can decide on supplements' }, { status: 403 })
    }

    const { id: suppId } = await params
    const { decision, notes } = await req.json()

    if (!notes?.trim()) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 })
    }

    const { data: supp } = await supabase.from('supplements').select('*').eq('id', suppId).single()
    if (!supp) return NextResponse.json({ error: 'Supplement not found' }, { status: 404 })

    const { data: updated, error } = await supabase
      .from('supplements')
      .update({
        status: decision,
        decided_by: user.id,
        decision_notes: notes,
        decided_at: new Date().toISOString(),
      })
      .eq('id', suppId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // If approved, add to supplement total
    if (decision === 'approved') {
      const { data: claim } = await supabase.from('claims').select('supplement_total').eq('id', supp.claim_id).single()
      await supabase
        .from('claims')
        .update({ supplement_total: (claim?.supplement_total || 0) + supp.amount })
        .eq('id', supp.claim_id)
    }

    const decisionLabel = decision === 'approved' ? 'Approved' : 'Denied'
    await logActivity(supp.claim_id, user.id, 'adjuster',
      `${decisionLabel} supplement "${supp.line_item}" — "${notes}"`,
      { suppId, decision }
    )

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
