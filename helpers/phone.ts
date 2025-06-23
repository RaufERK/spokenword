// helpers/phone.ts
export const normalizePhone = (raw: string) =>
  raw
    .replace(/\D+/g, '') // берём только цифры
    .replace(/^8/, '7') // 8________ → 7________
