import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const claimId = formData.get('claimId') as string
    const docType = formData.get('docType') as string
    const notes = formData.get('notes') as string

    if (!file || !claimId || !docType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()
    const filePath = `${claimId}/${docType}/${Date.now()}_${file.name}`

    const { error: storageError } = await supabase.storage
      .from('claim-documents')
      .upload(filePath, file)

    if (storageError) {
      // If storage not configured, still create the document record
      console.warn('Storage upload failed:', storageError.message)
    }

    const { data: doc, error } = await supabase
      .from('documents')
      .insert({
        claim_id: claimId,
        uploaded_by: user.id,
        file_name: file.name,
        file_path: storageError ? filePath : filePath,
        file_size: file.size,
        mime_type: file.type,
        doc_type: docType as any,
        notes: notes || null,
      })
      .select('*, uploader:profiles!uploaded_by(*)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await logActivity(claimId, user.id, profile.role, `Uploaded ${file.name}`, { docType, fileName: file.name })

    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
