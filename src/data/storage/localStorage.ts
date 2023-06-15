import { ZodTypeAny } from "zod"
import _ from "lodash"

function checkForLocalStorage() {
  try {
    localStorage.setItem("test", "test")
    localStorage.removeItem("test")
    return true
  } catch (e) {
    return false
  }
}

export const store = async <TData>({
  name,
  initial,
  _debug = undefined,
  ztype,
}: {
  name: string
  initial: Function
  _debug?: TData
  ztype: ZodTypeAny
}): Promise<{ get: () => TData; set: (data: TData, no_storage?: boolean) => void }> => {
  // if (_debug) return {_debug // for testing
  const store = checkForLocalStorage() ? localStorage.getItem(name) : null
  let s: TData = store ? JSON.parse(store) : await initial()
  if (!store) localStorage.setItem(name, JSON.stringify(s))
  if (s) {
    const s_check = ztype.safeParse(s)
    if (!s_check.success) {
      console.error(s_check.error)
      throw new Error("Store data does not match schema")
    }
    return {
      get: (): TData => s,
      set: async (data: TData, no_storage?: boolean) => {
        const updated_state = { ...s, ...data }
        const vstate = ztype.safeParse(updated_state)
        if (!vstate.success) {
          throw new Error("Store data does not match schema")
        }
        s = vstate.data
        if (no_storage) return
        if (checkForLocalStorage()) localStorage.setItem(name, JSON.stringify(s))
        return true
      },
    }
  } else throw new Error("Store not found")
}
