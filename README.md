# Zeca Hortifruti — demonstração

Protótipo navegável do sistema operacional da Zeca Hortifruti. Esta versão foi criada exclusivamente para validação de fluxos e interface com o cliente.

> Ambiente demonstrativo: todos os nomes, valores e registros exibidos são fictícios. Não utilizar para armazenar informações reais ou confidenciais.

## O que já pode ser avaliado

- painel da próxima entrega;
- inclusão manual ou por texto copiado do WhatsApp;
- edição posterior, ajustes, observações e controle de recebimentos;
- impressão individual dos pedidos e da folha operacional do CEASA;
- demanda automática de compras e divisão entre vários fornecedores;
- histórico demonstrativo de vendas, compras, recebimentos e pagamentos;
- cadastros editáveis de clientes, produtos e fornecedores;
- produtos com custo e venda de referência, sem controle de estoque;
- acompanhamento da operação: pedidos, compras, conferência e carregamento;
- navegação adaptada para computador e celular.

## Executar localmente

```bash
npm install
npm run dev
```

## Gerar a versão de produção

```bash
npm run build
```

A publicação no GitHub Pages é realizada automaticamente pelo workflow em `.github/workflows/deploy-pages.yml` a cada envio para a branch `main`.

## Etapa futura

Antes de inserir dados reais, o projeto deverá receber autenticação Google, autorização explícita de usuários, banco de dados protegido e regras de segurança no Firebase.
