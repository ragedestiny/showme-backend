// ESLint reads the code without running it and flags likely mistakes.
// This follows Vite's official React starter setup.
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  // Generated output, not our code
  { ignores: ["build"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Catches common JavaScript mistakes (undefined names, unreachable code...)
      ...js.configs.recommended.rules,
      // The rules of React hooks (useEffect dependencies and so on)
      ...reactHooks.configs.recommended.rules,
      // Unused variables are usually a forgotten step. Names starting with a
      // capital letter are skipped because they're often only used in JSX,
      // which this rule can't see.
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
      // Keeps instant refresh working: component files should only export components
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  // Build scripts and the Vite config run in Node (not the browser), where
  // `process` exists
  {
    files: ["scripts/**/*.js", "vite.config.js"],
    languageOptions: { globals: globals.node },
  },
];
