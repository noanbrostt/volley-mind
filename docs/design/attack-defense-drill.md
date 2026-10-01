# Aquecimento de ataque e defesa (1x1)

Regras descritas pelo Noan (atleta). Fonte de verdade para o modo `attack-defense`. Não inventar regras além destas; em caso de dúvida, perguntar. Regras gerais de toque e técnica em `gameplay.md`.

## O que é

Exercício de aquecimento pré-jogo, feito entre dois colegas do mesmo time, para aquecer e acertar os fundamentos. Não há rede, adversário nem pontuação.

Ninguém tenta surpreender o outro: os dois sabem o que vai acontecer. A expectativa do adversário (ver `gameplay.md`) **não vale** neste modo.

## Onde

Em **quadra**. A quadra é sempre a preferência; a areia só entra no jogo depois, para deixá-lo mais completo.

## Jogador

O jogador humano controla um atleta (A) e a IA controla o outro (B).

Controle escolhido pelo Noan (opção "tempo + direção"), com um polegar:

- **Direção e força:** o jogador encosta o dedo e arrasta para mirar. A direção é para onde o corpo aponta e o comprimento do arrasto doseia a força.
- **Tempo:** o toque na bola acontece quando o jogador **solta** o dedo. A precisão desse momento pesa na qualidade do toque.
- O atleta **se desloca sozinho** (com seus atributos de velocidade e leitura) e escolhe a **técnica** pela regra deste modo (toque com prioridade; manchete quando a bola vem ruim).
- Controlar os passos e o peixinho com o outro polegar pode entrar depois, no 6x6.
- Na prática (proposta de implementação, para o Noan avaliar jogando):
  - arrastar **para cima** aponta para o colega; inclinar o arrasto mira para os lados;
  - o comprimento do arrasto é a força, e a força ideal fica no anel tracejado do guia;
  - só tocar, sem arrastar, vale como mira ideal;
  - um **anel** no ponto de contato encolhe até o tamanho da bola no instante ideal de soltar (ajuda visual, não regra);
  - depois de cada toque aparece um retorno curto: técnica e tempo ("Toque · Perfeito!", "Manchete · Atrasado") ou o erro ("Cedo demais", "Não alcançou").
- **Câmera:** atrás do atleta do jogador, por cima do ombro, olhando para o colega.

## Posicionamento

- Dois atletas, A e B, frente a frente, a cerca de **6 m** de distância.
- Cada um tem uma **posição base**. Se os fundamentos saem bem, o atleta praticamente não sai do lugar: o movimento é do corpo, alternando entre os fundamentos.
- Todas as ações buscam colocar a bola onde o colega **não precise andar**. Se alguém está andando para continuar o ataque ou a defesa, tudo bem, mas é porque alguém errou um pouco.
- Se uma bola chega um pouco fora, o atleta dá **um ou dois passos** para alcançá-la e depois **volta para a posição base**.
- O atleta só se movimenta quando a bola **começa a vir na direção dele**. A exceção é a volta: quem saiu da base para buscar uma bola pega a bola e **volta para onde estava**, mesmo sem a bola vir na direção dele. Essa volta também é **sem pressa**.
- O movimento é suave: o atleta acelera e freia, não sai nem para de uma vez.
- Bola alta não exige pressa: o atleta pode "enrolar" para chegar embaixo dela. Ele pode chegar adiantado, mas nem sempre com a mesma antecedência, o que dá naturalidade.
- Se a bola chega mais longe que isso, o atleta pode fazer um **peixinho**. Depois do peixinho, o **tempo de recuperação** para voltar à posição base é maior.

## Sequência

1. A ataca em B.
2. B defende a bola de volta para A.
3. A levanta para B.
4. B ataca em A.
5. A defende a bola de volta para B.
6. B levanta para A.
7. Volta ao passo 1.

Cada atleta repete o ciclo **ataque → levantamento → defesa**, e os toques alternam entre os dois. Os levantamentos são sempre para frente.

## Técnicas

- **Defesa:** toque ou manchete. O toque tem prioridade; a manchete é mais situacional, para quando a bola vem ruim.
- **Levantamento:** a mesma regra. Toque tem prioridade; manchete quando a bola vem ruim.
- **Ataque:** com bola boa, cortada. Com bola ruim, caixinha, mas uma caixinha que vai **até o colega**. Aqui nunca se mira no chão.

Uma bola é **ruim** quando:

- chega **baixa** para a técnica;
- chega **longe do corpo**;
- chega **fora do tempo** (o atleta não conseguiu se posicionar a tempo).

Bola forte, por si só, **não** é bola ruim.

Pontos de contato de cada técnica neste modo:

- **Toque:** mãos em concha; a bola é tocada levemente acima da cabeça (não colada nela).
- **Manchete:** antebraços unidos; a bola é tocada entre a cintura e o quadril.
- **Cortada:** braço esticado para cima, levemente à frente e do lado do braço dominante (ver "O levantamento").
- **Caixinha:** bem parecida com a cortada em posição de contato.

## O ataque

- **Controlado:** o atleta diminui a força para ganhar precisão. A intenção é acertar o fundamento, não se mostrar.
- **Sem pulo:** o atacante ajeita o corpo (um pé à frente do outro, gira o tronco etc.) e bate na bola com os pés no chão.
- **Mirado no corpo do defensor**, normalmente na altura da manchete dele. Mas, se o ataque vier em qualquer altura, o defensor deve ser capaz de defender.

## O levantamento

- O atacante não anda nem faz passada: a bola tem que ir até ele.
- Ponto ideal: acima do atacante, para que ele bata na bola com o **braço esticado para cima**, **levemente** (bem levemente) à frente dele e mais para o lado do **braço dominante** (normalmente o direito).

## A defesa

- O defensor sempre tenta fazer uma **defesa alta**, para dar tempo ao levantador de pensar e de se deslocar, se precisar.
- Como nas outras ações, a defesa busca o colega no lugar onde ele não precise andar.

## Quando o loop quebra

- O loop quebra quando a bola não pode mais ser continuada (por exemplo, cai no chão).
- Quem recomeça é o atleta **mais perto da bola**: ele pega a bola, joga para cima para si mesmo e ataca no colega.

## Progresso e motivação

- O intuito principal do modo é **ensinar a mecânica do jogo** e evoluir levemente os atributos.
- O treino evolui atributos numa velocidade melhor que o resto do jogo (ver `athletes.md`).
- Ideia em avaliação: contar um **combo** (sequência de toques sem quebrar o loop) e gravar o recorde.

## Em aberto

- Combo e recorde: confirmar se entram e como contam.
- Caixinha com uma bola que nem chega à altura da cortada: por enquanto o código a toca na altura do toque. Confirmar com o Noan.
