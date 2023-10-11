import WorkspaceSelector from "@/components/workspace/selector"
import { Outlet, useBeforeUnload, useLoaderData, useNavigate } from "react-router-dom"
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
import { ModuleT } from "@/data/schemas/modules"
import UserActions from "@/data/actions/user"
import { AIsT } from "@/data/schemas/ai"
import AIActions from "@/data/actions/ai"
import config from "@/config"
import { del as delLS, get as getLS } from "@/data/storage/localStorage"
import { ConvertGuest } from "@/components/user/convert_guest"
import { BuyCredits } from "../user/buy_credits"

export default function Conductor() {
  const { app_state, user_state, ai_state } = useLoaderData() as {
    app_state: AppStateT
    user_state: UserT
    ai_state: AIsT
  }
  const [active_sessions_elements, setActiveSessionsElements] = useState<any>([])
  const location = useLocation()
  const auth = useAuth()
  const navigate = useNavigate()

  const [guest_mode, setGuestMode] = useState<boolean>(getLS({ key: "guest-mode" }))

  const unload = useCallback(() => {
    // remove guest-mode if it exists
    if (getLS({ key: "guest-mode" })) {
      auth.signout(() => {})
      delLS({ key: "guest-mode" })
    }
    return true
  }, [])
  useBeforeUnload(unload)

  useEffect(() => {
    // upgrade user's modules
    getModules().then((module_specs) => {
      let updated_modules: ModuleT[] = _.uniqBy([...module_specs, ...user_state.modules.installed], "id")

      // in all cases, update icon and author
      updated_modules = updated_modules.map((m) => {
        m.meta.icon = module_specs.find((bm) => bm.id === m.id)?.meta.icon || m.meta.icon
        m.meta.author = module_specs.find((bm) => bm.id === m.id)?.meta.author || m.meta.author
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

      // upgrade all workspace default llms to use ule
      const upgraded_workspaces = user_state.workspaces.map((w) => {
        w.defaults.llm_module = { id: config.defaults.llm_module.id, variant: config.defaults.llm_module.variant_id }
        return w
      })
      UserActions.updateUser({ modules: { installed: updated_modules }, ais, workspaces: upgraded_workspaces })

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
    if (auth?.user && !user_state?.experiences?.find((e) => e.id === "onboarding/v1")) {
      // get the first workspace and its first session
      const workspace = user_state.workspaces[0]
      const group = workspace?.groups[0]
      const folder = group?.folders[0]
      const session = _.get(folder, "sessions[0]")
      if (workspace && session) {
        navigate(`/c/${workspace.id}/${session.id}`)
      }
    }
  }, [location.pathname === "/c/"])

  useEffect(() => {
    setActiveSessionsElements(
      _.keys(app_state.active_sessions).map((key) => {
        const sess = app_state.active_sessions[key]
        const workspace = _.find(user_state.workspaces, { id: sess.workspace_id })
        const group = workspace?.groups?.find((g) => g.id === sess.group_id)
        const folder = group?.folders?.find((f) => f.id === sess.folder_id)
        const session = folder?.sessions?.find((s) => s.id === sess.session_id) ?? null
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
      })
    )
  }, [JSON.stringify([app_state.active_sessions])])

  return (
    <div className={`flex flex-col flex-1 m-0 p-0 dark h-full h-[100dvh] bg-[#111]/60 mt-0.5`}>
      {guest_mode && (
        <div className="h-6 w-full flex justify-center items-center text-[11px] font-semibold text-zinc-300">
          <div className="text-yellow-500">You are using guest mode, no history is saved</div>
          <div className="ml-2 text-zinc-500"> ➜ </div>
          <div
            className="underline hover:no-underline ml-2 cursor-pointer"
            onClick={() => {
              ;(window as any)["ConvertGuest"].showModal()
            }}
          >
            Convert to a free Conductor account and unlock history.
          </div>
        </div>
      )}
      <main id="Conductor" className={`flex flex-row flex-1 m-0 p-0 h-[100dvh] dark bg-[#111]/60 mt-0.5`}>
        <WorkspaceSelector />
        <div id="WorkspaceView" className="flex flex-1 m-0.5 overflow-y-auto">
          {location.pathname !== "/c/" ? (
            <Outlet />
          ) : (
            <div className="flex justify-center items-center w-full">
              <div>
                <div className="flex justify-center items-center w-full">
                  <img src={PromptIcon} className="w-48 h-48 opacity-10" />
                </div>
                {user_state?.experiences?.find((e) => e.id === "onboarding/v1") && (
                  <>
                    <div className="text-center text-2xl font-semibold text-zinc-200">Welcome to Conductor</div>
                    <div className="mt-6 text-center text-md font-semibold text-zinc-400 mb-2">
                      Continue where you left off
                    </div>
                    <div className="flex flex-col gap-2">{active_sessions_elements}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <ConvertGuest />
        <BuyCredits />
      </main>
    </div>
  )
}
