import _ from "lodash"
import Session from "./session"
import Tabs from "./tabs"
import { useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import "react-resizable/css/styles.css"
import { emit, listen, query } from "@/libraries/events"
import { initLoaders } from "@/data/loaders"
import { SessionT, WorkspaceT } from "@/data/schemas/workspace"
import { ChatSessionT, SessionTypesT, SessionsT } from "@/data/schemas/sessions"
import { useEvent } from "@/components/hooks/useEvent"
import useMemory from "@/components/hooks/useMemory"
import { AppStateT } from "@/data/loaders/app"
import { OpenSessionS } from "@/data/schemas/app"
import { z } from "zod"
import { mAppT, mChatSessionT } from "@/data/schemas/memory"
import { AIsT } from "@/data/schemas/ai"
import { UserT } from "@/data/schemas/user"
import { createMemoryState } from "@/libraries/memory"
import { Module } from "@/modules"
import { buildMessageTree, computeActivePath } from "@/libraries/branching"

export default function Workspace() {
  const url_workspace_id = useParams().workspace_id
  const url_session_id = useParams().session_id

  const mem_app: mAppT = useMemory({ id: "app" })

  const user_state = useMemory<UserT>({ id: "user" })
  const app_state = useMemory<AppStateT>({ id: "appstate" })

  const ai_state = useMemory<AIsT>({
    id: "ais",
  })

  // const [open_sidebar, setOpenSidebar] = useMemory<string>({ id: 'session-index', state: "")
  const mem = useMemory<{
    open_sidebar: string
    sessions: SessionTypesT[]
    active_sessions: { [key: string]: boolean }
    open_sessions: ChatSessionT[]
    loading_tab_label?: string
  }>({
    id: "session-index",
    state: {
      sessions: [],
      active_sessions: {},
      open_sidebar: "",
      open_sessions: [],
      loading_tab_label: false
    },
  })

  const mem_width = useMemory<{
    width: number
    height: number
    content_width: number
  }>({
    id: "window",
    state: {
      width: window.innerWidth,
      height: window.innerHeight,
      content_width:
        window.innerWidth -
        ((document.getElementById("WorkspaceSelector")?.offsetWidth || 0) +
          (document.getElementById("Modes")?.offsetWidth || 0) +
          12),
    },
  })

  const navigate = useNavigate()

  async function updateSessions() {
    const { SessionState } = await initLoaders()

    // get all the sessions for this workspace
    const workspace: WorkspaceT | undefined = _.find(user_state.workspaces, {
      id: mem_app.workspace_id,
    })
    if (!workspace) return

    const workspace_open_sessions =
      app_state.open_sessions
        .filter(
          (session: z.infer<typeof OpenSessionS>) =>
            session.workspace_id === mem_app.workspace_id,
        )
        .filter((open_session: z.infer<typeof OpenSessionS>) => {
          // get session data from workspaces.groups.folders.sessions
          const s = _.find(
            workspace.groups.flatMap((g) =>
              g.folders.flatMap((f) => f.sessions),
            ),
            { id: open_session.session_id },
          )
          if (!s) return false
          return true
        }) || []

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
    else {
      handleMissingSession({ session_id: mem_app.session_id })
    }
  }

  async function update() {
    await updateSessions()
    await setupSessionStores()
    // mem.active_sessions = { ...mem.active_sessions, [session_id]: true }
  }

  // useEffect(() => {
  //   update()
  // }, [])
  useEffect(() => {
    update()
  }, [
    JSON.stringify([
      url_workspace_id,
      // url_session_id,
      mem_app.workspace_id,
      mem_app.session_id,
      app_state.open_sessions,
      user_state.workspaces,
    ]),
  ])

  async function initSession({ session_id }: { session_id: string }) {
    const { SessionState } = await initLoaders()
    const sessions_state: SessionsT = await SessionState.get()
    
    const { MessagesState } = (await initLoaders()) as {
      MessagesState: Function
    }
    const mem_session = createMemoryState<mChatSessionT>({
      id: `session-${session_id}`,
      state: {
        id: session_id,
        session: sessions_state?.active[session_id],
        module: undefined,
        module_ctx_len: 0,
        ai: undefined,
        input: { change_timer: null, text: "", tokens: 0 },
        context: {
          data_refs: [],
          tokens: 0,
        },
        messages: {
          raw: [],
          active: [],
          branch_msg_id: "",
          branch_parent_id: "",
          tokens: 0,
          empty_local: true,
        },
        generation: {
          in_progress: false,
          controller: undefined,
          msgs_in_mem: [],
          msg_update_ts: 0,
        },
      },
    })
    if (!mem_session || !mem_session?.messages) return false

    // Get the AI used
    mem_session.ai = _.find(ai_state, {
      id: mem_session?.session?.settings?.ai || "c1",
    }) as AIsT[0]

    // Get the module used
    mem_session.module =
      (await Module(mem_session?.session?.settings?.module?.id)) || undefined

    // Get the messages
    const state = await MessagesState({ session_id })
    const local_raw = await state.get()
    if (local_raw.length > 0) mem_session.messages.raw = local_raw

    const active_path = computeActivePath(mem_session.messages.raw || [])
    if (!active_path) return
    const active = buildMessageTree({
      messages: mem_session.messages.raw || [],
      first_id: "first",
      activePath: active_path,
    })
    active && (mem_session.messages.active = active)

    state?.sync &&
      state.sync().then(async () => {
        const synced_msgs = await state.get()
        if (synced_msgs.length > 0) {
          mem_session.messages.raw = synced_msgs
          mem_session.messages.empty_local = false
          const active_path = computeActivePath(mem_session.messages.raw || [])
          if (!active_path) return
          const active = buildMessageTree({
            messages: mem_session.messages.raw || [],
            first_id: "first",
            activePath: active_path,
          })
          active && (mem_session.messages.active = active)
        }
      })
  }

  async function setupSessionStores() {
    const { SessionState } = await initLoaders()
    const sessions_state: SessionsT = await SessionState.get()

    const unprocessed_sessions = _.difference(
      _(mem.active_sessions).keys().value(),
      mem.open_sessions.map((s) => s.id),
    )
    if (unprocessed_sessions.length === 0) return
    const sessss = _(unprocessed_sessions)
      .compact()
      .map(async (session_id) => {
        await initSession({ session_id })
        return sessions_state?.active[session_id]
      })
      .value()
    const s = await Promise.all(sessss)
    const _s = _([...mem.open_sessions, s])
      .flattenDeep()
      .uniqBy("id")
      .compact()
      .value()
    mem.open_sessions = _s || []
    emit({
      type: 'tab-loader'
    })
  }

  useEffect(() => {
    setupSessionStores()
  }, [JSON.stringify([mem.active_sessions])])

  useEvent({
    name: ["sessions.removeOpenSession.done"],
    action: update,
  })

  // function setSidebar(sidebar: string) {
  //   setTimeout(() => eventEmitter.emit("layout_resize"), 200)
  //   if (mem.open_sidebar === sidebar) return (mem.open_sidebar = "")
  //   mem.open_sidebar = sidebar
  // }

  function handleMissingSession({ session_id }: { session_id: string }) {
    // get session index from active sessions
    const session_index = _.findIndex(mem.sessions, { id: session_id })
    if (session_index !== -1) return

    // delete from active sessions
    mem.active_sessions = _.omit(mem.active_sessions, session_id)

    // delete from open sessions
    mem.open_sessions = _.reject(mem.open_sessions, { id: session_id })

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
    name: [
      "sessions/change",
      "sessions.updateSessions.done",
      "sessions.addSession.done",
    ],
    action: () => update,
  })

  // if session_id doesn't exist in sessions, run handleMissingSession
  useEffect(() => {
    const session_index = _.findIndex(mem.sessions, { id: mem_app.session_id })
    if (session_index === -1)
      handleMissingSession({ session_id: mem_app.session_id })
  }, [JSON.stringify(mem.sessions)])

  async function computeContentWidth() {
    const width = window.innerWidth || 1000
    const height = window.innerHeight || 1000
    const content_width =
      window.innerWidth -
      ((document.getElementById("WorkspaceSelector")?.offsetWidth || 0) +
        (document.getElementById("Modes")?.offsetWidth || 0) +
        12)
    if (width !== mem_width.width) mem_width.width = width
    if (height !== mem_width.height) mem_width.height = height
    if (content_width !== mem_width.content_width)
      mem_width.content_width = content_width
    // console.log("resize", content_width, window.innerWidth)
  }

  window.addEventListener("resize", computeContentWidth)

  useEffect(() => {
    computeContentWidth()
  }, [window.innerWidth])

  listen({
    type: ["layout_resize", "sessions/change"],
    action: () => {
      computeContentWidth()
      setTimeout(computeContentWidth, 500)
    },
  })

  const [Sessions, setSessions] = useState<any[]>([])

  useEffect(
    () => {
      setSessions(
        _(
          _.intersection(
            mem.open_sessions.map((s) => s.id),
            _.keys(mem.active_sessions),
          ),
        )
          .compact()
          .orderBy("id")
          // .filter(session_id => session_stores.includes(session_id))
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
          .value(),
      )
    },
    [
      JSON.stringify(
        _.intersection(
          mem.open_sessions.map((s) => s.id),
          _.keys(mem.active_sessions),
        ),
      ),
    ] || "[]",
  )

  return (
    <div
      className="flex flex-1"
      style={{ width: mem_width.content_width + "px" }}
    >
      {mem.open_sessions.length > 0 ?
        <div
          id="ContentTabs"
          className="flex flex-1 gap-1 grow flex-col overflow-hidden"
          style={{ width: mem_width.content_width + "px" }}
        >
          <div
            id="Tabs"
            className="flex flex-row bg-zinc-800 h-10 border-b-zinc-950 rounded-md"
            // style={{ width: mem_width.content_width + "px" }}
          >
            <Tabs />
          </div>
          <div
            id="ContentViews"
            className="flex flex-1 rounded-md mb-0.5 bg-zinc-900 bg-gradient-to-br from-zinc-800/30 to-zinc-700/30 justify-center"
          >
            {Sessions}
          </div>
        </div>
      : <div className="flex flex-1 flex-col rounded-md mb-0.5 bg-zinc-900 bg-gradient-to-br from-zinc-800/30 to-zinc-700/30 justify-center items-center text-zinc-500">
          Loading...
        </div>
      }
    </div>
  )
}
