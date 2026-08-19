import crypto from 'crypto'

export function generateNumericPassword() {
  return crypto.randomInt(100000, 1_000_000).toString()
}
