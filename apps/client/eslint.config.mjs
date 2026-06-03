/* eslint-disable @stylistic/semi */
// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt({
  languageOptions: {
    parserOptions: {
      tsconfigRootDir: import.meta.dirname
    }
  },
  rules: {
    '@stylistic/semi': 'off'
  }
});
