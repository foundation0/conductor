import AppStateActions from "@/data/actions/app"
import eventEmitter from "./events"

export async function error({ message, data }: { message: string; data?: any }) {
  const lid = await AppStateActions.addLogItem({
    type: "error",
    message,
    data,
  })
  eventEmitter.emit("new_error", lid)
}
