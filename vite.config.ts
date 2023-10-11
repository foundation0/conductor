import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import svgr from "vite-plugin-svgr"
import packageJson from "./package.json"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"
import { comlink } from "vite-plugin-comlink"
import { faviconsPlugin } from "@darkobits/vite-plugin-favicons"
import { dataURLLoader } from "./utils/blobToDataURL"
import basicSsl from "@vitejs/plugin-basic-ssl"
import million from 'million/compiler';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [
      // basicSsl(),
      react(),
      faviconsPlugin({
        icons: {
          favicons: {
            source: "./src/assets/logo.png",
          },
          android: {
            source: "./src/assets/logo.png",
          },
          appleStartup: {
            source: "./src/assets/logo.png",
          },
        },
      }),
      svgr(),
      dataURLLoader,
      comlink(),
      wasm(),
      topLevelAwait(),
    ],
    resolve: {
      alias: {
        "@": "/src",
        "@state/*": "/src/state/*",
        "@types/*": "/src/types/*",
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      ...env,
    },
    worker: {
      plugins: [comlink()],
    },
  }
})
