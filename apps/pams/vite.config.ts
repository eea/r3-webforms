import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // More specific paths must come before /api to avoid prefix conflicts
      '/api-prod': {
        target: 'https://api.reportnet.europa.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-prod/, ''),
      },
      '/api-preprod': {
        target: 'https://preprod-api.reportnet.europa.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-preprod/, ''),
      },
      '/api': {
        target: 'https://sandbox-api.reportnet.europa.eu',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    }
  },
  optimizeDeps: {
    include: [
      '@mui/x-date-pickers',
      '@mui/x-date-pickers/DatePicker',
      '@mui/x-date-pickers/LocalizationProvider',
      '@mui/x-date-pickers/AdapterDateFns',
      'date-fns',
    ],
  },
})
