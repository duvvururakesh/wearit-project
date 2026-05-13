import type { AccountSettings } from '@/types'

const ACCOUNT_SETTINGS_KEY = 'wearit-account-settings-v1'

export const defaultAccountSettings: AccountSettings = {
  profile: {
    displayName: 'Wearit User',
    username: 'wearit-user',
    email: '',
    location: '',
    bio: '',
  },
  preferences: {
    defaultStartPage: '/',
    compactMode: false,
    reduceMotion: false,
  },
  updatedAt: new Date(0).toISOString(),
}

export function loadAccountSettings(): AccountSettings {
  if (typeof window === 'undefined') return defaultAccountSettings

  try {
    const raw = window.localStorage.getItem(ACCOUNT_SETTINGS_KEY)
    if (!raw) return defaultAccountSettings
    const parsed = JSON.parse(raw) as Partial<AccountSettings>
    return {
      profile: {
        displayName: parsed.profile?.displayName?.trim() || defaultAccountSettings.profile.displayName,
        username: parsed.profile?.username?.trim() || defaultAccountSettings.profile.username,
        email: parsed.profile?.email?.trim() || '',
        location: parsed.profile?.location?.trim() || '',
        bio: parsed.profile?.bio || '',
      },
      preferences: {
        defaultStartPage: parsed.preferences?.defaultStartPage || defaultAccountSettings.preferences.defaultStartPage,
        compactMode: parsed.preferences?.compactMode ?? defaultAccountSettings.preferences.compactMode,
        reduceMotion: parsed.preferences?.reduceMotion ?? defaultAccountSettings.preferences.reduceMotion,
      },
      updatedAt: parsed.updatedAt || defaultAccountSettings.updatedAt,
    }
  } catch {
    return defaultAccountSettings
  }
}

export function saveAccountSettings(settings: AccountSettings) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACCOUNT_SETTINGS_KEY, JSON.stringify(settings))
}
