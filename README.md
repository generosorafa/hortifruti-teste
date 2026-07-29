# Zeca Hortifruti — demonstração

Protótipo navegável do sistema operacional da Zeca Hortifruti. Esta versão foi criada exclusivamente para validação de fluxos e interface com o cliente.

> Ambiente demonstrativo: todos os nomes, valores e registros exibidos são fictícios. Não utilizar para armazenar informações reais ou confidenciais.

## O que já pode ser avaliado

- painel e operação selecionáveis por data de entrega;
- inclusão manual ou por texto copiado do WhatsApp;
- edição posterior, ajustes, observações e controle de recebimentos;
- impressão individual dos pedidos e da folha operacional do CEASA, incluindo a divisão por fornecedor;
- demanda automática de compras e divisão entre vários fornecedores;
- histórico demonstrativo de vendas, compras, recebimentos e pagamentos, com filtros e exportação Excel/PDF;
- cadastros completos e editáveis de clientes, produtos, fornecedores e prestadores;
- controle dos pagamentos de prestadores, com filtros, totais e exportação Excel/PDF;
- busca de produtos por nome ou número na inclusão do pedido;
- produtos com custo e venda de referência, sem controle de estoque;
- acompanhamento independente por data da operação: pedidos, compras, conferência e carregamento;
- navegação adaptada para computador e celular.

## Firebase preparado

O projeto já contém integração opcional com Firebase Authentication e Firestore. Sem configuração, continua como demonstração. Depois da configuração, exige login Google, valida o UID em uma lista fechada e sincroniza os dados operacionais. Consulte [FIREBASE_SETUP.md](FIREBASE_SETUP.md) para o passo a passo completo.

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

## Segurança antes de dados reais

Não insira informações confidenciais até concluir o checklist de autorização, regras e persistência descrito em `FIREBASE_SETUP.md`.
