'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewClaimPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    property_address: '',
    homeowner_name: '',
    homeowner_email: '',
    homeowner_phone: '',
    insurance_company: '',
    policy_number: '',
    claim_number: '',
    loss_date: '',
    loss_type: '',
    description: '',
    adjuster_email: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create claim')
      router.push(`/claim/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create claim')
    } finally {
      setLoading(false)
    }
  }

  const LOSS_TYPES = ['Hail / Wind', 'Water Damage', 'Fire / Smoke', 'Flood', 'Theft', 'Other']

  return (
    <div className="max-w-lg mx-auto px-4 pt-safe pb-8">
      <div className="py-4 flex items-center gap-3">
        <Link href="/dashboard" className="w-8 h-8 rounded-full bg-[--card] border border-[--bdr] flex items-center justify-center text-[--dim]">
          <ChevronLeft size={18} />
        </Link>
        <h1 className="text-2xl font-black text-[--text]">New Claim</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="bg-[--card] border border-[--bdr] rounded-2xl p-4 flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">Property</p>
          <Input
            label="Property Address *"
            value={form.property_address}
            onChange={e => set('property_address', e.target.value)}
            placeholder="123 Main St, City ST 00000"
            required
          />
          <Input
            label="Homeowner Name *"
            value={form.homeowner_name}
            onChange={e => set('homeowner_name', e.target.value)}
            placeholder="Jane Smith"
            required
          />
          <Input
            label="Homeowner Email"
            type="email"
            value={form.homeowner_email}
            onChange={e => set('homeowner_email', e.target.value)}
            placeholder="jane@email.com"
          />
          <Input
            label="Homeowner Phone"
            type="tel"
            value={form.homeowner_phone}
            onChange={e => set('homeowner_phone', e.target.value)}
            placeholder="(555) 000-0000"
          />
        </div>

        <div className="bg-[--card] border border-[--bdr] rounded-2xl p-4 flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">Insurance</p>
          <Input
            label="Insurance Carrier *"
            value={form.insurance_company}
            onChange={e => set('insurance_company', e.target.value)}
            placeholder="State Farm"
            required
          />
          <Input
            label="Policy Number"
            value={form.policy_number}
            onChange={e => set('policy_number', e.target.value)}
            placeholder="SF-448821-B"
          />
          <Input
            label="Claim Number"
            value={form.claim_number}
            onChange={e => set('claim_number', e.target.value)}
            placeholder="CLM-2024-00001"
          />
        </div>

        <div className="bg-[--card] border border-[--bdr] rounded-2xl p-4 flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">Loss Details</p>
          <Input
            label="Date of Loss"
            type="date"
            value={form.loss_date}
            onChange={e => set('loss_date', e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Loss Type</label>
            <select
              value={form.loss_type}
              onChange={e => set('loss_type', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">Select loss type…</option>
              {LOSS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Brief description of the loss…"
            rows={3}
          />
        </div>

        <div className="bg-[--card] border border-[--bdr] rounded-2xl p-4 flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">Assign Adjuster</p>
          <Input
            label="Adjuster Email (optional)"
            type="email"
            value={form.adjuster_email}
            onChange={e => set('adjuster_email', e.target.value)}
            placeholder="adjuster@insurer.com"
            hint="They'll get an email invitation to this claim"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} fullWidth size="lg">
          Create Claim Workspace →
        </Button>
      </form>
    </div>
  )
}
