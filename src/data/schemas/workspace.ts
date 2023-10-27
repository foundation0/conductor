import { z } from "zod"
import { nanoid } from "nanoid"
import { getId } from "@/security/common"
import config from "@/config"
import { DataTypesTextS, DataTypesBinaryT, DataTypesBinaryS } from "./data_types"

export const MembersS = z.object({
  _v: z.number().default(1),
  read: z.array(z.string()),
  write: z.array(z.string()).optional(),
})

export const DataRefS = z.object({
  id: z.string(),
  name: z.string(),
  filename: z.string().optional(),
  mime: z.union([DataTypesTextS, DataTypesBinaryS]),
})
export type DataRefT = z.infer<typeof DataRefS>

export const SessionS = z.object({
  _v: z.number().default(1),
  id: z.string().catch(() => getId()),
  name: z.string().catch("Untitled"),
  favorite: z.boolean().optional(),
  excluded_members: z.array(z.string()).optional(),
  icon: z.string().optional(),
})

export const FolderS = z.object({
  _v: z.number().default(1),
  id: z.string().catch(() => nanoid(10)),
  name: z.string(),
  excluded_members: z.array(z.string()).optional(),
  sessions: z.array(SessionS).optional(),
  data: z.array(DataRefS).optional(),
})

export const GroupS = z.object({
  _v: z.number().default(1),
  id: z.string().catch(() => nanoid(10)),
  name: z.string().catch("Untitled"),
  excluded_members: z.array(z.string()).optional(),
  folders: z.array(FolderS),
  data: z.array(DataRefS).optional(),
})

export const WorkspaceS = z.object({
  _v: z.number().default(1),
  _updated: z.number().optional(),
  id: z.string().catch(() => getId()),
  name: z.string().catch("Workspace"),
  icon: z.string().optional(),
  defaults: z
    .object({
      llm_module: z
        .object({
          id: z.string(),
          variant: z.string(),
        })
        .optional(),
    })
    .catch({
      llm_module: { id: config.defaults.llm_module.id, variant: config.defaults.llm_module.variant_id },
    }),
  members: MembersS,
  groups: z.array(GroupS),
  data: z.array(DataRefS).optional(),
})
export type WorkspaceT = z.infer<typeof WorkspaceS>
