export type Unit = "kg" | "cx" | "un" | "maço";
export type PaymentStatus = "Pendente" | "Pago" | "Parcial";
export type PaymentMethod = "Não informado" | "Pix" | "Dinheiro" | "Boleto" | "Transferência";

export type CompanyProfile = {
  id: string;
  tradeName: string;
  legalName: string;
  taxId: string;
  stateRegistration: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: Unit;
  costReference: number;
  saleReference: number;
  aliases?: string[];
  supplierIds?: string[];
};

export type Client = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  city: string;
  observation: string;
  orders: number;
  status: string;
};

export type Supplier = {
  id: string;
  name: string;
  categories: string;
  contact: string;
  phone: string;
  address: string;
  city: string;
  observation: string;
  delivery: string;
  rating: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  confirmedWeight?: number;
};

export type Order = {
  id: string;
  number: string;
  date: string;
  deliveryDate: string;
  customer: string;
  items: OrderItem[];
  adjustment: number;
  status: "Confirmado" | "Separando" | "Conferido" | "Rascunho";
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  observation: string;
};

export type ParsedLine = {
  id: string;
  raw: string;
  quantity: number;
  productId: string;
  needsReview: boolean;
};

export type PurchaseAllocation = {
  id: string;
  deliveryDate: string;
  productId: string;
  supplierId: string;
  quantity: number;
  unitCost: number;
};

export type PurchaseRecord = {
  id: string;
  number: string;
  date: string;
  supplierId?: string;
  supplier: string;
  total: number;
  status: PaymentStatus;
  source?: "allocation" | "manual";
};

export type OperationDay = {
  id: string;
  date: string;
  stages: boolean[];
};

export const defaultCompanyProfile: CompanyProfile = {
  id: "company",
  tradeName: "Zeca Hortifruti",
  legalName: "",
  taxId: "",
  stateRegistration: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
};

export const products: Product[] = [
  { id: "tomate", code: "001", name: "Tomate italiano", category: "Hortaliças", unit: "kg", costReference: 4.9, saleReference: 6.9, aliases: ["tomate", "tomate italia"], supplierIds: ["boa-colheita", "vale-verde"] },
  { id: "batata", code: "002", name: "Batata lavada", category: "Tubérculos", unit: "kg", costReference: 3.4, saleReference: 4.8, aliases: ["batata", "batata lisa"], supplierIds: ["vale-verde"] },
  { id: "cebola", code: "003", name: "Cebola nacional", category: "Hortaliças", unit: "kg", costReference: 3.8, saleReference: 5.2, aliases: ["cebola"], supplierIds: ["boa-colheita", "vale-verde"] },
  { id: "banana", code: "004", name: "Banana nanica", category: "Frutas", unit: "cx", costReference: 28, saleReference: 38, aliases: ["banana", "banana nanica"], supplierIds: ["vale-verde", "nova-safra"] },
  { id: "alface", code: "005", name: "Alface crespa", category: "Folhas", unit: "un", costReference: 2.1, saleReference: 3.2, aliases: ["alface", "alface crespa"], supplierIds: ["boa-colheita"] },
  { id: "couve", code: "006", name: "Couve manteiga", category: "Folhas", unit: "maço", costReference: 2.4, saleReference: 3.8, aliases: ["couve", "couve manteiga"], supplierIds: ["boa-colheita"] },
  { id: "laranja", code: "007", name: "Laranja pera", category: "Frutas", unit: "kg", costReference: 2.9, saleReference: 4.1, aliases: ["laranja", "laranja pera"], supplierIds: ["vale-verde", "nova-safra"] },
  { id: "maca", code: "008", name: "Maçã gala", category: "Frutas", unit: "cx", costReference: 92, saleReference: 118, aliases: ["maca", "maça", "maçã", "maca gala"], supplierIds: ["nova-safra"] },
  { id: "uva", code: "009", name: "Uva vitória", category: "Frutas", unit: "cx", costReference: 58, saleReference: 76, aliases: ["uva", "uva vitoria"], supplierIds: ["nova-safra"] },
];

export const clients: Client[] = [
  { id: "mercado-silva", name: "Mercado Silva", contact: "Marcos Silva", phone: "(11) 98842-1201", address: "Rua das Flores, 128", city: "São Paulo", observation: "Receber pela entrada lateral.", orders: 18, status: "Ativo" },
  { id: "padaria-central", name: "Padaria Central", contact: "Ana Martins", phone: "(11) 97731-4402", address: "Av. Central, 450", city: "São Paulo", observation: "Entrega antes das 7h.", orders: 12, status: "Ativo" },
  { id: "restaurante-italia", name: "Restaurante Itália", contact: "Paulo Neri", phone: "(11) 99128-5530", address: "Al. dos Jardins, 84", city: "São Paulo", observation: "Falar com a cozinha.", orders: 9, status: "Ativo" },
  { id: "hotel-avenida", name: "Hotel Avenida", contact: "Carla Lima", phone: "(11) 96620-1184", address: "Av. Paulista, 920", city: "São Paulo", observation: "Usar doca de serviço.", orders: 7, status: "Ativo" },
  { id: "quitanda-bairro", name: "Quitanda do Bairro", contact: "Luciana Prado", phone: "(11) 97612-0034", address: "Rua do Comércio, 31", city: "São Paulo", observation: "", orders: 11, status: "Ativo" },
];

export const suppliers: Supplier[] = [
  { id: "boa-colheita", name: "Sítio Boa Colheita", categories: "Folhas e hortaliças", contact: "João", phone: "(11) 98811-2200", address: "Box 18, Pavilhão A", city: "São Paulo", observation: "Seg, qua e sex", delivery: "Seg, qua e sex", rating: "Excelente" },
  { id: "vale-verde", name: "Distribuidora Vale Verde", categories: "Frutas e tubérculos", contact: "Beatriz", phone: "(11) 97744-1920", address: "Box 42, Pavilhão B", city: "São Paulo", observation: "Entrega diária", delivery: "Diária", rating: "Excelente" },
  { id: "nova-safra", name: "Cooperativa Nova Safra", categories: "Frutas da estação", contact: "Carlos", phone: "(11) 99150-4412", address: "Box 7, Pavilhão C", city: "São Paulo", observation: "Terças e quintas", delivery: "Ter e qui", rating: "Bom" },
];

export const initialPurchases: PurchaseRecord[] = [
  { id: "C-208", number: "C-208", date: "2026-07-21", supplier: "Sítio Boa Colheita", total: 1280, status: "Pendente" },
  { id: "C-207", number: "C-207", date: "2026-07-21", supplier: "Distribuidora Vale Verde", total: 2435, status: "Pago" },
  { id: "C-206", number: "C-206", date: "2026-07-20", supplier: "Cooperativa Nova Safra", total: 1860, status: "Parcial" },
  { id: "C-205", number: "C-205", date: "2026-07-19", supplier: "Sítio Boa Colheita", total: 940, status: "Pago" },
];

const item = (productId: string, quantity: number, price?: number): OrderItem => {
  const product = products.find((candidate) => candidate.id === productId)!;
  return { id: `${productId}-${quantity}-${price ?? product.saleReference}`, productId, name: product.name, quantity, unit: product.unit, unitPrice: price ?? product.saleReference };
};

export const initialOrders: Order[] = [
  { id: "1048", number: "#1048", date: "2026-07-21", deliveryDate: "2026-07-22", customer: "Mercado Silva", items: [item("tomate", 20), item("batata", 15), item("alface", 12), item("banana", 3)], adjustment: -15, status: "Confirmado", paymentStatus: "Pendente", paymentMethod: "Não informado", observation: "Entregar pela entrada lateral até 8h." },
  { id: "1047", number: "#1047", date: "2026-07-21", deliveryDate: "2026-07-22", customer: "Padaria Central", items: [item("tomate", 8), item("cebola", 6), item("couve", 10), item("laranja", 12)], adjustment: 0, status: "Separando", paymentStatus: "Pago", paymentMethod: "Pix", observation: "Separar as folhas em caixas plásticas." },
  { id: "1046", number: "#1046", date: "2026-07-21", deliveryDate: "2026-07-22", customer: "Restaurante Itália", items: [item("tomate", 35, 6.5), item("batata", 22), item("cebola", 18), item("alface", 20), item("maca", 2)], adjustment: 25, status: "Conferido", paymentStatus: "Parcial", paymentMethod: "Transferência", observation: "Acréscimo combinado por entrega urgente." },
  { id: "1045", number: "#1045", date: "2026-07-20", deliveryDate: "2026-07-21", customer: "Quitanda do Bairro", items: [item("banana", 6), item("laranja", 30), item("uva", 3)], adjustment: 0, status: "Conferido", paymentStatus: "Pago", paymentMethod: "Dinheiro", observation: "" },
  { id: "1044", number: "#1044", date: "2026-07-19", deliveryDate: "2026-07-20", customer: "Hotel Avenida", items: [item("tomate", 18), item("batata", 20), item("maca", 4), item("laranja", 25)], adjustment: -32, status: "Conferido", paymentStatus: "Pendente", paymentMethod: "Boleto", observation: "Desconto referente à divergência de peso do pedido anterior." },
];

export const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const formatDate = (value: string) => value.split("-").reverse().join("/");
export const orderSubtotal = (order: Pick<Order, "items">) => order.items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
export const orderTotal = (order: Pick<Order, "items" | "adjustment">) => orderSubtotal(order) + order.adjustment;

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

export const parseProductList = (text: string): { products: Product[]; errors: string[] } => {
  const imported: Product[] = [];
  const errors: string[] = [];
  const timestamp = Date.now();
  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    if (index === 0 && normalize(line).startsWith("nome") && normalize(line).includes("numero")) return;
    const match = line.match(/^\s*(.*?)\s*[,;]\s*([^,;]+)\s*[,;]\s*(.*?)\s*[,;]\s*(kg|cx|un|ma[cç]o)\s*[,;]\s*(\d+(?:[.,]\d+)?)\s*[,;]\s*(\d+(?:[.,]\d+)?)\s*$/i);
    if (!match) {
      errors.push(`Linha ${index + 1}: use Nome, Número, Categoria, Unidade, Custo, Venda.`);
      return;
    }
    const [, rawName, rawCode, rawCategory, rawUnit, rawCost, rawSale] = match;
    const name = rawName.trim();
    const code = rawCode.trim();
    const unit = normalize(rawUnit) === "maco" ? "maço" : normalize(rawUnit) as Unit;
    const costReference = Number(rawCost.replace(",", "."));
    const saleReference = Number(rawSale.replace(",", "."));
    if (!name || !code || !Number.isFinite(costReference) || !Number.isFinite(saleReference)) {
      errors.push(`Linha ${index + 1}: há um campo obrigatório inválido.`);
      return;
    }
    const slug = normalize(`${code}-${name}`).replace(/\s+/g, "-");
    imported.push({
      id: `product-${slug}-${timestamp}-${index}`,
      code,
      name,
      category: rawCategory.trim(),
      unit,
      costReference,
      saleReference,
      aliases: [name],
      supplierIds: [],
    });
  });
  return { products: imported, errors };
};

const levenshtein = (left: string, right: string) => {
  const matrix = Array.from({ length: right.length + 1 }, (_, row) => [row]);
  for (let column = 0; column <= left.length; column += 1) matrix[0][column] = column;
  for (let row = 1; row <= right.length; row += 1) {
    for (let column = 1; column <= left.length; column += 1) {
      matrix[row][column] = right[row - 1] === left[column - 1]
        ? matrix[row - 1][column - 1]
        : Math.min(matrix[row - 1][column - 1], matrix[row][column - 1], matrix[row - 1][column]) + 1;
    }
  }
  return matrix[right.length][left.length];
};

const findProduct = (description: string, catalog: Product[]) => {
  const query = normalize(description);
  const candidates = catalog.flatMap((product) => [product.name, ...(product.aliases ?? [])].map((alias) => ({ product, alias: normalize(alias) })));
  const exact = candidates.find(({ alias }) => alias === query || query.includes(alias) || alias.includes(query));
  if (exact) return { productId: exact.product.id, needsReview: false };
  const ranked = candidates.map(({ product, alias }) => ({ product, distance: levenshtein(query, alias) })).sort((a, b) => a.distance - b.distance);
  const best = ranked[0];
  const acceptedDistance = Math.max(1, Math.floor(query.length * .34));
  return { productId: best && best.distance <= acceptedDistance ? best.product.id : "", needsReview: true };
};

export const parseOrderText = (text: string, catalog: Product[] = products): ParsedLine[] => text
  .split(/\r?\n/)
  .map((raw) => raw.trim())
  .filter(Boolean)
  .map((raw, index) => {
    const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*(?:x\s*)?(.+)$/i);
    const quantity = match ? Number(match[1].replace(",", ".")) : 1;
    const description = match?.[2] ?? raw;
    const suggestion = findProduct(description, catalog);
    return { id: `parsed-${Date.now()}-${index}`, raw, quantity, ...suggestion };
  });

const escapeHtml = (value: string | number) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]!));

const companyPrintHeader = (company: CompanyProfile, title: string, aside: string) => {
  const name = company.tradeName.trim() || company.legalName.trim() || "Zeca Hortifruti";
  const locality = [company.city, company.state].filter(Boolean).join(" - ");
  const address = [company.address, locality, company.postalCode ? `CEP ${company.postalCode}` : ""].filter(Boolean).join(" · ");
  const registrations = [
    company.legalName && normalize(company.legalName) !== normalize(name) ? company.legalName : "",
    company.taxId ? `CNPJ/CPF ${company.taxId}` : "",
    company.stateRegistration ? `IE ${company.stateRegistration}` : "",
  ].filter(Boolean);
  const contacts = [company.phone, company.email].filter(Boolean).join(" · ");
  const details = [...registrations, address, contacts].filter(Boolean);
  return `<header><div class="company-print"><div class="brand">${escapeHtml(name)}</div>${details.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}</div><div class="document-heading"><h1>${escapeHtml(title)}</h1><strong>${escapeHtml(aside)}</strong></div></header>`;
};

const openPrintDocument = (title: string, body: string, landscape = false) => {
  const popup = window.open("", "_blank", "width=980,height=760");
  if (!popup) return false;
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    *{box-sizing:border-box}body{margin:0;padding:28px;font:12px Arial,sans-serif;color:#15231d}header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:16px;border-bottom:2px solid #173f32}h1{margin:0;font-size:22px}h2{margin:24px 0 10px;font-size:15px}.brand{font-weight:800;color:#174638;text-transform:uppercase}.company-print{max-width:58%;display:flex;flex-direction:column;gap:3px}.company-print .brand{margin-bottom:3px;font-size:16px}.company-print span{color:#53625a;font-size:9px;line-height:1.35}.document-heading{display:flex;align-items:flex-end;flex-direction:column;gap:7px;text-align:right}.document-heading strong{font-size:11px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.meta div,.note{padding:10px;border:1px solid #ccd7d1;border-radius:6px}.meta span{display:block;margin-bottom:4px;color:#65736c;font-size:9px;text-transform:uppercase}table{width:100%;border-collapse:collapse}th,td{padding:8px 7px;text-align:left;border-bottom:1px solid #d9e1dd;vertical-align:top}th{background:#edf4f0;font-size:9px;text-transform:uppercase}.report-table{font-size:9px}.report-table th,.report-table td{padding:6px 5px;overflow-wrap:anywhere}.right{text-align:right}.total{display:flex;justify-content:flex-end;gap:30px;margin-top:15px;font-size:15px}.weight{height:17px;min-width:48px;border-bottom:1px solid #58665f}.check{display:inline-block;width:14px;height:14px;margin-right:6px;vertical-align:middle;border:1px solid #607068}.customer-breakdown,.supplier-breakdown{color:#516159;font-size:10px;line-height:1.55}.footer{margin-top:32px;padding-top:12px;color:#718078;border-top:1px solid #d9e1dd;font-size:9px}@page{size:${landscape ? "landscape" : "auto"};margin:10mm}@media print{body{padding:0}.no-print{display:none}}
  </style></head><body>${body}<script>setTimeout(()=>window.print(),250)<\/script></body></html>`);
  popup.document.close();
  return true;
};

export const printOrder = (order: Order, company: CompanyProfile = defaultCompanyProfile) => openPrintDocument(`Pedido ${order.number}`, `
  ${companyPrintHeader(company, `Pedido individual ${order.number}`, `Entrega ${formatDate(order.deliveryDate)}`)}
  <div class="meta"><div><span>Cliente</span><strong>${escapeHtml(order.customer)}</strong></div><div><span>Data do pedido</span><strong>${escapeHtml(formatDate(order.date))}</strong></div><div><span>Pagamento</span><strong>${escapeHtml(order.paymentStatus)} · ${escapeHtml(order.paymentMethod)}</strong>${order.paymentReference ? `<br><small>Referência: ${escapeHtml(order.paymentReference)}</small>` : ""}</div></div>
  <table><thead><tr><th>Produto</th><th>Qtd.</th><th>Unidade</th><th class="right">Valor unitário</th><th class="right">Total</th><th>Peso conferido</th></tr></thead><tbody>${order.items.map((line) => `<tr><td>${escapeHtml(line.name)}</td><td>${escapeHtml(line.quantity)}</td><td>${escapeHtml(line.unit)}</td><td class="right">${escapeHtml(money(line.unitPrice))}</td><td class="right">${escapeHtml(money(line.quantity * line.unitPrice))}</td><td><div class="weight">${line.confirmedWeight ? escapeHtml(line.confirmedWeight) : ""}</div></td></tr>`).join("")}</tbody></table>
  <div class="total"><span>Ajuste: ${escapeHtml(money(order.adjustment))}</span><strong>Total: ${escapeHtml(money(orderTotal(order)))}</strong></div>
  <h2>Observações</h2><div class="note">${escapeHtml(order.observation || "Sem observações.")}</div>
  <div class="footer">Documento operacional gerado pelo sistema Zeca Hortifruti.</div>
`);

const printDaySheet = (orders: Order[], allocations: PurchaseAllocation[], supplierCatalog: Supplier[], includeCosts: boolean, company: CompanyProfile) => {
  const grouped = new Map<string, { productId: string; name: string; unit: Unit; total: number; customers: string[] }>();
  orders.forEach((order) => order.items.forEach((line) => {
    const current = grouped.get(line.productId) ?? { productId: line.productId, name: line.name, unit: line.unit, total: 0, customers: [] };
    current.total += line.quantity;
    current.customers.push(`${order.customer}: ${line.quantity} ${line.unit}`);
    grouped.set(line.productId, current);
  }));
  const documentTitle = includeCosts ? "Compras do dia" : "Carregamento do dia";
  return openPrintDocument(documentTitle, `
    ${companyPrintHeader(company, documentTitle, `Entrega ${formatDate(orders[0]?.deliveryDate ?? "")}`)}
    <div class="meta"><div><span>Pedidos</span><strong>${orders.length}</strong></div><div><span>Clientes</span><strong>${new Set(orders.map((order) => order.customer)).size}</strong></div><div><span>Conferência</span><strong>CEASA</strong></div></div>
    <table><thead><tr><th>${includeCosts ? "Comprar" : "Conferir"}</th><th>Produto</th><th>Total do dia</th><th>${includeCosts ? "Comprar em" : "Retirar em"}</th><th>Separar para</th><th>Carregado</th></tr></thead><tbody>${Array.from(grouped.values()).map((line) => {
      const purchases = allocations.filter((allocation) => allocation.productId === line.productId && allocation.deliveryDate === orders[0]?.deliveryDate && allocation.quantity > 0);
      const supplierLines = purchases.length ? purchases.map((allocation) => {
        const supplier = supplierCatalog.find((candidate) => candidate.id === allocation.supplierId)?.name ?? "Fornecedor não informado";
        return includeCosts
          ? `${supplier}: ${allocation.quantity} ${line.unit} · ${money(allocation.unitCost)}/${line.unit}`
          : `${supplier}: ${allocation.quantity} ${line.unit}`;
      }) : ["A definir"];
      return `<tr><td><span class="check"></span></td><td><strong>${escapeHtml(line.name)}</strong></td><td><strong>${escapeHtml(line.total)} ${escapeHtml(line.unit)}</strong></td><td class="supplier-breakdown">${supplierLines.map(escapeHtml).join("<br>")}</td><td class="customer-breakdown">${line.customers.map(escapeHtml).join("<br>")}</td><td><span class="check"></span></td></tr>`;
    }).join("")}</tbody></table>
    <div class="footer">${includeCosts ? "Use esta folha para comprar, registrar custos e separar por cliente." : "Folha sem valores de compra para separação e conferência do carregamento."}</div>
  `);
};

export const printPurchaseSheet = (orders: Order[], allocations: PurchaseAllocation[] = [], supplierCatalog: Supplier[] = suppliers, company: CompanyProfile = defaultCompanyProfile) => printDaySheet(orders, allocations, supplierCatalog, true, company);
export const printLoadingSheet = (orders: Order[], allocations: PurchaseAllocation[] = [], supplierCatalog: Supplier[] = suppliers, company: CompanyProfile = defaultCompanyProfile) => printDaySheet(orders, allocations, supplierCatalog, false, company);
export const printLoadSheet = printPurchaseSheet;

export const buildPurchaseHistory = (allocations: PurchaseAllocation[], supplierCatalog: Supplier[], savedRecords: PurchaseRecord[]): PurchaseRecord[] => {
  const grouped = new Map<string, { date: string; supplierId: string; total: number }>();
  allocations.filter((allocation) => allocation.quantity > 0 && allocation.supplierId).forEach((allocation) => {
    const id = `purchase-${allocation.deliveryDate}-${allocation.supplierId}`;
    const current = grouped.get(id) ?? { date: allocation.deliveryDate, supplierId: allocation.supplierId, total: 0 };
    current.total += allocation.quantity * allocation.unitCost;
    grouped.set(id, current);
  });
  const savedById = new Map(savedRecords.map((record) => [record.id, record]));
  const matchedSavedIds = new Set<string>();
  const derived = Array.from(grouped.entries()).map(([id, group]) => {
    const supplier = supplierCatalog.find((candidate) => candidate.id === group.supplierId);
    const saved = savedById.get(id) ?? savedRecords.find((record) =>
      record.date === group.date
      && (record.supplierId === group.supplierId || normalize(record.supplier) === normalize(supplier?.name ?? "")));
    if (saved) matchedSavedIds.add(saved.id);
    return {
      id: saved?.id ?? id,
      number: saved?.number ?? `C-${group.date.split("-").join("").slice(2)}-${group.supplierId.slice(0, 4).toUpperCase()}`,
      date: group.date,
      supplierId: group.supplierId,
      supplier: supplier?.name ?? saved?.supplier ?? "Fornecedor não informado",
      total: group.total,
      status: saved?.status ?? "Pendente",
      source: "allocation" as const,
    };
  });
  const manual = savedRecords.filter((record) => record.source !== "allocation" && !matchedSavedIds.has(record.id) && !grouped.has(record.id));
  return [...derived, ...manual].sort((left, right) => right.date.localeCompare(left.date) || right.number.localeCompare(left.number, undefined, { numeric: true }));
};

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export const downloadCsv = (filename: string, headers: string[], rows: Array<Array<string | number>>) => {
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const printTableReport = (title: string, subtitle: string, headers: string[], rows: Array<Array<string | number>>, company: CompanyProfile = defaultCompanyProfile) => openPrintDocument(title, `
  ${companyPrintHeader(company, title, subtitle)}
  <table class="report-table" style="margin-top:18px"><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>
  <div class="footer">Na janela de impressão, escolha “Salvar como PDF” para baixar o relatório.</div>
`, true);
