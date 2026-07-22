# Zeca Hortifruti — demonstração

Protótipo navegável do sistema operacional da Zeca Hortifruti. Esta versão foi criada exclusivamente para validação de fluxos e interface com o cliente.

> Ambiente demonstrativo: todos os nomes, valores e registros exibidos são fictícios. Não utilizar para armazenar informações reais ou confidenciais.

## O que já pode ser avaliado

- painel da próxima entrega;
- inclusão demonstrativa de pedidos;
- lista e filtros de pedidos;
- acompanhamento da operação do dia;
- lista de compras interativa;
- cadastros demonstrativos de clientes, produtos e fornecedores;
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
