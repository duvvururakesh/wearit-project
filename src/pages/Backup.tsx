import { useRef, useState } from 'react'
import { useWardrobe } from '@/hooks/useWardrobe'

export default function Backup() {
  const { items, savedOutfits, exportBackup, importBackup } = useWardrobe()
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const downloadBackup = () => {
    const data = exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `wearit-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Backup downloaded.')
  }

  const handleImport = async (file: File) => {
    const text = await file.text()
    const parsed = JSON.parse(text) as Parameters<typeof importBackup>[0]
    await importBackup(parsed)
    setMessage('Backup restored.')
  }

  return (
    <div className="page-shell-workstation app-viewport app-viewport-scroll">
      <header className="page-header page-header-light">
        <div className="page-frame page-header-inner">
          <div className="page-header-copy">
            <p className="type-label text-light-secondary">Backup</p>
            <h1 className="type-h2 mt-3 text-text-dark">Local Data</h1>
            <p className="type-body-md mt-2 text-light-muted">Your wardrobe stays in this browser. Export backups regularly so you can restore it if storage is cleared.</p>
          </div>
        </div>
      </header>
      <div className="page-frame page-section">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="surface-panel-light p-4">
              <p className="type-label text-light-secondary">Closet</p>
              <p className="type-h2 mt-2 text-text-dark">{items.length}</p>
              <p className="type-caption mt-1 text-light-muted">items in your browser</p>
            </div>
            <div className="surface-panel-light p-4">
              <p className="type-label text-light-secondary">Looks</p>
              <p className="type-h2 mt-2 text-text-dark">{savedOutfits.length}</p>
              <p className="type-caption mt-1 text-light-muted">saved outfits</p>
            </div>
            <div className="surface-panel-light p-4">
              <p className="type-label text-light-secondary">Storage</p>
              <p className="type-body-sm mt-2 text-light-soft">Browser-local IndexedDB</p>
              <p className="type-body-sm mt-1 text-light-soft">No signup or cloud sync</p>
            </div>
          </div>

          <div className="surface-panel-light p-4">
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleImport(file)
                event.target.value = ''
              }}
            />
            <p className="type-label text-light-secondary">Backup & Restore</p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <p className="type-body-md text-text-dark">Export your closet to a JSON backup.</p>
                <p className="type-caption mt-1 text-light-muted">Restore that file later on this browser or another machine using the same app.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={downloadBackup} className="type-button-sm button-light">
                  Export Backup
                </button>
                <button type="button" onClick={() => fileRef.current?.click()} className="type-button-sm button-primary">
                  Import Backup
                </button>
              </div>
            </div>
            {message ? (
              <p className="type-caption mt-4 text-light-secondary">{message}</p>
            ) : null}
          </div>

          <div className="surface-panel-light p-4">
            <p className="type-label text-light-secondary">Recommendation</p>
            <p className="type-body-md mt-3 text-text-dark">Keep a backup file outside the browser.</p>
            <p className="type-caption mt-1 text-light-muted">The app is free and local-first now, but browser storage can still be lost if you clear site data or switch profiles.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
