import { ph } from "@/libraries/logging"
import { useEffect } from "react"
import { useLoaderData, useNavigate, useParams } from "react-router-dom"
import { markExperienceAsComplete } from "../.."
import { UserT } from "@/data/loaders/user"

export default function Tabs() {
  const navigate = useNavigate()
  const workspace_id = useParams().workspace_id
  const session_id = useParams().session_id
  const { user_state } = useLoaderData() as { user_state: UserT }

  useEffect(() => {
    ph().capture("experiences/onboarding/v1/input")
    /* markExperienceAsComplete({ experience_id: "onboarding/v1", user_state }).then(() => {
      navigate(`/c/${workspace_id}/${session_id}`, { replace: true })
    }) */
  }, [])

  return (
    <div className="flex flex-col gap-3 text-left">
      <p className="flex text-xl font-semibold items-center">The Conductor Input</p>
      <p className="">
        This field here is what you use to talk to the AI. Right now, it's only text but in near future, you might find
        a microphone icon on it, and ability to add images...
      </p>
      <p className="">If you have ever used ChatGPT, input should feel familiar 😉</p>
    </div>
  )
}
