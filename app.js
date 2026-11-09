'use strict';
/* ========== Utilidades ========== */
const $ = (s, el = document) => el.querySelector(s);
const brl = n => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const dkey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const fdate = d => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const KEY = 'vendas_db_v1';
const STAGES = ['Novo', 'Contato', 'Proposta', 'Negociação', 'Ganho', 'Perdido'];
const FIADO = 'A prazo (fiado)';
const ONLINE_METHODS = ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito'];
const METHODS = [...ONLINE_METHODS, FIADO];
const addMonths = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const x = new Date(y, m - 1 + n, 1); x.setDate(Math.min(d, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); return dkey(x); };
const fday = iso => iso.split('-').reverse().join('/');
const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = (a, f) => a.reduce((x, s) => x + f(s), 0);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const monthLabel = k => { const [y, m] = k.split('-').map(Number); return cap(new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })); };
const catName = c => c || 'Sem categoria';
const MAXIMG = 8;
const ICO_WA = '<svg viewBox="0 0 24 24"><path d="M20.5 3.5A11.8 11.8 0 0 0 12 0C5.4 0 .1 5.3.1 11.9c0 2.1.6 4.2 1.6 6L0 24l6.3-1.7a12 12 0 0 0 5.7 1.5c6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.200-3.400-8.400zM12 21.800c-1.800 0-3.600-.5-5.100-1.400l-.4-.2-3.700 1 1-3.600-.2-.4a9.800 9.800 0 0 1-1.500-5.300C2.100 6.500 6.600 2.100 12 2.100c2.600 0 5.100 1 6.900 2.900a9.700 9.700 0 0 1 2.900 6.900c0 5.400-4.400 9.900-9.800 9.900zm5.400-7.400c-.3-.1-1.800-.9-2-1-.3-.1-.5-.1-.7.1l-.9 1.100c-.2.200-.3.200-.6.100a8 8 0 0 1-4-3.500c-.3-.5.300-.5.900-1.600.1-.2 0-.4 0-.5l-.9-2.100c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.100-.8.400s-1 1-1 2.400 1 2.800 1.200 3c.1.200 2.100 3.200 5.100 4.500 1.900.8 2.600.9 3.600.7.600-.1 1.800-.7 2-1.400.3-.7.3-1.300.2-1.400-.1-.1-.3-.2-.6-.3z"/></svg>';
const ICO_IG = '<svg viewBox="0 0 24 24"><path d="M12 2.200c3.200 0 3.600 0 4.800.1 3.300.1 4.800 1.700 4.900 4.900.1 1.300.1 1.600.1 4.800s0 3.600-.1 4.800c-.1 3.200-1.700 4.800-4.900 4.900-1.300.1-1.600.1-4.800.1s-3.600 0-4.800-.1c-3.300-.1-4.800-1.700-4.900-4.900C2.200 15.600 2.200 15.200 2.200 12s0-3.600.1-4.800C2.400 3.900 4 2.400 7.200 2.300 8.400 2.200 8.800 2.200 12 2.200zM12 0C8.700 0 8.300 0 7.100.1 2.700.3.300 2.700.1 7.100 0 8.300 0 8.700 0 12s0 3.700.1 4.900c.2 4.400 2.600 6.800 7 7C8.300 24 8.700 24 12 24s3.700 0 4.900-.1c4.400-.2 6.800-2.600 7-7 .1-1.200.1-1.600.1-4.900s0-3.700-.1-4.900c-.2-4.400-2.600-6.800-7-7C15.700 0 15.300 0 12 0zm0 5.800a6.200 6.200 0 1 0 0 12.400 6.200 6.200 0 0 0 0-12.400zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.400-11.800a1.400 1.400 0 1 0 0 2.900 1.400 1.400 0 0 0 0-2.900z"/></svg>';
const DEF_PDFMSG = 'Olá! Tenho interesse em {produto} ({preco}). Vi no catálogo da {loja}.';

/* ========== Dados ========== */
function seed() {
  return { seq: 0, products: [], clients: [], leads: [], sales: [], receivables: [], users: [], categories: [], settings: {} };
}
function normalize(d) {
  d.settings ||= {}; d.settings.name ||= 'Minha loja'; d.settings.wa ||= '';
  d.settings.tagline ??= 'Escolha seus produtos e finalize o pedido pelo WhatsApp.'; d.settings.color ||= '#0071e3'; d.settings.url ||= ''; d.settings.pdfmsg ||= DEF_PDFMSG; d.settings.ig ||= ''; d.settings.cvMode ||= 'cor'; d.settings.cvColor ||= d.settings.color; d.settings.cvImg ||= ''; d.settings.cvOp ??= 40;
  d.receivables ||= []; d.users ||= []; d.sales ||= []; d.leads ||= []; d.clients ||= []; d.categories ||= [];
  d.products.forEach(p => {
    if (!p.imgs) p.imgs = p.img ? [p.img] : [];
    delete p.img; p.desc ||= ''; p.category ||= ''; p.featured = !!p.featured;
    if (p.category && !d.categories.includes(p.category)) d.categories.push(p.category);
  });
  return d;
}
function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.products) return normalize(d); } catch (e) { } return normalize(seed()); }
let db = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Não foi possível salvar (espaço cheio? tente fotos menores ou faça backup)'); } }
const prod = id => db.products.find(p => p.id === id);
const client = id => db.clients.find(c => c.id === id);
const done = () => db.sales.filter(s => s.status === 'concluída');
const ensureCat = c => { if (c && !db.categories.includes(c)) db.categories.push(c); };
const markup = p => p.cost > 0 ? (p.price - p.cost) / p.cost * 100 : null;
const margin = p => p.price > 0 ? (p.price - p.cost) / p.price * 100 : null;
const pct = n => n === null ? '—' : (Math.round(n * 10) / 10).toLocaleString('pt-BR') + '%';

function makeSale({ items, discount = 0, discountPct = 0, shipping = 0, method, clientId = '', channel, status, installments = 1, firstDue = '', note = '', received = 0, change = 0 }) {
  const subtotal = r2(items.reduce((s, i) => s + i.price * i.qty, 0));
  discount = r2(Math.max(0, Math.min(discount, subtotal))); shipping = r2(Math.max(0, shipping || 0));
  const sale = { note, id: uid(), num: ++db.seq, date: new Date().toISOString(), items, subtotal, discount, discountPct, shipping, total: r2(subtotal - discount + shipping), received, change, method, clientId, channel, status, sellerId: cur?.id || '' };
  if (status === 'concluída') items.forEach(i => { const p = prod(i.pid); if (p) p.stock -= i.qty; });
  if (method === FIADO && status === 'concluída') {
    const n = Math.max(1, Math.min(24, installments | 0)), cents = Math.round(sale.total * 100), base = Math.floor(cents / n);
    for (let k = 0; k < n; k++) db.receivables.push({ id: uid(), saleId: sale.id, clientId, num: k + 1, of: n, due: addMonths(firstDue, k), amount: (k === n - 1 ? cents - base * (n - 1) : base) / 100, paid: false, paidAt: '', paidMethod: '' });
  }
  db.sales.push(sale); save(); return sale;
}
const openDue = () => db.receivables.filter(r => !r.paid);
const isLate = r => !r.paid && r.due < dkey(new Date());
const saleProfit = s => s.total - (s.shipping || 0) - s.items.reduce((a, i) => a + (i.cost || 0) * i.qty, 0);

/* ========== Login / usuários ========== */
let cur = null;
async function hashPw(p) {
  const s = 'vendas:' + p;
  if (window.crypto?.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  return 'x' + btoa(unescape(encodeURIComponent(s)));
}
const isAdmin = () => cur?.role === 'admin';
const ADMIN_ONLY = ['dashboard', 'produtos', 'relatorios', 'usuarios', 'catalogo'];
async function ensureUsers() {
  if (!db.users.length) { db.users.push({ id: uid(), name: 'Administrador', login: 'admin', role: 'admin', commission: 0, pass: await hashPw('admin'), mustChange: true }); save(); }
}
function sessGet() { try { return sessionStorage.getItem('vendas_user'); } catch (e) { return null; } }
function sessSet(v) { try { v ? sessionStorage.setItem('vendas_user', v) : sessionStorage.removeItem('vendas_user'); } catch (e) { } }
function showLogin() {
  cur = null; $('#login').hidden = false; $('#lerr').textContent = '';
  const a = db.users.find(u => u.mustChange);
  $('#lhint').textContent = a ? `Primeiro acesso: usuário "${a.login}", senha "admin". Troque a senha depois de entrar.` : '';
  $('#lform').reset(); $('#lform').login.focus();
}
$('#lform').onsubmit = async e => {
  e.preventDefault();
  const f = e.target, u = db.users.find(x => x.login.toLowerCase() === f.login.value.trim().toLowerCase());
  if (!u || u.pass !== await hashPw(f.pass.value)) { $('#lerr').textContent = 'Usuário ou senha incorretos'; return; }
  sessSet(u.id); enter(u);
};
function enter(u) {
  cur = u; $('#login').hidden = true;
  $('#who').textContent = `${u.name} · ${u.role === 'admin' ? 'administrador' : 'vendedor'}`;
  document.querySelectorAll('#nav a').forEach(a => { a.hidden = ADMIN_ONLY.includes(a.dataset.v) && !isAdmin(); });
  document.querySelectorAll('.nav-h[data-admin]').forEach(h => { h.hidden = !isAdmin(); });
  document.querySelectorAll('.side-foot button[onclick*="backup"],.side-foot button[onclick*="restore"],.side-foot button[onclick*="reset"]').forEach(b => { b.hidden = !isAdmin(); });
  if (!location.hash || (!isAdmin() && ADMIN_ONLY.includes(location.hash.slice(1)))) location.hash = isAdmin() ? '#dashboard' : '#pdv';
  render(); if (u.mustChange) A.myPassword(true);
}

/* ========== UI helpers ========== */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2800); }
function openModal(title, bodyHtml, onSubmit, submitLabel = 'Salvar') {
  const f = $('#mform');
  f.innerHTML = `<h2>${esc(title)}</h2>${bodyHtml}<div class="btns"><button type="button" class="btn ghost" onclick="$('#modal').close()">Fechar</button>${onSubmit ? `<button class="btn">${esc(submitLabel)}</button>` : ''}</div>`;
  f.onsubmit = e => { e.preventDefault(); if (onSubmit) { if (onSubmit(new FormData(f)) !== false) $('#modal').close(); } };
  f.onclick = null;
  if (!$('#modal').open) $('#modal').showModal();
}
function fieldsHtml(fields, data = {}) {
  return fields.map(f => {
    const v = data[f.k] ?? f.def ?? '';
    const req = f.req ? 'required' : '';
    let inp;
    if (f.type === 'select') inp = `<select name="${f.k}" ${req}>${f.opts.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val == v ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
    else if (f.type === 'textarea') inp = `<textarea name="${f.k}" rows="2">${esc(v)}</textarea>`;
    else inp = `<input name="${f.k}" type="${f.type || 'text'}" value="${esc(v)}" ${f.type === 'number' ? 'step="0.01" min="0"' : ''} ${req}>`;
    return `<label>${esc(f.label)}${inp}</label>`;
  }).join('');
}
function formModal(title, fields, data, onSave) {
  const half = fields.some(f => f.half);
  const html = half ? `<div class="row">${fieldsHtml(fields.filter(f => f.half), data)}</div>` + fieldsHtml(fields.filter(f => !f.half), data) : fieldsHtml(fields, data);
  openModal(title, html, fd => {
    const o = {};
    fields.forEach(f => { let v = fd.get(f.k); if (f.type === 'number') v = parseFloat(v) || 0; else v = (v || '').trim(); o[f.k] = v; });
    return onSave(o);
  });
}
const confirmDel = msg => confirm(msg);
const catOptions = (sel, all) => (all ? `<option value="">${all}</option>` : '') + db.categories.map(c => `<option value="${esc(c)}" ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('');

/* ========== Roteamento ========== */
const V = {};
const TITLES = { dashboard: 'Painel', pdv: 'PDV — Caixa', vendas: 'Vendas e pedidos', receber: 'Contas a receber', produtos: 'Produtos e estoque', clientes: 'Clientes', funil: 'Funil de vendas (CRM)', relatorios: 'Relatórios', usuarios: 'Usuários', catalogo: 'Catálogo online' };
function render() {
  if (!cur) return;
  let v = (location.hash || '#dashboard').slice(1);
  if (!V[v] || (ADMIN_ONLY.includes(v) && !isAdmin())) v = isAdmin() ? 'dashboard' : 'pdv';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  $('#title').textContent = TITLES[v]; $('#actions').innerHTML = '';
  V[v]();
}
window.addEventListener('hashchange', render);
const setMain = h => { $('#main').innerHTML = h; };
const setActions = h => { $('#actions').innerHTML = h; };

/* ========== Painel ========== */
let dp = 'cur';
V.dashboard = () => {
  const now = new Date(), today = dkey(now), curM = today.slice(0, 7), ds = done();
  const months = [...new Set([curM, ...ds.map(s => dkey(s.date).slice(0, 7))])].sort().reverse();
  if (dp !== 'cur' && dp !== 'all' && !months.includes(dp)) dp = 'cur';
  setActions(`<select class="period" onchange="dp=this.value;V.dashboard()" aria-label="Período">
    <option value="cur" ${dp === 'cur' ? 'selected' : ''}>Mês atual — ${monthLabel(curM)}</option>
    ${months.filter(k => k !== curM).map(k => `<option value="${k}" ${dp === k ? 'selected' : ''}>${monthLabel(k)}</option>`).join('')}
    <option value="all" ${dp === 'all' ? 'selected' : ''}>Total geral</option></select>`);
  const key = dp === 'cur' ? curM : dp;
  const P = dp === 'all' ? ds : ds.filter(s => dkey(s.date).startsWith(key));
  const fat = sum(P, s => s.total), lucro = sum(P, saleProfit);
  const sToday = ds.filter(s => dkey(s.date) === today);
  const pend = db.sales.filter(s => s.status === 'pendente').length;
  const open = db.leads.filter(l => !['Ganho', 'Perdido'].includes(l.stage));
  let bars, chartTitle;
  if (dp === 'all') {
    chartTitle = 'Faturamento por mês';
    bars = months.slice(0, 12).reverse().map(k => ({ l: k.slice(5) + '/' + k.slice(2, 4), v: sum(ds.filter(s => dkey(s.date).startsWith(k)), s => s.total), hi: k === curM }));
  } else {
    chartTitle = `Faturamento por dia — ${monthLabel(key)}`;
    const [y, m] = key.split('-').map(Number), n = new Date(y, m, 0).getDate();
    bars = [...Array(n)].map((_, i) => { const dk = `${key}-${String(i + 1).padStart(2, '0')}`; return { l: String(i + 1), v: sum(ds.filter(s => dkey(s.date) === dk), s => s.total), hi: dk === today }; });
  }
  const max = Math.max(...bars.map(b => b.v), 1), dense = bars.length > 12;
  const top = {}; P.forEach(s => s.items.forEach(i => { top[i.name] = (top[i.name] || 0) + i.qty; }));
  const topL = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const low = db.products.filter(p => p.stock <= p.min);
  const plabel = dp === 'all' ? 'total geral' : dp === 'cur' ? 'mês atual' : monthLabel(key);
  setMain(`
  <div class="cards">
    <div class="card hero"><h3>Faturamento — ${esc(plabel)}</h3><div class="kpi">${brl(fat)}<small>${P.length} venda(s)</small></div></div>
    <div class="card"><h3>Ticket médio</h3><div class="kpi">${brl(P.length ? fat / P.length : 0)}</div></div>
    <div class="card"><h3>Lucro estimado</h3><div class="kpi">${brl(lucro)}<small>${fat ? Math.round(lucro / fat * 100) : 0}% sobre o faturamento</small></div></div>
    <div class="card"><h3>Vendas hoje</h3><div class="kpi">${brl(sum(sToday, s => s.total))}<small>${sToday.length} venda(s)</small></div></div>
    <div class="card"><h3>Pedidos online pendentes</h3><div class="kpi">${pend}</div></div>
    <div class="card"><h3>A receber</h3><div class="kpi">${brl(sum(openDue(), r => r.amount))}<small>${brl(sum(openDue().filter(isLate), r => r.amount))} em atraso</small></div></div>
    <div class="card"><h3>Investido em estoque</h3><div class="kpi">${brl(sum(db.products, p => Math.max(0, p.stock) * p.cost))}<small>vale ${brl(sum(db.products, p => Math.max(0, p.stock) * p.price))} na venda</small></div></div>
    <div class="card"><h3>Negócios em aberto</h3><div class="kpi">${brl(sum(open, l => l.value))}<small>${open.length} lead(s)</small></div></div>
  </div>
  <div class="grid2">
    <div class="card"><h3>${esc(chartTitle)}</h3><div class="bars ${dense ? 'dense' : ''}">${bars.map(b => `<div class="bar" title="${esc(b.l)}: ${brl(b.v)}">${b.v && !dense ? `<b>${Math.round(b.v)}</b>` : ''}<i class="${b.hi ? '' : 'dim'}" style="height:${Math.max(b.v / max * 78, 2)}%"></i>${esc(b.l)}</div>`).join('')}</div></div>
    <div class="card"><h3>Mais vendidos — ${esc(plabel)}</h3>${topL.length ? topL.map(([n, q]) => `<div class="line"><span class="n">${esc(n)}</span><b>${q} un.</b></div>`).join('') : '<div class="empty">Sem vendas no período</div>'}</div>
  </div>
  <div class="card" style="margin-top:12px"><h3>Estoque baixo</h3>${low.length ? low.map(p => `<div class="line"><span class="n">${esc(p.name)}</span><span class="tag ${p.stock <= 0 ? 'bad' : 'warn'}">${p.stock} em estoque (mín. ${p.min})</span></div>`).join('') : '<div class="empty">Tudo certo com o estoque</div>'}</div>`);
};

/* ========== PDV ========== */
let cart = [], pdvPct = 0, pdvShip = 0;
V.pdv = () => {
  setMain(`<div class="pos">
    <div><div class="toolbar"><input id="q" placeholder="Buscar produto (nome, código ou categoria)..." autofocus><select id="pcat" style="max-width:220px">${catOptions('', 'Todas as categorias')}</select></div><div class="prods" id="plist"></div></div>
    <div class="card cart"><h3>Carrinho</h3><div id="cartl"></div>
      <div class="row2"><label>Desconto (%)<input id="dpct" type="number" min="0" max="100" step="0.1" value="${pdvPct || ''}" oninput="pdvPct=Math.min(100,Math.max(0,parseFloat(this.value)||0));pdvTotals()"></label><output id="dval" class="out" aria-label="Desconto em reais">− R$ 0,00</output></div>
      <label>Frete (R$)<input id="ship" type="number" min="0" step="0.01" value="${pdvShip || ''}" placeholder="0,00" oninput="pdvShip=Math.max(0,parseFloat(this.value)||0);pdvTotals()"></label>
      <div class="sumr"><span>Subtotal</span><span id="psub"></span></div><div class="sumr"><span>Desconto</span><span id="pdis"></span></div><div class="sumr"><span>Frete</span><span id="pshp"></span></div>
      <div class="tot"><span>Total</span><span id="ptotal"></span></div>
      <label>Forma de pagamento<select id="pmethod" onchange="$('#pfiado').hidden=this.value!==FIADO;$('#pcash').hidden=this.value!=='Dinheiro';cashCalc()">${METHODS.map(m => `<option>${m}</option>`).join('')}</select></label>
      <div id="pcash" class="fiado"><div class="row2"><label>Valor recebido (R$)<input id="prec" type="number" min="0" step="any" placeholder="0,00" oninput="cashCalc()"></label><output id="pchg" class="out" aria-live="polite">Troco —</output></div>
        <div class="chips"><button type="button" class="btn ghost sm" onclick="A.cash(0)">Valor exato</button>${[20, 50, 100, 200].map(v => `<button type="button" class="btn ghost sm" onclick="A.cash(${v})">R$ ${v}</button>`).join('')}</div></div>
      <div id="pfiado" class="fiado" hidden><div class="row"><label>Parcelas<input id="pinst" type="number" min="1" max="24" value="1"></label><label>1º vencimento<input id="pdue" type="date" value="${addMonths(dkey(new Date()), 1)}"></label></div></div>
      <label>Cliente (opcional; obrigatório no fiado)<select id="pclient"><option value="">— Consumidor —</option>${db.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
      <button class="btn ok" style="width:100%" onclick="A.checkout()">Finalizar venda</button>
      <button class="btn ghost" style="width:100%;margin-top:6px" onclick="A.clearCart()">Limpar</button></div></div>
    <button class="cartbar" id="cartbar" onclick="$('.cart').scrollIntoView({behavior:'smooth',block:'start'})"></button>`);
  $('#q').oninput = pdvList; $('#pcat').onchange = pdvList; pdvList(); pdvCart();
  if (window.IntersectionObserver) new IntersectionObserver(([e]) => { const b = $('#cartbar'); if (b) b.classList.toggle('hide', e.isIntersecting); }, { threshold: 0.15 }).observe($('.cart'));
};
function cartBar() {
  const b = $('#cartbar'); if (!b) return;
  const n = cart.reduce((s, i) => s + i.qty, 0);
  b.classList.toggle('on', n > 0);
  b.innerHTML = `<span>Carrinho · ${n} ${n === 1 ? 'item' : 'itens'}</span><span>${brl(pdvTotal())} &rsaquo;</span>`;
}
function pdvList() {
  const q = ($('#q').value || '').toLowerCase(), c = $('#pcat').value;
  const l = db.products.filter(p => (!c || p.category === c) && [p.name, p.sku, p.category].join(' ').toLowerCase().includes(q));
  $('#plist').innerHTML = l.length ? l.map(p => `<button class="prod" ${p.stock <= 0 ? 'disabled' : ''} onclick="A.addCart('${p.id}')">${p.imgs[0] ? `<img class="pimg" src="${esc(p.imgs[0])}" alt="">` : ''}<b>${esc(p.name)}</b><span>${esc(catName(p.category))} · ${p.stock} un.</span><div class="pr">${brl(p.price)}</div></button>`).join('') : '<div class="empty">Nenhum produto encontrado.</div>';
}
const cartSubtotal = () => r2(cart.reduce((s, i) => s + (prod(i.pid)?.price || 0) * i.qty, 0));
const pdvDisc = () => r2(cartSubtotal() * pdvPct / 100);
function pdvTotals() {
  const sub = cartSubtotal(), d = pdvDisc();
  $('#psub').textContent = brl(sub); $('#pdis').textContent = '− ' + brl(d); $('#pshp').textContent = brl(pdvShip);
  $('#dval').textContent = '− ' + brl(d); $('#ptotal').textContent = brl(sub - d + pdvShip);
  cashCalc(); cartBar();
}
const pdvTotal = () => r2(cartSubtotal() - pdvDisc() + pdvShip);
function cashCalc() {
  const out = $('#pchg'); if (!out) return;
  const rec = parseFloat($('#prec').value), total = pdvTotal();
  out.className = 'out';
  if (!(rec > 0)) { out.textContent = 'Troco —'; return; }
  if (r2(rec) < total) { out.textContent = 'Faltam ' + brl(total - rec); out.classList.add('warn'); }
  else { out.textContent = 'Troco ' + brl(rec - total); out.classList.add('ok'); }
}
function pdvCart() {
  $('#cartl').innerHTML = cart.length ? cart.map(i => { const p = prod(i.pid); return `<div class="line"><div class="n"><b>${esc(p.name)}</b><br><small>${brl(p.price)}</small></div><div class="q"><button onclick="A.qty('${i.pid}',-1)" aria-label="Diminuir">−</button><b>${i.qty}</b><button onclick="A.qty('${i.pid}',1)" aria-label="Aumentar">+</button></div><b>${brl(p.price * i.qty)}</b></div>`; }).join('') : '<div class="empty">Carrinho vazio</div>';
  pdvTotals();
}

/* ========== Vendas ========== */
let vF = { st: '', ch: '', q: '', from: '', to: '' };
V.vendas = () => {
  setActions('<button class="btn ghost" onclick="A.csv()">Exportar CSV</button>');
  setMain(`<div class="toolbar">
    <input placeholder="Buscar por nº ou cliente..." value="${esc(vF.q)}" oninput="vF.q=this.value;vendasTable()">
    <select onchange="vF.st=this.value;vendasTable()"><option value="">Todos os status</option>${['concluída', 'pendente', 'cancelada'].map(s => `<option ${vF.st === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <select onchange="vF.ch=this.value;vendasTable()"><option value="">Todos os canais</option>${['loja', 'online'].map(s => `<option ${vF.ch === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <label class="inl">De <input type="date" value="${vF.from}" onchange="vF.from=this.value;vendasTable()"></label><label class="inl">Até <input type="date" value="${vF.to}" onchange="vF.to=this.value;vendasTable()"></label>
    <button class="btn ghost sm" onclick="vF={st:'',ch:'',q:'',from:'',to:''};V.vendas()">Limpar filtros</button></div><div id="vtable"></div>`);
  vendasTable();
};
function vendasTable() {
  const cls = { 'concluída': 'ok', pendente: 'warn', cancelada: 'bad' }, q = vF.q.toLowerCase().replace('#', '');
  const l = db.sales.filter(s => (isAdmin() || s.sellerId === cur.id || s.channel === 'online') && (!vF.st || s.status === vF.st) && (!vF.ch || s.channel === vF.ch)
    && (!vF.from || dkey(s.date) >= vF.from) && (!vF.to || dkey(s.date) <= vF.to) && (!q || String(s.num) === q || (client(s.clientId)?.name || '').toLowerCase().includes(q))).sort((a, b) => b.num - a.num);
  $('#vtable').innerHTML = `<div class="tw"><table><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Canal</th><th>Pagamento</th><th class="r">Total</th><th>Status</th><th></th></tr>
    ${l.map(s => `<tr><td>#${s.num}</td><td>${fdate(s.date)}</td><td>${esc(client(s.clientId)?.name || '—')}</td><td>${s.channel}</td><td>${esc(s.method)}</td><td class="r">${brl(s.total)}</td><td><span class="tag ${cls[s.status]}">${s.status}</span></td>
    <td class="r"><button class="btn ghost sm" onclick="A.viewSale('${s.id}')">Ver</button> ${s.status === 'pendente' ? `<button class="btn ok sm" onclick="A.confirmSale('${s.id}')">Confirmar</button>` : ''} ${s.status !== 'cancelada' && isAdmin() ? `<button class="btn bad sm" onclick="A.cancelSale('${s.id}')">Cancelar</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">Nenhuma venda encontrada</td></tr>'}</table></div>`;
}

/* ========== A receber ========== */
let rFilt = 'abertas';
V.receber = () => {
  const all = db.receivables, today = dkey(new Date());
  const l = all.filter(r => rFilt === 'pagas' ? r.paid : rFilt === 'atrasadas' ? isLate(r) : rFilt === 'abertas' ? !r.paid : true).sort((a, b) => a.due.localeCompare(b.due));
  const sm = a => a.reduce((x, r) => x + r.amount, 0);
  setMain(`<div class="cards">
    <div class="card"><h3>Em aberto</h3><div class="kpi">${brl(sm(openDue()))}<small>${openDue().length} parcela(s)</small></div></div>
    <div class="card"><h3>Em atraso</h3><div class="kpi" style="color:var(--bad)">${brl(sm(openDue().filter(isLate)))}<small>${openDue().filter(isLate).length} parcela(s)</small></div></div>
    <div class="card"><h3>Vence hoje</h3><div class="kpi">${brl(sm(openDue().filter(r => r.due === today)))}</div></div>
    <div class="card"><h3>Recebido</h3><div class="kpi">${brl(sm(all.filter(r => r.paid)))}</div></div></div>
    <div class="toolbar"><select onchange="rFilt=this.value;V.receber()">${['abertas', 'atrasadas', 'pagas', 'todas'].map(x => `<option ${rFilt === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="tw"><table><tr><th>Vencimento</th><th>Cliente</th><th>Venda</th><th>Parcela</th><th class="r">Valor</th><th>Situação</th><th></th></tr>
    ${l.map(r => { const s = db.sales.find(x => x.id === r.saleId); return `<tr><td>${fday(r.due)}</td><td>${esc(client(r.clientId)?.name || '—')}</td><td>#${s?.num ?? '?'}</td><td>${r.num}/${r.of}</td><td class="r">${brl(r.amount)}</td>
    <td><span class="tag ${r.paid ? 'ok' : isLate(r) ? 'bad' : 'warn'}">${r.paid ? 'paga em ' + fday(r.paidAt) + ' (' + esc(r.paidMethod) + ')' : isLate(r) ? 'atrasada' : 'aberta'}</span></td>
    <td class="r">${r.paid ? `<button class="btn ghost sm" onclick="A.unpay('${r.id}')">Estornar</button>` : `<button class="btn ok sm" onclick="A.pay('${r.id}')">Receber</button>`}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">Nada por aqui</td></tr>'}</table></div>`);
};

/* ========== Produtos ========== */
let pf = { q: '', cat: '', st: '', sort: 'name' };
V.produtos = () => {
  setActions('<button class="btn ghost" onclick="catModal()">Categorias</button><button class="btn" onclick="A.editProd()">+ Novo produto</button>');
  setMain(`<div class="toolbar">
    <input placeholder="Buscar produto ou código..." value="${esc(pf.q)}" oninput="pf.q=this.value;prodTable()">
    <select onchange="pf.cat=this.value;prodTable()">${catOptions(pf.cat, 'Todas as categorias')}<option value="__none" ${pf.cat === '__none' ? 'selected' : ''}>Sem categoria</option></select>
    <select onchange="pf.st=this.value;prodTable()">${[['', 'Todo o estoque'], ['ok', 'Estoque ok'], ['baixo', 'Estoque baixo'], ['zerado', 'Zerado']].map(([v, l]) => `<option value="${v}" ${pf.st === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <select onchange="pf.sort=this.value;prodTable()">${[['name', 'Ordenar: nome'], ['price-', 'Maior preço'], ['price+', 'Menor preço'], ['margin', 'Maior margem'], ['stock', 'Menor estoque']].map(([v, l]) => `<option value="${v}" ${pf.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <button class="btn ghost sm" onclick="pf={q:'',cat:'',st:'',sort:'name'};V.produtos()">Limpar filtros</button></div><div id="ptable"></div>`);
  prodTable();
};
function prodTable() {
  const q = pf.q.toLowerCase();
  let l = db.products.filter(p => (!pf.cat || (pf.cat === '__none' ? !p.category : p.category === pf.cat)) && (!q || (p.name + ' ' + p.sku).toLowerCase().includes(q))
    && (!pf.st || (pf.st === 'zerado' ? p.stock <= 0 : pf.st === 'baixo' ? p.stock > 0 && p.stock <= p.min : p.stock > p.min)));
  const sorts = { name: (a, b) => a.name.localeCompare(b.name), 'price-': (a, b) => b.price - a.price, 'price+': (a, b) => a.price - b.price, margin: (a, b) => (margin(b) ?? -1) - (margin(a) ?? -1), stock: (a, b) => a.stock - b.stock };
  l = l.sort(sorts[pf.sort] || sorts.name);
  const units = sum(l, p => Math.max(0, p.stock)), invested = sum(l, p => Math.max(0, p.stock) * p.cost), worth = sum(l, p => Math.max(0, p.stock) * p.price);
  const filtered = pf.q || pf.cat || pf.st;
  $('#ptable').innerHTML = `<div class="cards stock-cards">
    <div class="card hero"><h3>Investido em estoque (custo)${filtered ? ' — seleção atual' : ''}</h3><div class="kpi">${brl(invested)}<small>${units} unidade(s) em ${l.filter(p => p.stock > 0).length} produto(s)</small></div></div>
    <div class="card"><h3>Valor de venda do estoque</h3><div class="kpi">${brl(worth)}</div></div>
    <div class="card"><h3>Lucro potencial</h3><div class="kpi">${brl(worth - invested)}<small>${worth ? Math.round((worth - invested) / worth * 100) : 0}% de margem</small></div></div></div>
  <div class="tw"><table><tr><th>Produto</th><th>Categoria</th><th class="r">Custo</th><th class="r">Preço</th><th class="r">Markup</th><th class="r">Margem</th><th class="r">Estoque</th><th class="r">Investido</th><th></th></tr>
  ${l.map(p => `<tr><td><div style="display:flex;gap:10px;align-items:center">${p.imgs[0] ? `<img class="thumb" src="${esc(p.imgs[0])}" alt="">` : `<span class="thumb ph">${esc(p.name.charAt(0))}</span>`}<span><b>${esc(p.name)}</b>${p.featured ? ' <span class="tag ok">★ destaque</span>' : ''}${p.imgs.length > 1 ? ` <span class="tag">${p.imgs.length} fotos</span>` : ''}<br><small>${esc(p.sku)}</small></span></div></td><td>${esc(catName(p.category))}</td><td class="r">${brl(p.cost)}</td><td class="r">${brl(p.price)}</td><td class="r">${pct(markup(p))}</td><td class="r">${pct(margin(p))}</td>
  <td class="r"><span class="tag ${p.stock <= 0 ? 'bad' : p.stock <= p.min ? 'warn' : 'ok'}">${p.stock}</span></td><td class="r">${brl(Math.max(0, p.stock) * p.cost)}</td>
  <td class="r"><button class="btn ghost sm" onclick="A.photo('${p.id}')">Fotos</button> <button class="btn ghost sm" onclick="A.adjStock('${p.id}')">± Estoque</button> <button class="btn ghost sm" onclick="A.editProd('${p.id}')">Editar</button> <button class="btn bad sm" onclick="A.delProd('${p.id}')" aria-label="Excluir">✕</button></td></tr>`).join('') || '<tr><td colspan="9" class="empty">Nenhum produto encontrado</td></tr>'}</table></div>`;
}
function catModal() {
  openModal('Categorias', `<form id="ncf" class="inline-add" onsubmit="return false"><input id="ncin" placeholder="Nova categoria..." maxlength="40"><button type="button" class="btn" id="ncadd">Adicionar</button></form>
  <div id="catlist">${db.categories.map(c => { const n = db.products.filter(p => p.category === c).length; return `<div class="line"><span class="n"><b>${esc(c)}</b> <small>${n} produto(s)</small></span><button type="button" class="btn ghost sm" data-ren="${esc(c)}">Renomear</button><button type="button" class="btn bad sm" data-del="${esc(c)}" aria-label="Excluir categoria">✕</button></div>`; }).join('') || '<div class="empty">Nenhuma categoria ainda</div>'}</div>`, null);
  const f = $('#mform');
  const add = () => { const v = $('#ncin').value.trim(); if (!v) return; if (db.categories.some(c => c.toLowerCase() === v.toLowerCase())) return toast('Essa categoria já existe'); db.categories.push(v); save(); catModal(); if (location.hash === '#produtos') V.produtos(); };
  $('#ncadd').onclick = add; $('#ncin').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
  f.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const ren = b.getAttribute('data-ren'), del = b.getAttribute('data-del');
    if (ren !== null) {
      const nn = (prompt('Novo nome da categoria:', ren) || '').trim(); if (!nn || nn === ren) return;
      db.products.forEach(p => { if (p.category === ren) p.category = nn; });
      db.categories = [...new Set(db.categories.map(c => c === ren ? nn : c))]; save(); catModal(); if (location.hash === '#produtos') V.produtos();
    } else if (del !== null) {
      const n = db.products.filter(p => p.category === del).length;
      if (!confirmDel(`Excluir a categoria "${del}"?` + (n ? ` ${n} produto(s) ficarão sem categoria.` : ''))) return;
      db.products.forEach(p => { if (p.category === del) p.category = ''; }); db.categories = db.categories.filter(c => c !== del); save(); catModal(); if (location.hash === '#produtos') V.produtos();
    }
  };
}
function photoModal(id) {
  const p = prod(id);
  openModal(`Fotos — ${p.name}`, `<p class="sub">Até ${MAXIMG} fotos por produto. A primeira é a capa no catálogo.</p>
  <div class="gal">${p.imgs.map((s, i) => `<div class="gi"><img src="${esc(s)}" alt="Foto ${i + 1}"><div>${i ? `<button type="button" data-cover="${i}">Capa</button>` : '<span class="tag ok">Capa</span>'}<button type="button" data-rm="${i}" aria-label="Remover foto">✕</button></div></div>`).join('') || '<div class="empty" style="grid-column:1/-1">Sem fotos ainda</div>'}</div>
  ${p.imgs.length < MAXIMG ? `<label>Adicionar fotos (pode escolher várias)<input type="file" id="pimgs" accept="image/*" multiple></label>` : '<p class="sub">Limite de fotos atingido.</p>'}`, null);
  const f = $('#mform');
  f.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const c = b.getAttribute('data-cover'), r = b.getAttribute('data-rm');
    if (c !== null) { const [x] = p.imgs.splice(+c, 1); p.imgs.unshift(x); }
    else if (r !== null) p.imgs.splice(+r, 1); else return;
    save(); photoModal(id); if (location.hash === '#produtos') prodTable();
  };
  const inp = $('#pimgs');
  if (inp) inp.onchange = async () => {
    const files = [...inp.files].slice(0, MAXIMG - p.imgs.length); let bad = 0;
    for (const file of files) { try { p.imgs.push(await shrink(file)); } catch (e) { bad++; } }
    save(); photoModal(id); if (location.hash === '#produtos') prodTable(); if (bad) toast(`${bad} arquivo(s) não puderam ser lidos`);
  };
}
function shrink(file, max = 640) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.8)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(); }; img.src = url;
  });
}

/* ========== Clientes ========== */
const CF = [{ k: 'name', label: 'Nome', req: 1 }, { k: 'phone', label: 'Telefone', type: 'tel', half: 1 }, { k: 'email', label: 'E-mail', type: 'email', half: 1 }, { k: 'notes', label: 'Observações', type: 'textarea' }];
V.clientes = () => {
  setActions('<button class="btn" onclick="A.editClient()">+ Novo cliente</button>');
  setMain(`<div class="tw"><table><tr><th>Nome</th><th>Contato</th><th class="r">Compras</th><th class="r">Total gasto</th><th class="r">Fiado em aberto</th><th></th></tr>
  ${db.clients.map(c => { const s = done().filter(x => x.clientId === c.id), dv = sum(openDue().filter(r => r.clientId === c.id), r => r.amount); return `<tr><td><b>${esc(c.name)}</b><br><small>${esc(c.notes)}</small></td><td>${esc(c.phone)}<br><small>${esc(c.email)}</small></td><td class="r">${s.length}</td><td class="r">${brl(sum(s, x => x.total))}</td><td class="r">${dv ? `<span class="tag warn">${brl(dv)}</span>` : '—'}</td>
  <td class="r"><button class="btn ghost sm" onclick="A.editClient('${c.id}')">Editar</button> <button class="btn bad sm" onclick="A.delClient('${c.id}')" aria-label="Excluir">✕</button></td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">Nenhum cliente cadastrado</td></tr>'}</table></div>`);
};

/* ========== Funil CRM ========== */
const LF = () => [{ k: 'name', label: 'Nome do lead', req: 1 }, { k: 'company', label: 'Empresa', half: 1 }, { k: 'phone', label: 'Telefone', type: 'tel', half: 1 }, { k: 'value', label: 'Valor estimado (R$)', type: 'number', half: 1 }, { k: 'stage', label: 'Etapa', type: 'select', opts: STAGES, half: 1 }, { k: 'notes', label: 'Observações', type: 'textarea' }];
V.funil = () => {
  setActions('<button class="btn" onclick="A.editLead()">+ Novo lead</button>');
  setMain(`<div class="kan">${STAGES.map(st => { const l = db.leads.filter(x => x.stage === st); return `<div class="col" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="A.dropLead(event,'${st}')"><h4><span>${st} (${l.length})</span><span>${brl(sum(l, x => x.value))}</span></h4>
  ${l.map(x => `<div class="lead" draggable="true" ondragstart="event.dataTransfer.setData('text/plain','${x.id}')" onclick="A.editLead('${x.id}')"><b>${esc(x.name)}</b><small>${esc(x.company)} ${esc(x.phone)}</small><span class="v">${brl(x.value)}</span></div>`).join('')}</div>`; }).join('')}</div>
  <p class="sub">Arraste os cartões entre as colunas para mudar de etapa. Clique para editar.</p>`);
};

/* ========== Relatórios ========== */
const monthStart = () => { const d = new Date(); d.setDate(1); return dkey(d); };
const nowD = new Date();
let rep = { kind: 'mensal', month: dkey(nowD).slice(0, 7), year: nowD.getFullYear(), q: Math.floor(nowD.getMonth() / 3) + 1, s: nowD.getMonth() < 6 ? 1 : 2, from: monthStart(), to: dkey(nowD) };
function repRange() {
  const y = +rep.year || nowD.getFullYear(), pad = n => String(n).padStart(2, '0'), last = (yy, m) => new Date(yy, m, 0).getDate();
  if (rep.kind === 'mensal') { const [yy, mm] = rep.month.split('-').map(Number); return [`${yy}-${pad(mm)}-01`, `${yy}-${pad(mm)}-${last(yy, mm)}`]; }
  if (rep.kind === 'trimestral') { const a = (rep.q - 1) * 3 + 1, b = a + 2; return [`${y}-${pad(a)}-01`, `${y}-${pad(b)}-${last(y, b)}`]; }
  if (rep.kind === 'semestral') { const a = rep.s === 1 ? 1 : 7, b = a + 5; return [`${y}-${pad(a)}-01`, `${y}-${pad(b)}-${last(y, b)}`]; }
  if (rep.kind === 'anual') return [`${y}-01-01`, `${y}-12-31`];
  return [rep.from || '0000-01-01', rep.to || '9999-12-31'];
}
V.relatorios = () => {
  setActions('<button class="btn ghost" onclick="A.csvProd()">Exportar produtos (CSV)</button>');
  const [from, to] = repRange();
  const ds = done().filter(s => dkey(s.date) >= from && dkey(s.date) <= to);
  const fat = sum(ds, s => s.total), lucro = sum(ds, saleProfit);
  const grp = (keyf, init) => { const m = {}; ds.forEach(s => keyf(s).forEach(([k, v]) => { (m[k] ||= init()); v(m[k]); })); return m; };
  const byPay = grp(s => [[s.method, o => { o.n++; o.t += s.total; }]], () => ({ n: 0, t: 0 }));
  const bySel = grp(s => [[s.sellerId, o => { o.n++; o.t += s.total; }]], () => ({ n: 0, t: 0 }));
  const byProd = grp(s => s.items.map(i => [i.name, o => { o.q += i.qty; o.r += i.price * i.qty; o.l += (i.price - (i.cost || 0)) * i.qty; }]), () => ({ q: 0, r: 0, l: 0 }));
  const byDay = grp(s => [[dkey(s.date), o => { o.n++; o.t += s.total; }]], () => ({ n: 0, t: 0 }));
  const tbl = (head, rows) => `<div class="tw"><table><tr>${head.map((h, i) => `<th class="${i ? 'r' : ''}">${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'r' : ''}">${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${head.length}" class="empty">Sem dados no período</td></tr>`}</table></div>`;
  window.__prodRows = Object.entries(byProd);
  const yearIn = `<label class="inl">Ano <input type="number" min="2000" max="2100" value="${rep.year}" onchange="rep.year=this.value;V.relatorios()" style="width:92px"></label>`;
  const ctl = { mensal: `<label class="inl">Mês <input type="month" value="${rep.month}" onchange="rep.month=this.value||rep.month;V.relatorios()"></label>`,
    trimestral: yearIn + `<select onchange="rep.q=+this.value;V.relatorios()">${[1, 2, 3, 4].map(q => `<option value="${q}" ${rep.q === q ? 'selected' : ''}>${q}º trimestre (${['jan–mar', 'abr–jun', 'jul–set', 'out–dez'][q - 1]})</option>`).join('')}</select>`,
    semestral: yearIn + `<select onchange="rep.s=+this.value;V.relatorios()">${[1, 2].map(s => `<option value="${s}" ${rep.s === s ? 'selected' : ''}>${s}º semestre (${s === 1 ? 'jan–jun' : 'jul–dez'})</option>`).join('')}</select>`,
    anual: yearIn,
    personalizado: `<label class="inl">De <input type="date" value="${rep.from}" onchange="rep.from=this.value;V.relatorios()"></label><label class="inl">Até <input type="date" value="${rep.to}" onchange="rep.to=this.value;V.relatorios()"></label>` }[rep.kind];
  setMain(`<div class="toolbar"><div class="seg" role="tablist">${['mensal', 'trimestral', 'semestral', 'anual', 'personalizado'].map(k => `<button class="${rep.kind === k ? 'on' : ''}" onclick="rep.kind='${k}';V.relatorios()">${cap(k)}</button>`).join('')}</div>${ctl}</div>
  <p class="sub">Período: ${fday(from)} a ${fday(to)}</p>
  <div class="cards">
    <div class="card hero"><h3>Faturamento</h3><div class="kpi">${brl(fat)}<small>${ds.length} venda(s)</small></div></div>
    <div class="card"><h3>Lucro estimado</h3><div class="kpi">${brl(lucro)}<small>${fat ? Math.round(lucro / fat * 100) : 0}% de margem</small></div></div>
    <div class="card"><h3>Ticket médio</h3><div class="kpi">${brl(ds.length ? fat / ds.length : 0)}</div></div>
    <div class="card"><h3>Descontos dados</h3><div class="kpi">${brl(sum(ds, s => s.discount))}</div></div>
    <div class="card"><h3>Frete cobrado</h3><div class="kpi">${brl(sum(ds, s => s.shipping || 0))}</div></div></div>
  <div class="grid2"><div><h3>Por forma de pagamento</h3>${tbl(['Forma', 'Vendas', 'Total'], Object.entries(byPay).map(([k, o]) => [esc(k), o.n, brl(o.t)]))}</div>
  <div><h3>Por vendedor (comissão)</h3>${tbl(['Vendedor', 'Vendas', 'Total', 'Comissão'], Object.entries(bySel).map(([k, o]) => { const u = db.users.find(x => x.id === k); return [esc(u?.name || '—'), o.n, brl(o.t), brl(o.t * (u?.commission || 0) / 100) + ` <small>(${u?.commission || 0}%)</small>`]; }))}</div></div>
  <h3>Por produto</h3>${tbl(['Produto', 'Qtd.', 'Receita', 'Lucro'], Object.entries(byProd).sort((a, b) => b[1].r - a[1].r).map(([k, o]) => [esc(k), o.q, brl(o.r), brl(o.l)]))}
  <h3>Por dia</h3>${tbl(['Dia', 'Vendas', 'Total'], Object.entries(byDay).sort().reverse().map(([k, o]) => [fday(k), o.n, brl(o.t)]))}
  <p class="sub">Lucro por produto é calculado antes dos descontos da venda. O frete não entra no lucro.</p>`);
};

/* ========== Usuários ========== */
V.usuarios = () => {
  setActions('<button class="btn" onclick="A.editUser()">+ Novo usuário</button>');
  setMain(`<div class="tw"><table><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th class="r">Comissão</th><th></th></tr>
  ${db.users.map(u => `<tr><td><b>${esc(u.name)}</b>${u.id === cur.id ? ' <span class="tag">você</span>' : ''}</td><td>${esc(u.login)}</td><td>${u.role === 'admin' ? 'Administrador' : 'Vendedor'}</td><td class="r">${u.commission || 0}%</td>
  <td class="r"><button class="btn ghost sm" onclick="A.editUser('${u.id}')">Editar</button> ${u.id !== cur.id ? `<button class="btn bad sm" onclick="A.delUser('${u.id}')" aria-label="Excluir">✕</button>` : ''}</td></tr>`).join('')}</table></div>
  <p class="sub">O login protege o acesso na tela, mas os dados ficam no navegador deste computador. Não é segurança contra quem tem acesso técnico à máquina.</p>`);
};

/* ========== Catálogo online (admin) ========== */
function catalogHtml() {
  const s = db.settings;
  const data = { name: s.name || 'Loja', wa: s.wa || '', tagline: s.tagline || '', color: s.color || '#0071e3', products: db.products.map(p => ({ id: p.id, name: p.name, cat: p.category, desc: p.desc, price: p.price, stock: p.stock, imgs: p.imgs, feat: p.featured })) };
  return CATALOG_TPL.replace('__DATA__', () => JSON.stringify(data).replace(/</g, '\\u003c'));
}
V.catalogo = () => {
  const s = db.settings, withPhoto = db.products.filter(p => p.imgs.length).length;
  setMain(`<div class="grid2">
  <div class="card"><h3>1 · Dados da loja</h3><form id="catform" onsubmit="A.saveSettings(this);return false">
    <label>Nome da loja<input name="name" value="${esc(s.name)}" required></label>
    <label>Frase de destaque<input name="tagline" value="${esc(s.tagline)}" maxlength="90"></label>
    <div class="row"><label>WhatsApp que recebe os pedidos<input name="wa" value="${esc(s.wa)}" placeholder="5511999999999" inputmode="numeric"></label><label>Cor dos botões<input name="color" type="color" value="${esc(s.color)}" style="padding:2px;height:40px"></label></div>
    <p class="sub">WhatsApp com DDI e DDD, só números.</p>
    <label>Link do catálogo publicado (opcional, aparece no PDF)<input name="url" type="url" value="${esc(s.url)}" placeholder="https://..."></label>
    <label>Mensagem ao tocar num produto do PDF<textarea name="pdfmsg" rows="2">${esc(s.pdfmsg)}</textarea></label>
    <p class="sub">Use {produto}, {preco} e {loja}: o sistema troca pelo nome, preço e nome da loja.</p>
    <label>Instagram (@usuario ou link, aparece na capa do PDF)<input name="ig" value="${esc(s.ig)}" placeholder="@minhaloja"></label>
    <h4 style="margin:14px 0 6px">Capa do PDF</h4>
    <div class="row"><label>Fundo da capa<select name="cvMode" onchange="A.cvToggle(this.form)"><option value="cor" ${s.cvMode === 'cor' ? 'selected' : ''}>Cor sólida</option><option value="foto" ${s.cvMode === 'foto' ? 'selected' : ''}>Foto com transparência</option></select></label><label>Cor da capa<input name="cvColor" type="color" value="${esc(s.cvColor)}" style="padding:2px;height:40px"></label></div>
    <div id="cvfoto" ${s.cvMode === 'foto' ? '' : 'hidden'}>
      <label>Foto de fundo<input type="file" accept="image/*" onchange="A.cvPhoto(this)"></label>
      ${s.cvImg ? `<div class="cvprev" style="background:${esc(s.cvColor)}"><img src="${esc(s.cvImg)}" style="opacity:${s.cvOp / 100}" alt=""></div><button type="button" class="btn ghost sm" onclick="A.cvPhotoRm()">Remover foto</button>` : '<p class="sub">Nenhuma foto escolhida.</p>'}
      <label>Intensidade da foto: <b id="cvopv">${s.cvOp}%</b><input name="cvOp" type="range" min="10" max="100" step="5" value="${s.cvOp}" oninput="A.cvOpac(this)"></label>
      <p class="sub">Quanto menor, mais a cor aparece por cima da foto.</p></div>
    <button class="btn">Salvar</button></form>
    <p class="sub" style="margin-top:10px">${db.products.length} produto(s), ${withPhoto} com foto. Adicione fotos e descrição em Produtos e estoque.</p></div>
  <div class="card"><h3>2 · Publicar o catálogo</h3>
    <p>Escolha o formato: o <b>HTML</b> é a loja com sacola, para publicar num link. O <b>PDF</b> é uma vitrine para enviar direto no WhatsApp ou imprimir (só produtos disponíveis, sem sacola).</p>
    <div class="toolbar"><button class="btn ghost" onclick="A.previewCatalog()">Visualizar</button><button class="btn" onclick="A.downloadCatalog()">Baixar HTML</button><button class="btn" onclick="A.pdfCatalog()">Baixar PDF</button></div>
    <ol class="sub" style="padding-left:18px;margin:8px 0 0"><li>Baixe o arquivo.</li><li>Publique de graça: arraste o arquivo em <b>app.netlify.com/drop</b> (ou GitHub Pages / Cloudflare Pages).</li><li>Mande o link pelo WhatsApp e ponha na bio do Instagram.</li><li>Mudou preço ou estoque? Baixe e publique de novo.</li></ol></div></div>
  <div class="card" style="margin-top:12px"><h3>3 · Receber o pedido do WhatsApp</h3>
    <p class="sub">O cliente monta a sacola e o pedido chega no seu WhatsApp. Copie a mensagem e cole aqui: o sistema cria o pedido pendente, com cliente e entrega. Depois confirme em Vendas e pedidos.</p>
    <textarea id="wamsg" rows="6" placeholder="Cole aqui a mensagem do pedido..."></textarea>
    <div class="btns" style="align-items:end"><label style="margin:0;width:160px">Frete (R$)<input id="wafrete" type="number" min="0" step="0.01" placeholder="0,00"></label><button class="btn" onclick="A.importWa()">Importar pedido</button></div></div>`);
};

/* ========== Ações ========== */
const toItems = c => c.map(i => { const p = prod(i.pid); return { pid: p.id, name: p.name, price: p.price, cost: p.cost, qty: i.qty }; });
function bump(c, pid, d, refresh) {
  const i = c.find(x => x.pid === pid), p = prod(pid);
  if (!i) { if (p.stock > 0) c.push({ pid, qty: 1 }); }
  else { const n = i.qty + d; if (n <= 0) c.splice(c.indexOf(i), 1); else if (n > p.stock) toast(`Só há ${p.stock} em estoque`); else i.qty = n; }
  refresh();
}
const A = {
  addCart: id => bump(cart, id, 1, pdvCart),
  qty: (id, d) => bump(cart, id, d, pdvCart),
  clearCart: () => { cart = []; pdvPct = 0; pdvShip = 0; V.pdv(); },
  checkout() {
    if (!cart.length) return toast('Carrinho vazio');
    const method = $('#pmethod').value, clientId = $('#pclient').value, firstDue = $('#pdue').value;
    if (method === FIADO && (!clientId || !firstDue)) return toast('No fiado, escolha o cliente e o 1º vencimento');
    let received = 0, change = 0;
    if (method === 'Dinheiro') {
      const rec = parseFloat($('#prec').value) || 0, total = pdvTotal();
      if (rec > 0 && r2(rec) < total) return toast(`Valor recebido menor que o total (faltam ${brl(total - rec)})`);
      if (rec > 0) { received = r2(rec); change = r2(rec - total); }
    }
    const s = makeSale({ items: toItems(cart), discount: pdvDisc(), discountPct: pdvPct, shipping: pdvShip, method, clientId, channel: 'loja', status: 'concluída', installments: parseInt($('#pinst').value) || 1, firstDue, received, change });
    cart = []; pdvPct = 0; pdvShip = 0; V.pdv(); A.viewSale(s.id, 'Venda concluída');
  },
  viewSale(id, title) {
    const s = db.sales.find(x => x.id === id), rec = db.receivables.filter(r => r.saleId === id);
    openModal(title || `Venda #${s.num}`, `${s.note ? `<p class="fiado"><b>Entrega / observações</b><br>${esc(s.note)}</p>` : ''}<p>${fdate(s.date)} · ${s.channel} · ${esc(s.method)}<br>Cliente: ${esc(client(s.clientId)?.name || '—')}<br>Vendedor: ${esc(db.users.find(u => u.id === s.sellerId)?.name || '—')}</p>
    ${s.items.map(i => `<div class="line"><span class="n">${i.qty}× ${esc(i.name)}</span><b>${brl(i.price * i.qty)}</b></div>`).join('')}
    ${s.discount ? `<div class="line"><span class="n">Desconto${s.discountPct ? ` (${s.discountPct}%)` : ''}</span><b>− ${brl(s.discount)}</b></div>` : ''}${s.shipping ? `<div class="line"><span class="n">Frete</span><b>${brl(s.shipping)}</b></div>` : ''}<div class="tot"><span>Total</span><span>${brl(s.total)}</span></div>
    ${s.received ? `<div class="line"><span class="n">Valor recebido</span><b>${brl(s.received)}</b></div><div class="tot change"><span>Troco</span><span>${brl(s.change)}</span></div>` : ''}
    ${rec.length ? '<p class="sub">Parcelas</p>' + rec.map(r => `<div class="line"><span class="n">${r.num}/${r.of} · vence ${fday(r.due)}</span><b>${brl(r.amount)}</b><span class="tag ${r.paid ? 'ok' : isLate(r) ? 'bad' : 'warn'}">${r.paid ? 'paga' : isLate(r) ? 'atrasada' : 'aberta'}</span></div>`).join('') : ''}
    <button type="button" class="btn ghost" onclick="A.printSale('${id}')">Imprimir recibo</button>`);
  },
  printSale(id) {
    const s = db.sales.find(x => x.id === id), rec = db.receivables.filter(r => r.saleId === id);
    $('#receipt').innerHTML = `<h2>RECIBO DE VENDA</h2><div class="c">Nº ${s.num} · ${fdate(s.date)}</div><hr>
      ${s.items.map(i => `<div class="l"><span>${i.qty}× ${esc(i.name)}</span><span>${brl(i.price * i.qty)}</span></div>`).join('')}<hr>
      ${s.discount || s.shipping ? `<div class="l"><span>Subtotal</span><span>${brl(s.subtotal)}</span></div>` : ''}${s.discount ? `<div class="l"><span>Desconto${s.discountPct ? ` (${s.discountPct}%)` : ''}</span><span>− ${brl(s.discount)}</span></div>` : ''}${s.shipping ? `<div class="l"><span>Frete</span><span>${brl(s.shipping)}</span></div>` : ''}
      <div class="l"><b>TOTAL</b><b>${brl(s.total)}</b></div><div class="l"><span>Pagamento</span><span>${esc(s.method)}</span></div>
      ${s.received ? `<div class="l"><span>Valor recebido</span><span>${brl(s.received)}</span></div><div class="l"><b>TROCO</b><b>${brl(s.change)}</b></div>` : ''}
      <div class="l"><span>Cliente</span><span>${esc(client(s.clientId)?.name || 'Consumidor')}</span></div>
      <div class="l"><span>Vendedor</span><span>${esc(db.users.find(u => u.id === s.sellerId)?.name || '—')}</span></div>
      ${rec.length ? '<hr>' + rec.map(r => `<div class="l"><span>Parcela ${r.num}/${r.of} · ${fday(r.due)}</span><span>${brl(r.amount)}</span></div>`).join('') : ''}
      <hr><div class="c">Obrigado pela preferência!</div>`;
    window.print();
  },
  confirmSale(id) {
    const s = db.sales.find(x => x.id === id);
    const bad = s.items.find(i => (prod(i.pid)?.stock ?? 0) < i.qty);
    if (bad) return toast(`Estoque insuficiente de "${bad.name}"`);
    s.items.forEach(i => { prod(i.pid).stock -= i.qty; }); s.status = 'concluída'; save(); V.vendas(); toast('Pedido confirmado e estoque baixado');
  },
  cancelSale(id) {
    const s = db.sales.find(x => x.id === id);
    const paid = db.receivables.filter(r => r.saleId === id && r.paid).length;
    if (!confirmDel(`Cancelar a venda #${s.num}?` + (s.status === 'concluída' ? ' O estoque será devolvido.' : '') + (paid ? ` Atenção: ${paid} parcela(s) já paga(s) — devolva o valor ao cliente.` : ''))) return;
    if (s.status === 'concluída') s.items.forEach(i => { const p = prod(i.pid); if (p) p.stock += i.qty; });
    db.receivables = db.receivables.filter(r => r.saleId !== id);
    s.status = 'cancelada'; save(); V.vendas();
  },
  csv() {
    const rows = [['Nº', 'Data', 'Cliente', 'Canal', 'Pagamento', 'Status', 'Itens', 'Desconto', 'Frete', 'Total']];
    db.sales.forEach(s => rows.push([s.num, fdate(s.date), client(s.clientId)?.name || '', s.channel, s.method, s.status, s.items.map(i => `${i.qty}x ${i.name}`).join('; '), s.discount.toFixed(2), (s.shipping || 0).toFixed(2), s.total.toFixed(2)]));
    download('vendas.csv', '\ufeff' + toCsv(rows), 'text/csv');
  },
  csvProd() {
    const rows = [['Produto', 'Qtd', 'Receita', 'Lucro'], ...(window.__prodRows || []).map(([k, o]) => [k, o.q, o.r.toFixed(2), o.l.toFixed(2)])];
    const [f, t] = repRange(); download(`produtos-${f}-a-${t}.csv`, '\ufeff' + toCsv(rows), 'text/csv');
  },
  editProd(id) {
    const p = id ? prod(id) : { name: '', sku: '', category: db.categories[0] || '', desc: '', price: 0, cost: 0, stock: 0, min: 5 };
    const mk = markup(p) ?? 0, mg = margin(p) ?? 0;
    openModal(id ? 'Editar produto' : 'Novo produto', `
      <label>Nome<input name="name" value="${esc(p.name)}" required></label>
      <div class="row"><label>Código<input name="sku" value="${esc(p.sku)}"></label>
      <label>Categoria<select name="category">${catOptions(p.category, 'Sem categoria')}<option value="__new">+ Nova categoria…</option></select></label></div>
      <label id="ncw" hidden>Nome da nova categoria<input name="newcat" maxlength="40"></label>
      <label>Descrição (aparece no catálogo)<textarea name="desc" rows="2">${esc(p.desc)}</textarea></label>
      <div class="row"><label>Custo (R$)<input name="cost" type="number" step="any" min="0" value="${p.cost || ''}"></label><label>Preço de venda (R$)<input name="price" type="number" step="any" min="0" value="${p.price || ''}" required></label></div>
      <div class="row"><label>Markup (%)<input name="markup" type="number" step="any" min="0" value="${p.cost > 0 ? r2(mk) : ''}"></label><label>Margem de lucro (%)<input name="margin" type="number" step="any" min="0" max="100" value="${p.price > 0 ? r2(mg) : ''}"></label></div>
      <p class="sub calc">Lucro por unidade: <b id="profit">${brl(p.price - p.cost)}</b> · Markup é o lucro sobre o <b>custo</b>; margem é o lucro sobre o <b>preço</b>. Edite qualquer um dos três e os outros se ajustam.</p>
      <label class="chk-l"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}> Produto em destaque (aparece primeiro no catálogo e em página própria no PDF)</label>
      <div class="row"><label>Estoque<input name="stock" type="number" step="1" value="${p.stock}"></label><label>Estoque mínimo<input name="min" type="number" step="1" min="0" value="${p.min}"></label></div>`, fd => {
      let cat = fd.get('category'); if (cat === '__new') cat = (fd.get('newcat') || '').trim();
      const price = parseFloat(fd.get('price')) || 0; if (price <= 0) { toast('Informe o preço de venda'); return false; }
      const o = { name: fd.get('name').trim(), sku: fd.get('sku').trim(), category: cat, desc: fd.get('desc').trim(), featured: fd.get('featured') === 'on', cost: parseFloat(fd.get('cost')) || 0, price, stock: parseInt(fd.get('stock')) || 0, min: parseInt(fd.get('min')) || 0 };
      ensureCat(cat); if (id) Object.assign(p, o); else db.products.push({ id: uid(), imgs: [], ...o }); save(); V.produtos();
    });
    const F = $('#mform'); let last = 'price';
    const num = n => parseFloat(F[n].value) || 0, set = (n, v) => { F[n].value = isFinite(v) ? String(r2(v)) : ''; };
    const upd = src => {
      const c = num('cost');
      if (src === 'markup') set('price', c * (1 + num('markup') / 100));
      else if (src === 'margin') set('price', c / (1 - Math.min(num('margin'), 99.9) / 100));
      else if (src === 'cost' && last === 'markup') set('price', c * (1 + num('markup') / 100));
      else if (src === 'cost' && last === 'margin') set('price', c / (1 - Math.min(num('margin'), 99.9) / 100));
      const pr = num('price');
      if (src !== 'markup') set('markup', c > 0 ? (pr - c) / c * 100 : 0);
      if (src !== 'margin') set('margin', pr > 0 ? (pr - c) / pr * 100 : 0);
      $('#profit').textContent = brl(pr - c);
    };
    ['cost', 'price', 'markup', 'margin'].forEach(n => F[n].addEventListener('input', () => { if (n !== 'cost') last = n; upd(n); }));
    F.category.onchange = () => { $('#ncw').hidden = F.category.value !== '__new'; };
  },
  photo: id => photoModal(id),
  adjStock(id) {
    const p = prod(id);
    openModal(`Ajustar estoque — ${p.name}`, `<p>Estoque atual: <b>${p.stock}</b></p><label>Quantidade a somar (use negativo para retirar)<input name="d" type="number" step="1" required></label>`, fd => { p.stock += parseInt(fd.get('d')) || 0; save(); V.produtos(); });
  },
  delProd(id) { if (confirmDel('Excluir este produto? As vendas antigas continuam no histórico.')) { db.products = db.products.filter(p => p.id !== id); cart = cart.filter(i => i.pid !== id); save(); V.produtos(); } },
  editClient(id) {
    const c = id ? client(id) : {};
    formModal(id ? 'Editar cliente' : 'Novo cliente', CF, c, o => { if (id) Object.assign(c, o); else db.clients.push({ id: uid(), ...o }); save(); V.clientes(); });
  },
  delClient(id) { if (confirmDel('Excluir este cliente?')) { db.clients = db.clients.filter(c => c.id !== id); save(); V.clientes(); } },
  editLead(id) {
    const l = id ? db.leads.find(x => x.id === id) : { stage: 'Novo' };
    formModal(id ? 'Editar lead' : 'Novo lead', LF(), l, o => { if (id) Object.assign(l, o); else db.leads.push({ id: uid(), ...o }); save(); V.funil(); });
    if (id) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn bad'; b.textContent = 'Excluir';
      b.onclick = () => { if (confirmDel('Excluir este lead?')) { db.leads = db.leads.filter(x => x.id !== id); save(); $('#modal').close(); V.funil(); } };
      $('#mform .btns').prepend(b);
    }
  },
  dropLead(e, st) {
    e.preventDefault(); const l = db.leads.find(x => x.id === e.dataTransfer.getData('text/plain'));
    if (l) { l.stage = st; save(); V.funil(); if (st === 'Ganho') toast('Negócio ganho!'); }
  },
  pay(id) {
    const r = db.receivables.find(x => x.id === id);
    openModal('Receber parcela', `<p>${esc(client(r.clientId)?.name || '')} · parcela ${r.num}/${r.of} · <b>${brl(r.amount)}</b></p><label>Forma de recebimento<select name="m">${ONLINE_METHODS.map(m => `<option>${m}</option>`).join('')}</select></label>`,
      fd => { r.paid = true; r.paidAt = dkey(new Date()); r.paidMethod = fd.get('m'); save(); V.receber(); toast('Parcela recebida'); }, 'Confirmar recebimento');
  },
  unpay(id) { if (!confirmDel('Estornar este recebimento?')) return; const r = db.receivables.find(x => x.id === id); r.paid = false; r.paidAt = ''; r.paidMethod = ''; save(); V.receber(); },
  cvToggle(f) { document.getElementById('cvfoto').hidden = f.cvMode.value !== 'foto'; },
  cvOpac(el) { document.getElementById('cvopv').textContent = el.value + '%'; const i = document.querySelector('.cvprev img'); if (i) i.style.opacity = el.value / 100; },
  async cvPhoto(inp) {
    const f = inp.files[0]; if (!f) return; A.syncForm();
    try { db.settings.cvImg = await shrink(f, 1400); db.settings.cvMode = 'foto'; save(); V.catalogo(); } catch (e) { toast('Não consegui ler essa imagem'); }
  },
  cvPhotoRm() { A.syncForm(); db.settings.cvImg = ''; save(); V.catalogo(); },
  syncForm() { const f = document.querySelector('#catform'); if (f) A.saveSettings(f, true); },
  saveSettings(f, quiet) {
    db.settings.pdfmsg = f.pdfmsg.value.trim() || DEF_PDFMSG; db.settings.url = f.url.value.trim(); db.settings.name = f.name.value.trim() || 'Minha loja'; db.settings.tagline = f.tagline.value.trim(); db.settings.wa = f.wa.value.replace(/\D/g, ''); db.settings.color = f.color.value; db.settings.ig = f.ig.value.trim(); db.settings.cvMode = f.cvMode.value; db.settings.cvColor = f.cvColor.value; db.settings.cvOp = +f.cvOp.value || 40; save(); if (!quiet) toast('Dados da loja salvos');
  },
  downloadCatalog() { A.syncForm(); if (!db.settings.wa) toast('Dica: configure o WhatsApp antes de publicar'); download('catalogo.html', catalogHtml(), 'text/html'); },
  pdfCatalog() {
    A.syncForm();
    const s = db.settings, items = db.products.filter(p => p.stock > 0);
    if (!items.length) return toast('Nenhum produto disponível para o PDF');
    const color = /^#[0-9a-f]{6}$/i.test(s.color) ? s.color : '#0071e3', n = parseInt(color.slice(1), 16);
    const light = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 150, txt = light ? '#111' : '#fff', ink = light ? '#1d1d1f' : color;
    const cvc = /^#[0-9a-f]{6}$/i.test(s.cvColor) ? s.cvColor : color, cn = parseInt(cvc.slice(1), 16), cphoto = s.cvMode === 'foto' && s.cvImg, clight = (0.299 * (cn >> 16) + 0.587 * ((cn >> 8) & 255) + 0.114 * (cn & 255)) > 150, ctxt = clight ? '#111' : '#fff';
    const igUser = (s.ig || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0].replace(/[^\w.]/g, ''), igLink = igUser ? 'https://instagram.com/' + igUser : '';
    const urlLink = /^https?:\/\//i.test(s.url || '') ? s.url : (s.url ? 'https://' + s.url : '');
    const digits = s.wa || '', wa = digits.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
    const msg = p => (s.pdfmsg || DEF_PDFMSG).replace(/\{produto\}/g, p.name).replace(/\{preco\}/g, brl(p.price)).replace(/\{loja\}/g, s.name);
    const link = p => digits ? 'https://wa.me/' + digits + '?text=' + encodeURIComponent(msg(p)) : '';
    const wrap = (p, cls, inner) => { const h = link(p); return h ? `<a class="${cls}" href="${esc(h)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="${cls}">${inner}</div>`; };
    const pic = p => `<div class="im">${p.imgs[0] ? `<img src="${esc(p.imgs[0])}" alt="">` : `<span>${esc(p.name.charAt(0))}</span>`}${p.featured ? '<i class="st">★ Destaque</i>' : ''}</div>`;
    const small = p => wrap(p, 'p', `${pic(p)}<div class="b"><h3>${esc(p.name)}</h3>${p.desc ? `<p class="d">${esc(p.desc)}</p>` : ''}<div class="pr">${brl(p.price)}</div>${digits ? '<div class="cta">Pedir no WhatsApp &rsaquo;</div>' : ''}</div>`);
    const big = p => wrap(p, 'f', `${pic(p)}<div class="b"><h3>${esc(p.name)}</h3>${p.desc ? `<p class="d">${esc(p.desc)}</p>` : ''}<div class="pr">${brl(p.price)}</div>${digits ? '<div class="btn">Pedir no WhatsApp &rsaquo;</div>' : ''}</div>`);
    const feats = items.filter(p => p.featured).slice(0, 6);
    const groups = {}; items.forEach(p => (groups[p.category || 'Outros'] ||= []).push(p));
    const order = [...new Set([...db.categories, ...Object.keys(groups)])].filter(c => groups[c]);
    const month = cap(new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
    const css = String(s.name).replace(/["\\\n\r]/g, ' ');
    const hello = digits ? 'https://wa.me/' + digits + '?text=' + encodeURIComponent(`Olá! Vi o catálogo da ${s.name} e gostaria de mais informações.`) : '';
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Catálogo - ${esc(s.name)}</title><style>
@page{size:A4;margin:14mm 12mm 18mm;@bottom-left{content:"${css}";font:9px Arial,sans-serif;color:#8e8e93}@bottom-right{content:"Página " counter(page);font:9px Arial,sans-serif;color:#8e8e93}}
@page :first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#e5e5ea;font:12px/1.45 "Segoe UI",Arial,sans-serif;color:#1d1d1f}
a{color:inherit;text-decoration:none}
.bar{position:sticky;top:0;z-index:5;background:#fff8d6;border-bottom:1px solid #e6d98a;padding:10px 16px;font-size:13px;display:flex;gap:12px;align-items:center;justify-content:space-between}
.bar button{border:0;background:#1d1d1f;color:#fff;border-radius:8px;padding:8px 14px;font:inherit;cursor:pointer;white-space:nowrap}
.doc{width:210mm;margin:14px auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.15)}
.cover{height:296.5mm;position:relative;background:${cvc};color:${ctxt};padding:30mm 22mm 24mm;display:flex;flex-direction:column;justify-content:space-between;break-after:page;page-break-after:always;overflow:hidden}
.cover>*{position:relative;z-index:1}
.cover>.bg{position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:cover;opacity:${(s.cvOp ?? 40) / 100}}
.cover a.l{text-decoration:underline;text-underline-offset:2px}
.cover .k{margin:0 0 10mm;font-size:13px;letter-spacing:.18em;text-transform:uppercase;opacity:.85}
.cover h1{margin:0;font-size:58px;line-height:1.02;letter-spacing:-.03em;font-weight:700}
.cover .tg{margin:8mm 0 0;font-size:20px;line-height:1.35;max-width:130mm;opacity:.92}
.cover .ct{font-size:13px;line-height:1.9}
.cover .ct b{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.8;font-weight:600}
.cover .bts{display:flex;flex-wrap:wrap;gap:10px;margin:6mm 0 5mm}
.cover .wb svg{width:18px;height:18px;vertical-align:-4px;margin-right:8px;fill:currentColor}
.cover .wb{display:inline-block;margin:0;background:${clight ? '#111' : '#fff'};color:${clight ? '#fff' : '#111'};padding:12px 22px;border-radius:99px;font-size:14px;font-weight:600}
.cover .hint{font-size:11px;opacity:.8}
.body{padding:14mm 12mm 16mm}
.sec{display:flex;align-items:baseline;justify-content:space-between;margin:0 0 5mm;padding:0 0 2.5mm;border-bottom:2px solid ${ink};font-size:19px;letter-spacing:-.01em;break-after:avoid;page-break-after:avoid}
.sec small{font-size:11px;color:#6e6e73;font-weight:400}
.feat{break-after:page;page-break-after:always;margin-bottom:8mm}
.cat{margin-bottom:9mm}
.g,.fg{font-size:0}
.p,.f{display:inline-block;vertical-align:top;background:#fff;border:1px solid #e3e3e8;border-radius:11px;overflow:hidden;font-size:12px;break-inside:avoid;page-break-inside:avoid}
.p{width:calc((100% - 12mm)/3);margin:0 6mm 6mm 0}
.p:nth-child(3n){margin-right:0}
.f{width:calc((100% - 8mm)/2);margin:0 8mm 8mm 0}
.f:nth-child(2n){margin-right:0}
.im{position:relative;width:100%;aspect-ratio:1;background:#f5f5f7;display:flex;align-items:center;justify-content:center;font-size:40px;color:#c7c7cc}
.f .im{aspect-ratio:4/3}
.im img{width:100%;height:100%;object-fit:contain;padding:8px}
.st{position:absolute;top:7px;left:7px;font-style:normal;font-size:9.5px;font-weight:700;background:${ink};color:${ink === color ? txt : '#fff'};padding:3px 8px;border-radius:99px}
.b{padding:9px 11px 12px}
.b h3{margin:0;font-size:13px;line-height:1.3}
.f .b h3{font-size:17px}
.d{margin:3px 0 0;color:#6e6e73;font-size:10.5px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.f .d{font-size:12px;-webkit-line-clamp:5}
.pr{margin-top:7px;font-weight:700;font-size:15px;color:${ink}}
.f .pr{font-size:22px;margin-top:9px}
.cta{margin-top:5px;font-size:10px;color:#1a9d4a;font-weight:600}
.btn{margin-top:10px;display:inline-block;background:#1a9d4a;color:#fff;padding:8px 16px;border-radius:99px;font-size:12px;font-weight:600}
.ft{margin-top:6mm;padding-top:4mm;border-top:1px solid #e3e3e8;font-size:10.5px;color:#6e6e73;text-align:center;break-inside:avoid}
@media print{body{background:#fff}.bar{display:none}.doc{width:auto;margin:0;box-shadow:none}.body{padding:0}}
</style></head><body>
<div class="bar"><span>Na janela de impressão, escolha <b>Salvar como PDF</b> como destino.${digits ? ' Os produtos viram links para o seu WhatsApp.' : ''}</span><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
<div class="doc">
<section class="cover">${cphoto ? `<img class="bg" src="${esc(s.cvImg)}" alt="">` : ''}<div><p class="k">Catálogo · ${esc(month)}</p><h1>${esc(s.name)}</h1>${s.tagline ? `<p class="tg">${esc(s.tagline)}</p>` : ''}</div>
<div class="ct">${wa ? `<b>WhatsApp</b>${esc(wa)}<br>` : ''}${urlLink ? `<b>Loja online</b><a class="l" href="${esc(urlLink)}" target="_blank" rel="noopener">${esc(s.url)}</a><br>` : ''}${hello || igLink ? `<div class="bts">${hello ? `<a class="wb wa" href="${esc(hello)}" target="_blank" rel="noopener">${ICO_WA}Falar no WhatsApp</a>` : ''}${igLink ? `<a class="wb ig" href="${esc(igLink)}" target="_blank" rel="noopener">${ICO_IG}@${esc(igUser)}</a>` : ''}</div>` : ''}${digits ? '<span class="hint">Toque em qualquer produto para pedir pelo WhatsApp.</span>' : ''}</div></section>
<div class="body">
${feats.length ? `<section class="feat"><h2 class="sec"><span>★ Destaques</span><small>${feats.length} ${feats.length === 1 ? 'produto' : 'produtos'}</small></h2><div class="fg">${feats.map(big).join('')}</div></section>` : ''}
${order.map(c => `<section class="cat"><h2 class="sec"><span>${esc(c)}</span><small>${groups[c].length} ${groups[c].length === 1 ? 'produto' : 'produtos'}</small></h2><div class="g">${groups[c].map(small).join('')}</div></section>`).join('')}
<div class="ft">Preços e disponibilidade em ${new Date().toLocaleDateString('pt-BR')}, sujeitos a alteração.${wa ? ` Peça pelo WhatsApp ${esc(wa)}.` : ''}</div></div></div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},600)})</script></body></html>`;
    const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
    if (!w) toast('O navegador bloqueou a janela. Permita pop-ups para este site e tente de novo.');
  },
  previewCatalog() { A.syncForm(); window.open(URL.createObjectURL(new Blob([catalogHtml()], { type: 'text/html' })), '_blank'); },
  importWa() {
    const t = $('#wamsg').value, m = t.match(/\[\[PED ([^\]]+)\]\]/);
    if (!m) return toast('Mensagem não reconhecida: cole o pedido completo, com a linha [[PED ...]]');
    const get = r => (t.match(r)?.[1] || '').trim();
    const items = [], lost = [];
    m[1].split(',').forEach(x => { const [id, q] = x.split(':'), p = prod(id), qty = parseInt(q) || 0; if (p && qty > 0) items.push({ pid: p.id, name: p.name, price: p.price, cost: p.cost, qty }); else lost.push(id); });
    if (!items.length) return toast('Nenhum produto da mensagem existe mais no sistema');
    const name = get(/Cliente:\s*(.+)/) || 'Cliente online', phone = get(/Telefone:\s*(.+)/), addr = get(/Endere[cç]o:\s*(.+)/), obs = get(/Obs:\s*(.+)/);
    let pay = get(/Pagamento:\s*(.+)/); if (!ONLINE_METHODS.includes(pay)) pay = 'Pix';
    let c = phone && db.clients.find(x => x.phone === phone);
    if (!c) { c = { id: uid(), name, phone, email: '', notes: addr }; db.clients.push(c); }
    const note = [addr && 'Entrega: ' + addr, obs && 'Obs: ' + obs].filter(Boolean).join(' · ');
    const s = makeSale({ items, shipping: parseFloat($('#wafrete').value) || 0, method: pay, clientId: c.id, channel: 'online', status: 'pendente', note });
    $('#wamsg').value = ''; $('#wafrete').value = ''; toast(`Pedido #${s.num} importado` + (lost.length ? ` (${lost.length} item(ns) não encontrado(s))` : ''));
  },
  logout() { sessSet(null); cur = null; showLogin(); },
  myPassword(force) {
    openModal(force ? 'Defina uma nova senha' : 'Alterar minha senha', fieldsHtml([{ k: 'p1', label: 'Nova senha (mín. 4 caracteres)', type: 'password', req: 1 }, { k: 'p2', label: 'Repita a nova senha', type: 'password', req: 1 }]), fd => {
      const p1 = fd.get('p1'); if (p1.length < 4) { toast('Senha muito curta'); return false; } if (p1 !== fd.get('p2')) { toast('As senhas não conferem'); return false; }
      hashPw(p1).then(h => { cur.pass = h; cur.mustChange = false; save(); toast('Senha alterada'); });
    });
  },
  editUser(id) {
    const u = id ? db.users.find(x => x.id === id) : { role: 'vendedor', commission: 0 };
    const F = [{ k: 'name', label: 'Nome', req: 1 }, { k: 'login', label: 'Usuário (login)', req: 1, half: 1 }, { k: 'role', label: 'Perfil', type: 'select', opts: [['vendedor', 'Vendedor'], ['admin', 'Administrador']], half: 1 }, { k: 'commission', label: 'Comissão (%)', type: 'number', half: 1 }, { k: 'newpass', label: id ? 'Nova senha (vazio = manter)' : 'Senha', type: 'password', req: !id, half: 1 }];
    formModal(id ? 'Editar usuário' : 'Novo usuário', F, u, o => {
      if (db.users.some(x => x.id !== id && x.login.toLowerCase() === o.login.toLowerCase())) { toast('Esse usuário já existe'); return false; }
      if (id && u.role === 'admin' && o.role !== 'admin' && db.users.filter(x => x.role === 'admin').length < 2) { toast('Precisa existir pelo menos um administrador'); return false; }
      if (o.newpass && o.newpass.length < 4) { toast('Senha muito curta'); return false; }
      const apply = h => { const d = { name: o.name, login: o.login, role: o.role, commission: o.commission }; if (h) { d.pass = h; d.mustChange = false; } if (id) Object.assign(u, d); else db.users.push({ id: uid(), ...d }); save(); V.usuarios(); };
      o.newpass ? hashPw(o.newpass).then(apply) : apply();
    });
  },
  delUser(id) {
    const u = db.users.find(x => x.id === id);
    if (u.role === 'admin' && db.users.filter(x => x.role === 'admin').length < 2) return toast('Precisa existir pelo menos um administrador');
    if (confirmDel(`Excluir o usuário "${u.name}"? As vendas dele continuam no histórico.`)) { db.users = db.users.filter(x => x.id !== id); save(); V.usuarios(); }
  },
  backup() { download(`backup-vendas-${dkey(new Date())}.json`, JSON.stringify(db), 'application/json'); },
  restore() { $('#file').click(); },
  reset() {
    if (!confirmDel('Apagar TODOS os dados? Isso não pode ser desfeito. (Faça um backup antes.)')) return;
    db = normalize({ seq: 0, products: [], clients: [], leads: [], sales: [], receivables: [], users: db.users, categories: [], settings: db.settings }); cart = []; save(); render();
  }
};
const toCsv = rows => rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#file').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  f.text().then(async t => { const d = JSON.parse(t); if (!d.products || !d.sales) throw 0; db = normalize(d); await ensureUsers(); cur = db.users.find(u => u.id === cur.id) || db.users[0]; save(); enter(cur); toast('Backup restaurado'); }).catch(() => toast('Arquivo de backup inválido')); e.target.value = '';
};
(async function boot() {
  await ensureUsers();
  const u = db.users.find(x => x.id === sessGet());
  u ? enter(u) : showLogin();
})();
A.cash = v => { const t = pdvTotal(); $('#prec').value = v === 0 ? (t ? String(t) : '') : String(v); cashCalc(); };
