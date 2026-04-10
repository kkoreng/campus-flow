'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => string[]
  placeholder?: string
}

export default function SearchSelect({ value, onChange, onSearch, placeholder }: Props) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync external value changes
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleInput(q: string) {
    setQuery(q)
    onChange(q) // allow freeform too
    const found = onSearch(q)
    setResults(found)
    setOpen(found.length > 0)
    setHighlighted(0)
  }

  function select(item: string) {
    setQuery(item)
    onChange(item)
    setOpen(false)
    setResults([])
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[highlighted]) select(results[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => {
          const found = onSearch(query)
          if (found.length > 0) { setResults(found); setOpen(true) }
        }}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {results.map((item, i) => (
            <li
              key={item}
              onMouseDown={() => select(item)}
              onMouseEnter={() => setHighlighted(i)}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                i === highlighted
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
