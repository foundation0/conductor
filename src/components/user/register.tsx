import _ from "lodash"
import PromptIcon from "@/assets/prompt.svg"
import { useEffect, useState } from "react"
//@ts-ignore
import { fieldFocus } from "@/libraries/field_focus"
import { RegisterForm } from "./register_form"
import { BiRightArrowAlt } from "react-icons/bi"
import { Link } from "react-router-dom"
import { FaDiscord, FaGithub, FaSquareXTwitter } from "react-icons/fa6"

export function RegisterPage() {
  const [messages, setMessages] = useState<[string, string][]>([
    [
      "👋",
      "<p>Embark on a journey with Conductor, where AI-powered conversations fuel your professional creativity and productivity.</p>",
    ],
    [
      "🗂",
      "<p>Simplify your workflow with our unique multi-workspace feature, designed to keep your projects organized and your mind clear.</p>",
    ],
    [
      "🌐",
      "<p>Unleash your potential with Conductor's model-agnostic approach, supporting any AI model, including open-source options, for limitless possibilities.</p>",
    ],
    [
      "🔜",
      "Get ready for an exciting expansion into image, video, and audio models, set to broaden your creative canvas.",
    ],
    [
      "⚠️",
      "<span class='text-xs font-semibold'>Heads up! Conductor is currently a technology preview. Stay connected with our progress on <a href='https://github.com/promptc0/a0' target='_blank' class='underline tooltip tooltip-top' data-tip='stars appreciated ;)'>github</a> or <a href='https://twitter.com/promptc0' target='_blank' class='underline tooltip tooltip-top' data-tip='follow for updates'>twitter</a>. Your support is our motivation!</span>",
    ],
  ])
  const [char, setChar] = useState<{ m: string; t: number }>({ m: "", t: 0 })

  useEffect(() => {
    fieldFocus({ selector: "#username" })
  }, [])

  return (
    <div
      className="flex flex-row h-full w-full bg-zinc-900"
      style={{ backgroundImage: `data:${PromptIcon}` }}
    >
      <div className="flex flex-1 flex-col flex-grow h-full justify-center items-center bg-zinc-800/50 border-r border-r-zinc-700/30 px-10">
        <RegisterForm />
        <Link
          to="/login"
          className="mt-10 w-full flex justify-center items-center"
        >
          <button
            type="button"
            className="bg-zinc-800/30 hover:bg-zinc-900/70 border border-dashed border-zinc-700  border-t-zinc-600/70 lex inset-y-0 right-0 font-medium rounded-lg text-sm text-zinc-400 hover:text-zinc-200 p-4 py-3 "
          >
            I already have an account{" "}
            <BiRightArrowAlt className="float-right w-5 h-5 ml-3" />
          </button>
        </Link>
      </div>
      <div className="flex flex-1 flex-grow items-center flex-col gap-4 justify-center bg-zinc-900 bg-gradient-to-br from-zinc-900 to-zinc-800 px-10 ">
        <div className="flex flex-1 flex-col"></div>
        <div className="flex flex-1 flex-col justify-center items-center">
          <img className="text-center w-40 h-40 opacity-10" src={PromptIcon} />
          <div className="text-xl font-semibold text-zinc-400 text-center flex flex-row">
            Welcome to Conductor <span className="flex text-[10px] h-5 font-bold uppercase bg-zinc-900 border border-yellow-300/50 px-2 py-1 ml-2 rounded justify-center items-center">
          Beta
        </span>
          </div>
          <div className="text-md text-zinc-500 text-center">
            A general purpose AI tool for
            <br />
            creators, professionals and organizations
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-end mb-1 gap-2">
          <div className="flex flex-row justify-center text-xl text-zinc-500 gap-3 ">
            <a className="hover:text-zinc-200 transition-all" href="https://github.com/foundation0/conductor" target="_blank">
              <FaGithub />
            </a>
            <a className="hover:text-zinc-200 transition-all" href="https://twitter.com/ConductorC0" target="_blank">
              <FaSquareXTwitter />
            </a>
            <a className="hover:text-zinc-200 transition-all" href="https://discord.gg/PFMtbdrvXw" target="_blank">
              <FaDiscord />
            </a>
          </div>
          <div className="flex flex-col justify-center items-center text-xs  text-zinc-600">
            <p className="font-semibold">Crafted by <a href="https://foundation0.net" target="_blank" className="underline hover:text-zinc-200 transition-all">Foundation 0</a></p>
            <p>decentralized and democratized AI for all</p>
          </div>
        </div>
      </div>
    </div>
  )
}
