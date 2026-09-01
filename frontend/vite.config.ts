import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "connect-src 'self' https:",
  "font-src 'self' data:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
];
const cspPlugin = (): Plugin => ({
  name: 'inject-security-headers',
  apply: 'build',
  transformIndexHtml() {
    return {
      html: undefined,
      tags: [{
        tag: 'meta',
        attrs: {
          'http-equiv': 'Content-Security-Policy',
          content: CSP_DIRECTIVES.join('; ')
        },
        injectTo: 'head-prepend'
      }, {
        tag: 'meta',
        attrs: {
          'http-equiv': 'X-Frame-Options',
          content: 'DENY'
        },
        injectTo: 'head-prepend'
      }, {
        tag: 'meta',
        attrs: {
          'http-equiv': 'X-Content-Type-Options',
          content: 'nosniff'
        },
        injectTo: 'head-prepend'
      }]
    };
  }
});
const vendorChunks = (id: string) => {
  if (!id.includes('node_modules')) {
    return undefined;
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
  plugins: [react(), cspPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunks
      }
    }
  }
});