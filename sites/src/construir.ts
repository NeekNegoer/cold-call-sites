import { spawnSync } from "node:child_process";
import { join } from "node:path";
import type { Modo } from "./modo.ts";

// Roda o build do Astro numa pasta escolhida: o publicar usa uma temporária, para não apagar o .git de sites/dist.
export function construirSites(o: { raiz: string; saida: string; modo: Modo }): void {
  const r = spawnSync(join(o.raiz, "node_modules", ".bin", "astro"), ["build", "--root", join(o.raiz, "sites")], {
    cwd: o.raiz,
    encoding: "utf8",
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", PREVIAS_SAIDA: o.saida, PREVIAS_MODO: o.modo },
  });
  if (r.status !== 0) throw new Error(`O build das prévias falhou:\n${r.stdout}\n${r.stderr}`);
}
