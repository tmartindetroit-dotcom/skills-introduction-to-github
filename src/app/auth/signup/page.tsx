'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

type Step = 'details' | 'role' | 'org'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('details')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'contractor' | 'adjuster'>('contractor')
  const [orgName, setOrgName] = useState('')
  const [orgAction, setOrgAction] = useState<'create' | 'join'>('create')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 'details') { setStep('role'); return }
    if (step === 'role') { setStep('org'); return }

    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, role, orgName, orgAction }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signup failed')
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-amber-400 mb-1 tracking-tight">⚡ ClaimFlow</div>
          <p className="text-slate-400 text-sm">Create your account</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-700/50 p-6">
          {/* Step indicator */}
          <div className="flex gap-1.5 mb-6">
            {(['details', 'role', 'org'] as Step[]).map((s, i) => (
              <div key={s} className={cn('h-1 flex-1 rounded-full transition-colors', step === s || (i < ['details', 'role', 'org'].indexOf(step)) ? 'bg-amber-500' : 'bg-slate-700')} />
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {step === 'details' && (
              <>
                <h2 className="text-lg font-semibold text-slate-100">Your details</h2>
                <Input label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" required />
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" required />
                <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8+ characters" minLength={8} required />
              </>
            )}

            {step === 'role' && (
              <>
                <h2 className="text-lg font-semibold text-slate-100">Your role</h2>
                <p className="text-sm text-slate-400">How will you use ClaimFlow?</p>
                <div className="flex flex-col gap-3">
                  {(['contractor', 'adjuster'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        'flex flex-col items-start p-4 rounded-xl border text-left transition-colors',
                        role === r ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 hover:border-slate-500'
                      )}
                    >
                      <span className="font-medium text-slate-100 capitalize">{r}</span>
                      <span className="text-xs text-slate-400 mt-1">
                        {r === 'contractor' ? 'Submit estimates, upload docs, request supplements' : 'Review claims, approve estimates, manage queue'}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 'org' && (
              <>
                <h2 className="text-lg font-semibold text-slate-100">Organization</h2>
                <div className="flex gap-2">
                  {(['create', 'join'] as const).map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setOrgAction(a)}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-colors',
                        orgAction === a ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-700 text-slate-400'
                      )}
                    >
                      {a === 'create' ? 'Create new' : 'Join existing'}
                    </button>
                  ))}
                </div>
                <Input
                  label={orgAction === 'create' ? 'Company name' : 'Organization name (ask your admin)'}
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder={orgAction === 'create' ? 'Acme Roofing Inc.' : 'Org name to find'}
                  required
                />
              </>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} fullWidth size="lg">
              {step === 'org' ? 'Create account' : 'Continue →'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-amber-400 hover:text-amber-300">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
