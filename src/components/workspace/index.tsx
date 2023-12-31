import { useEffect, useState } from "react"
import { Match, Switch } from "react-solid-flow"
import _ from "lodash"
import { Outlet, useNavigate, useParams } from "react-router-dom"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import SessionOrganizer from "@/components/workspace/sessions/organizer"
import DataOrganizer from "@/components/workspace/data"
import { Link } from "react-router-dom"
import { MdSettingsSuggest } from "react-icons/md"
import MembersIcon from "@/assets/icons/members.svg"
import CabinetIcon from "@/assets/icons/cabinet.svg"
import Comment1Icon from "@/assets/icons/comment-1.svg"
import IntersectIcon from "@/assets/icons/intersect.svg"
import { fieldFocus } from "@/libraries/field_focus"
import Lottie from "lottie-light-react"
import WorkingOnIt from "@/assets/animations/working_on_it.json"
import Joyride, { Step } from "react-joyride"
import {
  Tabs,
  Welcome,
  WorkspaceOrganizer,
  WorkspaceSelector,
  WorkspaceSidebar,
  Notepad,
} from "@/components/experiences/onboarding/v1"
import AppstateActions from "@/data/actions/app"
import { Resizable } from "react-resizable"
import "react-resizable/css/styles.css"
import { emit, query } from "@/libraries/events"
import useMemory from "@/components/hooks/useMemory"
import { mAppT } from "@/data/schemas/memory"
import { useEvent } from "../hooks/useEvent"
import { Input, InputActions } from "../experiences/input_introduction/v1"
import { AIsT } from "@/data/schemas/ai"
import { getAvatar } from "@/libraries/ai"
import PersonaIcon from "@/assets/icons/persona.svg"
import { handleAIChange } from "@/libraries/session_module"
import { error } from "@/libraries/logging"

export default function Workspace() {
  let workspace_id = useParams().workspace_id as string
  let session_id = useParams().session_id as string

  const _mem = useMemory<mAppT>({
    id: "app",
    state: {
      workspace_id: useParams().workspace_id as string,
      session_id: useParams().session_id as string,
    },
  })
  if (!_mem) return null
  if (_mem.workspace_id === undefined || _mem.workspace_id !== workspace_id) {
    _mem.workspace_id = workspace_id
  }
  if (_mem.session_id === undefined || _mem.session_id !== session_id) {
    _mem.session_id = session_id
  }

  const app_state = useMemory<AppStateT>({ id: "appstate" })
  const user_state = useMemory<UserT>({ id: "user" })
  const ai_state = useMemory<AIsT>({ id: "ais" })
  const { setPreference, getPreference } = AppstateActions

  const mem = useMemory<{
    run_onboarding: boolean
    organizer_width: number
    max_ais: number
    sidebar_minimized: boolean
  }>({
    id: "workspace",
    state: {
      run_onboarding: false,
      organizer_width: 250,
      max_ais: 4,
      sidebar_minimized: false,
    },
  })

  const { run_onboarding, organizer_width, max_ais } = mem

  const navigate = useNavigate()

  useEffect(() => {
    if (!workspace_id) {
      // get the first workspace and its first session
      const workspace = user_state.workspaces[0]
      workspace_id = workspace?.id
      const group = workspace?.groups[0]
      const folder = group?.folders[0]
      const session = _.get(folder, "sessions[0]")
      if (!session) {
        error({ message: "No session found in workspace", data: { workspace } })
        return
      }
      session_id = session?.id
      _mem.workspace_id = workspace_id
      _mem.session_id = session_id
      if (window.location.pathname === "/c/")
        navigate(`/c/${workspace_id}/${session_id}`)
    }
    _mem.workspace_id = workspace_id
    _mem.session_id = session_id
  }, [JSON.stringify([workspace_id, session_id])])

  // set focus to input when window regains focus
  useEffect(() => {
    const l = window.addEventListener("focus", () => {
      setTimeout(() => {
        fieldFocus({ selector: `#input-${session_id}` })
      }, 200)
    })
  }, [])

  // check that workspace exists
  useEffect(() => {
    if (!_.find(user_state.workspaces, { id: workspace_id })) {
      navigate("/c/")
    }
    emit({
      type: "user.sync",
    })
  }, [workspace_id])

  // if there is no session selected, select the first one from the first group's first folder
  // const session_id = useParams().session_id
  useEffect(() => {
    if (!session_id) {
      // use lodash chaining to get the first session id
      const first_session_id = _.chain(user_state.workspaces)
        .find({ id: workspace_id })
        .get("groups")
        .find({ id: user_state.workspaces[0].groups[0].id })
        .get("folders")
        .find({ id: user_state.workspaces[0].groups[0].folders[0].id })
        .get("sessions")
        .first()
        .get("id")
        .value()
      navigate(`/c/${workspace_id}/${first_session_id}`)
    }
    emit({
      type: "workspace/change",
    })
  }, [workspace_id])

  const [active_sidebar_tab, setActiveSidebarTab] = useState("sessions")
  const sidebar_tab_class = "h-5 w-5 hover:text-zinc-200 contrast-150"
  const sidebar_tabs = [
    {
      id: "sessions",
      name: "Sessions",
      onClick: () => setActiveSidebarTab("sessions"),
      icon: <img src={Comment1Icon} className={sidebar_tab_class} />,
    },
    {
      id: "data",
      name: "Data",
      onClick: () => setActiveSidebarTab("data"),
      icon: <img src={CabinetIcon} className={sidebar_tab_class} />,
    },
    {
      id: "members",
      name: "Members",
      onClick: () => setActiveSidebarTab("members"),
      icon: <img src={MembersIcon} className={sidebar_tab_class} />,
    },
    {
      id: "market",
      name: "Market",
      onClick: () => setActiveSidebarTab("market"),
      icon: <img src={IntersectIcon} className={sidebar_tab_class} />,
    },
  ]

  const steps: Step[] = [
    {
      target: "#Conductor",
      content: <Welcome />,
      placement: "center",
    },
    {
      target: "#WorkspaceSelector",
      content: <WorkspaceSelector />,
      placement: "right-start",
    },
    {
      target: "#WorkspaceSidebar",
      content: <WorkspaceSidebar />,
      placement: "right",
    },
    {
      target: ".OrganizerTree",
      content: <WorkspaceOrganizer />,
      placement: "right-end",
    },
    /* {
      target: ".DataOrganizer",
      content: <Data />,
      placement: "right-end",
    }, */
    {
      target: "#OpenTabs",
      content: <Tabs />,
      placement: "bottom",
    },
    {
      target: "#Input",
      content: <Input />,
      placement: "top",
    },
    {
      target: ".InputActions",
      content: <InputActions />,
      placement: "top",
    },
    {
      target: ".NotepadButton",
      content: <Notepad />,
      placement: "top",
    },
  ]

  useEffect(() => {
    if (!user_state?.experiences?.find((e) => e.id === "onboarding/v1")) {
      mem.run_onboarding = true
    }
  }, [])

  useEffect(() => {
    getPreference({ key: "organizer-width" }).then((width: string) => {
      if (width) {
        const w = _.toNumber(width)
        mem.organizer_width = w
      }
    })
  }, [])

  const onResize = (event: any, { size }: any) => {
    mem.organizer_width = size.width
    emit({
      type: "layout_resize",
    })
    const ai_selector_width =
      document.getElementById("WorkspaceSidebarContent")?.offsetWidth || 180
    // @ts-ignore
    const ai_avatar = document.querySelector(".ai")?.firstChild as HTMLElement
    const ai_avatar_width = ai_avatar?.offsetWidth || 0
    mem.max_ais = _.floor(ai_selector_width / (ai_avatar_width + 10), 0)
  }

  useEvent({
    name: "workspace/changeSidebarTab",
    action: async ({ sidebar_tab }: { sidebar_tab: string }) => {
      setActiveSidebarTab(sidebar_tab)
    },
  })

  useEvent({
    name: "workspace/toggleSidebar",
    action: () => {
      mem.sidebar_minimized = !mem.sidebar_minimized
    },
  })

  return (
    <div className="flex flex-1">
      <Joyride steps={steps} run={run_onboarding} continuous={true} />
      <div
        id="Modes"
        className="relative rounded-md m-0.5 mb-1 overflow-hidden"
      >
        <Resizable
          width={mem.organizer_width}
          height={1000}
          onResize={onResize}
          resizeHandles={["e"]}
          handleSize={[1000, 1000]}
          onResizeStop={() => {
            setPreference({
              key: "organizer-width",
              value: mem.organizer_width,
            })
          }}
        >
          <div
            className={`h-[100dvh] transition-all ${
              mem.sidebar_minimized ? "w-0 hidden" : (
                "w-60 min-w-[200px] max-w-lg flex flex-1 flex-col "
              )
            }`}
            style={{ width: `${mem.organizer_width}px` }}
          >
            <div id="WorkspaceSidebar" className="flex flex-col gap-1">
              <div
                id="Workspace"
                className="flex flex-row bg-zinc-800 px-4 h-10 rounded-md border border-zinc-900/50 border-t-transparent"
              >
                <div className="flex flex-grow items-center font-semibold text-sm text-zinc-300 rounded-md">
                  {_.find(user_state.workspaces, { id: workspace_id })?.name}
                </div>
                <Link
                  className="flex items-center"
                  to={`/c/${workspace_id}/settings`}
                >
                  <MdSettingsSuggest className="w-4 h-4 text-zinc-400 hover:text-zinc-200 transition-all" />
                </Link>
              </div>
              <div
                id="SidebarView"
                className="tabs flex flex-row py-3 bg-zinc-800 h-12 justify-center items-center rounded-t-md border border-zinc-900/50 border-b-transparent"
              >
                {sidebar_tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`flex flex-1 justify-center px-2 cursor-pointer tooltip tooltip-bottom ${
                      active_sidebar_tab === tab.id ?
                        "tab-active text-zinc-200"
                      : "text-zinc-500"
                    }`}
                    onClick={tab.onClick}
                    data-tip={tab.name}
                  >
                    <div
                      className={`flex w-7 h-7 rounded justify-center items-center saturate-0 transition-all ${
                        active_sidebar_tab === tab.id ?
                          " text-zinc-200 bg-zinc-900/70 border-t border-t-zinc-700/70 saturate-100 contrast-100 "
                        : "text-zinc-500 "
                      } border border-transparent hover:border-t hover:border-t-zinc-700/70 hover:bg-zinc-900/50 hover:saturate-100 hover:contrast-100`}
                    >
                      {tab.icon}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              id="WorkspaceSidebarContent"
              className={`px-2 bg-zinc-800 flex flex-grow flex-col mb-1 rounded-b-md border border-zinc-900/50 border-t-transparent`}
            >
              <div
                id="AIQuickSelector"
                className="flex flex-row w-full justify-start gap-1 mb-3"
              >
                <div className="ai flex flex-row flex-1 flex-grow items-center justify-start gap-1">
                  {_(user_state.ais || [])
                    .filter({ status: "active" })
                    .map((ai) => {
                      const _ai = { ...ai }
                      if (!_ai.last_used) _ai.last_used = 0
                      return _ai
                    })
                    .orderBy("last_used", "desc")
                    .take(mem.max_ais || 4)
                    .map((ai) => {
                      const AI = _.find(ai_state, { id: ai.id })
                      const avatar = (
                        <img
                          className={`border-2 border-zinc-900 rounded-full`}
                          src={
                            AI?.meta.avatar ||
                            getAvatar({
                              seed: AI?.meta?.name || "",
                            })
                          }
                        />
                      )
                      return (
                        <div
                          className="rounded-full w-8 h-8 flex justify-center items-center cursor-pointer tooltip tooltip-bottom"
                          data-tip={AI?.meta?.name || "Unnamed"}
                          key={AI?.id}
                          onClick={async () => {
                            const sess: any = await query({
                              type: "sessions.addSession",
                              data: {
                                workspace_id: workspace_id,
                              },
                            })
                            navigate(`/c/${workspace_id}/${sess.session.id}`)
                            emit({
                              type: "sessions/change",
                            })
                            setTimeout(
                              () => handleAIChange({ value: AI?.id || "c1" }),
                              1000,
                            )
                          }}
                        >
                          {avatar}
                        </div>
                      )
                    })
                    .value()}
                  <div
                    className="rounded-full border-inset border border-dashed border-zinc-600 text-zinc-600 w-7 h-7 flex justify-center items-center saturate-0 hover:saturate-100 hover:text-zinc-300 hover:border-zinc-300 transition-all tooltip tooltip-bottom cursor-pointer"
                    data-tip="Create new AI"
                    onClick={() => {
                      navigate("/c/ai/create")
                    }}
                  >
                    <img src={PersonaIcon} className="w-4 h-4" alt="" />
                  </div>
                </div>
                <div className="flex flex-row flex-shrink items-center justify-start gap-1"></div>
              </div>

              <Switch fallback={""}>
                <Match when={active_sidebar_tab === "sessions"}>
                  <div
                    className={`flex flex-grow flex-col overflow-x-hidden w-full ${
                      active_sidebar_tab === "sessions" ? "" : "hidden"
                    }`}
                  >
                    <SessionOrganizer
                      app_state={app_state}
                      user_state={user_state}
                    />
                  </div>
                </Match>
                <Match when={active_sidebar_tab === "data"}>
                  <div
                    className={`overflow-x-hidden w-full ${
                      active_sidebar_tab === "data" ? "" : "hidden"
                    }`}
                  >
                    <DataOrganizer />
                  </div>
                </Match>
                <Match
                  when={
                    ["members", "market"].indexOf(active_sidebar_tab) !== -1
                  }
                >
                  <div
                    className={`overflow-x-hidden w-full ${
                      active_sidebar_tab === "members" ? "" : "hidden"
                    }`}
                  >
                    <div className="flex flex-col w-full h-full align-center items-center justify-center flex-grow text-zinc-400 font-semibold">
                      <Lottie animationData={WorkingOnIt}></Lottie>
                      <div className="text-md text-center">
                        Coming soon&trade;
                      </div>
                    </div>
                  </div>
                </Match>
              </Switch>
            </div>
          </div>
        </Resizable>
      </div>
      <div id="View" className="flex flex-1 bg-zinc-850 m-0.5 w-full">
        <Outlet />
      </div>
    </div>
  )
}
