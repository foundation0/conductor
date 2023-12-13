import { ph } from "@/libraries/logging"
import { useEffect } from "react"

export default function WorkspaceSelector() {
  useEffect(() => {
    ph().capture("experiences/onboarding/v1/workspace_selector")
  }, [])
  return (
    <div className="flex flex-col gap-3 text-left">
      <p className="flex text-xl font-semibold items-center">Workspaces</p>
      <p className="">
        Here are your workspaces. Conductor created one for you when you created
        your account.
      </p>
      <p>
        You can use them to separate projects. Click the plus icon to create a
        new workspace. You can create as many as you want.
      </p>
    </div>
  )
}
