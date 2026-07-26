import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// react-hooks v7 (via eslint-config-next) enables React Compiler rules as errors.
// Soften the new ones to warnings so lint matches the previous next lint baseline.
const softenedCompilerRules = [
  'react-hooks/set-state-in-effect',
  'react-hooks/immutability',
  'react-hooks/purity',
]

const softenedNextVitals = nextVitals.map((config) => {
  if (!config.rules) {
    return config
  }

  let changed = false
  const rules = { ...config.rules }

  for (const rule of softenedCompilerRules) {
    if (rules[rule] !== undefined) {
      rules[rule] = 'warn'
      changed = true
    }
  }

  return changed ? { ...config, rules } : config
})

const eslintConfig = defineConfig([
  ...softenedNextVitals,
  ...nextTs,
  // Keep scope close to historical `next lint` defaults.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'scripts/**',
    'upload-service/**',
    'prisma/**',
    'paid-content/**',
    'FIGMA30/**',
    'tooling/**',
  ]),
])

export default eslintConfig
