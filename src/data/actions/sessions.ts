import { TextMessageT, SessionsT } from "@/data/loaders/sessions"
import _ from "lodash"
import {
  ChatSessionT,
  CostS,
  ReceiptS,
  SessionsS,
  TextMessageS,
} from "@/data/schemas/sessions"
import { nanoid } from "nanoid"
import { AppStateT } from "@/data/loaders/app"
import { initLoaders } from "@/data/loaders"
import AppStateActions from "@/data/actions/app"
import UserActions from "@/data/actions/user"
import { UserT } from "@/data/loaders/user"
import { error, ph } from "@/libraries/logging"
import { z } from "zod"
import config from "@/config"
import { emit, listen } from "@/libraries/events"
import { DataRefT, SessionS, SessionT } from "../schemas/workspace"
import { mergeState } from "../storage/IDB"
import { getMemoryState } from "@/libraries/memory"

const API: { [key: string]: Function } = {
  updateSessions: async function (state: Partial<SessionsT>) {
    const { SessionState } = await initLoaders()
    const sessions: SessionsT = SessionState.get()
    const updated_state = mergeState(sessions, state) as SessionsT
    const parsed = SessionsS.safeParse(updated_state)
    if (!parsed.success)
      return error({ message: "Invalid sessions state", data: parsed.error })
    const res = await SessionState.set(parsed.data, false, true)
    if (typeof res === "object" && "error" in res)
      return error({ message: "Failed to update sessions", data: res })

    emit({
      type: "sessions.updateSessions.done",
      data: updated_state,
    })
    return parsed.data
  },

  updateSession: async function ({
    session_id,
    session,
  }: {
    session_id: string
    session: any
  }) {
    const { SessionState } = await initLoaders()
    const sessions: SessionsT = SessionState.get()
    const updated_sessions = _.cloneDeep(sessions)
    const current_session = updated_sessions.active[session_id]
    if (!session)
      return error({ message: "Session not found", data: { session_id } })
    const updated_session = mergeState(current_session, session)
    updated_sessions.active[session_id] = updated_session
    const res = await API.updateSessions(updated_sessions)
    if (typeof res === "object" && "error" in res)
      return error({ message: "Failed to update session", data: res })
    emit({
      type: "sessions.updateSession.done",
      data: {
        session: updated_session,
        target: session_id,
      },
    })
    return updated_session
  },
  updateMessages: async function ({
    session_id,
    messages,
  }: {
    session_id: string
    messages: TextMessageT[]
  }) {
    const { MessagesState } = await initLoaders()
    const messages_state = await MessagesState({ session_id })
    const res = await messages_state.set(messages)
    if (typeof res === "object" && "error" in res)
      return error({ message: "Failed to update messages", data: res })
    emit({
      type: "sessions.updateMessages.done",
      data: { messages },
    })
  },

  updateTempMessage: async function ({
    session_id,
    message,
  }: {
    session_id: string
    message: TextMessageT
  }) {
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
    const res = await messages_state.set(messages)
    if (typeof res === "object" && "error" in res)
      return error({ message: "Failed to update temp message", data: res })
    emit({
      type: "sessions.updateTempMessage.done",
      data: { messages },
    })
  },
  getById: async function ({ session_id }: { session_id: string }) {
    const { SessionState } = await initLoaders()
    const sessions = SessionState.get()
    return sessions.active[session_id] || null
  },
  addMessage: async function ({
    session_id,
    message,
  }: {
    message: Partial<TextMessageT>
    session_id: string
  }) {
    const { MessagesState } = await initLoaders()
    const messages_state = await MessagesState({ session_id })
    const messages: TextMessageT[] = messages_state.get()

    if (message.parent_id === "first" && messages.length > 0) {
      throw new Error("multiple first messages")
    } else if (
      message.parent_id &&
      message.parent_id !== "first" &&
      messages.length > 0
    ) {
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
          if (
            m.parent_id === vmessage.data.parent_id &&
            m.id !== vmessage.data.id
          )
            m.active = false
        })
      }
    } else {
      // update message
      updated_messages = messages.map((m) =>
        m.id === vmessage.data.id ? vmessage.data : m,
      )
    }

    // remove any message with temp id
    updated_messages = updated_messages.filter((m) => m.id !== "temp")

    const res = await messages_state.set(updated_messages)
    ph().capture("sessions/message_added")
    if (typeof res === "object" && "error" in res)
      return error({ message: "Failed to add a message", data: res })
    emit({
      type: "sessions.addMessage.done",
      data: { messages },
    })
    return vmessage.data
  },
  getMessagesBySessionId: async function ({
    session_id,
  }: {
    session_id: string
  }): Promise<{ messages: TextMessageT[] }> {
    const { MessagesState } = await initLoaders()
    const messages_state = await MessagesState({ session_id })
    return messages_state.get()
  },
  addCost: async function ({
    session_id,
    receipt,
  }: {
    receipt: z.infer<typeof ReceiptS>
    session_id: string
  }) {
    const { SessionState } = await initLoaders()
    const sessions = SessionState.get()
    const session = sessions.active[session_id]
    if (!session) throw new Error("Session not found")

    if (!ReceiptS.safeParse(receipt).success)
      return error({ message: "Invalid receipt", data: receipt })

    if (!session.receipts) session.receipts = []
    session.receipts.push(receipt)
    const res = await API.updateSessions(sessions)
    if (typeof res === "object" && "error" in res)
      return error({ message: "Failed to add a cost", data: res })
    emit({
      type: "sessions.addCost.done",
      data: { receipt },
    })
  },
  async getAllReceipts() {
    const { SessionState } = await initLoaders()
    const sessions: SessionsT = SessionState.get()
    const receipts = _.flatten(
      Object.values(sessions.active).map((s) => s.receipts || []),
    )
    return receipts
  },
  clearMessages: async function ({ session_id }: { session_id: string }) {
    const { MessagesState } = await initLoaders()
    const messages_state = await MessagesState({ session_id })
    const messages: TextMessageT[] = messages_state.get()
    const updated_messages = messages.map((m) => ({ ...m, status: "deleted" }))
    await messages_state.set(updated_messages, null, true)
    emit({
      type: "sessions.clearMessages.done",
      data: { target: session_id },
    })
  },
  async deleteMessage({
    session_id,
    message_id,
  }: {
    session_id: string
    message_id: string
  }) {
    const { MessagesState } = await initLoaders()
    const messages_state = await MessagesState({ session_id })
    const messages: TextMessageT[] = messages_state.get()
    // mark message status as deleted
    const updated_messages = messages.map((m) =>
      m.id === message_id ? { ...m, status: "deleted" } : m,
    )
    await messages_state.set(updated_messages, null, true)
    emit({
      type: "sessions.deleteMessage.done",
      data: { target: session_id },
    })
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
    const { UserState, AppState } = await initLoaders()
    const active_workspace = _.find(UserState.get().workspaces, {
      id: workspace_id,
    })
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

    // add to active sessions
    const res = await API.addSessionToActive({
      session_id: new_session.session.id,
      workspace_id,
    })

    ph().capture("sessions/create")
    if (typeof res === "object" && "error" in res)
      return error({ message: "Failed to add a session", data: res })
    emit({
      type: "sessions.addSession.done",
      data: new_session,
    })
    return new_session
  },
  async addSessionToActive({
    session_id,
    workspace_id,
  }: {
    session_id: string
    workspace_id: string
  }) {
    const { SessionState, UserState, AppState } = await initLoaders()
    const active_workspace = _.find(UserState.get().workspaces, {
      id: workspace_id,
    })
    if (!active_workspace) throw new Error("Active workspace not found")
    const sessions = SessionState.get()
    sessions.active[session_id] = {
      _v: 1,
      id: session_id,
      type: "chat",
      created_at: new Date(),
      settings: {
        module: {
          id:
            active_workspace.defaults.llm_module.id ||
            config.defaults.llm_module.id,
          variant:
            active_workspace.defaults.llm_module.variant ||
            config.defaults.llm_module.variant_id,
        },
        memory: {
          rag_mode: "full",
        },
      },
    } as ChatSessionT
    return API.updateSessions(sessions)
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
    const { SessionState, UserState, AppState, MessagesState } =
      await initLoaders()

    // delete session from app_state.open_sessions
    const as: AppStateT = _.cloneDeep(AppState.get())
    const new_open_sessions = as.open_sessions.filter(
      (open_session) => open_session.session_id !== session_id,
    )
    as.open_sessions = new_open_sessions
    await AppStateActions.updateAppState(as)

    // delete session from user_state.workspaces.groups.folders.sessions
    let us: UserT = _.cloneDeep(UserState.get())
    const updated_group = _.find(us.workspaces, {
      id: workspace_id,
    })?.groups.map((group) => {
      if (group.id === group_id) {
        group.folders.map((folder) => {
          if (folder.id === folder_id) {
            folder.sessions = folder?.sessions?.filter(
              (session) => session.id !== session_id,
            )
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

    // delete from CF
    const ms = await MessagesState({ session_id })
    await ms.destroy()

    emit({
      type: "sessions.deleteSession.done",
      data: { session_id },
    })
  },
  async getData({ session_id }: { session_id: string }) {
    const { SessionState } = await initLoaders()
    const sessions = SessionState.get()
    const session = sessions.active[session_id]
    if (!session) throw new Error("Session not found")
    return session.data || []
  },
  async addData({ session_id, data }: { session_id: string; data: DataRefT }) {
    const { SessionState } = await initLoaders()
    const sessions = SessionState.get()
    const session = sessions.active[session_id]
    if (!session) throw new Error("Session not found")
    if (!session.data) session.data = []
    // check that data doesn't exist
    if (!session.data.find((d: DataRefT) => d.id === data.id)) {
      session.data.push(data)
      await API.updateSessions(sessions)
    }
    emit({
      type: "sessions.addData.done",
      data: {
        target: session_id,
        data,
      },
    })
  },
  async removeData({
    session_id,
    data_id,
  }: {
    session_id: string
    data_id: any
  }) {
    const { SessionState } = await initLoaders()
    const sessions = SessionState.get()
    const session = sessions.active[session_id]
    if (!session) throw new Error("Session not found")
    if (!session.data) session.data = []
    session.data = session.data.filter((d: DataRefT) => d.id !== data_id)
    await API.updateSession({ session_id, session })
    emit({
      type: "sessions.removeData.done",
      data: {
        target: session_id,
        data_id,
      },
    })
  },
  async findDataAndRemove({ data_id }: { data_id: any }) {
    const { SessionState } = await initLoaders()
    const sessions = SessionState.get()
    Object.keys(sessions.active).forEach((session_id) => {
      const session = sessions.active[session_id]
      if (!session) throw new Error("Session not found")
      // see if data_id exists in the session
      if (_.find(session?.data || [], { id: data_id })) {
        API.removeData({ session_id, data_id })
      }
    })
  },
  async getCurrentSessionId() {
    const { AppState } = await initLoaders()
    const as: AppStateT = AppState.get()
    return { session_id: as.active_sessions[as.active_workspace_id].session_id }
  },
  async getMessages({
    session_id,
    remove_deleted,
  }: {
    session_id: string
    remove_deleted?: boolean
  }) {
    const { MessagesState } = await initLoaders()
    const messages_state = await MessagesState({ session_id })
    const msgs = messages_state.get()
    const unique_msgs = _(msgs || [])
      .uniqBy("id")
      .value()
    if (!remove_deleted) return unique_msgs
    return unique_msgs.filter((m) => m.status !== "deleted")
  },
}

listen({
  type: "sessions.*",
  action: async (data: any, e: any) => {
    const { callback } = data
    const method: string = e?.event?.replace("sessions.", "")
    if (method in API) {
      const response = await API[method](data)
      if (typeof callback === "function") callback(response)
    } else {
      callback({ error: "method not found", data: { ...data, e } })
    }
  },
})

listen({
  type: "store/update",
  action: async (data: any) => {
    const name = "sessions"
    if (data?.target === name) {
      const mem = getMemoryState<SessionsT>({ id: name })
      if (mem && mem) _.assign(mem, data?.state)
    }
  },
})

export default API
