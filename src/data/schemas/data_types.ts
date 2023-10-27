import _ from "lodash"
import { z } from "zod"

export const DATA_TYPES_TEXT = {
  "text/plain": [".txt"],
  "text/x-go": [".go"],
  "text/x-c": [".c", ".cpp"],
  "text/x-java-source": [".java"],
  "text/x-httpd-php": [".php"],
  "text/x-proto": [".proto"],
  "text/x-python": [".py"],
  "application/rls-services+xml": [".rs"],
  "text/x-ruby": [".rb"],
  "text/x-scala": [".scala"],
  "text/x-swift": [".swift"],
  "text/markdown": [".md"],
  "text/x-latex": [".tex"],
  "application/javascript": [".js", ".ts"],
}

export const LANGUAGES: { [key: string]: string } = {
  "text/x-go": "go",
  "text/x-c": "cpp",
  "text/x-java-source": "java",
  "text/x-httpd-php": "php",
  "text/x-proto": "proto",
  "text/x-python": "python",
  "application/rls-services+xml": "rust",
  "text/x-ruby": "ruby",
  "text/x-scala": "scala",
  "text/x-swift": "swift",
  "text/markdown": "markdown",
  "text/x-latex": "latex",
  "application/javascript": "js",
}

export const DATA_TYPES_BINARY = {
  "application/pdf": [".pdf"],
  // "application/epub+zip": [".epub"],
}

export const DATA_TYPES: { [key: string]: string[] } = _.merge({}, DATA_TYPES_TEXT, DATA_TYPES_BINARY)

export const DataTypesTextS = z.enum([
  "text/plain",
  "text/x-c",
  "text/x-go",
  "text/x-java-source",
  "text/x-httpd-php",
  "text/x-proto",
  "text/x-python",
  "application/rls-services+xml",
  "text/x-ruby",
  "text/x-scala",
  "text/x-swift",
  "text/markdown",
  "text/x-latex",
  "application/javascript",
])
export type DataTypesTextT = z.infer<typeof DataTypesTextS>

export const DataTypesBinaryS = z.enum([
  "application/pdf",
  //"application/epub+zip"
])
export type DataTypesBinaryT = z.infer<typeof DataTypesBinaryS>
