import { UserT } from "@/data/loaders/user"
import config from "@/config"
import { Navigate } from "react-router-dom"

let active_user_ttl: any = null

export function getActiveUser(): UserT | null {
  const au = localStorage.getItem("active_user")
  if (!au) return null
  const active_user = JSON.parse(au)
  if (checkActiveUserTTL(active_user)) return active_user?.user
  return null
}

function checkActiveUserTTL(au: any) {
  // if last used is older than ttl, delete active_user and return null
  if (au && new Date().getTime() - au.last_used > config.user.active_user_ttl) {
    localStorage.removeItem("active_user")
    window.location.href = "/authentication"
    return null
  } else {
    return true
  }
}

export async function setActiveUser(user: UserT) {
  localStorage.setItem("active_user", JSON.stringify({
    last_used: new Date().getTime(),
    user,
  }))
  clearInterval(active_user_ttl)
  setInterval(() => {
    const au = getActiveUser()
    if(!au) clearInterval(active_user_ttl)
  }, 15000) // check every 15 seconds
}

export function removeActiveUser() {
  localStorage.removeItem("active_user")
  clearInterval(active_user_ttl)
}