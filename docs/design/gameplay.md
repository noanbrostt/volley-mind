# Como o vôlei funciona no jogo

Regras descritas pelo Noan (atleta). Fonte de verdade para toques, técnicas e jogadas. Não inventar regras além destas; em caso de dúvida, perguntar.

## Regras básicas

- Qualquer atleta pode tocar na bola a qualquer momento.
- O time tem no máximo **3 toques** para devolver a bola ao outro lado.
- Um atleta não pode tocar **duas vezes seguidas**.

## O toque

### Técnica e ação são separadas

A **técnica** é como o atleta toca na bola (manchete, toque...). A **ação** é para que serve o toque (defesa, levantamento...). Qualquer técnica pode ser usada em qualquer ação que faça sentido: um levantamento de manchete, por exemplo, é possível. Nunca amarrar uma ação a uma única técnica.

### O que faz um toque ser bom

- Chegar a tempo.
- Estar no lugar certo.
- Direcionar o corpo para onde a bola deve ir.
- Tocar com os dois braços ou as duas mãos ao mesmo tempo (exceto no ataque).
- Dosar a força: amortecer uma bola muito forte ou dar força a uma bola fraca.

A qualidade final combina esses fatores com os atributos do atleta para a ação e para a técnica usada (ver `athletes.md`).

### Qualidade encadeada

A qualidade de cada toque define a dificuldade do próximo. Um passe ruim dificulta o levantamento; um levantamento impreciso prejudica o ataque. Cada atacante tolera imprecisão de um jeito diferente (ver o ataque do central em `positions.md`).

## Técnicas

- **Manchete.**
- **Toque para frente.**
- **Toque de costas:** usado pelo levantador para levantar para o oposto, já que o levantador sempre levanta de frente para a entrada de rede.
- **Cortada:** só uma mão toca a bola, mas o movimento usa o corpo inteiro (os dois braços, as pernas e o tronco).
- **Largada.**
- **Caixinha:** ataque fraco, com efeito, que serve para enganar. O defensor espera um ataque forte no fundo e a bola cai curta, perto da rede.
- **Peixinho:** mergulho para alcançar uma bola distante. Pode ser feito com uma ou duas mãos; no jogo, a escolha é opcional para o jogador.
- **Saque:** flutuante ou viagem.

## Surpresa e previsibilidade

O vôlei real recompensa a variação. Cada time cria uma expectativa sobre o que o outro vai fazer: um ataque esperado rende menos, um ataque inesperado rende mais.

- **Caixinha:** só funciona porque o defensor esperava um ataque forte. Se já estivesse esperando a caixinha, pegaria.
- **Ataque do central de surpresa:** extremamente eficiente. Se o central ataca várias vezes seguidas, o outro time passa a defender melhor esse ataque.
- **Efeito de atração:** um central que chama muita atenção faz o bloqueio adversário se preocupar com ele. Os atacantes de extremidade passam a enfrentar **bloqueio simples** em vez de duplo com mais frequência, e a chance de ponto deles aumenta muito.
- **Largada de segunda:** o levantador finge que vai levantar e passa a bola para o outro lado no segundo toque. Usa o atributo de **toque**, não o de ataque. Só funciona de surpresa.
- **Ataque do levantador:** possível, mas fica óbvio para o outro time, e o levantador não treina ataque. Também só funciona de surpresa.

Para a IA:

- O time adversário se adapta ao que vem acontecendo, usando o atributo de leitura. Repetição reduz a eficiência; variação aumenta.
- A defesa reage ao que vê da preparação do ataque, não ao destino final da bola. Por isso pode hesitar quando é enganada.
