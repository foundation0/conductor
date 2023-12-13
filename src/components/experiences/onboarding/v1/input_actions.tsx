import { ph } from "@/libraries/logging"
import { useEffect } from "react"

export default function InputActions() {
  useEffect(() => {
    ph().capture("experiences/onboarding/v1/input_actions")
  }, [])
  return (
    <div className="flex flex-col gap-3 text-left">
      <p className="flex text-xl font-semibold items-center">Input Actions</p>
      <p className="">
        Here you can access session settings, clear messages and see the used tokens and cost of the current session.
      </p>
      <p>The color green indicates you are within AI's memory limits. Click the green icon to access advanced session settings.</p>
    </div>
  )
}
