import * as Comlink from "comlink"
import WorkerVector from "@/libraries/worker.vector.ts?worker&url"
import { error, info } from "./logging"
import _ from "lodash"
import { nanoid } from "nanoid"
import { listen } from "./events"

const WORKERS: { [key: string]: string } = {
  vector: WorkerVector,
}

const WORKER_CACHE: { [key: string]: Worker & any } = {}
const SHARED_WORKER_CACHE: { [key: string]: Worker & any } = {}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getWid({ file, id }: { file: string; id?: string }) {
  return { id: `${file}-${id || ""}`, la: new Date().getTime(), n: nanoid(10) }
}

function threadsCleanup(THREADS: { n: string; la: number; id: string }[]) {
  return THREADS.filter((wid) => {
    const now = new Date().getTime()
    const diff = now - wid.la
    if (diff > 15000) {
      if (WORKER_CACHE[wid.n]) {
        const { terminate } = WORKER_CACHE[wid.n]
        terminate()
      } else {
        THREADS = _.filter(THREADS, (w) => w.n !== wid.n)
      }
      console.log(`${THREADS.length} / Removed thread ${wid.n} / ${wid.id}`)
      return true
    }
    return false
  })
}

listen({
  type: "threads/terminate",
  action: async ({ file, id, n }: { file: string; id?: string; n: string }) => {
    await THREADS.release({ file, id, n })
  },
})

async function ThreadCache() {
  let THREADS: { n: string; la: number; id: string }[] = []
  const THREADS_LIMIT = 4

  setInterval(async () => {
    THREADS = await threadsCleanup(THREADS)
  }, 1000)

  const API = {
    async use({
      file,
      id,
    }: {
      file: string
      id?: string
    }): Promise<{ worker: any; terminate: Function } | { error: any }> {
      if (THREADS.length >= THREADS_LIMIT || Object.keys(WORKER_CACHE).length >= THREADS_LIMIT) {
        await sleep(_.random(100, 1000))
        return await this.use({ file, id })
      }
      const wid = getWid({ file, id })
      let www
      if (THREADS.length < THREADS_LIMIT) {
        www = await createWorker({ file, id, n: wid.n })
        info({ message: `${THREADS.length} / New worker for ${wid.id} / ${wid.n}` })
      }
      THREADS.push(wid)
      return www
    },
    async release({ file, id, n }: { file: string; id?: string; n: string }) {
      const wid = getWid({ file, id }) // note that n is again random so use the arg one
      if (WORKER_CACHE[n]) {
        if (!n) throw new Error("No n")
        const { _: _w } = WORKER_CACHE[n]
        _w.terminate()
        delete WORKER_CACHE[n]
        THREADS = _.filter(THREADS, (w) => w.n === n)
        console.log(`${THREADS.length} / Terminated worker for ${wid.id} / ${n}`)
      }
    },
  }
  return API
}

const THREADS = await ThreadCache()

export async function getWorker<T>({ file, id, shared }: { file: string; id?: string; shared?: boolean }) {
  if (!shared) return createWorker<T>({ file, id, n: nanoid(10) })
  else {
    return createSharedWorker<T>({ file, id, n: nanoid(10) })
  }
}

export async function createWorker<T>({ file, id, n }: { file: string; id?: string; n: string }) {
  const wid = getWid({ file, id })
  // if (WORKER_CACHE[wid.id]) return WORKER_CACHE[wid.id]
  const w = new Worker(WORKERS[file], { type: "module" })
  const cw = Comlink.wrap(w)

  let initialized = false
  while (!initialized) {
    const promise = new Promise((resolve) => setTimeout(resolve, 100))
    // @ts-ignore
    const result = await Promise.race([promise, cw.ping()])
    if (result === "pong") {
      initialized = true
    }
  }
  WORKER_CACHE[n] = {
    worker: cw as T,
    _: w,
    terminate: async () => {
      await THREADS.release({ file, id, n })
    },
  }
  return WORKER_CACHE[n]
}

export async function createSharedWorker<T>({ file, id, n }: { file: string; id?: string; n: string }) {
  const wid = getWid({ file, id })
  if (SHARED_WORKER_CACHE[wid.id]) return SHARED_WORKER_CACHE[wid.id]
  const w = new SharedWorker(WORKERS[file], { type: "module" })
  const cw = Comlink.wrap(w.port)

  let initialized = false
  while (!initialized) {
    const promise = new Promise((resolve) => setTimeout(resolve, 100))
    // @ts-ignore
    const result = await Promise.race([promise, cw.ping()])
    if (result === "pong") {
      initialized = true
    }
  }
  SHARED_WORKER_CACHE[wid.id] = {
    worker: cw as T,
    _: w,
    /* terminate: async () => {
      w.port.close()
      delete SHARED_WORKER_CACHE[n]
    }, */
  }
  return SHARED_WORKER_CACHE[wid.id]
}
