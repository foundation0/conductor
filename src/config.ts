function override(key: string) {
  if (typeof window === "object") {
    const v = window.localStorage.getItem(key)
    if (v) return v
    else return false
  } else return false
}

const config = {
  DB: {
    URI: override("DB_URI") || "https://db.promptc0.com/",
    CF: {
      get_limit: 1000,
      set_limit: 5000,
    }
  },
  features: {
    local_encryption: false // DO NOT CHANGE THIS AFTER INITIAL SETUP OR YOU WILL LOSE ALL YOUR DATA - TODO: functions to migrate data from non-encrypted to encrypted
  },
  user: {
    active_user_ttl: 1000 * 60 * 60 * 24 // 1 day
  }
}

export default config