# 0003: Domínio separado do visual, passo fixo e determinismo

- **Status:** aceita
- **Data:** 2026-10-01

## Contexto

O jogo vai crescer até o 6x6, com IA e muitas regras de vôlei. As regras precisam ser testáveis sem navegador, reproduzíveis e independentes da taxa de quadros do aparelho. Um celular a 30 fps e um PC a 144 fps devem jogar exatamente o mesmo jogo.

## Decisão

- **O domínio não conhece o visual.** Camadas: `core`, `config`, `domain`, `simulation` (puras) e `input`, `render`, `ui`, `app` (apresentação e composição). A tabela de quem importa quem está no `CLAUDE.md`.
- **O lint garante a regra**, sem exceção. O Biome:
  - proíbe imports entre camadas fora da tabela e `../` em `src/` (o que passa de pasta usa alias);
  - proíbe Babylon e DOM nas camadas puras;
  - por plugins GritQL, proíbe `Math.random` nas camadas puras e import de valor de `@domain` na apresentação (só `import type`).
- **Passo fixo de 60 Hz.** Um relógio acumulador converte o tempo de cada quadro em passos inteiros, com limite de passos por quadro para não travar depois de uma pausa.
- O render **interpola** entre os dois últimos estados da simulação, com `alpha`.
- **Determinismo:** nada de relógio de parede nem aleatoriedade global nas camadas puras. O RNG tem semente e seu estado é um número dentro do estado do jogo.
- O estado do jogo é dado simples e serializável. O jogador humano e a IA mudam o mundo pelos **mesmos comandos**, e o mundo responde com eventos.

## Consequências

- Domínio e simulação são testados com Vitest em ambiente Node, sem DOM.
- Replays, snapshots e depuração ficam possíveis, porque o mesmo estado e os mesmos comandos dão o mesmo resultado.
- Há um custo de disciplina: até o atalho mais simples (ler o relógio, sortear com `Math.random`) precisa passar pelo caminho certo, e o lint recusa o resto.
- O visual pode ser trocado ou melhorado sem tocar nas regras.
