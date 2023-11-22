import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from 'solid-devtools/vite'
export default defineConfig({
  plugins: [devtools({autoname: true}), solidPlugin()],
  build: {
    target: "esnext",
    polyfillDynamicImport: false,
  },
});
