import { useEvent } from "@/components/hooks/useEvent"
import useMemory from "@/components/hooks/useMemory"
import { OpenSessionT } from "@/data/schemas/app"
import { mChatSessionT } from "@/data/schemas/memory"
import { emit, query } from "@/libraries/events"
import { getMemoryState } from "@/libraries/memory"
import { useEffect, useState } from "react"
import { PiChatCircleDotsBold } from "react-icons/pi"
import { RxPlus } from "react-icons/rx"
import { useNavigate, useParams } from "react-router-dom"

let mem_session

export function Tab({
  session_id,
  workspace_id,
  label,
}: {
  session_id: string
  workspace_id: string
  label: string
}) {
  const url_session_id = useParams().session_id
  const navigate = useNavigate()

  // hackity hack to fix race condition with session state memory
  // const [mem_session, setMemSession] = useState<mChatSessionT | null>(null)
  const [generation_in_progress, setGenerationInProgress] = useState(false)

  // useEvent({
  //   name: "session/generation/in_progress",
  //   target: session_id,
  //   action: ({ value }: { value: boolean }) => {
  //     setGenerationInProgress(value)
  //   },
  // })

  // const mem_session = useMemory<mChatSessionT>({
  //   id: `session-${session_id}`,
  //   fail_on_create: true,
  // }) || { generation: { in_progress: false } } 

  return (
    <div
      className={`flex flex-row min-w-[50px] max-w-[200px] flex-nowrap flex-shrink border-transparent border-0 tab m-0 px-3 h-full text-xs font-semibold justify-start items-center tooltip tooltip-bottom transition-colors ph-no-capture ${
        url_session_id === session_id ?
          "tab-active bg-zinc-900/50 text-zinc-200"
        : " bg-zinc-800 hover:bg-zinc-900/50 text-zinc-600 hover:text-zinc-300"
      }`}
      // style={{ width: `${relative_width || 100}px` }}
      // key={session_id}
      onClick={() => {
        emit({ type: "sessions/change", data: { session_id } })
        navigate(`/c/${workspace_id}/${session_id}`)
      }}
      data-tip={label}
    >
      <div className="flex flex-shrink-0">
        {generation_in_progress ?
          <div
            className="float-right w-3.5 h-3.5 flex justify-center items-center mr-0.5"
            role="status"
          >
            <svg
              aria-hidden="true"
              className="inline w-2.5 h-2.5 text-zinc-500 animate-spin fill-[#eee]"
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
        : <PiChatCircleDotsBold className={`w-3.5 h-3.5 pr-1 `} />}
      </div>
      <div className="truncate" data-original-text={label}>
        {label}
      </div>
      <div className="flex flex-1 justify-end">
        <div
          className="flex ml-3 text-sm rotate-45 hover:bg-zinc-700 hover:text-zinc-100 rounded-full h-fit transition-all"
          onClick={async (e) => {
            e.preventDefault()
            if (!session_id) return
            const new_tab: OpenSessionT = await query({
              type: "app.removeOpenSession",
              data: { session_id },
            })
            // const new_tab = await AppStateActions.removeOpenSession({
            //   session_id: session_id,
            // })

            if (session_id === url_session_id)
              navigate(`/c/${workspace_id}/${new_tab?.session_id}`)
            else {
              navigate(`/c/${workspace_id}/${session_id}`)
            }
          }}
        >
          <RxPlus />
        </div>
      </div>
    </div>
  )
}
