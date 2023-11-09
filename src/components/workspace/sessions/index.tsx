import _ from "lodash"
import Session from "./session"
import Tabs from "./tabs"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import "react-resizable/css/styles.css"
import eventEmitter from "@/libraries/events"
import { initLoaders } from "@/data/loaders"
import { WorkspaceT } from "@/data/schemas/workspace"
import { SessionTypesT, SessionsT } from "@/data/schemas/sessions"

export default function Workspace() {
  const workspace_id = useParams().workspace_id as string
  const session_id = useParams().session_id as string
  const [open_sidebar, setOpenSidebar] = useState<string>("")
  const [sessions, setSessions] = useState<SessionTypesT[]>([])
  const [active_sessions, setActiveSessions] = useState<{ [key: string]: boolean }>({})

  async function updateSessions() {
    const { AppState, SessionState, UserState, AIState } = await initLoaders()
    const user_state = await UserState.get()
    // get all the sessions for this workspace
    const workspace: WorkspaceT = _.find(user_state.workspaces, { id: workspace_id })
    if (!workspace) return
    // recursively fetch all the sessions from workspace.groups.folders.sessions
    const ws_sessions = _(workspace.groups)
      .flatMap((group) => {
        return _.flatMap(group.folders, (folder) => {
          return folder.sessions
        })
      })
      .compact()
      .value()
    const sessions_state: SessionsT = await SessionState.get()
    const sessions = _.map(ws_sessions, (session) => {
      return sessions_state?.active[session.id]
    })
    if (sessions) setSessions(sessions)
    setActiveSessions({ ...active_sessions, [session_id]: true })
  }

  useEffect(() => {
    updateSessions()
    setActiveSessions({ ...active_sessions, [session_id]: true })
  }, [JSON.stringify([workspace_id, session_id])])

  function setSidebar(sidebar: string) {
    setTimeout(() => eventEmitter.emit("layout_resize"), 200)
    if (open_sidebar === sidebar) return setOpenSidebar("")
    setOpenSidebar(sidebar)
  }
  return (
    <div className="flex flex-1">
      <div id="ContentTabs" className="flex flex-1 gap-1 grow flex-col overflow-hidden">
        <div id="Tabs" className="flex flex-row bg-zinc-800 h-10 border-b-zinc-950 rounded-md">
          <Tabs setShowNotepad={() => setSidebar("Notepad")} setShowMembers={() => setSidebar("Members")} />
        </div>
        <div id="ContentViews" className="flex flex-1">
          {sessions.map((session) => {
            return (
              <Session
                key={session.id}
                activated={active_sessions[session.id] || false}
                workspace_id={workspace_id}
                session_id={session.id}
                type={session.type || "chat"}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
