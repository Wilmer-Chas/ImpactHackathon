import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SRC_ROOT = path.resolve(__dirname, "../..");

export type Layer =
  | "routes"
  | "controllers"
  | "services"
  | "repository"
  | "db"
  | "domain"
  | "models"
  | "app"
  | "other";

const IMPORT_RE =
  /(?:from\s+|import\s*\(\s*|export\s+\*\s+from\s+)["']([^"']+)["']/g;

export function listSourceFiles(dir = SRC_ROOT): string[] {
  const out: string[] = [];

  function walk(current: string): void {
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (name === "test" || name === "node_modules") {
          continue;
        }
        walk(full);
        continue;
      }
      if (name.endsWith(".ts") && !name.endsWith(".test.ts") && !name.endsWith(".d.ts")) {
        out.push(full);
      }
    }
  }

  walk(dir);
  return out;
}

export function toPosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export function relFromSrc(absPath: string): string {
  return toPosix(path.relative(SRC_ROOT, absPath));
}

export function layerOf(relPath: string): Layer {
  if (relPath === "app.ts" || relPath === "index.ts") {
    return "app";
  }
  const top = relPath.split("/")[0] ?? "";
  switch (top) {
    case "routes":
    case "controllers":
    case "services":
    case "repository":
    case "db":
    case "domain":
    case "models":
      return top;
    default:
      return "other";
  }
}

export function layerFromResolved(resolved: string): Layer {
  if (resolved === "app" || resolved === "index") {
    return "app";
  }
  const top = resolved.split("/")[0] ?? "";
  switch (top) {
    case "routes":
    case "controllers":
    case "services":
    case "repository":
    case "db":
    case "domain":
    case "models":
      return top;
    default:
      return "other";
  }
}

export function extractImportSpecifiers(source: string): string[] {
  const specs: string[] = [];
  IMPORT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_RE.exec(source)) !== null) {
    const spec = match[1];
    if (spec) {
      specs.push(spec);
    }
  }
  return specs;
}

/** Resolve a relative import to a src-relative posix path without extension. */
export function resolveImport(fromRelFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) {
    return null;
  }
  const fromDir = path.posix.dirname(fromRelFile);
  return path.posix
    .normalize(path.posix.join(fromDir, specifier))
    .replace(/\.js$/, "")
    .replace(/\.ts$/, "");
}

export type ImportEdge = {
  from: string;
  fromLayer: Layer;
  to: string;
  toLayer: Layer;
  specifier: string;
};

export function collectEdges(): ImportEdge[] {
  const edges: ImportEdge[] = [];
  for (const abs of listSourceFiles()) {
    const from = relFromSrc(abs);
    const fromLayer = layerOf(from);
    const source = readFileSync(abs, "utf8");
    for (const specifier of extractImportSpecifiers(source)) {
      const resolved = resolveImport(from, specifier);
      if (!resolved) {
        continue;
      }
      edges.push({
        from,
        fromLayer,
        to: resolved,
        toLayer: layerFromResolved(resolved),
        specifier,
      });
    }
  }
  return edges;
}

export function filesInLayer(layer: Layer): string[] {
  return listSourceFiles()
    .map(relFromSrc)
    .filter((rel) => layerOf(rel) === layer);
}

export function readRel(relPath: string): string {
  return readFileSync(path.join(SRC_ROOT, relPath), "utf8");
}

export function formatEdge(edge: ImportEdge): string {
  return `${edge.from} → ${edge.to} (${edge.fromLayer} → ${edge.toLayer})`;
}
