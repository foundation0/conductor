import { OpenSessionS } from "@/data/schemas/app"
import { FolderS, GroupS, SessionT, WorkspaceS } from "@/data/schemas/workspace"
import { useEffect, useRef, useState } from "react"
import { z } from "zod"
import _ from "lodash"
import { RxPlus } from "react-icons/rx"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import { useLoaderData, useNavigate } from "react-router-dom"
import { Link } from "react-router-dom"
import AppStateActions from "@/data/actions/app"
import { useHotkeys } from "react-hotkeys-hook"
import { BiNotepad } from "react-icons/bi"
import { emit, query } from "@/libraries/events"
import { getOS } from "@/libraries/utilities"
import { error } from "@/libraries/logging"
import { PiChatCircleDotsBold } from "react-icons/pi"
import { useEvent } from "@/components/hooks/useEvent"
import { mAppT, mChatSessionT } from "@/data/schemas/memory"
import useMemory from "@/components/hooks/useMemory"

export default function Tabs() {
  const { app_state, user_state } = useLoaderData() as {
    app_state: AppStateT
    user_state: UserT
  }

  // const [open_tabs, setOpenTabs] = useState<any>(null)
  const [item_added_to_notepad, setItemAddedToNotepad] = useState(false)

  const navigate = useNavigate()

  const mem_app: mAppT = useMemory({ id: "app" })
  const { workspace_id, session_id } = mem_app
  if (!workspace_id || !session_id) return null
  // const workspace_id = useParams().workspace_id as string
  // const session_id = useParams().session_id as string

  const mem = useMemory<{
    open_tabs: any
    debounce: any
  }>({
    id: `session-${session_id}-tabs`,
    state: { open_tabs: null },
  })
  const { open_tabs } = mem

  const containerRef = useRef<HTMLDivElement>(null)

  const resizeHandler = () => {
    const e = document.getElementById("Tabs")
    if (e && containerRef.current) {
      const parentWidth = e.offsetWidth
      const tabs_actions_e = document.getElementById("TabsActions")
      if (!tabs_actions_e) return
      const tabs_width = parentWidth - tabs_actions_e?.offsetWidth
      const tabs_count = document.querySelectorAll("#OpenTabs a").length + 1
      Array.from(document.querySelectorAll("#OpenTabs a")).forEach(
        (child: Element) => {
          const relativeWidth = tabs_width / tabs_count
          ;(child as HTMLElement).style.width = `${relativeWidth}px`
        },
      )
    }
  }

  async function createNewSession() {
    // get folder_id based on active session_id
    const group = _.find(
      user_state.workspaces.flatMap((ws) => ws.groups),
      (g) =>
        g.folders.find((f) => f?.sessions?.find((s) => s.id === session_id)),
    ) as z.infer<typeof GroupS>

    const folder = group.folders.find(
      (f) => f?.sessions?.find((s) => s.id === session_id),
    ) as z.infer<typeof FolderS>

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
    const active_workspace = user_state.workspaces.find(
      (ws) => ws.id === workspace_id,
    ) as z.infer<typeof WorkspaceS>
    if (!workspace_id || active_workspace === null) return
    const workspace_open_sessions =
      _(app_state.open_sessions)
        .filter(
          (session: z.infer<typeof OpenSessionS>) =>
            session.workspace_id === active_workspace.id,
        )
        .uniqBy("session_id")
        .value() || []

    // get session data
    const o = workspace_open_sessions
      .map((open_session: z.infer<typeof OpenSessionS>) => {
        // get session data from workspaces.groups.folders.sessions
        const s = _.find(
          active_workspace.groups.flatMap((g) =>
            g.folders.flatMap((f) => f.sessions),
          ),
          { id: open_session.session_id },
        )

        if (!s) return false
        return (
          <Link
            className={`flex flex-row min-w-[50px] max-w-[200px] flex-nowrap flex-shrink border-transparent border-0 tab m-0 px-3 h-full text-xs font-semibold justify-start items-center tooltip tooltip-bottom transition-colors ph-no-capture ${
              session_id === s.id ?
                "tab-active bg-zinc-900/50 text-zinc-200"
              : " bg-zinc-800 hover:bg-zinc-900/50 text-zinc-600 hover:text-zinc-300"
            }`}
            key={s.id}
            to={`/c/${workspace_id}/${s.id}`}
            onClick={() => {
              emit({ type: "sessions/change", data: { session_id: s.id } })
            }}
            data-tip={s.name}
          >
            <div className="flex flex-shrink-0">
              <PiChatCircleDotsBold className={`w-3.5 h-3.5 pr-1 `} />
            </div>
            <div className="truncate" data-original-text={s.name}>
              {s.name}
            </div>
            <div className="flex flex-1 justify-end">
              <div
                className="flex ml-3 text-sm rotate-45 hover:bg-zinc-700 hover:text-zinc-100 rounded-full h-fit transition-all"
                onClick={async (e) => {
                  e.preventDefault()
                  if (!session_id) return
                  const new_tab = await AppStateActions.removeOpenSession({
                    session_id: s.id,
                  })
                  setTimeout(() => {
                    if (session_id === s.id)
                      navigate(`/c/${workspace_id}/${new_tab?.session_id}`)
                    else {
                      navigate(`/c/${workspace_id}/${session_id}`)
                    }
                  }, 200)
                }}
              >
                <RxPlus />
              </div>
            </div>
          </Link>
        )
      })
      .filter(Boolean)

    // setOpenTabs(o)
    mem.open_tabs = o
    setTimeout(resizeHandler, 100)
  }

  useEffect(() => {
    generateVisibleTabs()
  }, [
    JSON.stringify([
      app_state.open_sessions,
      user_state.workspaces,
      app_state.active_sessions,
      workspace_id,
      session_id,
    ]),
  ])

  // if there are no open sessions, add the first session from first group to open sessions
  useEffect(() => {
    setTimeout(() => {
      const active_workspace = user_state.workspaces.find(
        (ws) => ws.id === workspace_id,
      ) as z.infer<typeof WorkspaceS>
      if (open_tabs?.length === 0) {
        const first_group = _.first(active_workspace.groups)
        if (!first_group) throw new Error("first group not found")
        const first_folder = _.first(first_group.folders)
        if (!first_folder) throw new Error("first folder not found")
        const first_session = _.first(first_folder.sessions)

        if (first_session) {
          navigate(`/c/${workspace_id}/${first_session.id}`)
        } else {
          console.warn("first session not found")
        }
      }
    }, 200)
  }, [open_tabs?.length === 0])

  // if the current session is not in tabs, add it
  useEffect(() => {
    setTimeout(() => {
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
    }, 200)
  }, [JSON.stringify([session_id, open_tabs])])

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
      const next_session =
        app_state.open_sessions[
          session_index === 0 ? session_index + 1 : session_index - 1
        ]
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
    setTimeout(() => {
      navigate(`/c/${workspace_id}/${new_session?.session.id}`)
    }, 200)
  })

  useEffect(() => {
    resizeHandler()
    window.addEventListener("resize", resizeHandler)
    return () => {
      window.removeEventListener("resize", resizeHandler)
    }
  }, [])

  useEvent({
    name: "layout_resize",
    action: resizeHandler,
  })

  useEvent({
    name: "notepad.addClip.done",
    action: () => {
      setItemAddedToNotepad(true)
      setTimeout(() => {
        setItemAddedToNotepad(false)
      }, 2000)
    },
  })

  useEvent({
    name: [
      "sessions.addSession.done",
      "sessions.updateSession.done",
      "app.changeActiveSession.done",
      "app.removeOpenSession.done",
    ],
    action: generateVisibleTabs,
  })

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
        className="tabs flex flex-row flex-1 items-center"
        ref={containerRef}
      >
        {open_tabs}
      </div>
      <div id="TabsActions" className="flex flex-row justify-end">
        <div className=" flex flex-row flex-1 gap-3 pr-3 justify-end items-center ">
          <div className="NotepadButton tooltip tooltip-left" data-tip="Show/hide notepad">
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
