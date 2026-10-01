# Posições

Regras descritas pelo Noan (atleta). Fonte de verdade para funções, perfis e jogadas por posição. Não inventar regras além destas; em caso de dúvida, perguntar. Nomes de código em `glossary.md`.

## Função e habilidade

A posição define **responsabilidades**: quem recebe o saque, quem ataca de onde, quem tem prioridade. Os atributos definem **o quão bem** o atleta faz cada coisa. Um atleta sem a responsabilidade ainda pode tocar na bola, só que com a qualidade dos seus atributos.

**Recepção do saque:** feita pelo líbero e pelos dois ponteiros. As outras posições ficam "escondidas" do saque por estratégia.

## Perfis

Descrição qualitativa para gerar os atletas controlados pela IA. Os números serão definidos depois.

**Levantador**
- Melhor levantamento do time. Sempre levanta de frente para a entrada de rede.
- Melhor saque flutuante do time, mas não muito à frente dos outros.
- Maior resistência do time.
- Bloqueio depende do atleta, principalmente da altura. Costuma ser fraco porque levantadores costumam ser baixos, mas um levantador alto bloqueia bem.
- Ataque quase zero. Defesa ruim.

**Ponteiro**
- O mais completo: ataca, defende, passa, bloqueia e saca bem.
- Depois do central e do líbero, é quem mais se destaca em leitura e velocidade.
- Levantamento abaixo do líbero, mas não tão baixo.

**Oposto**
- Melhor ataque de extremidade e melhor ataque do fundo.
- Saque muito forte, flutuante ou viagem.
- Bom bloqueio.
- Defesa inferior.

**Central**
- Melhor bloqueio do time, de longe. Destaque em leitura e velocidade para bloquear.
- Costuma ser o mais alto. Bom ataque.
- Menor resistência do time, mas descansa quando sai de quadra.
- Defesa baixa. Pior levantamento do time.
- Saque varia de atleta para atleta.

**Líbero**
- Melhor passe e melhor defesa do time. Destaque em leitura e velocidade para defender.
- Segundo melhor levantamento do time, atrás só do levantador.
- Zero em bloqueio, ataque e saque: não faz essas ações.

## Ataque do central

- É o ataque mais rápido. O central é o único atacante que pula **sem saber** se a bola vai para ele.
- O levantador tem a obrigação de colocar a bola no lugar exato. Por isso o ataque do central é **muito sensível à qualidade do levantamento**: com levantamento ruim, cai muito. Ponteiro e oposto, ao contrário, conseguem corrigir leves imprecisões.
- Pela velocidade, costuma enfrentar só bloqueio simples.
- Com bom levantamento, é quem tem a maior porcentagem de conversão em ponto do time.

Bolas combinadas:

| Bola | Onde |
|---|---|
| Cabeça | Perto do levantador, na frente dele |
| Costas | Perto do levantador, atrás dele |
| Metro | Na frente do levantador, mais afastada |
| China | Rápida, onde o oposto atacaria se estivesse na rede. Mais rara: **só pode ser feita quando o oposto está no fundo** |

## Ataque do fundo

- **Oposto:** ataca do fundo pela posição 1. É o melhor nisso, porque é o único atacante do seu lado da rede.
- **Ponteiro:** ataca do fundo pela posição 6. Como sempre há um ponteiro na rede, o da rede costuma ter prioridade no levantamento.

## Líbero

- Assume naturalmente uma área de passe maior.
- É o único que entra na frente dos companheiros para passar ou defender.
- Regra de ouro: só entra na frente de alguém quando tem certeza de que vai acertar. Entrar na frente e errar é o pior erro possível.
- Para a IA: os companheiros cedem a bola ao líbero quando ele assume, e o líbero da IA só assume com alta confiança.

## Pedir a bola

- O atacante grita pedindo a bola. O levantador **não é obrigado** a obedecer, principalmente se o levantamento estiver difícil.
- O levantador tende a procurar mais o atacante que vem acertando uma boa porcentagem de ataques.
- No jogo, pedir a bola aumenta a preferência do levantador, mas não garante o levantamento. Depois do ataque, a ação entra em recarga:
  - Ponto: sem recarga.
  - A jogada continua: recarga curta.
  - Erro ou bloqueado: recarga longa.
