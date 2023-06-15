import React from "react"
import ReactDOM from "react-dom/client"
import router from "@/router"
import { RouterProvider } from "react-router-dom"
import "flowbite"
import "react-chat-elements/dist/main.css"
import "@szhsin/react-menu/dist/index.css"
import "@szhsin/react-menu/dist/theme-dark.css"
import "@szhsin/react-menu/dist/transitions/slide.css"
import "@/themes/index.css"
import "highlight.js/styles/github-dark.css"
import * as States from "@/data/loaders"

await States.AppState.get()
await States.UserState.get()
await States.SessionState.get()

// pseudo polyfills
if (typeof window !== "undefined") {
  // @ts-ignore
  window.process = {
    env: {},
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
