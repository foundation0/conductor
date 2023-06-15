import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import svgr from "vite-plugin-svgr"
import packageJson from "./package.json"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"
import { comlink } from 'vite-plugin-comlink'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), comlink(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      "@": "/src",
      "@state/*": "/src/state/*",
      "@types/*": "/src/types/*",
    },
  },
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
  worker: {
    plugins: [
      comlink()
    ]
  }
})
