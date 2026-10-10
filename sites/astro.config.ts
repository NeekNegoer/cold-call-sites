import { defineConfig } from "astro/config";
import config from "./config.json";

const url = new URL(config.urlBase);

export default defineConfig({
  site: url.origin,
  base: url.pathname,
  // sites/public/ guarda as fotos de todos os leads detalhados (Plano A): o Astro não pode publicar essa pasta.
  publicDir: "./estaticos",
  outDir: process.env.PREVIAS_SAIDA ?? "./.saida",
  trailingSlash: "always",
  build: { format: "directory", inlineStylesheets: "never" },
  devToolbar: { enabled: false },
  server: { host: "127.0.0.1", port: 4321 },
});
