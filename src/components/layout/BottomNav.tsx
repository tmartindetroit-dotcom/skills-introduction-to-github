'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/dashboard/claims', label: 'Claims', icon: FileText },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 pb-safe">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-6 py-3 text-xs font-medium transition-colors',
                active ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              {label}
            </Link>
          )
        })}
        <Link
          href="/dashboard/claims/new"
          className="flex flex-col items-center gap-1 px-6 py-3 text-xs font-medium text-slate-500 hover:text-amber-400 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center -mt-5 shadow-lg shadow-amber-500/30">
            <Plus size={20} className="text-slate-900" />
          </div>
          <span className="mt-1">New</span>
        </Link>
      </div>
    </nav>
  )
}
