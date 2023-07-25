import Conductor from "@/components/conductor/"
import { WorkspaceIdR, WorkspaceR } from "@/components/workspace/routes"
import { initLoaders, loader } from "@/data/loaders"
import Settings from "@/components/conductor/settings"
import { LocalUsersR, UserIdR } from "@/components/user/routes"
import { RequireAuth } from "@/components/libraries/auth"
import { AIR } from "@/components/ai/routes"

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
  children: [WorkspaceR, WorkspaceIdR, SettingsR, UserIdR, AIR],
}
