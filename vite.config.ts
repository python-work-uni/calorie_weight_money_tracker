import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages project sites are served from a subpath, so `base` must match
// the repository name. Changing the repo name means changing this value too.
export default defineConfig({
  base: '/calorie_weight_money_tracker/',
  plugins: [react(), tailwindcss()],
})
