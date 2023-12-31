import { useEvent } from "@/components/hooks/useEvent"
import useMemory from "@/components/hooks/useMemory"
import { Match, Switch } from "react-solid-flow"
import _ from "lodash"
import { MdClose } from "react-icons/md"
import { mPricesT } from "@/data/schemas/memory"

export function PricingTable() {
  const mem = useMemory<mPricesT>({ id: "prices" })

  useEvent({
    name: "pricing_table/show",
    action: () => {
      // open modal
      const dialog = document.getElementById("PricingTable") as HTMLDialogElement
      dialog?.showModal()
    },
  })

  return (
    <dialog id="PricingTable" className="ModuleSetting modal w-full  h-max-[80dvh] ">
      <div className="modal-box bg-zinc-800/95 border-t border-t-zinc-600 relative max-w-[800px]">
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
                <th className="text-end">$ price per unit (in/out)</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {mem?.prices?.map((price) => {
                return (
                  <tr key={`${price.vendor}/${price.module}`}>
                    <td>
                      <Switch>
                        <Match when={price.type === "language"}>Language</Match>
                        <Match when={price.type === "code"}>Code</Match>
                      </Switch>
                    </td>
                    <td>{price.vendor}</td>
                    <td>{price.module}</td>
                    <td className="text-end">
                      {price.input_price} / {price.output_price}
                    </td>
                    <td className="flex flex-shrink">
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
