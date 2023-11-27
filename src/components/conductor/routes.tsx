import Conductor from "@/components/conductor/"
import { WorkspaceIdR, WorkspaceR } from "@/components/workspace/routes"
import { loader } from "@/data/loaders"
import Settings from "@/components/conductor/settings"
import { UserIdR } from "@/components/user/routes"
import { RequireAuth } from "@/libraries/auth"
import { AIR } from "@/components/ai/routes"
import { Admin } from "./admin"
import CallHistory from "./call_history"

export const SettingsR = {
  loader,
  path: "settings",
  element: <Settings />,
}

export const CallHistoryR = {
  loader,
  path: "call-history",
  element: <CallHistory />,
}

export const AdminR = {
  loader,
  path: "internal::admin",
  element: <Admin />,
}

export const ConductorR = {
  path: "/c/",
  element: (
    <RequireAuth>
      <Conductor />
    </RequireAuth>
  ),
  loader,
  children: [WorkspaceR, WorkspaceIdR, SettingsR, UserIdR, AIR, AdminR, CallHistoryR],
}
