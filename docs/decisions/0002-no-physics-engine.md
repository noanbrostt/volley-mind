# 0002: Sem motor de física; bola simulada no domínio

- **Status:** aceita
- **Data:** 2026-10-01

## Contexto

No vôlei do jogo, **toques são regras, não colisões**: um contato define direção, velocidade e qualidade a partir dos atributos do atleta, do tempo do toque e do posicionamento. A IA precisa prever onde a bola vai cair, e a simulação precisa ser determinística. Um motor de física genérico (Havok, Ammo, Cannon) resolveria colisões que não queremos, com resultados difíceis de reproduzir e prever.

## Decisão

- **Nenhum motor de física.** A bola é simulada em `src/domain/ball/` com fórmulas próprias, em TypeScript puro.
- A bola em voo sofre gravidade e resistência do ar quadrática. A aceleração é uma **soma de contribuições**: o efeito (Magnus) entra como mais uma parcela, sem mudar o resto.
- A integração é de segunda ordem (Heun). É exata para a parábola sem resistência do ar e precisa a 60 Hz com ela.
- O contato com o piso da quadra é resolvido dentro do passo, no instante exato do impacto, com restituição, retenção horizontal, assentamento e rolamento. Os valores ficam em `src/config/` (`court-floor.ts`); outro piso (a areia, no futuro) é só outro conjunto de valores.
- A **previsão do ponto de queda** repete os mesmos passos fixos da simulação. Por isso ela coincide com o que vai acontecer.

## Consequências

- Nós somos donos das fórmulas e dos valores de ajuste. Cada mudança física exige teste, e calibrar a sensação de jogo é trabalho nosso.
- A previsão é exata. O erro de leitura da IA, quando existir, entra por cima dela (atributo de leitura), e não por imprecisão da física.
- Na medição da fase 3, a previsão a 60 Hz ficou a no máximo 0,1 ms e 1,2 mm de uma simulação 100× mais fina.
- Colisões que um dia importarem (bola na rede, por exemplo) também serão regras escritas no domínio.
