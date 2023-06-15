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

export const AppStateS = z.object({
  _v: z.number().default(1),
  active_workspace_id: z.string(),
  active_sessions: z.record(ActiveSessionS),
  active_message_id: z.string().optional(),
  open_folders: z.array(OpenFolderS),
  open_sessions: z.array(OpenSessionS),
})
