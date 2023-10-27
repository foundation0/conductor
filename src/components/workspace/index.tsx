import { useEffect, useState } from "react"
import { Match, Switch } from "react-solid-flow"
import _ from "lodash"
import { Outlet, useLoaderData, useNavigate, useParams } from "react-router-dom"
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
import { MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight } from "react-icons/md"
import Joyride, { Step } from "react-joyride"
import {
  Input,
  Tabs,
  Welcome,
  WorkspaceOrganizer,
  WorkspaceSelector,
  WorkspaceSidebar,
} from "@/components/experiences/onboarding/v1"
import AppstateActions from "@/data/actions/app"
import { Resizable } from "react-resizable"
import "react-resizable/css/styles.css"
import eventEmitter from "@/libraries/events"
import UserActions from "@/data/actions/user"

type LoaderT = { app_state: AppStateT; user_state: UserT }

export default function Workspace() {
  const { app_state, user_state } = useLoaderData() as LoaderT
  const [run_onboarding, setRunOnboarding] = useState(false)
  const { setPreference, getPreference } = AppstateActions
  const [organizer_width, setOrganizerWidth] = useState(250)

  const workspace_id = useParams().workspace_id
  const navigate = useNavigate()

  // set focus to input when window regains focus
  useEffect(() => {
    const l = window.addEventListener("focus", () => {
      setTimeout(() => {
        fieldFocus({ selector: "#input" })
      }, 200)
    })
  }, [])

  // check that workspace exists
  useEffect(() => {
    if (!_.find(user_state.workspaces, { id: workspace_id })) {
      navigate("/c/")
    }
  }, [workspace_id])

  // if there is no session selected, select the first one from the first group's first folder
  const session_id = useParams().session_id
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

  const [sidebar_minimized, setSidebarMinimized] = useState(false)
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
  ]

  useEffect(() => {
    if (!user_state?.experiences?.find((e) => e.id === "onboarding/v1")) {
      setRunOnboarding(true)
    }
    /* for testing: resets onboarding 
    let new_user_state = { ...user_state }
    new_user_state.experiences = []
    UserActions.updateUser(new_user_state)
    */
  }, [])

  useEffect(() => {
    getPreference({ key: "organizer-width" }).then((width) => {
      if (width) {
        const w = _.toNumber(width)
        setOrganizerWidth(w)
      }
    })
  }, [])

  const onResize = (event: any, { size }: any) => {
    setOrganizerWidth(size.width)
    eventEmitter.emit("layout_resize")
    // setPreference({ key: 'organizer-width', value: size.width });
  }

  return (
    <div className="flex flex-1">
      <Joyride steps={steps} run={run_onboarding} continuous={true} />
      <div id="Modes" className="relative rounded-md m-0.5">
        <div className="absolute -right-1.5 top-1/2 z-10">
          <div
            className="cursor-pointer flex justify-center items-center h-6 w-3 bg-zinc-800/90 rounded-sm border-r border-zinc-700/50 tooltip tooltip-right"
            data-tip="Maximize/minimize sidebar"
            onClick={() => setSidebarMinimized(!sidebar_minimized)}
          >
            {sidebar_minimized ? (
              <MdKeyboardDoubleArrowRight className="text-zinc-400 w-3 h-3" />
            ) : (
              <MdKeyboardDoubleArrowLeft className="text-zinc-400 w-3 h-3" />
            )}
          </div>
        </div>
        <Resizable
          width={organizer_width}
          height={1000}
          onResize={onResize}
          resizeHandles={["e"]}
          handleSize={[1000, 1000]}
          onResizeStop={() => {
            setPreference({ key: "organizer-width", value: organizer_width })
          }}
        >
          <div
            className={`h-[100dvh] transition-all ${
              sidebar_minimized ? "w-0 hidden" : "w-60 min-w-[200px] max-w-lg flex flex-1 flex-col "
            }`}
            style={{ width: `${organizer_width}px` }}
          >
            <div id="WorkspaceSidebar" className="flex flex-col gap-1">
              <div
                id="Workspace"
                className="flex flex-row bg-zinc-800 px-4 h-10 rounded-md border border-zinc-900/50 border-t-transparent"
              >
                <div className="flex flex-grow items-center font-semibold text-sm text-zinc-300 rounded-md">
                  {_.find(user_state.workspaces, { id: workspace_id })?.name}
                </div>
                <Link className="flex items-center" to={`/c/${workspace_id}/settings`}>
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
                      active_sidebar_tab === tab.id ? "tab-active text-zinc-200" : "text-zinc-500"
                    }`}
                    onClick={tab.onClick}
                    data-tip={tab.name}
                  >
                    <div
                      className={`flex w-7 h-7 rounded justify-center items-center saturate-0 transition-all ${
                        active_sidebar_tab === tab.id
                          ? " text-zinc-200 bg-zinc-900/70 border-t border-t-zinc-700/70 saturate-100 contrast-100 "
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
              className={`px-2 bg-zinc-800 flex flex-grow mb-1 rounded-b-md border border-zinc-900/50 border-t-transparent`}
            >
              <Switch fallback={""}>
                <Match when={active_sidebar_tab === "sessions"}>
                  <SessionOrganizer app_state={app_state} user_state={user_state} />
                </Match>
                <Match when={active_sidebar_tab === "data"}>
                  <DataOrganizer />
                </Match>
                <Match when={["members", "market"].indexOf(active_sidebar_tab) !== -1}>
                  <div className="flex flex-col w-full h-full align-center items-center justify-center flex-grow text-zinc-400 font-semibold">
                    <Lottie animationData={WorkingOnIt}></Lottie>
                    <div className="text-md text-center">Coming soon&trade;</div>
                  </div>
                </Match>
              </Switch>
            </div>
          </div>
        </Resizable>
      </div>
      <div id="View" className="flex flex-1 bg-zinc-850 m-0.5">
        <Outlet />
      </div>
    </div>
  )
}
