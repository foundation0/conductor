import Chat from "@/components/workspace/sessions/chat"
import { Match, Switch } from "react-solid-flow"

export default function Session({ session_id, type = "chat" }: { session_id: string; type?: string }) {
  if (!session_id) return null
  return (
    <div className="flex flex-1 rounded-md mb-1 bg-zinc-900 bg-gradient-to-br from-zinc-800/30 to-zinc-700/30 justify-center">
      <Switch>
        <Match when={type === "chat"}>
          <Chat />
        </Match>
      </Switch>
    </div>
  )
}
