import z from "zod"
import { ModuleS } from "./modules"
import { WorkspaceS } from "./workspace"

export const UserS = z.object({
  _v: z.number().default(1),
  id: z.string().nonempty(),
  public_key: z.string().length(66),
  meta: z.object({
    name: z.string().nonempty(),
    email: z.string().email().optional(),
    avatar: z.string().optional(),
  }),
  modules: z.object({
    installed: z.array(ModuleS),
  }),
  workspaces: z.array(WorkspaceS),
})
