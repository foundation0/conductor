import { UsersS, PublicUserS } from "@/data/schemas/user"
import { initLoaders } from "@/data/loaders"
import { z } from "zod"
import { listen } from "@/libraries/events"

const API: { [key: string]: Function } = {
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
    if(user.name.match(/guest-/)) return null
    const users = await API.getUsers()
    await UsersState.set({ ...users, [user.id]: user })
  },
  async updateUser(user: z.infer<typeof PublicUserS>) {
    API.addUser(user)
  },
  async removeUser({ id }: { id: string }) {
    const { UsersState } = await initLoaders()
    const users = await API.getUsers()
    delete users[id]
    UsersState.set(users)
  },
}

listen({
  type: "users.*",
  action: async (data: any, e: any) => {
    const { callback } = data
    const method: string = e?.event?.replace("users.", "")
    if (method in API) {
      const response = await API[method](data)
      callback(response)
    } else {
      callback({ error: "method not found", data: { ...data, e } })
    }
  },
})

export default API
