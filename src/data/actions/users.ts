import { UsersS, PublicUserS } from "@/data/schemas/user"
import { initLoaders } from "@/data/loaders"
import { z } from "zod"
import { pack } from "msgpackr"

const API = {
  async getUsers(): Promise<z.infer<typeof UsersS>> {
    const { UsersState } = await initLoaders()
    return UsersState.get()
  },
  async addUser(user: z.infer<typeof PublicUserS>) {
    const { UsersState } = await initLoaders()
    const users = await API.getUsers()
    UsersState.set({ ...users, [user.id]: user })
  }
}

export default API