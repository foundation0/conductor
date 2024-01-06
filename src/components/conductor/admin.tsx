import { UserT } from "@/data/loaders/user"
import { getModules } from "@/modules"
import { useLoaderData, useNavigate } from "react-router-dom"
import UserActions from "@/data/actions/user"
import { keys } from "idb-keyval"
import { getActiveUser } from "@/libraries/active_user"
import { error } from "@/libraries/logging"
import { initLoaders } from "@/data/loaders"
import _ from "lodash"
import useMemory from "../hooks/useMemory"
import { DataT } from "@/data/schemas/data"
import { emit, query } from "@/libraries/events"
import { DataRefT } from "@/data/schemas/workspace"
import { initial as initialAIs } from "@/data/loaders/ai"

export function Admin() {
  const { user_state } = useLoaderData() as { user_state: UserT }
  const navigate = useNavigate()

  const mem = useMemory<{
    orphan_data: any[]
    selected_workspace_id: string
    next_action: Function
  }>({
    id: "internal::admin",
    state: {
      next_action: () => {},
      orphan_data: [],
      selected_workspace_id: "",
    },
  })

  async function resetModules() {
    const mods = await getModules({ factory_state: true })

    await UserActions.updateUser({
      ...user_state,
      modules: {
        installed: mods,
      },
    })
    navigate("/c/internal::admin")
    alert("Modules reset to default")
  }

  async function resetExperiences() {
    await UserActions.updateUser({
      ...user_state,
      experiences: [],
    })
    navigate("/c/internal::admin")
    alert("Experiences reset to default")
  }

  async function resetAIs() {
    await UserActions.updateUser({
      ...user_state,
      ais: [
        {
          id: "c1",
          status: 'active',
          last_used: new Date().getTime(),
        },
      ],
    })
    navigate("/c/internal::admin")
    alert("AIs reset to default")
  }

  async function getAllLocalData() {
    const all_keys = await keys()

    const username = user_state?.meta?.username
    if (!username) return error({ message: "No user logged in" })
    const user_keys = all_keys.filter((key) =>
      String(key).startsWith(`${username}:data`),
    )
    const user_data = await Promise.all(
      user_keys.map(async (key) => {
        const { DataState } = await initLoaders()
        const data = await DataState({
          id: String(key).replace(`${username}:data:`, ""),
        })
        return data.get()
      }),
    )
    // get all data referenced in the workspaces
    const workspace_data = _(user_state.workspaces)
      .map("data")
      .flattenDeep()
      .value()
    const orphans = _.differenceBy(user_data, workspace_data, "id")
    // console.log(user_data, workspace_data, orphans)
    if (orphans.length === 0) return alert("No orphans found")
    mem.orphan_data = orphans
  }
  return (
    <div className="Settings content flex flex-col flex-grow items-center m-10">
      <div className="flex flex-col w-full justify-start items-start max-w-2xl">
        <div className="text-2xl text-zinc-400 shadow font-semibold mb-4">
          Admin (use with caution)
        </div>
        <div className=" text-zinc-400 shadow font-semibold text-lg mb-3 w-full border-b border-b-zinc-700">
          Modules
        </div>
        <div className="flex flex-row w-full">
          <div className="flex flex-col flex-shrink mr-4 justify-center">
            Reset modules to default
          </div>
          <div className="flex flex-grow flex-1 justify-end">
            <button
              className="p-btn-primary rounded"
              onClick={() => resetModules()}
            >
              Reset modules
            </button>
          </div>
        </div>
        <div className="flex flex-row w-full">
          <div className="flex flex-col flex-shrink mr-4 justify-center">
            Reset experiences to default
          </div>
          <div className="flex flex-grow flex-1 justify-end">
            <button
              className="p-btn-primary rounded"
              onClick={() => resetExperiences()}
            >
              Reset experiences
            </button>
          </div>
        </div>
        <div className="flex flex-row w-full">
          <div className="flex flex-col flex-shrink mr-4 justify-center">
            Reset AIs to default
          </div>
          <div className="flex flex-grow flex-1 justify-end">
            <button
              className="p-btn-primary rounded"
              onClick={() => resetAIs()}
            >
              Reset AIs
            </button>
          </div>
        </div>
        <div className="flex flex-col w-full">
          <div className="flex flex-row w-full">
            <div className="flex flex-col flex-shrink mr-4 justify-center">
              Find orphan data
              <small>
                Warning: this will sync *all* data found locally, so if you have
                a lot, this might take some time.
              </small>
            </div>
            <div className="flex flex-grow flex-1 justify-end">
              <button
                className="p-btn-primary rounded"
                onClick={() => getAllLocalData()}
              >
                Scan data
              </button>
            </div>
          </div>
          {mem.orphan_data.length > 0 && (
            <div className="flex flex-col w-full mt-3">
              <div className="text-sm font-semibold">Orphan data found</div>
              {mem.orphan_data.map((data: DataT) => {
                return (
                  <div
                    key={data.id}
                    id={`orphan-data-${data.id}`}
                    className="flex flex-row flex-shrink mt-2 hover:bg-zinc-800/50 rounded-md p-2"
                  >
                    <div className="flex flex-row items-center flex-1 text-xs">
                      {data?.meta?.name || data?.id}
                    </div>
                    <div className="flex flex-col flex-1 items-end justify-center text-xs">
                      <span
                        className="link"
                        onClick={async () => {
                          await query({
                            type: "data.delete",
                            data: {
                              id: data.id,
                            },
                          })
                          await query({
                            type: "vectors.delete",
                            data: {
                              id: data.id,
                            },
                          })
                          document
                            .getElementById(`orphan-data-${data.id}`)
                            ?.remove()
                        }}
                      >
                        delete
                      </span>
                      <span
                        className="link"
                        onClick={() => {
                          mem.next_action = async () => {
                            const data_ref: DataRefT = {
                              id: data.id,
                              name:
                                data.meta.name ||
                                data.meta.filename ||
                                "Unnamed",
                              mime: data.data.mime,
                              created_at: new Date().getTime(),
                              filename: data.meta.filename || "unnamed",
                            }
                            await query({
                              type: "user.addDataToWorkspace",
                              data: {
                                data: data_ref,
                                workspace_id: mem.selected_workspace_id,
                              },
                            })
                            document
                              .getElementById(`orphan-data-${data.id}`)
                              ?.remove()
                          }
                          // @ts-ignore
                          document
                            .querySelector("#workspace_selector")
                            // @ts-ignore
                            ?.showModal()
                        }}
                      >
                        add to workspace
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <dialog id="workspace_selector">
            <div className="flex flex-col bg-zinc-800 p-5 rounded-lg">
              <div className="text-md">Select workspace</div>
              <select className="select" id="workspace_selector_select">
                {user_state.workspaces.map((workspace) => {
                  return <option value={workspace.id}>{workspace?.name}</option>
                })}
              </select>
              <button
                className="btn"
                onClick={() => {
                  // @ts-ignore
                  mem.selected_workspace_id = document.getElementById(
                    "workspace_selector_select",
                    // @ts-ignore
                  )?.value
                  mem.next_action && mem.next_action()
                  // @ts-ignore
                  document.querySelector("#workspace_selector")?.close()
                }}
              >
                select
              </button>
            </div>
          </dialog>
        </div>
      </div>
    </div>
  )
}
