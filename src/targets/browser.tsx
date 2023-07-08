import React from "react"
import ReactDOM from "react-dom/client"
import router from "@/router"
import { RouterProvider, Navigate } from "react-router-dom"
import "flowbite"
// import "react-chat-elements/dist/main.css"
import "@szhsin/react-menu/dist/index.css"
import "@szhsin/react-menu/dist/theme-dark.css"
import "@szhsin/react-menu/dist/transitions/slide.css"
import "@/themes/index.css"
import "highlight.js/styles/github-dark.css"
import { v1AuthProvider, AuthContext, authenticateUser } from "@/components/libraries/auth"
import { Provider as BalanceProvider } from "react-wrap-balancer"
import { error } from "@/components/libraries/logging"
import { setActiveUser, getActiveUser, removeActiveUser } from "@/components/libraries/active_user"
import ToastNotification from "@/components/notifications/toast"
import UsersActions from "@/data/actions/users"

// pseudo polyfills
if (typeof window !== "undefined") {
  // @ts-ignore
  window.process = {
    env: {},
  }
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  let [user, setUser] = React.useState<any>(getActiveUser())

  React.useEffect(() => {
    if (user) {
      setActiveUser(user)
    }
  }, [])

  let signin = async (newUser: { username: string; password: string }, callback: VoidFunction) => {
    const user = await authenticateUser(newUser)
    if (!user) return error({ message: "authentication failed" })
    await setActiveUser(user)

    UsersActions.addUser({
      id: user.id as string,
      name: user.meta.username,
      username: user.meta.username,
      last_seen: new Date().getTime(),
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
