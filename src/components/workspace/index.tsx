import { useEffect, useState } from "react"
import { Match, Switch } from "react-solid-flow"
import { RiChat2Fill } from "react-icons/ri"
import _ from "lodash"
import { Outlet, useLoaderData, useNavigate, useParams } from "react-router-dom"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import Organizer from "@/components/workspace/sessions/organizer"
import { Link } from "react-router-dom"
import { MdSettingsSuggest } from "react-icons/md"
import { FaFolderOpen } from "react-icons/fa"
import { HiUsers } from "react-icons/hi"
import { AiFillAppstore } from "react-icons/ai"

type LoaderT = { app_state: AppStateT; user_state: UserT }

export default function Workspace() {
  const { app_state, user_state } = useLoaderData() as LoaderT
  const workspace_id = useParams().workspace_id
  const session_id = useParams().session_id
  const navigate = useNavigate()

  // check that workspace exists
  useEffect(() => {
    if (!_.find(user_state.workspaces, { id: workspace_id })) {
      navigate("/conductor")
    }
  }, [workspace_id])

  const [active_sidebar_tab, setActiveSidebarTab] = useState("organizer")
  const sidebar_tab_class = "h-4 w-4 hover:text-zinc-200"
  const sidebar_tabs = [
    {
      id: "organizer",
      onClick: () => setActiveSidebarTab("organizer"),
      icon: <RiChat2Fill className={sidebar_tab_class} />,
    },
    {
      id: "data",
      onClick: () => setActiveSidebarTab("data"),
      icon: <FaFolderOpen className={sidebar_tab_class} />,
    },
    {
      id: "members",
      onClick: () => setActiveSidebarTab("members"),
      icon: <HiUsers className={sidebar_tab_class} />,
    },
    {
      id: "market",
      onClick: () => setActiveSidebarTab("market"),
      icon: <AiFillAppstore className={sidebar_tab_class} />,
    },
  ]

  return (
    <div className="flex flex-1">
      <div id="Modes" className="w-52 max-w-52 bg-zinc-800 border-r border-l border-zinc-700">
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
              className={`flex flex-1 tab px-2  ${
                active_sidebar_tab === tab.id ? "tab-active text-zinc-200" : "text-zinc-500"
              }`}
              onClick={tab.onClick}
            >
              {tab.icon}
            </div>
          ))}
        </div>
        <div className="px-4">
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
