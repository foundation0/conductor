import { store } from "@/data/storage/localStorage"
import { UserS } from "@/data/schemas/user"
import * as z from "zod"
import { buf2hex, getAddress, keyPair } from "@/security/common"
import { state as AppState } from "@/data/loaders/app"
import { specs as OpenAI } from "@/modules/openai/"
import { specs as Anthropic } from "@/modules/anthropic/"
import ExampleProjectIcon from "@/assets/example-project-icon.svg"
import ExampleProjectIcon2 from "@/assets/icons/venn.svg"
export type UserT = z.infer<typeof UserS>
export const state = await store<UserT>({
  name: "user",
  initial: async (): Promise<UserT> => {
    // make sure app state has initialized
    async function getActiveSession(): Promise<ReturnType<typeof AppState.get>["active_sessions"][string]> {
      const app_state = AppState.get()
      const active_session = app_state.active_sessions[app_state.active_workspace_id]
      if (!active_session) {
        // throw new Error("No active session")
        await new Promise((resolve) => setTimeout(resolve, 50))
        return getActiveSession()
      }
      return active_session
    }
    const active_session = await getActiveSession()
    if (!active_session) throw new Error("No active session")

    const keypair = keyPair()
    const id = getAddress({ ...keypair })
    return {
      _v: 1,
      id,
      public_key: buf2hex({ input: keypair.public_key }),
      meta: {
        name: "Anon", // generateUsername(" "),
      },
      modules: {
        installed: [OpenAI, Anthropic],
      },
      workspaces: [
        {
          _v: 1,
          id: active_session.workspace_id,
          name: "Project",
          members: { _v: 1, read: [id], write: [id] },
          icon: "data:image/svg+xml,%3Csvg%20width%3D%2280%22%20height%3D%2280%22%20viewBox%3D%220%200%2080%2080%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M35.0182%2046.589C33.7497%2046.2081%2032.5148%2045.6785%2031.3397%2045C26.9837%2042.4851%2023.9873%2038.2365%2023.0182%2033.4109C21.7497%2033.7919%2020.5148%2034.3215%2019.3397%2035C13.9807%2038.094%2010.6794%2043.812%2010.6794%2050C10.6794%2056.188%2013.9807%2061.906%2019.3397%2065C24.6987%2068.094%2031.3012%2068.094%2036.6602%2065C37.8861%2064.2922%2039.0043%2063.4472%2040%2062.4906C36.6431%2059.2654%2034.6794%2054.7725%2034.6794%2050C34.6794%2048.8418%2034.7951%2047.7001%2035.0182%2046.589Z%22%20fill%3D%22%2327AE60%22%20%2F%3E%0A%20%20%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M31.3397%2015C36.6987%2011.906%2043.3012%2011.906%2048.6602%2015C54.0192%2018.094%2057.3205%2023.812%2057.3205%2030C57.3205%2031.1582%2057.2048%2032.2999%2056.9817%2033.411C52.4654%2032.0548%2047.5236%2032.5845%2043.3397%2035C42.1138%2035.7078%2040.9956%2036.5529%2040%2037.5095C39.0043%2036.5529%2037.8861%2035.7078%2036.6602%2035C32.4763%2032.5845%2027.5345%2032.0548%2023.0182%2033.411C22.7951%2032.2999%2022.6794%2031.1582%2022.6794%2030C22.6794%2023.812%2025.9807%2018.094%2031.3397%2015Z%22%20fill%3D%22%23EB5757%22%20%2F%3E%0A%20%20%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M44.9817%2046.5891C45.2049%2047.7002%2045.3205%2048.8418%2045.3205%2050C45.3205%2054.7725%2043.3568%2059.2654%2040%2062.4906C40.9957%2063.4472%2042.1139%2064.2922%2043.3397%2065C48.6987%2068.094%2055.3013%2068.094%2060.6603%2065C66.0192%2061.906%2069.3205%2056.188%2069.3205%2050C69.3205%2043.812%2066.0192%2038.094%2060.6603%2035C59.4851%2034.3215%2058.2502%2033.7919%2056.9817%2033.411C56.0127%2038.2365%2053.0162%2042.4851%2048.6603%2045C47.4851%2045.6785%2046.2502%2046.2081%2044.9817%2046.5891Z%22%20fill%3D%22%232D9CDB%22%20%2F%3E%0A%20%20%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M44.9817%2046.5891C40.4655%2047.9452%2035.5236%2047.4156%2031.3397%2045C26.9838%2042.4851%2023.9873%2038.2365%2023.0183%2033.411C27.5345%2032.0548%2032.4764%2032.5844%2036.6603%2035C41.0162%2037.5149%2044.0127%2041.7635%2044.9817%2046.5891Z%22%20fill%3D%22%23F2994A%22%20%2F%3E%0A%20%20%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M56.9817%2033.411C56.0127%2038.2365%2053.0162%2042.4851%2048.6603%2045C44.4764%2047.4156%2039.5345%2047.9452%2035.0183%2046.5891C35.9873%2041.7635%2038.9838%2037.5149%2043.3397%2035C47.5236%2032.5844%2052.4655%2032.0548%2056.9817%2033.411Z%22%20fill%3D%22%23BB6BD9%22%20%2F%3E%0A%20%20%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M40%2037.5094C43.3568%2040.7346%2045.3205%2045.2275%2045.3205%2050C45.3205%2054.7725%2043.3568%2059.2654%2040%2062.4906C36.6432%2059.2654%2034.6795%2054.7725%2034.6795%2050C34.6795%2045.2275%2036.6432%2040.7346%2040%2037.5094Z%22%20fill%3D%22%2356CCF2%22%20%2F%3E%0A%20%20%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M35.0183%2046.5891C35.7146%2043.1216%2037.4578%2039.952%2040%2037.5095C42.5423%2039.952%2044.2855%2043.1216%2044.9818%2046.5891C41.734%2047.5643%2038.2661%2047.5643%2035.0183%2046.5891Z%22%20fill%3D%22%23F2F2F2%22%20%2F%3E%0A%3C%2Fsvg%3E",
          defaults: {
            llm_module: {
              id: "openai",
              variant: "gpt-3.5-turbo",
            },
          },
          groups: [
            {
              _v: 1,
              id: active_session.group_id,
              name: "Workspace",
              folders: [
                {
                  _v: 1,
                  id: active_session.folder_id as string,
                  name: "My folder",
                  sessions: [{ _v: 1, id: active_session.session_id, name: "Untitled", icon: "📝" }],
                },
              ],
            },
          ],
        },
      ],
    }
  },
  ztype: UserS,
})
