import Conductor from "@/components/conductor/"
import { WorkspaceIdR, WorkspaceR } from "../workspace/routes"
import { initLoaders } from "@/data/loaders"
import Settings from "@/components/conductor/settings"
import { LocalUsersR, UserIdR } from "@/components/user/routes"
import { RequireAuth } from "../libraries/auth"

const loader = async () => {
  const { AppState, UserState } = await initLoaders()
  const user_state = UserState ? await UserState.get() : null
  const app_state = AppState ? await AppState.get() : null
  return { app_state, user_state }
}

export const SettingsR = {
  loader,
  path: "settings",
  element: <Settings />,
}

export const ConductorR = {
  path: "/conductor/",
  element: (
    <RequireAuth>
      <Conductor />
    </RequireAuth>
  ),
  loader,
  children: [WorkspaceR, WorkspaceIdR, SettingsR, UserIdR],
}
