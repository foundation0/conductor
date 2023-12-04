import { Outlet } from "react-router-dom"
import { initLoaders, loader } from "@/data/loaders"
import Modules from "@/components/modules"

export const ModulesIndexR = {
  path: "fff",
  element: <p>asdf</p>,
  loader,
}

export const ModulesR = {
  path: "modules",
  element: <Outlet />,
  loader,
  children: [{ index: true, element: <Modules />, loader }],
}
