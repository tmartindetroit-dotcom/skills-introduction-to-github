-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Organizations
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id),
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('contractor', 'adjuster', 'admin')),
  created_at timestamptz default now()
);

-- Claims
create table claims (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) not null,
  title text not null,
  property_address text not null,
  homeowner_name text not null,
  homeowner_email text,
  homeowner_phone text,
  contractor_id uuid references profiles(id) not null,
  adjuster_id uuid references profiles(id),
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'denied'
  )),
  total_estimate numeric(12,2) default 0,
  approved_amount numeric(12,2) default 0,
  supplement_total numeric(12,2) default 0,
  description text,
  loss_date date,
  loss_type text,
  insurance_company text,
  policy_number text,
  claim_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_activity_at timestamptz default now()
);

-- Documents
create table documents (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid references claims(id) on delete cascade not null,
  uploaded_by uuid references profiles(id) not null,
  file_name text not null,
  file_path text not null,
  file_size integer,
  mime_type text,
  doc_type text not null check (doc_type in ('estimate', 'photo', 'supplement', 'invoice', 'report', 'other')),
  version integer default 1,
  notes text,
  created_at timestamptz default now()
);

-- Estimates
create table estimates (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid references claims(id) on delete cascade not null,
  submitted_by uuid references profiles(id) not null,
  version integer not null default 1,
  total_amount numeric(12,2) not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested', 'denied')),
  created_at timestamptz default now()
);

-- Estimate decisions
create table estimate_decisions (
  id uuid primary key default uuid_generate_v4(),
  estimate_id uuid references estimates(id) on delete cascade not null,
  decided_by uuid references profiles(id) not null,
  decision text not null check (decision in ('approved', 'changes_requested', 'denied')),
  notes text not null,
  approved_amount numeric(12,2),
  created_at timestamptz default now()
);

-- Supplements
create table supplements (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid references claims(id) on delete cascade not null,
  requested_by uuid references profiles(id) not null,
  line_item text not null,
  description text not null,
  amount numeric(12,2) not null,
  justification text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  decided_by uuid references profiles(id),
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz default now()
);

-- Activity log (immutable)
create table activity_log (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid references claims(id) on delete cascade not null,
  actor_id uuid references profiles(id) not null,
  actor_role text not null,
  action text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Claim invitations
create table claim_invitations (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid references claims(id) on delete cascade not null,
  invited_email text not null,
  invited_role text not null check (invited_role in ('adjuster', 'contractor')),
  invited_by uuid references profiles(id) not null,
  accepted_at timestamptz,
  created_at timestamptz default now()
);

-- RLS Policies
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table claims enable row level security;
alter table documents enable row level security;
alter table estimates enable row level security;
alter table estimate_decisions enable row level security;
alter table supplements enable row level security;
alter table activity_log enable row level security;
alter table claim_invitations enable row level security;

-- Profiles: users can read profiles in their org
create policy "profiles_select" on profiles for select
  using (auth.uid() = id or org_id in (
    select org_id from profiles where id = auth.uid()
  ));

create policy "profiles_insert" on profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update" on profiles for update
  using (auth.uid() = id);

-- Organizations: users can read their own org
create policy "orgs_select" on organizations for select
  using (id in (select org_id from profiles where id = auth.uid()));

create policy "orgs_insert" on organizations for insert
  with check (true);

-- Claims: accessible to org members + homeowner (public status page bypasses RLS via service role)
create policy "claims_select" on claims for select
  using (
    org_id in (select org_id from profiles where id = auth.uid())
    or contractor_id = auth.uid()
    or adjuster_id = auth.uid()
  );

create policy "claims_insert" on claims for insert
  with check (contractor_id = auth.uid());

create policy "claims_update" on claims for update
  using (
    org_id in (select org_id from profiles where id = auth.uid())
    or contractor_id = auth.uid()
    or adjuster_id = auth.uid()
  );

-- Documents
create policy "documents_select" on documents for select
  using (claim_id in (
    select id from claims where
      org_id in (select org_id from profiles where id = auth.uid())
      or contractor_id = auth.uid()
      or adjuster_id = auth.uid()
  ));

create policy "documents_insert" on documents for insert
  with check (uploaded_by = auth.uid());

-- Estimates
create policy "estimates_select" on estimates for select
  using (claim_id in (
    select id from claims where
      org_id in (select org_id from profiles where id = auth.uid())
      or contractor_id = auth.uid()
      or adjuster_id = auth.uid()
  ));

create policy "estimates_insert" on estimates for insert
  with check (submitted_by = auth.uid());

-- Estimate decisions
create policy "est_decisions_select" on estimate_decisions for select
  using (estimate_id in (
    select e.id from estimates e
    join claims c on c.id = e.claim_id
    where c.org_id in (select org_id from profiles where id = auth.uid())
      or c.contractor_id = auth.uid()
      or c.adjuster_id = auth.uid()
  ));

create policy "est_decisions_insert" on estimate_decisions for insert
  with check (decided_by = auth.uid());

-- Supplements
create policy "supplements_select" on supplements for select
  using (claim_id in (
    select id from claims where
      org_id in (select org_id from profiles where id = auth.uid())
      or contractor_id = auth.uid()
      or adjuster_id = auth.uid()
  ));

create policy "supplements_insert" on supplements for insert
  with check (requested_by = auth.uid());

create policy "supplements_update" on supplements for update
  using (claim_id in (
    select id from claims where adjuster_id = auth.uid()
  ));

-- Activity log
create policy "activity_select" on activity_log for select
  using (claim_id in (
    select id from claims where
      org_id in (select org_id from profiles where id = auth.uid())
      or contractor_id = auth.uid()
      or adjuster_id = auth.uid()
  ));

create policy "activity_insert" on activity_log for insert
  with check (actor_id = auth.uid());

-- Claim invitations
create policy "invitations_select" on claim_invitations for select
  using (
    invited_by = auth.uid()
    or invited_email = (select email from profiles where id = auth.uid())
  );

create policy "invitations_insert" on claim_invitations for insert
  with check (invited_by = auth.uid());

-- Storage bucket for documents
insert into storage.buckets (id, name, public) values ('claim-documents', 'claim-documents', false);

create policy "documents_storage_select" on storage.objects for select
  using (bucket_id = 'claim-documents' and auth.uid() is not null);

create policy "documents_storage_insert" on storage.objects for insert
  with check (bucket_id = 'claim-documents' and auth.uid() is not null);

-- Function to update claim updated_at and last_activity_at
create or replace function update_claim_timestamps()
returns trigger as $$
begin
  update claims set updated_at = now(), last_activity_at = now()
  where id = new.claim_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger activity_log_update_claim
  after insert on activity_log
  for each row execute function update_claim_timestamps();

-- Function to auto-version documents
create or replace function set_document_version()
returns trigger as $$
begin
  select coalesce(max(version), 0) + 1 into new.version
  from documents
  where claim_id = new.claim_id and doc_type = new.doc_type and file_name = new.file_name;
  return new;
end;
$$ language plpgsql;

create trigger document_version_trigger
  before insert on documents
  for each row execute function set_document_version();
