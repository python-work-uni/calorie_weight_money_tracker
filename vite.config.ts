import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Builds fail loudly if these are missing, so a misconfigured deploy is caught
// in CI rather than showing a white screen to the user.
const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const

export default defineConfig(({ command, mode }) => {
  // Values from `.env*` files, plus real environment variables (CI passes the
  // repository secrets in this way).
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }

  if (command === 'build') {
    const missing = REQUIRED_ENV.filter((key) => !env[key])
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variable(s): ${missing.join(', ')}.\n` +
          'Locally: add them to .env.local (see .env.example).\n' +
          'In CI: add them as repository secrets.',
      )
    }
  }

  // GitHub Pages project sites are served from a subpath, so `base` must match
  // the repository name. Renaming the repo means changing this value too.
  return {
    base: '/calorie_weight_money_tracker/',
    plugins: [react(), tailwindcss()],
  }
})
