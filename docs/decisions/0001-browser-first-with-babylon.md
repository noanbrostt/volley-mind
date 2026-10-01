# 0001: Navegador primeiro, com Babylon.js

- **Status:** aceita
- **Data:** 2026-10-01

## Contexto

O Volley Mind é pensado primeiro para o celular, na horizontal e com controle por toque. O jogo precisa abrir sem instalação de loja, ser testado no próprio aparelho durante o desenvolvimento e evoluir de um aquecimento 1x1 até o 6x6.

## Decisão

- O jogo roda no **navegador**, como PWA instalável (tela cheia, horizontal, offline).
- O 3D usa **Babylon.js** (`@babylonjs/core`), em TypeScript estrito, com Vite para desenvolvimento e build.
- Os imports do Babylon são granulares (caminhos específicos), nunca o pacote inteiro.
- O inspetor do Babylon só existe em desenvolvimento, por import dinâmico.

## Consequências

- Um link basta para jogar, e `npm run dev:host` abre o jogo no celular pela rede local.
- A instalação como PWA e a tela cheia exigem HTTPS. Pela rede local o jogo abre numa aba comum.
- O orçamento de desempenho é o de um navegador móvel: alvo de 60 fps em Android intermediário. A resolução interna fica limitada em telas de alta densidade, e sombras, pós-processamento e partículas só entram se couberem.
- O Babylon pesa no bundle. Na primeira medição (fase 4) foram 255 kB gzip, quase tudo do motor. Reduzir isso (imports "pure" do Babylon 9) é uma otimização a fazer com medição.
