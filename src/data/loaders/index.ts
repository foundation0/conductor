import { state as AppState } from "@/data/loaders/app"
import { state as UserState } from "@/data/loaders/user"
import { state as SessionState } from "@/data/loaders/sessions"
import { state as ClipboardState } from "@/data/loaders/clipboard"
import { state as UsersState } from "@/data/loaders/users"
import { getActiveUser } from "@/components/libraries/active_user"

const noopAPI = { get: () => null, set: () => null }

let API: any = {

}

async function initLoaders() {
  const users_state = await UsersState()
  const active_user = getActiveUser()
  if(!active_user) {
    // when user is not authentication
    if(API._status === 'unauthenticated') return API
    API = {
      _status: 'unauthenticated',
      AppState: noopAPI,
      UserState: noopAPI,
      SessionState: noopAPI,
      ClipboardState: noopAPI,
      UsersState: users_state
    }
  } else {
    // when user is authentication
    if(API._status === 'authenticated') return API
    const user = await UserState()
    const app_state = await AppState()
    const session_state = await SessionState()
    const clipboard_state = await ClipboardState()
    API = {
      _status: 'authenticated',
      AppState: app_state,
      UserState: user,
      SessionState: session_state,
      ClipboardState: clipboard_state,
      UsersState: users_state
    }
  }
  return API
}

export { initLoaders }
