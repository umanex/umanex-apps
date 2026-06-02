'use client'

import { useState } from 'react'
import type { ItemStatus } from '@/lib/db/schema'

const STATUS_OPTIONS: { value: ItemStatus; label: string; className: string }[] = [
  { value: 'new', label: 'Nieuw', className: 'text-muted-foreground' },
  { value: 'saved', label: 'Opgeslagen', className: 'text-blue-600 dark:text-blue-400' },
  { value: 'dismissed', label: 'Afgewezen', className: 'text-muted-foreground opacity-60' },
  { value: 'contacted', label: 'Gecontacteerd', className: 'text-green-600 dark:text-green-500' },
]

type Props = {
  itemId: number
  status: ItemStatus
  type: 'job' | 'lead'
  onStatusChange: (status: ItemStatus) => void
}

export function StatusDropdown({ itemId, status, type, onStatusChange }: Props) {
  const [pending, setPending] = useState(false)

  const current = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0]!

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as ItemStatus
    setPending(true)
    try {
      const endpoint = type === 'job' ? `/api/jobs/${itemId}` : `/api/leads/${itemId}`
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) onStatusChange(newStatus)
    } finally {
      setPending(false)
    }
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={pending}
      className={`cursor-pointer border-none bg-transparent text-xs outline-none disabled:opacity-50 ${current.className}`}
    >
      {STATUS_OPTIONS.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  )
}
