import { describe, expect, it } from "vitest";
import {
  formatDate,
  money,
  normalizeUnit,
  orderSubtotal,
  orderTotal,
  parseOrderText,
  parseProductList,
  type Order,
  type Product,
} from "../../src/domain";

const catalog: Product[] = [
  {
    id: "abacaxi",
    code: "010",
    name: "Abacaxi pérola",
    category: "Frutas",
    unit: "UN",
    costReference: 20,
    saleReference: 30,
    aliases: ["abacaxi"],
  },
  {
    id: "couve",
    code: "011",
    name: "Couve manteiga",
    category: "Folhas",
    unit: "MÇ",
    costReference: 2,
    saleReference: 3,
    aliases: ["couve"],
  },
];

describe("normalização de unidades", () => {
  it.each([
    ["kg", "KG"],
    ["maço", "MÇ"],
    ["mc", "MÇ"],
    ["cx", "CX"],
    ["caixa", "UN"],
  ])("converte %s para %s", (input, expected) => {
    expect(normalizeUnit(input)).toBe(expected);
  });
});

describe("importação de pedidos", () => {
  it("interpreta quantidade, produto e preço unitário informado no texto", () => {
    const [line] = parseOrderText("1 Abacaxi 35,50", catalog);

    expect(line).toMatchObject({
      quantity: 1,
      productId: "abacaxi",
      unitPrice: 35.5,
      needsReview: false,
    });
  });

  it("mantém o preço vazio para o cadastro fornecer o valor de referência", () => {
    const [line] = parseOrderText("2 couve", catalog);

    expect(line).toMatchObject({ quantity: 2, productId: "couve" });
    expect(line.unitPrice).toBeUndefined();
  });

  it("marca produto desconhecido para revisão", () => {
    const [line] = parseOrderText("3 produto sem cadastro", catalog);

    expect(line.productId).toBe("");
    expect(line.needsReview).toBe(true);
  });

  it("assume uma unidade quando a mensagem não começa com quantidade", () => {
    const [line] = parseOrderText("couve", catalog);

    expect(line).toMatchObject({ quantity: 1, productId: "couve", needsReview: false });
  });

  it("aceita o marcador x e o prefixo monetário", () => {
    const [line] = parseOrderText("\n2x Abacaxi R$ 40\n", catalog);

    expect(line).toMatchObject({ quantity: 2, productId: "abacaxi", unitPrice: 40 });
  });
});

describe("importação de cadastro de produtos", () => {
  it("aceita vírgula decimal e unidade cadastrada", () => {
    const result = parseProductList("Alface americana, 012, Folhas, UN, 2,50, 3,80");

    expect(result.errors).toEqual([]);
    expect(result.products[0]).toMatchObject({
      code: "012",
      name: "Alface americana",
      unit: "UN",
      costReference: 2.5,
      saleReference: 3.8,
    });
  });

  it("informa a linha inválida sem importar dados incompletos", () => {
    const result = parseProductList("Produto incompleto, 013");

    expect(result.products).toEqual([]);
    expect(result.errors[0]).toContain("Linha 1");
  });

  it("ignora o cabeçalho e aceita campos separados por ponto e vírgula", () => {
    const result = parseProductList([
      "Nome, Número, Categoria, Unidade, Custo, Venda",
      "Couve; 014; Folhas; MÇ; 2.25; 3.75",
    ].join("\n"));

    expect(result.errors).toEqual([]);
    expect(result.products[0]).toMatchObject({ code: "014", unit: "MÇ", costReference: 2.25 });
  });
});

describe("formatação para a operação brasileira", () => {
  it("formata data e dinheiro sem alterar o valor", () => {
    expect(formatDate("2026-08-20")).toBe("20/08/2026");
    expect(money(35.5)).toContain("35,50");
  });
});

describe("totais do pedido", () => {
  const order: Pick<Order, "items" | "adjustment"> = {
    items: [
      { id: "1", productId: "abacaxi", name: "Abacaxi", quantity: 2, unit: "UN", unitPrice: 35 },
      { id: "2", productId: "couve", name: "Couve", quantity: 3, unit: "MÇ", unitPrice: 4 },
    ],
    adjustment: -2,
  };

  it("calcula subtotal e aplica ajuste sem consultar o cadastro atual", () => {
    expect(orderSubtotal(order)).toBe(82);
    expect(orderTotal(order)).toBe(80);
  });
});
