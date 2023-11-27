import { defineConfig } from "vite";
import jsxRefresh from "@vitejs/plugin-react-refresh";
import { narrowSolidPlugin } from "@merged/react-solid/plugin";
import checker from "vite-plugin-checker";
// import eslintConfigReact from './src/.eslintrc'
// import { existsSync } from "node:fs";
// import fs from "node:fs/promises";
// const loadJSON = async (filePath: string) =>
//   JSON.parse(await fs.readFile(filePath, { encoding: "utf-8" }));

export default defineConfig(async () => {
  // const eslintConfigReact = await loadJSON(".eslintrc");
  // console.log(
  //   "🚀 ~ file: vite.config.ts:13 ~ defineConfig ~ eslintConfigReact:",
  //   eslintConfigReact
  // );
  return {
    plugins: [
      narrowSolidPlugin({ include: /\/src\/solid/ }),
      jsxRefresh({ exclude: /\/src\/solid\// }),
      checker({
        typescript: true,
        // root: "./",
        root: process.cwd(),
        // overlay: {},
        eslint: {
          lintCommand: 'eslint -c "./.eslintrc"',
          // dev: { overrideConfig: { overrideConfig: eslintConfigReact } },
        },
      }),
    ],
  };
});
