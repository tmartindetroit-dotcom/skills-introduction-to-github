import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

export async function logActivity(
  claimId: string,
  actorId: string,
  actorRole: UserRole,
  action: string,
  metadata: Record<string, unknown> = {}
) {
  const supabase = await createClient()
  await supabase.from('activity_log').insert({
    claim_id: claimId,
    actor_id: actorId,
    actor_role: actorRole,
    action,
    metadata,
  })
}
