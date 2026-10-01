# 0005: Toques resolvidos por regra (alvo, trajetória inversa, qualidade e erro com semente)

- **Status:** aceita
- **Data:** 2026-10-01

## Contexto

No vôlei do jogo, um toque não é uma colisão entre mão e bola (ADR 0002). Ele precisa refletir o que o Noan descreve:

- a técnica é escolhida por regra (toque com prioridade, manchete quando a bola vem ruim);
- cada ação tem um destino ideal (por exemplo, o levantamento acima do atacante);
- a qualidade depende do tempo do toque, do posicionamento, da mira e dos atributos;
- a qualidade de um toque define a dificuldade do próximo.

O jogador e a IA precisam passar pelo mesmo caminho.

## Decisão

Um toque é resolvido em `src/domain/contact/`, em etapas puras:

1. **Plano** (`plan-touch`): prevê onde a bola cruza a altura de contato de cada técnica e escolhe a técnica pela regra do modo. Marca a bola como ruim quando ela chega baixa, longe ou fora do tempo, e calcula onde o atleta precisa pisar.
2. **Qualidade** (`touch-quality`): o produto de tempo, posição e mira, ponderado pela habilidade (atributo da ação junto com o da técnica, conforme `athletes.md`). Bola ruim reduz a qualidade.
3. **Alvo** (`touch-target`): o destino ideal fica no receptor **onde ele vai estar parado**, para ele não precisar andar (regra do Noan), mais o tipo de trajetória (arco de certa altura ou bola forte a certa velocidade).
4. **Resolução** (`resolve-touch`):
   - a mira desloca o alvo;
   - o erro, sorteado com o RNG com semente em escala `(1 − qualidade)`, espalha o alvo e a trajetória;
   - a **mira inversa** (`solve-launch`) encontra a velocidade de saída que leva a bola até lá, com resistência do ar, nos mesmos passos fixos da simulação.

O RNG sempre sorteia a mesma quantidade de números por toque, para que a sequência não dependa do resultado.

## Consequências

- Um toque perfeito leva a bola a até 1 cm do alvo ideal (testado). A imprecisão vem só da qualidade, nunca de erro numérico.
- A IA e o jogador produzem a mesma entrada (`TouchAim` e o momento do toque). A diferença está em quem decide, não nas regras.
- Todos os números (janela de tempo, tolerâncias, alturas, velocidade do ataque controlado, escalas de erro) ficam em `src/config/touch.ts`, para calibrar jogando.
- A mira inversa custa algumas simulações curtas por toque. Isso é barato perto de um quadro e acontece só no instante do toque.
