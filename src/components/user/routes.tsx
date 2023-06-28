import { initLoaders } from "@/data/loaders"
import { LoginPage } from "./login"
import { OnboardingPage } from './onboarding'

export const UserIdR = {
  // loader,
  path: "user/:user_id",
  element: <div>User</div>,
}

export const LoginR = {
  loader: async function () {
    const { UsersState } = await initLoaders()
    const data = {
      users_state: UsersState.get(),
    }
    return data
  },
  path: "authentication",
  element: <LoginPage />,
}

export const OnboardingR = {
  path: "onboarding",
  element: <OnboardingPage />,
}