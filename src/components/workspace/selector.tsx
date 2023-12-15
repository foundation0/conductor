import { HiPlus } from "react-icons/hi"
import { For } from "react-solid-flow"
import PromptIcon from "@/assets/prompt.svg"
import { Location, useLoaderData, useLocation } from "react-router-dom"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import AppStateActions from "@/data/actions/app"
import { Link } from "react-router-dom"
import { useEffect } from "react"
import _ from "lodash"
import { BsDiscord } from "react-icons/bs"
import { mAppT } from "@/data/schemas/memory"
import useMemory from "../hooks/useMemory"
import ShapesIcon from "@/assets/icons/shapes.svg"
import { FaUser } from "react-icons/fa"

export default function WorkspaceSelector() {
  const { app_state, user_state } = useLoaderData() as { app_state: AppStateT; user_state: UserT }
  if (!app_state || !user_state) return null
  const location: Location = useLocation()

  // const workspace_id = useParams().workspace_id
  const mem_app: mAppT = useMemory({ id: "app" })
  const { workspace_id, session_id } = mem_app
  useEffect(() => {
    if (!workspace_id) return
    AppStateActions.updateAppState({ active_workspace_id: workspace_id })
  }, [workspace_id])

  return (
    <div id="WorkspaceSelector" className="flex">
      <div className="flex w-fit">
        <div className="flex flex-col h-full justify-center items-center pl-2 pr-1">
          <div className="Logo flex items-center justify-center h-12">
            <img src={PromptIcon} className="w-4 h-4 opacity-60" />
          </div>
          <div id="Workspaces" className="flex flex-col gap-2 flex-1">
            <For each={user_state.workspaces}>
              {(workspace) => {
                let session_id = ""
                // if (!app_state.active_sessions[workspace.id]) {
                // session_id?.match(/^0x/)
                // if not, get the first session id from the workspace's first group's first folder
                // use lodash chaining
                session_id = _.chain(workspace.groups)
                  .first()
                  .get("folders")
                  .first()
                  .get("sessions")
                  .first()
                  .get("id")
                  .value()

                /* session_id =
                    _.first(
                      _.first(_.first(_.find(user_state.workspaces, { id: workspace_id })?.groups)?.folders)?.sessions
                    )?.id || "" */
                // } else {
                //   session_id = app_state.active_sessions[workspace.id].session_id
                // }
                return (
                  <div className="tooltip tooltip-right relative" data-tip={`Open ${workspace.name}`}>
                    {location.pathname.startsWith(`/c/${workspace.id}`) && (
                      <div className="absolute -left-3 top-1/4 h-1/2 flex justify-center items-center bg-zinc-300 w-2 rounded-full"></div>
                    )}
                    <Link
                      to={`/c/${workspace.id}/${session_id}`}
                      className={`flex items-center justify-center w-12 h-12 p-0 px-0 rounded-xl overflow-hidden font-semibold text-zinc-500 transition-all ${
                        location.pathname.startsWith(`/c/${workspace.id}`) ? "bg-zinc-800 " : "cursor-pointer opacity-50 hover:opacity-100"
                      }`}
                    >
                      {workspace.icon ? (
                        <img src={workspace.icon} className="object-cover h-full text-zinc-500" />
                      ) : (
                        workspace.name.slice(0, 1).toUpperCase()
                      )}
                    </Link>
                  </div>
                )
              }}
            </For>
            <div className="tooltip tooltip-right" data-tip="Create a new workspace">
              <Link
                className="flex items-center justify-center w-12 h-12 p-0 px-0 rounded-xl cursor-pointer border-zinc-800 border-2 border-dashed text-zinc-600 hover:bg-zinc-850 hover:text-zinc-500 hover:border-zinc-500 transition-all"
                to={`workspace/create`}
              >
                <HiPlus className="w-3 h-3 " />
              </Link>
            </div>
          </div>
          <div id="GlobalActions" className="flex flex-col justify-center items-center gap-3 mb-4">
            <div className="flex rounded-full justify-center items-center">
              <div className="tooltip tooltip-right" data-tip="Questions? Problems? Ideas? Join our Discord!">
                <Link
                  to={`https://discord.gg/PFMtbdrvXw`}
                  target="_blank"
                  className="flex items-center justify-center w-10 h-10 p-0 px-0 rounded-xl cursor-pointer border-zinc-800 border-2  hover:bg-zinc-850  hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  <BsDiscord className="w-4 h-4 " />
                </Link>
              </div>
            </div>
            <div className="flex rounded-full justify-center items-center">
              <div className="tooltip tooltip-right" data-tip="View available and installed modules">
                <Link
                  to={`/c/modules`}
                  className={`flex items-center justify-center w-10 h-10 p-0 px-0 rounded-xl cursor-pointer border-zinc-800 border-2  hover:bg-zinc-850 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 saturate-0 hover:saturate-100 transition-all 
                  ${location.pathname === "/c/modules" ? "saturate-100 border-zinc-500" : ""}`}
                >
                  <div className="">
                    <img src={ShapesIcon} className="w-6 h-6 " />
                  </div>
                </Link>
              </div>
            </div>
            <div className="flex rounded-full justify-center items-center">
              <div className="tooltip tooltip-right h-full" data-tip="Global settings and your profile">
                <Link
                  to={`/c/settings`}
                  className={`flex items-center justify-center w-10 h-10 p-0 px-0 rounded-xl cursor-pointer border-zinc-800 border-2  hover:bg-zinc-850 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 saturate-0 hover:saturate-100 transition-all 
                  ${location.pathname === "/c/settings" ? "saturate-100 border-zinc-500" : ""}`}
                >
                  {_.get(user_state, "meta.profile_photos[0]") ? (
                    <img
                      src={_.get(user_state, "meta.profile_photos[0]")}
                      className={`rounded-xl object-cover h-full ${
                        location.pathname === "/c/settings" ? "opacity-100" : "opacity-50"
                      } hover:opacity-100`}
                    />
                  ) : (
                    <div className="w-10 h-10 flex justify-center items-center">
                      <FaUser className="w-4 h-4 " />
                    </div>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
