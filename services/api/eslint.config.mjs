import base from "../../eslint.config.base.mjs";

export default [
  ...base,
  {
    rules: {
      // NestJS leans on decorators and constructor DI; these defaults are noisy
      // against that pattern.
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
    },
  },
  {
    // *.spec.ts are validated by vitest at runtime (runner globals + the
    // spec-test subpath). Skip them in the typed source lint for now.
    ignores: ["dist/**", "**/*.spec.ts"],
  },
];
