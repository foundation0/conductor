import { createBrowserRouter, useNavigate } from "react-router-dom"
import { ConductorR } from "@/components/conductor/routes"
import ErrorPage from "./error"
import { LoginR, OnboardingR } from "./components/user/routes"

function RedirectToConductor() {
  let navigate = useNavigate()

  navigate("/conductor/")

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
  LoginR,
  OnboardingR,
])

export default router
