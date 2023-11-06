import Chat from "@/components/workspace/sessions/chat"
import { Match, Switch } from "react-solid-flow"

export default function Session({
  workspace_id,
  session_id,
  type = "chat",
  active = false,
}: {
  workspace_id: string
  session_id: string
  type?: string
  active?: boolean
}) {
  if (!session_id) return null
  if (!active) return null
  return (
    <div className="flex flex-1 rounded-md mb-1 bg-zinc-900 bg-gradient-to-br from-zinc-800/30 to-zinc-700/30 justify-center">
      <Switch>
        <Match when={type === "chat"}>
          <Chat session_id={session_id} workspace_id={workspace_id}/>
        </Match>
        <Match when={type === "data"}>
          <div>data ${session_id}</div>
        </Match>
      </Switch>
    </div>
  )
}
