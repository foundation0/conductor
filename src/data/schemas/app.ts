import { nanoid } from "nanoid"
import { z } from "zod"

export const ActiveSessionS = z.object({
  _v: z.number().default(1),
  workspace_id: z.string(),
  group_id: z.string(),
  folder_id: z.string().optional(),
  session_id: z.string(),
})

export const OpenFolderS = z.object({
  _v: z.number().default(1),
  workspace_id: z.string(),
  group_id: z.string(),
  folder_id: z.string(),
})

export const OpenSessionS = z.object({
  _v: z.number().default(1),
  workspace_id: z.string(),
  group_id: z.string(),
  folder_id: z.string().optional(),
  session_id: z.string(),
  order: z.number().optional(),
})

export const LogItemS = z.object({
  _v: z.number().default(1),
  id: z.string().catch(() => nanoid(10)),
  timestamp: z.number().catch(() => Date.now()),
  type: z.string(),
  message: z.string(),
  data: z.any().optional(),
})

export const AppStateS = z.object({
  _v: z.number().default(1),
  _updated: z.number().optional(),
  active_workspace_id: z.string(),
  active_sessions: z.record(ActiveSessionS),
  active_message_id: z.string().optional(),
  open_folders: z.array(OpenFolderS),
  open_sessions: z.array(OpenSessionS),
  logs: z.array(LogItemS).optional(),
})
