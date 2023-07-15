import { ph } from "@/components/libraries/logging"
import { useEffect } from "react"

export default function Tabs() {
  useEffect(() => {
    ph().capture("experiences/onboarding/v1/input")
  }, [])

  return (
    <div className="flex flex-col gap-3 text-left">
      <p className="flex text-xl font-semibold items-center">The Prompt Input</p>
      <p className="">
        This field here is what you use to talk to the AI. Right now, it's only text but in near future, you might find
        a microphone icon on it, and maybe even ability to add files...
      </p>
      <p className="">If you have ever sent a message before, prompt input should feel familiar 😉</p>
    </div>
  )
}
