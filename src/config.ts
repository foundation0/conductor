function override(key: string) {
  if (typeof window === "object") {
    const v = window.localStorage.getItem(key)
    if (v) {
      console.log(`Overriding ${key} with ${v}`)
      return v
    } else return false
  } else return false
}
const config = {
  defaults: {
    llm_module: {
      id: "ule",
      variant_id: "mistralai_mixtral-8x7b-instruct-v0.1-free",
      timeout: 180000,
    },
    user: {
      privacy: {
        connectivity: {
          public: true,
          firewall: [],
        },
        data: {
          encryption: "XSalsa20Poly1305",
          private: true,
        },
      },
      data: {
        vectorization: false,
        cloud_storage: {
          active: false,
          provider: "0x000",
          session_backup: false,
          data_backup: {
            active: false,
            excluded: [],
          },
        },
      },
    },
  },
  DB: {
    URI:
      import.meta.env.PROD ?
        "https://db.services.foundation0.net/"
      : override("DB_URI") || "http://localhost:6002/",
    CF: {
      sync_interval: 1000 * 60,
      get_limit: 1000,
      set_limit: 60000,
    },
  },
  services: {
    ule_URI:
      import.meta.env.PROD ?
        "wss://ule.services.foundation0.net"
      : override("ULE_URI") || "ws://localhost:7001",
    wallet_URI:
      import.meta.env.PROD ?
        "https://billing.services.foundation0.net"
      : override("WALLET_URI") || "http://localhost:6001",
  },
  features: {
    local_encryption: false, // DO NOT CHANGE THIS AFTER INITIAL SETUP OR YOU WILL LOSE ALL YOUR DATA - TODO: functions to migrate data from non-encrypted to encrypted
  },
  user: {
    active_user_ttl: 1000 * 60 * 60 * 24, // 1 day
  },
}

export default config
