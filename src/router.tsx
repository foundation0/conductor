import { createBrowserRouter, useNavigate } from "react-router-dom"
import { ConductorR } from "@/components/conductor/routes"
import ErrorPage from "./error"
import { AddExistingUserR, LocalUsersR, OnboardingR } from "./components/user/routes"
import { useEffect } from "react"

function RedirectToConductor() {
  let navigate = useNavigate()

  useEffect(() => {
    navigate("/conductor/")
  }, [])
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
  LocalUsersR,
  OnboardingR,
  AddExistingUserR
])

export default router
