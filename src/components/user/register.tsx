import _ from "lodash"
import PromptIcon from "@/assets/prompt.svg"
import { useEffect, useState } from "react"
//@ts-ignore
import { fieldFocus } from "@/libraries/field_focus"
import { RegisterForm } from "./register_form"
import { BiRightArrowAlt } from "react-icons/bi"
import { Link } from "react-router-dom"

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

  /* 
  useEffect(() => {
    const msgs = [
      "Hi there, welcome to Conductor!",
      "Conductor is a unified interface for all things AI.\r\r\rConductor's goal is to make AI usable for every one.",
      "I'm here to help you get started.",
    ]
    // split per character and add each character to the latest message, once done, move to the next message
    forEachSeries(msgs, (msg: string, msg_done: Function) => {
      // for each message, split into characters and send to processChar
      const chars = msg.split("")
      // use setTimeout to send each character to processChar with 50ms delay
      // console.log(messages)
      forEachSeries(
        chars,
        (char: string, char_done: Function) => {
          setChar({ m: char, t: new Date().getTime() })
          setTimeout(char_done, 25)
        },
        () => {
          setChar({ m: "::newmessage::", t: new Date().getTime() })
          setTimeout(msg_done, 1000)
        }
      )
      // when done, create a new message in messages and move to the next msg
    })
  }, [])

  useEffect(() => {
    // if (char.length === 0) return
    const messages_clone = _.cloneDeep(messages)
    if (char.m === "::newmessage::") {
      messages_clone[messages_clone.length - 1] = messages_clone[messages_clone.length - 1].slice(0, -1)
      messages_clone.push("")
      setMessages(messages_clone)
      return
    }

    messages_clone[messages_clone.length - 1] = messages_clone[messages_clone.length - 1].slice(0, -1) + char.m + "▮"
    setMessages(messages_clone)
  }, [char.t])
 */
  return (
    <div className="flex flex-row h-full w-full bg-zinc-900" style={{ backgroundImage: `data:${PromptIcon}` }}>
      <div className="flex flex-1 flex-col flex-grow h-full justify-center items-center bg-zinc-800/50 border-r border-r-zinc-700/30">
        <RegisterForm />
        <Link to="/login" className="mt-10 w-full flex justify-center items-center">
          <button
            type="button"
            className="bg-zinc-800/30 hover:bg-zinc-900/70 border border-dashed border-zinc-700  border-t-zinc-600/70 lex inset-y-0 right-0 font-medium rounded-lg text-sm text-zinc-400 hover:text-zinc-200 p-4 py-3 "
          >
            I already have an account <BiRightArrowAlt className="float-right w-5 h-5 ml-3" />
          </button>
        </Link>
      </div>
      <div className="flex flex-1 flex-grow items-start flex-col gap-4 justify-center bg-zinc-900 bg-gradient-to-br from-zinc-900 to-zinc-800 px-10 ">
        {messages?.length > 0
          ? messages.map((msg, index) => {
              if (!msg) return null
              return (
                <div key={index} className="flex flex-row gap-2 max-w-screen-sm">
                  <div className="flex flex-1 justify-center items-start h-full">
                    <div
                      className={`flex justify-center items-center bg-zinc-800 text-zinc-200 rounded w-9 h-9 border-t border-zinc-700`}
                    >
                      {/* <img className="w-3 h-3 opacity-60" src={PromptIcon} /> */}
                      {msg[0]}
                    </div>
                  </div>
                  <div
                    dangerouslySetInnerHTML={{ __html: msg[1] }}
                    className="flex flex-col border-t border-t-zinc-700 py-2 px-4 text-sm rounded-lg justify-center h-full items-start border-zinc-800 bg-zinc-800 text-zinc-300"
                  ></div>
                </div>
              )
            })
          : null}
      </div>
    </div>
  )
}
