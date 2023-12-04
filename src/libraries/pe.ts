import config from "@/config"
import _ from "lodash"
import { sleep } from "./utilities"

type PEArgsT = {
  host: string
  onData?: (data: any) => void
  onDone: (receipt: any) => void
  onError?: (err: any) => void
}

export async function PEClient<T>({ host, onData, onDone, onError }: PEArgsT): Promise<{
  close: () => void
  abort: (params: { user_id: string }) => void
  compute: (request: T) => any
}> {
  let request_id: string = ""
  let ws: WebSocket
  const API = {
    close: () => {
      onDone && onDone(null)
    },
    abort: ({ user_id }: { user_id: string }) => {
      ws.send(JSON.stringify({ request_id, user_id, type: "Abort" }))
    },
    compute: async (request: T) => {

      // check if websocket is already open
      if (!ws || ws?.readyState !== 1) {
        // open websocket connection to host/PE
        ws = new WebSocket(`${host}`)
      } else {
        ws.send(JSON.stringify(request))
      }
      ws.onopen = async () => {
        async function checkIfReady() {
          if (ws.readyState !== 1) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(checkIfReady())
              }, 100)
            })
          }
        }
        await checkIfReady()
        ws.send(JSON.stringify(request))
      }
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        // first response should be { request_id: "...", status: "ready" }
        if (data.request_id && data.status === "ready") {
          request_id = data.request_id
          return
        } else if (data.request_id === request_id && data.data) {
          // all subsequent responses should be { request_id: "...", data: "..." }
          const dat = JSON.parse(data.data)
          return onData && onData(dat)
        } else if (data.request_id === request_id && data.status === "complete") {
          return onDone && onDone({ receipt: data.receipt || null })
        } else if (data.error) {
          return onError && onError({ error: data.error, code: data.code || "unknown" })
        } else if (data.request_id === request_id) {
          return onError && onError(`Unknown type of response: ${JSON.stringify(data)}`)
        }
      }
    },
  }
  return API
}

export async function PEClientNS({
  type,
  user_id,
  params,
  host,
}: {
  type: string
  user_id: string
  params?: any
  host?: string
}) {
  return new Promise(async (resolve, reject) => {
    let output: string | object | number | undefined = undefined

    const ULE = await PEClient({
      host: host || `${config.services.ule_URI}`,
      onData: (data) => {
        // determine the type of the data
        if (typeof data === "string") {
          if (typeof output === "undefined") output = ""
          else throw new Error("Cannot merge string with other data types")
          output += data
        } else if (typeof data === "object") {
          // check if data is an object or array
          const type = Array.isArray(data) ? "array" : "object"
          // define output
          if (typeof output === "undefined") {
            if (type === "object") output = {}
            if (type === "array") output = []
          }

          // merge data into output and deduplicate
          if (type === "object" && typeof output === "object") {
            output = {
              ...output,
              ...data,
            }
          } else if (type === "array" && typeof output === "object") {
            output = _.uniqWith([...(output as []), ...data], _.isEqual)
          } else {
            throw new Error("Cannot merge string with other data types")
          }
        } else if (typeof data === "number") {
          if (typeof output !== "number") output = 0
          output += data
        } else {
          throw new Error("Unknown data type from PE")
        }
      },
      onDone: (data) => {
        resolve(output)
      },
      onError: (err) => {
        const error = {
          code: err.code || "unknown",
          message: err.error || err.message || err || "unknown",
          status: "error",
          surpress: false,
        }
        if (error.message === "canceled") return resolve(output)
      },
    })
    ULE.compute({
      type,
      user_id,
      params,
    })
  })
}
