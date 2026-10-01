# Volley Mind

Jogo 3D de vôlei que roda no navegador, pensado primeiro para o celular (tela na horizontal, controle por toque).

O objetivo atual é o **aquecimento de ataque e defesa 1x1**: dois atletas, uma bola, sem rede e sem adversário. No longo prazo, o 6x6 com posições, rodízio e modo carreira.

Por enquanto existe a fundação: uma bola com física própria quicando na quadra. Tocar na tela relança a bola.

**Jogar:** https://noanbrostt.github.io/volley-mind/ (publicado automaticamente a cada push na `main`, depois que tipos, lint e testes passam).

## Como rodar

Requer Node 24.14 ou mais recente.

```bash
npm install
npm run dev
```

Para abrir no celular, conecte celular e PC na mesma rede Wi-Fi, rode `npm run dev:host` e abra no celular o endereço da linha `Network`.

Em desenvolvimento, o FPS aparece no canto da tela e a tecla **I** abre o inspetor do Babylon.

| Comando | Para quê |
|---|---|
| `npm run dev` | Servidor local |
| `npm run dev:host` | Servidor acessível pelo celular na mesma rede |
| `npm run build` | Build de produção (PWA) |
| `npm run preview` | Testar o build |
| `npm run test` | Testes em modo watch |
| `npm run check` | Tipos, lint e testes (obrigatório antes de concluir) |
| `npm run format` | Formatação e organização de imports |

### Tela cinza em desenvolvimento

Se a quadra some (tela cinza, só a interface aparece) e o console mostra `504 (Outdated Optimize Dep)`, o Vite reempacotou as dependências com o servidor aberto. Isso acontece quando o código passa a usar uma peça nova do Babylon. Pare o `npm run dev`, rode de novo e recarregue a página com **Ctrl+Shift+R**.

## Stack

TypeScript estrito, Vite, Babylon.js, Vitest, Biome e PWA. Sem motor de física: a bola é simulada no domínio.

## Documentação

- [`CLAUDE.md`](CLAUDE.md): guia do projeto, com arquitetura, regras de código e fluxo de trabalho.
- [`docs/design/`](docs/design/): regras de vôlei do jogo e glossário.
- [`docs/decisions/`](docs/decisions/): decisões de arquitetura (ADRs).
