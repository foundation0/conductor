import { UserT } from "@/data/loaders/user"
import eventEmitter from "@/libraries/events"
import { error } from "@/libraries/logging"
import { buyCreditsWithStripe } from "@/libraries/payments"
import { useEffect } from "react"
import { useLoaderData } from "react-router-dom"

export function BuyCredits() {
  const { user_state } = useLoaderData() as { user_state: UserT }

  useEffect(() => {
    eventEmitter.on("ule:402", () => {
      ;(window as any)["BuyCredits"].showModal()
    })
  }, [])

  async function buyCredits() {
    const { error: err } = (await buyCreditsWithStripe({ user_id: user_state.id })) as any
    if (err) {
      console.error(err)
      error({ message: "Something went wrong, we are investigating..." })
    }
  }
  return (
    <dialog id="BuyCredits" className="ModuleSetting modal w-full max-w-2xl">
      <div className="modal-box bg-zinc-800/95 border-t border-t-zinc-600">
        <div className="flex w-full flex-col text-center gap-3">
          <div className="text-xl font-semibold text-center">Oh no, you've run out of credits!</div>
          <div className="text-sm text-zinc-400 mb-4">
            No worries, you can get more credits right here, starting from $1.
          </div>
          <div className="">
            <button className="p-btn-primary" onClick={buyCredits}>Buy more credits</button>
          </div>
          <div className="text-xs text-zinc-600">Payments by Stripe</div>
        </div>
      </div>
    </dialog>
  )
}
