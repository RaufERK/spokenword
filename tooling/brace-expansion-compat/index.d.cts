declare function expandTop(
  str: string,
  options?: { max?: number; maxLength?: number },
): string[]

declare namespace expandTop {
  function expand(
    str: string,
    options?: { max?: number; maxLength?: number },
  ): string[]
  const EXPANSION_MAX: number
  const EXPANSION_MAX_LENGTH: number
}

export = expandTop
