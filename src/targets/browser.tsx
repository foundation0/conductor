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
import { v1AuthProvider, AuthContext, authenticateUser } from "@/components/libraries/auth"
import { Provider as BalanceProvider } from "react-wrap-balancer"
import { initLoaders } from "@/data/loaders"
import { error } from "@/components/libraries/logging"
import { setActiveUser } from "@/components/libraries/active_user"
import ToastNotification from "@/components/notifications/toast"

await initLoaders()

// pseudo polyfills
if (typeof window !== "undefined") {
  // @ts-ignore
  window.process = {
    env: {},
  }
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  let [user, setUser] = React.useState<any>(null)

  let signin = async (newUser: { username: string; password: string }, callback: VoidFunction) => {
    const user = await authenticateUser(newUser)
    if (!user) return error({ message: "authentication failed" })
    setActiveUser(user)
    return v1AuthProvider.signin(() => {
      setUser(user)
      callback()
    })
  }

  let signout = (callback: VoidFunction) => {
    return v1AuthProvider.signout(() => {
      setUser(null)
      callback()
    })
  }

  let value = { user, signin, signout }

  // @ts-ignore
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function App() {
  return (
    <React.StrictMode>
      <AuthProvider>
        <BalanceProvider>
          <RouterProvider router={router} />
        </BalanceProvider>
      </AuthProvider>
      <ToastNotification />
    </React.StrictMode>
  )
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement)
root.render(<App />)
