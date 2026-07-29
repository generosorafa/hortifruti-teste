# Configuração do Firebase — Zeca Hortifruti

Este guia ativa o login Google, o banco persistente e a lista fechada de usuários autorizados. Faça os passos na ordem. Enquanto as variáveis não forem preenchidas, o site continuará no modo demonstrativo atual e não deverá receber dados reais.

## O que já está preparado no projeto

- login com conta Google;
- sessão de login mantida no computador e no celular;
- bloqueio visual para quem não está na lista autorizada;
- bloqueio real no Firestore por regras de segurança;
- sincronização de clientes, produtos, fornecedores, pedidos, compras, divisões por fornecedor e etapas por data;
- opção de iniciar o banco vazio ou carregar dados fictícios;
- saída da conta pelo perfil no menu lateral;
- testes automatizados das regras de segurança;
- publicação do GitHub Pages preparada para receber a configuração pelas variáveis do repositório.

## 1. Criar um projeto exclusivo

1. Entre em <https://console.firebase.google.com/> com a conta que será responsável pelo sistema.
2. Clique em **Adicionar projeto**.
3. Use um nome claro, por exemplo `zeca-hortifruti-piloto`.
4. Mantenha o projeto no plano gratuito **Spark**.
5. O Google Analytics não é necessário para este sistema interno; pode ficar desativado.

Use um projeto separado dos outros aplicativos. As cotas do Firestore são controladas por projeto e existe um banco gratuito por projeto. Não é necessário criar outro Gmail apenas por já possuir outros projetos.

## 2. Registrar o aplicativo Web

1. Na página inicial do projeto, clique no ícone **Web** (`</>`).
2. Nome sugerido: `Zeca Hortifruti Web`.
3. Não marque Firebase Hosting, pois o site continuará no GitHub Pages.
4. Conclua o registro.
5. O Firebase mostrará um objeto `firebaseConfig`. Guarde estes seis valores:

| Valor mostrado pelo Firebase | Variável usada no GitHub |
| --- | --- |
| `apiKey` | `FIREBASE_API_KEY` |
| `authDomain` | `FIREBASE_AUTH_DOMAIN` |
| `projectId` | `FIREBASE_PROJECT_ID` |
| `storageBucket` | `FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `FIREBASE_APP_ID` |

A configuração Web do Firebase aparece no código do navegador por definição. Ela identifica o projeto, mas não concede acesso aos dados. A proteção é feita pelas regras do Firestore. Nunca crie nem coloque uma chave de conta de serviço no GitHub.

## 3. Ativar o login Google

1. No menu do Firebase, abra **Authentication**.
2. Clique em **Começar**.
3. Abra **Sign-in method** ou **Método de login**.
4. Selecione **Google**.
5. Ative o provedor.
6. Escolha o e-mail de suporte do projeto e salve.
7. Ainda em Authentication, abra **Settings > Authorized domains**.
8. Adicione o domínio `generosorafa.github.io` — sem `https://` e sem `/hortifruti-teste`.

O provedor Google poderá identificar qualquer conta Google, mas isso não significa que todas terão acesso. A segunda camada, configurada na etapa 6, libera apenas os UIDs escolhidos.

## 4. Criar o Firestore

1. No menu, abra **Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Escolha a edição **Standard** e o modo **Nativo**.
4. Escolha uma região próxima e definitiva. Para uma operação no Brasil, normalmente `southamerica-east1 (São Paulo)` é a escolha mais simples.
5. Se o assistente perguntar, inicie em **modo de produção**. Não utilize regras abertas de teste.

As coleções não precisam ser criadas manualmente. O aplicativo criará os documentos quando o primeiro usuário autorizado salvar dados ou carregar a demonstração.

## 5. Publicar as regras de segurança

### Opção mais simples — Console

1. Abra **Firestore Database > Rules**.
2. Copie todo o conteúdo do arquivo `firestore.rules` deste repositório.
3. Substitua o conteúdo exibido no Console.
4. Clique em **Publicar**.

### Opção técnica — Firebase CLI

1. Faça uma cópia de `.firebaserc.example` com o nome `.firebaserc`.
2. Troque `SEU_PROJECT_ID` pelo `projectId` do seu Firebase.
3. Execute `npx firebase login`.
4. Execute `npx firebase deploy --only firestore:rules,firestore:indexes`.

As regras implementadas fazem o seguinte:

- negam usuários sem login;
- exigem e-mail Google verificado;
- exigem um documento ativo em `authorizedUsers/{UID}`;
- conferem se o e-mail do documento é o mesmo e-mail autenticado;
- impedem o próprio site de criar ou alterar autorizações;
- permitem somente as coleções utilizadas pelo sistema;
- bloqueiam qualquer coleção desconhecida por padrão.

## 6. Autorizar o primeiro Gmail

Esta etapa utiliza o UID gerado pelo Firebase Authentication, evitando depender apenas do texto do e-mail.

1. Configure e publique o site conforme as etapas 7 e 8.
2. Abra o site e clique em **Entrar com Google**.
3. Entre com o Gmail que será administrador.
4. Na primeira tentativa, aparecerá **Conta ainda não autorizada** e um código UID.
5. Clique em **Copiar UID**.
6. Volte ao Console do Firebase e abra **Firestore Database > Data**.
7. Crie a coleção `authorizedUsers`.
8. Use o UID copiado como **ID do documento**. Não use ID automático.
9. Adicione exatamente estes campos:

| Campo | Tipo | Valor do administrador |
| --- | --- | --- |
| `email` | string | Gmail completo em letras minúsculas |
| `active` | boolean | `true` |
| `role` | string | `admin` |

10. Salve o documento.
11. Volte ao site e clique em **Tentar novamente** ou atualize a página.

Para autorizar a segunda conta, repita o login com ela, copie o UID e crie outro documento. Use `role: operator` se quiser identificá-la como operador. Nesta primeira versão, administrador e operador possuem acesso operacional igual; o campo já está preparado para separarmos permissões futuramente.

### Como retirar o acesso

No documento do usuário em `authorizedUsers`, troque `active` para `false` ou exclua o documento. A próxima leitura ou alteração será negada pelas regras. Também é possível desativar a conta em **Authentication > Users**.

## 7. Colocar a configuração no GitHub

1. Abra <https://github.com/generosorafa/hortifruti-teste/settings/variables/actions>.
2. Em **Repository variables**, clique em **New repository variable**.
3. Crie as seis variáveis da tabela da etapa 2, exatamente com estes nomes:

```text
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

4. Preencha cada uma com o valor correspondente do `firebaseConfig`.

O fluxo de publicação já lê essas variáveis. Sem elas, o site abre em modo demonstrativo. Com todas as variáveis necessárias, ele exige login e passa a usar o Firestore.

## 8. Gerar uma nova publicação

Depois de criar as variáveis, abra a aba **Actions** do repositório, selecione **Publicar demonstração no GitHub Pages**, clique em **Run workflow** e confirme a branch `main`.

Quando terminar, abra:

<https://generosorafa.github.io/hortifruti-teste/>

## 9. Iniciar o banco

Após o primeiro login autorizado, o sistema detectará que o banco está vazio. Há duas opções:

- **Carregar dados demonstrativos:** grava no Firestore os clientes, produtos, pedidos, compras e operações fictícias atuais. É a melhor opção para continuar validando o fluxo.
- **Começar vazio:** cadastre os dados manualmente. Use esta opção somente quando estiver pronto para iniciar a implantação real.

Enquanto houver qualquer dúvida sobre as regras ou contas autorizadas, utilize apenas dados fictícios.

## 10. Conferência obrigatória antes de dados reais

- [ ] O site exige login Google em janela anônima.
- [ ] Uma conta não autorizada recebe a tela com UID e não enxerga dados.
- [ ] O administrador autorizado entra normalmente.
- [ ] Um produto criado permanece depois de atualizar a página.
- [ ] O mesmo produto aparece ao abrir no celular com uma conta autorizada.
- [ ] Clientes e fornecedores permanecem após sair e entrar novamente.
- [ ] Pedidos, pagamentos, compras e etapas por data permanecem salvos.
- [ ] Prestadores e pagamentos de prestadores permanecem após sair e entrar novamente.
- [ ] O documento de um usuário com `active: false` perde o acesso.
- [ ] As regras publicadas são iguais ao arquivo `firestore.rules`.

## Custos e limites do piloto

O Firestore possui cota gratuita diária no plano Spark, atualmente incluindo 1 GiB armazenado, 50 mil leituras, 20 mil gravações e 20 mil exclusões por dia, além da franquia mensal de saída. Para duas pessoas e o volume esperado neste piloto, a tendência é permanecer dentro da faixa gratuita. Acompanhe **Firestore > Usage** no Console e não ative faturamento enquanto a exigência for custo zero.

Documentação oficial:

- <https://firebase.google.com/docs/auth/web/google-signin>
- <https://firebase.google.com/docs/firestore/quickstart>
- <https://firebase.google.com/docs/firestore/security/rules-conditions>
- <https://firebase.google.com/docs/firestore/quotas>
- <https://firebase.google.com/docs/projects/api-keys>
