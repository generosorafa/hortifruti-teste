import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const limits = {
  largestJavaScriptBytes: 720_000,
  totalJavaScriptBytes: 1_050_000,
  totalJavaScriptGzipBytes: 285_000,
  totalCssGzipBytes: 20_000,
};

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const target = join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : target;
  }));
  return files.flat();
};

const files = await walk(root);
const assets = await Promise.all(files.map(async (file) => {
  const contents = await readFile(file);
  return {
    file,
    extension: extname(file),
    bytes: (await stat(file)).size,
    gzipBytes: gzipSync(contents).length,
  };
}));

const javascript = assets.filter((asset) => asset.extension === ".js");
const css = assets.filter((asset) => asset.extension === ".css");
const largestJavaScript = javascript.toSorted((left, right) => right.bytes - left.bytes)[0];
const total = (items, key) => items.reduce((sum, item) => sum + item[key], 0);
const measurements = {
  largestJavaScriptBytes: largestJavaScript?.bytes ?? 0,
  totalJavaScriptBytes: total(javascript, "bytes"),
  totalJavaScriptGzipBytes: total(javascript, "gzipBytes"),
  totalCssGzipBytes: total(css, "gzipBytes"),
};

console.table(Object.entries(measurements).map(([metric, value]) => ({
  metric,
  value,
  limit: limits[metric],
  status: value <= limits[metric] ? "OK" : "EXCEDEU",
})));

if (largestJavaScript) {
  console.log(`Maior arquivo JavaScript: ${relative(root, largestJavaScript.file)} (${largestJavaScript.bytes} bytes)`);
}

const exceeded = Object.entries(measurements).filter(([metric, value]) => value > limits[metric]);
if (exceeded.length) {
  console.error(`Orçamento de performance excedido: ${exceeded.map(([metric]) => metric).join(", ")}.`);
  process.exitCode = 1;
}
