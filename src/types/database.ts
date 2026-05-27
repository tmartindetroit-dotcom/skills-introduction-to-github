export type ClaimStatus = 'draft' | 'submitted' | 'under_review' | 'changes_requested' | 'approved' | 'denied'
export type UserRole = 'contractor' | 'adjuster' | 'admin'
export type DocType = 'estimate' | 'photo' | 'supplement' | 'invoice' | 'report' | 'other'
export type EstimateStatus = 'pending' | 'approved' | 'changes_requested' | 'denied'
export type SupplementStatus = 'pending' | 'approved' | 'denied'
export type DecisionType = 'approved' | 'changes_requested' | 'denied'

export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  org_id: string | null
  full_name: string
  email: string
  role: UserRole
  created_at: string
}

export interface Claim {
  id: string
  org_id: string
  title: string
  property_address: string
  homeowner_name: string
  homeowner_email: string | null
  homeowner_phone: string | null
  contractor_id: string
  adjuster_id: string | null
  status: ClaimStatus
  total_estimate: number
  approved_amount: number
  supplement_total: number
  description: string | null
  loss_date: string | null
  loss_type: string | null
  insurance_company: string | null
  policy_number: string | null
  claim_number: string | null
  created_at: string
  updated_at: string
  last_activity_at: string
  contractor?: Profile
  adjuster?: Profile
}

export interface Document {
  id: string
  claim_id: string
  uploaded_by: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  doc_type: DocType
  version: number
  notes: string | null
  created_at: string
  uploader?: Profile
}

export interface Estimate {
  id: string
  claim_id: string
  submitted_by: string
  version: number
  total_amount: number
  notes: string | null
  status: EstimateStatus
  created_at: string
  submitter?: Profile
  decisions?: EstimateDecision[]
}

export interface EstimateDecision {
  id: string
  estimate_id: string
  decided_by: string
  decision: DecisionType
  notes: string
  approved_amount: number | null
  created_at: string
  decider?: Profile
}

export interface Supplement {
  id: string
  claim_id: string
  requested_by: string
  line_item: string
  description: string
  amount: number
  justification: string
  status: SupplementStatus
  decided_by: string | null
  decision_notes: string | null
  decided_at: string | null
  created_at: string
  requester?: Profile
  decider?: Profile
}

export interface ActivityLog {
  id: string
  claim_id: string
  actor_id: string
  actor_role: UserRole
  action: string
  metadata: Record<string, unknown>
  created_at: string
  actor?: Profile
}

export interface Database {
  public: {
    Tables: {
      organizations: { Row: Organization; Insert: Omit<Organization, 'id' | 'created_at'>; Update: Partial<Organization> }
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at'>; Update: Partial<Profile> }
      claims: { Row: Claim; Insert: Omit<Claim, 'id' | 'created_at' | 'updated_at' | 'last_activity_at' | 'total_estimate' | 'approved_amount' | 'supplement_total'>; Update: Partial<Claim> }
      documents: { Row: Document; Insert: Omit<Document, 'id' | 'created_at' | 'version'>; Update: Partial<Document> }
      estimates: { Row: Estimate; Insert: Omit<Estimate, 'id' | 'created_at' | 'version'>; Update: Partial<Estimate> }
      estimate_decisions: { Row: EstimateDecision; Insert: Omit<EstimateDecision, 'id' | 'created_at'>; Update: Partial<EstimateDecision> }
      supplements: { Row: Supplement; Insert: Omit<Supplement, 'id' | 'created_at'>; Update: Partial<Supplement> }
      activity_log: { Row: ActivityLog; Insert: Omit<ActivityLog, 'id' | 'created_at'>; Update: never }
    }
  }
}
