import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import path from 'node:path';
import { createDevApiProxy } from './scripts/dev-api-proxy.js';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'');
 const backend=process.env.BACKEND_URL||env.BACKEND_URL||'http://127.0.0.1:9090';
 return {
  plugins:[react()],
  resolve:{alias:{'@':path.resolve(import.meta.dirname,'src'),'@layout':path.resolve(import.meta.dirname,'src/layout'),'@app':path.resolve(import.meta.dirname,'src/react-app')}},
  css:{postcss:{plugins:[tailwindcss()]}},
  server:{host:'127.0.0.1',port:3002,strictPort:true,proxy:{'/api':createDevApiProxy(backend)}},
  build:{outDir:'dist',sourcemap:false,target:'esnext',rollupOptions:{output:{manualChunks(id){if(!id.includes('node_modules'))return;if(id.includes('lucide-react'))return 'icons';if(id.includes('@radix-ui')||id.includes('@floating-ui'))return 'ui';if(/node_modules[\\/](react|react-dom|react-redux|scheduler|redux|@reduxjs|immer|reselect)[\\/]/.test(id))return 'framework';}}}}
 };
});
