# Conta Comigo

App de matemática para crianças do 1º ao 5º ano. O jogo só avança com a conta certa e,
quando a criança erra, a **Capi** (uma capivara) explica passo a passo, com voz, do jeito
da escola: conta armada, "vai um", empréstimo e divisão pelo método da chave.

## O que tem

- **Página de apresentação** (`/`) com demonstração interativa.
- **App** (`/#/app`), instalável no celular (PWA):
  - Aventura no Rio das Contas: 10 fases; cada acerto é uma tábua da ponte.
  - Missão do dia: meta de 10, 20 ou 30 contas, priorizando o que a criança mais erra.
  - Treino livre por operação, com nível que se ajusta sozinho (sobe com 5 acertos seguidos).
  - "Me explica": explicação animada e narrada (bolinhas, grupos, conta armada, chave).
  - Corrida da Tabuada (60 s), álbum de figurinhas e estrelas.
  - Folhinha para imprimir com gabarito, inclusive focada "onde trava".
  - Painel dos pais (com senha): semana, acerto por operação, pontos fracos e ajustes.
- O progresso fica salvo no próprio aparelho (localStorage), sem servidor.

## Rodar

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # gera dist/ (deploy estático: Vercel, Netlify...)
```

Código principal: `src/lib/math.ts` (níveis e geração de contas), `src/lib/explain.ts`
(explicações passo a passo), `src/screens/` (telas).
