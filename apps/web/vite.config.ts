import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({root:path.resolve('apps/web'),plugins:[react()],server:{host:'127.0.0.1',port:5173,proxy:{'/api':'http://127.0.0.1:3001','/health':'http://127.0.0.1:3001'}},build:{outDir:path.resolve('dist/web'),emptyOutDir:true}});
