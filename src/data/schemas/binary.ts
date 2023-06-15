import { ValidationError } from "zod-validation-error"
import Buffer from "b4a"

export function validateBinary(data: unknown): Buffer | Uint8Array {
  if (!Buffer.isBuffer(data)) {
    throw new ValidationError("Invalid argument; expected binary data")
  }
  return data
}
