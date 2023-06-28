import { UserT } from "@/data/loaders/user"

let active_user: UserT | null = null
export function getActiveUser() {
  return active_user || null
}

export function setActiveUser(user: UserT) {
  active_user = user
}
