import { ph } from "@/components/libraries/logging"
import { useEffect } from "react"

export default function Welcome() {
  useEffect(() => {
    ph().capture("experiences/onboarding/v1/welcome")
  }, [])
  
  return (
    <div className="flex flex-col gap-3 text-left">
      <p className="flex text-xl font-semibold items-center">
        Welcome to Prompt{" "}
        <span className="flex text-[10px] h-5 font-bold uppercase bg-zinc-900 border border-yellow-300/50 px-2 py-1 ml-2 rounded justify-center items-center">
          Beta
        </span>
      </p>
      <p className="">Hi there, a few important words before we let you get into it...</p>
      <p className="">
        As of today, Prompt is <i>"ChatGPT for professionals"</i>. But soon, Prompt will go beyond chat with support for
        documents, images, audio, video, and 3D.
      </p>
      <p className="">
        As you will notice, in its current form, Prompt gives you powerful tools to organize and manage your AI work.
      </p>
      <p>
        <strong>Next</strong>, you'll get a super quick introduction to the interface so you can hit the ground running.
      </p>
      <div className="bg-zinc-900 p-3 pt-2 text-xs font-light rounded border border-zinc-700">
        <strong>Important!</strong> Prompt is a community-driven project. If you want a feature in Prompt, let us know,
        and the community will build it. Find us at{" "}
        <a
          href="https://github.com/promptc0/a0"
          target="_blank"
          className="underline tooltip tooltip-top"
          data-tip="stars appreciated ;)"
        >
          Github
        </a>
        ,{" "}
        <a
          href="https://twitter.com/promptc0"
          target="_blank"
          className="underline tooltip tooltip-top"
          data-tip="follow for updates"
        >
          Twitter
        </a>{" "}
        and{" "}
        <a
          href="https://discord.gg/PFMtbdrvXw"
          target="_blank"
          className="underline tooltip tooltip-top"
          data-tip="discussions here"
        >
          Discord
        </a>
        .
      </div>
    </div>
  )
}
