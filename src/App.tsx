import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Eye,
  Filter,
  LayoutDashboard,
  Leaf,
  ListFilter,
  MapPin,
  Menu,
  Moon,
  PackageCheck,
  PackageOpen,
  Plus,
  Route,
  Save,
  Search,
  ShoppingBasket,
  Store,
  Sun,
  Truck,
  UserPlus,
  UsersRound,
  Warehouse,
  X,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

type ViewId = "dashboard" | "order-form" | "orders" | "operation" | "purchases" | "clients" | "products" | "suppliers";
type Navigate = (view: ViewId) => void;
type Theme = "light" | "dark";

type Order = {
  number: string;
  customer: string;
  items: number;
  total: number;
  status: "Confirmado" | "Separando" | "Separado" | "Rascunho";
};

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
  { id: "order-form" as ViewId, label: "Editar/Incluir Pedido", icon: Plus },
  { id: "orders" as ViewId, label: "Lista de Pedidos", icon: ClipboardList },
  { id: "operation" as ViewId, label: "Operação do Dia", icon: Truck },
  { id: "purchases" as ViewId, label: "Compras", icon: ShoppingBasket },
];

const registrations = [
  { id: "clients" as ViewId, label: "Clientes", icon: UsersRound },
  { id: "products" as ViewId, label: "Produtos", icon: Boxes },
  { id: "suppliers" as ViewId, label: "Fornecedores", icon: Store },
];

const initialOrders: Order[] = [
  { number: "#1048", customer: "Mercado Silva", items: 8, total: 1248.5, status: "Confirmado" },
  { number: "#1047", customer: "Padaria Central", items: 5, total: 684.2, status: "Separando" },
  { number: "#1046", customer: "Restaurante Itália", items: 11, total: 1976.8, status: "Separado" },
  { number: "#1045", customer: "Quitanda do Bairro", items: 6, total: 920.4, status: "Confirmado" },
  { number: "#1044", customer: "Hotel Avenida", items: 14, total: 2310.0, status: "Confirmado" },
];

const products = [
  { name: "Tomate italiano", category: "Hortaliças", unit: "kg", stock: "186 kg", price: 6.9 },
  { name: "Batata lavada", category: "Tubérculos", unit: "kg", stock: "142 kg", price: 4.8 },
  { name: "Cebola nacional", category: "Hortaliças", unit: "kg", stock: "98 kg", price: 5.2 },
  { name: "Banana nanica", category: "Frutas", unit: "cx", stock: "42 cx", price: 38 },
  { name: "Alface crespa", category: "Folhas", unit: "un", stock: "74 un", price: 3.2 },
  { name: "Laranja pera", category: "Frutas", unit: "kg", stock: "215 kg", price: 4.1 },
];

const clients = [
  { name: "Mercado Silva", contact: "Marcos Silva", phone: "(11) 98842-1201", city: "Centro", orders: 18, status: "Ativo" },
  { name: "Padaria Central", contact: "Ana Martins", phone: "(11) 97731-4402", city: "Vila Nova", orders: 12, status: "Ativo" },
  { name: "Restaurante Itália", contact: "Paulo Neri", phone: "(11) 99128-5530", city: "Jardins", orders: 9, status: "Ativo" },
  { name: "Hotel Avenida", contact: "Carla Lima", phone: "(11) 96620-1184", city: "Centro", orders: 7, status: "Ativo" },
];

const suppliers = [
  { name: "Sítio Boa Colheita", categories: "Folhas e hortaliças", contact: "João • (11) 98811-2200", delivery: "Seg, qua e sex", rating: "Excelente" },
  { name: "Distribuidora Vale Verde", categories: "Frutas e tubérculos", contact: "Beatriz • (11) 97744-1920", delivery: "Diária", rating: "Excelente" },
  { name: "Cooperativa Nova Safra", categories: "Frutas da estação", contact: "Carlos • (11) 99150-4412", delivery: "Ter e qui", rating: "Bom" },
];

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getInitialTheme = (): Theme => {
  const appliedTheme = document.documentElement.dataset.theme;
  if (appliedTheme === "light" || appliedTheme === "dark") return appliedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

function Sidebar({ open, close, current, navigate }: { open: boolean; close: () => void; current: ViewId; navigate: Navigate }) {
  const select = (view: ViewId) => {
    navigate(view);
    close();
  };

  return (
    <>
      {open && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={close} />}
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="brand">
          <div className="brand__mark"><Leaf size={22} strokeWidth={2.4} /></div>
          <div><strong>ZECA</strong><span>HORTIFRUTI</span></div>
          <button className="icon-button sidebar__close" onClick={close} aria-label="Fechar menu"><X size={20} /></button>
        </div>

        <button className="operation-chip" onClick={() => select("operation")}>
          <span className="operation-chip__dot" />
          <span><small>Próxima entrega</small><strong>Qua, 22 de julho</strong></span>
          <ChevronRight size={16} />
        </button>

        <nav className="sidebar__nav" aria-label="Menu principal">
          <span className="nav-label">OPERAÇÃO</span>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button className={`nav-item ${current === id ? "nav-item--active" : ""}`} onClick={() => select(id)} key={id} aria-current={current === id ? "page" : undefined}>
              <Icon size={19} /><span>{label}</span>
            </button>
          ))}
          <span className="nav-label nav-label--spaced">CADASTROS</span>
          {registrations.map(({ id, label, icon: Icon }) => (
            <button className={`nav-item ${current === id ? "nav-item--active" : ""}`} onClick={() => select(id)} key={id} aria-current={current === id ? "page" : undefined}>
              <Icon size={19} /><span>{label}</span>
            </button>
          ))}
        </nav>

        <button className="sidebar__account" aria-label="Abrir perfil">
          <span className="avatar">RG</span>
          <span><strong>Rafael Generoso</strong><small>Administrador</small></span>
          <ChevronDown size={16} />
        </button>
      </aside>
    </>
  );
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <section className="page-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      {action}
    </section>
  );
}

function Dashboard({ navigate, orders }: { navigate: Navigate; orders: Order[] }) {
  const recentOrders = orders.slice(0, 3);
  const purchaseItems = [
    { product: "Tomate italiano", amount: "186 kg", progress: 72 },
    { product: "Batata lavada", amount: "142 kg", progress: 55 },
    { product: "Cebola", amount: "98 kg", progress: 38 },
  ];
  return (
    <>
      <PageTitle eyebrow="TERÇA-FEIRA, 21 DE JULHO" title="Visão geral da operação" description="Acompanhe o que precisa de atenção para a próxima entrega." action={<button className="date-button" onClick={() => navigate("operation")}>Entrega: <strong>22 jul 2026</strong><ChevronRight size={17} /></button>} />
      <section className="operation-hero">
        <div className="operation-hero__copy">
          <div className="status-pill"><span /> Operação em andamento</div>
          <h2>Entrega de quarta-feira</h2>
          <p>12 pedidos de 8 clientes estão confirmados. A compra de 4 produtos ainda precisa ser concluída.</p>
          <div className="operation-hero__actions">
            <button className="light-button" onClick={() => navigate("operation")}><Truck size={18} />Abrir operação</button>
            <button className="ghost-button" onClick={() => navigate("purchases")}>Ver lista de compras<ArrowRight size={17} /></button>
          </div>
        </div>
        <div className="operation-steps" aria-label="Progresso da operação">
          <div className="step step--done"><span><ClipboardList size={17} /></span><small>Pedidos</small><strong>12 confirmados</strong></div><div className="step-line step-line--done" />
          <div className="step step--current"><span><ShoppingBasket size={17} /></span><small>Compras</small><strong>Em andamento</strong></div><div className="step-line" />
          <div className="step"><span><PackageCheck size={17} /></span><small>Separação</small><strong>0 de 12</strong></div><div className="step-line" />
          <div className="step"><span><Truck size={17} /></span><small>Carregamento</small><strong>Pendente</strong></div>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card"><div className="metric-icon metric-icon--green"><ClipboardList size={20} /></div><div><span>Pedidos confirmados</span><strong>12</strong><small><b>+3</b> desde ontem</small></div></article>
        <article className="metric-card"><div className="metric-icon metric-icon--orange"><UsersRound size={20} /></div><div><span>Clientes na rota</span><strong>8</strong><small>Rota organizada</small></div></article>
        <article className="metric-card"><div className="metric-icon metric-icon--blue"><ShoppingBasket size={20} /></div><div><span>Itens para comprar</span><strong>34</strong><small><b className="warning-text">4 pendentes</b></small></div></article>
        <article className="metric-card"><div className="metric-icon metric-icon--violet"><CircleDollarSign size={20} /></div><div><span>Valor dos pedidos</span><strong>R$ 8.420</strong><small>Entrega selecionada</small></div></article>
      </section>

      <section className="content-grid">
        <article className="panel orders-panel">
          <div className="panel__header"><div><h3>Pedidos recentes</h3><p>Últimas alterações para a próxima entrega</p></div><button className="text-button" onClick={() => navigate("orders")}>Ver todos<ArrowRight size={16} /></button></div>
          <div className="orders-table">
            <div className="table-row table-head"><span>Pedido</span><span>Cliente</span><span>Itens</span><span>Total</span><span>Status</span><span /></div>
            {recentOrders.map((order) => <OrderRow order={order} onOpen={() => navigate("orders")} key={order.number} />)}
          </div>
        </article>
        <article className="panel purchase-panel">
          <div className="panel__header"><div><h3>Necessidade de compra</h3><p>Maiores volumes da entrega</p></div><button className="square-button" aria-label="Abrir compras" onClick={() => navigate("purchases")}><ArrowRight size={17} /></button></div>
          <div className="purchase-list">
            {purchaseItems.map((item) => <div className="purchase-item" key={item.product}><div><strong>{item.product}</strong><span>{item.amount}</span></div><div className="progress"><span style={{ width: `${item.progress}%` }} /></div></div>)}
          </div>
          <button className="purchase-alert" onClick={() => navigate("purchases")}><ShoppingBasket size={19} /><span><strong>4 produtos sem fornecedor</strong><small>Defina antes de finalizar as compras.</small></span><ChevronRight size={18} /></button>
        </article>
      </section>

      <section className="quick-actions">
        <div className="section-heading"><h3>Acessos rápidos</h3><p>Continue de onde a operação precisa.</p></div>
        <div className="quick-actions__grid">
          <button onClick={() => navigate("order-form")}><span><Plus size={20} /></span><div><strong>Novo pedido</strong><small>Incluir produtos rapidamente</small></div><ChevronRight size={18} /></button>
          <button onClick={() => navigate("operation")}><span><PackageCheck size={20} /></span><div><strong>Iniciar separação</strong><small>Organizar produtos por cliente</small></div><ChevronRight size={18} /></button>
          <button onClick={() => navigate("operation")}><span><Truck size={20} /></span><div><strong>Lista de carregamento</strong><small>Conferir a carga por rota</small></div><ChevronRight size={18} /></button>
        </div>
      </section>
    </>
  );
}

function OrderRow({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const tone = order.status === "Confirmado" ? "green" : order.status === "Separando" ? "amber" : order.status === "Separado" ? "blue" : "gray";
  return (
    <div className="table-row">
      <strong>{order.number}</strong><span>{order.customer}</span><span>{order.items} itens</span><strong>{money(order.total)}</strong><span><b className={`order-status order-status--${tone}`}>{order.status}</b></span><button className="row-arrow" aria-label={`Abrir ${order.number}`} onClick={onOpen}><ChevronRight size={18} /></button>
    </div>
  );
}

function OrderForm({ navigate, onSave }: { navigate: Navigate; onSave: (order: Order) => void }) {
  const [customer, setCustomer] = useState("Mercado Silva");
  const [delivery, setDelivery] = useState("2026-07-22");
  const [quantities, setQuantities] = useState<Record<string, number>>({ "Tomate italiano": 20, "Batata lavada": 10 });
  const selected = products.filter((product) => quantities[product.name] > 0);
  const total = selected.reduce((sum, product) => sum + quantities[product.name] * product.price, 0);

  const updateQuantity = (name: string, value: number) => setQuantities((current) => ({ ...current, [name]: Math.max(0, value || 0) }));
  const save = (event: FormEvent) => {
    event.preventDefault();
    onSave({ number: "#1049", customer, items: selected.length, total, status: "Confirmado" });
    navigate("orders");
  };

  return (
    <>
      <PageTitle eyebrow="PEDIDOS" title="Incluir novo pedido" description="Registre o pedido do cliente e confira o resumo antes de confirmar." action={<button className="secondary-button" onClick={() => navigate("orders")}><ArrowLeft size={17} />Voltar à lista</button>} />
      <form className="form-layout" onSubmit={save}>
        <section className="panel form-card">
          <div className="form-section-title"><span>1</span><div><h2>Dados do pedido</h2><p>Quem vai receber e quando será a entrega.</p></div></div>
          <div className="form-grid">
            <label>Cliente<select value={customer} onChange={(event) => setCustomer(event.target.value)}>{clients.map((client) => <option key={client.name}>{client.name}</option>)}</select></label>
            <label>Data de entrega<input type="date" value={delivery} onChange={(event) => setDelivery(event.target.value)} /></label>
            <label className="form-grid__wide">Observações<textarea placeholder="Ex.: entregar pela entrada lateral..." rows={3} /></label>
          </div>
          <div className="form-section-title form-section-title--border"><span>2</span><div><h2>Produtos</h2><p>Informe a quantidade desejada de cada item.</p></div></div>
          <div className="product-picker">
            {products.map((product) => (
              <div className={`product-picker__row ${quantities[product.name] ? "product-picker__row--selected" : ""}`} key={product.name}>
                <div className="product-symbol"><PackageOpen size={19} /></div>
                <div><strong>{product.name}</strong><small>{product.category} • {money(product.price)}/{product.unit}</small></div>
                <label>Qtd.<input aria-label={`Quantidade de ${product.name}`} type="number" min="0" value={quantities[product.name] ?? 0} onChange={(event) => updateQuantity(product.name, Number(event.target.value))} /></label>
              </div>
            ))}
          </div>
        </section>
        <aside className="panel order-summary">
          <h2>Resumo do pedido</h2><p>Entrega em {delivery.split("-").reverse().join("/")}</p>
          <div className="summary-client"><UsersRound size={18} /><div><small>Cliente</small><strong>{customer}</strong></div></div>
          <div className="summary-lines">{selected.length ? selected.map((product) => <div key={product.name}><span>{quantities[product.name]} {product.unit} · {product.name}</span><strong>{money(quantities[product.name] * product.price)}</strong></div>) : <p>Nenhum produto selecionado.</p>}</div>
          <div className="summary-total"><span>Total estimado</span><strong>{money(total)}</strong></div>
          <button className="primary-button primary-button--wide" type="submit" disabled={!selected.length}><Save size={18} />Salvar pedido</button>
          <small className="summary-note">Protótipo: o pedido ficará salvo apenas nesta sessão.</small>
        </aside>
      </form>
    </>
  );
}

function OrdersPage({ orders, navigate, saved }: { orders: Order[]; navigate: Navigate; saved: boolean }) {
  const [filter, setFilter] = useState("Todos");
  const visibleOrders = filter === "Todos" ? orders : orders.filter((order) => order.status === filter);
  return (
    <>
      <PageTitle eyebrow="PEDIDOS" title="Lista de pedidos" description="Consulte, filtre e acompanhe todos os pedidos da próxima entrega." action={<button className="primary-button" onClick={() => navigate("order-form")}><Plus size={18} />Novo pedido</button>} />
      {saved && <div className="success-banner"><CheckCircle2 size={20} /><div><strong>Pedido #1049 incluído</strong><span>O novo pedido já aparece no início da lista.</span></div></div>}
      <section className="panel list-panel">
        <div className="list-toolbar">
          <div className="inline-search"><Search size={17} /><input placeholder="Buscar por cliente ou número..." /></div>
          <div className="filter-chips" aria-label="Filtrar pedidos">{["Todos", "Confirmado", "Separando", "Separado"].map((item) => <button className={filter === item ? "filter-chip--active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div>
          <button className="secondary-button"><Filter size={16} />Mais filtros</button>
        </div>
        <div className="orders-table orders-table--full">
          <div className="table-row table-head"><span>Pedido</span><span>Cliente</span><span>Itens</span><span>Total</span><span>Status</span><span /></div>
          {visibleOrders.map((order) => <OrderRow order={order} onOpen={() => navigate("order-form")} key={order.number} />)}
        </div>
      </section>
    </>
  );
}

function OperationPage() {
  const [tasks, setTasks] = useState([true, true, false, false]);
  const toggle = (index: number) => setTasks((current) => current.map((done, taskIndex) => taskIndex === index ? !done : done));
  const completed = tasks.filter(Boolean).length;
  return (
    <>
      <PageTitle eyebrow="ENTREGA · 22 DE JULHO" title="Operação do dia" description="Controle a separação, conferência e saída da próxima entrega." action={<button className="date-button"><Clock3 size={16} />Atualizado agora</button>} />
      <section className="operation-summary-grid">
        <article className="panel operation-progress-card"><div className="status-pill status-pill--light"><span /> Operação em andamento</div><h2>{completed} de 4 etapas concluídas</h2><p>Conclua as compras antes de iniciar a separação dos pedidos.</p><div className="big-progress"><span style={{ width: `${completed * 25}%` }} /></div><small>{completed * 25}% concluído</small></article>
        <article className="panel route-card"><div className="metric-icon metric-icon--orange"><Route size={21} /></div><div><small>Rota prevista</small><strong>8 clientes · 42 km</strong><span>Saída recomendada às 06:30</span></div><button className="square-button" aria-label="Ver rota"><ChevronRight size={17} /></button></article>
      </section>
      <section className="operation-board">
        {[{ icon: ClipboardCheck, title: "Pedidos confirmados", detail: "12 pedidos", done: true }, { icon: ShoppingBasket, title: "Compras concluídas", detail: "30 de 34 itens", done: tasks[1] }, { icon: PackageCheck, title: "Separação por cliente", detail: "0 de 12 pedidos", done: tasks[2] }, { icon: Truck, title: "Carregamento", detail: "Aguardando separação", done: tasks[3] }].map((step, index) => (
          <button className={`operation-stage ${step.done ? "operation-stage--done" : ""}`} onClick={() => toggle(index)} key={step.title}>
            <span className="stage-check">{step.done ? <Check size={17} /> : index + 1}</span><step.icon size={22} /><div><strong>{step.title}</strong><small>{step.detail}</small></div><ChevronRight size={18} />
          </button>
        ))}
      </section>
      <section className="content-grid operation-bottom">
        <article className="panel"><div className="panel__header"><div><h3>Sequência de separação</h3><p>Pedidos organizados por prioridade</p></div><ListFilter size={18} /></div><div className="compact-list">{initialOrders.slice(0, 4).map((order, index) => <div key={order.number}><span className="sequence-number">{index + 1}</span><div><strong>{order.customer}</strong><small>{order.number} · {order.items} itens</small></div><b>{index === 0 ? "Próximo" : "Na fila"}</b></div>)}</div></article>
        <article className="panel"><div className="panel__header"><div><h3>Pontos de atenção</h3><p>Antes de liberar a carga</p></div></div><div className="attention-list"><p><span>!</span>4 produtos ainda não foram comprados.</p><p><span>!</span>2 clientes precisam confirmar o horário.</p><p className="attention-list__ok"><span><Check size={14} /></span>Todos os endereços foram conferidos.</p></div></article>
      </section>
    </>
  );
}

function PurchasesPage() {
  const purchaseRows = [
    { name: "Tomate italiano", amount: "186 kg", supplier: "Sítio Boa Colheita", cost: 890, done: true },
    { name: "Batata lavada", amount: "142 kg", supplier: "Vale Verde", cost: 610, done: true },
    { name: "Cebola nacional", amount: "98 kg", supplier: "A definir", cost: 430, done: false },
    { name: "Banana nanica", amount: "42 cx", supplier: "Nova Safra", cost: 1260, done: false },
    { name: "Alface crespa", amount: "74 un", supplier: "Sítio Boa Colheita", cost: 148, done: true },
  ];
  const [checked, setChecked] = useState(purchaseRows.map((row) => row.done));
  const completed = checked.filter(Boolean).length;
  return (
    <>
      <PageTitle eyebrow="PRÓXIMA ENTREGA" title="Lista de compras" description="Consolide as necessidades de todos os pedidos em uma única conferência." action={<button className="primary-button"><Warehouse size={18} />Fechar compras</button>} />
      <section className="metrics-grid metrics-grid--three">
        <article className="metric-card"><div className="metric-icon metric-icon--green"><CheckCircle2 size={20} /></div><div><span>Itens comprados</span><strong>{completed} de {purchaseRows.length}</strong><small>Marque ao confirmar</small></div></article>
        <article className="metric-card"><div className="metric-icon metric-icon--orange"><CircleDollarSign size={20} /></div><div><span>Custo estimado</span><strong>R$ 3.338</strong><small>Antes de ajustes</small></div></article>
        <article className="metric-card"><div className="metric-icon metric-icon--blue"><Store size={20} /></div><div><span>Fornecedores</span><strong>3</strong><small>1 produto sem definição</small></div></article>
      </section>
      <section className="panel purchase-workspace">
        <div className="list-toolbar"><div><h2>Produtos necessários</h2><p>Lista calculada a partir de 12 pedidos confirmados.</p></div><button className="secondary-button"><Filter size={16} />Filtrar</button></div>
        <div className="purchase-table">
          <div className="purchase-table__head"><span /><span>Produto</span><span>Quantidade</span><span>Fornecedor</span><span>Custo estimado</span></div>
          {purchaseRows.map((row, index) => <label className={checked[index] ? "purchase-table__done" : ""} key={row.name}><input type="checkbox" checked={checked[index]} onChange={() => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))} /><span className="custom-check">{checked[index] && <Check size={14} />}</span><strong>{row.name}</strong><span>{row.amount}</span><span className={row.supplier === "A definir" ? "warning-text" : ""}>{row.supplier}</span><b>{money(row.cost)}</b></label>)}
        </div>
      </section>
    </>
  );
}

function RegistryPage({ type }: { type: "clients" | "products" | "suppliers" }) {
  const config = {
    clients: { eyebrow: "CADASTROS", title: "Clientes", description: "Empresas atendidas, contatos e histórico de pedidos.", button: "Novo cliente", icon: UserPlus },
    products: { eyebrow: "CATÁLOGO", title: "Produtos", description: "Itens disponíveis, unidades de venda e preços de referência.", button: "Novo produto", icon: Plus },
    suppliers: { eyebrow: "CADASTROS", title: "Fornecedores", description: "Parceiros de compra, categorias e dias de entrega.", button: "Novo fornecedor", icon: Plus },
  }[type];
  const [showForm, setShowForm] = useState(false);
  const Icon = config.icon;
  return (
    <>
      <PageTitle eyebrow={config.eyebrow} title={config.title} description={config.description} action={<button className="primary-button" onClick={() => setShowForm((value) => !value)}><Icon size={18} />{config.button}</button>} />
      {showForm && <div className="panel quick-register"><div><strong>Cadastro rápido</strong><span>Esta prévia demonstra como a inclusão aparecerá no sistema.</span></div><input placeholder={`Nome do ${type === "clients" ? "cliente" : type === "products" ? "produto" : "fornecedor"}`} autoFocus /><button className="primary-button" onClick={() => setShowForm(false)}><Save size={17} />Salvar</button><button className="icon-button" aria-label="Fechar cadastro" onClick={() => setShowForm(false)}><X size={18} /></button></div>}
      <section className="panel list-panel">
        <div className="list-toolbar"><div className="inline-search"><Search size={17} /><input placeholder={`Buscar ${config.title.toLowerCase()}...`} /></div><button className="secondary-button"><ListFilter size={16} />Ordenar</button></div>
        {type === "clients" && <div className="registry-table"><div className="registry-head"><span>Cliente</span><span>Contato</span><span>Região</span><span>Pedidos</span><span>Status</span><span /></div>{clients.map((client) => <div key={client.name}><strong>{client.name}</strong><span>{client.contact}<small>{client.phone}</small></span><span>{client.city}</span><span>{client.orders}</span><b className="order-status order-status--green">{client.status}</b><button className="row-arrow" aria-label={`Ver ${client.name}`}><Eye size={17} /></button></div>)}</div>}
        {type === "products" && <div className="product-grid">{products.map((product) => <article key={product.name}><div className="product-symbol product-symbol--large"><PackageOpen size={22} /></div><div><small>{product.category}</small><h3>{product.name}</h3><p>Estoque de referência: <strong>{product.stock}</strong></p></div><div><span>{money(product.price)}</span><small>por {product.unit}</small></div><button className="square-button" aria-label={`Editar ${product.name}`}><ChevronRight size={17} /></button></article>)}</div>}
        {type === "suppliers" && <div className="supplier-grid">{suppliers.map((supplier) => <article key={supplier.name}><div className="supplier-icon"><Store size={22} /></div><div><small>{supplier.categories}</small><h3>{supplier.name}</h3><p>{supplier.contact}</p><span><Truck size={14} />{supplier.delivery}</span></div><b>{supplier.rating}</b><button className="square-button" aria-label={`Ver ${supplier.name}`}><ChevronRight size={17} /></button></article>)}</div>}
      </section>
    </>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<ViewId>(viewFromHash);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [savedOrder, setSavedOrder] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("zeca-hortifruti-theme", theme);
    } catch (_) {
      // The selected theme still works for the current session when storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const handleHash = () => setView(viewFromHash());
    window.addEventListener("hashchange", handleHash);
    if (!window.location.hash) window.history.replaceState(null, "", "#/inicio");
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const navigate: Navigate = (next) => {
    setView(next);
    if (next !== "orders") setSavedOrder(false);
    window.history.pushState(null, "", `#/${routes[next]}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveOrder = (order: Order) => {
    setOrders((current) => [order, ...current.filter((item) => item.number !== order.number)]);
    setSavedOrder(true);
  };

  const content = useMemo(() => {
    if (view === "dashboard") return <Dashboard navigate={navigate} orders={orders} />;
    if (view === "order-form") return <OrderForm navigate={navigate} onSave={saveOrder} />;
    if (view === "orders") return <OrdersPage orders={orders} navigate={navigate} saved={savedOrder} />;
    if (view === "operation") return <OperationPage />;
    if (view === "purchases") return <PurchasesPage />;
    return <RegistryPage type={view} />;
  }, [view, orders, savedOrder]);

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} close={() => setMenuOpen(false)} current={view} navigate={navigate} />
      <main className="main-content">
        <header className="topbar">
          <div className="topbar__left">
            <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button>
            <div className="search-box"><Search size={18} /><input aria-label="Pesquisar" placeholder="Buscar pedido, cliente ou produto..." /><kbd>⌘ K</kbd></div>
          </div>
          <div className="topbar__actions">
            <button
              className="icon-button theme-button"
              type="button"
              aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
              aria-pressed={theme === "dark"}
              title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button className="icon-button notification-button" aria-label="Notificações"><Bell size={20} /><span /></button>
            <button className="primary-button" onClick={() => navigate("order-form")}><Plus size={18} />Novo pedido</button>
          </div>
        </header>
        <div className="demo-banner" role="status">
          <Leaf size={15} />
          <strong>Ambiente demonstrativo</strong>
          <span>Todos os nomes, valores e registros apresentados são fictícios.</span>
        </div>
        <div className="page">{content}</div>
      </main>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        <button className={view === "dashboard" ? "mobile-nav__active" : ""} onClick={() => navigate("dashboard")}><LayoutDashboard size={21} /><span>Início</span></button>
        <button className={view === "orders" ? "mobile-nav__active" : ""} onClick={() => navigate("orders")}><ClipboardList size={21} /><span>Pedidos</span></button>
        <button className="mobile-create" aria-label="Novo pedido" onClick={() => navigate("order-form")}><Plus size={25} /></button>
        <button className={view === "operation" ? "mobile-nav__active" : ""} onClick={() => navigate("operation")}><Truck size={21} /><span>Operação</span></button>
        <button onClick={() => setMenuOpen(true)}><Menu size={21} /><span>Mais</span></button>
      </nav>
    </div>
  );
}

export default App;
