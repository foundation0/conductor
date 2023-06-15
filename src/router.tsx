import { createBrowserRouter, useNavigate } from "react-router-dom"
import { ConductorR } from "@/components/conductor/routes"
import ErrorPage from "./error"
import { useEffect } from "react"
import * as States from "@/data/loaders"

async function initStores() {
  // Initialize states
  const a = await States.AppState.get()
  await States.UserState.get()
  await States.SessionState.get()
}

function RedirectToConductor() {
  let navigate = useNavigate()

  // Use an effect to redirect as soon as the component is mounted.
  useEffect(() => {
    initStores().then(() => {
      navigate("/conductor/")
    })
  }, []) // Empty dependency array to only run once.

  // You can return null, or some sort of "Redirecting..." message
  return null
}

// Create a root route
const router = createBrowserRouter([
  {
    path: "/",
    element: <RedirectToConductor />,
    errorElement: <ErrorPage />,
  },
  ConductorR,
])

export default router
