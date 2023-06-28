import { BiRightArrowAlt } from "react-icons/bi"
import _ from "lodash"
import PromptIcon from "@/assets/prompt.svg"
import { useEffect, useState } from "react"
//@ts-ignore
import { fieldFocus } from "@/components//libraries/fieldFocus"
import { AiTwotoneAlert } from "react-icons/ai"
import { createUser } from "@/components//libraries/auth"
import { useNavigate, Link } from "react-router-dom"
import { setActiveUser } from "@/components/libraries/active_user"
import { UserT } from "@/data/loaders/user"
import { useAuth } from "@/components/hooks/useAuth"
import { UserS } from "@/data/schemas/user"

export function OnboardingPage() {
  const [messages, setMessages] = useState<string[]>([
    "<p>Hi there, <strong>welcome to Prompt!</strong></p>",
    "<p><strong>Prompt is an all-in-one application for AI-powered creators and professionals.</strong> Prompt is extendable, so you can use Prompt to create anything from a blog post to a music album (once audio modules are available).</p>",
    "<p><strong>Prompt is and always will be free</strong>, but using commercial AI, like ChatGPT, will cost based on usage. However, soon, you'll be able to run AI models locally through Prompt.</p>",
    "<p>Create an account to get started. <u>All your data is stored only locally and the Prompt team has no access to your data.</u></p>",
    "<span class='text-xs font-semibold'>FYI, this version of Prompt is still a technology preview, so expect things to break and change. You can follow our progress at <a href='https://github.com/promptc0/a0' target='_blank' class='underline tooltip tooltip-top' data-tip='stars appreciated ;)'>github</a> or <a href='https://twitter.com/promptc0' target='_blank' class='underline tooltip tooltip-top' data-tip='follow for updates'>twitter</a>.</span>",
  ])
  const [char, setChar] = useState<{ m: string; t: number }>({ m: "", t: 0 })

  let auth = useAuth()

  const [username, setUsername] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [reminder, setReminder] = useState<string>("")

  const navigate = useNavigate()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (reminder.length < 10) {
      if (
        !confirm(
          "Your password reminder seems very short, are you sure it's enough?\n\nPrompt is built privacy-first and everything is encrypted to the teeth, but an unfortunate side-effect of that is that the Prompt team can not recover lost passwords."
        )
      )
        return
    }
    if (reminder.match(password)) {
      alert("Your password reminder can not contain your password.")
      return
    }
    const created_user = await createUser({ username, password, reminder })
    
    if (!created_user || !UserS.safeParse(created_user.user).success) return null
    setActiveUser(created_user.user as UserT)
    setTimeout(() => {
      auth.signin({ username: created_user.user.meta?.username || username, password }, () => {
        navigate("/conductor/")
      })
    }, 200)
  }

  useEffect(() => {
    fieldFocus({ selector: "#username" })
  }, [])
  /* 
  useEffect(() => {
    const msgs = [
      "Hi there, welcome to Prompt!",
      "Prompt is a unified interface for all things AI.\r\r\rPrompt's goal is to make AI usable for every one.",
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
      <div className="flex flex-1 flex-grow h-full justify-center items-center bg-zinc-800/50 border-r border-r-zinc-700/30">
        <form className="flex flex-col w-full mx-10 justify-start items-start max-w-screen-sm" onSubmit={handleSubmit}>
          <div className="text-lg font-semibold text-zinc-400 mb-5">Create an account (it's free)</div>
          <div className="flex flex-col w-full gap-2">
            <label className="flex flex-row bg-zinc-700/30 border border-zinc-900 border-t-zinc-700 rounded-lg items-center  pl-4 text-xs  font-semibold">
              Username:
              <input
                className="flex flex-1 w-full p-4 py-3 bg-transparent text-xs  border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent input  font-normal"
                name="username"
                type="username"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                      .toLowerCase()
                      .trim()
                      .replace(/[^A-Za-z0-9_]/g, "")
                  )
                }
                placeholder="Type your username"
                id="username"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="flex flex-row bg-zinc-700/30 border border-zinc-900 border-t-zinc-700 rounded-lg items-center pl-4 text-xs font-semibold">
              Password:
              <input
                className="flex flex-1 p-4 py-3 bg-transparent text-xs border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent input  font-normal"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value.trim())}
                placeholder="Type your password"
                id="password"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col bg-zinc-700/30 border border-zinc-900 border-t-zinc-700 rounded-lg items-start px-4 py-2 text-xs font-semibold">
              Password reminder in case you forget your password:
              <textarea
                className="flex flex-1 w-full px-0 py-1 bg-transparent text-xs border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent font-normal"
                name="reminder"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                placeholder="Type your reminder"
                id="reminder"
                autoComplete="off"
                spellCheck={false}
                style={{ resize: "none", height: "auto" }}
              />
              <div className="flex w-full justify-center">
                <span className="text-[11px] w-full font-normal text-zinc-400 bg-zinc-900/40 py-1 px-2 rounded flex justify-start items-center ">
                  <AiTwotoneAlert className="text-yellow-300 inline-block mr-2 w-4 h-4" />
                  <p>
                    Anyone who knows your username has access to this, so{" "}
                    <u>make sure the reminder not your password</u> or easily guessable.
                  </p>
                </span>
              </div>
            </label>
            <button
              type="submit"
              disabled={username.length === 0 || password.length === 0 || reminder.length === 0}
              className="bg-zinc-700/50 hover:bg-zinc-700/80 border border-zinc-900 border-t-zinc-700 lex inset-y-0 right-0 font-medium rounded-lg text-sm text-zinc-400 hover:text-zinc-200 p-4 py-3 justify-start items-start text-left"
            >
              Create account <BiRightArrowAlt className="float-right w-5 h-5" />
            </button>
            <Link to="/authentication" className=" mt-10 w-full flex">
              <button
                type="button"
                className="bg-zinc-800/30 hover:bg-zinc-900/70 border border-dashed border-zinc-700  border-t-zinc-600/70 lex inset-y-0 right-0 font-medium rounded-lg text-sm text-zinc-400 hover:text-zinc-200 p-4 py-3 justify-start items-start text-left"
              >
                I already have an account <BiRightArrowAlt className="float-right w-5 h-5 ml-3" />
              </button>
            </Link>
            {/* {typeof PublicKeyCredential !== "undefined" ? (
              <div className="flex flex-row justify-center items-center">
                <div className="bg-zinc-700/30 border border-zinc-900  border-t-zinc-700/70 rounded-md p-3 ml-2 h-full btn-square cursor-pointer text-zinc-400 hover:text-zinc-200">
                  <IoFingerPrintOutline className="  h-full w-full" />
                </div>
              </div>
            ) : null} */}
          </div>
        </form>
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
                      <img className="w-3 h-3 opacity-60" src={PromptIcon} />
                    </div>
                  </div>
                  <div
                    dangerouslySetInnerHTML={{ __html: msg }}
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