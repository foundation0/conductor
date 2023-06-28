import eventEmitter from "./events"

export async function error({ message, data, type }: { message: string; data?: any; type?: string }) {
  // const lid = await AppStateActions.addLogItem({
  //   type: "error",
  //   message,
  //   data,
  // })
  eventEmitter.emit("new_error", { type: type || "error", message, data })
}
