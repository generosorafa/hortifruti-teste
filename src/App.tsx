import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Boxes,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  CreditCard,
  Edit3,
  Download,
  FileText,
  Filter,
  LayoutDashboard,
  Leaf,
  ListFilter,
  Menu,
  MessageSquareText,
  Moon,
  PackageCheck,
  PackageOpen,
  Plus,
  Printer,
  ReceiptText,
  Route,
  Save,
  Search,
  ShoppingBasket,
  Store,
  Sun,
  Trash2,
  Truck,
  UserPlus,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { type Dispatch, type FormEvent, type ReactNode, type SetStateAction, useEffect, useMemo, useState } from "react";
import {
  clients,
  downloadCsv,
  formatDate,
  initialOrders,
  money,
  orderSubtotal,
  orderTotal,
  parseOrderText,
  printLoadSheet,
  printOrder,
  printTableReport,
  products,
  suppliers,
  type Order,
  type OrderItem,
  type ParsedLine,
  type PaymentMethod,
  type PaymentStatus,
  type PurchaseAllocation,
  type Unit,
} from "./domain";

type ViewId = "dashboard" | "order-form" | "orders" | "operation" | "purchases" | "clients" | "products" | "suppliers";
type Theme = "light" | "dark";
type Navigate = (view: ViewId) => void;
type OperationStagesByDate = Record<string, boolean[]>;

const routes: Record<ViewId, string> = {
  dashboard: "inicio",
  "order-form": "novo-pedido",
  orders: "pedidos",
  operation: "operacao",
  purchases: "compras",
  clients: "clientes",
  products: "produtos",
  suppliers: "fornecedores",
};

const viewFromHash = () => {
  const route = window.location.hash.replace("#/", "").replace("#", "");
  return (Object.entries(routes).find(([, value]) => value === route)?.[0] as ViewId | undefined) ?? "dashboard";
};

const navigation = [
  { id: "dashboard" as ViewId, label: "Início", icon: LayoutDashboard },
  { id: "order-form" as ViewId, label: "Novo / editar pedido", icon: Plus },
  { id: "orders" as ViewId, label: "Pedidos e recebimentos", icon: ClipboardList },
  { id: "operation" as ViewId, label: "Operação do dia", icon: Truck },
  { id: "purchases" as ViewId, label: "Compras e pagamentos", icon: ShoppingBasket },
];

const registrations = [
  { id: "clients" as ViewId, label: "Clientes", icon: UsersRound },
  { id: "products" as ViewId, label: "Produtos", icon: Boxes },
  { id: "suppliers" as ViewId, label: "Fornecedores", icon: Store },
];

const getInitialTheme = (): Theme => {
  const appliedTheme = document.documentElement.dataset.theme;
  if (appliedTheme === "light" || appliedTheme === "dark") return appliedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

function Sidebar({ open, close, current, navigate, startNewOrder }: { open: boolean; close: () => void; current: ViewId; navigate: Navigate; startNewOrder: () => void }) {
  const select = (view: ViewId) => {
    if (view === "order-form") startNewOrder(); else navigate(view);
    close();
  };
  return (
    <>
      {open && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={close} />}
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="brand"><div className="brand__mark"><Leaf size={22} strokeWidth={2.4} /></div><div><strong>ZECA</strong><span>HORTIFRUTI</span></div><button className="icon-button sidebar__close" onClick={close} aria-label="Fechar menu"><X size={20} /></button></div>
        <button className="operation-chip" onClick={() => select("operation")}><span className="operation-chip__dot" /><span><small>Próxima entrega</small><strong>Qua, 22 de julho</strong></span><ChevronRight size={16} /></button>
        <nav className="sidebar__nav" aria-label="Menu principal">
          <span className="nav-label">OPERAÇÃO</span>
          {navigation.map(({ id, label, icon: Icon }) => <button className={`nav-item ${current === id ? "nav-item--active" : ""}`} onClick={() => select(id)} key={id} aria-current={current === id ? "page" : undefined}><Icon size={19} /><span>{label}</span></button>)}
          <span className="nav-label nav-label--spaced">CADASTROS</span>
          {registrations.map(({ id, label, icon: Icon }) => <button className={`nav-item ${current === id ? "nav-item--active" : ""}`} onClick={() => select(id)} key={id} aria-current={current === id ? "page" : undefined}><Icon size={19} /><span>{label}</span></button>)}
        </nav>
        <button className="sidebar__account" aria-label="Abrir perfil"><span className="avatar">RG</span><span><strong>Rafael Generoso</strong><small>Administrador</small></span><ChevronDown size={16} /></button>
      </aside>
    </>
  );
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <section className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</section>;
}

const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const dateLabel = (value: string) => value ? formatDate(value) : "Sem data";
const monthLabel = (value: string) => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T12:00:00Z`));

function DecimalInput({ value, onValueChange, ariaLabel, placeholder, allowNegative = false }: { value?: number; onValueChange: (value: number) => void; ariaLabel: string; placeholder?: string; allowNegative?: boolean }) {
  const display = (number?: number) => number === undefined ? "" : String(number).replace(".", ",");
  const [text, setText] = useState(display(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(display(value)); }, [value, editing]);
  const change = (next: string) => {
    const pattern = allowNegative ? /^-?\d*(?:[,.]\d*)?$/ : /^\d*(?:[,.]\d*)?$/;
    if (!pattern.test(next)) return;
    setText(next);
    const parsed = Number(next.replace(",", "."));
    onValueChange(Number.isFinite(parsed) ? parsed : 0);
  };
  return <input inputMode="decimal" aria-label={ariaLabel} value={text} placeholder={placeholder} onFocus={(event) => { setEditing(true); if (value === 0) setText(""); event.currentTarget.select(); }} onChange={(event) => change(event.target.value)} onBlur={() => { setEditing(false); setText(display(Number(text.replace(",", ".")) || 0)); }} />;
}

function OperationDate({ value, onChange, label = "Data da entrega" }: { value: string; onChange: (value: string) => void; label?: string }) {
  return <label className="operation-date"><CalendarDays size={17} /><span>{label}</span><input type="date" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

const exportPeriodOptions = (dates: string[]) => {
  const uniqueDates = Array.from(new Set(dates)).sort().reverse();
  const months = Array.from(new Set(uniqueDates.map((date) => date.slice(0, 7))));
  return { uniqueDates, months };
};

function Dashboard({ navigate, startNewOrder, orders, selectedDate, setSelectedDate, allocations, operationStages }: { navigate: Navigate; startNewOrder: () => void; orders: Order[]; selectedDate: string; setSelectedDate: (date: string) => void; allocations: PurchaseAllocation[]; operationStages: OperationStagesByDate }) {
  const currentOrders = orders.filter((order) => order.deliveryDate === selectedDate);
  const deliveryTitle = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${selectedDate}T12:00:00Z`));
  const stages = operationStages[selectedDate] ?? [currentOrders.length > 0, false, false, false];
  const currentStage = stages.findIndex((completed) => !completed);
  const stageClass = (index: number) => stages[index] ? "step step--done" : index === currentStage ? "step step--current" : "step";
  const stageStatus = (index: number) => stages[index] ? "Concluído" : index === currentStage ? "Em andamento" : "Aguardando";
  const salesTotal = currentOrders.reduce((sum, order) => sum + orderTotal(order), 0);
  const receivable = orders.filter((order) => order.paymentStatus !== "Pago").reduce((sum, order) => sum + orderTotal(order), 0);
  const debtors = orders.filter((order) => order.paymentStatus !== "Pago");
  const demand = new Map<string, { name: string; quantity: number; unit: Unit }>();
  currentOrders.forEach((order) => order.items.forEach((line) => {
    const current = demand.get(line.productId) ?? { name: line.name, quantity: 0, unit: line.unit };
    current.quantity += line.quantity;
    demand.set(line.productId, current);
  }));
  return (
    <>
      <PageTitle eyebrow={`OPERAÇÃO · ${dateLabel(selectedDate)}`} title="Visão geral da operação" description="Pedidos, compras, carregamento e valores pendentes em um só lugar." action={<OperationDate value={selectedDate} onChange={setSelectedDate} />} />
      <section className="operation-hero">
        <div className="operation-hero__copy"><div className="status-pill"><span /> Operação em andamento</div><h2>Entrega de {deliveryTitle}</h2><p>{currentOrders.length} pedidos estão confirmados. A demanda de compra foi gerada automaticamente e já pode ser dividida entre fornecedores.</p><div className="operation-hero__actions"><button className="light-button" onClick={() => navigate("operation")}><Truck size={18} />Abrir operação</button><button className="ghost-button" onClick={() => navigate("purchases")}>Ver demanda de compras<ArrowRight size={17} /></button></div></div>
        <div className="operation-steps" aria-label="Progresso da operação">
          <div className={stageClass(0)}><span><ClipboardList size={17} /></span><small>Pedidos</small><strong>{stages[0] ? `${currentOrders.length} confirmados` : stageStatus(0)}</strong></div><div className={`step-line ${stages[0] ? "step-line--done" : ""}`} />
          <div className={stageClass(1)}><span><ShoppingBasket size={17} /></span><small>Compras</small><strong>{stageStatus(1)}</strong></div><div className={`step-line ${stages[1] ? "step-line--done" : ""}`} />
          <div className={stageClass(2)}><span><PackageCheck size={17} /></span><small>Conferência</small><strong>{stageStatus(2)}</strong></div><div className={`step-line ${stages[2] ? "step-line--done" : ""}`} />
          <div className={stageClass(3)}><span><Truck size={17} /></span><small>Carregamento</small><strong>{stageStatus(3)}</strong></div>
        </div>
      </section>
      <section className="metrics-grid">
        <article className="metric-card"><div className="metric-icon metric-icon--green"><ReceiptText size={20} /></div><div><span>Vendido nesta entrega</span><strong>{money(salesTotal)}</strong><small>{currentOrders.length} pedidos</small></div></article>
        <article className="metric-card metric-card--attention"><div className="metric-icon metric-icon--orange"><WalletCards size={20} /></div><div><span>Total a receber</span><strong>{money(receivable)}</strong><small><b className="warning-text">{debtors.length} pedidos pendentes</b></small></div></article>
        <article className="metric-card"><div className="metric-icon metric-icon--blue"><ShoppingBasket size={20} /></div><div><span>Produtos para comprar</span><strong>{demand.size}</strong><small>Demanda consolidada</small></div></article>
        <article className="metric-card"><div className="metric-icon metric-icon--violet"><UsersRound size={20} /></div><div><span>Clientes na entrega</span><strong>{new Set(currentOrders.map((order) => order.customer)).size}</strong><small>Folhas individuais prontas</small></div></article>
      </section>
      <section className="content-grid">
        <article className="panel orders-panel"><div className="panel__header"><div><h3>Pedidos da próxima entrega</h3><p>Data e situação financeira visíveis para evitar misturas</p></div><button className="text-button" onClick={() => navigate("orders")}>Ver todos<ArrowRight size={16} /></button></div><div className="dashboard-orders"><div className="dashboard-order-head"><span>Pedido</span><span>Data</span><span>Cliente</span><span>Total</span><span>Pagamento</span></div>{currentOrders.slice(0, 4).map((order) => <button onClick={() => navigate("orders")} key={order.number}><strong>{order.number}</strong><span>{formatDate(order.date)}</span><span>{order.customer}</span><b>{money(orderTotal(order))}</b><i className={`payment-badge payment-badge--${order.paymentStatus.toLowerCase()}`}>{order.paymentStatus}</i></button>)}</div></article>
        <article className="panel purchase-panel"><div className="panel__header"><div><h3>Demanda automática</h3><p>Maiores volumes da entrega</p></div><button className="square-button" aria-label="Abrir compras" onClick={() => navigate("purchases")}><ArrowRight size={17} /></button></div><div className="purchase-list">{Array.from(demand.values()).slice(0, 4).map((line, index) => <div className="purchase-item" key={line.name}><div><strong>{line.name}</strong><span>{line.quantity} {line.unit}</span></div><div className="progress"><span style={{ width: `${78 - index * 14}%` }} /></div></div>)}</div><button className="purchase-alert" onClick={() => navigate("orders")}><CreditCard size={19} /><span><strong>{debtors.length} pedidos aguardam pagamento</strong><small>Confira recebimentos e formas de pagamento.</small></span><ChevronRight size={18} /></button></article>
      </section>
      <section className="quick-actions"><div className="section-heading"><h3>Acessos rápidos</h3><p>Continue de onde a operação precisa.</p></div><div className="quick-actions__grid"><button onClick={startNewOrder}><span><Plus size={20} /></span><div><strong>Novo pedido</strong><small>Colar texto ou inserir item a item</small></div><ChevronRight size={18} /></button><button onClick={() => printLoadSheet(currentOrders, allocations)}><span><Printer size={20} /></span><div><strong>Imprimir folha do CEASA</strong><small>Compra, separação e carregamento</small></div><ChevronRight size={18} /></button><button onClick={() => navigate("purchases")}><span><ShoppingBasket size={20} /></span><div><strong>Distribuir compras</strong><small>Escolher fornecedores e custos</small></div><ChevronRight size={18} /></button></div></section>
    </>
  );
}

function OrderForm({ order, nextNumber, navigate, onSave }: { order?: Order; nextNumber: string; navigate: Navigate; onSave: (order: Order) => void }) {
  const [customer, setCustomer] = useState(order?.customer ?? clients[0].name);
  const [date, setDate] = useState(order?.date ?? "2026-07-21");
  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate ?? "2026-07-22");
  const [items, setItems] = useState<OrderItem[]>(order?.items ?? []);
  const [adjustment, setAdjustment] = useState(order?.adjustment ?? 0);
  const [observation, setObservation] = useState(order?.observation ?? "");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order?.paymentStatus ?? "Pendente");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order?.paymentMethod ?? "Não informado");
  const [manualProductId, setManualProductId] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const matchingProducts = useMemo(() => {
    const query = normalizeSearch(manualQuery.trim());
    return products.filter((product) => !query || normalizeSearch(`${product.code} ${product.name}`).includes(query)).slice(0, 12);
  }, [manualQuery]);

  const addProduct = (productId: string, quantity = 1) => {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return;
    setItems((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (existing) return current.map((line) => line.id === existing.id ? { ...line, quantity: line.quantity + quantity } : line);
      return [...current, { id: `item-${Date.now()}-${productId}`, productId, name: product.name, quantity, unit: product.unit, unitPrice: product.saleReference }];
    });
  };
  const updateItem = (id: string, field: "quantity" | "unitPrice" | "confirmedWeight" | "unit", value: number | Unit) => setItems((current) => current.map((line) => line.id === id ? { ...line, [field]: value } : line));
  const interpretText = () => setParsedLines(parseOrderText(pasteText));
  const addParsedLines = () => {
    parsedLines.filter((line) => line.productId).forEach((line) => addProduct(line.productId, line.quantity));
    setParsedLines([]);
    setPasteText("");
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const saved: Order = { number: order?.number ?? nextNumber, date, deliveryDate, customer, items, adjustment, status: order?.status ?? "Confirmado", paymentStatus, paymentMethod, observation };
    onSave(saved);
    navigate("orders");
  };
  const draftOrder: Order = { number: order?.number ?? "Novo", date, deliveryDate, customer, items, adjustment, status: "Confirmado", paymentStatus, paymentMethod, observation };
  return (
    <>
      <PageTitle eyebrow={order ? `EDITANDO ${order.number}` : "NOVO PEDIDO"} title={order ? `Editar pedido de ${order.customer}` : "Incluir pedido"} description="Cole a mensagem do WhatsApp ou acrescente os produtos manualmente." action={<button className="secondary-button" onClick={() => navigate("orders")}><ArrowLeft size={17} />Voltar aos pedidos</button>} />
      <form className="form-layout order-form-layout" onSubmit={save}>
        <div className="order-form-main">
          <section className="panel form-card"><div className="form-section-title"><span>1</span><div><h2>Cliente e datas</h2><p>A data fica visível também na lista de pedidos.</p></div></div><div className="form-grid"><label>Cliente<select value={customer} onChange={(event) => setCustomer(event.target.value)}>{clients.map((client) => <option key={client.id}>{client.name}</option>)}</select></label><label>Data do pedido<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Data da entrega<input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} /></label><label>Situação do pagamento<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}><option>Pendente</option><option>Parcial</option><option>Pago</option></select></label></div></section>
          <section className="panel form-card import-card"><div className="form-section-title"><span>2</span><div><h2>Importar texto do WhatsApp</h2><p>Cole a mensagem do cliente, com um item por linha.</p></div></div><div className="paste-order"><div><MessageSquareText size={20} /><textarea aria-label="Texto do pedido recebido pelo WhatsApp" value={pasteText} onChange={(event) => setPasteText(event.target.value)} rows={6} /></div><button className="secondary-button" type="button" onClick={interpretText} disabled={!pasteText.trim()}><ClipboardCheck size={17} />Interpretar lista</button></div>{parsedLines.length > 0 && <div className="parsed-review"><div className="parsed-review__heading"><strong>Revise o que foi identificado</strong><span>Itens em amarelo precisam de confirmação.</span></div>{parsedLines.map((line) => <div className={line.needsReview ? "parsed-line parsed-line--review" : "parsed-line"} key={line.id}><span>{line.quantity}</span><code>{line.raw}</code><select aria-label={`Produto correspondente a ${line.raw}`} value={line.productId} onChange={(event) => setParsedLines((current) => current.map((candidate) => candidate.id === line.id ? { ...candidate, productId: event.target.value, needsReview: false } : candidate))}><option value="">Selecione o produto correto</option>{products.map((product) => <option value={product.id} key={product.id}>{product.code} · {product.name}</option>)}</select>{line.productId && !line.needsReview ? <CheckCircle2 size={18} /> : <span className="review-dot">!</span>}</div>)}<button className="primary-button" type="button" disabled={parsedLines.some((line) => !line.productId)} onClick={addParsedLines}><Plus size={17} />Adicionar itens revisados</button></div>}</section>
          <section className="panel form-card"><div className="form-section-title"><span>3</span><div><h2>Produtos do pedido</h2><p>Pesquise pelo nome ou número; a unidade vem do cadastro e continua editável.</p></div></div><div className="manual-add"><div className="product-combobox"><Search size={17} /><input role="combobox" aria-expanded={manualOpen} aria-controls="product-options" aria-label="Pesquisar produto" value={manualQuery} placeholder="Digite o nome ou número do produto" onFocus={() => setManualOpen(true)} onBlur={() => setTimeout(() => setManualOpen(false), 120)} onChange={(event) => { setManualQuery(event.target.value); setManualProductId(""); setManualOpen(true); }} />{manualOpen && <div className="product-options" id="product-options" role="listbox">{matchingProducts.length ? matchingProducts.map((product) => <button type="button" role="option" aria-selected={manualProductId === product.id} key={product.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setManualProductId(product.id); setManualQuery(product.name); setManualOpen(false); }}><span><small>{product.code}</small><strong>{product.name}</strong></span><b>{money(product.saleReference)}/{product.unit}</b></button>) : <div className="product-option-empty">Nenhum produto cadastrado encontrado.</div>}</div>}</div><button className="secondary-button" type="button" disabled={!manualProductId} onClick={() => { addProduct(manualProductId); setManualProductId(""); setManualQuery(""); }}><Plus size={17} />Adicionar produto</button></div>{items.length ? <div className="line-editor"><div className="line-editor__head"><span>Produto</span><span>Qtd.</span><span>Un.</span><span>Valor unitário</span><span>Total</span><span>Peso conf.</span><span /></div>{items.map((line) => <div className="line-editor__row" key={line.id}><div><strong>{line.name}</strong><small>Referência do cadastro</small></div><DecimalInput ariaLabel={`Quantidade de ${line.name}`} value={line.quantity} onValueChange={(value) => updateItem(line.id, "quantity", value)} /><select aria-label={`Unidade de ${line.name}`} value={line.unit} onChange={(event) => updateItem(line.id, "unit", event.target.value as Unit)}><option>kg</option><option>cx</option><option>un</option><option>maço</option></select><DecimalInput ariaLabel={`Valor unitário de ${line.name}`} value={line.unitPrice} onValueChange={(value) => updateItem(line.id, "unitPrice", value)} /><strong>{money(line.quantity * line.unitPrice)}</strong><DecimalInput ariaLabel={`Peso conferido de ${line.name}`} value={line.confirmedWeight} placeholder="Depois" onValueChange={(value) => updateItem(line.id, "confirmedWeight", value)} /><button className="icon-button danger-icon" type="button" aria-label={`Remover ${line.name}`} onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== line.id))}><Trash2 size={17} /></button></div>)}</div> : <div className="empty-state"><PackageOpen size={24} /><strong>Nenhum produto incluído</strong><span>Cole a mensagem do cliente ou escolha um produto acima.</span></div>}</section>
        </div>
        <aside className="panel order-summary order-summary--complete"><h2>Resumo do pedido</h2><p>{order ? order.number : "Numeração automática ao salvar"}</p><div className="summary-client"><UsersRound size={18} /><div><small>Cliente</small><strong>{customer}</strong></div></div><div className="summary-figures"><div><span>Produtos</span><strong>{items.length}</strong></div><div><span>Subtotal</span><strong>{money(orderSubtotal(draftOrder))}</strong></div></div><label className="summary-field">Ajuste no valor total<DecimalInput ariaLabel="Ajuste no valor total" value={adjustment} allowNegative onValueChange={setAdjustment} /><small>Use valor positivo para acréscimo e negativo para desconto.</small></label><label className="summary-field">Forma de pagamento<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}><option>Não informado</option><option>Pix</option><option>Dinheiro</option><option>Boleto</option><option>Transferência</option></select></label><label className="summary-field">Observações<textarea rows={4} value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Alterações, combinações e advertências..." /></label><div className="summary-total"><span>Total do pedido</span><strong>{money(orderTotal(draftOrder))}</strong></div><button className="primary-button primary-button--wide" type="submit" disabled={!items.length}><Save size={18} />{order ? "Salvar alterações" : "Finalizar pedido"}</button>{order && <button className="secondary-button print-summary-button" type="button" onClick={() => printOrder(draftOrder)}><Printer size={17} />Imprimir pedido</button>}<small className="summary-note">Demonstração: alterações ficam apenas nesta sessão.</small></aside>
      </form>
    </>
  );
}

function OrdersPage({ orders, saved, startNewOrder, editOrder, updatePayment, updatePaymentMethod }: { orders: Order[]; saved: boolean; startNewOrder: () => void; editOrder: (order: Order) => void; updatePayment: (number: string, status: PaymentStatus) => void; updatePaymentMethod: (number: string, method: PaymentMethod) => void }) {
  const [periodFilter, setPeriodFilter] = useState("Todos");
  const [clientFilter, setClientFilter] = useState("Todos");
  const [paymentFilter, setPaymentFilter] = useState("Todos");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const { uniqueDates, months } = exportPeriodOptions(orders.map((order) => order.date));
  const visible = orders.filter((order) => {
    const periodMatches = periodFilter === "Todos" || (periodFilter.startsWith("date:") ? order.date === periodFilter.slice(5) : order.date.startsWith(periodFilter.slice(6)));
    return periodMatches && (clientFilter === "Todos" || order.customer === clientFilter) && (paymentFilter === "Todos" || order.paymentStatus === paymentFilter) && (!normalizedQuery || order.number.toLowerCase().includes(normalizedQuery) || order.customer.toLowerCase().includes(normalizedQuery));
  });
  const total = visible.reduce((sum, order) => sum + orderTotal(order), 0);
  const pending = visible.filter((order) => order.paymentStatus !== "Pago").reduce((sum, order) => sum + orderTotal(order), 0);
  const reportHeaders = ["Pedido", "Data", "Entrega", "Cliente", "Itens", "Total", "Pagamento", "Forma", "Observação"];
  const reportRows = visible.map((order) => [order.number, formatDate(order.date), formatDate(order.deliveryDate), order.customer, order.items.length, orderTotal(order).toFixed(2).replace(".", ","), order.paymentStatus, order.paymentMethod, order.observation]);
  const exportLabel = periodFilter === "Todos" ? "todos-os-periodos" : periodFilter.replace(":", "-");
  return (
    <>
      <PageTitle eyebrow="VENDAS E RECEBIMENTOS" title="Pedidos" description="Histórico por data, cliente, valor e situação de pagamento." action={<div className="heading-actions"><button className="secondary-button" onClick={() => downloadCsv(`pedidos-${exportLabel}.csv`, reportHeaders, reportRows)}><Download size={17} />Excel (.csv)</button><button className="secondary-button" onClick={() => printTableReport("Relatório de pedidos", `${visible.length} pedido(s) exibido(s)`, reportHeaders, reportRows)}><FileText size={17} />PDF</button><button className="primary-button" onClick={startNewOrder}><Plus size={18} />Novo pedido</button></div>} />
      {saved && <div className="success-banner"><CheckCircle2 size={20} /><div><strong>Pedido salvo com sucesso</strong><span>Ele pode ser impresso ou editado a qualquer momento nesta sessão.</span></div></div>}
      <section className="summary-strip"><div><span>Pedidos exibidos</span><strong>{visible.length}</strong></div><div><span>Total vendido</span><strong>{money(total)}</strong></div><div className="summary-strip__warning"><span>A receber</span><strong>{money(pending)}</strong></div></section>
      <section className="panel list-panel"><div className="list-toolbar"><div className="inline-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedido ou cliente..." /></div><label className="compact-filter">Período<select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}><option>Todos</option><optgroup label="Meses">{months.map((month) => <option value={`month:${month}`} key={month}>{monthLabel(month)}</option>)}</optgroup><optgroup label="Dias">{uniqueDates.map((date) => <option value={`date:${date}`} key={date}>{formatDate(date)}</option>)}</optgroup></select></label><label className="compact-filter">Cliente<select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option>Todos</option>{Array.from(new Set(orders.map((order) => order.customer))).sort().map((client) => <option key={client}>{client}</option>)}</select></label><label className="compact-filter">Pagamento<select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option>Todos</option><option>Pendente</option><option>Parcial</option><option>Pago</option></select></label></div><div className="sales-table"><div className="sales-table__head"><span>Pedido</span><span>Data</span><span>Cliente</span><span>Itens</span><span>Total</span><span>Pagamento</span><span>Forma</span><span>Ações</span></div>{visible.map((order) => <div className="sales-table__row" key={order.number}><strong>{order.number}</strong><span>{formatDate(order.date)}</span><span><b>{order.customer}</b><small>{order.observation || "Sem observações"}</small></span><span>{order.items.length}</span><strong>{money(orderTotal(order))}</strong><select aria-label={`Pagamento do pedido ${order.number}`} value={order.paymentStatus} onChange={(event) => updatePayment(order.number, event.target.value as PaymentStatus)}><option>Pendente</option><option>Parcial</option><option>Pago</option></select><select aria-label={`Forma de pagamento do pedido ${order.number}`} value={order.paymentMethod} onChange={(event) => updatePaymentMethod(order.number, event.target.value as PaymentMethod)}><option>Não informado</option><option>Pix</option><option>Dinheiro</option><option>Boleto</option><option>Transferência</option></select><div className="row-actions"><button aria-label={`Imprimir ${order.number}`} onClick={() => printOrder(order)}><Printer size={16} /></button><button aria-label={`Editar ${order.number}`} onClick={() => editOrder(order)}><Edit3 size={16} /></button></div></div>)}</div>{!visible.length && <div className="empty-table">Nenhum pedido encontrado com esses filtros.</div>}</section>
    </>
  );
}

function OperationPage({ orders, editOrder, selectedDate, setSelectedDate, allocations, operationStages, setOperationStages }: { orders: Order[]; editOrder: (order: Order) => void; selectedDate: string; setSelectedDate: (date: string) => void; allocations: PurchaseAllocation[]; operationStages: OperationStagesByDate; setOperationStages: Dispatch<SetStateAction<OperationStagesByDate>> }) {
  const currentOrders = orders.filter((order) => order.deliveryDate === selectedDate);
  const stages = operationStages[selectedDate] ?? [currentOrders.length > 0, false, false, false];
  const toggleStage = (index: number) => setOperationStages((current) => ({ ...current, [selectedDate]: stages.map((value, stageIndex) => stageIndex === index ? !value : value) }));
  return (
    <>
      <PageTitle eyebrow={`ENTREGA · ${dateLabel(selectedDate)}`} title="Operação do dia" description="Do pedido recebido até a conferência final do carregamento." action={<div className="heading-actions"><OperationDate value={selectedDate} onChange={setSelectedDate} /><button className="primary-button" onClick={() => printLoadSheet(currentOrders, allocations)} disabled={!currentOrders.length}><Printer size={17} />Imprimir folha do CEASA</button></div>} />
      <section className="operation-summary-grid"><article className="panel operation-progress-card"><div className="status-pill status-pill--light"><span /> Operação em andamento</div><h2>{stages.filter(Boolean).length} de 4 etapas concluídas</h2><p>A separação funciona como conferência: se algo faltar, o pedido pode ser editado antes do carregamento.</p><div className="big-progress"><span style={{ width: `${stages.filter(Boolean).length * 25}%` }} /></div><small>{stages.filter(Boolean).length * 25}% concluído</small></article><article className="panel route-card"><div className="metric-icon metric-icon--orange"><Route size={21} /></div><div><small>Folha operacional</small><strong>{currentOrders.length} pedidos · {new Set(currentOrders.map((order) => order.customer)).size} clientes</strong><span>Totais por produto, fornecedor e cliente</span></div><button className="square-button" aria-label="Imprimir folha" disabled={!currentOrders.length} onClick={() => printLoadSheet(currentOrders, allocations)}><Printer size={17} /></button></article></section>
      <section className="operation-board">{[{ icon: ClipboardCheck, title: "Pedidos recebidos", detail: `${currentOrders.length} confirmados` }, { icon: ShoppingBasket, title: "Compras", detail: "Distribuir por fornecedor" }, { icon: PackageCheck, title: "Separação e conferência", detail: "Confirmar faltas e pesos" }, { icon: Truck, title: "Carregamento", detail: "Conferir antes da saída" }].map((stage, index) => <button className={`operation-stage ${stages[index] ? "operation-stage--done" : ""}`} onClick={() => toggleStage(index)} key={stage.title}><span className="stage-check">{stages[index] ? <Check size={17} /> : index + 1}</span><stage.icon size={22} /><div><strong>{stage.title}</strong><small>{stage.detail}</small></div><ChevronRight size={18} /></button>)}</section>
      <section className="panel operation-orders"><div className="panel__header"><div><h3>Pedidos para separar e carregar</h3><p>Imprima individualmente ou edite quando faltar algum produto.</p></div></div>{currentOrders.map((order) => <div className="operation-order-row" key={order.number}><span className="sequence-number">{order.number.replace("#", "")}</span><div><strong>{order.customer}</strong><small>{order.items.length} produtos · {money(orderTotal(order))}</small></div><b>{order.status}</b><button className="secondary-button" onClick={() => printOrder(order)}><Printer size={15} />Folha individual</button><button className="square-button" aria-label={`Editar ${order.number}`} onClick={() => editOrder(order)}><Edit3 size={16} /></button></div>)}</section>
    </>
  );
}

function PurchasesPage({ orders, selectedDate, setSelectedDate, allocations, setAllocations }: { orders: Order[]; selectedDate: string; setSelectedDate: (date: string) => void; allocations: PurchaseAllocation[]; setAllocations: Dispatch<SetStateAction<PurchaseAllocation[]>> }) {
  const [tab, setTab] = useState<"demand" | "history">("demand");
  const [historyPeriod, setHistoryPeriod] = useState("Todos");
  const [historySupplier, setHistorySupplier] = useState("Todos");
  const currentOrders = orders.filter((order) => order.deliveryDate === selectedDate);
  const demand = useMemo(() => {
    const grouped = new Map<string, { productId: string; name: string; unit: Unit; total: number; customers: string[] }>();
    currentOrders.forEach((order) => order.items.forEach((line) => {
      const current = grouped.get(line.productId) ?? { productId: line.productId, name: line.name, unit: line.unit, total: 0, customers: [] };
      current.total += line.quantity;
      current.customers.push(`${order.customer}: ${line.quantity} ${line.unit}`);
      grouped.set(line.productId, current);
    }));
    return Array.from(grouped.values());
  }, [currentOrders]);
  const currentAllocations = allocations.filter((allocation) => allocation.deliveryDate === selectedDate);
  const addAllocation = (productId: string) => setAllocations((current) => [...current, { id: `allocation-${Date.now()}`, deliveryDate: selectedDate, productId, supplierId: suppliers[0].id, quantity: 0, unitCost: products.find((product) => product.id === productId)?.costReference ?? 0 }]);
  const updateAllocation = (id: string, field: "supplierId" | "quantity" | "unitCost", value: string | number) => setAllocations((current) => current.map((allocation) => allocation.id === id ? { ...allocation, [field]: value } : allocation));
  const [purchaseHistory, setPurchaseHistory] = useState([
    { number: "C-208", date: "2026-07-21", supplier: "Sítio Boa Colheita", total: 1280, status: "Pendente" },
    { number: "C-207", date: "2026-07-21", supplier: "Distribuidora Vale Verde", total: 2435, status: "Pago" },
    { number: "C-206", date: "2026-07-20", supplier: "Cooperativa Nova Safra", total: 1860, status: "Parcial" },
    { number: "C-205", date: "2026-07-19", supplier: "Sítio Boa Colheita", total: 940, status: "Pago" },
  ]);
  const historyOptions = exportPeriodOptions(purchaseHistory.map((purchase) => purchase.date));
  const visiblePurchaseHistory = purchaseHistory.filter((purchase) => {
    const periodMatches = historyPeriod === "Todos" || (historyPeriod.startsWith("date:") ? purchase.date === historyPeriod.slice(5) : purchase.date.startsWith(historyPeriod.slice(6)));
    return periodMatches && (historySupplier === "Todos" || purchase.supplier === historySupplier);
  });
  const allocatedCost = currentAllocations.reduce((sum, allocation) => sum + allocation.quantity * allocation.unitCost, 0);
  const purchaseHeaders = ["Compra", "Data", "Fornecedor", "Total", "Pagamento"];
  const purchaseRows = visiblePurchaseHistory.map((purchase) => [purchase.number, formatDate(purchase.date), purchase.supplier, purchase.total.toFixed(2).replace(".", ","), purchase.status]);
  return (
    <>
      <PageTitle eyebrow={`COMPRAS · ENTREGA ${dateLabel(selectedDate)}`} title="Compras" description="Demanda automática dos pedidos, divisão por fornecedor e histórico de pagamentos." action={<div className="heading-actions"><OperationDate value={selectedDate} onChange={setSelectedDate} /><button className="secondary-button" onClick={() => printLoadSheet(currentOrders, allocations)} disabled={!currentOrders.length}><Printer size={17} />Imprimir folha operacional</button></div>} />
      <div className="page-tabs"><button className={tab === "demand" ? "page-tab--active" : ""} onClick={() => setTab("demand")}><ShoppingBasket size={17} />Demanda desta entrega</button><button className={tab === "history" ? "page-tab--active" : ""} onClick={() => setTab("history")}><ReceiptText size={17} />Histórico e pagamentos</button></div>
      {tab === "demand" ? <><section className="summary-strip"><div><span>Produtos diferentes</span><strong>{demand.length}</strong></div><div><span>Custo planejado</span><strong>{money(allocatedCost)}</strong></div><div><span>Fornecedores usados</span><strong>{new Set(currentAllocations.filter((allocation) => allocation.quantity > 0).map((allocation) => allocation.supplierId)).size}</strong></div></section><section className="demand-list">{demand.map((line) => { const productAllocations = currentAllocations.filter((allocation) => allocation.productId === line.productId); const allocated = productAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0); return <article className="panel demand-card" key={line.productId}><div className="demand-card__summary"><div className="product-symbol"><PackageOpen size={19} /></div><div><strong>{line.name}</strong><span>{line.customers.join(" · ")}</span></div><div><small>Demanda total</small><b>{line.total} {line.unit}</b></div><div><small>Já distribuído</small><b className={allocated < line.total ? "warning-text" : "success-text"}>{allocated} {line.unit}</b></div></div><div className="allocation-list">{productAllocations.map((allocation) => <div className="allocation-row" key={allocation.id}><select aria-label={`Fornecedor de ${line.name}`} value={allocation.supplierId} onChange={(event) => updateAllocation(allocation.id, "supplierId", event.target.value)}>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select><label>Quantidade<DecimalInput ariaLabel={`Quantidade comprada de ${line.name}`} value={allocation.quantity} onValueChange={(value) => updateAllocation(allocation.id, "quantity", value)} /></label><label>Custo por {line.unit}<DecimalInput ariaLabel={`Custo de ${line.name}`} value={allocation.unitCost} onValueChange={(value) => updateAllocation(allocation.id, "unitCost", value)} /></label><strong>{money(allocation.quantity * allocation.unitCost)}</strong><button className="icon-button danger-icon" aria-label="Remover divisão" onClick={() => setAllocations((current) => current.filter((candidate) => candidate.id !== allocation.id))}><Trash2 size={16} /></button></div>)}</div><button className="text-button add-allocation" onClick={() => addAllocation(line.productId)}><Plus size={16} />Comprar parte em outro fornecedor</button></article>; })}{!demand.length && <div className="panel empty-table">Não há pedidos para a data selecionada.</div>}</section></> : <><section className="summary-strip"><div><span>Compras exibidas</span><strong>{visiblePurchaseHistory.length}</strong></div><div><span>Total comprado</span><strong>{money(visiblePurchaseHistory.reduce((sum, purchase) => sum + purchase.total, 0))}</strong></div><div className="summary-strip__warning"><span>A pagar</span><strong>{money(visiblePurchaseHistory.filter((purchase) => purchase.status !== "Pago").reduce((sum, purchase) => sum + purchase.total, 0))}</strong></div></section><section className="panel list-panel"><div className="list-toolbar"><label className="compact-filter">Período<select value={historyPeriod} onChange={(event) => setHistoryPeriod(event.target.value)}><option>Todos</option><optgroup label="Meses">{historyOptions.months.map((month) => <option value={`month:${month}`} key={month}>{monthLabel(month)}</option>)}</optgroup><optgroup label="Dias">{historyOptions.uniqueDates.map((date) => <option value={`date:${date}`} key={date}>{formatDate(date)}</option>)}</optgroup></select></label><label className="compact-filter">Fornecedor<select value={historySupplier} onChange={(event) => setHistorySupplier(event.target.value)}><option>Todos</option>{Array.from(new Set(purchaseHistory.map((purchase) => purchase.supplier))).map((supplier) => <option key={supplier}>{supplier}</option>)}</select></label><div className="toolbar-spacer" /><button className="secondary-button" onClick={() => downloadCsv("compras-fornecedores.csv", purchaseHeaders, purchaseRows)}><Download size={16} />Excel (.csv)</button><button className="secondary-button" onClick={() => printTableReport("Relatório de compras", `${visiblePurchaseHistory.length} compra(s) exibida(s)`, purchaseHeaders, purchaseRows)}><FileText size={16} />PDF</button></div><div className="purchase-history"><div className="purchase-history__head"><span>Compra</span><span>Data</span><span>Fornecedor</span><span>Total</span><span>Pagamento</span><span /></div>{visiblePurchaseHistory.map((purchase) => <div key={purchase.number}><strong>{purchase.number}</strong><span>{formatDate(purchase.date)}</span><b>{purchase.supplier}</b><strong>{money(purchase.total)}</strong><select aria-label={`Pagamento da compra ${purchase.number}`} value={purchase.status} onChange={(event) => setPurchaseHistory((current) => current.map((candidate) => candidate.number === purchase.number ? { ...candidate, status: event.target.value } : candidate))}><option>Pendente</option><option>Parcial</option><option>Pago</option></select><button className="square-button" aria-label={`Abrir ${purchase.number}`}><ChevronRight size={16} /></button></div>)}</div>{!visiblePurchaseHistory.length && <div className="empty-table">Nenhuma compra encontrada com esses filtros.</div>}</section></>}
    </>
  );
}

type RegistryRecord = { id: string; name: string; contact: string; phone: string; address: string; city: string; observation: string; code: string; category: string; unit: Unit; cost: number; sale: number };

function RegistryPage({ type }: { type: "clients" | "products" | "suppliers" }) {
  const initialRecords: RegistryRecord[] = type === "clients"
    ? clients.map((client) => ({ id: client.id, name: client.name, contact: client.contact, phone: client.phone, address: client.address, city: client.city, observation: client.observation, code: "", category: "", unit: "un", cost: 0, sale: 0 }))
    : type === "products"
      ? products.map((product) => ({ id: product.id, name: product.name, contact: "", phone: "", address: "", city: "", observation: "", code: product.code, category: product.category, unit: product.unit, cost: product.costReference, sale: product.saleReference }))
      : suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name, contact: supplier.contact, phone: supplier.phone, address: supplier.address, city: supplier.city, observation: supplier.observation, code: "", category: supplier.categories, unit: "un", cost: 0, sale: 0 }));
  const [records, setRecords] = useState(initialRecords);
  const [editing, setEditing] = useState<RegistryRecord | null>(null);
  const [query, setQuery] = useState("");
  const config = { clients: { title: "Clientes", description: "Empresas atendidas, contatos e histórico de pedidos.", button: "Novo cliente", icon: UserPlus }, products: { title: "Produtos", description: "Catálogo sem estoque, com custo e venda de referência.", button: "Novo produto", icon: Plus }, suppliers: { title: "Fornecedores", description: "Parceiros de compra, categorias e dias de entrega.", button: "Novo fornecedor", icon: Plus } }[type];
  const Icon = config.icon;
  const openEditor = (record?: RegistryRecord) => setEditing(record ?? { id: `new-${Date.now()}`, name: "", contact: "", phone: "", address: "", city: "", observation: "", code: "", category: "", unit: "un", cost: 0, sale: 0 });
  const updateDraft = <K extends keyof RegistryRecord,>(field: K, value: RegistryRecord[K]) => setEditing((current) => current ? { ...current, [field]: value } : current);
  const saveRecord = () => {
    if (!editing || !editing.name.trim()) return;
    const updated = { ...editing, name: editing.name.trim() };
    setRecords((current) => current.some((record) => record.id === updated.id) ? current.map((record) => record.id === updated.id ? updated : record) : [updated, ...current]);
    setEditing(null);
  };
  return (
    <>
      <PageTitle eyebrow="CADASTROS" title={config.title} description={config.description} action={<button className="primary-button" onClick={() => openEditor()}><Icon size={18} />{config.button}</button>} />
      {editing && <section className="panel registry-editor"><div className="registry-editor__heading"><div><strong>{records.some((record) => record.id === editing.id) ? "Editar cadastro" : "Novo cadastro"}</strong><span>Preencha os dados operacionais que serão consultados nos pedidos.</span></div><button className="icon-button" aria-label="Fechar cadastro" onClick={() => setEditing(null)}><X size={18} /></button></div><div className="registry-editor__grid"><label className="registry-field registry-field--wide">{type === "products" ? "Produto" : type === "clients" ? "Nome do cliente" : "Nome do fornecedor"}<input value={editing.name} onChange={(event) => updateDraft("name", event.target.value)} autoFocus /></label>{type === "products" ? <><label className="registry-field">Número do produto<input value={editing.code} inputMode="numeric" onChange={(event) => updateDraft("code", event.target.value)} placeholder="Ex.: 010" /></label><label className="registry-field">Categoria<input value={editing.category} onChange={(event) => updateDraft("category", event.target.value)} /></label><label className="registry-field">Unidade<select value={editing.unit} onChange={(event) => updateDraft("unit", event.target.value as Unit)}><option>kg</option><option>cx</option><option>un</option><option>maço</option></select></label><label className="registry-field">Custo de referência<DecimalInput ariaLabel="Custo de referência" value={editing.cost} onValueChange={(value) => updateDraft("cost", value)} /></label><label className="registry-field">Venda de referência<DecimalInput ariaLabel="Venda de referência" value={editing.sale} onValueChange={(value) => updateDraft("sale", value)} /></label></> : <><label className="registry-field">Nome de contato<input value={editing.contact} onChange={(event) => updateDraft("contact", event.target.value)} /></label><label className="registry-field">Telefone<input value={editing.phone} inputMode="tel" onChange={(event) => updateDraft("phone", event.target.value)} /></label><label className="registry-field registry-field--wide">Endereço<input value={editing.address} onChange={(event) => updateDraft("address", event.target.value)} /></label><label className="registry-field">Cidade<input value={editing.city} onChange={(event) => updateDraft("city", event.target.value)} /></label><label className="registry-field registry-field--full">Observação<textarea rows={3} value={editing.observation} onChange={(event) => updateDraft("observation", event.target.value)} /></label></>}</div><div className="registry-editor__actions"><button className="secondary-button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" onClick={saveRecord} disabled={!editing.name.trim()}><Save size={17} />Salvar cadastro</button></div></section>}
      <section className="panel list-panel"><div className="list-toolbar"><div className="inline-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${config.title.toLowerCase()}...`} /></div><button className="secondary-button"><ListFilter size={16} />Ordenar</button></div><div className={`registry-cards registry-cards--${type}`}>{records.filter((record) => normalizeSearch(`${record.code} ${record.name} ${record.contact}`).includes(normalizeSearch(query.trim()))).map((record) => <article key={record.id}><div className="registry-card-icon">{type === "clients" ? <UsersRound size={20} /> : type === "products" ? <PackageOpen size={20} /> : <Store size={20} />}</div><div className="registry-card-copy">{type === "products" ? <><small>Nº {record.code || "—"} · {record.category || "Sem categoria"}</small><h3>{record.name}</h3><p>Unidade: {record.unit}</p><span>Sem controle de estoque</span><div className="reference-prices"><b>Custo: {money(record.cost)}</b><b>Venda: {money(record.sale)}</b></div></> : <><small>{record.contact || "Contato não informado"}</small><h3>{record.name}</h3><p>{record.phone || "Telefone não informado"}</p><span>{[record.address, record.city].filter(Boolean).join(" · ") || "Endereço não informado"}</span>{record.observation && <em>{record.observation}</em>}</>}</div><div className="registry-card-actions"><button aria-label={`Editar ${record.name}`} onClick={() => openEditor(record)}><Edit3 size={16} /></button><button className="danger-icon" aria-label={`Excluir ${record.name}`} onClick={() => setRecords((current) => current.filter((candidate) => candidate.id !== record.id))}><Trash2 size={16} /></button></div></article>)}</div></section>
    </>
  );
}

const defaultOperationDate = (orders: Order[]) => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dates = Array.from(new Set(orders.map((order) => order.deliveryDate))).sort();
  if (dates.includes(today)) return today;
  const pastDates = dates.filter((date) => date <= today);
  return pastDates[pastDates.length - 1] ?? dates[dates.length - 1] ?? today;
};

const makeInitialAllocations = (orders: Order[]): PurchaseAllocation[] => {
  const grouped = new Map<string, { deliveryDate: string; productId: string; quantity: number }>();
  orders.forEach((order) => order.items.forEach((line) => {
    const key = `${order.deliveryDate}:${line.productId}`;
    const current = grouped.get(key) ?? { deliveryDate: order.deliveryDate, productId: line.productId, quantity: 0 };
    current.quantity += line.quantity;
    grouped.set(key, current);
  }));
  return Array.from(grouped.values()).map((line, index) => ({ id: `allocation-${line.deliveryDate}-${line.productId}`, deliveryDate: line.deliveryDate, productId: line.productId, supplierId: suppliers[index % suppliers.length].id, quantity: line.quantity, unitCost: products.find((product) => product.id === line.productId)?.costReference ?? 0 }));
};

const makeInitialOperationStages = (orders: Order[]): OperationStagesByDate => {
  const currentDate = defaultOperationDate(orders);
  return Object.fromEntries(Array.from(new Set(orders.map((order) => order.deliveryDate))).map((date) => [date, date < currentDate ? [true, true, true, true] : [true, false, false, false]]));
};

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<ViewId>(viewFromHash);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [editingOrder, setEditingOrder] = useState<Order | undefined>();
  const [savedOrder, setSavedOrder] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [selectedDate, setSelectedDate] = useState(() => defaultOperationDate(initialOrders));
  const [allocations, setAllocations] = useState<PurchaseAllocation[]>(() => makeInitialAllocations(initialOrders));
  const [operationStages, setOperationStages] = useState<OperationStagesByDate>(() => makeInitialOperationStages(initialOrders));

  useEffect(() => { document.documentElement.dataset.theme = theme; try { window.localStorage.setItem("zeca-hortifruti-theme", theme); } catch (_) { /* preference remains active for this session */ } }, [theme]);
  useEffect(() => { const handleHash = () => setView(viewFromHash()); window.addEventListener("hashchange", handleHash); if (!window.location.hash) window.history.replaceState(null, "", "#/inicio"); return () => window.removeEventListener("hashchange", handleHash); }, []);
  const navigate: Navigate = (next) => { setView(next); if (next !== "orders") setSavedOrder(false); window.history.pushState(null, "", `#/${routes[next]}`); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const startNewOrder = () => { setEditingOrder(undefined); navigate("order-form"); };
  const editOrder = (order: Order) => { setEditingOrder(order); navigate("order-form"); };
  const saveOrder = (order: Order) => { setOrders((current) => [order, ...current.filter((item) => item.number !== order.number)]); setSavedOrder(true); setEditingOrder(order); };
  const updatePayment = (number: string, status: PaymentStatus) => setOrders((current) => current.map((order) => order.number === number ? { ...order, paymentStatus: status } : order));
  const updatePaymentMethod = (number: string, method: PaymentMethod) => setOrders((current) => current.map((order) => order.number === number ? { ...order, paymentMethod: method } : order));
  const nextOrderNumber = `#${Math.max(...orders.map((order) => Number(order.number.replace(/\D/g, "")) || 0), 1048) + 1}`;
  let content: ReactNode;
  if (view === "dashboard") content = <Dashboard navigate={navigate} startNewOrder={startNewOrder} orders={orders} selectedDate={selectedDate} setSelectedDate={setSelectedDate} allocations={allocations} operationStages={operationStages} />;
  else if (view === "order-form") content = <OrderForm key={editingOrder?.number ?? "new-order"} order={editingOrder} nextNumber={nextOrderNumber} navigate={navigate} onSave={saveOrder} />;
  else if (view === "orders") content = <OrdersPage orders={orders} saved={savedOrder} startNewOrder={startNewOrder} editOrder={editOrder} updatePayment={updatePayment} updatePaymentMethod={updatePaymentMethod} />;
  else if (view === "operation") content = <OperationPage orders={orders} editOrder={editOrder} selectedDate={selectedDate} setSelectedDate={setSelectedDate} allocations={allocations} operationStages={operationStages} setOperationStages={setOperationStages} />;
  else if (view === "purchases") content = <PurchasesPage orders={orders} selectedDate={selectedDate} setSelectedDate={setSelectedDate} allocations={allocations} setAllocations={setAllocations} />;
  else content = <RegistryPage key={view} type={view} />;
  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} close={() => setMenuOpen(false)} current={view} navigate={navigate} startNewOrder={startNewOrder} />
      <main className="main-content"><header className="topbar"><div className="topbar__left"><button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button><div className="search-box"><Search size={18} /><input aria-label="Pesquisar" placeholder="Buscar pedido, cliente ou produto..." /><kbd>⌘ K</kbd></div></div><div className="topbar__actions"><button className="icon-button theme-button" type="button" aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} aria-pressed={theme === "dark"} title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button><button className="icon-button notification-button" aria-label="Notificações"><Bell size={20} /><span /></button><button className="primary-button" onClick={startNewOrder}><Plus size={18} />Novo pedido</button></div></header><div className="demo-banner" role="status"><Leaf size={15} /><strong>Ambiente demonstrativo</strong><span>Todos os nomes, valores e registros apresentados são fictícios.</span></div><div className="page">{content}</div></main>
      <nav className="mobile-nav" aria-label="Navegação móvel"><button className={view === "dashboard" ? "mobile-nav__active" : ""} onClick={() => navigate("dashboard")}><LayoutDashboard size={21} /><span>Início</span></button><button className={view === "orders" ? "mobile-nav__active" : ""} onClick={() => navigate("orders")}><ClipboardList size={21} /><span>Pedidos</span></button><button className="mobile-create" aria-label="Novo pedido" onClick={startNewOrder}><Plus size={25} /></button><button className={view === "operation" ? "mobile-nav__active" : ""} onClick={() => navigate("operation")}><Truck size={21} /><span>Operação</span></button><button onClick={() => setMenuOpen(true)}><Menu size={21} /><span>Mais</span></button></nav>
    </div>
  );
}

export default App;
