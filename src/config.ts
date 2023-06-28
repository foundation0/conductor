function override(key: string) {
  if (typeof window === "object") {
    const v = window.localStorage.getItem(key)
    if (v) return v
    else return false
  } else return false
}

export default {
  DB: {
    URI: override("DB_URI") || "https://db.promptc0.com/",
  },
}
