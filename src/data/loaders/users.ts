import { store } from "@/data/storage/IDB"
import { UsersS } from "@/data/schemas/user"
import * as z from "zod"

export type UsersT = z.infer<typeof UsersS>
export const state = async () => await store<UsersT>({
  name: "users",
  username: "::public::",
  enc_key: "::public::",
  initial: async (): Promise<UsersT> => {
    return {}
  },
  ztype: UsersS,
})
