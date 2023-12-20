import { UserT } from "@/data/schemas/user"
import { ph } from "@/libraries/logging"
import { useEffect } from "react"
import { useNavigate, useParams, useLoaderData } from "react-router-dom"
import { markExperienceAsComplete } from "../.."
import useMemory from "@/components/hooks/useMemory"

export default function Notepad() {
  const navigate = useNavigate()
  const workspace_id = useParams().workspace_id
  const session_id = useParams().session_id
  // const { user_state } = useLoaderData() as { user_state: UserT }
  const user_state = useMemory<UserT>({ id: "user" })

  
  useEffect(() => {
    ph().capture("experiences/onboarding/v1/input_actions")
    markExperienceAsComplete({ experience_id: "onboarding/v1", user_state }).then(() => {
      navigate(`/c/${workspace_id}/${session_id}`, { replace: true })
    })
  }, [])
  return (
    <div className="flex flex-col gap-3 text-left">
      <p className="flex text-xl font-semibold items-center">Notepad</p>
      <p className="">
        Whenever your AI gives you something interesting, you can store it to your session notepad.
      </p>
      <p>
        Click this icon to access your session's notepad. You can export your
        notes as a text file, copy to clipboard or import them as data to
        Conductor, so you can use your notes in any other session.
      </p>
    </div>
  )
}
