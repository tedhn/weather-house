import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // A PDF small enough to fall under the inline limit would be built into a
    // `data:` URL, and Chrome refuses to run its PDF viewer on one inside an
    // iframe -- the desktop's document windows come up blank. Keep every PDF
    // an emitted file; everything else keeps the default limit.
    assetsInlineLimit: (file) => (file.endsWith('.pdf') ? false : undefined),
  },
})
