import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env files for the current mode (development | production).
  // Third arg '' loads ALL vars (not just VITE_ prefixed) so we can do
  // the mode-aware fallback logic before Vite processes import.meta.env.
  const env = loadEnv(mode, process.cwd(), '')

  // Determine the API base URL:
  //   1. Prefer the value set in .env.production / Vercel dashboard (VITE_API_URL)
  //   2. Fall back based on build mode so localhost NEVER ends up in production
  const apiBaseUrl =
    env.VITE_API_URL ||
    (mode === 'production'
      ? 'https://codeprep-w0nr.onrender.com'
      : 'http://localhost:5000')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],

    // Statically replace import.meta.env.VITE_API_URL at build time.
    // This guarantees the compiled bundle always contains the correct URL
    // even when the env file is absent from the CI/CD environment.
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiBaseUrl),
    },

    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
  }
})
