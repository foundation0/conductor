import { useEffect, useState } from "react"
import { useLoaderData, useNavigate, useParams } from "react-router-dom"
import { UserT } from "@/data/loaders/user"
import _, { set } from "lodash"
import UserActions from "@/data/actions/user"
import { BiRightArrowAlt } from "react-icons/bi"
import { fieldFocus } from "@/components/libraries/field_focus"
import Lottie from "lottie-light-react"
import Success from "@/assets/animations/success.json"
import { ph } from "@/components/libraries/logging"

export default function OpenAISetup() {
  const [api_key, setApiKey] = useState<string>("")
  const [btn_text, setBtnText] = useState<string>("Test connection")
  const { user_state } = useLoaderData() as { user_state: UserT }
  const [test_in_progress, setTestInProgress] = useState<boolean>(false)
  const [onboarding_done, setOnboardingDone] = useState<boolean>(false)
  const workspace_id = useParams().workspace_id
  const session_id = useParams().session_id
  const navigate = useNavigate()

  useEffect(() => {
    ph().capture("experiences/onboarding/v1/openai_setup")
  }, [])
  

  async function handleAPIKey() {
    if (api_key.match(/sk-/)) {
      setBtnText("Testing connection...")
      setTestInProgress(true)
      const is_valid = await fetch("https://api.openai.com/v1/engines", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${api_key}`,
        },
      })
      if (is_valid.status === 200) {
        setBtnText("Connected!")
        let new_user_state = { ...user_state, ..._.set(user_state, "modules.installed.0.settings.api_key", api_key) }
        if (!new_user_state.experiences) new_user_state.experiences = []
        if (!new_user_state.experiences.find((e) => e.id === "onboarding/v1")) {
          new_user_state.experiences.push({
            id: "onboarding/v1",
            completed: true,
          })
        }
        await UserActions.updateUser(new_user_state)
        navigate(`/conductor/${workspace_id}/${session_id}`, { replace: true })

        setOnboardingDone(true)
        ph().capture("experiences/onboarding/v1/_completed")
      } else {
        setBtnText("⚠️ Invalid API key")
        setTimeout(() => {
          setBtnText("Test connection")
        }, 2000)
      }
      setTestInProgress(false)
    }
  }

  useEffect(() => {
    // select the second div child of .react-joyride__tooltip
    const selector: HTMLDivElement | null = document.querySelector(".react-joyride__tooltip > div:nth-child(2)")
    selector?.style?.setProperty("display", "none")
  }, [])
  return !onboarding_done ? (
    <div className="flex flex-col gap-3 text-left">
      <p className="flex text-xl font-semibold items-center">Last step - OpenAI setup</p>
      <p className="">
        As of now, Prompt has one LLM module built-in, OpenAI. But, Prompt was designed to be model agnostic. Very soon,
        any model can be integrated to work with Prompt, including local ones.
      </p>
      <p className="mt-2">
        <strong>
          Log into{" "}
          <a href="https://platform.openai.com/account/api-keys" target="blank" className="underline text-sky-500">
            OpenAI API console
          </a>
          , create a new API key and copy/paste it here, then click the button:
        </strong>
      </p>
      <label className="flex flex-row bg-zinc-700/30 border border-zinc-900/60 border-t-zinc-700/50 rounded-lg items-center  pl-4 text-xs  font-semibold">
        OpenAI API key:
        <input
          className="flex flex-1 w-full p-4 py-3 bg-transparent text-xs  border-0 rounded  placeholder-zinc-400 text-zinc-300 outline-none focus:outline-none ring-0 shadow-transparent input  font-normal"
          name="api_key"
          type="text"
          value={api_key}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Your OpenAI API key"
          id="api_key"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <button
        onClick={handleAPIKey}
        disabled={api_key.length === 0 || test_in_progress || !api_key.match(/sk-/)}
        className="bg-sky-600 hover:bg-sky-500 border border-zinc-900 border-t-zinc-700 lex inset-y-0 right-0 font-medium rounded-lg text-sm text-zinc-100 hover:text-zinc-200 p-4 py-3 justify-start items-start text-left"
      >
        {btn_text}
        {test_in_progress ? (
          <div className="float-right w-5 h-5 flex justify-center items-center" role="status">
            <svg
              aria-hidden="true"
              className="inline w-4 h-4 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
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
          </div>
        ) : (
          <BiRightArrowAlt className="float-right w-5 h-5" />
        )}
      </button>
      <div className="bg-zinc-900 p-3 pt-2 text-xs font-light rounded border border-zinc-700">
        <strong className="font-bold">💲 OpenAI usage limit</strong>
        <br />
        If you haven't created API key before, remember to go to{" "}
        <a href="https://platform.openai.com/account/billing/limits" className="underline text-sky-500" target="blank">
          OpenAI's Billing/Usage limits
        </a>{" "}
        and set an appropriate limit. Otherwise, OpenAI won't allow your API key to work.
      </div>
      <div className="bg-zinc-900 p-3 pt-2 text-xs font-light rounded border border-zinc-700">
        <strong className="font-bold">🔒 Key security</strong>
        <br />
        Your OpenAI API key is stored in your profile. Just like everything else in your Prompt, your profile is
        end-to-end encrypted, and only you have access to it. Prompt team can't access your profile or your API key.
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-3 justify-center">
      <p className="flex text-xl font-semibold items-center justify-center">All done, welcome to Prompt!</p>
      <Lottie animationData={Success} loop={false}></Lottie>
      <button
        className="bg-sky-600 hover:bg-sky-500 border border-zinc-900 border-t-zinc-700 lex inset-y-0 right-0 font-medium rounded-lg text-sm text-zinc-100 hover:text-zinc-200 p-4 py-3 justify-start items-start text-left"
        onClick={() => {
          const last_button = document.querySelector(
            ".react-joyride__tooltip button[aria-label='Last']"
          ) as HTMLButtonElement
          last_button.click()
          setTimeout(() => {
            fieldFocus({ selector: "#input" })
          }, 200)
        }}
      >
        Let's get started! <BiRightArrowAlt className="float-right w-5 h-5" />
      </button>
    </div>
  )
}
