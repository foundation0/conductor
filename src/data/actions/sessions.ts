import { TextMessageT, SessionsT } from "@/data/loaders/sessions"
import _ from "lodash"
import { SessionsS, TextMessageS } from "@/data/schemas/sessions"
import { nanoid } from "nanoid"
import { AppStateT } from "@/data/loaders/app"
import { initLoaders } from "@/data/loaders"
import AppStateActions from "@/data/actions/app"
import UserActions from "@/data/actions/user"
import { UserT } from "@/data/loaders/user"

const API = {
  updateSessions: async function (state: SessionsT) {
    const { SessionState } = await initLoaders()
    const sessions: SessionsT = SessionState.get()
    const updated_state: SessionsT = { ...sessions, ...state }
    const parsed = SessionsS.safeParse(updated_state)
    if (!parsed.success) throw new Error("Invalid state")
    await SessionState.set(parsed.data)
    return parsed.data
  },

  updateMessages: async function ({ session_id, messages }: { session_id: string; messages: TextMessageT[] }) {
    const { MessagesState } = await initLoaders()
    const messages_state = await MessagesState({ session_id })
    await messages_state.set(messages)
  },

  updateTempMessage: async function ({ session_id, message }: { session_id: string; message: TextMessageT }) {
    // find the session, if no session, abort
    const { MessagesState } = await initLoaders()
    let messages_state = await MessagesState({ session_id })
    let messages: TextMessageT[] = messages_state.get()

    // check if there's a message with id temp, if so, update it
    const temp = messages.find((m) => m.id === "temp")
    if (temp) {
      temp.text += message.text
      // replace the temp message with the updated one
      messages = messages.map((m) => (m.id === "temp" ? temp : m))
    }

    // if there's no temp message, create one
    else {
      const vmessage = TextMessageS.safeParse(message)
      if (!vmessage.success) throw new Error("Invalid message")
      messages.push({ ...vmessage.data, id: "temp" })
    }

    // save the session
    // await SessionState.set(sessions, true)
    await messages_state.set(messages)
  },

  addMessage: async function ({ session_id, message }: { message: Partial<TextMessageT>; session_id: string }) {
    const { MessagesState } = await initLoaders()
    const messages_state = await MessagesState({ session_id })
    const messages: TextMessageT[] = messages_state.get()

    if (message.parent_id === "first" && messages.length > 0) {
      throw new Error("multiple first messages")
    } else if (message.parent_id && message.parent_id !== "first" && messages.length > 0) {
      const parent = messages.find((m) => m.id === message.parent_id)
      if (!parent) throw new Error("Invalid parent_id")
    }

    const m = { id: nanoid(), version: "1.0", ...message } as TextMessageT
    const vmessage = TextMessageS.safeParse(m)
    if (!vmessage.success) throw new Error("Invalid message")

    // add message if not duplicate id
    let updated_messages = []
    if (!messages.find((m) => m.id === vmessage.data.id)) {
      updated_messages = _.uniqBy([...messages, vmessage.data], "id")

      // if vmessage.data.active is true, set all other messages with same parent_id to false
      if (vmessage.data.active) {
        updated_messages.forEach((m) => {
          if (m.parent_id === vmessage.data.parent_id && m.id !== vmessage.data.id) m.active = false
        })
      }
    } else {
      // update message
      updated_messages = messages.map((m) => (m.id === vmessage.data.id ? vmessage.data : m))
    }

    // remove any message with temp id
    updated_messages = updated_messages.filter((m) => m.id !== "temp")

    await messages_state.set(updated_messages)

    return vmessage.data
  },
  addSession: async ({
    workspace_id,
    group_id,
    folder_id,
  }: {
    workspace_id: string
    group_id?: string
    folder_id?: string
  }) => {
    const { SessionState, UserState, AppState } = await initLoaders()
    const active_workspace = _.find(UserState.get().workspaces, { id: workspace_id })
    if (!active_workspace) throw new Error("Active workspace not found")
    const new_session = await UserActions.addSession({
      active_workspace,
      group_id,
      folder_id,
    })
    // update app state open sessions
    if (!new_session) throw new Error("Failed to create session")
    const as = _.cloneDeep(AppState.get())
    as.open_sessions.push({
      _v: 1,
      session_id: new_session.session.id,
      workspace_id: workspace_id,
      group_id: new_session.group_id || "",
      folder_id: new_session.folder_id,
    })
    await AppStateActions.updateAppState(as)

    // create session
    const sessions = SessionState.get()
    sessions.active[new_session.session.id] = {
      _v: 1,
      id: new_session.session.id,
      type: "chat",
      created_at: new Date(),
      settings: {
        module: active_workspace.defaults.llm_module || {
          id: "openai",
          variant: "gpt-3.5-turbo",
        },
      },
    }
    await API.updateSessions(sessions)
    return new_session
  },
  deleteSession: async ({
    workspace_id,
    group_id,
    folder_id,
    session_id,
  }: {
    workspace_id: string
    group_id: string
    folder_id: string
    session_id: string
  }) => {
    const { SessionState, UserState, AppState } = await initLoaders()

    // delete session from app_state.open_sessions
    const as: AppStateT = _.cloneDeep(AppState.get())
    const new_open_sessions = as.open_sessions.filter((open_session) => open_session.session_id !== session_id)
    as.open_sessions = new_open_sessions
    await AppStateActions.updateAppState(as)

    // delete session from user_state.workspaces.groups.folders.sessions
    let us: UserT = _.cloneDeep(UserState.get())
    const updated_group = _.find(us.workspaces, { id: workspace_id })?.groups.map((group) => {
      if (group.id === group_id) {
        group.folders.map((folder) => {
          if (folder.id === folder_id) {
            folder.sessions = folder?.sessions?.filter((session) => session.id !== session_id)
          }
          return folder
        })
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
    await UserActions.updateUser(us)

    // delete session from sessions
    const sessions = SessionState.get()
    const new_sessions: SessionsT = { _v: 1, active: {} }
    Object.keys(sessions.active).forEach((ses_id) => {
      if (session_id !== ses_id) {
        new_sessions.active[ses_id] = sessions.active[ses_id]
      }
    })
    await API.updateSessions(new_sessions)
  },
}

export default API
