import base from "../../eslint.config.base.mjs";

export default [
  ...base,
  {
    // tests/ are validated by jest at runtime; they use runner globals and are
    // excluded from the app tsconfig, so skip them in the typed source lint.
    // (Wiring the spec-test/require-expect rule on tests is a follow-up.)
    ignores: [".expo/**", "android/**", "ios/**", "dist/**", "tests/**", ".maestro/**"],
  },
];
