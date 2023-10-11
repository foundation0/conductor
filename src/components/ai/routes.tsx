import { Outlet } from "react-router-dom"
import CreateAI from "./create"
import _ from "lodash"
import { loader } from "@/data/loaders"

export const EditAIR = {
  path: "edit/:edit_ai_id",
  element: <CreateAI />,
  loader
}

export const CreateAIR = {
  path: "create",
  element: <CreateAI />,
  loader
}

export const AIIdR = {
  path: ":ai_id",
  element: <div />,
}

export const AIR = {
  path: "ai",
  element: <Outlet/>,
  children: [CreateAIR, AIIdR, EditAIR],
}
