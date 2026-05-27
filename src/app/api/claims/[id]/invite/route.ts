import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: claimId } = await params
    const { email } = await req.json()

    // Check if adjuster exists
    const { data: adjuster } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', email)
      .eq('role', 'adjuster')
      .single()

    if (adjuster) {
      await supabase.from('claims').update({ adjuster_id: adjuster.id }).eq('id', claimId)
      await logActivity(claimId, user.id, 'contractor', `Assigned adjuster ${email}`)
    } else {
      const { error } = await supabase.from('claim_invitations').insert({
        claim_id: claimId,
        invited_email: email,
        invited_role: 'adjuster',
        invited_by: user.id,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await logActivity(claimId, user.id, 'contractor', `Invited adjuster ${email}`)
    }

    return NextResponse.json({ success: true, assigned: !!adjuster })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
