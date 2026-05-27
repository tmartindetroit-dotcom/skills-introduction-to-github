import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, role, orgName, orgAction } = await req.json()

    const supabase = await createClient()
    const adminClient = await createServiceClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
    if (!authData.user) return NextResponse.json({ error: 'Signup failed' }, { status: 400 })

    let orgId: string

    if (orgAction === 'create') {
      const { data: org, error: orgError } = await adminClient
        .from('organizations')
        .insert({ name: orgName })
        .select()
        .single()
      if (orgError) return NextResponse.json({ error: orgError.message }, { status: 400 })
      orgId = org.id
    } else {
      const { data: org, error: orgError } = await adminClient
        .from('organizations')
        .select('id')
        .ilike('name', orgName)
        .single()
      if (orgError) return NextResponse.json({ error: `Organization "${orgName}" not found` }, { status: 400 })
      orgId = org.id
    }

    // Create profile using service role to bypass RLS on insert
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: authData.user.id,
        org_id: orgId,
        full_name: fullName,
        email,
        role,
      })
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
