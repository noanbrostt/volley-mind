# 0004: IA por função, não por número de jogadores

- **Status:** aceita
- **Data:** 2026-10-01

## Contexto

O objetivo atual é o aquecimento de ataque e defesa 1x1. O de longo prazo é o 6x6. Se a IA fosse escrita para um modo específico ("IA do 1x1", "IA do 6x6"), cada modo novo exigiria reescrevê-la, e o que se aprende no aquecimento não chegaria ao jogo completo.

No vôlei, **função não é habilidade** (`docs/design/positions.md`). A posição define responsabilidades, e os atributos definem o quão bem o atleta faz cada coisa.

## Decisão

- A IA é organizada por **função**: o que um atleta precisa fazer num dado momento (por exemplo, defender, levantar, atacar). Cada função é uma máquina de estados em `src/domain/ai/`.
- O **modo** (por exemplo, o aquecimento em `src/domain/drills/`) decide qual função cabe a cada atleta em cada momento. A IA não sabe em que modo está nem quantos atletas existem.
- A qualidade do que a IA faz vem dos **atributos** do atleta, e nunca de regras especiais para a IA.
- A IA emite os **mesmos comandos** que o jogador humano. Ela não tem atalhos, e o que ela "sabe" sobre a bola passa pela leitura de jogo do atleta.

## Consequências

- O aquecimento 1x1 já exercita funções que o 6x6 vai reaproveitar.
- Novos modos se constroem combinando funções existentes, em vez de escrever uma IA nova.
- As regras de cada função vêm do Noan, nos documentos de `docs/design/`. A IA não inventa vôlei: comportamento sem regra documentada vira pergunta antes de virar código.
- A estrutura concreta das máquinas de estados será desenhada junto com o atleta, na próxima etapa.
