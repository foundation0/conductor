import { ph } from "@/libraries/logging"
import { useEffect } from "react"

export default function Welcome() {
  useEffect(() => {
    ph().capture("experiences/onboarding/v1/welcome")
  }, [])

  return (
    <div className="flex flex-col gap-3 text-left text-zinc-300">
      <p className="flex text-xl font-semibold items-center text-zinc-100">
        Welcome to Conductor{" "}
        <span className="flex text-[10px] h-5 font-bold uppercase bg-zinc-900 border border-yellow-300/50 px-2 py-1 ml-2 rounded justify-center items-center">
          Beta
        </span>
      </p>
      <p className="">
        In its current form, Conductor is{" "}
        <strong>"multi-model ChatGPT&trade; for creators & professionals"</strong>. But soon you can create
        documents, images, audio, video, 3D and agents.
      </p>
      <p className="">
        Conductor is designed to make it easy to use AIs for creating, researching and producing whatever is on your mind.
      </p>
      <p className="text-lg font-bold text-zinc-100">
        All the AIs at your fingertips
      </p>
      <p>
        Conductor is not like ChatGPT&trade; where you can only use OpenAI models. With
        Conductor, you can use any AI available in the market.
      </p>
      <p>
        If you don't like the results you are getting, change the AI and try again.
      </p>
      <div className="h-[1px] w-full bg-zinc-700"/>
      <p>
        <strong className="text-zinc-100">Next</strong>, to get you started fast, you'll get a super quick introduction to the
        interface.
      </p>
      <div className="bg-zinc-900 p-3 pt-2 text-xs font-light rounded border border-zinc-700">
        <strong>Important!</strong> Conductor is a community-driven, open-source project. If
        you want a feature in Conductor, let us know, and the community will
        build it. Find us at{" "}
        <a
          href="https://github.com/foundation0/conductor"
          target="_blank"
          className="underline tooltip tooltip-top"
          data-tip="stars appreciated ;)"
        >
          Github
        </a>
        ,{" "}
        <a
          href="https://twitter.com/conductorc0"
          target="_blank"
          className="underline tooltip tooltip-top"
          data-tip="follow for updates"
        >
          X/Twitter
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
