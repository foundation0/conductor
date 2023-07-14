import z from "zod"
import { ModuleS } from "./modules"
import { WorkspaceS } from "./workspace"
import { validateBinary } from "./binary"

export const UserS = z.object({
  _v: z.number().default(1),
  _updated: z.number().optional(),
  id: z.string().nonempty(),
  master_key: z.string(),
  master_password: z.string(),
  public_key: z.string().length(66),
  meta: z.object({
    name: z.string().optional(),
    username: z.string().nonempty(),
    email: z.string().email().optional(),
    profile_photos: z.array(z.string()).optional(),
  }),
  credentials: z
    .array(
      z.object({
        id: z.string().nonempty(),
        name: z.string(),
        public_key: z.string(),
        algorithm: z.string(),
      })
    )
    .optional(),
  modules: z.object({
    installed: z.array(ModuleS),
  }),
  workspaces: z.array(WorkspaceS),
  experiences: z
    .array(
      z.object({
        id: z.string().nonempty(),
        completed: z.boolean(),
      })
    )
    .optional(),
})

export const PublicUserS = z.object({
  id: z.string().nonempty(),
  name: z.string().nonempty(),
  username: z.string().nonempty(),
  avatar: z.string().optional(),
  last_seen: z.number().optional(),
  profile_photos: z.array(z.string()).optional(),
})

export const UsersS = z.record(PublicUserS) // key is user_key

export const BufferObjectS = z.object({
  _v: z.number().default(1),
  _updated: z.number().optional(),
  reminder: z.string().nonempty(),
  o: z.object({
    nonce: z.string().nonempty(),
    cipher: z.custom<Uint8Array>(validateBinary),
  }),
})
