import { GroupS, WorkspaceS } from "@/data/schemas/workspace"
import _ from "lodash"
import { z } from "zod"
import { RxDotsHorizontal, RxPlus } from "react-icons/rx"
import {
  MdCheck,
  MdClose,
  MdOutlineKeyboardArrowDown,
  MdOutlineKeyboardArrowRight,
} from "react-icons/md"
import { Link, useFetcher, useNavigate } from "react-router-dom"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import AppStateActions from "@/data/actions/app"
import { useEffect, useState } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import UserActions from "@/data/actions/user"
import { fieldFocus } from "@/libraries/field_focus"
import { useHotkeys } from "react-hotkeys-hook"
import { PiChatCircleDotsBold } from "react-icons/pi"

// @ts-ignore
import EasyEdit from "react-easy-edit"
import { getOS } from "@/libraries/utilities"
import { emit, query } from "@/libraries/events"
import { useEvent } from "@/components/hooks/useEvent"
import useMemory from "@/components/hooks/useMemory"
import { mAppT } from "@/data/schemas/memory"
import { OpenSessionS } from "@/data/schemas/app"
import { getMemoryState } from "@/libraries/memory"

type GroupT = z.infer<typeof GroupS>
type LoaderT = { app_state: AppStateT; user_state: UserT }

export default function GroupsTree({ groups }: { groups: GroupT[] }) {
  // const { user_state } = useLoaderData() as LoaderT
  const user_state = useMemory<UserT>({ id: "user" })
  const app_state = useMemory<AppStateT>({ id: "appstate" })
  if (!user_state || !app_state) return null

  const [field_edit_id, setFieldEditId] = useState("")
  const fetcher = useFetcher()

  const mem_app: mAppT = useMemory({ id: "app" })
  const { workspace_id, session_id } = mem_app
  const navigate = useNavigate()

  const toggleFolder = ({
    folder_id,
    group_id,
  }: {
    group_id: string
    folder_id: string
  }) => {
    // check if folder is already open
    const open_folder = _.find(app_state.open_folders, { folder_id })
    if (open_folder) {
      // if it is, close it
      const new_open_folders: any = app_state.open_folders.filter(
        (open_folder) => open_folder.folder_id !== folder_id,
      )
      AppStateActions.updateAppState({
        open_folders: new_open_folders,
      })
    } else {
      // if it isn't, open it
      AppStateActions.updateAppState({
        open_folders: [
          ...app_state.open_folders,
          { _v: 1, folder_id, group_id, workspace_id: workspace_id || "" },
        ],
      })
    }
    // navigate(`/c/${workspace_id}/${session_id}`)
  }

  const updateGroup = async ({
    name,
    group_id,
  }: {
    name: string
    group_id: string
  }) => {
    await UserActions.renameItem({
      new_name: name,
      group_id,
    })

    // navigate(`/c/${workspace_id}/${session_id}`)
  }
  const updateFolder = async ({
    name,
    group_id,
    folder_id,
  }: {
    name: string
    group_id: string
    folder_id: string
  }) => {
    await UserActions.renameItem({
      new_name: name,
      group_id,
      folder_id,
    })

    // navigate(`/c/${workspace_id}/${session_id}`)
  }
  const updateSession = async ({
    name,
    group_id,
    folder_id,
    session_id,
  }: {
    name: string
    group_id: string
    folder_id: string
    session_id: string
  }) => {
    await UserActions.renameItem({
      new_name: name,
      group_id,
      folder_id,
      session_id,
    })

    // navigate(`/c/${workspace_id}/${session_id}`)
  }

  const EditComponent = function (props: any) {
    return (
      <input
        onChange={(e) => {
          // @ts-ignore
          props.setParentValue(e.target.value)
        }}
        className="w-full text-zinc-200 rounded border-0 bg-transparent italic"
        value={props.value}
      />
    )
  }

  const resetFieldEditId = () => {
    setFieldEditId("")
  }

  useEffect(() => {
    if (field_edit_id) {
      setTimeout(() => {
        const e: HTMLInputElement | null = document.querySelector(
          `div[data-id="${field_edit_id}"] input`,
        )
        if (e) {
          e.focus()
          e.select()
        }
      }, 100)
    }
  }, [field_edit_id])

  // keyboard shortcut for renaming a session
  useHotkeys(getOS() === "macos" ? "ctrl+r" : "alt+r", () => {
    if (field_edit_id || !session_id) return
    setFieldEditId(session_id || "")
  })

  /* useEvent({
    name: [
      "sessions.addSession.done",
      "sessions.updateSession.done",
      "sessions.updateSessions.done",
      "app.changeActiveSession.done",
      "app.removeOpenSession.done",
      "app.updateAppState.done",
      "user.addGroup.done",
      "user.addFolder.done",
      "user.deleteGroup.done",
      "user.deleteFolder.done",
      "user.renameItem.done",
      "user.updateUser.done",
    ],
    action: () => {
      updateGroups()
    },
  })

  useEvent({
    name: "store/update",
    target: "appstate",
    action: () => {
      updateGroups()
    },
  })

  useEvent({
    name: "store/update",
    target: "user",
    action: () => {
      updateGroups()
    },
  }) */

  useEvent({
    name: "user.addGroup.done",
    action: (data: any) => {
      const { group } = data
      setFieldEditId(group.id)
    },
  })

  useEvent({
    name: "user.addFolder.done",
    action: (data: any) => {
      const { folder } = data
      setFieldEditId(folder.id)
    },
  })
  const workspace = _.find(user_state?.workspaces, { id: workspace_id })
  if (!workspace) return null
  return (
    <div className="OrganizerTree flex w-full flex-col gap-8">
      {workspace.groups.map((group) => (
        <div key={group.id} className="OrganizerGroup flex flex-col gap-2">
          <div className="flex flex-row items-center">
            <div
              className="flex flex-1 cursor-pointer items-center text-zinc-500 text-xs font-bold ml-1 ph-no-capture"
              data-id={group.id}
            >
              <EasyEdit
                type="text"
                editMode={field_edit_id === group.id}
                onSave={(name: any) => {
                  resetFieldEditId()
                  updateGroup({ group_id: group.id, name })
                  fieldFocus({ selector: `#input-${session_id}` })
                }}
                onCancel={resetFieldEditId}
                onBlur={resetFieldEditId}
                cancelOnBlur={true}
                saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                cancelButtonLabel={
                  <MdClose className="w-3 h-3  text-zinc-200" />
                }
                onHoverCssClass={``}
                value={group.name}
                allowEdit={false}
                editComponent={<EditComponent />}
              />
            </div>
            <div
              className={`flex cursor-pointer flex-row gap-2 items-center justify-center mr-1 ${
                field_edit_id === group.id ? "hidden" : ""
              }`}
            >
              <div
                className="tooltip tooltip-bottom flex items-center justify-center"
                data-tip="Modify group..."
              >
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="outline-none">
                      <RxDotsHorizontal className="w-3 h-3 text-zinc-400" />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="bg-zinc-800 border border-zinc-600 text-zinc-300 rounded-md shadow-lg shadow-zinc-900 outline-none"
                      sideOffset={5}
                    >
                      <DropdownMenu.Item className="text-xs pl-4 pr-6 py-2 outline-none cursor-pointer hover:text-zinc-200">
                        <button
                          className="outline-none"
                          onClick={() => setFieldEditId(group.id)}
                        >
                          Rename
                        </button>
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />

                      {(
                        _.size(
                          _.find(user_state?.workspaces, { id: workspace_id })
                            ?.groups || [],
                        ) > 1
                      ) ?
                        <DropdownMenu.Item
                          className="text-xs pl-4 pr-6 py-2 outline-none cursor-pointer hover:text-zinc-200"
                          onClick={() => {
                            emit({
                              type: "user.deleteGroup",
                              data: {
                                workspace_id,
                                group_id: group.id,
                              },
                            })
                          }}
                        >
                          Delete
                        </DropdownMenu.Item>
                      : null}

                      <DropdownMenu.Arrow className="fill-zinc-600 border-zinc-600" />
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
              <div
                className="tooltip tooltip-bottom flex items-center justify-center"
                data-tip="Add new group or folder..."
              >
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="outline-none">
                      <RxPlus className="w-3 h-3 text-zinc-400" />
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="bg-zinc-800 border border-zinc-600 text-zinc-300 rounded-md shadow-lg shadow-zinc-900 outline-none"
                      sideOffset={5}
                    >
                      <DropdownMenu.Item
                        className="text-xs pl-4 pr-6 py-2 outline-none cursor-pointer hover:text-zinc-200"
                        onClick={() => {
                          emit({
                            type: "user.addGroup",
                            data: {
                              workspace_id: workspace_id,
                              name: "New group",
                            },
                          })
                        }}
                      >
                        Add new group...
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="text-xs pl-4 pr-6 py-2 outline-none cursor-pointer hover:text-zinc-200"
                        onClick={() => {
                          fetcher.submit(
                            {
                              workspace_id: workspace_id || "",
                              session_id: session_id || "",
                              group_id: group.id,
                              name: "New folder",
                            },
                            {
                              method: "PUT",
                              action: `/c/workspace/folder`,
                            },
                          )
                        }}
                      >
                        Add new folder...
                      </DropdownMenu.Item>
                      <DropdownMenu.Arrow className="fill-zinc-600 border-zinc-600" />
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>
          </div>
          {group.folders.map((folder) => (
            <div
              key={folder.id}
              className={`OrganizerFolder flex flex-1 flex-col`}
            >
              <div className="flex flex-row items-center pb-1 text-xs font-semibold text-zinc-400">
                <div
                  className={`flex h-5 items-center cursor-pointer`}
                  onClick={() => {
                    if (field_edit_id === folder.id) return
                    toggleFolder({
                      group_id: group.id,
                      folder_id: folder.id,
                    })
                  }}
                >
                  {(
                    app_state.open_folders.find(
                      (open_folder) => open_folder.folder_id === folder.id,
                    )
                  ) ?
                    <MdOutlineKeyboardArrowDown className="w-4 h-4 flex flex-row items-center" />
                  : <MdOutlineKeyboardArrowRight className="w-4 h-4 flex flex-row items-center" />
                  }
                </div>
                <div
                  className="flex flex-1 h-5 items-center cursor-pointer text-zinc-400 font-xs ph-no-capture"
                  data-id={folder.id}
                  onClick={() => {
                    if (field_edit_id === folder.id) return
                    toggleFolder({
                      group_id: group.id,
                      folder_id: folder.id,
                    })
                  }}
                >
                  <EasyEdit
                    type="text"
                    editMode={field_edit_id === folder.id}
                    onSave={(name: any) => {
                      resetFieldEditId()
                      updateFolder({
                        group_id: group.id,
                        folder_id: folder.id,
                        name,
                      })
                      fieldFocus({ selector: `#input-${session_id}` })
                    }}
                    onCancel={resetFieldEditId}
                    onBlur={resetFieldEditId}
                    cancelOnBlur={true}
                    saveButtonLabel={
                      <MdCheck className="w-3 h-3 text-zinc-200" />
                    }
                    cancelButtonLabel={
                      <MdClose className="w-3 h-3  text-zinc-200" />
                    }
                    value={folder.name}
                    editComponent={<EditComponent />}
                    onHoverCssClass={``}
                    allowEdit={false}
                  />
                </div>
                <div
                  className={`flex cursor-pointer ${
                    field_edit_id === folder.id ? "hidden" : ""
                  }`}
                >
                  <div className="flex cursor-pointer flex-row gap-2 items-center justify-center mr-1">
                    <div
                      className="tooltip tooltip-bottom flex items-center justify-center"
                      data-tip="Modify folder..."
                    >
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="outline-none">
                            <RxDotsHorizontal className="w-3 h-3" />
                          </button>
                        </DropdownMenu.Trigger>

                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="bg-zinc-800 border border-zinc-600 text-zinc-300 rounded-md shadow-lg shadow-zinc-900 outline-none transition-all"
                            sideOffset={5}
                          >
                            <DropdownMenu.Item className="text-xs pl-4 pr-6 py-2 outline-none cursor-pointer hover:text-zinc-200">
                              <button
                                className="outline-none"
                                onClick={() => setFieldEditId(folder.id)}
                              >
                                Rename
                              </button>
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />

                            {group.folders.length > 1 ?
                              <DropdownMenu.Item
                                className="text-xs pl-4 pr-6 py-2 outline-none cursor-pointer hover:text-zinc-200"
                                onClick={() => {
                                  fetcher.submit(
                                    {
                                      workspace_id: workspace_id || "",
                                      group_id: group.id,
                                      folder_id: folder.id,
                                    },
                                    {
                                      method: "DELETE",
                                      action: "/c/workspace/folder",
                                    },
                                  )
                                }}
                              >
                                Delete
                              </DropdownMenu.Item>
                            : null}

                            <DropdownMenu.Arrow className="fill-zinc-600 border-zinc-600" />
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                    <div
                      className="tooltip tooltip-bottom flex items-center justify-center"
                      data-tip="Add new session (ALT+T)"
                    >
                      <button
                        onClick={async () => {
                          const sess: any = await query({
                            type: "sessions.addSession",
                            data: {
                              workspace_id: workspace_id,
                              group_id: group.id,
                              folder_id: folder.id,
                            },
                          })
                          navigate(`/c/${workspace_id}/${sess.session.id}`)
                          /*  fetcher.submit(
                            {
                              workspace_id: workspace_id || "",
                              session_id: session_id || "",
                              group_id: group.id,
                              folder_id: folder.id,
                            },
                            {
                              method: "PUT",
                              action: `/c/workspace/session`,
                            },
                          ) */
                        }}
                      >
                        <RxPlus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {(
                app_state.open_folders.find(
                  (open_folder) => open_folder.folder_id === folder.id,
                )
              ) ?
                folder.sessions && folder.sessions.length > 0 ?
                  folder.sessions?.map((session) => (
                    <div
                      key={session.id}
                      className={`OrganizerSession flex flex-1 items-center flex-row pl-3 h-5 py-0 mb-0.5 border border-transparent hover:bg-zinc-900/50 hover:border-zinc-900 hover:border-t-zinc-700/70 rounded transition-all ${
                        session.id === session_id ? "" : ""
                      }`}
                      data-id={session.id}
                    >
                      <div className="flex items-center">
                        <PiChatCircleDotsBold
                          className={`w-4 h-4 pr-1 ${
                            session.id === session_id ?
                              " text-zinc-100"
                            : "text-zinc-500 "
                          }`}
                        />
                      </div>
                      <div
                        className={`flex flex-1 h-5 relative items-center cursor-pointer text-xs font-semibold text-ellipsis overflow-hidden ph-no-capture transition-all ${
                          session.id === session_id ?
                            " text-zinc-100"
                          : "text-zinc-400  hover:text-zinc-100"
                        }`}
                        onClick={async () => {
                          await query({
                            type: "sessions.openSession",
                            data: { session_id: session.id, workspace_id, group_id: group.id, folder_id: folder.id },
                          })
                          emit({
                            type: "sessions/change",
                            data: { session_id: session.id },
                          })
                          navigate(`/c/${workspace_id}/${session.id}`)
                        }}
                      >
                        <EasyEdit
                          type="text"
                          editMode={field_edit_id === session.id}
                          onSave={(name: any) => {
                            resetFieldEditId()
                            updateSession({
                              group_id: group.id,
                              folder_id: folder.id,
                              session_id: session.id,
                              name,
                            })
                            fieldFocus({ selector: `#input-${session_id}` })
                            return false
                          }}
                          onCancel={resetFieldEditId}
                          onBlur={resetFieldEditId}
                          cancelOnBlur={true}
                          saveButtonLabel={
                            <MdCheck className="w-3 h-3 text-zinc-200" />
                          }
                          cancelButtonLabel={
                            <MdClose className="w-3 h-3  text-zinc-200" />
                          }
                          value={session.name}
                          editComponent={<EditComponent />}
                          onHoverCssClass={``}
                          allowEdit={false}
                        />
                        {/* <div className="absolute inset-y-0 right-0 w-8 z-10 bg-gradient-to-l from-zinc-800 group-hover:from-zinc-700"></div> */}
                      </div>
                      <div
                        className={`flex cursor-pointer flex-row gap-2 items-center justify-center mr-2 h-6 ${
                          field_edit_id === session.id ? "hidden" : ""
                        }`}
                      >
                        <div
                          className="tooltip tooltip-bottom"
                          data-tip="Modify session..."
                        >
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button className="outline-none">
                                <RxDotsHorizontal
                                  className={`w-3 h-3 flex flex-1 items-center cursor-pointer font-semibold text-sm ${
                                    session.id === session_id ?
                                      " text-zinc-100"
                                    : "text-zinc-400"
                                  }`}
                                />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-md shadow-lg shadow-zinc-900 outline-none"
                                sideOffset={5}
                              >
                                <DropdownMenu.Item className="text-xs pl-4 pr-6 py-2 outline-none cursor-pointer hover:text-zinc-200">
                                  <button
                                    className="outline-none"
                                    onClick={() => setFieldEditId(session.id)}
                                  >
                                    Rename
                                  </button>
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="text-xs pl-4 pr-6 py-2 outline-none cursor-pointer hover:text-zinc-200"
                                  onClick={async () => {
                                    let next_session_id = ""
                                    const mem_app = getMemoryState<mAppT>({
                                      id: "app",
                                    })

                                    if (
                                      session.id ===
                                      (mem_app && mem_app?.session_id)
                                    ) {
                                      // const { UserState, AppState } =
                                      //   await initLoaders()
                                      // const user_state: UserT =
                                      //   await UserState.get()
                                      // const app_state: AppStateT =
                                      //   await AppState.get()
                                      const active_workspace =
                                        user_state.workspaces.find(
                                          (ws) => ws.id === workspace_id,
                                        ) as z.infer<typeof WorkspaceS>
                                      if (
                                        !workspace_id ||
                                        active_workspace === null
                                      )
                                        return

                                      const workspace_open_sessions =
                                        _(app_state.open_sessions)
                                          .filter((open_session: any) => {
                                            // get session data from workspaces.groups.folders.sessions
                                            const s = _.find(
                                              active_workspace.groups.flatMap(
                                                (g) =>
                                                  g.folders.flatMap(
                                                    (f) => f.sessions,
                                                  ),
                                              ),
                                              { id: open_session.session_id },
                                            )

                                            if (!s) return false
                                            return true
                                          })
                                          .filter(
                                            (
                                              session: z.infer<
                                                typeof OpenSessionS
                                              >,
                                            ) =>
                                              session.workspace_id ===
                                              workspace_id,
                                          )
                                          .uniqBy("session_id")
                                          .value() || []
                                      const session_index = _.findIndex(
                                        workspace_open_sessions,
                                        { session_id },
                                      )
                                      if (session_index !== -1) {
                                        const next_session =
                                          workspace_open_sessions[
                                            session_index === 0 ?
                                              session_index + 1
                                            : session_index - 1
                                          ]
                                        if (next_session)
                                          next_session_id =
                                            next_session.session_id
                                      }
                                    }
                                    await query({
                                      type: "sessions.deleteSession",
                                      data: {
                                        folder_id: folder.id || "",
                                        group_id: group.id || "",
                                        workspace_id: workspace_id || "",
                                        session_id: session.id || "",
                                      },
                                    })
                                    // if (next_session_id)
                                    navigate(
                                      `/c/${workspace_id}/${
                                        next_session_id ||
                                        (mem_app && mem_app?.session_id)
                                      }`,
                                    )
                                  }}
                                >
                                  Delete
                                </DropdownMenu.Item>
                                <DropdownMenu.Arrow className="fill-zinc-600 border-zinc-600" />
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </div>
                      </div>
                    </div>
                  ))
                : <div className="OrganizerSession flex flex-1 flex-row pl-4 text-xs font-semibold text-zinc-400">
                    No sessions
                  </div>

              : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
