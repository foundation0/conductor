import { state as AppState } from "@/data/loaders/app"
import { state as UserState } from "@/data/loaders/user"
import { state as SessionState } from "@/data/loaders/sessions"
import { state as NotepadState } from "@/data/loaders/notepad"
import { state as UsersState } from "@/data/loaders/users"
import { state as MessagesState } from "@/data/loaders/messages"
import { state as AIState } from "@/data/loaders/ai"
import { state as DataState } from "@/data/loaders/data"
import { state as VectorsState } from "@/data/loaders/vectors"
import { state as VIndexesState } from "@/data/loaders/vindexes"
import { getActiveUser } from "@/libraries/active_user"
import _ from "lodash"

const noopAPI = { get: () => null, set: () => null }

let API: any = {}
let APICache: any = {}
let SessionCache: any = {}
let DataCache: any = {}
let VectorsCache: any = {}
let VIndexesCache: any = {}

export async function initLoaders() {
  const active_user = getActiveUser()
  if (!active_user) {
    // when user is not authentication
    if (API._status === "unauthenticated") return API
    API = {
      _status: "unauthenticated",
      AppState: noopAPI,
      UserState: noopAPI,
      SessionState: noopAPI,
      NotepadState: noopAPI,
      MessagesState: noopAPI,
      AIState: noopAPI,
      DataState: noopAPI,
      VectorsState: noopAPI,
      VIndexesState: noopAPI,
      UsersState: APICache?.users_state || (await UsersState()),
    }
    APICache = { ...APICache, users_state: API.UsersState }
  } else {
    // when user is authentication
    if (API._status === "authenticated") return API
    const user_state = APICache?.user_state || (await UserState())
    const app_state = APICache?.app_state || (await AppState())
    const session_state = APICache?.session_state || (await SessionState())
    const notepad_state = APICache?.notepad_state || (await NotepadState())
    const users_state = APICache?.users_state || (await UsersState())
    const ai_state = APICache?.ai_state || (await AIState())

    // set cache
    APICache = { ...APICache, user_state, app_state, session_state, notepad_state, users_state, ai_state }

    API = {
      _status: "authenticated",
      AppState: app_state,
      UserState: user_state,
      SessionState: session_state,
      NotepadState: notepad_state,
      UsersState: users_state,
      AIState: ai_state,
      DataState: async ({ id }: { id: string }) => {
        if (DataCache[id]) return DataCache[id]
        const s = await DataState({ id })
        DataCache[id] = s
        return s
      },
      VectorsState: async ({ id }: { id: string }) => {
        if (VectorsCache[id]) return VectorsCache[id]
        const s = await VectorsState({ id })
        VectorsCache[id] = s
        return s
      },
      VIndexesState: async ({ id }: { id: string }) => {
        if (VIndexesCache[id]) return VIndexesCache[id]
        const s = await VIndexesState({ id })
        VIndexesCache[id] = s
        return s
      },
      MessagesState: async ({ session_id }: { session_id: string }) => {
        if (SessionCache[session_id]) return SessionCache[session_id]
        const s = await MessagesState({ session_id })
        SessionCache[session_id] = s
        return s
      },
    }
  }
  return API
}

export const loader = async () => {
  const { AppState, UserState, SessionState, NotepadState, MessagesState, UsersState, AIState, DataState } =
    await initLoaders()
  const users_state = await UsersState.get()
  const app_state = await AppState.get()
  const user_state = await UserState.get()
  const sessions_state = await SessionState.get()
  const notepad_state = await NotepadState.get()
  const ai_state = await AIState.get()
  const data_state = _.get(app_state, app_state?.active_workspace_id)
    ? await DataState({
        id: _.get(app_state, app_state?.active_workspace_id),
      })
    : []
  const vectors_state = _.get(app_state, app_state?.active_workspace_id)
    ? await VectorsState({
        id: _.get(app_state, app_state?.active_workspace_id),
      })
    : []
  const vindexes_state = _.get(app_state, app_state?.active_workspace_id)
    ? await VIndexesState({
        id: _.get(app_state, app_state?.active_workspace_id),
      })
    : []
  const messages_state = _.get(app_state, `active_sessions[${app_state?.active_workspace_id}].session_id`)
    ? await MessagesState({
        session_id: _.get(app_state, `active_sessions[${app_state?.active_workspace_id}].session_id`),
      })
    : []
  return {
    app_state,
    user_state,
    sessions_state,
    notepad_state,
    messages_state,
    MessagesState,
    users_state,
    ai_state,
    data_state,
    vectors_state,
    vindexes_state,
  }
}
