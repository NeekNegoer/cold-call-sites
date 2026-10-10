// Cofre do painel: PBKDF2-SHA256 deriva a chave da senha e o AES-256-GCM cifra os leads.
// Usa só a Web Crypto, então o mesmo arquivo roda no build (Node 24) e na página.
export const ITERACOES = 600000;

function paraBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function deBase64(texto) {
  const s = atob(texto);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function derivarChave(senha, sal, iteracoes) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iteracoes },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function criptografar(texto, senha, iteracoes = ITERACOES) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chave = await derivarChave(senha, sal, iteracoes);
  const dados = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave, new TextEncoder().encode(texto)));
  return { v: 1, iteracoes, sal: paraBase64(sal), iv: paraBase64(iv), dados: paraBase64(dados) };
}

// Senha errada ou cofre adulterado: o AES-GCM recusa e a função devolve null.
export async function descriptografar(cofre, senha) {
  try {
    const chave = await derivarChave(senha, deBase64(cofre.sal), cofre.iteracoes);
    const aberto = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deBase64(cofre.iv) }, chave, deBase64(cofre.dados));
    return new TextDecoder().decode(aberto);
  } catch {
    return null;
  }
}
