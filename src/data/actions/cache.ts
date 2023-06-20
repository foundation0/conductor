import { set as Set, get as Get, createStore } from 'idb-keyval';

const Cache = createStore('cache', 'cache')

export async function set({ key, value }: { key: string; value: any }) {
  const val = {
    created_at: new Date().toISOString(),
    value,
  }
  return Set(key, val, Cache)
}

export async function get(key: string) {
  const val = await Get(key, Cache)
  if(!val) return null
  return val.value
}
