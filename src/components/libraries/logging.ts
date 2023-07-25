import eventEmitter from "./events"
import Posthog from "posthog-js"

let posthog: any = null

export function error({ message, data, type }: { message: string; data?: any; type?: string }): false {
  // const lid = await AppStateActions.addLogItem({
  //   type: "error",
  //   message,
  //   data,
  // })
  eventEmitter.emit("new_error", { type: type || "error", message, data })
  ph()?.capture("error", { message, data })
  return false
}

export async function info({ message, data }: { message: string; data?: any; type?: string }) {
  eventEmitter.emit("info", { type: "info", message, data })
  if (localStorage?.getItem("debug") === "true") {
    console.log(message, data)
  }
}

export function ph() {
  // production
  if (!posthog && !localStorage?.getItem("debug")) {
    //__APP_VERSION__ &&
    posthog = Posthog.init("phc_zm6kOtEDAWZTS41cSLFFFMKilxkWgf4K78Hs1tboeNp", { api_host: "https://eu.posthog.com" })
  } else {
    return { capture: () => {}, reset: () => {} }
  }
  return posthog
}
