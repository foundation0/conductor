import { ZodSchema, ZodType } from "zod"
import { error } from "./logging"
import _ from "lodash"
import b4a from "b4a"

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

export function getOS(): string {
  let OSName: string = "Unknown OS"
  if (navigator.userAgent.indexOf("Win") !== -1) OSName = "Windows"
  if (navigator.userAgent.indexOf("Mac") !== -1) OSName = "MacOS"
  if (navigator.userAgent.indexOf("X11") !== -1) OSName = "UNIX"
  if (navigator.userAgent.indexOf("Linux") !== -1) OSName = "Linux"

  return OSName
}
