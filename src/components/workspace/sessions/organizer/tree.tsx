import { GroupS } from "@/data/schemas/workspace"
import _ from "lodash"
import { z } from "zod"
import { RxDotsHorizontal, RxPlus } from "react-icons/rx"
import { MdCheck, MdClose, MdOutlineKeyboardArrowDown, MdOutlineKeyboardArrowRight } from "react-icons/md"
import { RiHashtag } from "react-icons/ri"
import { Link, useFetcher, useLoaderData, useNavigate, useParams } from "react-router-dom"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import AppStateActions from "@/data/actions/app"
import { useEffect, useState } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import UserActions from "@/data/actions/user"
// @ts-ignore
import EasyEdit from "react-easy-edit"

type GroupT = z.infer<typeof GroupS>
type LoaderT = { app_state: AppStateT; user_state: UserT }

export default function GroupsTree({ groups }: { groups: GroupT[] }) {
  const { app_state, user_state } = useLoaderData() as LoaderT

  const [field_edit_id, setFieldEditId] = useState("")
  const fetcher = useFetcher()
  const workspace_id = useParams().workspace_id
  const session_id = useParams().session_id
  const navigate = useNavigate()

  const toggleFolder = ({ folder_id, group_id }: { group_id: string; folder_id: string }) => {
    // check if folder is already open
    const open_folder = _.find(app_state.open_folders, { folder_id })
    if (open_folder) {
      // if it is, close it
      const new_open_folders = app_state.open_folders.filter((open_folder) => open_folder.folder_id !== folder_id)
      AppStateActions.updateAppState({
        open_folders: new_open_folders,
      })
    } else {
      // if it isn't, open it
      AppStateActions.updateAppState({
        open_folders: [...app_state.open_folders, { _v: 1, folder_id, group_id, workspace_id: workspace_id || "" }],
      })
    }

    navigate(`/conductor/${workspace_id}/${session_id}`)
  }

  const updateGroup = async ({ name, group_id }: { name: string; group_id: string }) => {
    await UserActions.renameItem({
      new_name: name,
      group_id,
    })

    navigate(`/conductor/${workspace_id}/${session_id}`)
  }
  const updateFolder = async ({ name, group_id, folder_id }: { name: string; group_id: string; folder_id: string }) => {
    await UserActions.renameItem({
      new_name: name,
      group_id,
      folder_id,
    })

    navigate(`/conductor/${workspace_id}/${session_id}`)
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

    navigate(`/conductor/${workspace_id}/${session_id}`)
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
        const e: HTMLInputElement | null = document.querySelector(`div[data-id="${field_edit_id}"] input`)
        if (e) {
          e.focus()
          e.select()
        }
      }, 100)
    }
  }, [field_edit_id])

  return (
    <div className="OrganizerTree flex flex-1 flex-col gap-8">
      {groups.map((group) => (
        <div key={group.id} className="OrganizerGroup flex flex-1 flex-col gap-2">
          <div className="flex flex-row items-center">
            <div className="flex flex-1 cursor-pointer items-center text-zinc-500 text-xs font-bold ml-1" data-id={group.id}>
              <EasyEdit
                type="text"
                editMode={field_edit_id === group.id}
                onSave={(name: any) => {
                  resetFieldEditId()
                  updateGroup({ group_id: group.id, name })
                }}
                onCancel={resetFieldEditId}
                onBlur={resetFieldEditId}
                cancelOnBlur={true}
                saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
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
              <div className="tooltip tooltip-bottom flex items-center justify-center" data-tip="Modify group...">
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
                        <button className="outline-none" onClick={() => setFieldEditId(group.id)}>
                          Rename
                        </button>
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />

                      {_.size(_.find(user_state?.workspaces, { id: workspace_id })?.groups || []) > 1 ? (
                        <DropdownMenu.Item
                          className="text-xs pl-4 pr-6 py-2 outline-none cursor-pointer hover:text-zinc-200"
                          onClick={() => {
                            fetcher.submit(
                              {
                                workspace_id: workspace_id || "",
                                group_id: group.id,
                              },
                              {
                                method: "DELETE",
                                action: "/conductor/workspace/group",
                              }
                            )
                          }}
                        >
                          Delete
                        </DropdownMenu.Item>
                      ) : null}

                      <DropdownMenu.Arrow className="fill-zinc-600 border-zinc-600" />
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
              <div className="tooltip tooltip-bottom flex items-center justify-center" data-tip="Add new folder...">
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
                          fetcher.submit(
                            {
                              workspace_id: workspace_id || "",
                              name: "New group",
                            },
                            {
                              method: "PUT",
                              action: `/conductor/workspace/group`,
                            }
                          )
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
                              action: `/conductor/workspace/folder`,
                            }
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
            <div key={folder.id} className={`OrganizerFolder flex flex-1 flex-col`}>
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
                  {app_state.open_folders.find((open_folder) => open_folder.folder_id === folder.id) ? (
                    <MdOutlineKeyboardArrowDown className="w-4 h-4 flex flex-row items-center" />
                  ) : (
                    <MdOutlineKeyboardArrowRight className="w-4 h-4 flex flex-row items-center" />
                  )}
                </div>
                <div
                  className="flex flex-1 h-5 items-center cursor-pointer text-zinc-400 font-xs"
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
                      updateFolder({ group_id: group.id, folder_id: folder.id, name })
                    }}
                    onCancel={resetFieldEditId}
                    onBlur={resetFieldEditId}
                    cancelOnBlur={true}
                    saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                    cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
                    value={folder.name}
                    editComponent={<EditComponent />}
                    onHoverCssClass={``}
                    allowEdit={false}
                  />
                </div>
                <div className={`flex cursor-pointer ${field_edit_id === folder.id ? "hidden" : ""}`}>
                  <div className="flex cursor-pointer flex-row gap-2 items-center justify-center mr-1">
                    <div className="tooltip tooltip-bottom flex items-center justify-center" data-tip="Modify folder...">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="outline-none">
                            <RxDotsHorizontal className="w-3 h-3" />
                          </button>
                        </DropdownMenu.Trigger>

                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="bg-zinc-800 border border-zinc-600 text-zinc-300 rounded-md shadow-lg shadow-zinc-900 outline-none"
                            sideOffset={5}
                          >
                            <DropdownMenu.Item className="text-xs pl-4 pr-6 py-2 outline-none cursor-pointer hover:text-zinc-200">
                              <button className="outline-none" onClick={() => setFieldEditId(folder.id)}>
                                Rename
                              </button>
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />

                            {group.folders.length > 1 ? (
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
                                      action: "/conductor/workspace/folder",
                                    }
                                  )
                                }}
                              >
                                Delete
                              </DropdownMenu.Item>
                            ) : null}

                            <DropdownMenu.Arrow className="fill-zinc-600 border-zinc-600" />
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                    <div className="tooltip tooltip-bottom flex items-center justify-center" data-tip="Add new session">
                      <button
                        onClick={() => {
                          fetcher.submit(
                            {
                              workspace_id: workspace_id || "",
                              session_id: session_id || "",
                              group_id: group.id,
                              folder_id: folder.id,
                            },
                            {
                              method: "PUT",
                              action: `/conductor/workspace/session`,
                            }
                          )
                        }}
                      >
                        <RxPlus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {app_state.open_folders.find((open_folder) => open_folder.folder_id === folder.id) ? (
                folder.sessions && folder.sessions.length > 0 ? (
                  folder.sessions?.map((session) => (
                    <div
                      key={session.id}
                      className={`OrganizerSession flex flex-1 flex-row pl-3 h-5 py-0 mb-0.5 border border-transparent hover:bg-zinc-900/50 hover:border-zinc-900 hover:border-t-zinc-700/70 rounded ${session.id === session_id ? 'bg-zinc-900/30 border border-zinc-900  border-t-zinc-700/70' : ''}`}
                      data-id={session.id}
                    >
                      <div className="flex items-center">
                        <RiHashtag
                          className={`w-4 h-4 pr-1 ${session.id === session_id ? " text-zinc-100" : "text-zinc-400"}`}
                        />
                      </div>
                      <Link
                        className={`flex flex-1 items-center cursor-pointer text-xs ${
                          session.id === session_id ? " text-zinc-100" : "text-zinc-400"
                        }`}
                        to={`/conductor/${workspace_id}/${session.id}`}
                      >
                        <EasyEdit
                          type="text"
                          editMode={field_edit_id === session.id}
                          onSave={(name: any) => {
                            resetFieldEditId()
                            updateSession({ group_id: group.id, folder_id: folder.id, session_id: session.id, name })
                            return false
                          }}
                          onCancel={resetFieldEditId}
                          onBlur={resetFieldEditId}
                          cancelOnBlur={true}
                          saveButtonLabel={<MdCheck className="w-3 h-3 text-zinc-200" />}
                          cancelButtonLabel={<MdClose className="w-3 h-3  text-zinc-200" />}
                          value={session.name}
                          editComponent={<EditComponent />}
                          onHoverCssClass={``}
                          allowEdit={false}
                        />
                      </Link>
                      <div
                        className={`flex cursor-pointer flex-row gap-2 items-center justify-center mr-2 ${
                          field_edit_id === session_id ? "hidden" : ""
                        }`}
                      >
                        <div className="tooltip tooltip-bottom" data-tip="Modify session...">
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button className="outline-none">
                                <RxDotsHorizontal
                                  className={`w-3 h-3 flex flex-1 items-center cursor-pointer font-semibold text-sm ${
                                    session.id === session_id ? " text-zinc-100" : "text-zinc-400"
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
                                  <button className="outline-none" onClick={() => setFieldEditId(session.id)}>
                                    Rename
                                  </button>
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="text-xs pl-4 pr-6 py-2 outline-none cursor-pointer hover:text-zinc-200"
                                  onClick={() => {
                                    fetcher.submit(
                                      {
                                        workspace_id: workspace_id || "",
                                        group_id: group.id,
                                        folder_id: folder.id,
                                        session_id: session.id,
                                      },
                                      {
                                        method: "DELETE",
                                        action: `/conductor/workspace/session`,
                                      }
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
                ) : (
                  <div className="OrganizerSession flex flex-1 flex-row pl-4 italic text-xs font-semibold text-zinc-400">
                    No sessions
                  </div>
                )
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
