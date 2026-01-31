import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    root: './',
    base: './',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        },
        output: {
          manualChunks: {
            // Vendor chunks
            'vendor-react': ['react', 'react-dom'],
            'vendor-charts': ['recharts'],
            
            // Core UI components
            'ui-core': [
              './src/components/Sidebar.jsx',
              './src/components/TopHeader.jsx',
              './src/components/Toast.jsx',
              './src/components/LoadingSpinner.jsx',
            ],
            
            // AI features chunk
            'ai-features': [
              './src/components/AICopilot.jsx',
              './src/components/SmartClaimAnalyzer.jsx',
              './src/components/VoiceClinicalDocumentation.jsx',
              './src/services/aiAssistantService.js',
              './src/services/geminiService.js',
            ],
            
            // NPHIES integration chunk
            'nphies': [
              './src/pages/EligibilityPage.jsx',
              './src/pages/PriorAuthPage.jsx',
              './src/pages/ClaimsQueuePage.jsx',
              './src/services/nphiesService.js',
            ],
            
            // Code management chunk
            'code-management': [
              './src/pages/SBSCodeBrowser.jsx',
              './src/pages/UnifiedCodeBrowser.jsx',
              './src/services/unifiedTerminologyService.js',
            ],
            
            // Analytics chunk
            'analytics': [
              './src/pages/MappingsPage.jsx',
              './src/pages/FacilityPerformanceReport.jsx',
              './src/pages/FacilityUsagePage.jsx',
              './src/pages/PredictiveAnalyticsPage.jsx',
            ],
          }
        }
      }
    },
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:3000'),
      'import.meta.env.VITE_N8N_WEBHOOK_URL': JSON.stringify(env.VITE_N8N_WEBHOOK_URL || '')
    }
  };
});
