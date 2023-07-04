import eventEmitter from "./events"

export async function error({ message, data, type }: { message: string; data?: any; type?: string }) {
  // const lid = await AppStateActions.addLogItem({
  //   type: "error",
  //   message,
  //   data,
  // })
  eventEmitter.emit("new_error", { type: type || "error", message, data })
}



export async function info({ message, data }: { message: string; data?: any; type?: string }) {
  eventEmitter.emit("info", { type: "info", message, data })
  if(localStorage?.getItem("debug") === "true") {
    console.log(message, data)
  }
}