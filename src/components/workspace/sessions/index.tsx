import _ from "lodash"
import Session from "./session"
import Tabs from "./tabs"
import { useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import "react-resizable/css/styles.css"
import eventEmitter from "@/libraries/events"
import { initLoaders } from "@/data/loaders"
import { WorkspaceT } from "@/data/schemas/workspace"
import { SessionTypesT, SessionsT } from "@/data/schemas/sessions"
import { useEvent } from "@/components/hooks/useEvent"
import useMemory from "@/components/hooks/useMemory"

export default function Workspace() {
  const workspace_id = useParams().workspace_id as string
  const session_id = useParams().session_id as string
  // const [open_sidebar, setOpenSidebar] = useMemory<string>({ id: 'session-index', state: "")
  const mem = useMemory<{
    open_sidebar: string
    sessions: SessionTypesT[]
    active_sessions: { [key: string]: boolean }
  }>({
    id: "session-index",
    state: { sessions: [], active_sessions: {}, open_sidebar: "" },
  })

  const navigate = useNavigate()

  async function updateSessions() {
    const { SessionState, UserState } = await initLoaders()
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
    const _sessions = _.map(ws_sessions, (session) => {
      return sessions_state?.active[session.id]
    })
    if (_sessions) mem.sessions = _sessions
    // if session_id exists in sessions, set it to active
    const session_index = _.findIndex(mem.sessions, { id: session_id })
    if (session_index !== -1) mem.active_sessions = { ...mem.active_sessions, [session_id]: true }
    else handleMissingSession({ session_id })
  }

  function update() {
    updateSessions()
    // mem.active_sessions = { ...mem.active_sessions, [session_id]: true }
  }

  useEffect(() => update(), [])
  useEffect(() => update(), [JSON.stringify([workspace_id, session_id])])

  function setSidebar(sidebar: string) {
    setTimeout(() => eventEmitter.emit("layout_resize"), 200)
    if (mem.open_sidebar === sidebar) return (mem.open_sidebar = "")
    mem.open_sidebar = sidebar
  }

  async function handleMissingSession({ session_id }: { session_id: string }) {
    // get session index from active sessions
    const session_index = _.findIndex(mem.sessions, { id: session_id })
    if (session_index !== -1) return

    // delete from open sessions
    mem.active_sessions = _.omit(mem.active_sessions, session_id)

    // switch to another session
    let _session = mem.sessions[session_index + 1]
    if (!_session) {
      const _session = mem.sessions[session_index - 1]
      if (!_session) return
    }
    return navigate(`/c/${workspace_id}/${_session.id}`)
  }

  useEvent({
    name: "sessions.deleteSession.done",
    action: handleMissingSession,
  })

  // if session_id doesn't exist in sessions, run handleMissingSession
  useEffect(() => {
    const session_index = _.findIndex(mem.sessions, { id: session_id })
    if (session_index === -1) handleMissingSession({ session_id })
  }, [JSON.stringify(mem.sessions)])

  return (
    <div className="flex flex-1">
      <div id="ContentTabs" className="flex flex-1 gap-1 grow flex-col overflow-hidden">
        <div id="Tabs" className="flex flex-row bg-zinc-800 h-10 border-b-zinc-950 rounded-md">
          <Tabs setShowNotepad={() => setSidebar("Notepad")} setShowMembers={() => setSidebar("Members")} />
        </div>
        <div id="ContentViews" className="flex flex-1">
          {mem.sessions.map((session) => {
            return (
              <Session
                key={session.id}
                activated={mem.active_sessions[session.id] || false}
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
