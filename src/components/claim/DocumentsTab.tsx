'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatTimestamp, formatFileSize } from '@/lib/utils'
import { Upload, FileText, Image, Plus, File } from 'lucide-react'
import type { Document, DocType } from '@/types/database'

const DOC_GROUPS: { type: DocType; label: string; icon: React.ReactNode }[] = [
  { type: 'estimate', label: 'Estimates', icon: <FileText size={14} /> },
  { type: 'photo', label: 'Photos', icon: <Image size={14} /> },
  { type: 'supplement', label: 'Supplements', icon: <Plus size={14} /> },
  { type: 'invoice', label: 'Invoices', icon: <FileText size={14} /> },
  { type: 'report', label: 'Reports', icon: <File size={14} /> },
  { type: 'other', label: 'Other', icon: <File size={14} /> },
]

interface Props {
  claimId: string
  documents: Document[]
  isContractor: boolean
}

export function DocumentsTab({ claimId, documents, isContractor }: Props) {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<DocType>('photo')
  const [notes, setNotes] = useState('')
  const [localDocs, setLocalDocs] = useState(documents)

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('claimId', claimId)
      formData.append('docType', docType)
      formData.append('notes', notes)

      const res = await fetch('/api/documents', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLocalDocs(prev => [data, ...prev])
      setOpen(false)
      setFile(null)
      setNotes('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {isContractor && (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="mb-4 gap-2">
          <Upload size={14} />
          Upload Document
        </Button>
      )}

      {DOC_GROUPS.map(({ type, label, icon }) => {
        const group = localDocs.filter(d => d.doc_type === type)
        if (!group.length) return null
        return (
          <div key={type} className="mb-5">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[--muted]">{icon}</span>
              <p className="text-xs font-bold uppercase tracking-widest text-[--muted]">{label}</p>
            </div>
            <div className="flex flex-col gap-2">
              {group.map(doc => (
                <div key={doc.id} className="bg-[--card] border border-[--bdr] rounded-xl px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-[--text]">{doc.file_name}</p>
                    <p className="text-xs text-[--muted] mt-0.5">
                      {doc.file_size ? formatFileSize(doc.file_size) : '—'}
                      {doc.version > 1 && <span className="ml-2 text-amber-400">v{doc.version}</span>}
                    </p>
                  </div>
                  <p className="text-xs font-mono text-[--muted] text-right">{formatTimestamp(doc.created_at).slice(0, 10)}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {localDocs.length === 0 && (
        <p className="text-center text-[--muted] text-sm py-10">No documents yet.</p>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Upload Document">
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Document Type</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value as DocType)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="photo">Photo</option>
              <option value="estimate">Estimate</option>
              <option value="supplement">Supplement</option>
              <option value="invoice">Invoice</option>
              <option value="report">Report</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">File *</label>
            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500 file:text-slate-900 file:text-xs file:font-bold"
            />
          </div>

          <Input
            label="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any notes about this file…"
          />

          <Button onClick={handleUpload} loading={uploading} disabled={!file} fullWidth>
            Upload Document
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
