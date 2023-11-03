import { initLoaders } from "@/data/loaders"
import { z } from "zod"
import { SessionS, DataRefT, WorkspaceS, WorkspaceT } from "@/data/schemas/workspace"
import _ from "lodash"
import { UserS, UserT } from "@/data/schemas/user"
import { nanoid } from "nanoid"
import { buf2hex, getId, keyPair } from "@/security/common"
import AppStateActions from "@/data/actions/app"
import { AppStateT } from "@/data/loaders/app"
import { SessionsT } from "@/data/loaders/sessions"
import SessionsActions from "@/data/actions/sessions"
import { error } from "@/libraries/logging"
import config from "@/config"
import { emit, listen } from "@/libraries/events"
import VectorsActions from "./vectors"
import DataActions from "./data"

const API: { [key: string]: Function } = {
  updateUser: async function (state: Partial<UserT>) {
    const { UserState } = await initLoaders()
    const s = await UserState.get()
    const updated_state: UserT = { ...s, ...state }
    const parsed = UserS.safeParse(updated_state)
    if (!parsed.success) throw new Error("Invalid state")
    await UserState.set(parsed.data)

    emit({ type: "user/update", data: parsed.data })

    return parsed.data
  },

  addGroup: async ({ name, workspace_id }: { workspace_id: string; name?: string }) => {
    const { UserState } = await initLoaders()
    // create new group in user_state
    let us: UserT = _.cloneDeep(await UserState.get())
    const new_group = {
      _v: 1,
      id: nanoid(),
      name: name || "New group",
      folders: [],
    }
    const updated_groups = _.find(us.workspaces, { id: workspace_id })?.groups
    if (!updated_groups) return
    updated_groups.push(new_group)
    us.workspaces = _.map(us.workspaces, (workspace) => {
      if (workspace.id === workspace_id && workspace.groups) {
        workspace.groups = updated_groups
      }
      return workspace
    })

    emit({ type: "user/add_group", data: { workspace_id, group: new_group } })

    return API.updateUser(us)
  },
  deleteGroup: async ({ workspace_id, group_id }: { workspace_id: string; group_id: string }) => {
    if (!workspace_id || !group_id)
      return error({ message: "Missing workspace_id or group_id", data: { workspace_id, group_id } })
    const { UserState, AppState, SessionState } = await initLoaders()

    // delete group's sessions from app_state.open_sessions
    const as: AppStateT = _.cloneDeep(await AppState.get())
    const new_open_sessions = as.open_sessions.filter((open_session) => open_session.group_id !== group_id)
    as.open_sessions = new_open_sessions
    await AppStateActions.updateAppState(as)

    // delete group's sessions from sessions
    const sessions: SessionsT = await SessionState.get()
    const group_sessions = _.find(UserState.get().workspaces, { id: workspace_id })?.groups.map((group: any) => {
      if (group.id === group_id) {
        return group.folders.map((folder: any) => folder.sessions)
      }
    })[0] as z.infer<typeof SessionS>[] | []
    if (_.size(group_sessions) > 0) {
      const new_sessions: SessionsT = { _v: 1, active: {}, _updated: new Date().getTime() }
      // filter out sessions that are in the group
      Object.keys(sessions.active).forEach((ses_id) => {
        if (!group_sessions.find((session) => session?.id === ses_id)) {
          new_sessions.active[ses_id] = sessions.active[ses_id]
        }
      })
      await SessionsActions.updateSessions(new_sessions)
    }

    // delete group from user_state
    let us: UserT = _.cloneDeep(await UserState.get())
    const updated_groups = _.find(us.workspaces, { id: workspace_id })?.groups.filter((group) => group.id !== group_id)
    if (!updated_groups) return
    us.workspaces = _.map(us.workspaces, (workspace) => {
      if (workspace.id === workspace_id && workspace.groups) {
        workspace.groups = updated_groups
      }
      return workspace
    })
    await API.updateUser(us)

    // delete group from app_state
    const new_open_folders = as.open_folders.filter((open_folder) => open_folder.group_id !== group_id)
    as.open_folders = new_open_folders
    await AppStateActions.updateAppState(as)

    emit({ type: "user/delete_group", data: { workspace_id, group_id } })
  },
  addFolder: async ({ name, group_id, workspace_id }: { workspace_id: string; group_id: string; name?: string }) => {
    const { UserState, AppState } = await initLoaders()
    // create new folder in user_state
    let us: UserT = _.cloneDeep(await UserState.get())
    const new_folder = {
      _v: 1,
      id: nanoid(),
      name: name || "New folder",
      sessions: [],
    }
    const updated_group = _.find(us.workspaces, { id: workspace_id })?.groups.map((group) => {
      if (group.id === group_id) {
        group.folders = [...group.folders, new_folder]
      }
      return group
    })
    if (!updated_group) return
    us.workspaces = _.map(us.workspaces, (workspace) => {
      if (workspace.id === workspace_id && workspace.groups) {
        workspace.groups = updated_group
      }
      return workspace
    })
    await API.updateUser(us)

    // create new folder in app_state
    const as: AppStateT = _.cloneDeep(await AppState.get())
    as.open_folders = [
      ...as.open_folders,
      { _v: 1, folder_id: new_folder.id, group_id: group_id, workspace_id: workspace_id },
    ]
    await AppStateActions.updateAppState(as)

    emit({ type: "user/add_folder", data: { workspace_id, group_id, folder: new_folder } })
  },
  deleteFolder: async ({
    workspace_id,
    folder_id,
    group_id,
  }: {
    workspace_id: string
    folder_id: string
    group_id: string
  }) => {
    const { UserState, AppState, SessionState } = await initLoaders()
    // delete folder's sessions from app_state.open_sessions
    const as: AppStateT = _.cloneDeep(await AppState.get())
    const new_open_sessions = as.open_sessions.filter((open_session) => open_session.folder_id !== folder_id)
    as.open_sessions = new_open_sessions
    await AppStateActions.updateAppState(as)

    // delete folder from user_state
    let us: UserT = _.cloneDeep(await UserState.get())
    const updated_group = _.find(us.workspaces, { id: workspace_id })?.groups.map((group) => {
      if (group.id === group_id) {
        group.folders = group.folders.filter((folder) => folder.id !== folder_id)
      }
      return group
    })
    if (!updated_group) throw new Error("Group not found")
    us.workspaces = _.map(us.workspaces, (workspace) => {
      if (workspace.id === workspace_id && workspace.groups) {
        workspace.groups = updated_group
      }
      return workspace
    })
    await API.updateUser(us)

    // get folder's sessions from sessions
    const sessions_in_folder = _.find(us.workspaces, {
      id: workspace_id,
    })?.groups.map((group) => {
      if (group.id === group_id) {
        return group.folders.map((folder) => {
          if (folder.id === folder_id) {
            return folder.sessions
          }
        })
      }
    })[0] as z.infer<typeof SessionS>[] | undefined

    // delete each session from sessions
    const sessions = await SessionState.get()
    const new_sessions: SessionsT = { _v: 1, active: {} }
    Object.keys(sessions.active).forEach((ses_id) => {
      if (!sessions_in_folder?.find((session) => session?.id === ses_id)) {
        new_sessions.active[ses_id] = sessions.active[ses_id]
      }
    })

    await SessionsActions.updateSessions(new_sessions)

    // delete folder from app_state
    const new_open_folders = as.open_folders.filter((open_folder) => open_folder.folder_id !== folder_id)
    as.open_folders = new_open_folders
    await AppStateActions.updateAppState(as)

    emit({ type: "user/delete_folder", data: { workspace_id, folder_id, group_id } })
  },

  addSession: async function ({
    active_workspace,
    group_id,
    folder_id,
  }: {
    active_workspace: z.infer<typeof WorkspaceS>
    group_id?: string
    folder_id?: string
  }) {
    const { UserState } = await initLoaders()
    const state = await UserState.get()

    // check group exists, if not, pick the first one
    let g = active_workspace.groups.find((g) => g.id === group_id)
    if (!g) {
      g = active_workspace.groups[0]
      group_id = g.id
    }

    // check folder exists, if not, pick the first one
    let f = g.folders.find((f) => f.id === folder_id)
    if (!f) {
      f = g.folders[0]
      folder_id = f.id
    }

    // add session into correct state.workspaces.groups.folders and create updated state
    const id = buf2hex({ input: keyPair().public_key, add0x: true }) // just for testing
    const new_session = SessionS.parse({ id })
    const updated_state: UserT = { ...state }
    // add new session to correct folder
    const folder_index = _.findIndex(g.folders, (f) => f.id === folder_id)
    updated_state.workspaces = updated_state.workspaces.map((ws) =>
      ws.id !== active_workspace.id
        ? ws
        : {
            ...ws,
            groups: ws.groups.map((gr) =>
              gr.id !== group_id
                ? gr
                : {
                    ...gr,
                    folders: gr.folders.map((fd, i) =>
                      i !== folder_index
                        ? fd
                        : {
                            ...fd,
                            sessions: [...(fd.sessions || []), new_session],
                          }
                    ),
                  }
            ),
          }
    )

    await UserState.set(updated_state)

    emit({ type: "user/add_session", data: { session: new_session, group_id, folder_id } })

    return { session: new_session, group_id, folder_id }
  },

  addWorkspace: async function ({ name }: { name: string }) {
    const { UserState, AppState } = await initLoaders()
    const user_state = await UserState.get()
    const addWorkspaceToAppState = AppStateActions.addWorkspaceToAppState

    const id = getId()
    const group_id = nanoid(10)
    const folder_id = nanoid(10)
    const session_id = getId()

    const new_workspace: z.infer<typeof WorkspaceS> = {
      _v: 1,
      id,
      name,
      members: {
        _v: 1,
        read: [user_state.id],
        write: [user_state.id],
      },
      defaults: {
        llm_module: {
          id: config.defaults.llm_module.id,
          variant: config.defaults.llm_module.variant_id,
        },
      },
      groups: [
        {
          _v: 1,
          id: group_id,
          name: "Workspace",
          folders: [
            {
              _v: 1,
              id: folder_id,
              name: "My folder",
              sessions: [
                {
                  _v: 1,
                  id: session_id,
                  name: "Untitled",
                  icon: "📝",
                },
              ],
            },
          ],
        },
      ],
    }
    await UserState.set({ ...user_state, workspaces: [...user_state.workspaces, new_workspace] })

    // add new workspace to app state
    await addWorkspaceToAppState({ workspace: new_workspace })

    // add new workspace to sessions
    const { SessionState } = await initLoaders()
    const sessions = await SessionState.get()
    const new_sessions: SessionsT = _.cloneDeep(sessions)
    new_sessions.active[session_id] = {
      _v: 1,
      _updated: new Date().getTime(),
      id: session_id,
      type: "chat",
      created_at: new Date(),
      settings: {
        module: new_workspace.defaults.llm_module as any,
      },
    }
    await SessionState.set(new_sessions)

    emit({ type: "user/add_workspace", data: { workspace: new_workspace } })

    return new_workspace
  },

  renameItem: async function ({
    new_name,
    group_id,
    folder_id,
    session_id,
  }: {
    new_name: string
    group_id?: string
    folder_id?: string
    session_id?: string
  }) {
    const { UserState, AppState } = await initLoaders()
    const app_state: AppStateT = await AppState.get()
    const user_state: UserT = await UserState.get()

    let us = _.cloneDeep(user_state)
    if (group_id && !folder_id) {
      // rename group in user_state
      const updated_group = _.find(us.workspaces, { id: app_state.active_workspace_id })?.groups.map((group) => {
        if (group.id === group_id) {
          group.name = new_name
        }
        return group
      })
      if (!updated_group) return
      us.workspaces = _.map(us.workspaces, (workspace) => {
        if (workspace.id === app_state.active_workspace_id && workspace.groups) {
          workspace.groups = updated_group
        }
        return workspace
      })
    }
    if (group_id && folder_id && !session_id) {
      // rename folder in user_state
      const updated_group = _.find(us.workspaces, { id: app_state.active_workspace_id })?.groups.map((group) => {
        if (group.id === group_id) {
          group.folders.map((folder) => {
            if (folder.id === folder_id) {
              folder.name = new_name
            }
            return folder
          })
        }
        return group
      })
      if (!updated_group) return
      us.workspaces = _.map(us.workspaces, (workspace) => {
        if (workspace.id === app_state.active_workspace_id && workspace.groups) {
          workspace.groups = updated_group
        }
        return workspace
      })
    }

    if (group_id && folder_id && session_id) {
      // rename session in user_state
      const updated_group = _.find(us.workspaces, { id: app_state.active_workspace_id })?.groups.map((group) => {
        if (group.id === group_id) {
          group.folders.map((folder) => {
            if (folder.id === folder_id) {
              folder?.sessions?.map((session) => {
                if (session.id === session_id) {
                  session.name = new_name
                }
                return session
              })
            }
            return folder
          })
        }
        return group
      })
      if (!updated_group) return
      us.workspaces = _.map(us.workspaces, (workspace) => {
        if (workspace.id === app_state.active_workspace_id && workspace.groups) {
          workspace.groups = updated_group
        }
        return workspace
      })
    }
    await UserState.set(us)

    emit({ type: "user/rename_item", data: { group_id, folder_id, session_id, new_name } })
  },
  async addDataToWorkspace({ workspace_id, data }: { workspace_id: string; data: DataRefT }) {
    const { UserState } = await initLoaders()
    const user_state = await UserState.get()
    const updated_state: UserT = { ...user_state }
    const workspace_index = _.findIndex(updated_state.workspaces, (ws) => ws.id === workspace_id)
    // check if data.id exists already
    const data_exists = _.find(updated_state.workspaces[workspace_index].data, { id: data.id })
    if (data_exists) return
    _.set(updated_state, `workspaces[${workspace_index}].data`, updated_state.workspaces?.[workspace_index]?.data || [])
    updated_state.workspaces?.[workspace_index]?.data?.push(data)
    // validate
    const parsed = UserS.safeParse(updated_state)
    if (!parsed.success) throw new Error("Invalid state")
    await UserState.set(parsed.data)

    emit({
      type: "user/add_data_to_workspace",
      data: {
        workspace_id,
        data,
      },
    })
  },
  async deleteDataFromWorkspace({ workspace_id, data_id }: { workspace_id: string; data_id: string }) {
    const { UserState } = await initLoaders()
    const user_state = await UserState.get()
    const updated_state: UserT = { ...user_state }
    const workspace_index = _.findIndex(updated_state.workspaces, (ws) => ws.id === workspace_id)
    const data_index = _.findIndex(updated_state.workspaces[workspace_index].data, { id: data_id })
    if (data_index === -1) return
    updated_state.workspaces[workspace_index]?.data?.splice(data_index, 1)
    // validate
    const parsed = UserS.safeParse(updated_state)
    if (!parsed.success) throw new Error("Invalid state")
    await UserState.set(parsed.data)

    await VectorsActions.delete({ id: data_id })
    await DataActions.delete({ id: data_id })

    emit({
      type: "user/delete_data_from_workspace",
      data: {
        workspace_id,
        data_id,
      },
    })
  },
  async addDataToGroup({ workspace_id, group_id, data }: { workspace_id: string; group_id: string; data: DataRefT }) {
    const { UserState } = await initLoaders()
    const user_state = await UserState.get()
    const updated_state: UserT = { ...user_state }
    const workspace_index = _.findIndex(updated_state.workspaces, (ws) => ws.id === workspace_id)
    const group_index = _.findIndex(updated_state.workspaces[workspace_index].groups, { id: group_id })
    // check if data.id exists already
    const data_exists = _.find(updated_state.workspaces[workspace_index].groups[group_index]?.data, { id: data.id })
    if (data_exists) return
    _.set(
      updated_state,
      `workspaces[${workspace_index}].groups[${group_index}].data`,
      updated_state.workspaces?.[workspace_index]?.groups?.[group_index]?.data || []
    )
    updated_state.workspaces?.[workspace_index]?.groups?.[group_index]?.data?.push(data)
    // validate
    const parsed = UserS.safeParse(updated_state)
    if (!parsed.success) throw new Error("Invalid state")
    await UserState.set(parsed.data)

    emit({
      type: "user/add_data_to_group",
      data: {
        workspace_id,
        group_id,
        data,
      },
    })
  },
  async deleteDataFromGroup({
    workspace_id,
    group_id,
    data_id,
  }: {
    workspace_id: string
    group_id: string
    data_id: string
  }) {
    const { UserState } = await initLoaders()
    const user_state = await UserState.get()
    const updated_state: UserT = { ...user_state }
    const workspace_index = _.findIndex(updated_state.workspaces, (ws) => ws.id === workspace_id)
    const group_index = _.findIndex(updated_state.workspaces[workspace_index].groups, { id: group_id })
    const data_index = _.findIndex(updated_state.workspaces[workspace_index].groups[group_index]?.data, data_id)
    if (data_index === -1) return
    updated_state.workspaces[workspace_index].groups[group_index]?.data?.splice(data_index, 1)
    // validate
    const parsed = UserS.safeParse(updated_state)
    if (!parsed.success) throw new Error("Invalid state")
    await UserState.set(parsed.data)

    emit({
      type: "user/delete_data_from_group",
      data: {
        workspace_id,
        group_id,
        data_id,
      },
    })
  },
  async addDataToFolder({
    workspace_id,
    group_id,
    folder_id,
    data,
  }: {
    workspace_id: string
    group_id: string
    folder_id: string
    data: DataRefT
  }) {
    const { UserState } = await initLoaders()
    const user_state = await UserState.get()
    const updated_state: UserT = { ...user_state }
    const workspace_index = _.findIndex(updated_state.workspaces, (ws) => ws.id === workspace_id)
    const group_index = _.findIndex(updated_state.workspaces[workspace_index].groups, { id: group_id })
    const folder_index = _.findIndex(updated_state.workspaces[workspace_index].groups[group_index]?.folders, {
      id: folder_id,
    })
    // check if data.id exists already
    const data_exists = _.find(
      updated_state.workspaces[workspace_index].groups[group_index]?.folders[folder_index]?.data,
      { id: data.id }
    )
    if (data_exists) return
    _.set(
      updated_state,
      `workspaces[${workspace_index}].groups[${group_index}].folders[${folder_index}].data`,
      updated_state.workspaces?.[workspace_index]?.groups?.[group_index]?.folders?.[folder_index]?.data || []
    )
    updated_state.workspaces?.[workspace_index]?.groups?.[group_index]?.folders?.[folder_index]?.data?.push(data)
    // validate
    const parsed = UserS.safeParse(updated_state)
    if (!parsed.success) throw new Error("Invalid state")
    await UserState.set(parsed.data)

    emit({
      type: "user/add_data_to_folder",
      data: {
        workspace_id,
        group_id,
        folder_id,
        data,
      },
    })
  },
  async deleteDataFromFolder({
    workspace_id,
    group_id,
    folder_id,
    data_id,
  }: {
    workspace_id: string
    group_id: string
    folder_id: string
    data_id: string
  }) {
    const { UserState } = await initLoaders()
    const user_state = await UserState.get()
    const updated_state: UserT = { ...user_state }
    const workspace_index = _.findIndex(updated_state.workspaces, (ws) => ws.id === workspace_id)
    const group_index = _.findIndex(updated_state.workspaces[workspace_index].groups, { id: group_id })
    const folder_index = _.findIndex(updated_state.workspaces[workspace_index].groups[group_index]?.folders, {
      id: folder_id,
    })
    const data_index = _.findIndex(
      updated_state.workspaces[workspace_index].groups[group_index]?.folders[folder_index]?.data,
      data_id
    )
    if (data_index === -1) return
    updated_state.workspaces[workspace_index].groups[group_index]?.folders[folder_index]?.data?.splice(data_index, 1)
    // validate
    const parsed = UserS.safeParse(updated_state)
    if (!parsed.success) throw new Error("Invalid state")
    await UserState.set(parsed.data)

    emit({
      type: "user/delete_data_from_folder",
      data: {
        workspace_id,
        group_id,
        folder_id,
        data_id,
      },
    })
  },
}

listen({
  type: "user.*",
  action: async (data: any, e: any) => {
    const { callback } = data
    const method: string = e?.event?.replace("user.", "")
    if (method in API) {
      const response = await API[method](data)
      callback(response)
    } else {
      callback({ error: "method not found", data: { ...data, e } })
    }
  },
})

export default API
