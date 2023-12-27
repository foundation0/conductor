import { loader } from "@/data/loaders"
import { LocalUsersPage } from "./local_users"
import { RegisterPage } from "./register"
import { AddExistingUser } from "./existing_user"
import Common from "./common"
// import { Guest }  from "./guest"

export const UserIdR = {
  // loader,
  path: "user/:user_id",
  element: <div>User</div>,
}

export const LocalUsersR = {
  loader,
  path: "authentication",
  element: <Common>
    <LocalUsersPage />
  </Common>,
}

export const OnboardingR = {
  path: "onboarding",
  element: <Common>
    <RegisterPage />
  </Common>,
}

export const AddExistingUserR = {
  path: "login",
  element: <Common>
    <AddExistingUser />
  </Common>,
}

export const GuestUserR = {
  path: "guest",
  element: <div />,
}
