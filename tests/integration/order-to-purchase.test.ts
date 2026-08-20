import { describe, expect, it } from "vitest";
import {
  buildPurchaseHistory,
  type PurchaseAllocation,
  type PurchaseRecord,
  type Supplier,
} from "../../src/domain";

const suppliers: Supplier[] = [
  {
    id: "fornecedor-a",
    name: "Fornecedor A",
    categories: "Geral",
    contact: "",
    phone: "",
    address: "",
    city: "",
    observation: "",
    delivery: "",
    rating: "Novo",
  },
];

describe("consolidação de compras", () => {
  it("soma produtos do mesmo fornecedor e preserva pagamento e nota já salvos", () => {
    const allocations: PurchaseAllocation[] = [
      { id: "1", deliveryDate: "2026-08-20", productId: "tomate", supplierId: "fornecedor-a", quantity: 10, unitCost: 5 },
      { id: "2", deliveryDate: "2026-08-20", productId: "batata", supplierId: "fornecedor-a", quantity: 4, unitCost: 3 },
    ];
    const saved: PurchaseRecord[] = [
      {
        id: "purchase-2026-08-20-fornecedor-a",
        number: "C-260820-FORN",
        date: "2026-08-20",
        supplierId: "fornecedor-a",
        supplier: "Fornecedor A",
        total: 1,
        status: "Pago",
        invoiceReceived: true,
        source: "allocation",
      },
    ];

    expect(buildPurchaseHistory(allocations, suppliers, saved)).toEqual([
      expect.objectContaining({
        id: "purchase-2026-08-20-fornecedor-a",
        total: 62,
        status: "Pago",
        invoiceReceived: true,
        source: "allocation",
      }),
    ]);
  });

  it("mantém uma compra manual separada das compras derivadas", () => {
    const manual: PurchaseRecord = {
      id: "manual-1",
      number: "C-EXTRA",
      date: "2026-08-19",
      supplier: "Fornecedor avulso",
      total: 90,
      status: "Pendente",
      source: "manual",
    };

    expect(buildPurchaseHistory([], suppliers, [manual])).toEqual([
      expect.objectContaining({ id: "manual-1", invoiceReceived: false }),
    ]);
  });

  it("cria uma compra pendente quando ainda não existe histórico salvo", () => {
    const allocations: PurchaseAllocation[] = [
      { id: "3", deliveryDate: "2026-08-21", productId: "tomate", supplierId: "fornecedor-a", quantity: 2, unitCost: 7 },
    ];

    expect(buildPurchaseHistory(allocations, suppliers, [])).toEqual([
      expect.objectContaining({
        date: "2026-08-21",
        supplier: "Fornecedor A",
        total: 14,
        status: "Pendente",
        invoiceReceived: false,
      }),
    ]);
  });

  it("reconhece um histórico antigo pela data e nome do fornecedor", () => {
    const allocations: PurchaseAllocation[] = [
      { id: "4", deliveryDate: "2026-08-22", productId: "couve", supplierId: "fornecedor-a", quantity: 5, unitCost: 2 },
    ];
    const legacy: PurchaseRecord = {
      id: "registro-antigo",
      number: "C-ANTIGA",
      date: "2026-08-22",
      supplier: "fornecedor a",
      total: 8,
      status: "Parcial",
    };

    expect(buildPurchaseHistory(allocations, suppliers, [legacy])).toEqual([
      expect.objectContaining({
        id: "registro-antigo",
        number: "C-ANTIGA",
        total: 10,
        status: "Parcial",
        invoiceReceived: false,
      }),
    ]);
  });
});
