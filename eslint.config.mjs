import { dirname } from "path";
import { fileURLToPath } from "url";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "*.config.js",
      "*.config.mjs",
      "scripts/**/*.js",
      "out/**",
      "build/**",
      "public/**",
      "next-env.d.ts",
    ],
  },

  // Base ESLint recommended
  eslint.configs.recommended,

  // TypeScript ESLint recommended with type checking
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // React plugin settings
  {
    plugins: {
      react: reactPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/display-name": "off",
    },
  },

  // React Hooks plugin
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },

  // Next.js plugin
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  // Security plugin
  security.configs.recommended,

  // SonarJS plugin
  sonarjs.configs.recommended,

  // Global settings for all files
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
        React: "readonly",
        JSX: "readonly",
      },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
  },

  // Main rules for TypeScript/React files
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // 🔴 セキュリティ: 危険な実行を防止
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",

      // 🔴 97%品質: any型を完全根絶
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",

      // 🔴 97%品質: 実用的型安全
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-unnecessary-condition": "warn",

      // 🔴 97%品質: デバッグコード完全禁止
      "no-console": "error",
      "no-debugger": "error",

      // 🔥 無限ループ防止ルール（強化版）
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='useEffect'] > ArrowFunctionExpression > CallExpression[callee.property.name=/^set[A-Z]/]",
          message: "⚠️ 無限ループの危険: useEffect内でのsetState呼び出しは慎重に。条件分岐を追加してください。"
        },
        {
          selector: "CallExpression[callee.name='useEffect'] ArrayExpression > ObjectExpression",
          message: "🔥 無限ループ確実: 依存配列にオブジェクトリテラル使用禁止！ useMemo(() => ({...}), [依存値]) を使用してください。"
        },
        {
          selector: "CallExpression[callee.name='useEffect'] ArrayExpression > ArrayExpression",
          message: "🔥 無限ループ確実: 依存配列に配列リテラル使用禁止！ useMemo(() => [...], [依存値]) を使用してください。"
        },
        {
          selector: "CallExpression[callee.name='useEffect'] ArrayExpression > ArrowFunctionExpression",
          message: "🔥 無限ループ確実: 依存配列に関数リテラル使用禁止！ useCallback(() => {...}, [依存値]) を使用してください。"
        },
        {
          selector: "CallExpression[callee.name=/^use(Callback|Memo)$/] ArrayExpression > ObjectExpression",
          message: "🔥 最適化無効: useCallback/useMemoの依存配列にオブジェクトリテラル使用禁止！ プリミティブ値を使用してください。"
        }
      ],

      // 🟡 97%品質: 実用的な複雑性制御
      "sonarjs/cognitive-complexity": ["error", 10],
      "sonarjs/no-duplicate-string": ["error", { threshold: 4 }],
      "sonarjs/no-duplicated-branches": "error",
      "sonarjs/no-identical-expressions": "error",
      "sonarjs/prefer-read-only-props": "off",
      "sonarjs/function-return-type": "off",
      "sonarjs/slow-regex": "warn",
      "sonarjs/no-hardcoded-passwords": "warn",
      "sonarjs/different-types-comparison": "warn",
      "sonarjs/no-undefined-argument": "off",

      // 🟡 97%品質: 重要なセキュリティ
      "security/detect-object-injection": "off",
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-non-literal-require": "error",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-possible-timing-attacks": "warn",

      // 🔴 実行時エラー防止
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",

      // 🔴 null/undefined安全性
      "@typescript-eslint/strict-boolean-expressions": [
        "warn",
        {
          allowString: true,
          allowNumber: false,
          allowNullableObject: true,
          allowAny: true
        }
      ]
    },
  },

  // Feature boundary rules
  {
    files: ["src/features/**/*.ts", "src/features/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*/components/*", "../*/hooks/*", "../*/utils/*", "../*/store/*"],
              message: "フィーチャー境界違反: 相対パスでの他フィーチャー参照は禁止"
            }
          ]
        }
      ]
    }
  },

  // Config files override
  {
    files: ["*.config.*"],
    rules: {
      "sonarjs/cognitive-complexity": "off",
    },
  },

  // Test files override
  {
    files: ["**/*.test.*", "**/*.spec.*", "tests/**/*"],
    rules: {
      "sonarjs/no-duplicate-string": "off",
      "sonarjs/todo-tag": "off",
      "sonarjs/no-commented-code": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-inferrable-types": "off",
    },
  },

  // Infinite loop detector override
  {
    files: ["src/hooks/useInfiniteLoopDetector.ts"],
    rules: {
      "sonarjs/cognitive-complexity": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
    },
  }
);
