import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useWardrobe } from '@/hooks/useWardrobe'

const NAV_LINKS = [
  { path: '/', label: 'Home' },
  { path: '/closet', label: 'Closet' },
  { path: '/builder', label: 'Outfit Builder' },
]

export default function TopNav() {
  const nav = useNavigate()
  const location = useLocation()
  const { items } = useWardrobe()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchNames = items.slice(0, 10).map((item) => item.name)
  const searchLines = searchNames.length > 0 ? [...searchNames, searchNames[0]] : ['Search your closet']
  const [searchIndex, setSearchIndex] = useState(0)

  useEffect(() => {
    if (desktopSearchOpen || searchNames.length <= 1) return

    const timer = window.setInterval(() => {
      setSearchIndex((current) => {
        const next = current + 1
        return next >= searchNames.length ? 0 : next
      })
    }, 1800)

    return () => window.clearInterval(timer)
  }, [desktopSearchOpen, searchNames.length])

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return

    nav(`/closet?q=${encodeURIComponent(query.trim())}`)
    setMobileSearchOpen(false)
    setDesktopSearchOpen(false)
    setQuery('')
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-[var(--color-overlay-soft)] backdrop-blur-xl">
      {mobileSearchOpen && (
        <div className="absolute inset-0 z-50 flex h-14 items-center bg-bg md:hidden">
          <form onSubmit={handleSearch} className="flex w-full items-center gap-3">
            <div className="page-frame flex w-full items-center gap-3">
              <div className="nav-search-shell">
                <Search size={16} className="flex-shrink-0 text-text-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search the closet..."
                  className="type-body-md nav-search-input"
                  aria-label="Search the closet"
                />
                <button
                  type="button"
                  onClick={() => { setMobileSearchOpen(false); setQuery('') }}
                  className="button-icon"
                  aria-label="Close search"
                >
                  <X size={16} className="text-text-muted hover:text-text-primary" />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="page-frame grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            {desktopSearchOpen ? (
              <form onSubmit={handleSearch}>
                <div className="nav-search-shell">
                  <Search size={16} className="flex-shrink-0 text-text-muted" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search the closet..."
                    className="type-body-md nav-search-input"
                    aria-label="Search the closet"
                  />
                  <button
                    type="button"
                    onClick={() => { setDesktopSearchOpen(false); setQuery('') }}
                    className="button-icon"
                    aria-label="Close search"
                  >
                    <X size={16} className="text-text-muted hover:text-text-primary" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => { setDesktopSearchOpen(true); setQuery('') }}
                className="nav-search-shell button-ghost text-left"
                aria-label="Open search"
              >
                <span className="type-button-sm text-text-secondary">Search</span>
                <div className="flex h-8 flex-1 items-center overflow-hidden">
                  <div
                    className="w-full transition-transform duration-500 ease-out"
                    style={{ transform: `translateY(-${searchIndex * 2}rem)` }}
                  >
                    {searchLines.map((name, index) => (
                      <div key={`${name}-${index}`} className="type-caption flex h-8 w-full items-center text-left text-text-muted">
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            )}
          </div>
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="type-button-sm button-ghost text-text-secondary md:hidden"
            aria-label="Open search"
          >
            Search
          </button>
        </div>

        <div className="flex items-center justify-center">
          <button onClick={() => nav('/')} className="type-h4 tracking-[0.32em] text-text-primary">
            WEARIT
          </button>
        </div>

        <div className="flex items-center justify-end gap-8">
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map(({ path, label }) => {
              const active = location.pathname === path || (path === '/closet' && location.pathname === '/item')

              return (
                <button
                  key={path}
                  onClick={() => nav(path)}
                  className={`type-button-sm nav-link ${active ? 'is-active' : ''}`}
                >
                  {label}
                </button>
              )
            })}
          </nav>
          <button
            onClick={() => nav('/looks')}
            className="type-button-sm nav-link"
          >
            Saved Looks
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--color-border-light)] md:hidden">
        <div className="flex h-10 items-center justify-around px-4">
          {NAV_LINKS.map(({ path, label }) => {
            const active = location.pathname === path || (path === '/closet' && location.pathname === '/item')
            return (
              <button
                key={path}
                onClick={() => nav(path)}
                className={`type-button-sm nav-mobile-link ${active ? 'is-active' : ''}`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
