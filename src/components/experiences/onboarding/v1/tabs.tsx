import { ph } from "@/libraries/logging"
import { useEffect } from "react"

export default function Tabs() {
  useEffect(() => {
    ph().capture("experiences/onboarding/v1/tabs")
  }, [])
  return (
    <div className="flex flex-col gap-3 text-left">
      <p className="flex text-xl font-semibold items-center">Open sessions</p>
      <p className="">Here you can find your open sessions as tabs.</p>
      <p className="">
        Tabs come in handy when you are working on multiple sessions at the same time. You don't have to have
        multiple browser tabs open anymore because it's all built into Conductor.
      </p>
    </div>
  )
}
