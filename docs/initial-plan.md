Leia o CLAUDE.md inteiro antes de qualquer coisa. Ele é a fonte de verdade do projeto. A pasta já contém o CLAUDE.md e os documentos de design em `docs/design/`; preserve-os em todas as fases.

Vamos construir **a fundação** do Volley Mind. Ainda não é hora de atleta, controle ou IA. O objetivo desta rodada é deixar a base impecável e terminar com uma bola quicando na areia, rodando no PC e no celular.

Como trabalhar:

- Siga as fases na ordem. **Ao fim de cada fase, pare, resuma o que fez e espere meu ok.**
- Use o modo de planejamento antes das fases 1 e 4.
- Consulte a documentação atual via Context7 antes de configurar qualquer ferramenta. Se algo aqui conflitar com a documentação, me avise e proponha a alternativa.
- Não use o Playwright.
- Estou no Windows. O repositório deve usar fim de linha LF.

---

## Fase 0 — Verificação

1. Confirme as versões de Node e npm instaladas.
2. Levante a versão estável mais recente de: `vite`, `typescript`, `@babylonjs/core`, `@babylonjs/loaders`, `vitest`, `@biomejs/biome` e do plugin de PWA que você recomendar para o Vite.
3. Verifique se são compatíveis entre si (por exemplo, se Vitest e Biome suportam a versão atual do TypeScript e do Vite).
4. Me mostre uma tabela com versão e observações, e espere minha aprovação.

## Fase 1 — Esqueleto do projeto

1. Crie o projeto Vite com o template TypeScript puro (sem framework) na pasta atual, com o nome de pacote `volley-mind`, e remova todos os arquivos de demonstração.
2. `tsconfig` no modo mais estrito razoável. Proponha as opções extras e explique cada uma em uma linha.
3. Aliases de import por camada (`@core`, `@config`, `@domain`, `@simulation`, `@input`, `@render`, `@ui`, `@app`), funcionando no TypeScript, no Vite e no Vitest.
4. Biome para lint e formatação, **com a regra de imports proibidos por camada** descrita no CLAUDE.md. Prove que funciona: mostre o erro ao importar Babylon dentro de `domain/` e depois desfaça.
5. Vitest configurado.
6. Scripts do CLAUDE.md (`dev`, `dev:host`, `build`, `preview`, `test`, `check`, `format`).
7. `.gitignore`, `.gitattributes` (LF), `.editorconfig` e a versão de Node fixada no `package.json` (`engines`).
8. O repositório Git já existe (foi clonado do GitHub). Não rode `git init`. Faça o primeiro commit e me pergunte antes de dar push.

## Fase 2 — Núcleo (`core/`)

Com testes:

- Vetor 3D simples e imutável.
- RNG com semente.
- Relógio de passo fixo (acumulador de tempo, 60 Hz, com limite de passos por quadro para não travar após uma pausa).

## Fase 3 — Primeira fatia do domínio (`domain/ball/`)

Com testes:

- Estado da bola e avanço de um passo: gravidade e resistência do ar. Efeito (spin) fica para depois, mas a estrutura não pode impedir que ele entre.
- Quique no chão de areia com perda de energia. Valores em `config/`.
- **Previsão do ponto de queda**: dado o estado atual, onde e quando a bola toca o chão.
- Teste obrigatório: a previsão bate com o resultado de simular passo a passo, dentro de uma tolerância pequena.

## Fase 4 — Simulação e render mínimos

1. `simulation/`: mundo com a bola, avançando pelo relógio de passo fixo.
2. `render/`: motor e cena do Babylon, plano de areia, esfera para a bola, câmera, luz simples. O render **interpola** entre os dois últimos estados da simulação.
3. `app/`: inicialização que liga tudo.
4. Tocar na tela (ou clicar) relança a bola para cima.
5. Contador de FPS visível só em desenvolvimento. Inspetor do Babylon por import dinâmico, só em desenvolvimento.
6. Redimensionamento correto e resolução limitada em telas de alta densidade.

## Fase 5 — Celular e PWA

1. Manifesto do PWA: nome Volley Mind, tela cheia, orientação horizontal e ícones provisórios.
2. Meta de viewport correta para jogo (sem zoom por gesto, sem rolagem da página).
3. Me passe o passo a passo para abrir no meu celular pelo `npm run dev:host`.

## Fase 6 — Documentação e automação

1. ADRs curtos em `docs/decisions/`:
   - 0001: navegador primeiro, com Babylon.js
   - 0002: sem motor de física; bola simulada no domínio
   - 0003: domínio separado do visual, passo fixo e determinismo
   - 0004: IA por função, não por número de jogadores
2. Leia todos os documentos de `docs/design/` e me diga se falta alguma regra para implementar o aquecimento. Não invente as respostas.
3. `README.md` curto: o que é o projeto e como rodar.
4. Proponha um hook do Claude Code em `.claude/settings.json` que formate com o Biome cada arquivo editado. Mostre antes de criar.

## Pronto quando

- `npm run check` passa.
- A bola quica na areia no PC e no celular, com FPS visível em desenvolvimento.
- Nenhum arquivo de `domain/` ou `simulation/` importa Babylon ou DOM, e o lint garante isso.
- ADRs criados.

Depois disso, vamos planejar juntos a próxima etapa: o atleta e o controle por toque.
