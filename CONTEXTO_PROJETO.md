# Contexto do projeto — Zeca Hortifruti

Este documento reúne decisões obrigatórias para qualquer pessoa ou agente de IA que trabalhe neste repositório. Ele deve ser lido antes de analisar, implementar ou publicar qualquer mudança.

## Objetivo e limites do piloto

- O sistema é interno e atende uma empresa específica.
- Os dados são privados; não há SEO público, anúncios, afiliados, assinaturas ou pagamentos pelo uso do sistema.
- O piloto deve permanecer no custo zero enquanto estiver em validação.
- O acesso é protegido por login Google, lista fechada de usuários autorizados e regras do Firestore.
- O site funciona em computador e celular e é publicado no GitHub Pages.
- Dados reais só podem ser utilizados depois da validação completa de autenticação, autorização, persistência e regras de segurança.

## Fluxo obrigatório de trabalho no GitHub

Nenhuma alteração de código, interface, regra, documentação ou infraestrutura deve começar sem uma Issue aberta. Toda entrega deve passar por Pull Request; não é permitido publicar alterações diretamente na branch `main`.

### 1. Abrir e classificar a Issue

Escolha exatamente uma categoria usando o modelo correspondente em **New issue**:

- **Correção**: algo existente apresenta comportamento incorreto, regressão ou erro.
- **Melhoria**: aperfeiçoamento de uma função, fluxo, layout, desempenho, segurança ou documentação existente.
- **Nova função**: capacidade ou módulo que ainda não existe no sistema.

O título deve manter o prefixo do modelo: `[Correção]`, `[Melhoria]` ou `[Nova função]`. A Issue precisa registrar contexto, resultado esperado, critérios de aceite, forma prevista de validação e riscos conhecidos.

Se um pedido do usuário contiver tarefas independentes, abra Issues separadas. Mantenha na mesma Issue somente itens que precisem ser entregues e validados juntos.

### 2. Implementar em uma branch própria

- Atualize a branch `main` antes de começar.
- Crie uma branch dedicada, preferencialmente no formato `agent/<numero-da-issue>-<resumo>`.
- Limite o trabalho ao escopo e aos critérios de aceite da Issue.
- Se surgir uma tarefa diferente durante a implementação, registre outra Issue antes de incluí-la.
- Preserve dados, alterações locais e decisões do usuário que não façam parte do escopo.

### 3. Abrir o Pull Request

Todo Pull Request deve usar o modelo do repositório e conter obrigatoriamente:

- **Issue relacionada**, usando `Closes #<número>` quando o PR concluir a tarefa ou `Refs #<número>` quando for apenas uma etapa;
- **classificação** da entrega;
- **o que mudou**;
- **como foi validado**, incluindo comandos executados e verificações manuais relevantes;
- **riscos** introduzidos ou avaliados;
- **limitações** conhecidas;
- **próximos passos**, mesmo quando a resposta for `Não há`;
- confirmação de que não foram incluídos segredos ou dados confidenciais.

O PR deve começar como rascunho durante a implementação e só ficar pronto para revisão depois que os critérios de aceite forem atendidos e as validações terminarem.

### 4. Revisar, mesclar e publicar

- Confira o diff completo e não inclua arquivos fora do escopo.
- Execute `npm run quality`; rode `npm run test:rules`, `npm run test:e2e` e outras validações proporcionais ao risco da mudança.
- Alterações no Firebase devem incluir a validação das regras e do fluxo de autorização quando aplicável.
- Mescle somente um PR validado, pronto para revisão e com o check obrigatório **Quality Gate** aprovado.
- O deploy ocorre após o merge na `main` pelo GitHub Actions.
- Confirme que o workflow **Publicar demonstração no GitHub Pages** terminou com sucesso.
- Registre no retorno da tarefa o link da Issue, do PR e da versão publicada.

## Esteira obrigatória de qualidade

- A branch `main` deve exigir Pull Request e aprovação do check **Quality Gate** antes do merge.
- O workflow `.github/workflows/quality.yml` valida lint, tipos, arquitetura, dependências, commits, testes, cobertura, regras do Firestore, build, performance e segurança.
- Não desative, ignore ou torne não bloqueante um check para concluir uma entrega. Corrija a causa ou registre uma Issue específica se houver impedimento externo real.
- Leia `QUALIDADE_E_SEGURANCA.md` antes de introduzir dependências, serviços externos, nova camada arquitetural ou coleta de observabilidade.
- Reutilize componentes existentes. Componentize por responsabilidade concreta, aplique DRY com critério e evite abstrações prematuras, novos backends ou serviços sem necessidade demonstrada.

## Segurança e dados

- Nunca coloque senhas, tokens, chaves de conta de serviço ou credenciais no repositório.
- A configuração Web pública do Firebase não substitui regras de segurança.
- Mudanças em coleções, campos persistidos ou regras devem considerar compatibilidade com dados já salvos.
- Exclusões e migrações precisam declarar no PR o risco de perda de dados e a estratégia de recuperação.
- Enquanto o piloto não estiver formalmente liberado, use somente dados fictícios.

## Regra para agentes

Ao receber uma nova solicitação, o agente deve primeiro consultar este documento, verificar se já existe uma Issue correspondente e criar uma quando ela não existir. Só depois deve iniciar a implementação. Estas instruções têm precedência sobre atalhos de entrega e valem para qualquer modelo ou ferramenta utilizada no projeto.
