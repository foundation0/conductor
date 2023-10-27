import * as Comlink from "comlink"
import WorkerVector from '@/libraries/worker.vector.ts?worker&url'

const WORKERS: { [key: string]: string } = {
  vector: WorkerVector,
}

const WORKER_CACHE: any = {}

export async function getWorker<T>({ file, id }: { file: string, id?: string }) {
  const wid = `${file}-${id || ""}`
  if(WORKER_CACHE[wid]) return WORKER_CACHE[wid]
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
  WORKER_CACHE[wid] = { worker: cw as T, ...w }
  return WORKER_CACHE[wid]
}
