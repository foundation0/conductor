import {
  getBalance,
  getBytesBalance,
  getPricing,
} from "@/components/user/wallet"
import { mAISelectorT, mBalancesT, mPricesT } from "@/data/schemas/memory"
import _ from "lodash"
import { createMemoryState } from "./memory"
import { initLoaders } from "@/data/loaders"
import { UserT } from "@/data/schemas/user"
import { getActiveUser } from "./active_user"

export async function mPrices() {
  const mem: mPricesT = createMemoryState({
    id: "prices",
    state: {
      prices: [],
    },
  })
  const pricing = await getPricing()
  if ("error" in pricing) return console.error(pricing.error)
  mem.prices = _(pricing)
    .map((vendor: any) => {
      return vendor.modules.map((module: any) => {
        return {
          id: module.id,
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

  return mem
}

export async function mBalances() {
  const user_state = getActiveUser()
  if (!user_state) return
  const mem: mBalancesT = createMemoryState({
    id: "prices",
    state: {
      credits: 0,
      bytes: 0,
      status: "active",
    },
  })
  getBalance({
    public_key: user_state.public_key,
    master_key: user_state.master_key,
  }).then((balance) => {
    if (typeof balance === "object" && "error" in balance) {
      console.error(balance)
      return
    }
    if (!_.isNumber(balance)) balance = parseFloat(balance)
    mem.credits = balance
    // if (balance <= 0) emit({ type: "insufficient_funds" })
  })
  getBytesBalance({
    public_key: user_state.public_key,
    master_key: user_state.master_key,
  }).then((balance) => {
    if (typeof balance === "object" && "error" in balance) {
      console.error(balance)
      return
    }
    if (!_.isNumber(balance)) balance = parseFloat(balance)
    mem.bytes = balance
  })
  // if ("error" in pricing) return console.error(pricing.error)

  return mem
}

export default async () => {
  await Promise.all([mPrices(), mBalances()])
}
