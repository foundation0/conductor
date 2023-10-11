import { ph } from "@/libraries/logging"
import { useEffect } from "react"

export default function WorkspaceSidebar() {
  useEffect(() => {
    ph().capture("experiences/onboarding/v1/workspace_sidebar")
  }, [])

  return (
    <div className="flex flex-col gap-3 text-left">
      <p className="flex text-xl font-semibold items-center">Workspace sidebar</p>
      <p className="">Workspace sidebar gives you access to anything related to the active workspace.</p>
      <p className="">At the top, you can see the name and access workspace's settings.</p>
      <p className="">Below that are the icons that allows you to switch between workspace's sessions, data, members and modules.</p>
    </div>
  )
}
