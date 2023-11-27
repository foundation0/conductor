import { useEffect } from "react"
import { useLoaderData } from "react-router-dom"
import { UserT } from "@/data/loaders/user"
import _ from "lodash"
import { AIsT } from "@/data/schemas/ai"
import useMemory from "../hooks/useMemory"
import { query } from "@/libraries/events"
import { ReceiptT } from "@/data/schemas/sessions"
import dayjs from "dayjs"

const stores = ["ai", "app"]

export default function CallHistory() {
  const { user_state } = useLoaderData() as { user_state: UserT; ai_state: AIsT }
  const mem: {
    calls: any[]
    receipts: any[]
    offset: number
    page: number
  } = useMemory({
    id: "call_history",
    state: {
      offset: 0,
      page: 1,
      calls: [],
      receipts: [],
    },
  })

  // initialization
  useEffect(() => {
    /* getAllCharges({ public_key: user_state.public_key, master_key: user_state.master_key }).then(
      (data: any[] | string) => {
        if (Array.isArray(data)) mem.calls = data
      }
    ) */
    query({
      type: "sessions.getAllReceipts",
    }).then((data: any) => {
      if (data) {
        mem.receipts = data
      }
    })
  }, [])

  return (
    
        <div className="flex flex-grow flex-1 w-full flex-col gap-3">
          {mem.receipts.length > 0 ? (
            <>
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th className="text-left">Date</th>
                    <th className="text-left">Id</th>
                    <th className="text-left">Vendor / Model</th>
                    <th className="text-right">Tokens</th>
                    <th className="text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {_(mem.receipts)
                    .orderBy("received_at", "desc")
                    .map((receipt: ReceiptT) => {
                      // const { }
                      return (
                        <tr className="text-xs" key={receipt.receipt_id}>
                          <td>
                            {receipt.received_at ? dayjs(receipt.received_at).format("DD/MM/YYYY hh:mm A") : "n/a"}
                          </td>
                          <td>{receipt.receipt_id}</td>
                          <td className="">{receipt.model.replace("_", " / ")}</td>
                          <td className="text-right">{receipt.details.input.tokens + receipt.details.output.tokens}</td>
                          <td className="text-right">${_.round(receipt.cost_usd, 7).toFixed(7)}</td>
                        </tr>
                      )
                    })
                    .slice(mem.offset, mem.offset + 10)
                    .value()}
                </tbody>
              </table>
              <div className="join">
                <button
                  className="join-item btn btn-xs"
                  disabled={mem.offset - 10 < 0}
                  onClick={() => {
                    mem.offset = mem.offset -= 10
                    mem.page -= 1
                  }}
                >
                  «
                </button>
                <button className="join-item btn btn-xs cursor-text">Page {mem.page}</button>
                <button
                  className={`join-item btn btn-xs`}
                  disabled={mem.offset + 10 > mem.receipts.length}
                  onClick={() => {
                      mem.offset += 10
                      mem.page += 1
                  }}
                >
                  »
                </button>
              </div>
            </>
          ) : (
            "No calls yet"
          )}
        </div>
  
  )
}
