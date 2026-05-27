import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClaimStatus } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatTimestamp(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const STATUS_CONFIG: Record<ClaimStatus, { label: string; color: string; dot: string; bg: string }> = {
  draft: {
    label: 'Draft',
    color: 'text-slate-400',
    dot: 'bg-slate-400',
    bg: 'bg-slate-400/10',
  },
  submitted: {
    label: 'Submitted',
    color: 'text-blue-400',
    dot: 'bg-blue-400',
    bg: 'bg-blue-400/10',
  },
  under_review: {
    label: 'Under Review',
    color: 'text-purple-400',
    dot: 'bg-purple-400',
    bg: 'bg-purple-400/10',
  },
  changes_requested: {
    label: 'Changes Requested',
    color: 'text-amber-400',
    dot: 'bg-amber-400',
    bg: 'bg-amber-400/10',
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-400',
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  denied: {
    label: 'Denied',
    color: 'text-red-400',
    dot: 'bg-red-400',
    bg: 'bg-red-400/10',
  },
}

export function getStatusConfig(status: ClaimStatus) {
  return STATUS_CONFIG[status]
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
