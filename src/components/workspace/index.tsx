import { useEffect, useState } from "react"
import { Match, Switch } from "react-solid-flow"
import _ from "lodash"
import { Outlet, useLoaderData, useNavigate, useParams } from "react-router-dom"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import Organizer from "@/components/workspace/sessions/organizer"
import { Link } from "react-router-dom"
import { MdSettingsSuggest } from "react-icons/md"
import MembersIcon from "@/assets/icons/members.svg"
import CabinetIcon from "@/assets/icons/cabinet.svg"
import Comment1Icon from "@/assets/icons/comment-1.svg"
import IntersectIcon from "@/assets/icons/intersect.svg"
import { fieldFocus } from "@/components/libraries/fieldFocus"

type LoaderT = { app_state: AppStateT; user_state: UserT }

export default function Workspace() {
  const { app_state, user_state } = useLoaderData() as LoaderT
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
      navigate("/conductor/")
    }
  }, [workspace_id])

  const [active_sidebar_tab, setActiveSidebarTab] = useState("organizer")
  const sidebar_tab_class = "h-5 w-5 hover:text-zinc-200 contrast-150"
  const sidebar_tabs = [
    {
      id: "organizer",
      onClick: () => setActiveSidebarTab("organizer"),
      icon: <img src={Comment1Icon} className={sidebar_tab_class} />,
    },
    {
      id: "data",
      onClick: () => setActiveSidebarTab("data"),
      icon: <img src={CabinetIcon} className={sidebar_tab_class} />,
    },
    {
      id: "members",
      onClick: () => setActiveSidebarTab("members"),
      icon: <img src={MembersIcon} className={sidebar_tab_class} />,
    },
    {
      id: "market",
      onClick: () => setActiveSidebarTab("market"),
      icon: <img src={IntersectIcon} className={sidebar_tab_class} />,
    },
  ]

  return (
    <div className="flex flex-1 bg-zinc-900">
      <div id="Modes" className=" bg-zinc-800/90 border-r border-l border-zinc-700/50 z-20">
        <div id="Workspace" className="flex flex-row bg-zinc-900 px-4 h-10">
          <div className="flex flex-grow items-center font-semibold text-sm text-zinc-300">
            {_.find(user_state.workspaces, { id: workspace_id })?.name}
          </div>
          <Link className="flex items-center" to={`/conductor/${workspace_id}/settings`}>
            <MdSettingsSuggest className="w-4 h-4 text-zinc-400" />
          </Link>
        </div>
        <div className="tabs flex flex-row h-12 justify-center items-center">
          {sidebar_tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex flex-1 tab px-2 ${
                active_sidebar_tab === tab.id ? "tab-active text-zinc-200" : "text-zinc-500"
              }`}
              onClick={tab.onClick}
            >
              <div
                className={`flex w-7 h-7 rounded justify-center items-center saturate-0 ${
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
        <div className="px-2 w-60 min-w-min max-w-lg z-10">
          <Switch fallback={""}>
            <Match when={active_sidebar_tab === "organizer"}>
              <Organizer app_state={app_state} user_state={user_state} />
            </Match>
            <Match when={["data", "members", "market"].indexOf(active_sidebar_tab) !== -1}>
              <div className="flex flex-col align-center items-center justify-center flex-grow text-zinc-600 font-semibold">
                TBD
              </div>
            </Match>
          </Switch>
        </div>
      </div>
      <div id="View" className="flex flex-1 bg-zinc-850">
        <Outlet />
      </div>
    </div>
  )
}
