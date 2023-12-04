function override(key: string) {
  if (typeof window === "object") {
    const v = window.localStorage.getItem(key)
    if (v) return v
    else return false
  } else return false
}
const config = {
  defaults: {
    llm_module: {
      id: "ule",
      variant_id: "openai_gpt-3.5-turbo",
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
    URI: override("DB_URI") || import.meta.env.PROD ? "https://db.promptc0.com/" : "http://localhost:6002/",
    CF: {
      sync_interval: 1000 * 60,
      get_limit: 1000,
      set_limit: 60000,
    },
  },
  services: {
    ule_URI: override("ULE_URI") || import.meta.env.PROD ? "wss://ule.services.foundation0.net" : "ws://localhost:7001",
    wallet_URI:
      override("WALLET_URI") || import.meta.env.PROD ? "https://wallet.promptc0.com" : "http://localhost:6001",
  },
  features: {
    local_encryption: false, // DO NOT CHANGE THIS AFTER INITIAL SETUP OR YOU WILL LOSE ALL YOUR DATA - TODO: functions to migrate data from non-encrypted to encrypted
  },
  user: {
    active_user_ttl: 1000 * 60 * 60 * 24, // 1 day
  },
}

export default config
