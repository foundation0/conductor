import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import svgr from "vite-plugin-svgr"
import packageJson from "./package.json"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"
import { comlink } from "vite-plugin-comlink"
import { faviconsPlugin } from "@darkobits/vite-plugin-favicons"
import { dataURLLoader } from "./utils/blobToDataURL"
import { viteStaticCopy } from "vite-plugin-static-copy"
import { VitePWA } from "vite-plugin-pwa"

const wasmContentTypePlugin = {
  name: "wasm-content-type-plugin",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url.endsWith(".wasm")) {
        res.setHeader("Content-Type", "application/wasm")
      }
      next()
    })
  },
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [
      // basicSsl(),
      react(),
      faviconsPlugin({
        icons: {
          favicons: {
            source: "./src/assets/logo-app.png",
          },
          android: {
            source: "./src/assets/logo-app.png",
          },
          appleStartup: {
            source: "./src/assets/logo-app.png",
          },
        },
      }),
      /* VitePWA({
        registerType: "autoUpdate",
        workbox: {
          maximumFileSizeToCacheInBytes: 10000000,
        },
      }), */
      svgr(),
      dataURLLoader,
      comlink(),
      wasm(),
      topLevelAwait(),
      wasmContentTypePlugin,
      viteStaticCopy({
        targets: [
          {
            src: "./node_modules/@xenova/transformers/dist/*.wasm",
            dest: "assets/wasm/",
          },
        ],
      }),
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
      plugins: [wasm(), topLevelAwait(), comlink()],
      format: 'es'
    },
    build: {
      rollupOptions: {
        output: {
          format: "esm",
        },
      },
    },
  }
})
