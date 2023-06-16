import Chat from "@/components/workspace/sessions/chat"
import { Match, Switch } from "react-solid-flow"

export default function Session({ session_id, type = "chat" }: { session_id: string; type?: string }) {
  if (!session_id) return null
  return (
    <div className="flex flex-1 pt-4 bg-zinc-900 bg-gradient-to-br from-zinc-900 to-zinc-800">
      <Switch>
        <Match when={type === "chat"}>
          <Chat />
        </Match>
      </Switch>
    </div>
  )
}
