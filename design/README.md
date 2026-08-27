# design/

**Pasta reservada.** Aguardando `Triade.dc.html` (o protótipo visual) e a pasta
do design system Modernist (`_ds/modernist-.../`, com `styles.css` e o guia).

## Como tratar estes arquivos

Eles são **referência visual em HTML**, não código de produção. Nada aqui é para
ser copiado e colado no app: as telas são recriadas em React Native, com os
componentes do próprio ambiente.

Fidelidade **alta (hifi)**: cores, tipografia, espaçamento, hierarquia e microcopy
são finais.

## Duas armadilhas conhecidas do protótipo

1. Os signos exibidos são **fixos** e não mudam com a data digitada. É o bug
   conceitual nº 1 do backlog (P0 item 1) — não replicar.
2. As posições de Sol/Lua/Ascendente na roda em SVG são **coordenadas fixas**.
   No app elas têm que sair de `grau_absoluto` de verdade.

## Fonte da verdade dos tokens

Enquanto o `styles.css` não chega, os tokens estão transcritos da tabela do
`CLAUDE.md` em `mobile/src/theme/tokens.ts`. Ao receber o DS, conferir valor por
valor — em especial `--color-neutral-200`, que é citado nas interações mas não
consta na tabela e hoje está com um valor provisório.
