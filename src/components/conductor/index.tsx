import WorkspaceSelector from "@/components/workspace/selector"
import {
  Outlet,
  useBeforeUnload,
  useNavigate,
  useParams,
} from "react-router-dom"
import PromptIcon from "@/assets/prompt.svg"
import { useLocation } from "react-router-dom"
import _ from "lodash"
import { AppStateT } from "@/data/loaders/app"
import { UserT } from "@/data/loaders/user"
import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { RiHashtag } from "react-icons/ri"
import { useAuth } from "@/components/hooks/useAuth"
import { setActiveUser } from "@/libraries/active_user"
import { getModules } from "@/modules"
import UserActions from "@/data/actions/user"
import { AIsT } from "@/data/schemas/ai"
import AIActions from "@/data/actions/ai"
import config from "@/config"
import { del as delLS, get as getLS } from "@/data/storage/localStorage"
import { BuyCredits } from "@/components/modals/buy_credits"
import useMemory from "@/components/hooks/useMemory"
import { mAppT, mBalancesT } from "@/data/schemas/memory"
import { error } from "@/libraries/logging"
import {
  getBalance,
  getBytesBalance,
  getWalletStatus,
} from "@/components/user/wallet"
import { emit } from "@/libraries/events"
import { PricingTable } from "../modals/pricing_table"
import { AddData } from "../modals/add_data"
import { createMemoryState } from "@/libraries/memory"

export default function Conductor() {
  const app_state = useMemory<AppStateT>({ id: "appstate" })
  const user_state = useMemory<UserT>({ id: "user" })
  const ai_state = useMemory<AIsT>({ id: "ais" })

  const [active_sessions_elements, setActiveSessionsElements] = useState<any>(
    [],
  )
  const location = useLocation()
  const auth = useAuth()
  const navigate = useNavigate()

  const mem_balances = useMemory<mBalancesT>({
    id: "balances",
  })
  if (!mem_balances) return null

  // Fetch balances
  useEffect(() => {
    getBalance({
      public_key: user_state.public_key,
      master_key: user_state.master_key,
    }).then((balance) => {
      if (typeof balance === "object" && "error" in balance) {
        console.error(balance)
        return
      }
      if (!_.isNumber(balance)) balance = parseFloat(balance)
      mem_balances.credits = balance
      if (balance <= 0) emit({ type: "insufficient_funds" })
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
      mem_balances.bytes = balance
    })
    getWalletStatus({
      public_key: user_state.public_key,
      master_key: user_state.master_key,
    }).then((wallet_status) => {
      if (typeof wallet_status === "object" && "error" in wallet_status) {
        console.error(wallet_status)
        return
      }

      mem_balances.status = wallet_status as "active" | "inactive" | "suspended"
    })
  }, [])

  useEffect(() => {
    // upgrade user's modules
    getModules().then((module_specs) => {
      // let updated_modules: ModuleT[] = _.merge((module_specs || []), user_state.modules?.installed || [])

      // in all cases, update icon and author
      module_specs = module_specs.map((m) => {
        m.meta.icon =
          module_specs.find((bm) => bm.id === m.id)?.meta.icon || m.meta.icon
        m.meta.author =
          module_specs.find((bm) => bm.id === m.id)?.meta.author ||
          m.meta.author
        // mark openai is inactive
        if (m.id === "openai") {
          m.active = false
        }
        return m
      })
      // if user has no c1 installed, install it
      let ais = [...(user_state.ais || [])]
      if (!ais?.find((ai) => ai.id === "c1")) {
        ais.push({ id: "c1", status: "active" })
      }

      UserActions.updateUser({ modules: { installed: module_specs }, ais })

      // upgrade all AIs' default_llm_module using openai module to use ULE
      ai_state.forEach((ai) => {
        if (ai?.default_llm_module?.id === "openai") {
          ai.default_llm_module = { _v: 1, ...config.defaults.llm_module }
          AIActions.update({ ai })
        }
        return ai
      })
    })
  }, [])

  useEffect(() => {
    if (auth?.user) {
      setActiveUser(auth?.user)
    }
  }, [location.pathname])

  useEffect(() => {
    if (
      auth?.user
      // &&
      // !user_state?.experiences?.find((e) => e.id === "onboarding/v1")
    ) {
      if(location.pathname === "/c/") {
        // get the first workspace and its first session
        const workspace = user_state.workspaces[0]
        const group = workspace?.groups[0]
        const folder = group?.folders[0]
        const session = _.get(folder, "sessions[0]")
        if (workspace && session) {
          navigate(`/c/${workspace.id}/${session.id}`)
        }
      }
    }
  }, [location.pathname === "/c/"])

  useEffect(() => {
    setActiveSessionsElements(
      _.keys(app_state.active_sessions).map((key) => {
        const sess = app_state.active_sessions[key]
        const workspace = _.find(user_state.workspaces, {
          id: sess.workspace_id,
        })
        const group = workspace?.groups?.find((g) => g.id === sess.group_id)
        const folder = group?.folders?.find((f) => f.id === sess.folder_id)
        const session =
          folder?.sessions?.find((s) => s.id === sess.session_id) ?? null
        if (!session) return null
        return (
          <Link key={sess.session_id} to={`/c/${workspace?.id}/${session?.id}`}>
            <div className="flex flex-row gap-2 border-t border-t-zinc-700 py-2 pl-2 pr-4 text-sm rounded-lg border-zinc-800 bg-zinc-800 hover:bg-zinc-800/70 text-zinc-300">
              <div className="flex flex-shrink">
                <img src={workspace?.icon} className="w-10 h-10" />
              </div>
              <div className="flex flex-1 items-center text-sm">
                <RiHashtag className={`w-3.5 h-3.5`} />
                <div className="pb-0.5 font-semibold">{session?.name}</div>
              </div>
            </div>
          </Link>
        )
      }),
    )
  }, [JSON.stringify([app_state.active_sessions])])

  return (
    <div
      className={`flex flex-col flex-1 m-0 p-0 dark h-full h-[100dvh] bg-[#111]/60`}
    >
      <main
        id="Conductor"
        className={`flex flex-row flex-1 m-0 p-0 h-full h-[100dvh] dark bg-[#111]/60`}
      >
        <WorkspaceSelector />
        <div id="WorkspaceView" className="flex flex-1 m-0.5 overflow-hidden">
          {location.pathname !== "/c/" ?
            <Outlet />
          : <div className="flex justify-center items-center w-full">
              <div>
                <div className="flex justify-center items-center w-full">
                  <img src={PromptIcon} className="w-48 h-48 opacity-10" />
                </div>
                {user_state?.experiences?.find(
                  (e) => e.id === "onboarding/v1",
                ) && (
                  <>
                    <div className="text-center text-2xl font-semibold text-zinc-200">
                      Welcome to Conductor
                    </div>
                    <div className="mt-6 text-center text-md font-semibold text-zinc-400 mb-2">
                      Continue where you left off
                    </div>
                    <div className="flex flex-col gap-2">
                      {active_sessions_elements}
                    </div>
                  </>
                )}
              </div>
            </div>
          }
        </div>
        {/* <ConvertGuest /> */}
        <div className="modals">
          <BuyCredits />
          <PricingTable />
          <AddData />
        </div>
      </main>
    </div>
  )
}
