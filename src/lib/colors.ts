const BASIC_COLORS = [
  'black',
  'white',
  'grey',
  'gray',
  'orange',
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'pink',
  'brown',
  'tan',
  'cream',
  'beige',
  'navy',
  'olive',
  'silver',
  'gold',
] as const

const TOKEN_MAP: Record<string, string> = {
  charcoal: 'Grey',
  castlerock: 'Grey',
  gum: 'Brown',
  bio: 'Multi',
  hack: 'Multi',
  tokyo: 'Multi',
  washed: 'Grey',
  multicolor: 'Multi',
  multicolour: 'Multi',
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

export function extractBasicColors(input: string): string[] {
  const tokens = input
    .split(/[\s/,-]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)

  const resolved = new Set<string>()

  tokens.forEach((token) => {
    if (token in TOKEN_MAP) {
      resolved.add(TOKEN_MAP[token])
      return
    }

    const exact = BASIC_COLORS.find((color) => color === token)
    if (exact) {
      resolved.add(titleCase(exact === 'gray' ? 'grey' : exact))
    }
  })

  if (resolved.size === 0) {
    return ['Multi']
  }

  return Array.from(resolved)
}

export function normalizeColorLabel(input: string) {
  return extractBasicColors(input).join(' ')
}
