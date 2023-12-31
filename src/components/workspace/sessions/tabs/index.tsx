import { OpenSessionS } from "@/data/schemas/app"
import { FolderS, GroupS, SessionT, WorkspaceS } from "@/data/schemas/workspace"
import { useEffect, useRef, useState } from "react"
import { z } from "zod"
import _ from "lodash"
import { RxPlus } from "react-icons/rx"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import { useNavigate } from "react-router-dom"
import { Link } from "react-router-dom"
import AppStateActions from "@/data/actions/app"
import { useHotkeys } from "react-hotkeys-hook"
import { BiNotepad } from "react-icons/bi"
import { emit, query } from "@/libraries/events"
import { getOS } from "@/libraries/utilities"
import { error } from "@/libraries/logging"
import { PiChatCircleDotsBold } from "react-icons/pi"
import { useEvent } from "@/components/hooks/useEvent"
import { mAppT } from "@/data/schemas/memory"
import useMemory from "@/components/hooks/useMemory"
import { Tab } from "./tab"
import { TabLoader } from "./tab-loader"
import { ChatSessionT, SessionTypesT } from "@/data/schemas/sessions"

export default function Tabs() {
  const app_state = useMemory<AppStateT>({ id: "appstate" })
  const user_state = useMemory<UserT>({ id: "user" })
  const [item_added_to_notepad, setItemAddedToNotepad] = useState(false)

  const navigate = useNavigate()

  const mem_app: mAppT = useMemory({ id: "app" })
  const { workspace_id, session_id } = mem_app
  if (!workspace_id || !session_id) return null

  const mem_session_index = useMemory<{
    open_sidebar: string
    sessions: SessionTypesT[]
    active_sessions: { [key: string]: boolean }
    open_sessions: ChatSessionT[]
  }>({
    id: "session-index",
  })

  const mem = useMemory<{
    open_tabs: any
    debounce: any
    loading_tab_label?: string

  }>({
    id: `session-${session_id}-tabs`,
    state: { open_tabs: null },
  })

  const containerRef = useRef<HTMLDivElement>(null)

  const [relative_width, setRelativeWidth] = useState(0)

  // const resizeHandler = () => {
  //   return true
  //   const e = document.getElementById("Tabs")
  //   if (e && containerRef.current) {
  //     const parentWidth = e.offsetWidth
  //     const tabs_actions_e = document.getElementById("TabsActions")
  //     if (!tabs_actions_e) return
  //     const tabs_width = parentWidth - tabs_actions_e?.offsetWidth
  //     const tabs_count = document.querySelectorAll("#OpenTabs a").length + 1
  //     const _relativeWidth = tabs_width / tabs_count
  //     Array.from(document.querySelectorAll("#OpenTabs a")).forEach(
  //       (child: Element) => {
  //         ;(child as HTMLElement).style.width = `${_relativeWidth}px`
  //       },
  //     )
  //     if (_relativeWidth !== relative_width) {
  //       setRelativeWidth(_relativeWidth)
  //       setTimeout(resizeHandler, 1)
  //     }
  //   }
  // }

  async function createNewSession() {
    // get folder_id based on active session_id
    const group = (_.find(
      user_state.workspaces.flatMap((ws) => ws.groups),
      (g) =>
        g.folders.find((f) => f?.sessions?.find((s) => s.id === session_id)),
    ) || _.first(user_state.workspaces[0].groups)) as z.infer<typeof GroupS>

    const folder = (group.folders.find(
      (f) => f?.sessions?.find((s) => s.id === session_id),
    ) || _.first(group.folders)) as z.infer<typeof FolderS>

    const new_session: { session: SessionT } = await query({
      type: "sessions.addSession",
      data: {
        group_id: group?.id || "",
        workspace_id: workspace_id || "",
        folder_id: folder?.id || "",
      },
    })

    return navigate(`/c/${workspace_id}/${new_session?.session.id}`)
  }

  // Generate visible tabs
  const generateVisibleTabs = () => {
    // const workspace_open_sessions =
    //   _(app_state.open_sessions)
    //     .filter(
    //       (session: z.infer<typeof OpenSessionS>) =>
    //         session.workspace_id === active_workspace.id,
    //     )
    //     .uniqBy("session_id")
    //     .value() || []

    // get session data
    // const o = workspace_open_sessions
    //   .map((open_session: z.infer<typeof OpenSessionS>) => {
    //     // get session data from workspaces.groups.folders.sessions
    //     const s = _.find(
    //       active_workspace.groups.flatMap((g) =>
    //         g.folders.flatMap((f) => f.sessions),
    //       ),
    //       { id: open_session.session_id },
    //     )

    //     if (!s) return false
    //     return (
    //       <Tab
    //         key={s.id}
    //         session_id={s.id}
    //         workspace_id={workspace_id}
    //         label={s.name}
    //       />
    //     )
    //   })
    //   .filter(Boolean)

    const _o = _.keys(mem_session_index.active_sessions).map(
      (session_id: string) => {
        const active_workspace = user_state.workspaces.find(
          (ws) => ws.id === workspace_id,
        ) as z.infer<typeof WorkspaceS>
        if (!workspace_id || active_workspace === null) return
        const s = _.find(
          active_workspace.groups.flatMap((g) =>
            g.folders.flatMap((f) => f.sessions),
          ),
          { id: session_id },
        )
        if (!s) return false
        return (
          <Tab
            key={s.id}
            session_id={s.id}
            workspace_id={workspace_id}
            label={s.name}
          />
        )
      },
    )
    // setOpenTabs(o)
    mem.open_tabs = _o
    // resizeHandler()
    // setTimeout(resizeHandler, 1000)
  }

  // if the current session is not in tabs, add it
  async function matchTabsWithOpenSessions() {
    const active_workspace = user_state.workspaces.find(
      (ws) => ws.id === workspace_id,
    ) as z.infer<typeof WorkspaceS>
    if (!workspace_id || active_workspace === null) return
    const workspace_open_sessions =
      app_state.open_sessions.filter(
        (session: z.infer<typeof OpenSessionS>) =>
          session.workspace_id === active_workspace.id,
      ) || []

    const session_in_open_session = workspace_open_sessions.find(
      (session: z.infer<typeof OpenSessionS>) =>
        session.session_id === session_id,
    )

    if (!session_in_open_session) {
      // get session data based on session id
      const s = _.find(
        active_workspace.groups.flatMap((g) =>
          g.folders.flatMap((f) => {
            return _.map(f.sessions, (s) => {
              return { ...s, group_id: g.id, folder_id: f.id }
            })
          }),
        ),
        { id: session_id },
      )
      if (!s) return

      const new_tab = {
        _v: 1,
        workspace_id: workspace_id,
        session_id: session_id,
        group_id: s.group_id,
        folder_id: s.folder_id,
      }
      AppStateActions.updateAppState({
        open_sessions: [...app_state.open_sessions, new_tab],
      }).then(() => {
        navigate(`/c/${workspace_id}/${session_id}`)
      })
    }
  }

  // keyboard shortcut for closing tab
  useHotkeys(getOS() === "macos" ? "ctrl+w" : "alt+w", async () => {
    if (!session_id) return
    const new_tab = await AppStateActions.removeOpenSession({ session_id })
    navigate(`/c/${workspace_id}/${new_tab?.session_id}`)
  })

  // keyboard shortcut for deleting a session
  useHotkeys(getOS() === "macos" ? "shift+ctrl+d" : "shift+alt+d", async () => {
    if (!session_id) return
    if (app_state.open_sessions.length === 1) {
      return error({ message: "You can't delete the last session." })
    }
    const session = _.find(app_state.open_sessions, { session_id })
    if (session && confirm("Are you sure you want to delete this session?")) {
      const session_index = _.findIndex(app_state.open_sessions, { session_id })
      // get the previous session from open sessions
      const next_session = app_state.open_sessions[0]
      await query({
        type: "sessions.deleteSession",
        data: {
          folder_id: session.folder_id || "",
          group_id: session.group_id || "",
          workspace_id: session.workspace_id || "",
          session_id: session.session_id || "",
        },
      })
      navigate(`/c/${workspace_id}/${next_session.session_id}`)
    }
  })

  // keyboard shortcut for creating new session
  useHotkeys(getOS() === "macos" ? "ctrl+t" : "alt+t", async () => {
    if (!session_id) return
    const session = _.find(app_state.open_sessions, { session_id })
    const new_session: { session: SessionT } = await query({
      type: "sessions.addSession",
      data: {
        group_id: session?.group_id || "",
        workspace_id: workspace_id || "",
        folder_id: session?.folder_id || "",
      },
    })
    navigate(`/c/${workspace_id}/${new_session?.session.id}`)
  })

  /* useEffect(() => {
    resizeHandler()
    window.addEventListener("resize", resizeHandler)
    return () => {
      window.removeEventListener("resize", resizeHandler)
    }
  }, [])

  useEvent({
    name: "layout_resize",
    action: resizeHandler,
  }) */

  useEvent({
    name: "notepad.addClip.done",
    action: () => {
      setItemAddedToNotepad(true)
      setTimeout(() => {
        setItemAddedToNotepad(false)
      }, 2000)
    },
  })

  // useEvent({
  //   name: 'tab-loader',
  //   action: () => {
  //     if(!mem.loading_tab_label) mem.loading_tab_label = "Loading..."
  //     else mem.loading_tab_label = ""
  //   }
  // })

  // useEvent({
  //   name: [
  //     "sessions.addSession.done",
  //     "sessions.updateSession.done",
  //     "app.changeActiveSession.done",
  //     "app.removeOpenSession.done",
  //   ],
  //   action: generateVisibleTabs,
  // })

  // useEvent({
  //   name: "store/update",
  //   target: "appstate",
  //   action: generateVisibleTabs,
  // })

  // useEvent({
  //   name: "store/update",
  //   target: "user",
  //   action: generateVisibleTabs,
  // })

  // useEvent({
  //   name: "sessions/change",
  //   action: matchTabsWithOpenSessions,
  // })

  return (
    <>
      <div
        className="h-full flex items-center justify-start p-4 leading-none cursor-pointer text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50 border-r border-r-zinc-700/30 tooltip tooltip-right transition-all"
        data-tip="Create new session"
        onClick={() => createNewSession()}
      >
        <RxPlus />
      </div>
      <div
        id="OpenTabs"
        className="tabs flex flex-row flex-1 items-center overflow-hidden"
        ref={containerRef}
      >
        {_.map(mem_session_index.open_sessions, (ss: ChatSessionT) => {
          const active_workspace = user_state.workspaces.find(
            (ws) => ws.id === workspace_id,
          ) as z.infer<typeof WorkspaceS>
          if (!workspace_id || active_workspace === null) return
          const s = _.find(
            active_workspace.groups.flatMap((g) =>
              g.folders.flatMap((f) => f.sessions),
            ),
            { id: ss.id },
          )
          if (!s) return false
          return (
            <Tab
              key={s.id}
              session_id={s.id}
              workspace_id={workspace_id}
              label={s.name}
            />
          )
        })}
        {/* {mem.loading_tab_label && <TabLoader label={mem.loading_tab_label} />} */}
      </div>
      <div id="TabsActions" className="flex flex-row justify-end ml-3">
        <div className=" flex flex-row flex-1 gap-3 pr-3 justify-end items-center ">
          <div
            className="NotepadButton tooltip tooltip-left"
            data-tip="Show/hide notepad"
          >
            <BiNotepad
              className={` hover:text-zinc-200 cursor-pointer transition-all ${
                item_added_to_notepad ?
                  "animate-pulse text-zinc-200"
                : "text-zinc-500"
              }`}
              onClick={() => {
                emit({
                  type: "notepad/toggle",
                  data: { target: session_id },
                })
              }}
            />
          </div>
          {/* <div className="tooltip tooltip-left" data-tip="Show/hide session members">
          <HiUsers className="cursor-pointer" onClick={() => setShowMembers()} />
        </div>
        <div className="tooltip tooltip-left" data-tip="Search for help">
          <MdOutlineLiveHelp className="cursor-pointer" />
        </div> */}
        </div>
      </div>
    </>
  )
}
