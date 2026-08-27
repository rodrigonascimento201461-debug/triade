# shared/

Tipos TypeScript do contrato de dados, compartilhados entre `mobile/` e `backend/`.

## Regra única e não negociável

**Só pode existir `type` e `interface` aqui. Zero runtime.**

Sem `const`, sem `function`, sem `enum`, sem `class`, sem `export default` de valor.
(Use `type X = 'a' | 'b'` no lugar de `enum`.)

Motivo: `mobile/` e `backend/` são projetos npm independentes (sem workspaces —
ver `STACK.md`). Eles importam daqui por path alias `@shared/*` no `tsconfig.json`.
Como todo import é `import type { ... } from '@shared/...'`, o Babel (Metro) e o
SWC (Next) apagam o import em tempo de compilação e nenhum bundler precisa
resolver este caminho em runtime. Se alguém colocar um valor executável aqui, o
build do app quebra em runtime, não em tempo de tipagem — difícil de achar.

Sempre importe assim:

```ts
import type { MapaOcidental } from '@shared/types/astro';
```
