export function digitosNacionais(telefone: string): string {
  let d = telefone.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  return d;
}

export function ehCelular(telefone: string): boolean {
  const d = digitosNacionais(telefone);
  return d.length === 11 && d[2] === "9";
}

export function linkWhatsApp(telefone: string): string | null {
  return ehCelular(telefone) ? `https://wa.me/55${digitosNacionais(telefone)}` : null;
}
