/** Formatação de data em pt-BR. Nada de cálculo astrológico aqui. */

/** "sexta-feira, 23 de agosto" — kicker no topo da home. */
export function dataPorExtenso(d: Date = new Date()): string {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** ISO `YYYY-MM-DD` do dia local — chave de cache da leitura diária. */
export function isoDoDia(d: Date = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** "15/05/1990" digitado → "1990-05-15" para a API. Devolve null se inválido. */
export function brParaIso(valor: string): string | null {
  const m = valor.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const d = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  const valida =
    d.getUTCFullYear() === Number(ano) &&
    d.getUTCMonth() === Number(mes) - 1 &&
    d.getUTCDate() === Number(dia);
  if (!valida) return null;
  return `${ano}-${mes}-${dia}`;
}

/** "1990-05-15" → "15/05/1990" para exibir no Perfil. */
export function isoParaBr(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
