import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWardrobe } from '@/hooks/useWardrobe'
import { defaultAccountSettings, loadAccountSettings, saveAccountSettings } from '@/lib/accountSettings'
import type { AccountSettings, AppStartPage } from '@/types'

const START_PAGE_OPTIONS: Array<{ value: AppStartPage, label: string }> = [
  { value: '/', label: 'Home' },
  { value: '/closet', label: 'Closet' },
  { value: '/collection', label: 'Collection' },
  { value: '/builder', label: 'Outfit Builder' },
]

export default function Account() {
  const nav = useNavigate()
  const { items, savedOutfits } = useWardrobe()
  const [settings, setSettings] = useState<AccountSettings>(defaultAccountSettings)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setSettings(loadAccountSettings())
  }, [])

  const updateProfile = (field: keyof AccountSettings['profile'], value: string) => {
    setSettings((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value,
      },
    }))
  }

  const saveSettings = () => {
    const next: AccountSettings = {
      ...settings,
      profile: {
        ...settings.profile,
        displayName: settings.profile.displayName.trim() || defaultAccountSettings.profile.displayName,
        username: settings.profile.username.trim() || defaultAccountSettings.profile.username,
        email: settings.profile.email.trim(),
        location: settings.profile.location.trim(),
        bio: settings.profile.bio.trim(),
      },
      updatedAt: new Date().toISOString(),
    }
    setSettings(next)
    saveAccountSettings(next)
    setMessage('Account settings saved.')
  }

  return (
    <div className="page-shell-workstation app-viewport app-viewport-scroll">
      <header className="page-header page-header-light">
        <div className="page-frame page-header-inner">
          <div className="page-header-copy">
            <p className="type-label text-light-secondary">Account</p>
            <h1 className="type-h2 mt-3 text-text-dark">Profile & Settings</h1>
            <p className="type-body-md mt-2 text-light-muted">Manage your local profile, app preferences, and utility actions.</p>
          </div>
        </div>
      </header>

      <div className="page-frame page-section">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-12">
          <section className="surface-panel-light p-6 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h2 className="type-h4 text-text-dark">Profile</h2>
              <button type="button" className="type-button-sm button-primary" onClick={saveSettings}>
                Save
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="field-stack">
                <span className="type-label text-light-secondary">Display Name</span>
                <input
                  value={settings.profile.displayName}
                  onChange={(event) => updateProfile('displayName', event.target.value)}
                  className="field-input-light type-body-md"
                  placeholder="Display name"
                />
              </label>
              <label className="field-stack">
                <span className="type-label text-light-secondary">Username</span>
                <input
                  value={settings.profile.username}
                  onChange={(event) => updateProfile('username', event.target.value)}
                  className="field-input-light type-body-md"
                  placeholder="Username"
                />
              </label>
              <label className="field-stack">
                <span className="type-label text-light-secondary">Email</span>
                <input
                  value={settings.profile.email}
                  onChange={(event) => updateProfile('email', event.target.value)}
                  className="field-input-light type-body-md"
                  placeholder="name@email.com"
                />
              </label>
              <label className="field-stack">
                <span className="type-label text-light-secondary">Location</span>
                <input
                  value={settings.profile.location}
                  onChange={(event) => updateProfile('location', event.target.value)}
                  className="field-input-light type-body-md"
                  placeholder="City, Country"
                />
              </label>
            </div>
            <label className="field-stack mt-4">
              <span className="type-label text-light-secondary">Bio</span>
              <textarea
                value={settings.profile.bio}
                onChange={(event) => updateProfile('bio', event.target.value)}
                className="field-input-light type-body-md min-h-[96px]"
                placeholder="A short profile note"
              />
            </label>
            {message ? <p className="type-caption mt-3 text-light-secondary">{message}</p> : null}
          </section>

          <section className="surface-panel-light p-6 lg:col-span-5">
            <h2 className="type-h4 text-text-dark">Preferences</h2>
            <div className="mt-4 field-stack">
              <label className="field-stack">
                <span className="type-label text-light-secondary">Default Start Page</span>
                <select
                  value={settings.preferences.defaultStartPage}
                  onChange={(event) => {
                    const value = event.target.value as AppStartPage
                    setSettings((current) => ({
                      ...current,
                      preferences: { ...current.preferences, defaultStartPage: value },
                    }))
                  }}
                  className="field-input-light type-body-md"
                >
                  {START_PAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="field-stack">
                <span className="type-label text-light-secondary">Display</span>
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.preferences.compactMode}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setSettings((current) => ({
                        ...current,
                        preferences: { ...current.preferences, compactMode: checked },
                      }))
                    }}
                  />
                  <span className="type-body-md text-text-dark">Compact item spacing</span>
                </label>
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.preferences.reduceMotion}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setSettings((current) => ({
                        ...current,
                        preferences: { ...current.preferences, reduceMotion: checked },
                      }))
                    }}
                  />
                  <span className="type-body-md text-text-dark">Reduce motion effects</span>
                </label>
              </div>
            </div>
          </section>

          <section className="surface-panel-light p-6 lg:col-span-12">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="type-label text-light-secondary">Closet Items</p>
                <p className="type-h2 mt-2 text-text-dark">{items.length}</p>
              </div>
              <div>
                <p className="type-label text-light-secondary">Saved Looks</p>
                <p className="type-h2 mt-2 text-text-dark">{savedOutfits.length}</p>
              </div>
              <div className="flex items-end justify-start md:justify-end">
                <button type="button" className="type-button-sm button-light" onClick={() => nav('/backup')}>
                  Open Backup & Restore
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
