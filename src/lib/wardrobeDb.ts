import type { WardrobeItem } from '@/types'

const DB_NAME = 'wearit-db'
const DB_VERSION = 1
const STORE_NAME = 'app'
const ITEMS_KEY = 'wardrobe-items'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadWardrobeItems(): Promise<WardrobeItem[] | null> {
  if (typeof indexedDB === 'undefined') return null

  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(ITEMS_KEY)

    request.onsuccess = () => resolve((request.result as WardrobeItem[] | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function saveWardrobeItems(items: WardrobeItem[]) {
  if (typeof indexedDB === 'undefined') return

  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(items, ITEMS_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
