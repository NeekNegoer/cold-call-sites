import { test } from "node:test";
import assert from "node:assert/strict";
import { classificarSite } from "./classificar.ts";

test("sem site", () => {
  for (const v of [null, undefined, "", "   "]) {
    assert.deepEqual(classificarSite(v), { classificacao: "sem_site", instagram: null });
  }
});

test("Instagram vira so_rede e extrai o @", () => {
  assert.deepEqual(classificarSite("https://www.instagram.com/barbeariadoze/"), {
    classificacao: "so_rede",
    instagram: "@barbeariadoze",
  });
  assert.deepEqual(classificarSite("instagram.com/BarbeariaDoZe?igsh=abc"), {
    classificacao: "so_rede",
    instagram: "@barbeariadoze",
  });
});

test("link de post do Instagram é so_rede sem @", () => {
  assert.deepEqual(classificarSite("https://www.instagram.com/p/Cxyz123/"), {
    classificacao: "so_rede",
    instagram: null,
  });
});

test("redes, links de bio e apps de agenda são so_rede", () => {
  for (const url of [
    "https://linktr.ee/barbeariadoze",
    "https://booksy.com/pt-br/123_barbearia-do-ze",
    "https://www.trinks.com/barbearia-do-ze",
    "https://barbeariadoze.business.site/",
    "https://m.facebook.com/barbeariadoze",
    "https://wa.me/5548991234567",
    "https://api.whatsapp.com/send?phone=5548991234567",
  ]) {
    assert.equal(classificarSite(url).classificacao, "so_rede", url);
  }
});

test("apps de agenda e links de bio achados nas buscas reais são so_rede", () => {
  for (const url of [
    "https://sites.appbarber.com.br/barbeariadoze",
    "https://cashbarber.com.br/barbeariadoze",
    "https://calendly.com/barbeariadoze",
    "https://barbeariadoze.gendo.app/",
    "https://biolink.info/barbeariadoze",
    "https://wa.link/abc123",
  ]) {
    assert.equal(classificarSite(url).classificacao, "so_rede", url);
  }
});

test("domínio próprio é site_proprio, inclusive parecido com rede", () => {
  assert.equal(classificarSite("https://www.barbeariadoze.com.br").classificacao, "site_proprio");
  assert.equal(classificarSite("https://notinstagram.com/x").classificacao, "site_proprio");
});

test("URL quebrada conta como sem site", () => {
  assert.equal(classificarSite("http://").classificacao, "sem_site");
});
