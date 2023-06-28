import { UsersS, PublicUserS } from "@/data/schemas/user"
import { initLoaders } from "@/data/loaders"
import { z } from "zod"
import { pack } from "msgpackr"

const API = {
  async getUsers(): Promise<z.infer<typeof UsersS>> {
    const { UsersState } = await initLoaders()
    return UsersState.get()
  },
  async getUser({ id }: { id: string }): Promise<z.infer<typeof PublicUserS>> {
    const { UsersState } = await initLoaders()
    return UsersState.get()[id]
  },
  async addUser(user: z.infer<typeof PublicUserS>) {
    const { UsersState } = await initLoaders()
    const users = await API.getUsers()
    UsersState.set({ ...users, [user.id]: user })
  },
  async updateUser(user: z.infer<typeof PublicUserS>) {
    API.addUser(user)
  },
  async removeUser({ id }: { id: string }) {
    const { UsersState } = await initLoaders()
    const users = await API.getUsers()
    delete users[id]
    UsersState.set(users)
  }
}

export default API