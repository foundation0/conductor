import { useEvent } from "@/components/hooks/useEvent"
import useMemory from "@/components/hooks/useMemory"
import config from "@/config"
import { useEffect } from "react"
import { getPricing } from "../user/wallet"
import { getActiveUser } from "@/libraries/active_user"
import { Match, Switch } from "react-solid-flow"
import _ from "lodash"
import { MdClose } from "react-icons/md"

export function PricingTable() {
  const mem: { prices: any[] } = useMemory({
    id: "pricing_table",
    state: {
      prices: [],
    },
  })

  useEvent({
    name: "pricing_table/show",
    action: () => {
      // open modal
      const dialog = document.getElementById("PricingTable") as HTMLDialogElement
      dialog.showModal()
    },
  })

  useEffect(() => {
    getPricing().then((pricing: any) => {
      if (pricing.error) return console.error(pricing.error)
      mem.prices = _(pricing)
        .map((vendor: any) => {
          return vendor.modules.map((module: any) => {
            return {
              type: module.type,
              vendor: vendor.meta.name,
              module: module.name,
              input_price: (parseFloat(module.cost_input) / 1000).toFixed(8),
              output_price: (parseFloat(module.cost_output) / 1000).toFixed(8),
            }
          })
        })
        .flatten()
        .orderBy("module")
        .orderBy("vendor")
        .value()
    })
  }, [])

  return (
    <dialog id="PricingTable" className="ModuleSetting modal w-full w-max-4xl h-max-[80dvh]">
      <div className="modal-box bg-zinc-800/95 border-t border-t-zinc-600 relative">
        <div className="absolute right-3 top-3">
          <MdClose
            className="cursor-pointer h-3 w-3 text-zinc-300 transition-all hover:text-zinc-100 hover:bg-zinc-700 rounded-full"
            onClick={() => {
              const dialog = document.getElementById("PricingTable") as HTMLDialogElement
              dialog.close()
            }}
          />
        </div>
        <div className="flex w-full flex-col text-center gap-3">
          <div className="text-xl font-semibold text-center">Computing prices</div>
          <table className="table table-xs">
            <thead>
              <tr>
                <th>Type</th>
                <th>Vendor</th>
                <th>Module</th>
                <th>Price per 1M units (in/out)</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {mem?.prices?.map((price) => {
                return (
                  <tr key={`${price.vendor}/${price.module}`}>
                    <td>
                      <Switch>
                        <Match when={price.type === "language"}>LLM</Match>
                        <Match when={price.type === "code"}>Code</Match>
                      </Switch>
                    </td>
                    <td>{price.vendor}</td>
                    <td>{price.module}</td>
                    <td>
                      {price.input_price} / {price.output_price}
                    </td>
                    <td>
                      <Switch>
                        <Match when={price.type === "language" || price.type === "code"}>token</Match>
                      </Switch>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </dialog>
  )
}
