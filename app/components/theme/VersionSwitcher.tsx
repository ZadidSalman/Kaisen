'use client'
import { IThemeEntry } from '@/types/app.types'

interface VersionSwitcherProps {
  entries: IThemeEntry[]
  selected: IThemeEntry
  onSelect: (entry: IThemeEntry) => void
}

export function VersionSwitcher({ entries, selected, onSelect }: VersionSwitcherProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-body font-semibold text-ktext-tertiary uppercase tracking-wide">Versions</p>
      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <button
            key={entry.atEntryId}
            onClick={() => onSelect(entry)}
            className={`px-4 py-1.5 rounded-full text-xs font-body font-semibold border transition-all duration-200 interactive
              ${selected.atEntryId === entry.atEntryId
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-bg-elevated text-ktext-secondary border-border-default hover:border-accent-subtle'
              }`}
          >
            {entry.version}
          </button>
        ))}
      </div>
    </div>
  )
}
