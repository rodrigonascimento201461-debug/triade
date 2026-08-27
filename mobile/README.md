# mobile/ — app TRÍADE (Expo)

```powershell
copy .env.example .env
npm install
npx expo install --fix   # alinha as versões nativas ao SDK instalado
npx expo start
```

## Como este projeto está organizado

```
src/
  app/            rotas (expo-router). SÓ arquivos de rota moram aqui.
    (onboarding)/ passo-1, passo-2, passo-3, calculando  — sem tab bar
    (tabs)/       hoje, signos, mapa, conversa, perfil   — tab bar de 5 itens
    sinastria.tsx fora da tab bar, de propósito
  components/     primitivos do DS (Texto, Regua, Botao, Campo, Tela...)
  theme/          tokens do design system Modernist
  state/          PerfilContext (fonte da verdade) e RascunhoOnboarding
  api/            client.ts — única porta de saída de rede
  data/           tabelas de correspondência locais (signo -> elemento etc.)
  utils/          formatação de data
```

`expo-router` usa `src/app/` como diretório de rotas (suportado desde o SDK 51).
Não crie arquivos que não sejam rotas dentro de `src/app/`: qualquer `.tsx` ali
vira uma rota navegável.

## Regras que valem para toda tela nova

1. **Nenhum nome de signo, animal ou divindade como literal em código de UI.**
   Tudo vem de `usePerfil().leituras`, que vem da API. Sem leitura, a tela diz
   que não há — não mostra exemplo. (P0 item 1 do `CLAUDE.md`.)
2. **Nada de valor solto de estilo.** Cor, espaçamento e tamanho de fonte vêm de
   `@/theme`. Se o valor não existe lá, ele não existe.
3. **Zero border-radius.** Use o token `raio`.
4. **Divisórias de 2px**, nunca `StyleSheet.hairlineWidth`.
5. **Texto sempre pelo componente `<Texto>`**; um `<Text>` cru cai na fonte do
   sistema e quebra a Archivo.
6. **Rótulo de botão à esquerda**, inclusive em botão largo.
7. **Alvo de toque ≥ 44px.**
8. Faixa de aviso de hora desconhecida e tags **APROXIMADO** são requisito,
   não enfeite.

## Pendências no scaffold

- Estado não persiste: fechou o app, volta para o onboarding
  (falta AsyncStorage + Supabase).
- A roda astrológica em SVG é um placeholder com o espaço reservado.
- Textos interpretativos não existem: o backend responde 501.
- As versões em `package.json` apontam para o Expo SDK 53 e precisam ser
  confirmadas com `npx expo install --fix` antes de virar referência.
