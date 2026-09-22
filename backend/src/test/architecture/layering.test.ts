import { describe, expect, it } from "vitest";
import {
  collectEdges,
  filesInLayer,
  formatEdge,
  readRel,
  type ImportEdge,
  type Layer,
} from "../helpers/architectureScan.js";

/** Allowed dependency direction: fromLayer may import toLayer. */
const ALLOWED: Record<Layer, ReadonlySet<Layer>> = {
  routes: new Set(["routes", "controllers"]),
  controllers: new Set(["controllers", "services"]),
  services: new Set(["services", "repository", "domain", "models"]),
  repository: new Set(["repository", "db", "domain"]),
  db: new Set(["db", "domain", "services"]), // seed may call embeddings client
  domain: new Set(["domain"]),
  models: new Set(["domain", "models"]),
  app: new Set(["routes", "db", "app"]),
  other: new Set(),
};

function isAllowedEdge(edge: ImportEdge): boolean {
  if (edge.fromLayer === "services" && edge.to.startsWith("db/types")) {
    // Shared embedding/entity type helpers only — not the DB client.
    return true;
  }
  return ALLOWED[edge.fromLayer].has(edge.toLayer);
}

function forbiddenEdges(edges: ImportEdge[]): ImportEdge[] {
  return edges.filter((edge) => !isAllowedEdge(edge));
}

describe("backend architecture layering", () => {
  const edges = collectEdges();

  it("only allows downward / peer imports between layers", () => {
    const bad = forbiddenEdges(edges);
    expect(bad, bad.map(formatEdge).join("\n")).toEqual([]);
  });

  it("routes import controllers and nothing else internal", () => {
    const routeEdges = edges.filter((e) => e.fromLayer === "routes");
    expect(routeEdges.length).toBeGreaterThan(0);
    for (const edge of routeEdges) {
      expect(edge.toLayer, formatEdge(edge)).toBe("controllers");
    }
  });

  it("controllers import services (and not repository or db)", () => {
    const controllerFiles = filesInLayer("controllers");
    expect(controllerFiles.length).toBeGreaterThan(0);

    const controllerEdges = edges.filter((e) => e.fromLayer === "controllers");
    expect(controllerEdges.some((e) => e.toLayer === "services")).toBe(true);

    for (const edge of controllerEdges) {
      expect(["services"], formatEdge(edge)).toContain(edge.toLayer);
    }
  });

  it("repositories do not import services, controllers, or routes", () => {
    const bad = edges.filter(
      (e) =>
        e.fromLayer === "repository" &&
        (e.toLayer === "services" || e.toLayer === "controllers" || e.toLayer === "routes"),
    );
    expect(bad, bad.map(formatEdge).join("\n")).toEqual([]);
  });

  it("services do not import controllers or routes", () => {
    const bad = edges.filter(
      (e) =>
        e.fromLayer === "services" &&
        (e.toLayer === "controllers" || e.toLayer === "routes"),
    );
    expect(bad, bad.map(formatEdge).join("\n")).toEqual([]);
  });

  it("services do not open the database client directly", () => {
    const bad = edges.filter(
      (e) => e.fromLayer === "services" && e.to.startsWith("db/client"),
    );
    expect(bad, bad.map(formatEdge).join("\n")).toEqual([]);
  });

  it("only repository (and db) may call getDb or run SQL prepare", () => {
    const sqlPattern = /\bgetDb\s*\(|\.prepare\s*\(/;
    const offenders: string[] = [];

    for (const layer of ["controllers", "routes", "services", "domain", "models"] as Layer[]) {
      for (const file of filesInLayer(layer)) {
        const source = readRel(file);
        if (sqlPattern.test(source)) {
          offenders.push(file);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("domain does not depend on infrastructure layers", () => {
    const bad = edges.filter(
      (e) =>
        e.fromLayer === "domain" &&
        (e.toLayer === "services" ||
          e.toLayer === "repository" ||
          e.toLayer === "db" ||
          e.toLayer === "controllers" ||
          e.toLayer === "routes"),
    );
    expect(bad, bad.map(formatEdge).join("\n")).toEqual([]);
  });

  it("app wires routes (and may touch db for bootstrap only)", () => {
    const appEdges = edges.filter((e) => e.from === "app.ts");
    expect(appEdges.some((e) => e.toLayer === "routes")).toBe(true);
    for (const edge of appEdges) {
      expect(["routes"], formatEdge(edge)).toContain(edge.toLayer);
    }
  });
});
