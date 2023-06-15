import Conductor from "@/components/conductor/"
import { WorkspaceIdR, WorkspaceR } from "../workspace/routes"
import { AppState, UserState } from "@/data/loaders"
import Settings from "@/components/conductor/settings"

const loader = async () => {
  const app_state = await AppState.get()
  const user_state = await UserState.get()
  return { app_state, user_state }
}

export const SettingsR = {
  loader,
  path: "settings",
  element: <Settings />,
}

export const ConductorR = {
  path: "/conductor",
  element: <Conductor />,
  loader,
  children: [WorkspaceR, WorkspaceIdR, SettingsR],
}
