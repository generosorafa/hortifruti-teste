# Esteira de qualidade, segurança e arquitetura

Este documento define o mínimo obrigatório para qualquer código entrar na branch `main`. A regra central é simples: toda mudança passa por Pull Request e o check **Quality Gate** precisa estar aprovado.

## Checks obrigatórios

A esteira executa em todo Pull Request para `main`:

1. instalação reproduzível com `npm ci` e Node.js 24;
2. lint com Biome e verificação de tipos do TypeScript;
3. contrato de camadas e ausência de ciclos com arch-contract;
4. dependências e arquivos sem uso com Knip;
5. mensagens de commit no padrão Conventional Commits com Commitlint;
6. testes unitários e de integração com Vitest, com limite mínimo de cobertura;
7. testes end-to-end no Chromium com Playwright em perfis de computador e celular;
8. testes das regras do Firestore no emulador;
9. build de produção e orçamento de tamanho do bundle;
10. auditoria de dependências de produção, revisão de novas dependências e CodeQL.

O Codecov recebe o relatório quando estiver disponível, mas uma indisponibilidade do serviço externo não derruba a entrega. Os limites locais de cobertura continuam obrigatórios e são a fonte de verdade do bloqueio.

## Comandos locais

- `npm run quality`: lint, tipos, arquitetura, dependências, cobertura, build, orçamento e auditoria de produção.
- `npm run test:rules`: regras do Firestore no emulador.
- `npx playwright install chromium`: preparação única do navegador local.
- `npm run test:e2e`: fluxos críticos em computador e celular.

Antes de marcar um Pull Request como pronto, execute `npm run quality` e os testes adicionais relacionados ao risco da mudança. A esteira remota sempre repete os checks críticos em ambiente limpo.

## Orçamento de performance

O script `scripts/check-bundle-budget.mjs` bloqueia crescimento acima destes limites iniciais:

- maior arquivo JavaScript: 720 kB;
- JavaScript total: 1,05 MB bruto e 285 kB compactado com gzip;
- CSS total: 20 kB compactado com gzip.

Os limites partem da versão validada do piloto e devem diminuir gradualmente. Aumentá-los exige justificativa explícita na Issue e no Pull Request.

## Contrato arquitetural

O projeto permanece uma aplicação web estática hospedada no GitHub Pages. Não existe backend próprio: autenticação e persistência ficam no Firebase. As camadas atuais são:

- `domain`: modelos e regras de negócio, sem React ou Firebase;
- `infrastructure`: integração com Firebase, dependente apenas do domínio;
- `presentation`: interface React, que pode usar domínio e infraestrutura.

Novas telas não devem ampliar indefinidamente `App.tsx`. Componentes e lógica devem ser extraídos por função quando houver uma fronteira real de responsabilidade. Reutilize componentes existentes antes de criar outro; aplique DRY quando houver repetição concreta, sem antecipar abstrações para uma única ocorrência.

### Exceções temporárias do legado

O Biome aplica o preset recomendado a todo o projeto. Somente `src/App.tsx` e `src/styles.css` possuem exceções específicas para problemas históricos de acessibilidade, dependências de hooks, callbacks e especificidade CSS. Elas evitam misturar uma refatoração transversal e arriscada com a implantação da esteira; não autorizam ampliar os problemas. A retirada gradual está registrada na [Issue #27](https://github.com/generosorafa/hortifruti-teste/issues/27). Arquivos novos recebem o preset completo sem essas exceções.

## Decisões proporcionais ao piloto

| Recurso | Decisão atual | Motivo |
| --- | --- | --- |
| Biome, Commitlint, Knip e arch-contract | Adotados | Cobrem estilo, commits, código morto e fronteiras com baixo custo operacional. |
| Vitest, Playwright e testes do Firestore | Adotados | Cobrem regras de negócio, integração, fluxos críticos e autorização. |
| Codecov | Preparado, não bloqueante | A cobertura local já bloqueia; o serviço externo acrescenta histórico visual. |
| Sentry | Próxima opção de observabilidade | Avaliar somente no piloto com dados reais, depois de aprovação de privacidade e configuração de filtragem de dados. |
| Datadog e New Relic | Não adotados agora | Duplicariam observabilidade, criariam contas externas e complexidade desnecessária. |
| OpenTelemetry no navegador | Adiado | Instrumentação de cliente ainda acrescenta complexidade e não há backend coletor no projeto. |
| Stryker | Adiado | Teste de mutação será reavaliado quando a suíte unitária estiver mais ampla e estável. |
| Endtest | Não adotado | Duplicaria o Playwright e exigiria serviço e credenciais externos. |

## Segurança e operação

- A aplicação não possui servidor próprio; portanto, um `rate limit` implementado no frontend não protegeria dados. A proteção atual é login Google, allowlist por UID, regras do Firestore e quotas do Firebase.
- Antes de dados reais, avaliar Firebase App Check e alertas de uso. Se no futuro existir uma API própria, ela deve ficar separada do frontend e receber rate limit no servidor.
- Dependências de produção com vulnerabilidade alta ou crítica bloqueiam o Pull Request. Avisos exclusivos de ferramentas de desenvolvimento, quando sem correção disponível, devem ser registrados e monitorados pelo Dependabot.
- Segredos e credenciais privadas nunca entram no repositório. A configuração Web pública do Firebase não substitui regras de segurança.
- Termos de uso e política de privacidade precisam ser redigidos e aprovados por profissional jurídico antes da liberação com dados reais. A esteira técnica não substitui essa aprovação humana.

## Bloqueios para sair do piloto

Antes de usar informações reais, ainda são obrigatórios:

1. revisão formal de segurança e autorização;
2. decisão e configuração de observabilidade com mascaramento de dados;
3. avaliação do App Check e alertas de quota;
4. termos de uso e política de privacidade aprovados pelo jurídico;
5. plano de backup, recuperação e resposta a incidentes.

Esse trabalho está acompanhado pela [Issue #28](https://github.com/generosorafa/hortifruti-teste/issues/28). Até sua conclusão e aprovação humana, o ambiente continua sendo um piloto com dados fictícios.
