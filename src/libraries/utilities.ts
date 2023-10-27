import { ZodSchema } from "zod"
import { error } from "./logging"
import _ from "lodash"
import b4a from "b4a"
import { OSesT } from "@/data/schemas/misc"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function generateSchemaTransformer({ schemas }: { schemas?: ZodSchema[] }): {
  parse: (data: any) => any
  schema: ZodSchema
} {
  if (!schemas) {
    error({ message: "No schemas provided" })
    return {} as any
  }
  const scmas = _(schemas).orderBy("_v", "asc").value()
  return {
    parse: (data: any) => {
      let version = data._v
      let transformedData = data
      for (let i = version; i < scmas.length - 1; i++) {
        const result = scmas[i].safeParse(transformedData)
        if (result.success) {
          const transform = scmas[i + 1].safeParse(result.data)
          if (transform.success) {
            transformedData = transform.data
          } else {
            return error({ message: "Data does not match schema version " + (i + 1) })
          }
        } else {
          throw new Error(`Data does not match schema version ${i}`)
        }
      }
      const transform = schemas[schemas.length - 1].safeParse(transformedData)
      if (transform.success) {
        return transform.data as ZodSchema
      } else {
        return error({ message: "Data does not match schema version " + (schemas.length - 1) })
      }
    },
    schema: _.last(scmas) as ZodSchema,
  }
}

export function fileToDataURL({ file, type }: { file: Uint8Array | string; type: string }) {
  // data:[<mediatype>][;base64],<data>
  if (typeof file === "string") file = b4a.from(file)
  const blob = new Blob([file], { type })
  return URL.createObjectURL(blob)
}

export function getOS(): OSesT {
  let OSName: OSesT = "unknown os"
  if (navigator.userAgent.indexOf("Win") !== -1) OSName = "windows"
  if (navigator.userAgent.indexOf("Mac") !== -1) OSName = "macos"
  if (navigator.userAgent.indexOf("X11") !== -1) OSName = "unix"
  if (navigator.userAgent.indexOf("Linux") !== -1) OSName = "linux"

  return OSName
}

// function to detect numbers in strings
export function isNumeric(str: string) {
  if (typeof str != "string") return false // we only process strings!
  // make sure it keeps integers and floats as floats
  return !isNaN(str as any) && !isNaN(parseFloat(str))
}

// parse floats into integers if they are whole numbers
export function parseNumber(str: string) {
  if (typeof str != "string") return str // we only process strings!
  // make sure it keeps integers and floats as floats
  if (isNumeric(str)) {
    if (str.indexOf(".") !== -1) {
      return parseFloat(str)
    }
    return parseInt(str)
  }
  return str
}

// turn string booleans into booleans
export function parseBoolean(str: any) {
  if (typeof str != "string") return str // we only process strings!
  // make sure it keeps integers and floats as floats
  if (str === "true") return true
  if (str === "false") return false
  return str
}
