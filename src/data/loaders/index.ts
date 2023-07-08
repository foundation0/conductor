import { state as AppState } from "@/data/loaders/app"
import { state as UserState } from "@/data/loaders/user"
import { state as SessionState } from "@/data/loaders/sessions"
import { state as ClipboardState } from "@/data/loaders/clipboard"
import { state as UsersState } from "@/data/loaders/users"
import { state as MessagesState } from "@/data/loaders/messages"
import { getActiveUser } from "@/components/libraries/active_user"
import _ from "lodash"
import { sleep } from "@/components/libraries/utilities"
import { AppStateT } from "@/data/loaders/app"

const noopAPI = { get: () => null, set: () => null }

let API: any = {}
let APICache: any = {}
let SessionCache: any = {}

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
      ClipboardState: noopAPI,
      MessagesState: noopAPI,
      UsersState: APICache?.users_state || (await UsersState()),
    }
    APICache = { ...APICache, users_state: API.UsersState }
  } else {
    // when user is authentication
    if (API._status === "authenticated") return API
    const user_state = APICache?.user_state || (await UserState())
    const app_state = APICache?.app_state || (await AppState())
    const session_state = APICache?.session_state || (await SessionState())
    const clipboard_state = APICache?.clipboard_state || (await ClipboardState())
    const users_state = APICache?.users_state || (await UsersState())

    // set cache
    APICache = { ...APICache, user_state, app_state, session_state, clipboard_state, users_state }

    API = {
      _status: "authenticated",
      AppState: app_state,
      UserState: user_state,
      SessionState: session_state,
      MessagesState: async ({ session_id }: { session_id: string }) => {
        if (SessionCache[session_id]) return SessionCache[session_id]
        const s = await MessagesState({ session_id })
        SessionCache[session_id] = s
        return s
      },
      ClipboardState: clipboard_state,
      UsersState: users_state,
    }
  }
  return API
}

export const loader = async () => {
  const { AppState, UserState, SessionState, ClipboardState, MessagesState, UsersState } = await initLoaders()
  const users_state = await UsersState.get()
  const app_state: AppStateT = await AppState.get()
  const user_state = await UserState.get()
  const sessions_state = await SessionState.get()
  const clipboard_state = await ClipboardState.get()
  const messages_state = _.get(app_state, `active_sessions[${app_state?.active_workspace_id}].session_id`)
    ? await MessagesState({
        session_id: _.get(app_state, `active_sessions[${app_state?.active_workspace_id}].session_id`),
      })
    : []
  return { app_state, user_state, sessions_state, clipboard_state, messages_state, MessagesState, users_state }
}
