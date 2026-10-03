import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default tseslint.config(
  { ignores: ['.next/**','out/**','node_modules/**','tmp/**','next-env.d.ts','*.log'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: Object.fromEntries(['console','process','Buffer','URL','URLSearchParams','fetch','AbortSignal','setTimeout','clearTimeout','window','document','navigator','localStorage','ResizeObserver','IntersectionObserver','FormData','Event','HTMLElement','HTMLInputElement','HTMLFormElement','File','Blob','Request','Response','TextEncoder','crypto','queueMicrotask'].map(name=>[name,'readonly'])) },
    rules: { '@typescript-eslint/no-unused-vars': ['warn',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}], '@typescript-eslint/no-explicit-any':'error' } },
  { files:['src/**/*.{ts,tsx}'], plugins:{'react-hooks':hooks}, rules:hooks.configs.recommended.rules },
  { files:['**/*.mjs','**/*.js'], languageOptions:{globals:{module:'readonly'}}, rules:{'@typescript-eslint/no-require-imports':'off','@typescript-eslint/no-unused-vars':['warn',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]} }
);
