import _ from "lodash"
import Session from "./session"
import Tabs from "./tabs"
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"
import "react-resizable/css/styles.css"
import eventEmitter, { emit, query } from "@/libraries/events"
import { initLoaders } from "@/data/loaders"
import { SessionT, WorkspaceT } from "@/data/schemas/workspace"
import { SessionTypesT, SessionsT } from "@/data/schemas/sessions"
import { useEvent } from "@/components/hooks/useEvent"
import useMemory from "@/components/hooks/useMemory"
import { AppStateT } from "@/data/loaders/app"
import { OpenSessionS } from "@/data/schemas/app"
import { z } from "zod"
import { mAppT } from "@/data/schemas/memory"

export default function Workspace() {
  const mem_app: mAppT = useMemory({ id: "app" })

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
    const { SessionState, UserState, AppState } = await initLoaders()
    const app_state: AppStateT = await AppState.get()
    const user_state = await UserState.get()
    // get all the sessions for this workspace
    const workspace: WorkspaceT = _.find(user_state.workspaces, {
      id: mem_app.workspace_id,
    })
    if (!workspace) return

    const workspace_open_sessions =
      app_state.open_sessions.filter(
        (session: z.infer<typeof OpenSessionS>) =>
          session.workspace_id === mem_app.workspace_id,
      ) || []

    const sids: { [key: string]: boolean } = {}
    _.map(workspace_open_sessions, "session_id").forEach(
      (id) => (sids[id] = true),
    )

    const ws_sessions: { sessions: SessionT[] } = await query({
      type: "user.getSessions",
      data: {
        workspace_id: mem_app.workspace_id,
      },
    })
    if (!ws_sessions) return
    const { sessions } = ws_sessions
    const sessions_state: SessionsT = await SessionState.get()
    if (!sessions_state?.active[mem_app.session_id]) {
      // add session_id to active_sessions
      emit({
        type: "sessions.addSessionToActive",
        data: {
          workspace_id: mem_app.workspace_id,
          session_id: mem_app.session_id,
        },
      })
    }
    const _sessions = _(sids)
      .keys()
      .map((sid) => {
        return sessions_state?.active[sid]
      })
      .compact()
      .value()
    if (_sessions && _sessions.length > 0) mem.sessions = _sessions
    // if session_id exists in sessions, set it to active
    const session_index = _.findIndex(mem.sessions, { id: mem_app.session_id })
    // get session_ids from active_sessions

    if (session_index !== -1)
      mem.active_sessions = { ...sids, [mem_app.session_id]: true }
    else handleMissingSession({ session_id: mem_app.session_id })
  }

  function update() {
    updateSessions()
    // mem.active_sessions = { ...mem.active_sessions, [session_id]: true }
  }

  useEffect(() => update(), [])
  useEffect(
    () => update(),
    [JSON.stringify([mem_app.workspace_id, mem_app.session_id])],
  )

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
    if (mem.sessions.length === 0) {
      // TODO: make sure a new session is created
    } else {
      let _session = mem.sessions[session_index + 1]
      if (!_session) {
        const _session = mem.sessions[session_index - 1]
        if (!_session) return
      }
      return navigate(`/c/${mem_app.workspace_id}/${_session.id}`)
    }
  }

  useEvent({
    name: "sessions.deleteSession.done",
    action: handleMissingSession,
  })

  useEvent({
    name: ["sessions/change", "sessions.updateSessions.done"],
    action: () => update,
  })

  // if session_id doesn't exist in sessions, run handleMissingSession
  useEffect(() => {
    const session_index = _.findIndex(mem.sessions, { id: mem_app.session_id })
    if (session_index === -1)
      handleMissingSession({ session_id: mem_app.session_id })
  }, [JSON.stringify(mem.sessions)])

  return (
    <div className="flex flex-1">
      <div
        id="ContentTabs"
        className="flex flex-1 gap-1 grow flex-col overflow-hidden"
      >
        <div
          id="Tabs"
          className="flex flex-row bg-zinc-800 h-10 border-b-zinc-950 rounded-md"
        >
          <Tabs />
        </div>
        <div id="ContentViews" className="flex flex-1">
          {_(Object.keys(mem.active_sessions))
            .compact()
            .map((session_id) => {
              if (!session_id) return null
              const session = _.find(mem.sessions, { id: session_id })
              if (!session) return null
              return (
                <Session
                  key={session.id}
                  activated={mem.active_sessions[session.id] || false}
                  workspace_id={mem_app.workspace_id}
                  session_id={session.id}
                  type={session.type || "chat"}
                />
              )
            })
            .compact()
            .value()}
        </div>
      </div>
    </div>
  )
}
