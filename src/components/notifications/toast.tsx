import { useState, useEffect } from "react"
import * as Toast from "@radix-ui/react-toast"
import eventEmitter from "@/libraries/events"
import _ from "lodash"

const ToastNotification = () => {
  const [openn, setOpen] = useState(false)
  const [msg, setMsg] = useState<{ type: string; title?: string; message?: string } | null>(null)

  useEffect(() => {
    const handleErrorEvent = async (error: any) => {
      setMsg({ type: error.type, title: "Error", message: error.message })
      setOpen(true)
    }

    eventEmitter.on("new_error", handleErrorEvent)

    return () => {
      eventEmitter.off("new_error", handleErrorEvent)
    }
  }, [])

  if (!msg) {
    return null
  }

  return (
    <Toast.Provider swipeDirection="right">
      <Toast.Root
        className={`${
          msg.type === "error" ? "bg-red-900" : "bg-zinc-900"
        } border border-zinc-800 rounded-md shadow-black p-[15px] grid [grid-template-areas:_'title_action'_'description_action'] grid-cols-[auto_max-content] gap-x-[15px] items-center data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=end]:animate-swipeOut`}
        open={openn}
        onOpenChange={setOpen}
      >
        <Toast.Title className="[grid-area:_title] mb-[5px] font-medium text-slate12 text-[15px]">
          {msg.title}
        </Toast.Title>
        <Toast.Description className="text-sm">{msg.message}</Toast.Description>
        <Toast.Action className="[grid-area:_action]" asChild altText="d">
          <button
            className="inline-flex items-center justify-center rounded font-medium text-xs px-[10px] leading-[25px] h-[25px] border-zinc-700"
            onClick={() => {
              setMsg(null)
              setOpen(false)
            }}
          >
            ok
          </button>
        </Toast.Action>
      </Toast.Root>
      <Toast.Viewport className="[--viewport-padding:_25px] fixed bottom-0 right-0 flex flex-col p-[var(--viewport-padding)] gap-[10px] w-[390px] max-w-[100vw] m-0 list-none z-[2147483647] outline-none" />
    </Toast.Provider>
  )
}

export default ToastNotification
