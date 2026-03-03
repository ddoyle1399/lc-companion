import { bundle } from "@remotion/bundler";
import path from "node:path";

const entryPoint = path.resolve("remotion/index.ts");
const outDir = path.resolve(".remotion-bundle");

console.log("Bundling Remotion composition...");
console.log(`Entry: ${entryPoint}`);
console.log(`Output: ${outDir}`);

const bundled = await bundle({
  entryPoint,
  outDir,
  webpackOverride: (config) => config,
});

console.log(`Bundle complete: ${bundled}`);
