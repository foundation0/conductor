export type mAppT = { workspace_id: string; session_id: string }
export type mBalancesT = { 
  credits: number
  bytes: number
  status: "active" | "inactive" | "suspended" | "no_wallet"
 }