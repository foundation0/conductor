import { UserT } from "@/data/loaders/user"
import { UserS } from "@/data/schemas/user"
import { setActiveUser } from "@/libraries/active_user"
import { createUser, convertGuestData } from "@/libraries/auth"
import eventEmitter from "@/libraries/events"
import { fieldFocus } from "@/libraries/field_focus"
import { ph } from "@/libraries/logging"
import { useState, useEffect } from "react"
import { AiFillEyeInvisible, AiFillEye, AiTwotoneAlert } from "react-icons/ai"
import { BiRightArrowAlt } from "react-icons/bi"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { del as delLS } from "@/data/storage/localStorage"

export function RegisterForm({ convert_guest }: { convert_guest?: boolean }) {
  let auth = useAuth()

  const [username, setUsername] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [reminder, setReminder] = useState<string>("")
  const [loginInProgress, setLoginInProgress] = useState<boolean>(false)
  const [show_password, setShowPassword] = useState<boolean>(false)

  const navigate = useNavigate()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!username || !email || !password || !reminder) {
      return alert("Please fill in all fields")
    }
    setLoginInProgress(true)
    if (reminder.length < 10) {
      if (
        !confirm(
          "Your password reminder seems very short, are you sure it's enough?\n\nPrompt is built privacy-first and everything is encrypted to the teeth, but an unfortunate side-effect of that is that the Conductor team can not recover lost passwords. That means that your reminder is the only way for you to recover a forgotten password."
        )
      )
        return
    }
    if (reminder.match(password)) {
      alert("Your password reminder can not contain your password.")
      return
    }
    let custom_master_key: string | undefined
    if (convert_guest) {
      custom_master_key = auth.user.master_key
      delLS({ key: "guest-mode" })
    }

    const created_user = await createUser({
      username,
      password,
      reminder,
      email,
      guest: convert_guest,
      custom_master_key,
    })

    if (!created_user || !UserS.safeParse(created_user.user).success) return null

    if (convert_guest) {
      await ph().capture("auth/_convert_guest", { username: created_user.user.meta?.username || username })
      await convertGuestData({ guest_user: auth.user as UserT, user: created_user.user as UserT })
    }

    await setActiveUser(created_user.user as UserT)
    ph().capture("auth/_registration")
    setTimeout(() => {
      auth.signin({ username: created_user.user.meta?.username || username, password }, () => {
        window.location.reload()
      })
    }, 200)
  }

  useEffect(() => {
    fieldFocus({ selector: "#username" })
  }, [])

  // monitor for error events
  useEffect(() => {
    const handleErrorEvent = async (error: any) => {
      setLoginInProgress(false)
    }

    eventEmitter.on("new_error", handleErrorEvent)

    return () => {
      eventEmitter.off("new_error", handleErrorEvent)
    }
  }, [])

  return (
    <form className="flex flex-col w-full justify-center items-center max-w-screen-sm">
      <div className="text-lg font-semibold text-zinc-400 mb-5">Conductor is in private beta, contact Marko for access</div>
    </form>
  )

  return (
    <form className="flex flex-col w-full justify-start items-start max-w-screen-sm" onSubmit={handleSubmit}>
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
        <label className="flex flex-row bg-zinc-700/30 border border-zinc-900 border-t-zinc-700 rounded-lg items-center  pl-4 text-xs  font-semibold">
          Email:
          <input
            className="flex flex-1 w-full p-4 py-3 bg-transparent text-xs  border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent input  font-normal"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            placeholder="Type your email"
            id="email"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-row bg-zinc-700/30 border border-zinc-900 border-t-zinc-700 rounded-lg items-center pl-4 text-xs font-semibold">
          Password:
          <input
            className="flex flex-grow p-4 py-3 bg-transparent text-xs border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent input  font-normal"
            name="password"
            type={show_password ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value.trim())}
            placeholder="Type your password"
            id="password"
            autoComplete="off"
          />
          <div
            className="flex float-right justify-end pr-4"
            onClick={(e) => {
              e.preventDefault()
              setShowPassword(!show_password)
            }}
          >
            {show_password ? (
              <AiFillEyeInvisible className="w-4 h-4 text-zinc-500 cursor-pointer" />
            ) : (
              <AiFillEye className="w-4 h-4 text-zinc-500 cursor-pointer" />
            )}
          </div>
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
                Anyone who knows your username has access to this, so <u>make sure the reminder not your password</u> or
                easily guessable.
              </p>
            </span>
          </div>
        </label>
        <button type="submit" className="p-btn-primary">
          {convert_guest ? "Convert your guest account" : "Create account"}{" "}
          {loginInProgress ? (
            <div className="float-right w-5 h-5 flex justify-center items-center" role="status">
              <svg
                aria-hidden="true"
                className="inline w-4 h-4 mr-2 text-white animate-spin fill-[#0B99FF]"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
              <span className="sr-only">Loading...</span>
            </div>
          ) : (
            <BiRightArrowAlt className="float-right w-5 h-5" />
          )}
        </button>

        {/* {typeof PublicKeyCredential !== "undefined" ? (
      <div className="flex flex-row justify-center items-center">
        <div className="bg-zinc-700/30 border border-zinc-900  border-t-zinc-700/70 rounded-md p-3 ml-2 h-full btn-square cursor-pointer text-zinc-400 hover:text-zinc-200">
          <IoFingerPrintOutline className="  h-full w-full" />
        </div>
      </div>
    ) : null} */}
      </div>
    </form>
  )
}
