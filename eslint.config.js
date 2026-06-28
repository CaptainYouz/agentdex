import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        CSS: 'readonly',
        Event: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLElement: 'readonly',
        MouseEvent: 'readonly',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    ignores: ['dist', 'src-tauri/target', 'src/vite-env.d.ts'],
  },
)
