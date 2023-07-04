import { loader } from "@/data/loaders"
import { LocalUsersPage } from "./local_users"
import { RegisterPage } from "./register"
import { AddExistingUser } from "./existing_user"

export const UserIdR = {
  // loader,
  path: "user/:user_id",
  element: <div>User</div>,
}

export const LocalUsersR = {
  loader,
  path: "authentication",
  element: <LocalUsersPage />,
}

export const OnboardingR = {
  path: "onboarding",
  element: <RegisterPage />,
}

export const AddExistingUserR = {
  path: "login",
  element: <AddExistingUser />,
}
