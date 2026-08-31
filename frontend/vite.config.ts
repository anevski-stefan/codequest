import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const vendorChunks = (id: string) => {
  if (!id.includes('node_modules')) {
    return undefined;
  }
  if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
    return 'chart';
  }
  if (id.includes('framer-motion')) {
    return 'motion';
  }
  if (id.includes('lodash')) {
    return 'lodash';
  }
  if (id.includes('react-markdown') || id.includes('micromark') || id.includes('remark-') || id.includes('rehype-') || id.includes('unified') || id.includes('mdast') || id.includes('hast') || id.includes('unist') || id.includes('ccount') || id.includes('decode-named-character-reference')) {
    return 'markdown';
  }
  if (id.includes('react-redux') || id.includes('use-sync-external-store')) {
    return 'react';
  }
  if (id.includes('@reduxjs') || id.includes('redux') || id.includes('reselect') || id.includes('redux-thunk')) {
    return 'redux';
  }
  if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler') || id.includes('react-router') || id.includes('@remix-run')) {
    return 'react';
  }
  if (id.includes('@tanstack')) {
    return 'query';
  }
  if (id.includes('axios')) {
    return 'axios';
  }
  return undefined;
};
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunks
      }
    }
  }
});