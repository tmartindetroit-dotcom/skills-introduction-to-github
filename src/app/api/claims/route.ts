import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'contractor') {
      return NextResponse.json({ error: 'Only contractors can create claims' }, { status: 403 })
    }

    const body = await req.json()
    const {
      property_address, homeowner_name, homeowner_email, homeowner_phone,
      insurance_company, policy_number, claim_number, loss_date, loss_type,
      description, adjuster_email,
    } = body

    const title = `${homeowner_name} - ${property_address.split(',')[0]}`

    const { data: claim, error } = await supabase
      .from('claims')
      .insert({
        org_id: profile.org_id!,
        title,
        property_address,
        homeowner_name,
        homeowner_email: homeowner_email || null,
        homeowner_phone: homeowner_phone || null,
        contractor_id: user.id,
        insurance_company: insurance_company || null,
        policy_number: policy_number || null,
        claim_number: claim_number || null,
        loss_date: loss_date || null,
        loss_type: loss_type || null,
        description: description || null,
        status: 'draft',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await logActivity(claim.id, user.id, 'contractor', 'Created claim workspace', { title })

    // Invite adjuster if email provided
    if (adjuster_email) {
      const { data: adjuster } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', adjuster_email)
        .eq('role', 'adjuster')
        .single()

      if (adjuster) {
        await supabase.from('claims').update({ adjuster_id: adjuster.id }).eq('id', claim.id)
        await logActivity(claim.id, user.id, 'contractor', `Assigned adjuster ${adjuster_email}`)
      } else {
        await supabase.from('claim_invitations').insert({
          claim_id: claim.id,
          invited_email: adjuster_email,
          invited_role: 'adjuster',
          invited_by: user.id,
        })
      }
    }

    return NextResponse.json({ id: claim.id })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
