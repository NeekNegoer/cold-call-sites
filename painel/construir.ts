import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const caminho = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const MARCA = "/*__LOGICA__*/";

const pagina = readFileSync(caminho("./pagina.html"), "utf8");
if (!pagina.includes(MARCA)) throw new Error(`painel/pagina.html precisa conter ${MARCA}`);
const logica = readFileSync(caminho("./logica.js"), "utf8");

mkdirSync(caminho("./dist/"), { recursive: true });
writeFileSync(caminho("./dist/caderno.html"), pagina.replace(MARCA, () => logica));
console.log("painel/dist/caderno.html gerado");
