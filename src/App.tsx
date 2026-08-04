import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Boxes,
  Building2,
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
  LogOut,
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
  ShieldCheck,
  ShoppingBasket,
  Store,
  Sun,
  Trash2,
  Truck,
  TrendingUp,
  UserPlus,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  buildPurchaseHistory,
  clients as demoClients,
  defaultCompanyProfile,
  downloadCsv,
  downloadLoadingDayCsv,
  downloadPurchaseDayCsv,
  downloadSupplierDayCsv,
  formatDate,
  initialOrders,
  initialPurchases,
  money,
  orderSubtotal,
  orderTotal,
  parseOrderText,
  parseProductList,
  productUnits,
  printCompactOrdersReport,
  printLoadingSheet,
  printLoadSheet,
  printOrder,
  printPurchaseSheet,
  printSupplierDaySheet,
  printTableReport,
  products as demoProducts,
  suppliers as demoSuppliers,
  type Client,
  type CompanyProfile,
  type Order,
  type OperationDay,
  type OrderItem,
  type ParsedLine,
  type PaymentMethod,
  type PaymentStatus,
  type Product,
  type PurchaseAllocation,
  type PurchaseRecord,
  type ServiceProvider,
  type ServiceProviderPayment,
  type ServiceProviderPaymentMethod,
  type Supplier,
  type Unit,
} from "./domain";
import {
  deleteFirestoreRecord,
  firebaseConfigured,
  observeAuth,
  saveFirestoreRecord,
  saveFirestoreRecords,
  seedFirestore,
  signInWithGoogle,
  signOutFirebase,
  subscribeToCollection,
  verifyAuthorizedUser,
  type AuthorizationResult,
  type FirebaseUser,
} from "./firebase";

type ViewId = "dashboard" | "analytics" | "order-form" | "orders" | "operation" | "purchases" | "provider-payments" | "clients" | "products" | "suppliers" | "providers" | "company";
type Theme = "light" | "dark";
type Navigate = (view: ViewId) => void;
type OperationStagesByDate = Record<string, boolean[]>;
type GlobalSearchResult = { id: string; view: Exclude<ViewId, "dashboard" | "analytics" | "order-form" | "operation" | "purchases" | "provider-payments">; label: string; title: string; detail: string; query: string };

const routes: Record<ViewId, string> = {
  dashboard: "inicio",
  analytics: "dashboard",
  "order-form": "novo-pedido",
  orders: "pedidos",
  operation: "operacao",
  purchases: "compras",
  "provider-payments": "controle-prestadores",
  clients: "clientes",
  products: "produtos",
  suppliers: "fornecedores",
  providers: "prestadores",
  company: "dados-da-empresa",
};

const viewFromHash = () => {
  const route = window.location.hash.replace("#/", "").replace("#", "");
  return (Object.entries(routes).find(([, value]) => value === route)?.[0] as ViewId | undefined) ?? "dashboard";
};

const navigation = [
  { id: "dashboard" as ViewId, label: "Início", icon: LayoutDashboard },
  { id: "analytics" as ViewId, label: "Dashboard", icon: BarChart3 },
  { id: "order-form" as ViewId, label: "Novo / editar pedido", icon: Plus },
  { id: "orders" as ViewId, label: "Pedidos e recebimentos", icon: ClipboardList },
  { id: "operation" as ViewId, label: "Operação do dia", icon: Truck },
  { id: "purchases" as ViewId, label: "Compras e pagamentos", icon: ShoppingBasket },
  { id: "provider-payments" as ViewId, label: "Controle de prestadores", icon: CircleDollarSign },
];

const registrations = [
  { id: "clients" as ViewId, label: "Clientes", icon: UsersRound },
  { id: "products" as ViewId, label: "Produtos", icon: Boxes },
  { id: "suppliers" as ViewId, label: "Fornecedores", icon: Store },
  { id: "providers" as ViewId, label: "Prestadores", icon: UserPlus },
  { id: "company" as ViewId, label: "Dados da empresa", icon: Building2 },
];

const getInitialTheme = (): Theme => {
  const appliedTheme = document.documentElement.dataset.theme;
  if (appliedTheme === "light" || appliedTheme === "dark") return appliedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

function useSyncedCollection<T extends { id: string }>(collectionName: string, fallback: T[]) {
  const [records, setRecords] = useState<T[]>(firebaseConfigured ? [] : fallback);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState("");
  useEffect(() => subscribeToCollection<T>(collectionName, fallback, (next) => { setRecords(next); setLoading(false); setError(""); }, (message) => { setError(message); setLoading(false); }), [collectionName]);
  const upsert = (record: T) => {
    setRecords((current) => current.some((candidate) => candidate.id === record.id) ? current.map((candidate) => candidate.id === record.id ? record : candidate) : [record, ...current]);
    void saveFirestoreRecord(collectionName, record).catch((failure: Error) => setError(failure.message));
  };
  const upsertMany = (nextRecords: T[]) => {
    if (!nextRecords.length) return;
    setRecords((current) => {
      const merged = new Map(current.map((record) => [record.id, record]));
      nextRecords.forEach((record) => merged.set(record.id, record));
      return Array.from(merged.values());
    });
    void saveFirestoreRecords(collectionName, nextRecords).catch((failure: Error) => setError(failure.message));
  };
  const remove = (id: string) => {
    setRecords((current) => current.filter((candidate) => candidate.id !== id));
    void deleteFirestoreRecord(collectionName, id).catch((failure: Error) => setError(failure.message));
  };
  return { records, setRecords, upsert, upsertMany, remove, loading, error };
}

function AccessScreen({ state, authorization, error, retry }: { state: "loading" | "signed-out" | "denied" | "error"; authorization?: AuthorizationResult; error?: string; retry: () => void }) {
  const [copyLabel, setCopyLabel] = useState("Copiar UID");
  const copyUid = async () => {
    if (!authorization?.uid) return;
    await navigator.clipboard.writeText(authorization.uid);
    setCopyLabel("UID copiado");
  };
  return <main className="access-page"><section className="access-card"><div className="access-brand"><span><Leaf size={25} /></span><div><strong>ZECA</strong><small>HORTIFRUTI</small></div></div>{state === "loading" ? <><div className="access-icon"><ShieldCheck size={26} /></div><h1>Verificando acesso</h1><p>Aguarde enquanto confirmamos sua conta e autorização.</p></> : state === "signed-out" ? <><div className="access-icon"><ShieldCheck size={26} /></div><h1>Acesso restrito</h1><p>Entre com uma das contas Google autorizadas para acessar os dados da operação.</p><button className="google-button" onClick={() => void signInWithGoogle()}><span>G</span>Entrar com Google</button><small className="access-note">O login identifica o usuário; as regras do banco validam se ele está autorizado.</small></> : state === "denied" ? <><div className="access-icon access-icon--warning"><X size={26} /></div><h1>Conta ainda não autorizada</h1><p>{authorization?.reason}</p><div className="access-identity"><span>E-mail</span><strong>{authorization?.email || "Não informado"}</strong><span>UID para liberação</span><code>{authorization?.uid}</code></div><button className="secondary-button" onClick={copyUid}>{copyLabel}</button><button className="text-button" onClick={() => void signOutFirebase()}>Entrar com outra conta</button></> : <><div className="access-icon access-icon--warning"><X size={26} /></div><h1>Não foi possível validar o acesso</h1><p>{error || "Confira a configuração e as regras do Firebase."}</p><button className="primary-button" onClick={retry}>Tentar novamente</button><button className="text-button" onClick={() => void signOutFirebase()}>Sair</button></>}</section></main>;
}

function FirebaseGate() {
  const [state, setState] = useState<"loading" | "signed-out" | "authorized" | "denied" | "error">(firebaseConfigured ? "loading" : "authorized");
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authorization, setAuthorization] = useState<AuthorizationResult>();
  const [error, setError] = useState("");
  const validate = async (candidate: FirebaseUser) => {
    setState("loading");
    try {
      const result = await verifyAuthorizedUser(candidate);
      setAuthorization(result);
      setState(result.authorized ? "authorized" : "denied");
    } catch (failure) {
      setError((failure as Error).message);
      setState("error");
    }
  };
  useEffect(() => observeAuth((candidate) => {
    setUser(candidate);
    if (!firebaseConfigured) setState("authorized");
    else if (!candidate) setState("signed-out");
    else void validate(candidate);
  }), []);
  if (state !== "authorized") return <AccessScreen state={state} authorization={authorization} error={error} retry={() => user ? void validate(user) : setState("signed-out")} />;
  return <App firebaseUser={user} firebaseRole={authorization?.role ?? "demo"} />;
}

const localIsoDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addLocalDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
};
const compactDeliveryLabel = (value: string) => {
  if (!value) return "Nenhuma entrega";
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
};

function Sidebar({ open, close, current, navigate, startNewOrder, firebaseUser, firebaseRole, nextDeliveryDate, openNextDelivery }: { open: boolean; close: () => void; current: ViewId; navigate: Navigate; startNewOrder: () => void; firebaseUser: FirebaseUser | null; firebaseRole: string; nextDeliveryDate: string; openNextDelivery: () => void }) {
  const select = (view: ViewId) => {
    if (view === "order-form") startNewOrder(); else navigate(view);
    close();
  };
  return (
    <>
      {open && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={close} />}
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="brand"><div className="brand__mark"><Leaf size={22} strokeWidth={2.4} /></div><div><strong>ZECA</strong><span>HORTIFRUTI</span></div><button className="icon-button sidebar__close" onClick={close} aria-label="Fechar menu"><X size={20} /></button></div>
        <button className="operation-chip" onClick={() => { openNextDelivery(); close(); }}><span className="operation-chip__dot" /><span><small>Próxima entrega</small><strong>{compactDeliveryLabel(nextDeliveryDate)}</strong></span><ChevronRight size={16} /></button>
        <nav className="sidebar__nav" aria-label="Menu principal">
          <span className="nav-label">OPERAÇÃO</span>
          {navigation.map(({ id, label, icon: Icon }) => <button className={`nav-item ${current === id ? "nav-item--active" : ""}`} onClick={() => select(id)} key={id} aria-current={current === id ? "page" : undefined}><Icon size={19} /><span>{label}</span></button>)}
          <span className="nav-label nav-label--spaced">CADASTROS</span>
          {registrations.map(({ id, label, icon: Icon }) => <button className={`nav-item ${current === id ? "nav-item--active" : ""}`} onClick={() => select(id)} key={id} aria-current={current === id ? "page" : undefined}><Icon size={19} /><span>{label}</span></button>)}
        </nav>
        <button className="sidebar__account" aria-label={firebaseUser ? "Sair da conta" : "Perfil demonstrativo"} onClick={() => firebaseUser ? void signOutFirebase() : undefined}><span className="avatar">{firebaseUser?.displayName?.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "RG"}</span><span><strong>{firebaseUser?.displayName || "Rafael Generoso"}</strong><small>{firebaseUser ? firebaseRole === "admin" ? "Administrador" : "Operador" : "Demonstração"}</small></span>{firebaseUser ? <LogOut size={16} /> : <ChevronDown size={16} />}</button>
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

function Dashboard({ navigate, startNewOrder, orders, selectedDate, setSelectedDate, allocations, operationStages, supplierCatalog, purchaseHistory, company }: { navigate: Navigate; startNewOrder: () => void; orders: Order[]; selectedDate: string; setSelectedDate: (date: string) => void; allocations: PurchaseAllocation[]; operationStages: OperationStagesByDate; supplierCatalog: Supplier[]; purchaseHistory: PurchaseRecord[]; company: CompanyProfile }) {
  const currentOrders = orders.filter((order) => order.deliveryDate === selectedDate);
  const deliveryTitle = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${selectedDate}T12:00:00Z`));
  const stages = operationStages[selectedDate] ?? [currentOrders.length > 0, false, false, false];
  const currentStage = stages.findIndex((completed) => !completed);
  const stageClass = (index: number) => stages[index] ? "step step--done" : index === currentStage ? "step step--current" : "step";
  const stageStatus = (index: number) => stages[index] ? "Concluído" : index === currentStage ? "Em andamento" : "Aguardando";
  const salesTotal = currentOrders.reduce((sum, order) => sum + orderTotal(order), 0);
  const receivable = orders.filter((order) => order.paymentStatus !== "Pago").reduce((sum, order) => sum + orderTotal(order), 0);
  const debtors = orders.filter((order) => order.paymentStatus !== "Pago");
  const supplierDebts = purchaseHistory.filter((purchase) => purchase.status !== "Pago");
  const payable = supplierDebts.reduce((sum, purchase) => sum + purchase.total, 0);
  const demand = new Map<string, { name: string; quantity: number; unit: Unit }>();
  currentOrders.forEach((order) => order.items.filter((line) => line.includeInPurchase !== false).forEach((line) => {
    const current = demand.get(line.productId) ?? { name: line.name, quantity: 0, unit: line.unit };
    current.quantity += line.quantity;
    demand.set(line.productId, current);
  }));
  const mainVolumes = Array.from(demand.values()).sort((left, right) => right.quantity - left.quantity).slice(0, 8);
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
        <article className="panel orders-panel">
          <div className="panel__header"><div><h3>Pedidos da próxima entrega</h3><p>Todos os pedidos do dia; role dentro da lista para ver mais.</p></div><button className="text-button" onClick={() => navigate("orders")}>Ver todos<ArrowRight size={16} /></button></div>
          <div className="dashboard-orders"><div className="dashboard-order-head"><span>Pedido</span><span>Data</span><span>Cliente</span><span>Total</span><span>Pagamento</span></div>{currentOrders.map((order) => <button onClick={() => navigate("orders")} key={order.number}><strong>{order.number}</strong><span>{formatDate(order.date)}</span><span>{order.customer}</span><b>{money(orderTotal(order))}</b><i className={`payment-badge payment-badge--${order.paymentStatus.toLowerCase()}`}>{order.paymentStatus}</i></button>)}{!currentOrders.length && <div className="dashboard-empty">Nenhum pedido nesta entrega.</div>}</div>
        </article>
        <article className="panel purchase-panel">
          <div className="panel__header"><div><h3>Demanda automática</h3><p>8 maiores volumes da entrega</p></div><button className="square-button" aria-label="Abrir compras" onClick={() => navigate("purchases")}><ArrowRight size={17} /></button></div>
          <div className="purchase-list">{mainVolumes.map((line, index) => <div className="purchase-item" key={line.name}><div><strong>{line.name}</strong><span>{line.quantity} {line.unit}</span></div><div className="progress"><span style={{ width: `${Math.max(24, 94 - index * 9)}%` }} /></div></div>)}{!mainVolumes.length && <div className="dashboard-empty">Nenhum volume para esta entrega.</div>}</div>
        </article>
      </section>
      <section className="financial-reminders" aria-label="Pendências financeiras">
        <button className="financial-reminder" onClick={() => navigate("orders")}><span className="metric-icon metric-icon--orange"><CreditCard size={19} /></span><div><small>Clientes</small><strong>{debtors.length} pedidos aguardam pagamento</strong><b>{money(receivable)} a receber</b></div><ChevronRight size={18} /></button>
        <button className="financial-reminder" onClick={() => navigate("purchases")}><span className="metric-icon metric-icon--violet"><CircleDollarSign size={19} /></span><div><small>Fornecedores</small><strong>{supplierDebts.length} compras aguardam pagamento</strong><b>{money(payable)} a pagar</b></div><ChevronRight size={18} /></button>
      </section>
      <section className="quick-actions"><div className="section-heading"><h3>Acessos rápidos</h3><p>Continue de onde a operação precisa.</p></div><div className="quick-actions__grid"><button onClick={startNewOrder}><span><Plus size={20} /></span><div><strong>Novo pedido</strong><small>Colar texto ou inserir item a item</small></div><ChevronRight size={18} /></button><button onClick={() => printLoadSheet(currentOrders, allocations, supplierCatalog, company)}><span><Printer size={20} /></span><div><strong>Imprimir folha do CEASA</strong><small>Compra, separação e carregamento</small></div><ChevronRight size={18} /></button><button onClick={() => navigate("purchases")}><span><ShoppingBasket size={20} /></span><div><strong>Distribuir compras</strong><small>Escolher fornecedores e custos</small></div><ChevronRight size={18} /></button></div></section>
    </>
  );
}

function AnalyticsDashboard({ orders, purchaseHistory, providerPayments, selectedDate }: { orders: Order[]; purchaseHistory: PurchaseRecord[]; providerPayments: ServiceProviderPayment[]; selectedDate: string }) {
  const availableMonths = Array.from(new Set([
    ...orders.map((order) => order.deliveryDate.slice(0, 7)),
    ...purchaseHistory.map((purchase) => purchase.date.slice(0, 7)),
    ...providerPayments.map((payment) => payment.date.slice(0, 7)),
  ])).filter(Boolean).sort().reverse();
  const selectedMonth = selectedDate.slice(0, 7);
  const [period, setPeriod] = useState(availableMonths.includes(selectedMonth) ? selectedMonth : availableMonths[0] ?? "Todos");
  const visibleOrders = orders.filter((order) => period === "Todos" || order.deliveryDate.startsWith(period));
  const visiblePurchases = purchaseHistory.filter((purchase) => period === "Todos" || purchase.date.startsWith(period));
  const visibleProviderPayments = providerPayments.filter((payment) => period === "Todos" || payment.date.startsWith(period));
  const sales = visibleOrders.reduce((sum, order) => sum + orderTotal(order), 0);
  const purchaseCosts = visiblePurchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const providerCosts = visibleProviderPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const costs = purchaseCosts + providerCosts;
  const grossResult = sales - costs;
  const grossMargin = sales ? (grossResult / sales) * 100 : 0;
  const receivable = visibleOrders.filter((order) => order.paymentStatus !== "Pago").reduce((sum, order) => sum + orderTotal(order), 0);
  const payable = visiblePurchases.filter((purchase) => purchase.status !== "Pago").reduce((sum, purchase) => sum + purchase.total, 0);
  const paidSales = visibleOrders.filter((order) => order.paymentStatus === "Pago").reduce((sum, order) => sum + orderTotal(order), 0);
  const ticket = visibleOrders.length ? sales / visibleOrders.length : 0;
  const pointMap = new Map<string, { key: string; label: string; sales: number; costs: number }>();
  const pointKey = (date: string) => period === "Todos" ? date.slice(0, 7) : date;
  const pointLabel = (key: string) => period === "Todos"
    ? new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${key}-01T12:00:00Z`)).replace(".", "")
    : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`)).replace(".", "");
  const addPoint = (date: string, field: "sales" | "costs", value: number) => {
    const key = pointKey(date);
    const current = pointMap.get(key) ?? { key, label: pointLabel(key), sales: 0, costs: 0 };
    current[field] += value;
    pointMap.set(key, current);
  };
  visibleOrders.forEach((order) => addPoint(order.deliveryDate, "sales", orderTotal(order)));
  visiblePurchases.forEach((purchase) => addPoint(purchase.date, "costs", purchase.total));
  visibleProviderPayments.forEach((payment) => addPoint(payment.date, "costs", payment.amount));
  const timeline = Array.from(pointMap.values()).sort((left, right) => left.key.localeCompare(right.key));
  const timelineMaximum = Math.max(1, ...timeline.flatMap((point) => [point.sales, point.costs]));
  const clientMap = new Map<string, number>();
  visibleOrders.forEach((order) => clientMap.set(order.customer, (clientMap.get(order.customer) ?? 0) + orderTotal(order)));
  const clients = Array.from(clientMap, ([name, total]) => ({ name, total })).sort((left, right) => right.total - left.total).slice(0, 6);
  const clientMaximum = Math.max(1, ...clients.map((client) => client.total));
  const productMap = new Map<string, { name: string; total: number; orders: Set<string> }>();
  visibleOrders.forEach((order) => order.items.forEach((line) => {
    const current = productMap.get(line.productId) ?? { name: line.name, total: 0, orders: new Set<string>() };
    current.total += line.quantity * line.unitPrice;
    current.orders.add(order.id);
    productMap.set(line.productId, current);
  }));
  const products = Array.from(productMap, ([id, value]) => ({ id, ...value })).sort((left, right) => right.total - left.total).slice(0, 6);
  const periodDescription = period === "Todos" ? "Todo o histórico disponível" : monthLabel(period);
  return (
    <section className="analytics-page">
      <PageTitle eyebrow="INDICADORES FINANCEIROS" title="Dashboard" description="Acompanhe vendas, compras, resultado bruto e pendências no período escolhido." action={<label className="analytics-period"><CalendarDays size={17} /><span>Período</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="Todos">Todo o histórico</option>{availableMonths.map((month) => <option value={month} key={month}>{monthLabel(month)}</option>)}</select></label>} />
      <section className="analytics-metrics">
        <article className="analytics-metric"><span className="metric-icon metric-icon--green"><ReceiptText size={20} /></span><div><small>Vendas</small><strong>{money(sales)}</strong><b>{visibleOrders.length} pedido(s)</b></div></article>
        <article className="analytics-metric"><span className="metric-icon metric-icon--orange"><ShoppingBasket size={20} /></span><div><small>Custos totais</small><strong>{money(costs)}</strong><b>Compras {money(purchaseCosts)} · Prestadores {money(providerCosts)}</b></div></article>
        <article className={`analytics-metric ${grossResult < 0 ? "analytics-metric--negative" : ""}`}><span className="metric-icon metric-icon--blue"><TrendingUp size={20} /></span><div><small>Resultado bruto</small><strong>{money(grossResult)}</strong><b>Vendas menos compras</b></div></article>
        <article className={`analytics-metric ${grossMargin < 0 ? "analytics-metric--negative" : ""}`}><span className="metric-icon metric-icon--violet"><BarChart3 size={20} /></span><div><small>Margem bruta</small><strong>{grossMargin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</strong><b>Antes das despesas fixas</b></div></article>
      </section>
      <section className="finance-mini-metrics" aria-label="Resumo do período">
        <div><span>Ticket médio</span><strong>{money(ticket)}</strong></div>
        <div><span>Vendas já pagas</span><strong>{money(paidSales)}</strong></div>
        <div className="finance-mini-metric--warning"><span>A receber</span><strong>{money(receivable)}</strong></div>
        <div className="finance-mini-metric--warning"><span>A pagar</span><strong>{money(payable)}</strong></div>
      </section>
      <article className="panel finance-chart-card">
        <div className="panel__header"><div><h3>Vendas x custos</h3><p>{period === "Todos" ? "Comparação mensal" : "Comparação diária"} · {periodDescription}</p></div><div className="finance-chart-legend"><span><i className="finance-chart-legend__sales" />Vendas</span><span><i className="finance-chart-legend__costs" />Custos</span></div></div>
        {timeline.length ? <div className="finance-chart-scroll"><div className="finance-chart-plot" style={{ minWidth: `${Math.max(560, timeline.length * 76)}px` }}>{timeline.map((point) => <div className="finance-chart-point" key={point.key} aria-label={`${point.label}: vendas ${money(point.sales)}, custos ${money(point.costs)}`}><div className="finance-chart-bars"><span className="finance-chart-bar finance-chart-bar--sales" style={{ height: point.sales ? `${Math.max(4, (point.sales / timelineMaximum) * 100)}%` : "2px" }} title={`Vendas: ${money(point.sales)}`} /><span className="finance-chart-bar finance-chart-bar--costs" style={{ height: point.costs ? `${Math.max(4, (point.costs / timelineMaximum) * 100)}%` : "2px" }} title={`Custos: ${money(point.costs)}`} /></div><small>{point.label}</small></div>)}</div></div> : <div className="dashboard-empty">Ainda não há vendas ou compras neste período.</div>}
      </article>
      <section className="analytics-ranking-grid">
        <article className="panel analytics-ranking"><div className="panel__header"><div><h3>Clientes com maior venda</h3><p>Participação no faturamento filtrado</p></div></div><div className="analytics-ranking-list">{clients.map((client, index) => <div key={client.name}><span className="analytics-rank">{index + 1}</span><div><strong>{client.name}</strong><span><i style={{ width: `${(client.total / clientMaximum) * 100}%` }} /></span></div><b>{money(client.total)}</b></div>)}{!clients.length && <div className="dashboard-empty">Nenhum cliente no período.</div>}</div></article>
        <article className="panel analytics-ranking"><div className="panel__header"><div><h3>Produtos com maior venda</h3><p>Valor vendido por produto</p></div></div><div className="analytics-product-list">{products.map((product, index) => <div key={product.id}><span className="analytics-rank">{index + 1}</span><div><strong>{product.name}</strong><small>{product.orders.size} pedido(s)</small></div><b>{money(product.total)}</b></div>)}{!products.length && <div className="dashboard-empty">Nenhum produto no período.</div>}</div></article>
      </section>
      <p className="analytics-note">O resultado e a margem são brutos: usam as vendas, compras e pagamentos de prestadores registrados no período e não descontam impostos, frete, salários fixos ou outras despesas da empresa.</p>
    </section>
  );
}

function OrderForm({ order, nextNumber, navigate, onSave, catalogClients, catalogProducts, company }: { order?: Order; nextNumber: string; navigate: Navigate; onSave: (order: Order) => void; catalogClients: Client[]; catalogProducts: Product[]; company: CompanyProfile }) {
  const today = localIsoDate();
  const [customer, setCustomer] = useState(order?.customer ?? catalogClients[0]?.name ?? "");
  const [date, setDate] = useState(order?.date ?? today);
  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate ?? addLocalDays(today, 1));
  const [items, setItems] = useState<OrderItem[]>(order?.items ?? []);
  const [adjustment, setAdjustment] = useState(order?.adjustment ?? 0);
  const [observation, setObservation] = useState(order?.observation ?? "");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order?.paymentStatus ?? "Pendente");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order?.paymentMethod ?? "Não informado");
  const [paymentReference, setPaymentReference] = useState(order?.paymentReference ?? "");
  const [manualProductId, setManualProductId] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const sortedCatalogProducts = useMemo(() => catalogProducts.slice().sort((left, right) => (left.code || "\uffff").localeCompare(right.code || "\uffff", "pt-BR", { numeric: true }) || left.name.localeCompare(right.name, "pt-BR")), [catalogProducts]);
  const matchingProducts = useMemo(() => {
    const query = normalizeSearch(manualQuery.trim());
    return sortedCatalogProducts
      .filter((product) => !query || normalizeSearch(`${product.code} ${product.name}`).includes(query))
      .slice(0, 12);
  }, [manualQuery, sortedCatalogProducts]);

  const addProduct = (productId: string, quantity = 1, unitPrice?: number) => {
    const product = catalogProducts.find((candidate) => candidate.id === productId);
    if (!product) return;
    setItems((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (existing) return current.map((line) => line.id === existing.id ? { ...line, quantity: line.quantity + quantity, unitPrice: unitPrice ?? line.unitPrice } : line);
      return [...current, { id: `item-${Date.now()}-${productId}`, productId, name: product.name, quantity, unit: product.unit, unitPrice: unitPrice ?? product.saleReference, includeInPurchase: true }];
    });
  };
  const updateItem = (id: string, field: "quantity" | "unitPrice" | "confirmedWeight" | "unit" | "includeInPurchase", value: number | Unit | boolean) => setItems((current) => current.map((line) => line.id === id ? { ...line, [field]: value } : line));
  const interpretText = () => setParsedLines(parseOrderText(pasteText, catalogProducts));
  const addParsedLines = () => {
    parsedLines.filter((line) => line.productId).forEach((line) => addProduct(line.productId, line.quantity, line.unitPrice));
    setParsedLines([]);
    setPasteText("");
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const number = order?.number ?? nextNumber;
    const saved: Order = { id: order?.id ?? number.replace(/\D/g, ""), number, date, deliveryDate, customer, items, adjustment, status: order?.status ?? "Confirmado", paymentStatus, paymentMethod, paymentReference: paymentReference.trim(), observation };
    onSave(saved);
    navigate("orders");
  };
  const draftOrder: Order = { id: order?.id ?? "novo", number: order?.number ?? "Novo", date, deliveryDate, customer, items, adjustment, status: "Confirmado", paymentStatus, paymentMethod, paymentReference: paymentReference.trim(), observation };
  return (
    <>
      <PageTitle eyebrow={order ? `EDITANDO ${order.number}` : "NOVO PEDIDO"} title={order ? `Editar pedido de ${order.customer}` : "Incluir pedido"} description="Cole a mensagem do WhatsApp ou acrescente os produtos manualmente." action={<button className="secondary-button" onClick={() => navigate("orders")}><ArrowLeft size={17} />Voltar aos pedidos</button>} />
      <form className="form-layout order-form-layout" id="order-form" onSubmit={save}>
        <div className="order-form-main">
          <section className="panel form-card"><div className="form-section-title"><span>1</span><div><h2>Cliente e datas</h2><p>Em pedidos novos, usamos hoje como data do pedido e amanhã como entrega; ambas continuam editáveis.</p></div></div><div className="form-grid"><label>Cliente<select value={customer} onChange={(event) => setCustomer(event.target.value)}>{catalogClients.map((client) => <option key={client.id}>{client.name}</option>)}</select></label><label>Data do pedido<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Data da entrega<input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} /></label><label>Situação do pagamento<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}><option>Pendente</option><option>Parcial</option><option>Pago</option></select></label></div></section>
          <section className="panel form-card import-card"><div className="form-section-title"><span>2</span><div><h2>Importar texto do WhatsApp</h2><p>Cole um item por linha. Se informar um valor no final, ele será usado como preço unitário: 1 Abacaxi 35,50.</p></div></div><div className="paste-order"><div><MessageSquareText size={20} /><textarea aria-label="Texto do pedido recebido pelo WhatsApp" value={pasteText} onChange={(event) => setPasteText(event.target.value)} rows={6} /></div><button className="secondary-button" type="button" onClick={interpretText} disabled={!pasteText.trim()}><ClipboardCheck size={17} />Interpretar lista</button></div>{parsedLines.length > 0 && <div className="parsed-review"><div className="parsed-review__heading"><strong>Revise o que foi identificado</strong><span>Sem valor no texto, será usado o preço do cadastro.</span></div>{parsedLines.map((line) => <div className={line.needsReview ? "parsed-line parsed-line--review" : "parsed-line"} key={line.id}><span>{line.quantity}</span><code>{line.raw}</code><select aria-label={`Produto correspondente a ${line.raw}`} value={line.productId} onChange={(event) => setParsedLines((current) => current.map((candidate) => candidate.id === line.id ? { ...candidate, productId: event.target.value, needsReview: false } : candidate))}><option value="">Selecione o produto correto</option>{sortedCatalogProducts.map((product) => <option value={product.id} key={product.id}>{product.code} · {product.name}</option>)}</select><strong className="parsed-price">{line.unitPrice !== undefined ? money(line.unitPrice) : "Preço cadastro"}</strong>{line.productId && !line.needsReview ? <CheckCircle2 size={18} /> : <span className="review-dot">!</span>}</div>)}<button className="primary-button" type="button" disabled={parsedLines.some((line) => !line.productId)} onClick={addParsedLines}><Plus size={17} />Adicionar itens revisados</button></div>}</section>
          <section className="panel form-card"><div className="form-section-title"><span>3</span><div><h2>Produtos do pedido</h2><p>Pesquise pelo nome ou número; preço, unidade e demanda de compra continuam editáveis.</p></div></div><div className="manual-add"><div className="product-combobox"><Search size={17} /><input role="combobox" aria-expanded={manualOpen} aria-controls="product-options" aria-label="Pesquisar produto" value={manualQuery} placeholder="Digite o nome ou número do produto" onFocus={() => setManualOpen(true)} onBlur={() => setTimeout(() => setManualOpen(false), 120)} onChange={(event) => { setManualQuery(event.target.value); setManualProductId(""); setManualOpen(true); }} />{manualOpen && <div className="product-options" id="product-options" role="listbox">{matchingProducts.length ? matchingProducts.map((product) => <button type="button" role="option" aria-selected={manualProductId === product.id} key={product.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setManualProductId(product.id); setManualQuery(product.name); setManualOpen(false); }}><span><small>{product.code}</small><strong>{product.name}</strong></span><b>{money(product.saleReference)}/{product.unit}</b></button>) : <div className="product-option-empty">Nenhum produto cadastrado encontrado.</div>}</div>}</div><button className="secondary-button" type="button" disabled={!manualProductId} onClick={() => { addProduct(manualProductId); setManualProductId(""); setManualQuery(""); }}><Plus size={17} />Adicionar produto</button></div>{items.length ? <div className="line-editor"><div className="line-editor__head"><span>Produto</span><span>Qtd.</span><span>Un.</span><span>Valor unitário</span><span>Demanda de compra</span><span>Total</span><span>Peso conf.</span><span /></div>{items.map((line) => <div className="line-editor__row" key={line.id}><div><strong>{line.name}</strong><small>Preço salvo neste pedido</small></div><DecimalInput ariaLabel={`Quantidade de ${line.name}`} value={line.quantity} onValueChange={(value) => updateItem(line.id, "quantity", value)} /><select aria-label={`Unidade de ${line.name}`} value={line.unit} onChange={(event) => updateItem(line.id, "unit", event.target.value as Unit)}>{productUnits.map((unit) => <option value={unit} key={unit}>{unit}</option>)}</select><DecimalInput ariaLabel={`Valor unitário de ${line.name}`} value={line.unitPrice} onValueChange={(value) => updateItem(line.id, "unitPrice", value)} /><select className={line.includeInPurchase === false ? "purchase-demand-select purchase-demand-select--no" : "purchase-demand-select"} aria-label={`Enviar ${line.name} para demanda de compra`} value={line.includeInPurchase === false ? "Não" : "Sim"} onChange={(event) => updateItem(line.id, "includeInPurchase", event.target.value === "Sim")}><option>Sim</option><option>Não</option></select><strong>{money(line.quantity * line.unitPrice)}</strong><DecimalInput ariaLabel={`Peso conferido de ${line.name}`} value={line.confirmedWeight} placeholder="Depois" onValueChange={(value) => updateItem(line.id, "confirmedWeight", value)} /><button className="icon-button danger-icon" type="button" aria-label={`Remover ${line.name}`} onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== line.id))}><Trash2 size={17} /></button></div>)}</div> : <div className="empty-state"><PackageOpen size={24} /><strong>Nenhum produto incluído</strong><span>Cole a mensagem do cliente ou escolha um produto acima.</span></div>}</section>
        </div>
        {summaryOpen && <button className="order-summary-backdrop" type="button" aria-label="Fechar resumo do pedido" onClick={() => setSummaryOpen(false)} />}
        <aside className={`panel order-summary order-summary--complete ${summaryOpen ? "order-summary--open" : ""}`} aria-label="Resumo do pedido">
          <div className="order-summary__title"><div><h2>Resumo do pedido</h2><p>{order ? order.number : "Numeração automática ao salvar"}</p></div><button className="icon-button order-summary__close" type="button" aria-label="Fechar resumo" onClick={() => setSummaryOpen(false)}><X size={19} /></button></div>
          <div className="summary-client"><UsersRound size={18} /><div><small>Cliente</small><strong>{customer}</strong></div></div>
          <div className="summary-figures summary-figures--three"><div><span>Produtos</span><strong>{items.length}</strong></div><div><span>Para comprar</span><strong>{items.filter((line) => line.includeInPurchase !== false).length}</strong></div><div><span>Subtotal</span><strong>{money(orderSubtotal(draftOrder))}</strong></div></div>
          <label className="summary-field">Ajuste no valor total<DecimalInput ariaLabel="Ajuste no valor total" value={adjustment} allowNegative onValueChange={setAdjustment} /><small>Use valor positivo para acréscimo e negativo para desconto.</small></label>
          <label className="summary-field">Forma de pagamento<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}><option>Não informado</option><option>Pix</option><option>Dinheiro</option><option>Boleto</option><option>Transferência</option></select></label>
          <label className="summary-field">Número / referência do pagamento<input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Ex.: transferência 84521" /><small>Deixe em branco enquanto o cliente não pagar.</small></label>
          <label className="summary-field">Observações<textarea rows={4} value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Alterações, combinações e advertências..." /></label>
          <div className="summary-total"><span>Total do pedido</span><strong>{money(orderTotal(draftOrder))}</strong></div>
          <button className="primary-button primary-button--wide" type="submit" disabled={!items.length}><Save size={18} />{order ? "Salvar alterações" : "Finalizar pedido"}</button>
          {order && <button className="secondary-button print-summary-button" type="button" onClick={() => printOrder(draftOrder, company)}><Printer size={17} />Imprimir pedido</button>}
          <small className="summary-note">Os valores deste pedido ficam congelados; alterações futuras no cadastro do produto não mudam este histórico.</small>
        </aside>
        <div className="mobile-order-summary" aria-label="Resumo rápido do pedido"><button type="button" onClick={() => setSummaryOpen(true)} aria-expanded={summaryOpen}><span><small>{items.length} produto(s) · {customer || "Sem cliente"}</small><strong>{money(orderTotal(draftOrder))}</strong></span><b>Ver resumo</b></button><button className="primary-button" type="submit" disabled={!items.length}><Save size={17} /><span>{order ? "Salvar" : "Finalizar"}</span></button></div>
      </form>
    </>
  );
}

function OrdersPage({ orders, saved, startNewOrder, editOrder, deleteOrder, updatePayment, updatePaymentMethod, updatePaymentReference, company, externalQuery = "" }: { orders: Order[]; saved: boolean; startNewOrder: () => void; editOrder: (order: Order) => void; deleteOrder: (order: Order) => void; updatePayment: (number: string, status: PaymentStatus) => void; updatePaymentMethod: (number: string, method: PaymentMethod) => void; updatePaymentReference: (number: string, reference: string) => void; company: CompanyProfile; externalQuery?: string }) {
  const [periodFilter, setPeriodFilter] = useState("Todos");
  const [clientFilter, setClientFilter] = useState("Todos");
  const [paymentFilter, setPaymentFilter] = useState("Todos");
  const [query, setQuery] = useState(externalQuery);
  const [deletedOrder, setDeletedOrder] = useState("");
  useEffect(() => setQuery(externalQuery), [externalQuery]);
  const requestDelete = (order: Order) => {
    const confirmed = window.confirm(`Excluir o pedido ${order.number} de ${order.customer}?\n\nEssa ação não pode ser desfeita. A demanda de vendas será recalculada, mas compras já registradas para essa entrega serão mantidas.`);
    if (!confirmed) return;
    deleteOrder(order);
    setDeletedOrder(order.number);
  };
  const normalizedQuery = normalizeSearch(query.trim());
  const { uniqueDates, months } = exportPeriodOptions(orders.map((order) => order.date));
  const visible = orders.filter((order) => {
    const periodMatches = periodFilter === "Todos" || (periodFilter.startsWith("date:") ? order.date === periodFilter.slice(5) : order.date.startsWith(periodFilter.slice(6)));
    return periodMatches && (clientFilter === "Todos" || order.customer === clientFilter) && (paymentFilter === "Todos" || order.paymentStatus === paymentFilter) && (!normalizedQuery || normalizeSearch(`${order.number} ${order.customer} ${order.date} ${order.deliveryDate}`).includes(normalizedQuery));
  });
  const total = visible.reduce((sum, order) => sum + orderTotal(order), 0);
  const pending = visible.filter((order) => order.paymentStatus !== "Pago").reduce((sum, order) => sum + orderTotal(order), 0);
  const reportHeaders = ["Pedido", "Data", "Entrega", "Cliente", "Itens", "Total", "Pagamento", "Forma", "Nº pagamento", "Observação"];
  const reportRows = visible.map((order) => [order.number, formatDate(order.date), formatDate(order.deliveryDate), order.customer, order.items.length, orderTotal(order).toFixed(2).replace(".", ","), order.paymentStatus, order.paymentMethod, order.paymentReference ?? "", order.observation]);
  const productReportHeaders = ["Pedido", "Data do pedido", "Data da entrega", "Cliente", "Produto", "Quantidade", "Unidade", "Soma das quantidades do pedido"];
  const productReportRows = visible.flatMap((order) => {
    const orderQuantity = order.items.reduce((sum, line) => sum + line.quantity, 0);
    return order.items.map((line) => [order.number, formatDate(order.date), formatDate(order.deliveryDate), order.customer, line.name, line.quantity.toLocaleString("pt-BR"), line.unit, orderQuantity.toLocaleString("pt-BR")]);
  });
  const filteredProductQuantity = visible.reduce((sum, order) => sum + order.items.reduce((itemSum, line) => itemSum + line.quantity, 0), 0);
  const exportLabel = periodFilter === "Todos" ? "todos-os-periodos" : periodFilter.replace(":", "-");
  return (
    <>
      <PageTitle eyebrow="VENDAS E RECEBIMENTOS" title="Pedidos" description="Histórico por data, cliente, valor e situação de pagamento." action={<div className="heading-actions"><button className="secondary-button" onClick={() => downloadCsv(`pedidos-${exportLabel}.csv`, reportHeaders, reportRows)}><Download size={17} />Excel (.csv)</button><button className="secondary-button" onClick={() => printTableReport("Relatório de pedidos", `${visible.length} pedido(s) exibido(s)`, reportHeaders, reportRows, company)}><FileText size={17} />PDF</button><button className="primary-button" onClick={startNewOrder}><Plus size={18} />Novo pedido</button></div>} />
      {saved && <div className="success-banner"><CheckCircle2 size={20} /><div><strong>Pedido salvo com sucesso</strong><span>Ele ficou gravado no Firestore e pode ser impresso ou editado a qualquer momento.</span></div></div>}
      {deletedOrder && <div className="success-banner"><CheckCircle2 size={20} /><div><strong>Pedido {deletedOrder} excluído</strong><span>O pedido foi removido do Firestore e dos resumos de venda.</span></div></div>}
      <section className="summary-strip"><div><span>Pedidos exibidos</span><strong>{visible.length}</strong></div><div><span>Total vendido</span><strong>{money(total)}</strong></div><div className="summary-strip__warning"><span>A receber</span><strong>{money(pending)}</strong></div></section>
      <section className="panel order-products-export"><div><strong>Pedidos e produtos para separação</strong><span>{productReportRows.length} linha(s) · soma das quantidades: {filteredProductQuantity.toLocaleString("pt-BR")}. Os arquivos respeitam os filtros selecionados e não mostram valores.</span></div><div><button className="secondary-button" disabled={!visible.length} onClick={() => downloadCsv(`pedidos-produtos-${exportLabel}.csv`, productReportHeaders, productReportRows)}><Download size={16} />Excel com produtos</button><button className="secondary-button" disabled={!visible.length} onClick={() => printCompactOrdersReport(visible, company)}><Printer size={16} />PDF compacto dos pedidos</button></div></section>
      <section className="panel list-panel"><div className="list-toolbar"><div className="inline-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedido ou cliente..." /></div><label className="compact-filter">Período<select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}><option>Todos</option><optgroup label="Meses">{months.map((month) => <option value={`month:${month}`} key={month}>{monthLabel(month)}</option>)}</optgroup><optgroup label="Dias">{uniqueDates.map((date) => <option value={`date:${date}`} key={date}>{formatDate(date)}</option>)}</optgroup></select></label><label className="compact-filter">Cliente<select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option>Todos</option>{Array.from(new Set(orders.map((order) => order.customer))).sort().map((client) => <option key={client}>{client}</option>)}</select></label><label className="compact-filter">Pagamento<select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option>Todos</option><option>Pendente</option><option>Parcial</option><option>Pago</option></select></label></div><div className="sales-table"><div className="sales-table__head"><span>Pedido</span><span>Data do pedido</span><span>Data da entrega</span><span>Cliente</span><span>Itens</span><span>Total</span><span>Pagamento</span><span>Forma</span><span>Nº pagamento</span><span>Ações</span></div>{visible.map((order) => <div className="sales-table__row" key={order.number}><strong>{order.number}</strong><span>{formatDate(order.date)}</span><span>{formatDate(order.deliveryDate)}</span><span><b>{order.customer}</b><small>{order.observation || "Sem observações"}</small></span><span>{order.items.length}</span><strong>{money(orderTotal(order))}</strong><select aria-label={`Pagamento do pedido ${order.number}`} value={order.paymentStatus} onChange={(event) => updatePayment(order.number, event.target.value as PaymentStatus)}><option>Pendente</option><option>Parcial</option><option>Pago</option></select><select aria-label={`Forma de pagamento do pedido ${order.number}`} value={order.paymentMethod} onChange={(event) => updatePaymentMethod(order.number, event.target.value as PaymentMethod)}><option>Não informado</option><option>Pix</option><option>Dinheiro</option><option>Boleto</option><option>Transferência</option></select><input className="payment-reference-input" aria-label={`Número do pagamento do pedido ${order.number}`} defaultValue={order.paymentReference ?? ""} placeholder="Em branco" onBlur={(event) => updatePaymentReference(order.number, event.target.value.trim())} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /><div className="row-actions"><button aria-label={`Imprimir ${order.number}`} title="Imprimir pedido" onClick={() => printOrder(order, company)}><Printer size={16} /></button><button aria-label={`Editar ${order.number}`} title="Editar pedido" onClick={() => editOrder(order)}><Edit3 size={16} /></button><button className="danger-icon" aria-label={`Excluir ${order.number}`} title="Excluir pedido" onClick={() => requestDelete(order)}><Trash2 size={16} /></button></div></div>)}</div>{!visible.length && <div className="empty-table">Nenhum pedido encontrado com esses filtros.</div>}</section>
    </>
  );
}

function OperationPage({ orders, editOrder, selectedDate, setSelectedDate, allocations, operationStages, saveOperationStages, supplierCatalog, company }: { orders: Order[]; editOrder: (order: Order) => void; selectedDate: string; setSelectedDate: (date: string) => void; allocations: PurchaseAllocation[]; operationStages: OperationStagesByDate; saveOperationStages: (date: string, stages: boolean[]) => void; supplierCatalog: Supplier[]; company: CompanyProfile }) {
  const currentOrders = orders.filter((order) => order.deliveryDate === selectedDate);
  const stages = operationStages[selectedDate] ?? [currentOrders.length > 0, false, false, false];
  const toggleStage = (index: number) => saveOperationStages(selectedDate, stages.map((value, stageIndex) => stageIndex === index ? !value : value));
  return (
    <>
      <PageTitle eyebrow={`ENTREGA · ${dateLabel(selectedDate)}`} title="Operação do dia" description="Do pedido recebido até a conferência final do carregamento." action={<div className="heading-actions"><OperationDate value={selectedDate} onChange={setSelectedDate} /><button className="primary-button" onClick={() => printLoadSheet(currentOrders, allocations, supplierCatalog, company)} disabled={!currentOrders.length}><Printer size={17} />Imprimir folha do CEASA</button></div>} />
      <section className="operation-summary-grid"><article className="panel operation-progress-card"><div className="status-pill status-pill--light"><span /> Operação em andamento</div><h2>{stages.filter(Boolean).length} de 4 etapas concluídas</h2><p>A separação funciona como conferência: se algo faltar, o pedido pode ser editado antes do carregamento.</p><div className="big-progress"><span style={{ width: `${stages.filter(Boolean).length * 25}%` }} /></div><small>{stages.filter(Boolean).length * 25}% concluído</small></article><article className="panel route-card"><div className="metric-icon metric-icon--orange"><Route size={21} /></div><div><small>Folha operacional</small><strong>{currentOrders.length} pedidos · {new Set(currentOrders.map((order) => order.customer)).size} clientes</strong><span>Totais por produto, fornecedor e cliente</span></div><button className="square-button" aria-label="Imprimir folha" disabled={!currentOrders.length} onClick={() => printLoadSheet(currentOrders, allocations, supplierCatalog, company)}><Printer size={17} /></button></article></section>
      <section className="operation-board">{[{ icon: ClipboardCheck, title: "Pedidos recebidos", detail: `${currentOrders.length} confirmados` }, { icon: ShoppingBasket, title: "Compras", detail: "Distribuir por fornecedor" }, { icon: PackageCheck, title: "Separação e conferência", detail: "Confirmar faltas e pesos" }, { icon: Truck, title: "Carregamento", detail: "Conferir antes da saída" }].map((stage, index) => <button className={`operation-stage ${stages[index] ? "operation-stage--done" : ""}`} onClick={() => toggleStage(index)} key={stage.title}><span className="stage-check">{stages[index] ? <Check size={17} /> : index + 1}</span><stage.icon size={22} /><div><strong>{stage.title}</strong><small>{stage.detail}</small></div><ChevronRight size={18} /></button>)}</section>
      <section className="panel operation-orders"><div className="panel__header"><div><h3>Pedidos para separar e carregar</h3><p>Imprima individualmente ou edite quando faltar algum produto.</p></div></div>{currentOrders.map((order) => <div className="operation-order-row" key={order.number}><span className="sequence-number">{order.number.replace("#", "")}</span><div><strong>{order.customer}</strong><small>{order.items.length} produtos · {money(orderTotal(order))}</small></div><b>{order.status}</b><button className="secondary-button" onClick={() => printOrder(order, company)}><Printer size={15} />Folha individual</button><button className="square-button" aria-label={`Editar ${order.number}`} onClick={() => editOrder(order)}><Edit3 size={16} /></button></div>)}</section>
    </>
  );
}

function PurchasesPage({ orders, selectedDate, setSelectedDate, allocations, products, suppliers, purchaseHistory, saveAllocation, deleteAllocation, savePurchase, deletePurchase, company }: { orders: Order[]; selectedDate: string; setSelectedDate: (date: string) => void; allocations: PurchaseAllocation[]; products: Product[]; suppliers: Supplier[]; purchaseHistory: PurchaseRecord[]; saveAllocation: (record: PurchaseAllocation) => void; deleteAllocation: (id: string) => void; savePurchase: (record: PurchaseRecord) => void; deletePurchase: (record: PurchaseRecord) => void; company: CompanyProfile }) {
  const [tab, setTab] = useState<"demand" | "history" | "items">("demand");
  const [historyPeriod, setHistoryPeriod] = useState("Todos");
  const [historySupplier, setHistorySupplier] = useState("Todos");
  const [historyPayment, setHistoryPayment] = useState("Todos");
  const [historyInvoice, setHistoryInvoice] = useState("Todos");
  const [itemPeriod, setItemPeriod] = useState(`month:${selectedDate.slice(0, 7)}`);
  const [itemSupplier, setItemSupplier] = useState("Todos");
  const [itemProduct, setItemProduct] = useState("Todos");
  const [minimumTotal, setMinimumTotal] = useState(0);
  const [maximumTotal, setMaximumTotal] = useState(0);
  const [deletedPurchase, setDeletedPurchase] = useState("");
  const currentOrders = orders.filter((order) => order.deliveryDate === selectedDate);
  const demand = useMemo(() => {
    const grouped = new Map<string, { productId: string; name: string; unit: Unit; total: number; customers: string[] }>();
    currentOrders.forEach((order) => order.items.filter((line) => line.includeInPurchase !== false).forEach((line) => {
      const current = grouped.get(line.productId) ?? { productId: line.productId, name: line.name, unit: line.unit, total: 0, customers: [] };
      current.total += line.quantity;
      current.customers.push(`${order.customer}: ${line.quantity} ${line.unit}`);
      grouped.set(line.productId, current);
    }));
    return Array.from(grouped.values()).sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }, [currentOrders]);
  const currentAllocations = allocations.filter((allocation) => allocation.deliveryDate === selectedDate);
  const suppliersForProduct = (productId: string, currentSupplierId?: string) => {
    const product = products.find((candidate) => candidate.id === productId);
    const restricted = product?.supplierIds?.length ? suppliers.filter((supplier) => product.supplierIds!.includes(supplier.id)) : suppliers;
    const currentSupplier = currentSupplierId ? suppliers.find((supplier) => supplier.id === currentSupplierId) : undefined;
    return currentSupplier && !restricted.some((supplier) => supplier.id === currentSupplier.id) ? [currentSupplier, ...restricted] : restricted;
  };
  const addAllocation = (productId: string) => {
    const product = products.find((candidate) => candidate.id === productId);
    const allowedSuppliers = suppliersForProduct(productId);
    saveAllocation({ id: `allocation-${Date.now()}`, deliveryDate: selectedDate, productId, supplierId: allowedSuppliers[0]?.id ?? "", quantity: 0, unitCost: product?.costReference ?? 0 });
  };
  const updateAllocation = (id: string, field: "supplierId" | "quantity" | "unitCost", value: string | number) => {
    const allocation = allocations.find((candidate) => candidate.id === id);
    if (allocation) saveAllocation({ ...allocation, [field]: value });
  };
  const requestDeletePurchase = (purchase: PurchaseRecord) => {
    const confirmed = window.confirm(`Excluir a compra ${purchase.number} de ${purchase.supplier}?\n\nEssa ação removerá também os produtos distribuídos para esse fornecedor em ${formatDate(purchase.date)} e não pode ser desfeita.`);
    if (!confirmed) return;
    deletePurchase(purchase);
    setDeletedPurchase(purchase.number);
  };
  const historyOptions = exportPeriodOptions(purchaseHistory.map((purchase) => purchase.date));
  const visiblePurchaseHistory = purchaseHistory.filter((purchase) => {
    const periodMatches = historyPeriod === "Todos" || (historyPeriod.startsWith("date:") ? purchase.date === historyPeriod.slice(5) : purchase.date.startsWith(historyPeriod.slice(6)));
    const supplierMatches = historySupplier === "Todos" || purchase.supplier === historySupplier;
    const paymentMatches = historyPayment === "Todos" || purchase.status === historyPayment;
    const invoiceMatches = historyInvoice === "Todos" || (purchase.invoiceReceived ? "Sim" : "Não") === historyInvoice;
    return periodMatches && supplierMatches && paymentMatches && invoiceMatches;
  });
  const allocatedCost = currentAllocations.reduce((sum, allocation) => sum + allocation.quantity * allocation.unitCost, 0);
  const demandUnits = [...productUnits, ...demand.map((line) => line.unit).filter((unit) => !productUnits.includes(unit as typeof productUnits[number]))] as Unit[];
  const demandQuantityByUnit = Array.from(new Set(demandUnits)).map((unit) => ({
    unit,
    total: demand.filter((line) => line.unit === unit).reduce((sum, line) => sum + line.total, 0),
  })).filter((entry) => entry.total > 0);
  const purchaseHeaders = ["Compra", "Data", "Fornecedor", "Total", "Pagamento", "Nota recebida"];
  const purchaseRows = visiblePurchaseHistory.map((purchase) => [purchase.number, formatDate(purchase.date), purchase.supplier, purchase.total.toFixed(2).replace(".", ","), purchase.status, purchase.invoiceReceived ? "Sim" : "Não"]);

  const itemOptions = exportPeriodOptions(allocations.filter((allocation) => allocation.quantity > 0).map((allocation) => allocation.deliveryDate));
  const filteredAllocationItems = allocations.filter((allocation) => {
    if (allocation.quantity <= 0 || !allocation.supplierId) return false;
    const periodMatches = itemPeriod === "Todos" || (itemPeriod.startsWith("date:") ? allocation.deliveryDate === itemPeriod.slice(5) : allocation.deliveryDate.startsWith(itemPeriod.slice(6)));
    return periodMatches && (itemSupplier === "Todos" || allocation.supplierId === itemSupplier) && (itemProduct === "Todos" || allocation.productId === itemProduct);
  });
  const groupedItems = Array.from(filteredAllocationItems.reduce((grouped, allocation) => {
    const key = `${allocation.supplierId}:${allocation.productId}`;
    const supplier = suppliers.find((candidate) => candidate.id === allocation.supplierId);
    const product = products.find((candidate) => candidate.id === allocation.productId);
    const current = grouped.get(key) ?? { key, supplierId: allocation.supplierId, supplier: supplier?.name ?? "Fornecedor não informado", productId: allocation.productId, code: product?.code ?? "—", product: product?.name ?? "Produto não cadastrado", unit: product?.unit ?? "UN" as Unit, quantity: 0, total: 0, entries: 0, dates: new Set<string>() };
    current.quantity += allocation.quantity;
    current.total += allocation.quantity * allocation.unitCost;
    current.entries += 1;
    current.dates.add(allocation.deliveryDate);
    grouped.set(key, current);
    return grouped;
  }, new Map<string, { key: string; supplierId: string; supplier: string; productId: string; code: string; product: string; unit: Unit; quantity: number; total: number; entries: number; dates: Set<string> }>()).values())
    .filter((line) => line.total >= minimumTotal && (!maximumTotal || line.total <= maximumTotal))
    .sort((left, right) => left.supplier.localeCompare(right.supplier, "pt-BR") || left.code.localeCompare(right.code, "pt-BR", { numeric: true }) || left.product.localeCompare(right.product, "pt-BR"));
  const itemHeaders = ["Fornecedor", "Nº produto", "Produto", "Unidade", "Quantidade total", "Custo médio", "Total comprado", "Lançamentos", "Datas"];
  const itemRows = groupedItems.map((line) => [line.supplier, line.code, line.product, line.unit, line.quantity.toFixed(2).replace(".", ","), (line.quantity ? line.total / line.quantity : 0).toFixed(2).replace(".", ","), line.total.toFixed(2).replace(".", ","), line.entries, Array.from(line.dates).sort().map(formatDate).join(", ")]);
  const itemExportLabel = itemPeriod === "Todos" ? "todos-os-periodos" : itemPeriod.replace(":", "-");
  const itemTotal = groupedItems.reduce((sum, line) => sum + line.total, 0);

  return (
    <>
      <PageTitle eyebrow={`COMPRAS · ENTREGA ${dateLabel(selectedDate)}`} title="Compras" description="Demanda automática, pagamentos e fechamento mensal detalhado por fornecedor e produto." action={<div className="heading-actions"><OperationDate value={selectedDate} onChange={setSelectedDate} /><button className="secondary-button" onClick={() => printPurchaseSheet(currentOrders, allocations, suppliers, company)} disabled={!currentOrders.length}><Printer size={17} />PDF compras do dia</button><button className="secondary-button" onClick={() => printSupplierDaySheet(currentOrders, allocations, products, suppliers, company)} disabled={!currentOrders.length}><Store size={17} />PDF por fornecedor</button><button className="secondary-button" onClick={() => printLoadingSheet(currentOrders, allocations, suppliers, company)} disabled={!currentOrders.length}><Truck size={17} />PDF carregamento</button></div>} />
      <section className="panel purchase-excel-actions"><div><strong>Planilhas desta entrega</strong><span>Um produto por linha para facilitar filtros, fórmulas e conferências no Excel.</span></div><div><button className="secondary-button" disabled={!currentOrders.length} onClick={() => downloadPurchaseDayCsv(currentOrders, allocations, suppliers)}><Download size={16} />Excel compras</button><button className="secondary-button" disabled={!currentOrders.length} onClick={() => downloadSupplierDayCsv(currentOrders, allocations, products, suppliers)}><Download size={16} />Excel por fornecedor</button><button className="secondary-button" disabled={!currentOrders.length} onClick={() => downloadLoadingDayCsv(currentOrders, allocations, suppliers)}><Download size={16} />Excel carregamento</button></div></section>
      {deletedPurchase && <div className="success-banner"><CheckCircle2 size={20} /><div><strong>Compra {deletedPurchase} excluída</strong><span>O histórico e as distribuições relacionadas foram removidos do Firestore.</span></div></div>}
      <div className="page-tabs page-tabs--three"><button className={tab === "demand" ? "page-tab--active" : ""} onClick={() => setTab("demand")}><ShoppingBasket size={17} />Demanda desta entrega</button><button className={tab === "history" ? "page-tab--active" : ""} onClick={() => setTab("history")}><ReceiptText size={17} />Histórico e pagamentos</button><button className={tab === "items" ? "page-tab--active" : ""} onClick={() => setTab("items")}><ClipboardList size={17} />Fechamento por produto</button></div>
      {tab === "demand" && <><section className="summary-strip summary-strip--four"><div><span>Produtos diferentes</span><strong>{demand.length}</strong></div><div className="summary-strip__quantity"><span>Total pedido por unidade</span><div className="quantity-by-unit">{demandQuantityByUnit.length ? demandQuantityByUnit.map((entry) => <span key={entry.unit}><b>{entry.total.toLocaleString("pt-BR")}</b><em>{entry.unit}</em></span>) : <span><b>0</b><em>UN</em></span>}</div><small>Cada unidade é somada separadamente</small></div><div><span>Custo planejado</span><strong>{money(allocatedCost)}</strong></div><div><span>Fornecedores usados</span><strong>{new Set(currentAllocations.filter((allocation) => allocation.quantity > 0).map((allocation) => allocation.supplierId)).size}</strong></div></section><section className="demand-list">{demand.map((line) => { const productAllocations = currentAllocations.filter((allocation) => allocation.productId === line.productId); const allocated = productAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0); const allowedSuppliers = suppliersForProduct(line.productId); return <article className="panel demand-card" key={line.productId}><div className="demand-card__summary"><div className="product-symbol"><PackageOpen size={19} /></div><div><strong>{line.name}</strong><span>{line.customers.join(" · ")}</span><small className="supplier-hint">{allowedSuppliers.length ? `${allowedSuppliers.length} fornecedor(es) habilitado(s)` : "Cadastre um fornecedor para este produto"}</small></div><div><small>Demanda total</small><b>{line.total} {line.unit}</b></div><div><small>Já distribuído</small><b className={allocated < line.total ? "warning-text" : "success-text"}>{allocated} {line.unit}</b></div></div><div className="allocation-list">{productAllocations.map((allocation) => <div className="allocation-row" key={allocation.id}><select aria-label={`Fornecedor de ${line.name}`} value={allocation.supplierId} onChange={(event) => updateAllocation(allocation.id, "supplierId", event.target.value)}>{suppliersForProduct(line.productId, allocation.supplierId).map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select><label>Quantidade<DecimalInput ariaLabel={`Quantidade comprada de ${line.name}`} value={allocation.quantity} onValueChange={(value) => updateAllocation(allocation.id, "quantity", value)} /></label><label>Custo por {line.unit}<DecimalInput ariaLabel={`Custo de ${line.name}`} value={allocation.unitCost} onValueChange={(value) => updateAllocation(allocation.id, "unitCost", value)} /></label><strong>{money(allocation.quantity * allocation.unitCost)}</strong><button className="icon-button danger-icon" aria-label="Remover divisão" onClick={() => deleteAllocation(allocation.id)}><Trash2 size={16} /></button></div>)}</div><button className="text-button add-allocation" disabled={!allowedSuppliers.length} onClick={() => addAllocation(line.productId)}><Plus size={16} />Comprar parte em outro fornecedor</button></article>; })}{!demand.length && <div className="panel empty-table">Não há pedidos para a data selecionada.</div>}</section></>}
      {tab === "history" && <><section className="summary-strip summary-strip--four"><div><span>Compras exibidas</span><strong>{visiblePurchaseHistory.length}</strong></div><div><span>Total comprado</span><strong>{money(visiblePurchaseHistory.reduce((sum, purchase) => sum + purchase.total, 0))}</strong></div><div className="summary-strip__warning"><span>A pagar</span><strong>{money(visiblePurchaseHistory.filter((purchase) => purchase.status !== "Pago").reduce((sum, purchase) => sum + purchase.total, 0))}</strong></div><div className="summary-strip__warning"><span>Notas pendentes</span><strong>{visiblePurchaseHistory.filter((purchase) => !purchase.invoiceReceived).length}</strong></div></section><section className="panel list-panel"><div className="list-toolbar"><label className="compact-filter">Período<select value={historyPeriod} onChange={(event) => setHistoryPeriod(event.target.value)}><option>Todos</option><optgroup label="Meses">{historyOptions.months.map((month) => <option value={`month:${month}`} key={month}>{monthLabel(month)}</option>)}</optgroup><optgroup label="Dias">{historyOptions.uniqueDates.map((date) => <option value={`date:${date}`} key={date}>{formatDate(date)}</option>)}</optgroup></select></label><label className="compact-filter">Fornecedor<select value={historySupplier} onChange={(event) => setHistorySupplier(event.target.value)}><option>Todos</option>{Array.from(new Set(purchaseHistory.map((purchase) => purchase.supplier))).sort((left, right) => left.localeCompare(right, "pt-BR")).map((supplier) => <option key={supplier}>{supplier}</option>)}</select></label><label className="compact-filter">Pagamento<select value={historyPayment} onChange={(event) => setHistoryPayment(event.target.value)}><option>Todos</option><option>Pendente</option><option>Parcial</option><option>Pago</option></select></label><label className="compact-filter">Nota recebida<select value={historyInvoice} onChange={(event) => setHistoryInvoice(event.target.value)}><option>Todos</option><option>Não</option><option>Sim</option></select></label><div className="toolbar-spacer" /><button className="secondary-button" onClick={() => downloadCsv("compras-fornecedores.csv", purchaseHeaders, purchaseRows)}><Download size={16} />Excel (.csv)</button><button className="secondary-button" onClick={() => printTableReport("Relatório de compras", `${visiblePurchaseHistory.length} compra(s) exibida(s)`, purchaseHeaders, purchaseRows, company, true)}><FileText size={16} />PDF</button></div><div className="purchase-history"><div className="purchase-history__head"><span>Compra</span><span>Data</span><span>Fornecedor</span><span>Total</span><span>Pagamento</span><span>Nota</span><span>Ações</span></div>{visiblePurchaseHistory.map((purchase) => <div key={purchase.id}><strong>{purchase.number}</strong><span>{formatDate(purchase.date)}</span><b>{purchase.supplier}</b><strong>{money(purchase.total)}</strong><select aria-label={`Pagamento da compra ${purchase.number}`} value={purchase.status} onChange={(event) => savePurchase({ ...purchase, status: event.target.value as PaymentStatus })}><option>Pendente</option><option>Parcial</option><option>Pago</option></select><select aria-label={`Nota da compra ${purchase.number}`} value={purchase.invoiceReceived ? "Sim" : "Não"} onChange={(event) => savePurchase({ ...purchase, invoiceReceived: event.target.value === "Sim" })}><option>Não</option><option>Sim</option></select><button className="square-button danger-icon" aria-label={`Excluir compra ${purchase.number}`} title="Excluir compra" onClick={() => requestDeletePurchase(purchase)}><Trash2 size={16} /></button></div>)}</div>{!visiblePurchaseHistory.length && <div className="empty-table">Nenhuma compra encontrada com esses filtros.</div>}</section></>}
      {tab === "items" && <><section className="summary-strip"><div><span>Produtos consolidados</span><strong>{groupedItems.length}</strong></div><div><span>Lançamentos considerados</span><strong>{filteredAllocationItems.length}</strong></div><div><span>Total comprado</span><strong>{money(itemTotal)}</strong></div></section><section className="panel list-panel"><div className="list-toolbar purchase-item-filters"><label className="compact-filter">Período<select value={itemPeriod} onChange={(event) => setItemPeriod(event.target.value)}><option>Todos</option><optgroup label="Meses">{itemOptions.months.map((month) => <option value={`month:${month}`} key={month}>{monthLabel(month)}</option>)}</optgroup><optgroup label="Dias">{itemOptions.uniqueDates.map((date) => <option value={`date:${date}`} key={date}>{formatDate(date)}</option>)}</optgroup></select></label><label className="compact-filter">Fornecedor<select value={itemSupplier} onChange={(event) => setItemSupplier(event.target.value)}><option>Todos</option>{suppliers.slice().sort((left, right) => left.name.localeCompare(right.name, "pt-BR")).map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select></label><label className="compact-filter">Produto<select value={itemProduct} onChange={(event) => setItemProduct(event.target.value)}><option>Todos</option>{products.slice().sort((left, right) => left.code.localeCompare(right.code, "pt-BR", { numeric: true })).map((product) => <option value={product.id} key={product.id}>{product.code} · {product.name}</option>)}</select></label><label className="compact-filter value-filter">Total mínimo<DecimalInput ariaLabel="Valor total mínimo comprado" value={minimumTotal} onValueChange={setMinimumTotal} /></label><label className="compact-filter value-filter">Total máximo<DecimalInput ariaLabel="Valor total máximo comprado" value={maximumTotal} onValueChange={setMaximumTotal} /></label><div className="toolbar-spacer" /><button className="secondary-button" onClick={() => downloadCsv(`fechamento-compras-${itemExportLabel}.csv`, itemHeaders, itemRows)}><Download size={16} />Excel (.csv)</button><button className="secondary-button" onClick={() => printTableReport("Fechamento de compras por produto", `${groupedItems.length} produto(s) consolidado(s) · ${money(itemTotal)}`, itemHeaders, itemRows, company, true)}><FileText size={16} />PDF</button></div><div className="purchase-items-table"><div className="purchase-items-table__head"><span>Fornecedor</span><span>Nº</span><span>Produto</span><span>Un.</span><span>Qtd. total</span><span>Custo médio</span><span>Total comprado</span><span>Lançamentos / datas</span></div>{groupedItems.map((line) => <div key={line.key}><strong>{line.supplier}</strong><span>{line.code}</span><b>{line.product}</b><span>{line.unit}</span><strong>{line.quantity.toLocaleString("pt-BR")} {line.unit}</strong><span>{money(line.quantity ? line.total / line.quantity : 0)}</span><strong>{money(line.total)}</strong><span><b>{line.entries} lançamento(s)</b><small>{Array.from(line.dates).sort().map(formatDate).join(" · ")}</small></span></div>)}</div>{!groupedItems.length && <div className="empty-table">Nenhuma compra detalhada encontrada com esses filtros.</div>}</section></>}
    </>
  );
}

type RegistryRecord = { id: string; name: string; contact: string; phone: string; address: string; city: string; observation: string; code: string; category: string; unit: Unit; cost: number; sale: number; supplierIds: string[] };
type RegistrySort = "name-asc" | "name-desc" | "code-asc" | "code-desc";

function RegistryPage({ type, records, onSave, onDelete, suppliers = [], onImportProducts, externalQuery = "" }: { type: "clients" | "products" | "suppliers"; records: RegistryRecord[]; onSave: (record: RegistryRecord) => void; onDelete: (id: string) => void; suppliers?: Supplier[]; onImportProducts?: (products: Product[]) => void; externalQuery?: string }) {
  const [editing, setEditing] = useState<RegistryRecord | null>(null);
  const [query, setQuery] = useState(externalQuery);
  const [sort, setSort] = useState<RegistrySort>(type === "products" ? "code-asc" : "name-asc");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkFeedback, setBulkFeedback] = useState<{ imported: number; errors: string[] }>();
  useEffect(() => setQuery(externalQuery), [externalQuery]);
  const config = { clients: { title: "Clientes", description: "Empresas atendidas, contatos e histórico de pedidos.", button: "Novo cliente", icon: UserPlus }, products: { title: "Produtos", description: "Catálogo por número, preços de referência e fornecedores habilitados.", button: "Novo produto", icon: Plus }, suppliers: { title: "Fornecedores", description: "Parceiros de compra, categorias e dias de entrega.", button: "Novo fornecedor", icon: Plus } }[type];
  const Icon = config.icon;
  const sortOptions: Array<{ id: RegistrySort; label: string }> = type === "products"
    ? [{ id: "code-asc", label: "Número ↑" }, { id: "code-desc", label: "Número ↓" }, { id: "name-asc", label: "Nome A–Z" }, { id: "name-desc", label: "Nome Z–A" }]
    : [{ id: "name-asc", label: "Nome A–Z" }, { id: "name-desc", label: "Nome Z–A" }];
  const openEditor = (record?: RegistryRecord) => setEditing(record ?? { id: `new-${Date.now()}`, name: "", contact: "", phone: "", address: "", city: "", observation: "", code: "", category: "", unit: "UN", cost: 0, sale: 0, supplierIds: [] });
  const updateDraft = <K extends keyof RegistryRecord,>(field: K, value: RegistryRecord[K]) => setEditing((current) => current ? { ...current, [field]: value } : current);
  const toggleSupplier = (supplierId: string) => setEditing((current) => current ? { ...current, supplierIds: current.supplierIds.includes(supplierId) ? current.supplierIds.filter((id) => id !== supplierId) : [...current.supplierIds, supplierId] } : current);
  const saveRecord = () => {
    if (!editing || !editing.name.trim()) return;
    onSave({ ...editing, name: editing.name.trim(), code: editing.code.trim() });
    setEditing(null);
  };
  const cycleSort = () => {
    const index = sortOptions.findIndex((option) => option.id === sort);
    setSort(sortOptions[(index + 1) % sortOptions.length].id);
  };
  const visibleRecords = useMemo(() => records
    .filter((record) => normalizeSearch(`${record.code} ${record.name} ${record.contact}`).includes(normalizeSearch(query.trim())))
    .sort((left, right) => {
      if (sort === "code-asc" || sort === "code-desc") {
        const direction = sort === "code-asc" ? 1 : -1;
        const leftCode = left.code || "\uffff";
        const rightCode = right.code || "\uffff";
        return direction * leftCode.localeCompare(rightCode, "pt-BR", { numeric: true }) || left.name.localeCompare(right.name, "pt-BR");
      }
      const direction = sort === "name-asc" ? 1 : -1;
      return direction * left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" });
    }), [records, query, sort]);
  const importProducts = () => {
    const parsed = parseProductList(bulkText);
    const existingCodes = new Set(records.map((record) => normalizeSearch(record.code.trim())).filter(Boolean));
    const acceptedCodes = new Set<string>();
    const duplicates: string[] = [];
    const accepted = parsed.products.filter((product, index) => {
      const code = normalizeSearch(product.code);
      if (existingCodes.has(code) || acceptedCodes.has(code)) {
        duplicates.push(`Linha ${index + 1}: número ${product.code} já cadastrado ou repetido.`);
        return false;
      }
      acceptedCodes.add(code);
      return true;
    });
    onImportProducts?.(accepted);
    setBulkFeedback({ imported: accepted.length, errors: [...parsed.errors, ...duplicates] });
    if (accepted.length && !parsed.errors.length && !duplicates.length) setBulkText("");
  };
  return (
    <>
      <PageTitle eyebrow="CADASTROS" title={config.title} description={config.description} action={<div className="heading-actions">{type === "products" && <button className="secondary-button" onClick={() => { setBulkOpen((current) => !current); setBulkFeedback(undefined); }}><ClipboardList size={17} />Inserir lista</button>}<button className="primary-button" onClick={() => openEditor()}><Icon size={18} />{config.button}</button></div>} />
      {type === "products" && bulkOpen && <section className="panel bulk-import">
        <div className="registry-editor__heading"><div><strong>Inserir vários produtos</strong><span>Use uma linha por produto: Nome, Número, Categoria, Unidade, Custo, Venda. Unidades: SC, KG, UN, FD, MÇ, BDJ, PCT, CU ou CX.</span></div><button className="icon-button" aria-label="Fechar importação" onClick={() => setBulkOpen(false)}><X size={18} /></button></div>
        <textarea rows={8} value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder={"Alface americana, 010, Folhas, UN, 2,50, 3,80\nBatata doce; 011; Tubérculos; KG; 4,20; 5,90"} />
        {bulkFeedback && <div className={bulkFeedback.errors.length ? "bulk-feedback bulk-feedback--warning" : "bulk-feedback"}><strong>{bulkFeedback.imported} produto(s) inserido(s).</strong>{bulkFeedback.errors.slice(0, 4).map((error) => <span key={error}>{error}</span>)}{bulkFeedback.errors.length > 4 && <span>Mais {bulkFeedback.errors.length - 4} linha(s) precisam de revisão.</span>}</div>}
        <div className="registry-editor__actions"><button className="secondary-button" onClick={() => { setBulkText(""); setBulkFeedback(undefined); }}>Limpar</button><button className="primary-button" disabled={!bulkText.trim()} onClick={importProducts}><Save size={17} />Importar produtos</button></div>
      </section>}
      {editing && <section className="panel registry-editor">
        <div className="registry-editor__heading"><div><strong>{records.some((record) => record.id === editing.id) ? "Editar cadastro" : "Novo cadastro"}</strong><span>Preencha os dados operacionais que serão consultados nos pedidos.</span></div><button className="icon-button" aria-label="Fechar cadastro" onClick={() => setEditing(null)}><X size={18} /></button></div>
        <div className="registry-editor__grid">
          <label className="registry-field registry-field--wide">{type === "products" ? "Produto" : type === "clients" ? "Nome do cliente" : "Nome do fornecedor"}<input value={editing.name} onChange={(event) => updateDraft("name", event.target.value)} autoFocus /></label>
          {type === "products" ? <>
            <label className="registry-field">Número do produto<input value={editing.code} inputMode="numeric" onChange={(event) => updateDraft("code", event.target.value)} placeholder="Ex.: 010" /></label>
            <label className="registry-field">Categoria<input value={editing.category} onChange={(event) => updateDraft("category", event.target.value)} /></label>
            <label className="registry-field">Unidade<select value={editing.unit} onChange={(event) => updateDraft("unit", event.target.value as Unit)}>{productUnits.map((unit) => <option value={unit} key={unit}>{unit}</option>)}</select></label>
            <label className="registry-field">Custo de referência<DecimalInput ariaLabel="Custo de referência" value={editing.cost} onValueChange={(value) => updateDraft("cost", value)} /></label>
            <label className="registry-field">Venda de referência<DecimalInput ariaLabel="Venda de referência" value={editing.sale} onValueChange={(value) => updateDraft("sale", value)} /></label>
            <fieldset className="registry-field registry-field--full supplier-picker"><legend>Fornecedores deste produto</legend><p>Selecione um ou vários. Se nenhum for marcado, todos ficam disponíveis para manter cadastros antigos compatíveis.</p><div>{suppliers.map((supplier) => <label key={supplier.id}><input type="checkbox" checked={editing.supplierIds.includes(supplier.id)} onChange={() => toggleSupplier(supplier.id)} /><span>{supplier.name}</span></label>)}</div>{!suppliers.length && <small>Nenhum fornecedor cadastrado ainda.</small>}</fieldset>
          </> : <>
            <label className="registry-field">Nome de contato<input value={editing.contact} onChange={(event) => updateDraft("contact", event.target.value)} /></label>
            <label className="registry-field">Telefone<input value={editing.phone} inputMode="tel" onChange={(event) => updateDraft("phone", event.target.value)} /></label>
            <label className="registry-field registry-field--wide">Endereço<input value={editing.address} onChange={(event) => updateDraft("address", event.target.value)} /></label>
            <label className="registry-field">Cidade<input value={editing.city} onChange={(event) => updateDraft("city", event.target.value)} /></label>
            <label className="registry-field registry-field--full">Observação<textarea rows={3} value={editing.observation} onChange={(event) => updateDraft("observation", event.target.value)} /></label>
          </>}
        </div>
        <div className="registry-editor__actions"><button className="secondary-button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" onClick={saveRecord} disabled={!editing.name.trim()}><Save size={17} />Salvar cadastro</button></div>
      </section>}
      <section className="panel list-panel">
        <div className="list-toolbar"><div className="inline-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${config.title.toLowerCase()}...`} /></div><button className="secondary-button" onClick={cycleSort}><ListFilter size={16} />Ordenar: {sortOptions.find((option) => option.id === sort)?.label}</button></div>
        <div className={`registry-cards registry-cards--${type}`}>{visibleRecords.map((record) => {
          const supplierNames = record.supplierIds.map((id) => suppliers.find((supplier) => supplier.id === id)?.name).filter(Boolean);
          return <article key={record.id}><div className="registry-card-icon">{type === "clients" ? <UsersRound size={20} /> : type === "products" ? <PackageOpen size={20} /> : <Store size={20} />}</div><div className="registry-card-copy">{type === "products" ? <><small>Nº {record.code || "—"} · {record.category || "Sem categoria"}</small><h3>{record.name}</h3><p>Unidade: {record.unit}</p><span>{supplierNames.length ? `Fornecedores: ${supplierNames.join(", ")}` : "Todos os fornecedores disponíveis"}</span><div className="reference-prices"><b>Custo: {money(record.cost)}</b><b>Venda: {money(record.sale)}</b></div></> : <><small>{record.contact || "Contato não informado"}</small><h3>{record.name}</h3><p>{record.phone || "Telefone não informado"}</p><span>{[record.address, record.city].filter(Boolean).join(" · ") || "Endereço não informado"}</span>{record.observation && <em>{record.observation}</em>}</>}</div><div className="registry-card-actions"><button aria-label={`Editar ${record.name}`} onClick={() => openEditor(record)}><Edit3 size={16} /></button><button className="danger-icon" aria-label={`Excluir ${record.name}`} onClick={() => onDelete(record.id)}><Trash2 size={16} /></button></div></article>;
        })}</div>
        {!visibleRecords.length && <div className="empty-table">Nenhum cadastro encontrado.</div>}
      </section>
    </>
  );
}

function ServiceProvidersPage({ providers, onSave, onDelete, externalQuery = "" }: { providers: ServiceProvider[]; onSave: (provider: ServiceProvider) => void; onDelete: (id: string) => void; externalQuery?: string }) {
  const [editing, setEditing] = useState<ServiceProvider | null>(null);
  const [query, setQuery] = useState(externalQuery);
  const [descending, setDescending] = useState(false);
  useEffect(() => setQuery(externalQuery), [externalQuery]);
  const visible = providers
    .filter((provider) => normalizeSearch(provider.name).includes(normalizeSearch(query.trim())))
    .sort((left, right) => (descending ? -1 : 1) * left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" }));
  const save = () => {
    if (!editing?.name.trim()) return;
    onSave({ ...editing, name: editing.name.trim() });
    setEditing(null);
  };
  return (
    <>
      <PageTitle eyebrow="CADASTROS" title="Prestadores" description="Pessoas que prestam serviços e podem ser selecionadas no controle de pagamentos." action={<button className="primary-button" onClick={() => setEditing({ id: `provider-${Date.now()}`, name: "" })}><UserPlus size={18} />Novo prestador</button>} />
      {editing && <section className="panel registry-editor provider-editor">
        <div className="registry-editor__heading"><div><strong>{providers.some((provider) => provider.id === editing.id) ? "Editar prestador" : "Novo prestador"}</strong><span>Informe o nome que deverá aparecer nos pagamentos e relatórios.</span></div><button className="icon-button" aria-label="Fechar cadastro" onClick={() => setEditing(null)}><X size={18} /></button></div>
        <div className="registry-editor__grid"><label className="registry-field registry-field--full">Nome do prestador<input value={editing.name} onChange={(event) => setEditing((current) => current ? { ...current, name: event.target.value } : current)} autoFocus /></label></div>
        <div className="registry-editor__actions"><button className="secondary-button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" onClick={save} disabled={!editing.name.trim()}><Save size={17} />Salvar prestador</button></div>
      </section>}
      <section className="panel list-panel">
        <div className="list-toolbar"><div className="inline-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar prestador..." /></div><button className="secondary-button" onClick={() => setDescending((current) => !current)}><ListFilter size={16} />Ordenar: {descending ? "Nome Z–A" : "Nome A–Z"}</button></div>
        <div className="registry-cards registry-cards--providers">{visible.map((provider) => <article key={provider.id}><div className="registry-card-icon"><UsersRound size={20} /></div><div className="registry-card-copy"><small>PRESTADOR</small><h3>{provider.name}</h3><p>Disponível para novos pagamentos</p><span>O histórico já registrado preserva o nome usado na data.</span></div><div className="registry-card-actions"><button aria-label={`Editar ${provider.name}`} onClick={() => setEditing(provider)}><Edit3 size={16} /></button><button className="danger-icon" aria-label={`Excluir ${provider.name}`} onClick={() => onDelete(provider.id)}><Trash2 size={16} /></button></div></article>)}</div>
        {!visible.length && <div className="empty-table">Nenhum prestador cadastrado.</div>}
      </section>
    </>
  );
}

function ProviderPaymentsPage({ providers, payments, onSave, onDelete, company }: { providers: ServiceProvider[]; payments: ServiceProviderPayment[]; onSave: (payment: ServiceProviderPayment) => void; onDelete: (id: string) => void; company: CompanyProfile }) {
  const [editing, setEditing] = useState<ServiceProviderPayment | null>(null);
  const [query, setQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState("Todos");
  const [providerFilter, setProviderFilter] = useState("Todos");
  const [methodFilter, setMethodFilter] = useState("Todos");
  const [minimumAmount, setMinimumAmount] = useState(0);
  const [maximumAmount, setMaximumAmount] = useState(0);
  const sortedProviders = providers.slice().sort((left, right) => left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" }));
  const { uniqueDates, months } = exportPeriodOptions(payments.map((payment) => payment.date));
  const providerNames = Array.from(new Set([...providers.map((provider) => provider.name), ...payments.map((payment) => payment.providerName)])).sort((left, right) => left.localeCompare(right, "pt-BR"));
  const visible = payments.filter((payment) => {
    const periodMatches = periodFilter === "Todos" || (periodFilter.startsWith("date:") ? payment.date === periodFilter.slice(5) : payment.date.startsWith(periodFilter.slice(6)));
    const queryMatches = normalizeSearch(`${payment.providerName} ${payment.reason}`).includes(normalizeSearch(query.trim()));
    const providerMatches = providerFilter === "Todos" || payment.providerName === providerFilter;
    const methodMatches = methodFilter === "Todos" || payment.paymentMethod === methodFilter;
    const minimumMatches = !minimumAmount || payment.amount >= minimumAmount;
    const maximumMatches = !maximumAmount || payment.amount <= maximumAmount;
    return periodMatches && queryMatches && providerMatches && methodMatches && minimumMatches && maximumMatches;
  }).sort((left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id));
  const total = visible.reduce((sum, payment) => sum + payment.amount, 0);
  const pixTotal = visible.filter((payment) => payment.paymentMethod === "Pix").reduce((sum, payment) => sum + payment.amount, 0);
  const cashTotal = visible.filter((payment) => payment.paymentMethod === "Dinheiro").reduce((sum, payment) => sum + payment.amount, 0);
  const reportHeaders = ["Data", "Prestador", "Motivo", "Forma de pagamento", "Valor"];
  const reportRows = visible.map((payment) => [formatDate(payment.date), payment.providerName, payment.reason, payment.paymentMethod, payment.amount.toFixed(2).replace(".", ",")]);
  const openNew = () => {
    const provider = sortedProviders[0];
    setEditing({ id: `provider-payment-${Date.now()}`, date: localIsoDate(), providerId: provider?.id ?? "", providerName: provider?.name ?? "", reason: "", amount: 0, paymentMethod: "Pix" });
  };
  const update = <K extends keyof ServiceProviderPayment,>(field: K, value: ServiceProviderPayment[K]) => setEditing((current) => current ? { ...current, [field]: value } : current);
  const selectProvider = (providerId: string) => {
    const provider = providers.find((candidate) => candidate.id === providerId);
    setEditing((current) => current ? { ...current, providerId, providerName: provider?.name ?? current.providerName } : current);
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!editing || !editing.date || !editing.providerId || !editing.reason.trim() || editing.amount <= 0) return;
    onSave({ ...editing, reason: editing.reason.trim() });
    setEditing(null);
  };
  const periodLabel = periodFilter === "Todos" ? "todo o histórico" : periodFilter.startsWith("date:") ? formatDate(periodFilter.slice(5)) : monthLabel(periodFilter.slice(6));
  return (
    <>
      <PageTitle eyebrow="FINANCEIRO · PRESTADORES" title="Controle de prestadores" description="Registre os pagamentos realizados e consulte o histórico com filtros e totais." action={<button className="primary-button" onClick={openNew} disabled={!providers.length}><Plus size={18} />Incluir pagamento</button>} />
      {!providers.length && <div className="data-guidance"><UsersRound size={18} /><div><strong>Cadastre um prestador primeiro</strong><span>Abra Cadastros › Prestadores para liberar a inclusão de pagamentos.</span></div></div>}
      {editing && <form className="panel provider-payment-editor" onSubmit={save}>
        <div className="registry-editor__heading"><div><strong>{payments.some((payment) => payment.id === editing.id) ? "Editar pagamento" : "Incluir pagamento"}</strong><span>O valor informado será somado aos totais e relatórios do período.</span></div><button className="icon-button" type="button" aria-label="Fechar pagamento" onClick={() => setEditing(null)}><X size={18} /></button></div>
        <div className="provider-payment-form">
          <label className="registry-field">Data do pagamento<input type="date" value={editing.date} onChange={(event) => update("date", event.target.value)} /></label>
          <label className="registry-field">Prestador<select value={editing.providerId} onChange={(event) => selectProvider(event.target.value)}>{editing.providerId && !providers.some((provider) => provider.id === editing.providerId) && <option value={editing.providerId}>{editing.providerName}</option>}{sortedProviders.map((provider) => <option value={provider.id} key={provider.id}>{provider.name}</option>)}</select></label>
          <label className="registry-field">Forma de pagamento<select value={editing.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value as ServiceProviderPaymentMethod)}><option>Pix</option><option>Dinheiro</option></select></label>
          <label className="registry-field">Valor<DecimalInput ariaLabel="Valor do pagamento ao prestador" value={editing.amount} onValueChange={(value) => update("amount", value)} /></label>
          <label className="registry-field registry-field--full">Motivo do pagamento<textarea rows={3} value={editing.reason} onChange={(event) => update("reason", event.target.value)} placeholder="Ex.: carregamento e separação da entrega do dia" /></label>
        </div>
        <div className="provider-payment-editor__footer"><div><span>Total deste pagamento</span><strong>{money(editing.amount)}</strong></div><div><button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button" type="submit" disabled={!editing.date || !editing.providerId || !editing.reason.trim() || editing.amount <= 0}><Save size={17} />Salvar pagamento</button></div></div>
      </form>}
      <section className="provider-payment-summary">
        <article><span>Pagamentos exibidos</span><strong>{visible.length}</strong><small>{periodLabel}</small></article>
        <article><span>Total pago</span><strong>{money(total)}</strong><small>{visible.length ? `Média de ${money(total / visible.length)}` : "Nenhum lançamento"}</small></article>
        <article><span>Pago via Pix</span><strong>{money(pixTotal)}</strong><small>{visible.filter((payment) => payment.paymentMethod === "Pix").length} pagamento(s)</small></article>
        <article><span>Pago em dinheiro</span><strong>{money(cashTotal)}</strong><small>{visible.filter((payment) => payment.paymentMethod === "Dinheiro").length} pagamento(s)</small></article>
      </section>
      <section className="panel list-panel provider-payments-panel">
        <div className="list-toolbar provider-payment-filters">
          <div className="inline-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar motivo ou prestador..." /></div>
          <label className="compact-filter">Período<select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}><option>Todos</option><optgroup label="Meses">{months.map((month) => <option value={`month:${month}`} key={month}>{monthLabel(month)}</option>)}</optgroup><optgroup label="Dias">{uniqueDates.map((date) => <option value={`date:${date}`} key={date}>{formatDate(date)}</option>)}</optgroup></select></label>
          <label className="compact-filter">Prestador<select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}><option>Todos</option>{providerNames.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label className="compact-filter">Forma<select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}><option>Todos</option><option>Pix</option><option>Dinheiro</option></select></label>
          <label className="compact-filter value-filter">Valor mínimo<DecimalInput ariaLabel="Valor mínimo do pagamento" value={minimumAmount} onValueChange={setMinimumAmount} /></label>
          <label className="compact-filter value-filter">Valor máximo<DecimalInput ariaLabel="Valor máximo do pagamento" value={maximumAmount} onValueChange={setMaximumAmount} /></label>
          <div className="toolbar-spacer" />
          <button className="secondary-button" disabled={!visible.length} onClick={() => downloadCsv("pagamentos-prestadores.csv", reportHeaders, reportRows)}><Download size={16} />Excel (.csv)</button>
          <button className="secondary-button" disabled={!visible.length} onClick={() => printTableReport("Pagamentos de prestadores", `${visible.length} pagamento(s) · ${periodLabel} · Total ${money(total)}`, reportHeaders, reportRows, company)}><FileText size={16} />PDF</button>
        </div>
        <div className="provider-payments-table"><div className="provider-payments-table__head"><span>Data</span><span>Prestador</span><span>Motivo</span><span>Forma</span><span>Valor</span><span>Ações</span></div>{visible.map((payment) => <div className="provider-payments-table__row" key={payment.id}><span>{formatDate(payment.date)}</span><strong>{payment.providerName}</strong><span>{payment.reason}</span><b>{payment.paymentMethod}</b><strong>{money(payment.amount)}</strong><div className="row-actions"><button aria-label={`Editar pagamento de ${payment.providerName}`} onClick={() => setEditing(payment)}><Edit3 size={16} /></button><button className="danger-icon" aria-label={`Excluir pagamento de ${payment.providerName}`} onClick={() => onDelete(payment.id)}><Trash2 size={16} /></button></div></div>)}</div>
        {!visible.length && <div className="empty-table">Nenhum pagamento encontrado com esses filtros.</div>}
      </section>
    </>
  );
}

function CompanySettingsPage({ company, onSave }: { company: CompanyProfile; onSave: (company: CompanyProfile) => void }) {
  const [draft, setDraft] = useState(company);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(company), [company]);
  const update = (field: keyof CompanyProfile, value: string) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [field]: value }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ ...draft, id: "company", tradeName: draft.tradeName.trim() || "Zeca Hortifruti" });
    setSaved(true);
  };
  const location = [draft.city, draft.state].filter(Boolean).join(" - ");
  return (
    <>
      <PageTitle eyebrow="CONFIGURAÇÃO" title="Dados da empresa" description="Estas informações aparecem no cabeçalho de todos os pedidos, folhas operacionais e relatórios em PDF." />
      {saved && <div className="success-banner"><CheckCircle2 size={20} /><div><strong>Dados da empresa salvos</strong><span>As próximas impressões já usarão este cabeçalho.</span></div></div>}
      <form className="company-settings-layout" onSubmit={submit}>
        <section className="panel form-card">
          <div className="form-section-title"><span><Building2 size={16} /></span><div><h2>Identificação e contato</h2><p>Preencha os dados que devem formalizar os documentos da Zeca Hortifruti.</p></div></div>
          <div className="registry-editor__grid">
            <label className="registry-field">Nome fantasia<input value={draft.tradeName} onChange={(event) => update("tradeName", event.target.value)} placeholder="Zeca Hortifruti" /></label>
            <label className="registry-field registry-field--wide">Razão social<input value={draft.legalName} onChange={(event) => update("legalName", event.target.value)} /></label>
            <label className="registry-field">CNPJ / CPF<input value={draft.taxId} onChange={(event) => update("taxId", event.target.value)} /></label>
            <label className="registry-field">Inscrição estadual<input value={draft.stateRegistration} onChange={(event) => update("stateRegistration", event.target.value)} /></label>
            <label className="registry-field">Telefone<input value={draft.phone} inputMode="tel" onChange={(event) => update("phone", event.target.value)} /></label>
            <label className="registry-field registry-field--wide">E-mail<input value={draft.email} inputMode="email" onChange={(event) => update("email", event.target.value)} /></label>
            <label className="registry-field registry-field--wide">Endereço completo<input value={draft.address} onChange={(event) => update("address", event.target.value)} placeholder="Rua, número e complemento" /></label>
            <label className="registry-field">CEP<input value={draft.postalCode} inputMode="numeric" onChange={(event) => update("postalCode", event.target.value)} /></label>
            <label className="registry-field">Cidade<input value={draft.city} onChange={(event) => update("city", event.target.value)} /></label>
            <label className="registry-field">Estado<input value={draft.state} maxLength={2} onChange={(event) => update("state", event.target.value.toUpperCase())} placeholder="SP" /></label>
          </div>
          <div className="registry-editor__actions"><button className="primary-button" type="submit"><Save size={17} />Salvar dados da empresa</button></div>
        </section>
        <aside className="panel company-preview">
          <small>PRÉVIA DO CABEÇALHO</small>
          <strong>{draft.tradeName || "Zeca Hortifruti"}</strong>
          {draft.legalName && <span>{draft.legalName}</span>}
          {(draft.taxId || draft.stateRegistration) && <span>{draft.taxId && `CNPJ/CPF ${draft.taxId}`}{draft.taxId && draft.stateRegistration ? " · " : ""}{draft.stateRegistration && `IE ${draft.stateRegistration}`}</span>}
          {(draft.address || location || draft.postalCode) && <span>{[draft.address, location, draft.postalCode ? `CEP ${draft.postalCode}` : ""].filter(Boolean).join(" · ")}</span>}
          {(draft.phone || draft.email) && <span>{[draft.phone, draft.email].filter(Boolean).join(" · ")}</span>}
          <div><FileText size={20} /><p>Este bloco será incluído no início de todas as folhas impressas e relatórios salvos como PDF.</p></div>
        </aside>
      </form>
    </>
  );
}

const defaultOperationDate = (orders: Order[]) => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dates = Array.from(new Set(orders.map((order) => order.deliveryDate))).sort();
  if (dates.includes(today)) return today;
  return dates[dates.length - 1] ?? today;
};

const makeInitialAllocations = (orders: Order[]): PurchaseAllocation[] => {
  const grouped = new Map<string, { deliveryDate: string; productId: string; quantity: number }>();
  orders.forEach((order) => order.items.filter((line) => line.includeInPurchase !== false).forEach((line) => {
    const key = `${order.deliveryDate}:${line.productId}`;
    const current = grouped.get(key) ?? { deliveryDate: order.deliveryDate, productId: line.productId, quantity: 0 };
    current.quantity += line.quantity;
    grouped.set(key, current);
  }));
  return Array.from(grouped.values()).map((line, index) => {
    const product = demoProducts.find((candidate) => candidate.id === line.productId);
    return {
      id: `allocation-${line.deliveryDate}-${line.productId}`,
      deliveryDate: line.deliveryDate,
      productId: line.productId,
      supplierId: product?.supplierIds?.[0] ?? demoSuppliers[index % demoSuppliers.length].id,
      quantity: line.quantity,
      unitCost: product?.costReference ?? 0,
    };
  });
};

const makeInitialOperationStages = (orders: Order[]): OperationStagesByDate => {
  const currentDate = defaultOperationDate(orders);
  return Object.fromEntries(Array.from(new Set(orders.map((order) => order.deliveryDate))).map((date) => [date, date < currentDate ? [true, true, true, true] : [true, false, false, false]]));
};

function App({ firebaseUser, firebaseRole }: { firebaseUser: FirebaseUser | null; firebaseRole: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<ViewId>(viewFromHash);
  const [editingOrder, setEditingOrder] = useState<Order | undefined>();
  const [savedOrder, setSavedOrder] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [selectedDate, setSelectedDate] = useState(() => defaultOperationDate(initialOrders));
  const [seeding, setSeeding] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [pageSearch, setPageSearch] = useState<{ view: ViewId; query: string }>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const clientStore = useSyncedCollection<Client>("clients", demoClients);
  const productStore = useSyncedCollection<Product>("products", demoProducts);
  const supplierStore = useSyncedCollection<Supplier>("suppliers", demoSuppliers);
  const providerStore = useSyncedCollection<ServiceProvider>("serviceProviders", []);
  const providerPaymentStore = useSyncedCollection<ServiceProviderPayment>("serviceProviderPayments", []);
  const orderStore = useSyncedCollection<Order>("orders", initialOrders);
  const allocationStore = useSyncedCollection<PurchaseAllocation>("purchaseAllocations", makeInitialAllocations(initialOrders));
  const purchaseStore = useSyncedCollection<PurchaseRecord>("purchases", initialPurchases);
  const companyStore = useSyncedCollection<CompanyProfile>("companySettings", [defaultCompanyProfile]);
  const initialOperationDays = Object.entries(makeInitialOperationStages(initialOrders)).map(([date, stages]) => ({ id: date, date, stages }));
  const operationStore = useSyncedCollection<OperationDay>("operationDays", initialOperationDays);
  const company = companyStore.records.find((record) => record.id === "company") ?? defaultCompanyProfile;
  const orders = [...orderStore.records].sort((left, right) => right.date.localeCompare(left.date) || right.number.localeCompare(left.number, undefined, { numeric: true }));
  const allocations = allocationStore.records;
  const purchaseHistory = useMemo(() => buildPurchaseHistory(allocations, supplierStore.records, purchaseStore.records), [allocations, supplierStore.records, purchaseStore.records]);
  const deliveryDates = Array.from(new Set(orders.map((order) => order.deliveryDate))).sort();
  const nextDeliveryDate = deliveryDates[deliveryDates.length - 1] ?? localIsoDate();
  const operationStages: OperationStagesByDate = Object.fromEntries(operationStore.records.map((operation) => [operation.date, operation.stages]));
  const dataLoading = [clientStore, productStore, supplierStore, providerStore, providerPaymentStore, orderStore, allocationStore, purchaseStore, operationStore, companyStore].some((store) => store.loading);
  const dataError = [clientStore, productStore, supplierStore, providerStore, providerPaymentStore, orderStore, allocationStore, purchaseStore, operationStore, companyStore].map((store) => store.error).find(Boolean) ?? "";
  const databaseEmpty = firebaseConfigured && !dataLoading && !clientStore.records.length && !productStore.records.length && !supplierStore.records.length && !providerStore.records.length && !providerPaymentStore.records.length && !orders.length;
  const pendingOrders = orders.filter((order) => order.paymentStatus !== "Pago");
  const pendingPurchases = purchaseHistory.filter((purchase) => purchase.status !== "Pago");
  const normalizedGlobalQuery = normalizeSearch(globalQuery.trim());
  const globalResults = useMemo<GlobalSearchResult[]>(() => {
    if (normalizedGlobalQuery.length < 2) return [];
    const candidates: GlobalSearchResult[] = [
      ...orders.map((order) => ({ id: `order-${order.id}`, view: "orders" as const, label: "Pedido", title: `${order.number} · ${order.customer}`, detail: `Pedido ${formatDate(order.date)} · Entrega ${formatDate(order.deliveryDate)}`, query: order.number })),
      ...clientStore.records.map((client) => ({ id: `client-${client.id}`, view: "clients" as const, label: "Cliente", title: client.name, detail: [client.contact, client.phone, client.city].filter(Boolean).join(" · ") || "Cadastro de cliente", query: client.name })),
      ...productStore.records.map((product) => ({ id: `product-${product.id}`, view: "products" as const, label: "Produto", title: `${product.code || "—"} · ${product.name}`, detail: `${product.category || "Sem categoria"} · ${money(product.saleReference)}/${product.unit}`, query: product.code || product.name })),
      ...supplierStore.records.map((supplier) => ({ id: `supplier-${supplier.id}`, view: "suppliers" as const, label: "Fornecedor", title: supplier.name, detail: [supplier.contact, supplier.phone, supplier.city].filter(Boolean).join(" · ") || "Cadastro de fornecedor", query: supplier.name })),
      ...providerStore.records.map((provider) => ({ id: `provider-${provider.id}`, view: "providers" as const, label: "Prestador", title: provider.name, detail: "Cadastro de prestador de serviço", query: provider.name })),
    ];
    return candidates.filter((candidate) => normalizeSearch(`${candidate.label} ${candidate.title} ${candidate.detail}`).includes(normalizedGlobalQuery)).slice(0, 10);
  }, [normalizedGlobalQuery, orders, clientStore.records, productStore.records, supplierStore.records, providerStore.records]);

  useEffect(() => { document.documentElement.dataset.theme = theme; try { window.localStorage.setItem("zeca-hortifruti-theme", theme); } catch (_) { /* preference remains active for this session */ } }, [theme]);
  useEffect(() => { const handleHash = () => setView(viewFromHash()); window.addEventListener("hashchange", handleHash); if (!window.location.hash) window.history.replaceState(null, "", "#/inicio"); return () => window.removeEventListener("hashchange", handleHash); }, []);
  useEffect(() => { if (orders.length && !orders.some((order) => order.deliveryDate === selectedDate)) setSelectedDate(defaultOperationDate(orders)); }, [orders, selectedDate]);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setGlobalSearchOpen(true);
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setGlobalSearchOpen(false);
        setNotificationOpen(false);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);
  const navigate: Navigate = (next) => { setView(next); setPageSearch(undefined); setGlobalSearchOpen(false); setNotificationOpen(false); if (next !== "orders") setSavedOrder(false); window.history.pushState(null, "", `#/${routes[next]}`); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const startNewOrder = () => { setEditingOrder(undefined); navigate("order-form"); };
  const editOrder = (order: Order) => { setEditingOrder(order); navigate("order-form"); };
  const openNextDelivery = () => { setSelectedDate(nextDeliveryDate); navigate("operation"); };
  const openGlobalResult = (result: GlobalSearchResult) => {
    setGlobalQuery("");
    navigate(result.view);
    setPageSearch({ view: result.view, query: result.query });
  };
  const saveOrder = (order: Order) => { orderStore.upsert(order); setSavedOrder(true); setEditingOrder(order); };
  const deleteOrder = (order: Order) => { orderStore.remove(order.id); if (editingOrder?.id === order.id) setEditingOrder(undefined); };
  const deletePurchase = (purchase: PurchaseRecord) => {
    if (purchase.source === "allocation" && purchase.supplierId) {
      allocations
        .filter((allocation) => allocation.deliveryDate === purchase.date && allocation.supplierId === purchase.supplierId)
        .forEach((allocation) => allocationStore.remove(allocation.id));
    }
    purchaseStore.remove(purchase.id);
  };
  const updatePayment = (number: string, status: PaymentStatus) => { const order = orders.find((candidate) => candidate.number === number); if (order) orderStore.upsert({ ...order, paymentStatus: status }); };
  const updatePaymentMethod = (number: string, method: PaymentMethod) => { const order = orders.find((candidate) => candidate.number === number); if (order) orderStore.upsert({ ...order, paymentMethod: method }); };
  const updatePaymentReference = (number: string, reference: string) => { const order = orders.find((candidate) => candidate.number === number); if (order && (order.paymentReference ?? "") !== reference) orderStore.upsert({ ...order, paymentReference: reference }); };
  const saveOperationStages = (date: string, stages: boolean[]) => operationStore.upsert({ id: date, date, stages });
  const seedDemo = async () => {
    setSeeding(true);
    try {
      await seedFirestore({ clients: demoClients, products: demoProducts, suppliers: demoSuppliers, orders: initialOrders, purchaseAllocations: makeInitialAllocations(initialOrders), purchases: initialPurchases, operationDays: initialOperationDays, companySettings: [defaultCompanyProfile] });
    } finally {
      setSeeding(false);
    }
  };
  const nextOrderNumber = `#${orders.length ? Math.max(...orders.map((order) => Number(order.number.replace(/\D/g, "")) || 0)) + 1 : 1}`;
  let content: ReactNode;
  if (view === "dashboard") content = <Dashboard navigate={navigate} startNewOrder={startNewOrder} orders={orders} selectedDate={selectedDate} setSelectedDate={setSelectedDate} allocations={allocations} operationStages={operationStages} supplierCatalog={supplierStore.records} purchaseHistory={purchaseHistory} company={company} />;
  else if (view === "analytics") content = <AnalyticsDashboard orders={orders} purchaseHistory={purchaseHistory} providerPayments={providerPaymentStore.records} selectedDate={selectedDate} />;
  else if (view === "order-form") content = <OrderForm key={editingOrder?.number ?? "new-order"} order={editingOrder} nextNumber={nextOrderNumber} navigate={navigate} onSave={saveOrder} catalogClients={clientStore.records} catalogProducts={productStore.records} company={company} />;
  else if (view === "orders") content = <OrdersPage orders={orders} saved={savedOrder} startNewOrder={startNewOrder} editOrder={editOrder} deleteOrder={deleteOrder} updatePayment={updatePayment} updatePaymentMethod={updatePaymentMethod} updatePaymentReference={updatePaymentReference} company={company} externalQuery={pageSearch?.view === "orders" ? pageSearch.query : ""} />;
  else if (view === "operation") content = <OperationPage orders={orders} editOrder={editOrder} selectedDate={selectedDate} setSelectedDate={setSelectedDate} allocations={allocations} operationStages={operationStages} saveOperationStages={saveOperationStages} supplierCatalog={supplierStore.records} company={company} />;
  else if (view === "purchases") content = <PurchasesPage orders={orders} selectedDate={selectedDate} setSelectedDate={setSelectedDate} allocations={allocations} products={productStore.records} suppliers={supplierStore.records} purchaseHistory={purchaseHistory} saveAllocation={allocationStore.upsert} deleteAllocation={allocationStore.remove} savePurchase={purchaseStore.upsert} deletePurchase={deletePurchase} company={company} />;
  else if (view === "provider-payments") content = <ProviderPaymentsPage providers={providerStore.records} payments={providerPaymentStore.records} onSave={providerPaymentStore.upsert} onDelete={providerPaymentStore.remove} company={company} />;
  else if (view === "clients") content = <RegistryPage key={view} type="clients" externalQuery={pageSearch?.view === "clients" ? pageSearch.query : ""} records={clientStore.records.map((client) => ({ id: client.id, name: client.name, contact: client.contact, phone: client.phone, address: client.address, city: client.city, observation: client.observation, code: "", category: "", unit: "UN", cost: 0, sale: 0, supplierIds: [] }))} onSave={(record) => clientStore.upsert({ id: record.id, name: record.name, contact: record.contact, phone: record.phone, address: record.address, city: record.city, observation: record.observation, orders: clientStore.records.find((client) => client.id === record.id)?.orders ?? 0, status: "Ativo" })} onDelete={clientStore.remove} />;
  else if (view === "products") content = <RegistryPage key={view} type="products" externalQuery={pageSearch?.view === "products" ? pageSearch.query : ""} suppliers={supplierStore.records} records={productStore.records.map((product) => ({ id: product.id, name: product.name, contact: "", phone: "", address: "", city: "", observation: "", code: product.code, category: product.category, unit: product.unit, cost: product.costReference, sale: product.saleReference, supplierIds: product.supplierIds ?? [] }))} onSave={(record) => productStore.upsert({ id: record.id, code: record.code, name: record.name, category: record.category, unit: record.unit, costReference: record.cost, saleReference: record.sale, aliases: productStore.records.find((product) => product.id === record.id)?.aliases ?? [record.name], supplierIds: record.supplierIds })} onImportProducts={productStore.upsertMany} onDelete={productStore.remove} />;
  else if (view === "suppliers") content = <RegistryPage key={view} type="suppliers" externalQuery={pageSearch?.view === "suppliers" ? pageSearch.query : ""} records={supplierStore.records.map((supplier) => ({ id: supplier.id, name: supplier.name, contact: supplier.contact, phone: supplier.phone, address: supplier.address, city: supplier.city, observation: supplier.observation, code: "", category: supplier.categories, unit: "UN", cost: 0, sale: 0, supplierIds: [] }))} onSave={(record) => supplierStore.upsert({ id: record.id, name: record.name, categories: record.category, contact: record.contact, phone: record.phone, address: record.address, city: record.city, observation: record.observation, delivery: record.observation, rating: supplierStore.records.find((supplier) => supplier.id === record.id)?.rating ?? "Novo" })} onDelete={supplierStore.remove} />;
  else if (view === "providers") content = <ServiceProvidersPage providers={providerStore.records} onSave={providerStore.upsert} onDelete={providerStore.remove} externalQuery={pageSearch?.view === "providers" ? pageSearch.query : ""} />;
  else content = <CompanySettingsPage company={company} onSave={companyStore.upsert} />;
  if (dataLoading) return <AccessScreen state="loading" retry={() => undefined} />;
  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} close={() => setMenuOpen(false)} current={view} navigate={navigate} startNewOrder={startNewOrder} firebaseUser={firebaseUser} firebaseRole={firebaseRole} nextDeliveryDate={nextDeliveryDate} openNextDelivery={openNextDelivery} />
      <main className="main-content">
        <header className="topbar">
          <div className="topbar__left">
            <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button>
            <div className="global-search">
              <div className="search-box"><Search size={18} /><input ref={searchInputRef} aria-label="Pesquisar em todo o sistema" value={globalQuery} placeholder="Buscar pedido, cliente, produto, fornecedor ou prestador..." onFocus={() => setGlobalSearchOpen(true)} onChange={(event) => { setGlobalQuery(event.target.value); setGlobalSearchOpen(true); }} onBlur={() => setTimeout(() => setGlobalSearchOpen(false), 140)} /><kbd>Ctrl K</kbd></div>
              {globalSearchOpen && globalQuery.trim() && <div className="global-search-results" role="listbox">{globalResults.length ? globalResults.map((result) => <button key={result.id} role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => openGlobalResult(result)}><span>{result.label}</span><div><strong>{result.title}</strong><small>{result.detail}</small></div><ChevronRight size={16} /></button>) : <div className="search-empty">Nenhum resultado encontrado.</div>}</div>}
            </div>
          </div>
          <div className="topbar__actions">
            <button className="icon-button theme-button" type="button" aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} aria-pressed={theme === "dark"} title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button>
            <div className="notification-menu">
              <button className="icon-button notification-button" aria-label="Notificações financeiras" aria-expanded={notificationOpen} onClick={() => setNotificationOpen((current) => !current)}><Bell size={20} />{pendingOrders.length + pendingPurchases.length > 0 && <span />}</button>
              {notificationOpen && <div className="notification-panel"><div className="notification-panel__header"><strong>Pendências</strong><small>{pendingOrders.length + pendingPurchases.length} aviso(s)</small></div>{pendingOrders.length ? <button onClick={() => navigate("orders")}><CreditCard size={18} /><div><strong>{pendingOrders.length} pedido(s) a receber</strong><span>{money(pendingOrders.reduce((sum, order) => sum + orderTotal(order), 0))}</span></div><ChevronRight size={16} /></button> : <div className="notification-ok"><CheckCircle2 size={17} />Nenhum cliente pendente</div>}{pendingPurchases.length ? <button onClick={() => navigate("purchases")}><CircleDollarSign size={18} /><div><strong>{pendingPurchases.length} compra(s) a pagar</strong><span>{money(pendingPurchases.reduce((sum, purchase) => sum + purchase.total, 0))}</span></div><ChevronRight size={16} /></button> : <div className="notification-ok"><CheckCircle2 size={17} />Nenhum fornecedor pendente</div>}</div>}
            </div>
            <button className="primary-button topbar-new-order" onClick={startNewOrder}><Plus size={18} /><span>Novo pedido</span></button>
          </div>
        </header>
        {firebaseConfigured ? <div className="secure-banner" role="status"><ShieldCheck size={15} /><strong>Ambiente protegido</strong><span>Login Google e dados sincronizados com o Firestore.</span></div> : <div className="demo-banner" role="status"><Leaf size={15} /><strong>Ambiente demonstrativo</strong><span>Configure o Firebase antes de inserir informações reais.</span></div>}
        {dataError && <div className="data-error" role="alert"><X size={15} /><strong>Falha ao sincronizar:</strong><span>{dataError}</span></div>}
        {databaseEmpty && <div className="database-empty"><div><strong>Banco conectado e vazio</strong><span>Você pode iniciar os cadastros do zero ou carregar os dados fictícios para validar o fluxo.</span></div><button className="secondary-button" disabled={seeding} onClick={() => void seedDemo()}>{seeding ? "Carregando..." : "Carregar dados demonstrativos"}</button></div>}
        <div className="page">{content}</div>
      </main>
      <nav className="mobile-nav" aria-label="Navegação móvel"><button className={view === "dashboard" ? "mobile-nav__active" : ""} onClick={() => navigate("dashboard")}><LayoutDashboard size={21} /><span>Início</span></button><button className={view === "orders" ? "mobile-nav__active" : ""} onClick={() => navigate("orders")}><ClipboardList size={21} /><span>Pedidos</span></button><button className="mobile-create" aria-label="Novo pedido" onClick={startNewOrder}><Plus size={25} /></button><button className={view === "operation" ? "mobile-nav__active" : ""} onClick={() => navigate("operation")}><Truck size={21} /><span>Operação</span></button><button className={["analytics", "provider-payments", "providers"].includes(view) ? "mobile-nav__active" : ""} onClick={() => setMenuOpen(true)}><Menu size={21} /><span>Mais</span></button></nav>
    </div>
  );
}

export default FirebaseGate;
