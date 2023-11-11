import { initLoaders } from "@/data/loaders"
import { DataS, DataT } from "@/data/schemas/data"
import _ from "lodash"
import { emit, listen } from "@/libraries/events"
import { error } from "@/libraries/logging"
import { buf2hex, createHash } from "@/security/common"
import b4a from "b4a"

const API: { [key: string]: Function } = {
  getStore: async ({ id }: { id: string }) => {
    const { DataState } = await initLoaders()
    return await DataState({ id })
  },
  add: async (data: Omit<DataT, "id">) => {
    // compute hash on the data and use that as the id
    let content = data?.data?.content
    // if content is ArrayBuffer, convert to Uint8Array
    if (content instanceof ArrayBuffer) content = new Uint8Array(content)
    if (!b4a.isBuffer(content)) content = JSON.stringify(content)
    const id = buf2hex({ input: await createHash({ str: content }) })

    const { DataState } = await initLoaders()
    const store = await DataState({ id })

    // if storage exists, abort and return the id
    const existing_store = await store.get()
    if (existing_store) {
      if (!confirm("Data with this name already exists, do you want to overwrite?")) return id
    }

    // validate data
    const validated = DataS.safeParse({ ...data, id })

    if (!validated.success) {
      return error({
        message: "invalid data",
        data: {
          data,
        },
      })
    }

    await store.set(validated?.data)

    emit({ type: "data/add", data: validated?.data })

    // return hash of the content as an id
    return id
  },
  delete: async ({ id }: { id: string }) => {
    const { DataState } = await initLoaders()
    const store = await DataState({ id })
    await store.destroy()
  },
}

listen({
  type: "data.*",
  action: async (data: any, e: any) => {
    const { callback } = data
    const method: string = e?.event?.replace("data.", "")
    if (method in API) {
      const response = await API[method](data)
      callback && callback(response)
    } else {
      callback && callback({ error: "method not found", data: { ...data, e } })
    }
  },
})

export default API
