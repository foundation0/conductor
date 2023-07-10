import { OpenSessionS } from "@/data/schemas/app"
import { FolderS, GroupS, WorkspaceS } from "@/data/schemas/workspace"
import { useEffect, useState } from "react"
import { z } from "zod"
import _ from "lodash"
import { RxPlus } from "react-icons/rx"
import { MdInbox } from "react-icons/md"
import { RiHashtag } from "react-icons/ri"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import { useFetcher, useLoaderData, useNavigate, useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import AppStateActions from "@/data/actions/app"
import { useHotkeys } from "react-hotkeys-hook"
import { BiNotepad } from "react-icons/bi"
import eventEmitter from "@/components/libraries/events"

export default function Tabs({
  setShowNotepad: setShowClipboard,
  setShowMembers,
}: {
  setShowNotepad: () => void
  setShowMembers: () => void
}) {
  const { app_state, user_state } = useLoaderData() as { app_state: AppStateT; user_state: UserT }

  const [open_tabs, setOpenTabs] = useState<any>(null)
  const [item_added_to_notepad, setItemAddedToNotepad] = useState(false)

  const navigate = useNavigate()
  const fetcher = useFetcher()
  const workspace_id = useParams().workspace_id as string
  const session_id = useParams().session_id as string

  useEffect(() => {
    eventEmitter.on("item_added_to_notepad", () => {
      setItemAddedToNotepad(true)
      setTimeout(() => {
        setItemAddedToNotepad(false)
      }, 2000)
    })
  }, [])

  // Generate visible tabs
  const generateVisibleTabs = () => {
    const active_workspace = user_state.workspaces.find((ws) => ws.id === workspace_id) as z.infer<typeof WorkspaceS>
    if (!workspace_id || active_workspace === null) return
    const workspace_open_sessions =
      app_state.open_sessions.filter(
        (session: z.infer<typeof OpenSessionS>) => session.workspace_id === active_workspace.id
      ) || []

    // get session data
    const o = workspace_open_sessions
      .map((open_session: z.infer<typeof OpenSessionS>) => {
        // get session data from workspaces.groups.folders.sessions
        const s = _.find(
          active_workspace.groups.flatMap((g) => g.folders.flatMap((f) => f.sessions)),
          { id: open_session.session_id }
        )

        if (!s) return false
        return (
          <Link
            className={`flex flex-shrink-1 border-0 border-r border-zinc-800 tab h-full ${
              session_id === s.id ? "tab-active bg-zinc-900" : " bg-zinc-800 hover:bg-zinc-900"
            }`}
            key={s.id}
            to={`/conductor/${workspace_id}/${s.id}`}
          >
            <div className="flex flex-row items-center gap-4 hover:text-zinc-200">
              <div
                className={`text-xs font-semibold flex flex-grow truncate items-center  ${
                  s.id === session_id ? " text-zinc-200" : "text-zinc-600"
                }`}
                onContextMenu={(e) => {
                  e.preventDefault()
                  // TODO: add context menu
                }}
              >
                <RiHashtag className={`w-3.5 h-3.5 pr-1 `} />
                {s.name}
              </div>
              {workspace_open_sessions.length > 1 ? (
                <div
                  className="text-sm rotate-45 hover:bg-zinc-700 hover:text-zinc-100 rounded-full h-fit"
                  onClick={async (e) => {
                    e.preventDefault()
                    if (!session_id) return
                    const new_tab = await AppStateActions.removeOpenSession({ session_id: s.id })
                    if (session_id === s.id) navigate(`/conductor/${workspace_id}/${new_tab?.session_id}`)
                    else navigate(`/conductor/${workspace_id}/${session_id}`)
                  }}
                >
                  <RxPlus />
                </div>
              ) : null}
            </div>
          </Link>
        )
      })
      .filter(Boolean)

    setOpenTabs(o)
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
    const active_workspace = user_state.workspaces.find((ws) => ws.id === workspace_id) as z.infer<typeof WorkspaceS>
    if (open_tabs?.length === 0) {
      const first_group = _.first(active_workspace.groups)
      if (!first_group) throw new Error("first group not found")
      const first_folder = _.first(first_group.folders)
      if (!first_folder) throw new Error("first folder not found")
      const first_session = _.first(first_folder.sessions)

      if (first_session) {
        navigate(`/conductor/${workspace_id}/${first_session.id}`)
      } else {
        console.warn("first session not found")
      }
    }
  }, [open_tabs?.length === 0])

  // if the current session is not in tabs, add it
  useEffect(() => {
    const active_workspace = user_state.workspaces.find((ws) => ws.id === workspace_id) as z.infer<typeof WorkspaceS>
    if (!workspace_id || active_workspace === null) return
    const workspace_open_sessions =
      app_state.open_sessions.filter(
        (session: z.infer<typeof OpenSessionS>) => session.workspace_id === active_workspace.id
      ) || []

    const session_in_open_session = workspace_open_sessions.find(
      (session: z.infer<typeof OpenSessionS>) => session.session_id === session_id
    )

    if (!session_in_open_session) {
      // get session data based on session id
      const s = _.find(
        active_workspace.groups.flatMap((g) =>
          g.folders.flatMap((f) => {
            return _.map(f.sessions, (s) => {
              return { ...s, group_id: g.id, folder_id: f.id }
            })
          })
        ),
        { id: session_id }
      )
      if (!s) return

      const new_tab = {
        _v: 1,
        workspace_id: workspace_id,
        session_id: session_id,
        group_id: s.group_id,
        folder_id: s.folder_id,
      }
      AppStateActions.updateAppState({ open_sessions: [...app_state.open_sessions, new_tab] }).then(() => {
        navigate(`/conductor/${workspace_id}/${session_id}`)
      })
    }
  }, [JSON.stringify([session_id, open_tabs])])

  // keyboard shortcut for closing tab
  useHotkeys("alt+w", async () => {
    if (!session_id) return
    const new_tab = await AppStateActions.removeOpenSession({ session_id })
    navigate(`/conductor/${workspace_id}/${new_tab?.session_id}`)
  })

  return (
    <>
      <div className="tabs flex flex-nowrap justify-center items-center">{open_tabs}</div>
      <div
        className="h-full flex items-center p-4 leading-none cursor-pointer text-zinc-500 hover:text-zinc-200"
        onClick={async () => {
          // get folder_id based on active session_id
          const group = _.find(
            user_state.workspaces.flatMap((ws) => ws.groups),
            (g) => g.folders.find((f) => f?.sessions?.find((s) => s.id === session_id))
          ) as z.infer<typeof GroupS>

          const folder = group.folders.find((f) => f?.sessions?.find((s) => s.id === session_id)) as z.infer<
            typeof FolderS
          >

          fetcher.submit(
            {
              workspace_id: workspace_id || "",
              group_id: group?.id || "",
              folder_id: folder?.id || "",
            },
            {
              method: "PUT",
              action: `/conductor/workspace/session`,
            }
          )
        }}
      >
        <RxPlus />
      </div>
      <div className="flex-grow flex flex-row gap-3 pr-3 justify-end items-center ">
        <div className="tooltip tooltip-left" data-tip="Show/hide clipboard">
          <BiNotepad
            className={` hover:text-zinc-200 cursor-pointer ${
              item_added_to_notepad ? "animate-pulse text-zinc-200" : "text-zinc-500"
            }`}
            onClick={() => setShowClipboard()}
          />
        </div>
        {/* <div className="tooltip tooltip-left" data-tip="Show/hide session members">
          <HiUsers className="cursor-pointer" onClick={() => setShowMembers()} />
        </div>
        <div className="tooltip tooltip-left" data-tip="Search for help">
          <MdOutlineLiveHelp className="cursor-pointer" />
        </div> */}
      </div>
    </>
  )
}
