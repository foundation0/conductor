import { UserT } from "@/data/loaders/user"
import eventEmitter, { emit } from "@/libraries/events"
import { error } from "@/libraries/logging"
import { buyCreditsWithStripe } from "@/libraries/payments"
import { useEffect } from "react"
import { useLoaderData } from "react-router-dom"
import { useEvent } from "@/components/hooks/useEvent"
import { MdClose } from "react-icons/md"

export function BuyCredits() {
  const { user_state } = useLoaderData() as { user_state: UserT }

  useEvent({
    name: "insufficient_funds",
    action: () => {
      // open modal
      if (user_state?.experiences?.find((e) => e.id === "onboarding/v1")) {
        const dialog = document.getElementById(
          "BuyCredits",
        ) as HTMLDialogElement
        dialog?.showModal()
      }
    },
  })

  async function buyCredits() {
    const { error: err } = (await buyCreditsWithStripe({
      user_id: user_state.id,
    })) as any
    if (err) {
      console.error(err)
      error({ message: "Something went wrong, we are investigating..." })
    }
  }
  return (
    <dialog id="BuyCredits" className="ModuleSetting modal w-full">
      <div className="modal-box bg-zinc-800/95 border-t border-t-zinc-600 relative">
        <div className="absolute right-3 top-3">
          <MdClose
            className="cursor-pointer h-3 w-3 text-zinc-300 transition-all hover:text-zinc-100 hover:bg-zinc-700 rounded-full"
            onClick={() => {
              const dialog = document.getElementById(
                "BuyCredits",
              ) as HTMLDialogElement
              dialog.close()
            }}
          />
        </div>
        <div className="flex w-full flex-col text-center gap-3">
          <div className="text-xl font-semibold text-center">
            Looks like you are out of credits
          </div>
          <div className="text-md font-semibold text-center">
            Purchase credits to access paid models. You are still able to use
            free models but expect slower and shorter responses.
          </div>
          <div className="text-sm text-zinc-400 mb-4 flex flex-col gap-2">
            <p>
              Conductor charges only for what you use. Credits work with any supported
              model. <u>No monthly fees or commitments.</u>
            </p>
            <div
              className="underline cursor-pointer font-semibold transition-all hover:text-zinc-100"
              onClick={() => emit({ type: "pricing_table/show" })}
            >
              View computing prices
            </div>
          </div>
          <div className="">
            <button className="btn btn-secondary border-0 text-zinc-100" onClick={buyCredits}>
              Purchase computing credits
            </button>
          </div>
          <div className="text-xs text-zinc-600">Payments by Stripe</div>
        </div>
      </div>
    </dialog>
  )
}
