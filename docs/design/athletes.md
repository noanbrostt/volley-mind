# Atletas

Regras descritas pelo Noan (atleta). Fonte de verdade para atributos, altura e evolução. Não inventar regras além destas; em caso de dúvida, perguntar. Nomes de código em `glossary.md`.

## Atributos

- **Ações:** ataque, ataque do fundo, passe, defesa, levantamento, bloqueio, saque.
- **Técnicas:** toque, manchete.
- **Físicos e mentais:** impulsão, velocidade, leitura de jogo, resistência.

Velocidade e leitura servem tanto para bloquear quanto para defender.

### Técnica pesa junto com a ação

A qualidade de um toque combina o atributo da **ação** com o atributo da **técnica** usada. Um atleta pode ter ótima defesa e ótimo levantamento de toque e, ao mesmo tempo, uma manchete fraca, qualquer que seja o fundamento.

As técnicas que não têm atributo próprio usam:

| Técnica | Atributo |
|---|---|
| Largada (inclusive a de segunda) | Toque |
| Peixinho | Manchete |
| Cortada | Ataque, apenas |
| Caixinha | Ataque, apenas |

### Atributos vinculados

Treinar um atributo também melhora os vinculados, numa medida menor:

- Passe e defesa são vinculados entre si.
- Passe e defesa são levemente vinculados ao levantamento.
- Ataque é vinculado ao saque.

## Altura

- Escolhida ao criar o atleta e fixa depois.
- Atletas altos têm mais alcance (ataque e bloqueio) e são mais desengonçados na defesa.
- A altura muda a **curva de aprendizado**: um atleta baixo aprende ataque e bloqueio mais devagar, mas defende e passa melhor. Um atleta alto, o contrário.

## Evolução

- É possível ficar bom em tudo. A posição atual **não** limita o aprendizado.
- Tudo o que o atleta faz evolui atributos, mas o **treino** evolui numa velocidade melhor; o resto evolui mais devagar.
- Treinar um atributo que não é o da posição é permitido, só é menos útil em jogo.
- Atributos **não decaem** com o tempo.
- Quanto melhor o atleta já é num atributo, mais devagar ele evolui.
- Mudar de posição mantém tudo o que foi evoluído.

## Em aberto

- **Estado durante a partida** (cansaço, confiança, dia bom ou ruim): desejado, mas o modelo não está definido. Proposta em avaliação: começar só com confiança (sequências de acertos e erros dão um pequeno bônus ou queda, visível na tela) e adicionar cansaço depois, ligado à resistência.
