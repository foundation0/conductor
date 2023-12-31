import React from "react"
import ReactDOM from "react-dom/client"
import router from "@/router"
import { RouterProvider, Navigate } from "react-router-dom"
import "flowbite"
import "@szhsin/react-menu/dist/index.css"
import "@szhsin/react-menu/dist/theme-dark.css"
import "@szhsin/react-menu/dist/transitions/slide.css"
import "@/themes/index.css"
import "highlight.js/styles/github-dark.css"
import "@fontsource/hanken-grotesk/200.css"
import "@fontsource/hanken-grotesk/400.css"
import "@fontsource/hanken-grotesk/600.css"
import "@fontsource/hanken-grotesk/800.css"
import { v1AuthProvider, AuthContext, authenticateUser } from "@/libraries/auth"
import { Provider as BalanceProvider } from "react-wrap-balancer"
import { error } from "@/libraries/logging"
import { setActiveUser, getActiveUser, removeActiveUser } from "@/libraries/active_user"
import ToastNotification from "@/components/notifications/toast"
import UsersActions from "@/data/actions/users"
import { ph } from "@/libraries/logging"
import stateMem from "@/libraries/state_memory"

// pseudo polyfills
if (typeof window !== "undefined") {
  // @ts-ignore
  window.process = {
    env: {},
  }
  window.global = window;
}

// INITIALIZE COMMON STATES
await stateMem()

function AuthProvider({ children }: { children: React.ReactNode }) {
  let [user, setUser] = React.useState<any>(getActiveUser())
  

  React.useEffect(() => {
    if (user) {
      setActiveUser(user)
    }
    ph()
  }, [])

  let signin = async (newUser: { username: string; password: string, user?: any, buffer?: any }, callback: VoidFunction) => {
    const user = await authenticateUser(newUser)
    if (!user) return error({ message: "authentication failed" })
    await setActiveUser(user)

    UsersActions.addUser({
      id: user.id as string,
      name: user.meta.name || user.meta.username,
      username: user.meta.username,
      last_seen: new Date().getTime(),
      profile_photos: user.meta.profile_photos || [],
    })

    return v1AuthProvider.signin(() => {
      setUser(user)
      callback()
    })
  }

  let signout = (callback: VoidFunction) => {
    return v1AuthProvider.signout(() => {
      setUser(null)
      removeActiveUser()
      ph()?.reset()
      window.location.href = "/authentication"
      // callback()
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
