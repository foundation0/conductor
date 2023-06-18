import WorkspaceSelector from "@/components/workspace/selector"
import { Outlet, useLoaderData } from "react-router-dom"
import PromptIcon from "@/assets/prompt.svg"
import { useLocation } from "react-router-dom"
import ToastNotification from "../notifications/toast"
import { AppStateT } from "@/data/loaders/app"
import { useEffect, useState } from "react"
import _ from "lodash"

export default function Conductor() {
  const location = useLocation()

  return (
    <main className={`flex flex-row flex-1 m-0 p-0 dark h-full`}>
      <div id="WorkspaceSelector" className="flex flex-shrink bg-zinc-900">
        <WorkspaceSelector />
      </div>
      <div id="WorkspaceView" className="flex flex-1">
        {location.pathname !== '/conductor/' ? (
          <Outlet />
        ) : (
          <div className="flex justify-center items-center w-full">
            <div>
              {" "}
              <img src={PromptIcon} className="w-12 h-12 text-zinc-500 opacity-50" />
            </div>
          </div>
        )}
      </div>
      <ToastNotification />
    </main>
  )
}
