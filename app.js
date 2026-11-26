/* ============================================================
   M&P Drive Thru — lógica do site (v4)
   Cardápio interativo, status inteligente, carrinho com agendamento,
   prova social, Google Maps interativo e operação 100% retirada
   ============================================================ */
(() => {
  'use strict';

  /* ---------- Configurações da loja (edite facilmente aqui) ---------- */
  const STORE = {
    name: 'M&P Drive Thru',
    wa: '5594981182223',
    phoneLabel: '(94) 98118-2223',
    instagram: 'https://www.instagram.com/mp_drive_thru',
    googleProfileUrl: 'https://www.google.com/maps/search/?api=1&query=M%26P+Drive+Thru+Tucurui+PA',
    address: 'TV W03, Quadra 19, nº 203 — Bairro Cohab, Tucuruí/PA (mesma rua da Loja do Sérgio)',
    addressShort: 'TV W03, Quadra 19, nº 203 — Cohab, Tucuruí/PA',
    // Para travar o pino exato por GPS, substitua por 'latitude,longitude'
    mapQuery: 'Tv. W 3, 203 - COHAB, Tucuruí - PA, 68459-589',
    hours: 'Segunda a domingo, das 10h às 14h (fechado às terças-feiras)',
    prepTime: '20 a 30 min',
    openMins: 600,        // 10:00
    lastOrderMins: 825,   // 13:45 (últimos pedidos)
    closeMins: 840,       // 14:00
    lastOrderLabel: '13h45',
    // Quando gravar um vídeo curto (10-15s) da churrasqueira, salve em assets/video-brasa.mp4 e preencha abaixo:
    brasaVideo: '',
    // Métricas exibidas na seção de Prova Social (atualize com os números reais da loja)
    stats: [
      { value: '+500', label: 'Clientes atendidos no Cohab', sub: 'Tradição no almoço de Tucuruí' },
      { value: '20–30 min', label: 'Tempo médio de preparo', sub: 'Assado na brasa e embalado na hora' },
      { value: 'R$ 0', label: 'Taxa de retirada', sub: 'Balcão ágil ou Drive Thru no carro' },
      { value: '10h às 14h', label: 'Seg. a dom. (fecha terça)', sub: 'Últimos pedidos saem às 13h45' }
    ]
  };

  /* ---------- Avaliações / Prova Social (substitua pelos depoimentos reais do Google/Instagram) ---------- */
  const REVIEWS = [
    {
      author: 'Cliente do Cohab',
      channel: 'Google',
      rating: 5,
      dish: 'Frango Assado + Drive Thru',
      text: 'Encomendei pelo WhatsApp antes de sair do trabalho e retirei no Drive Thru sem nem descer do carro. Frango bem temperado e quentinho.'
    },
    {
      author: 'Cliente de Tucuruí',
      channel: 'Instagram',
      rating: 5,
      dish: 'Marmita Mista 3 Proteínas',
      text: 'Marmita muito bem servida, feijão gostoso e carne no ponto da brasa. Poder escolher os acompanhamentos no site agiliza demais o almoço.'
    },
    {
      author: 'Cliente do Cohab',
      channel: 'Google',
      rating: 5,
      dish: 'Tambaqui na Brasa + Açaí 1L',
      text: 'Tambaqui assado na brasa com gosto de verdade e o açaí de 1 litro fecha o almoço de domingo em família perfeitamente.'
    }
  ];

  const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const money = (n) => CURRENCY.format(n);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Acompanhamentos padrão das marmitas ---------- */
  const MARMITA_GROUPS = [{
    id: 'acompanhamentos',
    label: 'Acompanhamentos inclusos',
    hint: 'R$ 0,00 · desmarque o que não quiser',
    type: 'checkbox',
    priced: false,
    layout: 'five',
    options: [
      { id: 'arroz', label: 'Arroz branco', price: 0 },
      { id: 'feijao', label: 'Feijão', price: 0 },
      { id: 'salada', label: 'Salada fresca', price: 0 },
      { id: 'farofa', label: 'Farofa', price: 0 },
      { id: 'macarrao', label: 'Macarrão', price: 0 }
    ]
  }];

  /* ---------- Extras pagos com preço visível dentro da personalização ---------- */
  const PAID_EXTRAS = [
    { id: 'toscana-trio', label: 'Toscana na Brasa (3 unid.)', price: 10 },
    { id: 'pote-250', label: 'Venda no Pote — 250g', price: 10 },
    { id: 'acai-1l', label: 'Açaí 1 Litro', price: 16 }
  ];

  /* ---------- Categorias e Filtros Rápidos ---------- */
  const CATEGORIES = [
    { id: 'todos', label: 'Tudo' },
    { id: 'brasa', label: 'Na Brasa' },
    { id: 'marmitas', label: 'Marmitas' },
    { id: 'pote', label: 'Vendas no Pote' },
    { id: 'acai-buffet', label: 'Açaí & Buffet' }
  ];

  const QUICK_FILTERS = [
    { id: 'todos', label: 'Todos' },
    { id: 'popular', label: 'Mais vendidos' },
    { id: 'familia', label: 'Para família' },
    { id: 'individual', label: 'Almoço individual' },
    { id: 'economico', label: 'Até R$ 25' },
    { id: 'leve', label: 'Potes & Açaí' }
  ];

  /* ---------- Cardápio completo (18 itens oficiais) ---------- */
  const MENU = [
    /* === NA BRASA === */
    {
      id: 'frango-inteiro', cat: 'brasa', catLabel: 'Na brasa', tag: 'Carro-chefe',
      filters: ['popular', 'familia'],
      name: 'Frango Assado Inteiro',
      desc: 'Frango inteiro assado lentamente na brasa, dourado por fora e suculento por dentro. Ideal para a família.',
      img: 'assets/food-frango.jpg',
      price: 50,
      quickAdd: true,
      groups: []
    },
    {
      id: 'frango-banda', cat: 'brasa', catLabel: 'Na brasa', tag: 'Na brasa',
      filters: ['popular', 'individual', 'economico'],
      name: 'Frango Banda',
      desc: 'Meio frango assado na brasa, bem temperado e quentinho, pronto para retirar.',
      img: 'assets/food-frango.jpg',
      price: 25,
      quickAdd: true,
      groups: []
    },
    {
      id: 'tambaqui-inteiro', cat: 'brasa', catLabel: 'Na brasa', tag: 'Peixe na brasa',
      filters: ['popular', 'familia'],
      name: 'Tambaqui Assado Inteiro',
      desc: 'Tambaqui amazônico inteiro grelhado na brasa com sabor defumado autêntico.',
      img: 'assets/food-peixe.jpg',
      price: 100,
      quickAdd: true,
      groups: []
    },
    {
      id: 'tambaqui-banda', cat: 'brasa', catLabel: 'Na brasa', tag: 'Peixe na brasa',
      filters: ['familia'],
      name: 'Tambaqui Assado Banda',
      desc: 'Banda de tambaqui assada na brasa, no ponto certo e pronta para o almoço.',
      img: 'assets/food-peixe.jpg',
      price: 50,
      quickAdd: true,
      groups: []
    },
    {
      id: 'toscana-trio', cat: 'brasa', catLabel: 'Na brasa', tag: '3 unidades',
      filters: ['popular', 'economico'],
      name: 'Toscana na Brasa (3 unid.)',
      desc: 'Porção com 3 linguiças toscanas assadas na brasa. Ótima pedida para reforçar o pedido.',
      img: 'assets/food-toscana.jpg',
      price: 10,
      quickAdd: true,
      groups: []
    },
    {
      id: 'churrasco', cat: 'brasa', catLabel: 'Na brasa', tag: 'Sob consulta', tagClass: 'menu-tag--gold',
      filters: ['familia'],
      name: 'Churrasco na Brasa',
      desc: 'Cortes e espetos preparados na nossa churrasqueira de tijolos. Consulte os cortes do dia e valores no WhatsApp.',
      img: 'assets/ambiente-churrasqueira.jpg',
      consultOnly: true
    },

    /* === MARMITAS === */
    {
      id: 'marmita-mista', cat: 'marmitas', catLabel: 'Marmitas', tag: 'Mais completa',
      filters: ['popular', 'individual'],
      name: 'Marmita Mista 3 Proteínas',
      desc: 'Nossa marmita mais caprichada com 3 proteínas + acompanhamentos frescos do dia.',
      img: 'assets/food-marmita-mista.jpg',
      price: 30,
      groups: MARMITA_GROUPS
    },
    {
      id: 'marmita-carne-frango', cat: 'marmitas', catLabel: 'Marmitas', tag: 'Dupla proteína',
      filters: ['popular', 'individual'],
      name: 'Marmita Carne e Frango',
      desc: 'Combinação de carne e frango com acompanhamentos fresquinhos.',
      img: 'assets/food-marmita-carne-frango.jpg',
      price: 29,
      groups: MARMITA_GROUPS
    },
    {
      id: 'marmita-carne-toscana', cat: 'marmitas', catLabel: 'Marmitas', tag: 'Dupla proteína',
      filters: ['individual'],
      name: 'Marmita Carne e Toscana',
      desc: 'Carne suculenta com linguiça toscana na brasa e acompanhamentos do dia.',
      img: 'assets/food-marmita-carne-toscana.jpg',
      price: 29,
      groups: MARMITA_GROUPS
    },
    {
      id: 'marmita-carne', cat: 'marmitas', catLabel: 'Marmitas', tag: 'Tradicional',
      filters: ['popular', 'individual'],
      name: 'Marmita de Carne',
      desc: 'Marmita servida com carne temperada na medida certa e acompanhamentos inclusos.',
      img: 'assets/food-marmita-carne.jpg',
      price: 28,
      groups: MARMITA_GROUPS
    },
    {
      id: 'marmita-toscana', cat: 'marmitas', catLabel: 'Marmitas', tag: 'Na brasa',
      filters: ['individual'],
      name: 'Marmita de Toscana',
      desc: 'Marmita com linguiça toscana assada na brasa e acompanhamentos completos.',
      img: 'assets/food-marmita-toscana.jpg',
      price: 28,
      groups: MARMITA_GROUPS
    },
    {
      id: 'marmita-frango', cat: 'marmitas', catLabel: 'Marmitas', tag: 'Melhor custo',
      filters: ['individual'],
      name: 'Marmita de Frango',
      desc: 'Marmita com frango assado na brasa e acompanhamentos frescos. Sabor no seu dia a dia.',
      img: 'assets/food-marmita-frango.jpg',
      price: 27,
      groups: MARMITA_GROUPS
    },

    /* === VENDAS NO POTE === */
    {
      id: 'pote-250', cat: 'pote', catLabel: 'Vendas no Pote', tag: '250g',
      filters: ['individual', 'economico', 'leve'],
      name: 'Venda no Pote — 250g',
      desc: 'Porção individual de 250 gramas com as opções do nosso buffet. Informe suas preferências nas observações.',
      img: 'assets/food-pote.jpg',
      price: 10,
      quickAdd: true,
      groups: []
    },
    {
      id: 'pote-350', cat: 'pote', catLabel: 'Vendas no Pote', tag: '350g',
      filters: ['individual', 'economico', 'leve'],
      name: 'Venda no Pote — 350g',
      desc: 'Pote médio de 350 gramas montado com os pratos do buffet do dia.',
      img: 'assets/food-pote.jpg',
      price: 15,
      quickAdd: true,
      groups: []
    },
    {
      id: 'pote-500', cat: 'pote', catLabel: 'Vendas no Pote', tag: '500g',
      filters: ['economico', 'leve'],
      name: 'Venda no Pote — 500g',
      desc: 'Pote generoso de 500 gramas com as opções do buffet self-service.',
      img: 'assets/food-pote.jpg',
      price: 25,
      quickAdd: true,
      groups: []
    },
    {
      id: 'pote-1kg', cat: 'pote', catLabel: 'Vendas no Pote', tag: '1 kilo · Família',
      filters: ['familia', 'leve'],
      name: 'Venda no Pote — 1 Kilo',
      desc: 'Pote de 1 kg ideal para compartilhar ou garantir várias refeições com o sabor do nosso buffet.',
      img: 'assets/food-pote.jpg',
      price: 45,
      quickAdd: true,
      groups: []
    },

    /* === AÇAÍ & BUFFET === */
    {
      id: 'acai-1l', cat: 'acai-buffet', catLabel: 'Açaí', tag: '1 litro',
      filters: ['popular', 'familia', 'economico', 'leve'],
      name: 'Açaí 1 Litro',
      desc: 'Açaí geladinho e cremoso em embalagem de 1 litro, pronto para levar e acompanhar o almoço.',
      img: 'assets/food-acai.jpg',
      price: 16,
      quickAdd: true,
      groups: []
    },
    {
      id: 'buffet', cat: 'acai-buffet', catLabel: 'Buffet', tag: 'Confirme condições', tagClass: 'menu-tag--gold',
      filters: ['familia'],
      name: 'Buffet Self Service',
      desc: 'Seleção completa do buffet self-service M&P. Valor de R$ 99,00 — confirme a modalidade de cobrança no atendimento.',
      img: 'assets/ambiente-buffet.jpg',
      price: 99,
      quickAdd: true,
      groups: []
    }
  ];

  const UPSELL_IDS = ['toscana-trio', 'acai-1l', 'pote-250'];
  const SCHEDULE_SLOTS = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '13:45'];

  const productById = (id) => MENU.find((p) => p.id === id);

  function priceFrom(p) {
    const g = (p.groups || []).find((x) => x.type === 'radio' && x.priced);
    if (g) return Math.min(...g.options.map((o) => o.price));
    return p.price || 0;
  }

  function hasPriceRange(p) {
    const g = (p.groups || []).find((x) => x.type === 'radio' && x.priced);
    if (!g || g.options.length <= 1) return false;
    return new Set(g.options.map((o) => o.price)).size > 1;
  }

  /* ---------- Estado e Persistência ---------- */
  const CART_KEY = 'mpdt-cart-v2';
  const CUSTOMER_KEY = 'mpdt-customer-v1';
  const TIMING_KEY = 'mpdt-timing-v1';

  let cart = [];
  let customer = {};
  let orderTiming = { mode: 'agora', slot: '12:00' };
  let activeCategory = 'todos';
  let activeQuickFilter = 'todos';
  let searchTerm = '';
  let currentProduct = null;
  let activeLayer = null;
  let lastFocused = null;
  let overlayTimer = null;
  let toastTimer = null;
  let lbIndex = 0;
  let GALLERY = [];

  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (Array.isArray(saved)) cart = saved.filter((i) => i && productById(i.id) && i.qty > 0);
  } catch (_) { cart = []; }

  try {
    const savedCust = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '{}');
    if (savedCust && typeof savedCust === 'object') customer = savedCust;
  } catch (_) { customer = {}; }

  try {
    const savedTiming = JSON.parse(localStorage.getItem(TIMING_KEY) || 'null');
    if (savedTiming && (savedTiming.mode === 'agora' || savedTiming.mode === 'agendar')) {
      orderTiming = {
        mode: savedTiming.mode,
        slot: SCHEDULE_SLOTS.includes(savedTiming.slot) ? savedTiming.slot : '12:00'
      };
    }
  } catch (_) {}

  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (_) {} };
  const saveTiming = () => { try { localStorage.setItem(TIMING_KEY, JSON.stringify(orderTiming)); } catch (_) {} };
  const saveCustomer = (data) => {
    customer = { nome: data.nome, tel: data.tel, modalidade: data.modalidade, pagamento: data.pagamento };
    try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer)); } catch (_) {}
  };

  /* ---------- Toast ---------- */
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.innerHTML = `<svg class="icon"><use href="#i-check"/></svg><span>${esc(msg)}</span>`;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2300);
  }

  /* ---------- Utilitário de cópia ---------- */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  /* ---------- Gerenciador de camadas ---------- */
  const overlay = $('#overlay');
  const LAYER_IDS = ['cart-drawer', 'product-modal', 'checkout-modal', 'lightbox'];

  function hideLayerEl(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
  }

  function openLayer(id) {
    clearTimeout(overlayTimer);
    if (!activeLayer && document.activeElement instanceof HTMLElement) {
      lastFocused = document.activeElement;
    }
    if (activeLayer && activeLayer !== id) hideLayerEl(activeLayer);
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
    document.body.classList.add('layer-open');
    activeLayer = id;
    setTimeout(() => {
      const focusable = $('button:not([data-close]), input:not([type="hidden"]), select, textarea, a[href]', el);
      if (focusable && id !== 'lightbox') focusable.focus({ preventScroll: true });
    }, 60);
  }

  function closeLayer() {
    if (!activeLayer) return;
    LAYER_IDS.forEach(hideLayerEl);
    overlay.classList.remove('is-visible');
    document.body.classList.remove('layer-open');
    activeLayer = null;
    overlayTimer = setTimeout(() => {
      if (!activeLayer) {
        overlay.hidden = true;
        if (lastFocused && document.contains(lastFocused)) {
          lastFocused.focus({ preventScroll: true });
        }
        lastFocused = null;
      }
    }, 280);
  }

  overlay.addEventListener('click', closeLayer);
  $$('[data-close]').forEach((b) => b.addEventListener('click', closeLayer));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeLayer) closeLayer();
    if (activeLayer === 'lightbox') {
      if (e.key === 'ArrowLeft') showGallery(lbIndex - 1);
      if (e.key === 'ArrowRight') showGallery(lbIndex + 1);
    }
  });

  /* ---------- Status de funcionamento inteligente (contagem regressiva + corte 13h45) ---------- */
  function formatDuration(totalMins) {
    const m = Math.max(1, Math.round(totalMins));
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (h === 0) return `${rem} min`;
    if (rem === 0) return `${h}h`;
    return `${h}h ${rem}min`;
  }

  function storeStatus() {
    const now = new Date();
    const tz = 'America/Sao_Paulo';
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now);
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(now);

    const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10) % 24;
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const mins = h * 60 + m;

    const isTuesday = weekday === 'Tue';
    const isMonday = weekday === 'Mon';
    const open = !isTuesday && mins >= STORE.openMins && mins < STORE.closeMins;
    const canOrderNow = !isTuesday && mins >= STORE.openMins && mins < STORE.lastOrderMins;
    const nearClose = open && !canOrderNow;

    let label, short, nextOpenLabel, preorderTitle, preorderDesc;

    if (isTuesday) {
      const minsUntilWed = (1440 - mins) + STORE.openMins;
      label = `Fechado hoje (terça) · voltamos amanhã às 10h`;
      short = 'Fechado hoje · terça';
      nextOpenLabel = `Abre quarta às 10h (em ${formatDuration(minsUntilWed)})`;
      preorderTitle = 'Terça-feira fechado — garanta sua encomenda antecipada!';
      preorderDesc = 'Hoje não abrimos, mas você já pode montar seu carrinho e agendar sua retirada para quarta-feira a partir das 10h.';
    } else if (canOrderNow) {
      const minsLeft = STORE.closeMins - mins;
      const minsToCutoff = STORE.lastOrderMins - mins;
      label = minsToCutoff <= 45
        ? `Aberto · últimos pedidos em ${formatDuration(minsToCutoff)} (até ${STORE.lastOrderLabel})`
        : `Aberto agora · fecha em ${formatDuration(minsLeft)} (últimos pedidos às ${STORE.lastOrderLabel})`;
      short = `Aberto · fecha em ${formatDuration(minsLeft)}`;
      nextOpenLabel = `Preparo médio: ~${STORE.prepTime}`;
      preorderTitle = '';
      preorderDesc = '';
    } else if (nearClose) {
      label = `Encerrando às 14h · últimos pedidos do dia saíram às ${STORE.lastOrderLabel}`;
      short = 'Encerrando · agende p/ amanhã';
      nextOpenLabel = isMonday ? 'Próximo atendimento: quarta às 10h' : 'Próximo atendimento: amanhã às 10h';
      preorderTitle = `Últimos pedidos de hoje saíram às ${STORE.lastOrderLabel}`;
      preorderDesc = `Você já pode deixar sua retirada agendada para o próximo atendimento (${isMonday ? 'quarta-feira' : 'amanhã'} a partir das 10h).`;
    } else if (mins < STORE.openMins) {
      const minsToOpen = STORE.openMins - mins;
      label = `Abrimos hoje às 10h (em ${formatDuration(minsToOpen)}) · encomendas abertas`;
      short = `Abre em ${formatDuration(minsToOpen)}`;
      nextOpenLabel = `Hoje das 10h às 14h`;
      preorderTitle = `Abrimos hoje às 10h (em ${formatDuration(minsToOpen)}) — antecipe seu pedido!`;
      preorderDesc = `Monte agora e agende sua retirada no balcão ou Drive Thru para garantir seu frango, tambaqui ou marmita quentinha sem fila.`;
    } else if (isMonday) {
      label = 'Encerrado hoje · voltamos quarta-feira às 10h (terça fechado)';
      short = 'Volta quarta às 10h';
      nextOpenLabel = 'Terça-feira fechado · volta quarta às 10h';
      preorderTitle = 'Atendimento de segunda encerrado — agende para quarta!';
      preorderDesc = 'Às terças-feiras não abrimos. Deixe seu pedido montado agora e envie pelo WhatsApp para reservar sua retirada de quarta-feira.';
    } else {
      const minsToTomorrow = (1440 - mins) + STORE.openMins;
      label = `Fechado agora · voltamos amanhã às 10h (em ${formatDuration(minsToTomorrow)})`;
      short = 'Fechado · abre amanhã 10h';
      nextOpenLabel = `Amanhã das 10h às 14h`;
      preorderTitle = `Loja fechada agora — faça sua encomenda antecipada!`;
      preorderDesc = `Voltamos amanhã às 10h (em ${formatDuration(minsToTomorrow)}). Monte seu carrinho agora e agende sua retirada para não enfrentar fila no almoço.`;
    }

    return { open, canOrderNow, nearClose, isTuesday, isMonday, mins, label, short, nextOpenLabel, preorderTitle, preorderDesc };
  }

  function getFirstAvailableSlot(status) {
    if (!status.open) return '11:30';
    for (const slot of SCHEDULE_SLOTS) {
      const [sh, sm] = slot.split(':').map(Number);
      if (sh * 60 + sm >= status.mins + 20) return slot;
    }
    return SCHEDULE_SLOTS[0];
  }

  function syncTimingWithStatus(status) {
    if (!status.canOrderNow && orderTiming.mode === 'agora') {
      orderTiming.mode = 'agendar';
    }
    if (status.open) {
      const [sh, sm] = (orderTiming.slot || '12:00').split(':').map(Number);
      if (sh * 60 + sm < status.mins + 15) {
        orderTiming.slot = getFirstAvailableSlot(status);
      }
    }
  }

  function renderStatus() {
    const s = storeStatus();
    syncTimingWithStatus(s);

    const headerStatus = $('#header-status');
    if (headerStatus) {
      headerStatus.innerHTML = `
        <span class="status-dot ${s.canOrderNow ? '' : 'is-closed'}"></span>
        <strong>${esc(s.label)}</strong>
        <span class="sep hide-sm">·</span><span class="hide-sm">Preparo médio: ~${esc(STORE.prepTime)}</span>
        <span class="sep hide-sm">·</span><a class="hide-sm" href="#como-chegar">TV W03, Nº 203 — Cohab</a>`;
    }
    const badge = $('#hero-open-badge');
    if (badge) {
      badge.textContent = `● ${s.short}`;
      badge.classList.toggle('is-closed', !s.canOrderNow);
    }
    const loc = $('#location-status');
    if (loc) {
      loc.textContent = s.label;
      loc.classList.toggle('is-closed', !s.canOrderNow);
    }
    renderPreorderBanner(s);
  }

  function renderPreorderBanner(s) {
    const slot = $('#preorder-slot');
    if (!slot) return;

    if (s.canOrderNow) {
      slot.innerHTML = `
        <div class="ops-strip" role="status">
          <span class="ops-pill ops-pill--live"><span class="status-dot"></span> Aberto agora</span>
          <span class="ops-pill"><svg class="icon"><use href="#i-clock"/></svg> Preparo médio: <strong>~${esc(STORE.prepTime)}</strong></span>
          <span class="ops-pill"><svg class="icon"><use href="#i-calendar"/></svg> Últimos pedidos: <strong>${esc(STORE.lastOrderLabel)}</strong></span>
          <span class="ops-pill"><svg class="icon"><use href="#i-car"/></svg> Retirada no balcão ou Drive Thru sem taxa</span>
        </div>`;
      return;
    }

    slot.innerHTML = `
      <div class="preorder-card" role="note">
        <div class="preorder-card-main">
          <span class="preorder-eyebrow"><svg class="icon"><use href="#i-calendar"/></svg> Encomenda Antecipada Aberta</span>
          <h3>${esc(s.preorderTitle)}</h3>
          <p>${esc(s.preorderDesc)}</p>
          <div class="preorder-meta">
            <span><svg class="icon"><use href="#i-clock"/></svg> Atendimento: 10h às 14h (último pedido ${esc(STORE.lastOrderLabel)})</span>
            <span><svg class="icon"><use href="#i-flame"/></svg> Preparo médio: ~${esc(STORE.prepTime)}</span>
          </div>
        </div>
        <div class="preorder-card-actions">
          <button type="button" class="btn btn-primary" id="preorder-start-btn">
            <svg class="icon"><use href="#i-calendar"/></svg> Agendar retirada
          </button>
          <a class="btn btn-outline-dark" href="https://wa.me/${STORE.wa}?text=${encodeURIComponent('Olá! Gostaria de fazer uma encomenda antecipada para retirada no próximo atendimento.')}" target="_blank" rel="noopener">
            <svg class="icon"><use href="#i-wa"/></svg> Falar no WhatsApp
          </a>
        </div>
      </div>`;

    $('#preorder-start-btn')?.addEventListener('click', () => {
      orderTiming.mode = 'agendar';
      saveTiming();
      if (cart.length) {
        renderCart();
        openLayer('cart-drawer');
      } else {
        $('#menu-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast('Modo agendamento ativado! Escolha seus pratos abaixo.');
      }
    });
  }

  /* ---------- Sugestão do Chef / Combo do Dia ---------- */
  function renderChefPick() {
    const slot = $('#chef-pick-slot');
    if (!slot) return;

    slot.innerHTML = `
      <div class="chef-picks">
        <article class="chef-card chef-card--combo">
          <div class="chef-card-media">
            <img src="assets/hero-brasa.jpg" alt="Combo Família na Brasa" loading="lazy" decoding="async">
            <span class="chef-badge"><svg class="icon"><use href="#i-spark"/></svg> Combo do Dia · Família</span>
          </div>
          <div class="chef-card-body">
            <h3>Combo Família na Brasa</h3>
            <p><strong>1 Frango Assado Inteiro</strong> + <strong>Toscana (3 unid.)</strong> + <strong>Açaí 1 Litro</strong>. Combinação completa para dividir sem pagar taxa.</p>
            <div class="chef-card-foot">
              <div class="chef-price"><small>3 itens oficiais</small><strong>${money(76)}</strong></div>
              <button type="button" class="btn btn-primary btn-sm" id="add-combo-familia">
                <svg class="icon"><use href="#i-plus"/></svg> Adicionar combo
              </button>
            </div>
          </div>
        </article>

        <article class="chef-card chef-card--suggest">
          <div class="chef-card-media">
            <img src="assets/food-marmita-mista.jpg" alt="Marmita Mista 3 Proteínas" loading="lazy" decoding="async">
            <span class="chef-badge chef-badge--gold"><svg class="icon"><use href="#i-flame"/></svg> Sugestão da Casa</span>
          </div>
          <div class="chef-card-body">
            <h3>Marmita Mista 3 Proteínas</h3>
            <p>Carne, frango e toscana na brasa + acompanhamentos inclusos (arroz, feijão, salada, farofa e macarrão).</p>
            <div class="chef-card-foot">
              <div class="chef-price"><small>almoço completo</small><strong>${money(30)}</strong></div>
              <button type="button" class="btn btn-dark btn-sm" id="open-chef-marmita">
                Personalizar <svg class="icon"><use href="#i-arrow"/></svg>
              </button>
            </div>
          </div>
        </article>
      </div>`;

    $('#add-combo-familia')?.addEventListener('click', () => {
      const ids = ['frango-inteiro', 'toscana-trio', 'acai-1l'];
      ids.forEach((id) => {
        const p = productById(id);
        if (p) addToCartSilent(p, defaultSelections(p), 'Parte do Combo Família na Brasa', 1);
      });
      saveCart();
      renderCart();
      renderMenu();
      openLayer('cart-drawer');
      toast('Combo Família na Brasa (3 itens) adicionado!');
    });

    $('#open-chef-marmita')?.addEventListener('click', () => openProduct('marmita-mista'));
  }

  /* ---------- Abas / Filtros rápidos / Busca / Vitrine ---------- */
  function qtyInCart(productId) {
    return cart.filter((i) => i.id === productId).reduce((s, i) => s + i.qty, 0);
  }

  function categoryCount(catId) {
    return catId === 'todos' ? MENU.length : MENU.filter((p) => p.cat === catId).length;
  }

  function renderTabs() {
    $('#category-tabs').innerHTML = CATEGORIES.map((c) => `
      <button type="button" class="cat-tab ${c.id === activeCategory ? 'is-active' : ''}" data-cat="${c.id}" role="tab" aria-selected="${c.id === activeCategory}">
        ${esc(c.label)} <span class="cat-tab-count">${categoryCount(c.id)}</span>
      </button>`).join('');
  }

  function renderQuickFilters() {
    const el = $('#quick-filters');
    if (!el) return;
    el.innerHTML = `<span class="qf-label">Filtrar rápido:</span>` + QUICK_FILTERS.map((f) => `
      <button type="button" class="qf-chip ${f.id === activeQuickFilter ? 'is-active' : ''}" data-qf="${f.id}" aria-pressed="${f.id === activeQuickFilter}">
        ${esc(f.label)}
      </button>`).join('');
  }

  function renderMenu() {
    const term = norm(searchTerm.trim());
    const list = MENU.filter((p) => {
      const inCat = activeCategory === 'todos' || p.cat === activeCategory;
      if (!inCat) return false;
      const inQuick = activeQuickFilter === 'todos' || (p.filters || []).includes(activeQuickFilter);
      if (!inQuick) return false;
      if (!term) return true;
      const optText = (p.groups || []).flatMap((g) => g.options.map((o) => o.label)).join(' ');
      const hay = norm(`${p.name} ${p.desc} ${p.catLabel} ${p.tag} ${optText}`);
      return hay.includes(term);
    });

    const grid = $('#menu-grid');
    if (!list.length) {
      grid.innerHTML = `
        <div class="menu-empty">
          <h3>Nenhum prato com esse filtro</h3>
          <p>Limpe os filtros ou selecione a categoria “Tudo” para ver todos os 18 itens.</p>
          <button type="button" class="btn btn-outline" id="menu-reset-btn">Mostrar tudo</button>
        </div>`;
      $('#menu-reset-btn')?.addEventListener('click', () => {
        activeCategory = 'todos';
        activeQuickFilter = 'todos';
        searchTerm = '';
        $('#menu-search').value = '';
        renderTabs();
        renderQuickFilters();
        renderMenu();
      });
      return;
    }

    grid.innerHTML = list.map((p) => {
      const from = priceFrom(p);
      const inCart = qtyInCart(p.id);
      const priceLabel = p.consultOnly
        ? `<div class="menu-price"><small>valor</small><strong>Sob consulta</strong></div>`
        : `<div class="menu-price"><small>${hasPriceRange(p) ? 'a partir de' : 'valor'}</small><strong>${money(from)}</strong></div>`;

      let button;
      if (p.consultOnly) {
        button = `<button class="menu-add menu-add--consult" type="button" data-consult="${p.id}">Consultar <svg class="icon"><use href="#i-wa"/></svg></button>`;
      } else if (p.quickAdd) {
        button = `<button class="menu-add" type="button" data-quick-card="${p.id}">Adicionar <svg class="icon"><use href="#i-plus"/></svg></button>`;
      } else {
        button = `<button class="menu-add" type="button" data-product="${p.id}">Personalizar <svg class="icon"><use href="#i-plus"/></svg></button>`;
      }

      return `
        <article class="menu-card ${inCart ? 'is-in-cart' : ''}" ${p.consultOnly ? '' : `data-card-product="${p.id}"`}>
          <div class="menu-card-img">
            <img src="${p.img}" alt="${esc(p.name)}" loading="lazy" decoding="async">
            <span class="menu-tag ${p.tagClass || ''}">${esc(p.tag)}</span>
            ${inCart ? `<span class="menu-in-cart">${inCart} no carrinho</span>` : ''}
            <span class="menu-cat">${esc(p.catLabel)}</span>
          </div>
          <div class="menu-card-body">
            <h3>${esc(p.name)}</h3>
            <p>${esc(p.desc)}</p>
            <div class="menu-card-foot">${priceLabel}${button}</div>
          </div>
        </article>`;
    }).join('');
  }

  $('#category-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    activeCategory = b.dataset.cat;
    renderTabs();
    renderMenu();
  });

  $('#quick-filters')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-qf]');
    if (!b) return;
    activeQuickFilter = b.dataset.qf;
    renderQuickFilters();
    renderMenu();
  });

  $('#menu-search').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderMenu();
  });

  /* ---------- Atalhos do Hero ---------- */
  $$('[data-jump-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.jumpCat;
      activeQuickFilter = 'todos';
      searchTerm = '';
      const searchInput = $('#menu-search');
      if (searchInput) searchInput.value = '';
      renderTabs();
      renderQuickFilters();
      renderMenu();
      document.getElementById('cardapio')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  $$('[data-hero-product]').forEach((btn) => {
    btn.addEventListener('click', () => openProduct(btn.dataset.heroProduct));
  });

  /* ---------- Modal de personalização (com acompanhamentos e extras pagos visíveis) ---------- */
  function defaultSelections(p) {
    const sel = {};
    (p.groups || []).forEach((g) => {
      if (g.type === 'radio') sel[g.id] = g.options[0].id;
      else sel[g.id] = g.options.map((o) => o.id);
    });
    return sel;
  }

  function unitPrice(p, sel) {
    let price = p.price || 0;
    (p.groups || []).forEach((g) => {
      if (g.type === 'radio' && g.priced) {
        const opt = g.options.find((o) => o.id === sel[g.id]);
        if (opt) price = opt.price;
      }
    });
    return price;
  }

  function openProduct(id) {
    const p = productById(id);
    if (!p || p.consultOnly) return;
    currentProduct = p;
    const sel = defaultSelections(p);

    const groupsHTML = (p.groups || []).map((g, gi) => {
      const layoutClass = g.layout === 'three' ? 'option-grid--three' : g.layout === 'five' ? 'option-grid--five' : '';
      const opts = g.options.map((o) => {
        const checked = g.type === 'radio' ? (o.id === sel[g.id] ? 'checked' : '') : 'checked';
        return `<label class="option ${g.type === 'checkbox' ? 'option-check' : ''}">
          <input type="${g.type}" name="group-${gi}" data-group="${g.id}" value="${esc(o.id)}" ${checked}>
          <span class="option-inner"><strong>${esc(o.label)}</strong><small>${g.priced ? money(o.price) : 'Incluso · R$ 0'}</small></span>
        </label>`;
      }).join('');
      return `<div class="option-group">
        <div class="option-group-head"><h4>${esc(g.label)}</h4><span>${esc(g.hint || '')}</span></div>
        <div class="option-grid ${layoutClass}">${opts}</div>
      </div>`;
    }).join('');

    const availablePaidExtras = PAID_EXTRAS.filter((ex) => ex.id !== p.id);
    const extrasHTML = availablePaidExtras.length ? `
      <div class="option-group option-group--extras">
        <div class="option-group-head">
          <h4>Turbine seu pedido (extras)</h4>
          <span>Opcional · valores transparentes</span>
        </div>
        <div class="option-grid">
          ${availablePaidExtras.map((ex) => `
            <label class="option option-check option-paid">
              <input type="checkbox" data-paid-extra="${esc(ex.id)}" data-price="${ex.price}">
              <span class="option-inner"><strong>${esc(ex.label)}</strong><small class="extra-price">+ ${money(ex.price)}</small></span>
            </label>`).join('')}
        </div>
      </div>` : '';

    $('#product-modal-body').innerHTML = `
      <div class="pm-hero"><img src="${p.img}" alt="${esc(p.name)}"><span class="pm-tag">${esc(p.tag)}</span></div>
      <div class="pm-content">
        <h2 id="product-modal-title">${esc(p.name)}</h2>
        <p>${esc(p.desc)}</p>
        <div class="pm-price-line"><small>Preço unitário</small><strong id="pm-price">${money(unitPrice(p, sel))}</strong></div>
        <form id="pm-form" novalidate>
          ${groupsHTML}
          ${extrasHTML}
          <label class="pm-note"><span>Observações para a cozinha (opcional)</span>
            <textarea id="pm-note" rows="2" maxlength="220" placeholder="Ex.: sem cebola, capricha no feijão, cortar o frango…"></textarea></label>
          <div class="pm-foot">
            <div class="qty-lg" aria-label="Quantidade">
              <button type="button" data-pm-qty="-1" aria-label="Diminuir quantidade"><svg class="icon"><use href="#i-minus"/></svg></button>
              <span id="pm-qty">1</span>
              <button type="button" data-pm-qty="1" aria-label="Aumentar quantidade"><svg class="icon"><use href="#i-plus"/></svg></button>
            </div>
            <button class="btn btn-primary" type="submit">Adicionar <span id="pm-total">${money(unitPrice(p, sel))}</span></button>
          </div>
        </form>
      </div>`;
    openLayer('product-modal');
    bindProductForm(p);
  }

  function currentSelections(p) {
    const sel = {};
    (p.groups || []).forEach((g) => {
      const inputs = $$(`#pm-form input[data-group="${g.id}"]`);
      if (g.type === 'radio') {
        const c = inputs.find((i) => i.checked);
        sel[g.id] = c ? c.value : g.options[0].id;
      } else {
        sel[g.id] = inputs.filter((i) => i.checked).map((i) => i.value);
      }
    });
    return sel;
  }

  function selectedPaidExtras() {
    return $$('#pm-form input[data-paid-extra]:checked').map((inp) => ({
      id: inp.dataset.paidExtra,
      price: parseFloat(inp.dataset.price) || 0
    }));
  }

  function updateProductPrice() {
    if (!currentProduct) return;
    const sel = currentSelections(currentProduct);
    const price = unitPrice(currentProduct, sel);
    const qty = Math.max(1, parseInt($('#pm-qty').textContent, 10) || 1);
    const extrasSum = selectedPaidExtras().reduce((s, ex) => s + ex.price, 0);
    $('#pm-price').textContent = money(price);
    $('#pm-total').textContent = money(price * qty + extrasSum);
  }

  function bindProductForm(p) {
    const form = $('#pm-form');
    let qty = 1;
    $$('[data-pm-qty]', form).forEach((b) => b.addEventListener('click', () => {
      qty = Math.min(30, Math.max(1, qty + parseInt(b.dataset.pmQty, 10)));
      $('#pm-qty').textContent = qty;
      updateProductPrice();
    }));
    $$('input', form).forEach((i) => i.addEventListener('change', updateProductPrice));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const extras = selectedPaidExtras();
      addToCartSilent(p, currentSelections(p), $('#pm-note').value.trim(), qty);
      extras.forEach((ex) => {
        const extraProd = productById(ex.id);
        if (extraProd) addToCartSilent(extraProd, defaultSelections(extraProd), '', 1);
      });
      saveCart();
      renderCart();
      renderMenu();
      openLayer('cart-drawer');
      toast(extras.length ? `${p.name} + ${extras.length} extra(s) adicionados` : `${qty > 1 ? qty + '× ' + p.name : p.name} adicionado ao carrinho`);
    });
  }

  function addToCartSilent(p, sel, note, qty) {
    const pricedGroup = (p.groups || []).find((g) => g.type === 'radio' && g.priced);
    const variant = pricedGroup ? (pricedGroup.options.find((o) => o.id === sel[pricedGroup.id]) || {}).label : '';

    const checkGroups = (p.groups || []).filter((g) => g.type === 'checkbox');
    const extras = checkGroups.flatMap((g) =>
      (sel[g.id] || []).map((id) => (g.options.find((o) => o.id === id) || {}).label).filter(Boolean));
    const removedExtras = checkGroups.flatMap((g) =>
      g.options.filter((o) => !(sel[g.id] || []).includes(o.id)).map((o) => o.label));
    const hasCheckGroups = checkGroups.length > 0;

    const unit = unitPrice(p, sel);
    const key = `${p.id}|${JSON.stringify(sel)}|${note}`;
    const found = cart.find((i) => i.key === key);
    if (found) found.qty = Math.min(99, found.qty + qty);
    else cart.push({ key, id: p.id, name: p.name, img: p.img, variant, extras, removedExtras, hasCheckGroups, note, unitPrice: unit, qty });
  }

  function addToCart(p, sel, note, qty, openDrawer = true) {
    addToCartSilent(p, sel, note, qty);
    saveCart();
    renderCart();
    renderMenu();
    if (openDrawer) openLayer('cart-drawer');
    toast(`${qty > 1 ? qty + '× ' + p.name : p.name} adicionado ao carrinho`);
  }

  /* ---------- Carrinho + Escolha Agora vs Agendar + Horário direto no carrinho ---------- */
  const cartCount = () => cart.reduce((s, i) => s + i.qty, 0);
  const subtotal = () => cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  function ensureMobileCartBar() {
    let bar = $('#mobile-cart-bar');
    if (!bar) {
      bar = document.createElement('button');
      bar.id = 'mobile-cart-bar';
      bar.className = 'mobile-cart-bar';
      bar.type = 'button';
      bar.hidden = true;
      bar.setAttribute('aria-label', 'Ver carrinho e finalizar pedido');
      bar.innerHTML = `
        <span class="mobile-cart-bar__left">
          <span class="mobile-cart-bar__badge" id="mcb-count">0</span>
          <span class="mobile-cart-bar__text">Ver pedido</span>
        </span>
        <span class="mobile-cart-bar__right">
          <strong id="mcb-total">R$ 0,00</strong>
          <svg class="icon"><use href="#i-arrow"/></svg>
        </span>`;
      document.body.appendChild(bar);
      bar.addEventListener('click', () => { renderCart(); openLayer('cart-drawer'); });
    }
    return bar;
  }

  function updateCount() {
    const totalQty = cartCount();
    const sub = subtotal();
    $('#cart-count').textContent = totalQty;
    $('#cart-title-count').textContent = `(${totalQty})`;

    const bar = ensureMobileCartBar();
    const hasItems = totalQty > 0;
    bar.hidden = !hasItems;
    document.body.classList.toggle('has-mobile-cart', hasItems);
    const mcbCount = $('#mcb-count');
    const mcbTotal = $('#mcb-total');
    if (mcbCount) mcbCount.textContent = String(totalQty);
    if (mcbTotal) mcbTotal.textContent = money(sub);
  }

  function renderExtrasLabel(item) {
    if (!item.hasCheckGroups) {
      return item.extras && item.extras.length ? `<span class="cart-item-opts">${esc(item.extras.join(' · '))}</span>` : '';
    }
    if (!item.extras.length) return `<span class="cart-item-opts cart-item-opts--warn">Sem acompanhamentos</span>`;
    if (item.removedExtras && item.removedExtras.length) {
      return `<span class="cart-item-opts">${esc(item.extras.join(' · '))}</span>
              <span class="cart-item-opts cart-item-opts--warn">Sem: ${esc(item.removedExtras.join(', '))}</span>`;
    }
    return `<span class="cart-item-opts">Acompanhamentos completos</span>`;
  }

  function buildScheduleOptions(status, selectedSlot) {
    return SCHEDULE_SLOTS.map((slot) => {
      const [sh, sm] = slot.split(':').map(Number);
      const slotMins = sh * 60 + sm;
      const passedToday = status.open && slotMins < status.mins + 15;
      const dayTag = !status.open ? (status.isMonday && status.mins >= STORE.closeMins ? ' (quarta)' : status.mins < STORE.openMins && !status.isTuesday ? ' (hoje)' : ' (próximo dia)') : '';
      const suffix = passedToday ? ' (indisponível hoje)' : dayTag;
      return `<option value="${esc(slot)}" ${passedToday ? 'disabled' : ''} ${slot === selectedSlot ? 'selected' : ''}>${esc(slot + suffix)}</option>`;
    }).join('');
  }

  function renderCart() {
    updateCount();
    const body = $('#cart-body');
    const foot = $('#cart-foot');
    const s = storeStatus();
    syncTimingWithStatus(s);

    if (!cart.length) {
      body.innerHTML = `<div class="cart-empty">
        <svg class="icon"><use href="#i-cart"/></svg>
        <h3>Seu carrinho está vazio</h3>
        <p>Que tal começar por um frango na brasa, tambaqui ou marmita caprichada?</p>
        <button type="button" class="btn btn-primary" id="cart-go-menu">Ver cardápio <svg class="icon"><use href="#i-arrow"/></svg></button>
      </div>`;
      foot.innerHTML = '';
      $('#cart-go-menu').addEventListener('click', () => {
        closeLayer();
        document.getElementById('cardapio').scrollIntoView({ behavior: 'smooth' });
      });
      return;
    }

    const itemsHTML = cart.map((i, idx) => `
      <div class="cart-item" data-idx="${idx}">
        <img src="${i.img}" alt="${esc(i.name)}">
        <div class="cart-item-main">
          <h4>${esc(i.name)}</h4>
          ${i.variant ? `<span class="cart-item-variant">${esc(i.variant)}</span>` : ''}
          ${renderExtrasLabel(i)}
          ${i.note ? `<span class="cart-item-note">Obs.: ${esc(i.note)}</span>` : ''}
          <div class="cart-item-bottom">
            <div class="qty">
              <button type="button" data-qty="-1" data-idx="${idx}" aria-label="Diminuir"><svg class="icon"><use href="#i-minus"/></svg></button>
              <span>${i.qty}</span>
              <button type="button" data-qty="1" data-idx="${idx}" aria-label="Aumentar"><svg class="icon"><use href="#i-plus"/></svg></button>
            </div>
            <strong class="cart-item-price">${money(i.unitPrice * i.qty)}</strong>
            <button type="button" class="cart-remove" data-remove="${idx}" aria-label="Remover item"><svg class="icon"><use href="#i-trash"/></svg></button>
          </div>
        </div>
      </div>`).join('');

    const upsells = UPSELL_IDS
      .filter((id) => !cart.some((i) => i.id === id))
      .slice(0, 2)
      .map(productById)
      .filter(Boolean);

    const upsellHTML = upsells.length ? `
      <div class="cart-upsell">
        <span class="cart-upsell-title">Complete seu pedido</span>
        <div class="cart-upsell-list">
          ${upsells.map((p) => `
            <div class="cart-upsell-item">
              <img src="${p.img}" alt="${esc(p.name)}">
              <div>
                <strong>${esc(p.name)}</strong>
                <small>${money(priceFrom(p))}</small>
              </div>
              <button type="button" data-quick-add="${p.id}" aria-label="Adicionar ${esc(p.name)}">
                <svg class="icon"><use href="#i-plus"/></svg>
              </button>
            </div>`).join('')}
        </div>
      </div>` : '';

    // Bloco "Pedir para agora vs Agendar" + seletor de horário direto no carrinho
    const isNow = orderTiming.mode === 'agora' && s.canOrderNow;
    const timingHTML = `
      <div class="cart-timing">
        <div class="cart-timing-head">
          <span>Quando retirar?</span>
          <small><svg class="icon"><use href="#i-clock"/></svg> Preparo ~${esc(STORE.prepTime)}</small>
        </div>
        <div class="timing-toggle" role="group" aria-label="Tipo de retirada">
          <button type="button" class="timing-btn ${isNow ? 'is-active' : ''}" data-cart-timing="agora" ${s.canOrderNow ? '' : 'disabled'}>
            <strong>Pedir para agora</strong>
            <small>${s.canOrderNow ? 'Pronto em ~20–30 min' : 'Fora do horário'}</small>
          </button>
          <button type="button" class="timing-btn ${!isNow ? 'is-active' : ''}" data-cart-timing="agendar">
            <strong>Agendar retirada</strong>
            <small>Escolha o horário</small>
          </button>
        </div>
        ${!isNow ? `
          <label class="cart-slot-field">
            <span>Horário desejado (último pedido ${esc(STORE.lastOrderLabel)})</span>
            <select id="cart-slot-select">${buildScheduleOptions(s, orderTiming.slot)}</select>
          </label>` : ''}
        <div class="cart-pickup-addr">
          <svg class="icon"><use href="#i-pin"/></svg>
          <span>Retirada: <strong>${esc(STORE.addressShort)}</strong></span>
        </div>
      </div>`;

    body.innerHTML = itemsHTML + upsellHTML + timingHTML;

    foot.innerHTML = `
      <div class="cart-summary">
        <div><span>Subtotal (${cartCount()} ${cartCount() === 1 ? 'item' : 'itens'})</span><strong>${money(subtotal())}</strong></div>
        <div><span>Retirada / Drive Thru</span><strong style="color:var(--green)">Sem taxa</strong></div>
        <div class="total"><span>Total estimado</span><strong>${money(subtotal())}</strong></div>
      </div>
      <button type="button" class="btn btn-primary" id="cart-checkout">
        ${isNow ? 'Finalizar para agora' : `Finalizar (${esc(orderTiming.slot)})`} <svg class="icon"><use href="#i-arrow"/></svg>
      </button>
      <div class="cart-foot-secondary">
        <button type="button" class="btn-block-light" id="cart-continue">Continuar comprando</button>
        ${cart.length >= 2 ? `<button type="button" class="cart-clear-btn" id="cart-clear">Limpar</button>` : ''}
      </div>`;

    $('#cart-slot-select')?.addEventListener('change', (e) => {
      orderTiming.slot = e.target.value;
      saveTiming();
      const checkoutBtn = $('#cart-checkout');
      if (checkoutBtn) checkoutBtn.innerHTML = `Finalizar (${esc(orderTiming.slot)}) <svg class="icon"><use href="#i-arrow"/></svg>`;
    });

    $('#cart-checkout').addEventListener('click', openCheckout);
    $('#cart-continue').addEventListener('click', closeLayer);
    $('#cart-clear')?.addEventListener('click', () => {
      cart = [];
      saveCart();
      renderCart();
      renderMenu();
      toast('Carrinho esvaziado');
    });
  }

  $('#cart-body').addEventListener('click', (e) => {
    const timingBtn = e.target.closest('[data-cart-timing]');
    if (timingBtn && !timingBtn.disabled) {
      orderTiming.mode = timingBtn.dataset.cartTiming;
      saveTiming();
      renderCart();
      return;
    }
    const quick = e.target.closest('[data-quick-add]');
    if (quick) {
      const p = productById(quick.dataset.quickAdd);
      if (p) addToCart(p, defaultSelections(p), '', 1, false);
      return;
    }
    const qtyBtn = e.target.closest('[data-qty]');
    if (qtyBtn) {
      const idx = parseInt(qtyBtn.dataset.idx, 10);
      const i = cart[idx];
      if (!i) return;
      i.qty += parseInt(qtyBtn.dataset.qty, 10);
      if (i.qty <= 0) cart.splice(idx, 1);
      else i.qty = Math.min(99, i.qty);
      saveCart(); renderCart(); renderMenu(); return;
    }
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      cart.splice(parseInt(rm.dataset.remove, 10), 1);
      saveCart(); renderCart(); renderMenu(); toast('Item removido do carrinho');
    }
  });

  $('#open-cart').addEventListener('click', () => { renderCart(); openLayer('cart-drawer'); });

  /* ---------- Checkout (sincronizado com o carrinho + mensagem WhatsApp completa) ---------- */
  const PAYMENTS = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'A combinar na retirada'];
  const MODALITIES = [
    { id: 'retirada', label: 'Retirada no balcão', sub: 'Sem taxa · pronto na hora', icon: 'i-bag', value: 'Retirada no balcão' },
    { id: 'drive', label: 'Drive Thru', sub: 'Sem sair do carro', icon: 'i-car', value: 'Drive Thru' }
  ];

  function openCheckout() {
    if (!cart.length) { toast('Adicione itens ao carrinho primeiro'); return; }
    const s = storeStatus();
    syncTimingWithStatus(s);

    const validMods = MODALITIES.map((m) => m.value);
    const savedMod = validMods.includes(customer.modalidade) ? customer.modalidade : MODALITIES[0].value;
    const savedPay = PAYMENTS.includes(customer.pagamento) ? customer.pagamento : PAYMENTS[0];
    const isCashInit = savedPay === 'Dinheiro';
    const isNowInit = orderTiming.mode === 'agora' && s.canOrderNow;

    const summary = cart.map((i) => `<div class="co-summary-line"><span>${i.qty}× ${esc(i.name)}${i.variant ? ' · ' + esc(i.variant) : ''}</span><strong>${money(i.unitPrice * i.qty)}</strong></div>`).join('');

    $('#checkout-body').innerHTML = `
      <div class="co-head"><span class="kicker">Última etapa</span><h2 id="checkout-title">Finalizar retirada</h2><p>Confira os dados. Ao enviar, abriremos o WhatsApp com endereço de retirada, horário, pagamento e itens já organizados.</p></div>
      <form class="co-form" id="co-form" novalidate>
        <h3 class="co-section-title">Resumo do pedido</h3>
        <div class="co-summary">${summary}
          <div class="co-summary-line co-summary-line--total"><span>Total estimado</span><strong>${money(subtotal())}</strong></div>
        </div>

        <h3 class="co-section-title">Seus dados</h3>
        <div class="co-grid">
          <label class="co-field" id="field-nome"><span>Nome completo *</span><input id="co-nome" name="nome" type="text" autocomplete="name" value="${esc(customer.nome || '')}" placeholder="Como podemos te chamar?" required></label>
          <label class="co-field" id="field-tel"><span>WhatsApp / telefone *</span><input id="co-tel" name="tel" type="tel" inputmode="tel" autocomplete="tel" value="${esc(customer.tel || '')}" placeholder="(94) 98118-2223" required></label>
        </div>

        <h3 class="co-section-title">Modalidade de retirada *</h3>
        <div class="choice-grid">
          ${MODALITIES.map((m) => `<label class="choice-card">
            <input type="radio" name="modalidade" value="${esc(m.value)}" ${savedMod === m.value ? 'checked' : ''}>
            <span class="choice-inner"><svg class="icon"><use href="#${m.icon}"/></svg><strong>${esc(m.label)}</strong><small>${esc(m.sub)}</small></span>
          </label>`).join('')}
        </div>

        <h3 class="co-section-title">Quando você quer retirar? *</h3>
        <div class="choice-grid">
          <label class="choice-card ${s.canOrderNow ? '' : 'is-disabled'}">
            <input type="radio" name="timingMode" value="agora" ${isNowInit ? 'checked' : ''} ${s.canOrderNow ? '' : 'disabled'}>
            <span class="choice-inner"><svg class="icon"><use href="#i-flame"/></svg><strong>Pedir para agora</strong><small>${s.canOrderNow ? `Preparo médio: ~${STORE.prepTime}` : 'Fora do horário agora'}</small></span>
          </label>
          <label class="choice-card">
            <input type="radio" name="timingMode" value="agendar" ${!isNowInit ? 'checked' : ''}>
            <span class="choice-inner"><svg class="icon"><use href="#i-calendar"/></svg><strong>Agendar retirada</strong><small>Escolha o melhor horário</small></span>
          </label>
        </div>

        <div class="co-grid">
          <label class="co-field ${isNowInit ? 'co-slot-hidden' : ''}" id="field-horario">
            <span>Horário escolhido *</span>
            <select id="co-horario">${buildScheduleOptions(s, orderTiming.slot)}</select>
          </label>
          <label class="co-field ${isNowInit ? 'co-field--full' : ''}" id="field-pagamento">
            <span>Forma de pagamento preferida *</span>
            <select id="co-pagamento" required>${PAYMENTS.map((p) => `<option value="${esc(p)}" ${savedPay === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
          </label>
          <label class="co-field co-field--full co-troco ${isCashInit ? 'is-visible' : ''}" id="field-troco">
            <span>Troco para quanto? (opcional)</span>
            <input id="co-troco" type="text" inputmode="decimal" placeholder="Ex.: R$ 50,00 ou não precisa de troco">
          </label>
          <label class="co-field co-field--full"><span>Observações gerais (opcional)</span><textarea id="co-obs" rows="2" maxlength="300" placeholder="Ex.: sem talheres, cortar o frango, avisar quando estiver pronto…"></textarea></label>
        </div>
        <p class="co-hint">Local de retirada: <strong>${esc(STORE.address)}</strong> · 10h às 14h (último pedido ${esc(STORE.lastOrderLabel)} · fecha terça).</p>
        <p class="co-error" id="co-error">Confira os campos destacados antes de continuar.</p>

        <div class="co-foot">
          <button class="btn btn-whatsapp" type="submit"><svg class="icon"><use href="#i-wa"/></svg> Enviar pedido pelo WhatsApp</button>
          <p class="co-legal"><svg class="icon"><use href="#i-info"/></svg><span>Nenhum pagamento é cobrado no site: disponibilidade, horário de retirada e pagamento são confirmados no WhatsApp.</span></p>
        </div>
      </form>`;
    openLayer('checkout-modal');
    bindCheckout();
  }

  function bindCheckout() {
    const form = $('#co-form');
    const tel = $('#co-tel');
    const pag = $('#co-pagamento');
    const horField = $('#field-horario');
    const pagField = $('#field-pagamento');
    const horSelect = $('#co-horario');

    tel.addEventListener('input', () => { tel.value = formatPhone(tel.value); });
    pag.addEventListener('change', () => {
      $('#field-troco').classList.toggle('is-visible', pag.value === 'Dinheiro');
    });
    $$('input[name="timingMode"]', form).forEach((r) => r.addEventListener('change', () => {
      const mode = $('input[name="timingMode"]:checked', form).value;
      orderTiming.mode = mode;
      saveTiming();
      const isNow = mode === 'agora';
      horField.classList.toggle('co-slot-hidden', isNow);
      pagField.classList.toggle('co-field--full', isNow);
    }));
    horSelect?.addEventListener('change', () => {
      orderTiming.slot = horSelect.value;
      saveTiming();
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); submitCheckout(); });
  }

  function formatPhone(v) {
    const d = String(v).replace(/\D/g, '').slice(0, 11);
    if (!d.length) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function makeOrderCode() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0');
    return `MP-${dd}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  }

  function buildMessage(d, code) {
    const lines = [];
    const headerTag = d.timingMode === 'agora' ? 'PEDIDO PARA AGORA' : 'ENCOMENDA AGENDADA';
    lines.push(`*${headerTag} — ${STORE.name}* 🔥`);
    lines.push(`Código: *${code}*`);
    lines.push('');
    lines.push('*--- CLIENTE ---*');
    lines.push(`Nome: ${d.nome}`);
    lines.push(`WhatsApp: ${d.tel}`);
    lines.push('');
    lines.push('*--- RETIRADA & PAGAMENTO ---*');
    lines.push(`Modalidade: *${d.modalidade}* (sem taxa)`);
    lines.push(`Endereço de retirada: ${STORE.address}`);
    lines.push(`Horário escolhido: *${d.horarioLabel}*`);
    lines.push(`Pagamento preferido: *${d.pagamento}*${d.pagamento === 'Dinheiro' && d.troco ? ` (Troco para: ${d.troco})` : ''}`);
    lines.push('');
    lines.push('*--- ITENS DO PEDIDO ---*');
    cart.forEach((i, k) => {
      lines.push(`${k + 1}. ${i.qty}× *${i.name}*${i.variant ? ` — ${i.variant}` : ''}`);
      if (i.hasCheckGroups) {
        if (!i.extras.length) {
          lines.push('   ⚠️ Sem acompanhamentos');
        } else {
          lines.push(`   Acompanhamentos: ${i.extras.join(', ')}`);
          if (i.removedExtras && i.removedExtras.length) {
            lines.push(`   ⚠️ Retirar: ${i.removedExtras.join(', ')}`);
          }
        }
      } else if (i.extras && i.extras.length) {
        lines.push(`   Acompanhamentos: ${i.extras.join(', ')}`);
      }
      if (i.note) lines.push(`   Obs.: ${i.note}`);
      lines.push(`   Subtotal: ${money(i.unitPrice * i.qty)}`);
    });
    lines.push('');
    lines.push(`*Total estimado: ${money(subtotal())}*`);
    lines.push(`Observações: ${d.obs || 'Nenhuma'}`);
    lines.push('');
    lines.push('Pode confirmar a disponibilidade e o horário de retirada? Obrigado!');
    lines.push('_Pedido enviado pelo cardápio online e sujeito à confirmação da loja._');
    return lines.join('\n');
  }

  function submitCheckout() {
    const form = $('#co-form');
    const nome = $('#co-nome').value.trim();
    const tel = $('#co-tel').value.trim();
    const modalidade = $('input[name="modalidade"]:checked', form).value;
    const timingMode = $('input[name="timingMode"]:checked', form).value;
    const slotSelect = $('#co-horario');
    const chosenSlot = slotSelect ? slotSelect.value : orderTiming.slot;
    const chosenText = slotSelect && slotSelect.selectedOptions[0] ? slotSelect.selectedOptions[0].textContent : chosenSlot;
    const horarioLabel = timingMode === 'agora'
      ? `O mais breve possível (preparo médio ~${STORE.prepTime})`
      : `Agendado para ${chosenText}`;
    const pagamento = $('#co-pagamento').value;
    const troco = ($('#co-troco')?.value || '').trim();
    const obs = $('#co-obs').value.trim();

    const invalid = [];
    if (nome.length < 2) invalid.push('#field-nome');
    if (tel.replace(/\D/g, '').length < 10) invalid.push('#field-tel');

    $$('.field-invalid', form).forEach((f) => f.classList.remove('field-invalid'));
    $('#co-error').classList.remove('is-visible');
    if (invalid.length) {
      invalid.forEach((s) => $(s).classList.add('field-invalid'));
      $('#co-error').classList.add('is-visible');
      const first = $(invalid[0] + ' input, ' + invalid[0] + ' textarea');
      if (first) first.focus();
      return;
    }

    orderTiming = { mode: timingMode, slot: chosenSlot };
    saveTiming();
    saveCustomer({ nome, tel, modalidade, pagamento });

    const d = { nome, tel, modalidade, timingMode, horarioLabel, pagamento, troco, obs };
    const code = makeOrderCode();
    const msg = buildMessage(d, code);
    const link = `https://wa.me/${STORE.wa}?text=${encodeURIComponent(msg)}`;

    try { window.open(link, '_blank', 'noopener,noreferrer'); } catch (_) {}

    $('#checkout-body').innerHTML = `
      <div class="co-success">
        <div class="co-success-icon"><svg class="icon"><use href="#i-check"/></svg></div>
        <span class="kicker">Tudo pronto</span>
        <h2>Pedido ${code} preparado!</h2>
        <p>Abrimos o WhatsApp com o resumo completo (endereço de retirada, horário e pagamento). Confira e envie para a loja confirmar.</p>
        <span class="order-code">${code}</span>
        <details class="co-preview"><summary>Ver / copiar o texto do pedido</summary><textarea id="co-preview-text" readonly>${esc(msg)}</textarea></details>
        <div class="co-success-actions">
          <a class="btn btn-whatsapp" href="${esc(link)}" target="_blank" rel="noopener"><svg class="icon"><use href="#i-wa"/></svg> Abrir WhatsApp</a>
          <button class="btn btn-outline" type="button" id="co-copy"><svg class="icon"><use href="#i-copy"/></svg> Copiar pedido</button>
          <button class="btn btn-ghost" type="button" id="co-new">Fazer novo pedido</button>
        </div>
      </div>`;

    $('#co-copy').addEventListener('click', async () => {
      const ok = await copyText(msg);
      toast(ok ? 'Texto do pedido copiado' : 'Selecione o texto acima para copiar');
    });
    $('#co-new').addEventListener('click', () => {
      cart = []; saveCart(); renderCart(); renderMenu(); closeLayer();
      document.getElementById('cardapio').scrollIntoView({ behavior: 'smooth' });
      toast('Carrinho limpo. Bom apetite!');
    });
  }

  /* ---------- Prova Social (Métricas + Avaliações) ---------- */
  function renderSocialProof() {
    const statsEl = $('#social-stats');
    if (statsEl) {
      statsEl.innerHTML = STORE.stats.map((st) => `
        <article class="stat-card">
          <strong>${esc(st.value)}</strong>
          <span>${esc(st.label)}</span>
          <small>${esc(st.sub)}</small>
        </article>`).join('');
    }
    const reviewsEl = $('#reviews-grid');
    if (reviewsEl) {
      reviewsEl.innerHTML = REVIEWS.map((rv) => {
        const stars = Array.from({ length: rv.rating }, () => '<svg class="icon star-filled" aria-hidden="true"><use href="#i-star"/></svg>').join('');
        return `
          <article class="review-card">
            <div class="review-head">
              <div class="review-stars" aria-label="${rv.rating} de 5 estrelas">${stars}</div>
              <span class="review-source">${esc(rv.channel)}</span>
            </div>
            <p class="review-text">“${esc(rv.text)}”</p>
            <div class="review-foot">
              <strong>${esc(rv.author)}</strong>
              <small>${esc(rv.dish)}</small>
            </div>
          </article>`;
      }).join('');
    }
  }

  /* ---------- Vídeo curto da brasa (ativa automaticamente se STORE.brasaVideo for preenchido) ---------- */
  function initBrasaVideo() {
    if (!STORE.brasaVideo) return;
    const media = $('#brasa-reel-media');
    if (!media) return;
    media.innerHTML = `
      <video class="brasa-video" src="${esc(STORE.brasaVideo)}" poster="assets/ambiente-churrasqueira.jpg" autoplay muted loop playsinline></video>
      <span class="brasa-reel-badge"><svg class="icon"><use href="#i-flame"/></svg> Brasa viva · Ao vivo</span>
      <button type="button" class="brasa-video-toggle" id="brasa-video-toggle" aria-label="Pausar vídeo da brasa">Pausar</button>`;
    const vid = $('video', media);
    const toggle = $('#brasa-video-toggle');
    toggle?.addEventListener('click', () => {
      if (vid.paused) { vid.play(); toggle.textContent = 'Pausar'; }
      else { vid.pause(); toggle.textContent = 'Reproduzir'; }
    });
  }

  /* ---------- Galeria / Carrossel fluido + Lightbox com swipe ---------- */
  function initGallery() {
    GALLERY = $$('.gallery-item').map((b) => ({
      src: $('img', b).getAttribute('src'),
      alt: $('img', b).alt,
      strong: $('.gallery-caption strong', b).textContent,
      small: $('.gallery-caption small', b).textContent
    }));
    $$('.gallery-item').forEach((b) => b.addEventListener('click', () => showGallery(parseInt(b.dataset.index, 10))));
    $('#lb-prev').addEventListener('click', () => showGallery(lbIndex - 1));
    $('#lb-next').addEventListener('click', () => showGallery(lbIndex + 1));

    const grid = $('#gallery-grid');
    $('#gal-prev')?.addEventListener('click', () => {
      if (grid && grid.scrollWidth > grid.clientWidth + 10) {
        grid.scrollBy({ left: -Math.max(280, grid.clientWidth * 0.8), behavior: 'smooth' });
      } else {
        showGallery(lbIndex - 1);
      }
    });
    $('#gal-next')?.addEventListener('click', () => {
      if (grid && grid.scrollWidth > grid.clientWidth + 10) {
        grid.scrollBy({ left: Math.max(280, grid.clientWidth * 0.8), behavior: 'smooth' });
      } else {
        showGallery(lbIndex + 1);
      }
    });

    const lb = $('#lightbox');
    let touchStartX = 0;
    lb.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 48) showGallery(lbIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  function showGallery(i) {
    if (!GALLERY.length) return;
    lbIndex = (i + GALLERY.length) % GALLERY.length;
    const g = GALLERY[lbIndex];
    const img = $('#lb-image');
    img.src = g.src; img.alt = g.alt;
    $('#lb-caption').innerHTML = `<strong>${esc(g.strong)}</strong> — ${esc(g.small)}`;
    $('#lb-counter').textContent = `${lbIndex + 1} / ${GALLERY.length}`;
    openLayer('lightbox');
  }

  /* ---------- Cliques no cardápio ---------- */
  $('#menu-grid').addEventListener('click', (e) => {
    const consult = e.target.closest('[data-consult]');
    if (consult) {
      const p = productById(consult.dataset.consult);
      const msg = `Olá! Vim pelo site e gostaria de consultar os cortes de *${p.name}* disponíveis hoje para retirada, com valores e horário. Pode me ajudar?`;
      window.open(`https://wa.me/${STORE.wa}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    const quickCard = e.target.closest('[data-quick-card]');
    if (quickCard) {
      e.stopPropagation();
      const p = productById(quickCard.dataset.quickCard);
      if (p) addToCart(p, defaultSelections(p), '', 1, false);
      return;
    }
    const prod = e.target.closest('[data-product]') || e.target.closest('[data-card-product]');
    if (prod) {
      openProduct(prod.dataset.product || prod.dataset.cardProduct);
    }
  });

  /* ---------- Botão "Copiar endereço" ---------- */
  function initCopyAddress() {
    let btn = $('#copy-address-btn');
    if (!btn) return;
    const label = $('span', btn);
    const original = label ? label.textContent : 'Copiar endereço';
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy') || STORE.address;
      const ok = await copyText(text);
      if (ok) {
        btn.classList.add('is-copied');
        if (label) label.textContent = 'Endereço copiado!';
        toast('Endereço copiado');
        setTimeout(() => {
          btn.classList.remove('is-copied');
          if (label) label.textContent = original;
        }, 2200);
      } else {
        toast('Não foi possível copiar automaticamente');
      }
    });
  }

  /* ---------- Google Maps interativo ---------- */
  function initInteractiveMap() {
    const iframe = $('#gmaps-iframe');
    const stage = $('#map-stage');
    if (!iframe) return;

    const q = encodeURIComponent(STORE.mapQuery);
    const buildSrc = (mode) => `https://maps.google.com/maps?q=${q}&t=${mode}&z=17&ie=UTF8&iwloc=B&output=embed`;

    const mapsLink = $('#maps-link');
    const routeLink = $('#map-route-link');
    const wazeLink = $('#waze-link');
    if (mapsLink) mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
    if (routeLink) routeLink.href = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
    if (wazeLink) wazeLink.href = `https://www.waze.com/ul?q=${q}`;

    iframe.addEventListener('load', () => {
      if (stage) stage.classList.remove('is-loading');
    });

    const buttons = $$('[data-map-mode]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mapMode || 'm';
        if (btn.classList.contains('is-active')) return;
        buttons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        if (stage) stage.classList.add('is-loading');
        iframe.src = buildSrc(mode);
      });
    });
  }

  /* ---------- Menu mobile, scroll-spy, ano, reveals ---------- */
  const nav = $('#primary-nav');
  const menuToggle = $('#menu-toggle');
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });
  $$('#primary-nav a').forEach((a) => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }));

  function initScrollSpy() {
    const links = $$('#primary-nav a[href^="#"]');
    if (!('IntersectionObserver' in window) || !links.length) return;
    const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = '#' + en.target.id;
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    sections.forEach((sec) => spy.observe(sec));
  }

  $('#year').textContent = new Date().getFullYear();

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    $$('.reveal').forEach((el) => io.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Init ---------- */
  renderStatus();
  setInterval(renderStatus, 60000);
  renderChefPick();
  renderTabs();
  renderQuickFilters();
  renderMenu();
  renderSocialProof();
  initBrasaVideo();
  renderCart();
  initGallery();
  initCopyAddress();
  initInteractiveMap();
  initScrollSpy();
  updateCount();
})();
