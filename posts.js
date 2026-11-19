'use strict';
/* posts.js — gerador de posts para redes sociais.
   Escolhe um produto cadastrado, cria um gancho de venda (sempre variando) e desenha a imagem
   num canvas, pronta para baixar ou compartilhar, com legenda e hashtags.
   Só usa dados reais do sistema: escassez só aparece com estoque baixo e "já saíram N" só com vendas reais. */
(function () {
  const FORMATS = { feed: { w: 1080, h: 1350, n: 'Feed (4:5)' }, quad: { w: 1080, h: 1080, n: 'Quadrado (1:1)' }, story: { w: 1080, h: 1920, n: 'Story / Reels (9:16)' } };
  const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const lum = hex => { const n = parseInt(hex.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
  const ink = hex => lum(hex) > 150 ? '#111418' : '#ffffff';
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16), t = f < 0 ? 0 : 255, k = Math.abs(f);
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(x => Math.round((t - x) * k + x).toString(16).padStart(2, '0')).join('');
  };
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const lj = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1];
  const brandColor = () => /^#[0-9a-f]{6}$/i.test(db.settings.color) ? db.settings.color : '#0071e3';

  /* ---------- dados do produto ---------- */
  function ctxOf(p) {
    const st = db.settings, av = (p.variants || []).filter(v => v.stock > 0), uniq = k => [...new Set(av.map(v => v[k]).filter(Boolean))];
    const sold = db.sales.filter(s => s.status === 'concluída').reduce((n, s) => n + s.items.filter(i => i.pid === p.id).reduce((m, i) => m + i.qty, 0), 0);
    const sp = salePrice(p);
    return { id: p.id, name: p.name, price: sp, pt: brl(sp), old: p.discount > 0 ? brl(p.price) : '', off: p.discount || 0, sizes: uniq('size'), colors: uniq('color'), stock: p.stock, sold, cat: p.category || '', desc: p.desc || '', store: st.name || 'Minha loja' };
  }

  /* ---------- destaques do modelo "Destaques com setas" ----------
     Prioridade: frases do produto > desconto > últimas unidades > parcelamento > descrição > tamanhos > cores > frases da loja. */
  const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'G1', 'G2', 'G3', 'EG', 'EGG'];
  function sizeNote(sizes) {
    const up = sizes.map(s => String(s).trim().toUpperCase()), nums = up.map(Number);
    if (up.length >= 3 && nums.every(n => n > 0)) { const s = [...nums].sort((a, b) => a - b); return `do ${s[0]} ao ${s[s.length - 1]}`; }
    const idx = up.map(s => SIZE_ORDER.indexOf(s));
    if (up.length >= 3 && idx.every(i => i >= 0)) { const s = [...idx].sort((a, b) => a - b); return `do ${SIZE_ORDER[s[0]]} ao ${SIZE_ORDER[s[s.length - 1]]}`; }
    return up.length ? 'tamanhos ' + up.join(' · ') : '';
  }
  function noteList(p, c, o) {
    const st = db.settings, out = [], add = t => { t = String(t || '').trim(); if (t && out.length < 2 && !out.includes(t)) out.push(t); };
    String(p.hl || '').split(/\n+/).map(x => x.trim()).filter(Boolean).slice(0, 2).forEach(add);
    if (c.off) add(`${c.off}% de desconto`);
    if (c.stock >= 1 && c.stock <= 5) add(c.stock === 1 ? 'última unidade' : `últimas ${c.stock} unidades`);
    const n = Math.min(12, parseInt(st.parc) || 0); if (n >= 2 && c.price / n >= 5) add(`${n}x de ${brl(c.price / n)} sem juros`);
    (p.desc || '').split(/[.\n;]+/).map(x => x.trim()).filter(x => x.length > 2 && x.length < 34).slice(0, 2).forEach(x => add(x.toLowerCase()));
    if (c.sizes.length) add(sizeNote(c.sizes));
    if (c.colors.length > 1) add(c.colors.length <= 3 ? c.colors.join(' · ').toLowerCase() : `${c.colors.length} cores`);
    const fr = String(st.frases || '').split(/\n+/).map(x => x.trim()).filter(Boolean); if (fr.length) add(pick(fr).toLowerCase());
    if (!out.length || out.length < 2) add(o.hook.head.length < 34 ? o.hook.head.toLowerCase().replace(/[.!]$/, '') : c.pt);
    return out;
  }

  /* ---------- ganchos de venda ----------
     Cada ângulo tem uma condição (ok), um peso (w) e várias frases. Cada frase é [título, subtítulo]. */
  const ANGLES = {
    escassez: {
      n: 'Escassez real', w: 5, ok: c => c.stock >= 1 && c.stock <= 5,
      t: c => c.stock === 1
        ? [[`Última unidade de ${c.name}.`, 'Quem chamar primeiro leva.'], [`Só resta 1 unidade de ${c.name}.`, 'Depois que acabar, acabou. Garanta o seu agora.']]
        : [[`Últimas ${c.stock} unidades.`, `${c.name} está acabando. Garanta o seu antes que esgote.`], [`Só restam ${c.stock}!`, `${c.name}: quem chamar primeiro leva.`], [`Corre: ${c.stock} unidades de ${c.name}.`, 'Estoque baixo, sem previsão de sobrar.']]
    },
    prova: {
      n: 'Prova social real', w: 4, ok: c => c.sold >= 3,
      t: c => [[`${c.sold} unidades já saíram.`, `${c.name} está conquistando quem experimenta. Agora é a sua vez.`], [`${c.sold} pessoas já levaram.`, `Veja por que ${c.name} sai tanto por aqui.`], [`Já são ${c.sold} vendidas!`, 'Chame agora e garanta a sua.']]
    },
    oferta: {
      n: 'Promoção', w: 6, ok: c => c.off > 0,
      t: c => [[`${c.off}% OFF em ${c.name}.`, `De ${c.old} por ${c.pt}. Aproveite enquanto durar.`], [`De ${c.old} por ${c.pt}!`, `${c.name} com ${c.off}% de desconto.`], [`Promoção: ${c.off}% de desconto.`, `${c.name} por apenas ${c.pt}.`]]
    },
    utilidade: {
      n: 'Utilidade no dia a dia', w: 3, ok: () => true,
      t: c => [[`${c.name}: o upgrade que seu dia pedia.`, 'Praticidade, conforto e estilo para usar sempre.'], [`Quanto vale ter ${c.name} sempre à mão?`, 'Utilidade de verdade, todos os dias.'], [`Pare de improvisar. Use ${c.name}.`, 'Pensado para facilitar a sua rotina.'], ['Investimento que se paga em uso.', `${c.name}: você usa hoje e continua usando amanhã.`]]
    },
    qualidade: {
      n: 'Qualidade', w: 3, ok: () => true,
      t: c => [['Qualidade que você sente no primeiro uso.', `${c.name}, com acabamento caprichado.`], ['Barato é o que dura pouco.', `Leve ${c.name} e invista em qualidade que fica.`], ['Detalhe por detalhe, pensado para durar.', c.name], ['Aquele cuidado que faz toda a diferença.', `${c.name}: feito para você aproveitar por muito tempo.`]]
    },
    curiosidade: {
      n: 'Curiosidade', w: 2, ok: () => true,
      t: c => [[`Já conhece ${c.name}?`, 'Chega mais e descubra por que vale a pena.'], ['Sabe aquele item que resolve? É esse.', c.name], ['O detalhe que faz toda a diferença.', `${c.name}: veja de perto.`], [`Já viu ${c.name} de perto?`, 'Vem conferir antes de acabar.']]
    },
    variedade: {
      n: 'Variedade (tamanho e cor)', w: 4, ok: c => c.colors.length >= 2 || c.sizes.length >= 2,
      t: c => {
        const o = [];
        if (c.colors.length >= 2) o.push(['Qual cor combina com você?', `${c.name} em ${lj(c.colors)}.`], [`${c.colors.length} cores. Qual é a sua?`, `${c.name} em ${lj(c.colors)}.`]);
        if (c.sizes.length >= 2) o.push([`Tem o seu tamanho: ${c.sizes.join(' · ')}.`, `${c.name} para todos os gostos.`], ['Não achou o seu tamanho em outro lugar?', `Aqui tem: ${lj(c.sizes)}.`]);
        if (c.colors.length >= 2 && c.sizes.length >= 2) o.push([`${c.colors.length} cores e ${c.sizes.length} tamanhos.`, `Escolha ${c.name} do jeito que você gosta.`]);
        return o;
      }
    },
    preco: {
      n: 'Preço e valor', w: 3, ok: c => c.price > 0,
      t: c => {
        const o = [[`Por apenas ${c.pt}.`, `${c.name}: qualidade e preço justo no mesmo lugar.`], [`${c.name} por ${c.pt}.`, 'Valor justo para levar hoje.'], ['Qualidade não precisa pesar no bolso.', `${c.name} por ${c.pt}.`]];
        if (c.price % 1 !== 0 && c.price > 5) o.push([`Por menos de ${brl(Math.ceil(c.price))}.`, `${c.name}: leve hoje e aproveite.`]);
        return o;
      }
    },
    presente: {
      n: 'Presente', w: 1, ok: () => true,
      t: c => [['Presente perfeito para quem você ama.', `${c.name}: surpreenda sem errar.`], ['Quer agradar sem erro?', `${c.name} é uma ótima escolha de presente.`]]
    },
    pergunta: {
      n: 'Pergunta direta', w: 2, ok: () => true,
      t: c => [[`E se o seu próximo favorito for ${c.name}?`, 'Chame e tire suas dúvidas.'], [`Você merece ${c.name}.`, 'Já pensou em se dar esse presente?'], ['Qual foi a última vez que você se deu um mimo?', `${c.name} está esperando por você.`]]
    },
    acao: {
      n: 'Chamada para ação', w: 2, ok: () => true,
      t: c => [['Chame agora e garanta o seu.', `${c.name} • atendimento rápido pelo WhatsApp.`], ['Quer o seu? É só chamar.', `${c.name}: reserve agora.`], ['Garanta o seu hoje.', `${c.name} • peça pelo WhatsApp.`]]
    }
  };
  const hist = { angles: [], used: {} };
  function pickHook(c, forced) {
    const el = Object.keys(ANGLES).filter(k => ANGLES[k].ok(c));
    let note = '', pool;
    if (forced && forced !== 'auto') {
      if (el.includes(forced)) pool = [forced];
      else note = forced === 'escassez' ? 'Escassez só é usada com estoque de 1 a 5 unidades.' : forced === 'prova' ? 'A prova social só é usada quando o produto já tem vendas.' : forced === 'oferta' ? 'A promoção só é usada em produtos com desconto cadastrado.' : 'Esse gancho não se aplica a este produto.';
    }
    if (!pool) { pool = el.filter(k => !hist.angles.slice(-2).includes(k)); if (!pool.length) pool = el; }
    const total = pool.reduce((s, k) => s + ANGLES[k].w, 0); let r = Math.random() * total, k = pool[0];
    for (const x of pool) { r -= ANGLES[x].w; if (r <= 0) { k = x; break; } }
    const opts = ANGLES[k].t(c), key = k + '|' + c.id, used = (hist.used[key] ||= new Set());
    let idx = opts.map((_, i) => i).filter(i => !used.has(i)); if (!idx.length) { used.clear(); idx = opts.map((_, i) => i); }
    const i = pick(idx); used.add(i); hist.angles.push(k);
    return { angle: k, label: ANGLES[k].n, head: opts[i][0], sub: opts[i][1], note };
  }
  const CTAS = ['Chame no WhatsApp', 'Peça agora pelo WhatsApp', 'Garanta o seu pelo WhatsApp', 'Mande “EU QUERO” no WhatsApp'];

  /* ---------- legenda ---------- */
  const waFmt = d => (d || '').replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
  const igUser = () => (db.settings.ig || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0].replace(/[^\w.]/g, '');
  function hashtags(p, c) {
    const stop = new Set(['para', 'com', 'sem', 'das', 'dos', 'uma', 'por', 'que', 'the']), tags = [];
    [c.cat, p.name].forEach(t => String(t || '').split(/\s+/).forEach(w => { const s = slug(w); if (s.length >= 3 && !stop.has(s)) tags.push(s); }));
    const store = slug(c.store); if (store.length >= 3) tags.push(store);
    tags.push('lojaonline', 'compreaqui');
    return [...new Set(tags)].slice(0, 8).map(t => '#' + t).join(' ');
  }
  function caption(p, c, hook, cta) {
    const st = db.settings, L = [hook.head, hook.sub, ''];
    L.push(`✅ ${p.name}`);
    const d = (p.desc || '').trim().split(/(?<=[.!?])\s/)[0].slice(0, 140); if (d) L.push(`✨ ${d}`);
    if (c.sizes.length) L.push(`📏 Tamanhos: ${c.sizes.join(' · ')}`);
    if (c.colors.length) L.push(`🎨 Cores: ${c.colors.join(' · ')}`);
    L.push(c.off ? `💰 De ${c.old} por ${c.pt} (${c.off}% OFF)` : `💰 ${c.pt}`);
    if (c.stock >= 1 && c.stock <= 5) L.push(`⏳ Restam apenas ${c.stock}`);
    L.push('', `📲 ${cta}${st.wa ? ': ' + waFmt(st.wa) : ''}`);
    if (st.url) L.push(`🔗 ${st.url}`);
    if (igUser()) L.push(`📸 @${igUser()}`);
    L.push('', hashtags(p, c));
    return L.join('\n');
  }

  /* ---------- desenho ---------- */
  function wrap(g, text, maxW) {
    const words = String(text).split(/\s+/).filter(Boolean), lines = []; let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } });
    if (cur) lines.push(cur); return lines;
  }
  function fit(g, text, maxW, size, min, maxLines, weight, fam = FONT) {
    for (let s = size; s >= min; s -= 4) {
      g.font = `${weight} ${s}px ${fam}`; const l = wrap(g, text, maxW);
      if (l.length <= maxLines && l.every(x => g.measureText(x).width <= maxW)) return { s, l };
    }
    g.font = `${weight} ${min}px ${fam}`; return { s: min, l: wrap(g, text, maxW).slice(0, maxLines) };
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.closePath(); }
  const loadImg = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  function theme(style, brand) {
    const dark = shade(brand, -0.38), iw = ink(brand) === '#ffffff';
    if (style === 'claro') return { bg: ['#fbf8f3', '#efe9df'], txt: '#14171c', sub: '#4a5058', card: '#ffffff', badge: brand, badgeTxt: ink(brand), cta: brand, ctaTxt: ink(brand), chip: 'rgba(20,23,28,.07)', chipTxt: '#14171c', deco: hexA(brand, 0.1), foot: '#5a6068' };
    if (style === 'escuro') { const ac = lum(brand) < 70 ? shade(brand, 0.35) : brand; return { bg: ['#14181d', '#0a0c0f'], txt: '#ffffff', sub: 'rgba(255,255,255,.78)', card: '#ffffff', badge: '#ffd23f', badgeTxt: '#111418', cta: ac, ctaTxt: ink(ac), chip: 'rgba(255,255,255,.12)', chipTxt: '#ffffff', deco: hexA(ac, 0.28), foot: 'rgba(255,255,255,.65)' }; }
    return { bg: [brand, dark], txt: ink(brand), sub: iw ? 'rgba(255,255,255,.86)' : 'rgba(17,20,24,.78)', card: '#ffffff', badge: '#ffd23f', badgeTxt: '#111418', cta: iw ? '#ffffff' : '#111418', ctaTxt: iw ? dark : '#ffffff', chip: iw ? 'rgba(255,255,255,.2)' : 'rgba(17,20,24,.12)', chipTxt: ink(brand), deco: iw ? 'rgba(255,255,255,.09)' : 'rgba(17,20,24,.07)', foot: iw ? 'rgba(255,255,255,.75)' : 'rgba(17,20,24,.65)' };
  }
  /* ---------- utilitários de texto e preço ---------- */
  function fitH(g, text, maxW, maxH, size, min, weight, fam = FONT, lk = 1.15) {
    for (let s = size; s >= min; s -= 2) { g.font = `${weight} ${s}px ${fam}`; const l = wrap(g, text, maxW); if (l.length * s * lk <= maxH && l.every(x => g.measureText(x).width <= maxW)) return { s, l, h: l.length * Math.round(s * lk), lh: Math.round(s * lk) }; }
    g.font = `${weight} ${min}px ${fam}`; const l = wrap(g, text, maxW).slice(0, Math.max(1, Math.floor(maxH / (min * lk))));
    return { s: min, l, h: l.length * Math.round(min * lk), lh: Math.round(min * lk) };
  }
  function priceW(g, c, px) { g.font = `800 ${px}px ${FONT}`; let w = g.measureText(c.pt).width; if (c.old) { g.font = `500 ${Math.round(px * 0.52)}px ${FONT}`; w += g.measureText(c.old).width + 18; } return w; }
  function priceLine(g, c, px, x, y, align, col, oldCol) {
    const w = priceW(g, c, px), al = g.textAlign; let sx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x; g.textAlign = 'left';
    if (c.old) { const fs = Math.round(px * 0.52); g.font = `500 ${fs}px ${FONT}`; const ow = g.measureText(c.old).width; g.fillStyle = oldCol || col; g.globalAlpha = 0.65; g.fillText(c.old, sx, y); g.fillRect(sx, y - fs * 0.32, ow, Math.max(2, fs * 0.08)); g.globalAlpha = 1; sx += ow + 18; }
    g.font = `800 ${px}px ${FONT}`; g.fillStyle = col; g.fillText(c.pt, sx, y); g.textAlign = al; return w;
  }
  function offBadge(g, c, x, y, px, align) {
    if (!c.off) return 0; const t = '-' + c.off + '%'; g.font = `800 ${px}px ${FONT}`; const w = g.measureText(t).width + px * 1.1, sx = align === 'right' ? x - w : x;
    g.fillStyle = '#e0245e'; rr(g, sx, y, w, px * 1.7, px * 0.85); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, sx + w / 2, y + px * 0.86); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; return w;
  }
  const NOIMG = ['grupo', 'cupom'];
  async function draw(cv, p, c, o) {
    const F = FORMATS[o.fmt], st = db.settings, W = F.w, H = F.h, P = 72, story = o.fmt === 'story', quad = o.fmt === 'quad';
    if (o.layout && o.layout !== 'classico' && LAYOUTS[o.layout]) {
      const ims = (await Promise.all((p.imgs || []).slice(0, 4).map(loadImg))).filter(Boolean);
      if (ims.length || NOIMG.includes(o.layout)) {
        if (o.layout === 'grupo') o.extra = (await Promise.all([p, ...db.products.filter(x => x.id !== p.id)].filter(x => x.imgs && x.imgs[0]).slice(0, 3).map(x => loadImg(x.imgs[0])))).filter(Boolean);
        cv.width = W; cv.height = H; const g0 = cv.getContext('2d'); g0.imageSmoothingEnabled = true; g0.imageSmoothingQuality = 'high'; g0.textBaseline = 'alphabetic'; g0.textAlign = 'left'; LAYOUTS[o.layout](g0, W, H, p, c, o, ims); return;
      }
    }
    cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const T = theme(o.style, brandColor()), img = await loadImg((p.imgs || [])[0]), HEAD = o.hook.head;
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, T.bg[0]); gr.addColorStop(1, T.bg[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = T.deco; [[W * 0.92, H * 0.1, 360], [W * 0.02, H * 0.78, 270]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    const top = story ? 210 : quad ? 56 : P, bot = story ? 250 : quad ? 56 : P, hw = W - 2 * P, hasChips = (c.sizes.length || c.colors.length) && !quad, foot = [igUser() && '@' + igUser(), st.wa && waFmt(st.wa)].filter(Boolean).join('   •   ');
    const minCard = story ? 800 : quad ? 440 : 660, PH = 84, PG = 18;
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const plan = noSub => {
      let lay;
      for (let size = story ? 104 : quad ? 80 : 92; size >= 40; size -= 6) {
        const h = fit(g, HEAD, hw, size, 40, quad ? 2 : 4, 800), sub = noSub ? { s: 32, l: [] } : fit(g, o.hook.sub || '', hw, Math.round(size * 0.5), 30, quad ? 2 : 3, 500);
        const hh = h.l.length * Math.round(h.s * 1.06), sh = !noSub && o.hook.sub ? sub.l.length * Math.round(sub.s * 1.32) : 0;
        const ctaY = H - bot - 112 - (foot ? 60 : 0), chipsY = hasChips ? ctaY - 26 - 68 : ctaY - 4;
        const cardTop = top + 64 + hh + 22 + sh + (sh ? 28 : 6), avail = chipsY - 24 - cardTop - PH - PG;
        lay = { h, sub, hh, sh, ctaY, chipsY, cardTop, avail, chips: hasChips };
        if (avail >= minCard) break;
      }
      return lay;
    };
    let lay = plan(false); if (lay.avail < 240) lay = plan(true);
    /* marca */
    g.fillStyle = T.txt; g.font = `700 30px ${FONT}`; SP(g, 5);
    g.fillText(String(c.store).toUpperCase().slice(0, 32), P, top + 28); SP(g, 0);
    /* título e subtítulo */
    let y = top + 64; g.fillStyle = T.txt; g.font = `800 ${lay.h.s}px ${FONT}`;
    const lh = Math.round(lay.h.s * 1.06); y += lay.h.s * 0.86;
    lay.h.l.forEach((ln, i) => g.fillText(ln, P, y + i * lh)); y += (lay.h.l.length - 1) * lh + 22;
    if (lay.sh) { g.fillStyle = T.sub; g.font = `500 ${lay.sub.s}px ${FONT}`; const sl = Math.round(lay.sub.s * 1.32); y += lay.sub.s; lay.sub.l.forEach((ln, i) => g.fillText(ln, P, y + i * sl)); }
    /* cartão da foto */
    const side = Math.min(W - 80, Math.max(lay.avail, 200)), cx = (W - side) / 2, cy = lay.cardTop + Math.max(0, (lay.avail - side) / 2);
    g.save(); g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 50; g.shadowOffsetY = 18; g.fillStyle = T.card; rr(g, cx, cy, side, side, 44); g.fill(); g.restore();
    g.save(); rr(g, cx, cy, side, side, 44); g.clip();
    if (img) {
      const bw = side - 20, k = Math.min(bw / img.width, bw / img.height), iw = img.width * k, ih = img.height * k;
      g.drawImage(img, cx + (side - iw) / 2, cy + (side - ih) / 2, iw, ih);
    } else {
      const bg = g.createLinearGradient(cx, cy, cx + side, cy + side); bg.addColorStop(0, hexA(brandColor(), 0.18)); bg.addColorStop(1, hexA(brandColor(), 0.05)); g.fillStyle = bg; g.fillRect(cx, cy, side, side);
      g.fillStyle = hexA(brandColor(), 0.9); g.textAlign = 'center'; g.font = `800 ${Math.round(side * 0.42)}px ${FONT}`; g.fillText(p.name.charAt(0).toUpperCase(), cx + side / 2, cy + side * 0.6);
      g.fillStyle = '#4a5058'; const nf = fit(g, p.name, side - 80, 44, 26, 2, 700); nf.l.forEach((ln, i) => g.fillText(ln, cx + side / 2, cy + side * 0.78 + i * 52)); g.textAlign = 'left';
    }
    g.restore();
    /* etiqueta de preço (abaixo da foto, nunca sobre ela) */
    const pw = priceW(g, c, 56) + 72, bx = (W - pw) / 2, by = cy + side + PG;
    g.save(); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 18; g.shadowOffsetY = 6; g.fillStyle = T.badge; rr(g, bx, by, pw, PH, PH / 2); g.fill(); g.restore();
    priceLine(g, c, 56, W / 2, by + PH / 2 + 20, 'center', T.badgeTxt);
    if (c.off && bx + pw + 20 + 130 < W) offBadge(g, c, bx + pw + 14, by + (PH - 62) / 2, 36, 'left');
    /* tamanhos e cores */
    if (lay.chips) {
      const parts = [c.sizes.length && 'Tamanhos: ' + c.sizes.join(' · '), c.colors.length && 'Cores: ' + c.colors.join(' · ')].filter(Boolean);
      g.font = `600 34px ${FONT}`; const gap = 16, maxEach = (W - 2 * P - gap * (parts.length - 1)) / parts.length;
      const ws = parts.map(t => { let s = t; while (g.measureText(s).width + 52 > maxEach && s.length > 8) s = s.slice(0, -2); if (s !== t) s = s.replace(/[ ·]+$/, '') + '…'; return { s, w: Math.min(maxEach, g.measureText(s).width + 52) }; });
      let x = (W - ws.reduce((a, b) => a + b.w, 0) - gap * (ws.length - 1)) / 2;
      ws.forEach(q => { g.fillStyle = T.chip; rr(g, x, lay.chipsY, q.w, 68, 34); g.fill(); g.fillStyle = T.chipTxt; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(q.s, x + q.w / 2, lay.chipsY + 36); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; x += q.w + gap; });
    }
    /* chamada para ação */
    const cw = W - 2 * P;
    g.save(); g.shadowColor = 'rgba(0,0,0,.22)'; g.shadowBlur = 24; g.shadowOffsetY = 8; g.fillStyle = T.cta; rr(g, P, lay.ctaY, cw, 112, 56); g.fill(); g.restore();
    const cf = fit(g, o.cta + '  →', cw - 80, 54, 30, 1, 800); g.fillStyle = T.ctaTxt; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cf.l[0], W / 2, lay.ctaY + 58); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (foot) { g.fillStyle = T.foot; g.textAlign = 'center'; g.font = `500 32px ${FONT}`; g.fillText(foot, W / 2, lay.ctaY + 112 + 44); g.textAlign = 'left'; }
  }

  /* ---------- modelos (layouts) inspirados em posts de moda e loja ----------
     Todos usam só dados reais do produto e medem o texto antes de desenhar, para nada ficar por cima de nada
     (o preço nunca fica sobre a foto do produto). */
  const SERIF = 'Georgia, "Times New Roman", serif', HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
  const SP = (g, px) => { try { g.letterSpacing = px + 'px'; } catch (e) { } };
  const COLORS = Object.fromEntries(Object.entries({ preto: '#111111', branco: '#ffffff', 'off white': '#f1ece1', azul: '#2f6fd0', 'azul marinho': '#1b2a4a', marinho: '#1b2a4a', 'azul claro': '#8ec5e8', celeste: '#8ec5e8', verde: '#2e8b57', 'verde militar': '#4b5320', 'verde agua': '#7fd1c1', vermelho: '#d32f2f', vinho: '#6d1a36', bordo: '#6d1a36', rosa: '#f0a6c0', 'rosa claro': '#f6c9d8', pink: '#e83e8c', amarelo: '#f5c518', laranja: '#f28c28', roxo: '#6f42c1', lilas: '#c3a6e0', cinza: '#8a8f98', grafite: '#4a4f57', bege: '#d8c3a5', nude: '#e3c3a8', marrom: '#6b4226', caramelo: '#b9772f', cafe: '#4b2e1e', dourado: '#c9a227', prata: '#c0c4cc', terracota: '#c4623f', mostarda: '#d4a017', petroleo: '#17566b', turquesa: '#1aa6b7' }).map(([k, v]) => [slug(k), v]));
  const colorHex = n => { const k = slug(n); if (COLORS[k]) return COLORS[k]; const ks = Object.keys(COLORS).filter(x => k.includes(x)).sort((a, b) => b.length - a.length); return ks.length ? COLORS[ks[0]] : null; };
  function cover(g, img, x, y, w, h, r, o = {}) {
    const k = Math.max(w / img.width, h / img.height) * (o.zoom || 1), iw = img.width * k, ih = img.height * k, fx = o.fx ?? 0.5, fy = o.fy ?? 0.4;
    g.save(); rr(g, x, y, w, h, r || 0); g.clip(); if (o.filter) { try { g.filter = o.filter; } catch (e) { } }
    g.drawImage(img, x - (iw - w) * fx, y - (ih - h) * fy, iw, ih); g.restore();
  }
  const footOf = c => [igUser() && '@' + igUser(), db.settings.wa && waFmt(db.settings.wa)].filter(Boolean).join('   •   ');
  const shadow = (g, b, y, a) => { g.shadowColor = `rgba(0,0,0,${a})`; g.shadowBlur = b; g.shadowOffsetY = y; };
  const dm = d => d ? d.split('-').reverse().slice(0, 2).join('/') : '';
  function ctaLine(g, text, maxW, px, weight) { let s = px; g.font = `${weight} ${s}px ${FONT}`; SP(g, 4); while (g.measureText(text).width > maxW && s > 20) { s -= 2; g.font = `${weight} ${s}px ${FONT}`; } }
  function ctaBtn(g, text, x, y, w, h, fill, txt, px, r) {
    g.save(); shadow(g, 20, 6, 0.28); g.fillStyle = fill; rr(g, x, y, w, h, r ?? h / 2); g.fill(); g.restore();
    ctaLine(g, text, w - 50, px, 700); g.fillStyle = txt; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + w / 2 + 2, y + h / 2 + 2); SP(g, 0); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  }
  const LAYOUTS = {
    /* foto cheia, texto na parte de baixo (como "Peça em destaque" / "Estilo") */
    capa(g, W, H, p, c, o, im) {
      const story = o.fmt === 'story', M = 64, B = brandColor();
      cover(g, im[0], 0, 0, W, H, 0, { fy: 0.3 });
      let gr = g.createLinearGradient(0, H * 0.3, 0, H); gr.addColorStop(0, 'rgba(10,10,12,0)'); gr.addColorStop(0.5, 'rgba(10,10,12,.62)'); gr.addColorStop(1, 'rgba(10,10,12,.93)'); g.fillStyle = gr; g.fillRect(0, H * 0.3, W, H * 0.7);
      gr = g.createLinearGradient(0, 0, 0, H * 0.2); gr.addColorStop(0, 'rgba(10,10,12,.4)'); gr.addColorStop(1, 'rgba(10,10,12,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.2);
      const top = story ? 150 : 52, label = String(c.store).toUpperCase().slice(0, 28); g.font = `700 28px ${FONT}`; SP(g, 5);
      const tw = g.measureText(label).width + 52; g.fillStyle = 'rgba(255,255,255,.92)'; rr(g, M - 8, top, tw, 62, 14); g.fill();
      g.fillStyle = '#14171c'; g.textBaseline = 'middle'; g.fillText(label, M + 18, top + 33); SP(g, 0); g.textBaseline = 'alphabetic';
      offBadge(g, c, W - M, top - 2, 34, 'right');
      const foot = footOf(c), botPad = story ? 190 : 52, rowH = 96, footH = foot ? 54 : 0, rowY = H - botPad - footH - rowH;
      if (foot) { g.fillStyle = 'rgba(255,255,255,.72)'; g.font = `500 28px ${FONT}`; g.textAlign = 'center'; g.fillText(foot, W / 2, H - botPad - 12); g.textAlign = 'left'; }
      const pw = priceW(g, c, 66), cw = W - 2 * M - pw - 36, one = cw < 520;
      priceLine(g, c, 66, M, one ? rowY - 34 : rowY + rowH / 2 + 24, 'left', '#fff');
      const bx = one ? M : M + pw + 36, bw = one ? W - 2 * M : cw;
      ctaBtn(g, o.cta.toUpperCase(), bx, rowY, bw, rowH, B, ink(B), 32);
      let y = one ? rowY - 130 : rowY - 36;
      const sub = o.hook.sub ? fitH(g, o.hook.sub, W - 2 * M, 92, 36, 24, 400, FONT, 1.3) : null;
      if (sub) { y -= sub.h; g.fillStyle = 'rgba(255,255,255,.88)'; g.font = `400 ${sub.s}px ${FONT}`; sub.l.forEach((ln, i) => g.fillText(ln, M, y + sub.s * 0.95 + i * sub.lh)); y -= 20; }
      const kick = [c.cat, p.featured ? 'Peça em destaque' : '', c.sizes.length ? 'Tam. ' + c.sizes.join(' ') : ''].filter(Boolean).join('  •  ').toUpperCase(), kH = kick ? 44 : 0;
      const h = fitH(g, o.hook.head, W - 2 * M, Math.max(y - 26 - kH - (top + 62 + 30), 120), story ? 100 : 86, 40, 'italic 600', SERIF, 1.12);
      y -= h.h; g.fillStyle = '#fff'; g.font = `italic 600 ${h.s}px ${SERIF}`; h.l.forEach((ln, i) => g.fillText(ln, M, y + h.s * 0.92 + i * h.lh)); y -= 26;
      if (kick) { g.fillStyle = shade(B, 0.62); g.font = `600 26px ${FONT}`; SP(g, 4); g.fillText(kick.slice(0, 60), M, y); SP(g, 0); }
    },
    /* cartão estilo polaroid com abas, sobre a foto desfocada (como "Tendência") */
    polaroid(g, W, H, p, c, o, im) {
      const story = o.fmt === 'story', quad = o.fmt === 'quad', B = brandColor(), cx = 84, cw = W - 168, top = story ? 230 : quad ? 56 : 140, tabH = 62;
      cover(g, im[0], 0, 0, W, H, 0, { filter: 'grayscale(1) blur(10px)' }); g.fillStyle = 'rgba(12,14,18,.74)'; g.fillRect(0, 0, W, H);
      const label = String(c.cat || c.store).toUpperCase().slice(0, 22);
      [[cx + 500, 250, hexA(B, 0.95)], [cx + 270, 250, hexA(B, 0.6)]].forEach(([x, w, f]) => { g.fillStyle = f; g.beginPath(); g.roundRect ? g.roundRect(x, top, w, tabH + 24, [22, 22, 0, 0]) : g.rect(x, top, w, tabH + 24); g.fill(); });
      g.fillStyle = '#fff'; g.beginPath(); g.roundRect ? g.roundRect(cx, top, 330, tabH + 24, [22, 22, 0, 0]) : g.rect(cx, top, 330, tabH + 24); g.fill();
      g.fillStyle = '#14171c'; g.font = `700 27px ${FONT}`; SP(g, 2); g.textBaseline = 'middle'; g.fillText(label, cx + 30, top + 34); SP(g, 0); g.textBaseline = 'alphabetic';
      const botPad = story ? 250 : quad ? 46 : 100, ctaH = 84, cardTop = top + tabH, cardH = H - botPad - ctaH - 36 - cardTop, capH = quad ? 176 : 210;
      g.save(); shadow(g, 40, 14, 0.4); g.fillStyle = '#fff'; rr(g, cx, cardTop, cw, cardH, 12); g.fill(); g.restore();
      cover(g, im[0], cx + 26, cardTop + 26, cw - 52, cardH - 52 - capH, 4, { fy: 0.35 });
      const cy = cardTop + cardH - capH + 6, hd = fitH(g, o.hook.head, cw - 120, capH - 86, quad ? 38 : 46, 26, 600, FONT, 1.2);
      g.fillStyle = '#14171c'; g.textAlign = 'center'; g.font = `600 ${hd.s}px ${FONT}`; hd.l.forEach((ln, i) => g.fillText(ln, W / 2, cy + hd.s + i * hd.lh));
      priceLine(g, c, quad ? 40 : 50, W / 2, cardTop + cardH - 34, 'center', lum(B) > 170 ? shade(B, -0.45) : B, '#666'); g.textAlign = 'left';
      const bw = Math.min(cw, 640), bx = (W - bw) / 2, by = cardTop + cardH + 36;
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(bx + 1.5, by + 1.5, bw - 3, ctaH - 3);
      ctaLine(g, o.cta.toUpperCase(), bw - 50, 32, 700); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.cta.toUpperCase(), bx + bw / 2 + 2, by + ctaH / 2 + 2); SP(g, 0); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    },
    /* colagem de fotos com "tamanhos disponíveis" */
    colagem(g, W, H, p, c, o, im) {
      const k = H / 1350, M = 48, pic = i => im[i % im.length], zoomed = im.length < 3, RX = 500, RW = W - RX - M, RC = RX + RW / 2;
      g.fillStyle = '#f5f5f3'; g.fillRect(0, 0, W, H);
      g.save(); g.font = `800 ${Math.round(330 * k)}px ${FONT}`; g.strokeStyle = 'rgba(0,0,0,.09)'; g.lineWidth = 3; g.textAlign = 'center'; g.strokeText(String(c.cat || c.name).toUpperCase().slice(0, 7), W / 2, H - 70 * k); g.restore();
      const frame = (x, y, w, h, i, z) => { g.save(); shadow(g, 24, 8, 0.16); g.fillStyle = '#fff'; g.fillRect(x, y, w, h); g.restore(); cover(g, pic(i), x + 14, y + 14, w - 28, h - 28, 0, { zoom: z, fy: z > 1 ? 0.25 : 0.4 }); };
      frame(M, 170 * k, 420, 480 * k, 1, zoomed ? 1.5 : 1); frame(M, 680 * k, 420, 470 * k, 2, zoomed ? 2 : 1);
      g.save(); shadow(g, 34, 14, 0.3); g.fillStyle = '#fff'; g.fillRect(RX, 360 * k, RW, 790 * k); g.restore(); cover(g, pic(0), RX + 14, 360 * k + 14, RW - 28, 790 * k - 28, 0, { fy: 0.35 });
      g.fillStyle = '#14171c'; g.textAlign = 'center';
      if (c.sizes.length) {
        g.font = `500 26px ${FONT}`; SP(g, 5); g.fillText('TAM. DISPONÍVEIS:', RC, 200 * k + 20); SP(g, 0);
        let fs = 46, gap = 40, ws, tot; do { g.font = `600 ${fs}px ${FONT}`; ws = c.sizes.map(x => g.measureText(x).width); tot = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1); if (tot > RW - 10) { fs -= 4; gap = Math.max(18, gap - 6); } } while (tot > RW - 10 && fs > 22);
        let x = RC - tot / 2; c.sizes.forEach((sz, i) => { g.fillText(sz, x + ws[i] / 2, 200 * k + 92); g.fillRect(x, 200 * k + 102, ws[i], 3); x += ws[i] + gap; });
      } else { const hd = fitH(g, o.hook.head, RW, 150 * k, 44, 24, 700, FONT, 1.2); g.font = `700 ${hd.s}px ${FONT}`; hd.l.forEach((ln, i) => g.fillText(ln, RC, 200 * k + 20 + i * hd.lh)); }
      g.textAlign = 'left';
      const by = H - 120 * k - 24; g.fillStyle = '#111'; g.fillRect(M, by, 450, 96); g.fillStyle = '#fff'; g.font = `500 30px ${FONT}`; SP(g, 2); g.textBaseline = 'middle'; g.fillText('COMPRE AGORA', M + 70, by + 50); SP(g, 0);
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(M + 22, by + 32, 28, 34); g.beginPath(); g.arc(M + 36, by + 34, 9, Math.PI, 0); g.stroke();
      let px = 56; while (priceW(g, c, px) > RW - 10 && px > 30) px -= 2;
      g.textBaseline = 'alphabetic'; priceLine(g, c, px, RC, by + 50 + px * 0.36, 'center', '#14171c'); g.textAlign = 'left';
    },
    /* vitrine: cartão central com cartões desbotados nas laterais. O título é medido primeiro e o cartão ocupa o que sobra. */
    carrossel(g, W, H, p, c, o, im) {
      const story = o.fmt === 'story', quad = o.fmt === 'quad', T = story ? 120 : quad ? 44 : 64, botM = story ? 150 : quad ? 40 : 56;
      g.fillStyle = '#e4e9ed'; g.fillRect(0, 0, W, H);
      g.save(); g.font = `800 ${story ? 400 : quad ? 240 : 300}px ${FONT}`; g.textAlign = 'center'; const gr = g.createLinearGradient(0, H * 0.72, 0, H); gr.addColorStop(0, 'rgba(60,66,74,.5)'); gr.addColorStop(1, 'rgba(60,66,74,.05)'); g.fillStyle = gr;
      g.fillText(String(c.cat || c.store).toLowerCase().slice(0, 9), W / 2, H - (story ? 60 : 20)); g.restore();
      SP(g, 6); const hd = fitH(g, o.hook.head.toUpperCase(), W - 140, quad ? 100 : story ? 190 : 150, story ? 54 : 46, 26, 800, FONT, 1.4); SP(g, 0);
      const btnH = quad ? 80 : 88, prPx = story ? 76 : quad ? 56 : 64, btnY = H - botM - btnH, prY = btnY - 28, areaTop = T + hd.h + 30, areaBot = prY - prPx - 26, area = Math.max(areaBot - areaTop, 260);
      const cw = Math.min(W * 0.62, area * 0.82), ch = Math.min(area, cw * 1.5), cx = (W - cw) / 2, cy = areaTop + (area - ch) / 2, rad = Math.min(70, cw * 0.11);
      [-1, 1].forEach(sd => { const x = sd < 0 ? cx - cw - 40 : cx + cw + 40; cover(g, im[(sd < 0 ? 1 : 2) % im.length], x, cy + 8, cw, ch - 16, rad, { filter: 'grayscale(1)' }); g.fillStyle = 'rgba(228,233,237,.55)'; rr(g, x, cy + 8, cw, ch - 16, rad); g.fill(); });
      g.save(); shadow(g, 40, 14, 0.18); g.fillStyle = '#fff'; rr(g, cx, cy, cw, ch, rad); g.fill(); g.restore(); cover(g, im[0], cx, cy, cw, ch, rad, { fy: 0.35 });
      offBadge(g, c, cx + cw - 16, cy + 16, 34, 'right');
      g.fillStyle = '#14171c'; g.textAlign = 'center'; g.font = `800 ${hd.s}px ${FONT}`; SP(g, 7); hd.l.forEach((ln, i) => g.fillText(ln, W / 2 + 4, T + hd.s + i * hd.lh)); SP(g, 0);
      priceLine(g, c, prPx, W / 2, prY, 'center', '#14171c', '#14171c');
      const bw = W * 0.6; g.textAlign = 'left'; ctaBtn(g, o.cta.toUpperCase(), W / 2 - bw / 2, btnY, bw, btnH, '#1d1f22', '#fff', 28, 12);
    },
    /* produto com destaques, setas que apontam para a foto e bolinhas de cor */
    destaques(g, W, H, p, c, o, im) {
      const story = o.fmt === 'story', quad = o.fmt === 'quad', M = 72, t0 = story ? 150 : quad ? 70 : 100; g.fillStyle = '#ececec'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#6a6f77'; g.font = `400 40px ${HAND}`; g.fillText(String(c.cat || 'novidade').toLowerCase().slice(0, 24), M + 30, t0);
      const nm = fit(g, c.name.toUpperCase(), W - 2 * M, story ? 150 : quad ? 96 : 130, 44, 2, 900), nlh = Math.round(nm.s * 1.02), nTop = t0 + 16;
      g.fillStyle = '#3a3d42'; g.font = `900 ${nm.s}px ${FONT}`; nm.l.forEach((ln, i) => g.fillText(ln, M, nTop + nm.s * 0.9 + i * nlh));
      const top = nTop + nm.l.length * nlh + 30, hasCol = c.colors.length > 0, ctaH = 100, ctaTop = H - 70 - (story ? 140 : 0) - ctaH;
      const ph = Math.max(ctaTop - 30 - (hasCol ? 144 : 70) - top, 260), pw = Math.min(W * 0.54, ph * 0.85), px = M;
      g.save(); shadow(g, 40, 14, 0.22); g.fillStyle = '#fff'; rr(g, px, top, pw, ph, 26); g.fill(); g.restore(); cover(g, im[0], px, top, pw, ph, 26, { fy: 0.35 });
      const notes = noteList(p, c, o);
      const ax = px + pw + 30, tx = ax + 50, tw = W - tx - M; g.fillStyle = '#2b2d31'; g.strokeStyle = '#2b2d31'; g.lineWidth = 4; g.lineCap = 'round';
      notes.slice(0, 2).forEach((t, i) => {
        const ny = top + ph * (i ? 0.6 : 0.2), f = fit(g, t, tw, 44, 26, 3, 400, HAND); g.font = `400 ${f.s}px ${HAND}`; f.l.forEach((ln, j) => g.fillText(ln, tx, ny + j * f.s * 1.15));
        /* a seta sai do texto e termina dentro da foto */
        const x0 = tx - 14, y0 = ny - f.s * 0.3, x1 = px + pw - 44, y1 = i ? ny - 70 : ny + 80, cxp = (x0 + x1) / 2, cyp = i ? ny + 40 : ny - 50;
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cxp, cyp, x1, y1); g.stroke();
        const a = Math.atan2(y1 - cyp, x1 - cxp); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 22 * Math.cos(a - 0.5), y1 - 22 * Math.sin(a - 0.5)); g.moveTo(x1, y1); g.lineTo(x1 - 22 * Math.cos(a + 0.5), y1 - 22 * Math.sin(a + 0.5)); g.stroke();
      });
      let y = top + ph + 62; priceLine(g, c, 66, M, y, 'left', '#14171c', '#6a6f77');
      if (hasCol) { g.font = `400 34px ${FONT}`; g.fillStyle = '#6a6f77'; const lab = 'disponível nas cores:', lw = g.measureText(lab).width; y += 70; g.fillText(lab, M, y); let x = M + lw + 24; c.colors.slice(0, 6).forEach(n => { const hx = colorHex(n); if (x > W - M - 50) return; if (hx) { g.fillStyle = hx; g.beginPath(); g.arc(x + 24, y - 12, 24, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; g.stroke(); x += 62; } else { g.fillStyle = '#4a5058'; g.font = `500 30px ${FONT}`; g.fillText(n, x, y); x += g.measureText(n).width + 24; } }); }
      g.strokeStyle = '#3a3d42'; g.lineWidth = 3; rr(g, M, ctaTop, W - 2 * M, ctaH, 50); g.stroke();
      const right = db.settings.wa ? waFmt(db.settings.wa) : String(c.store); g.font = `400 34px ${FONT}`; const rw = g.measureText(right).width, lf = fit(g, o.cta, W - 2 * M - 88 - rw - 20, 42, 24, 1, 'italic 500', SERIF);
      g.fillStyle = '#14171c'; g.font = `italic 500 ${lf.s}px ${SERIF}`; g.textBaseline = 'middle'; g.fillText(lf.l[0], M + 44, ctaTop + 52); g.font = `400 34px ${FONT}`; g.fillStyle = '#6a6f77'; g.textAlign = 'right'; g.fillText(right, W - M - 40, ctaTop + 52); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    },
    /* look do dia: moldura fixada com percevejo sobre fundo suave, título manuscrito e foto em arco que invade a moldura */
    lookdia(g, W, H, p, c, o, im) {
      const story = o.fmt === 'story', quad = o.fmt === 'quad', M = 64, B = brandColor(), cream = '#f3efe4', dkB = shade(B, -0.3);
      cover(g, im[0], 0, 0, W, H, 0, { filter: 'blur(26px) saturate(.5)', zoom: 1.25 }); g.fillStyle = hexA(shade(B, -0.25), 0.9); g.fillRect(0, 0, W, H);
      const frameTop = story ? 170 : quad ? 50 : 100, stripH = story ? 410 : quad ? 240 : 280, photoBottom = H - stripH, frameBottom = photoBottom - (quad ? 56 : 80);
      const fx = M + 12, fw = W - 2 * fx, fh = frameBottom - frameTop, bd = 18;
      g.save(); g.translate(W / 2, frameTop + fh / 2); g.rotate(-0.012); g.save(); shadow(g, 30, 12, 0.3); g.fillStyle = cream; g.fillRect(-fw / 2, -fh / 2, fw, fh); g.restore();
      g.fillStyle = dkB; g.fillRect(-fw / 2 + bd, -fh / 2 + bd, fw - 2 * bd, fh - 2 * bd); g.restore();
      /* título manuscrito */
      const x0 = fx + bd + 34, maxW = W * 0.31, tt = fit(g, 'do dia', maxW, story ? 150 : quad ? 96 : 120, 44, 1, 700, HAND), y1 = frameTop + bd + 40 + tt.s * 0.8, y2 = y1 + tt.s * 0.95;
      g.fillStyle = cream; g.font = `700 ${tt.s}px ${HAND}`; g.fillText('look', x0, y1); g.fillText('do dia', x0 + tt.s * 0.25, y2);
      g.strokeStyle = cream; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y2 + 34); g.quadraticCurveTo(x0 + maxW * 0.5, y2 + 18, x0 + maxW * 1.05, y2 + 12); g.stroke();
      const nm = fitH(g, c.name, maxW + 10, quad ? 110 : 170, 36, 22, 500, FONT, 1.25); g.fillStyle = 'rgba(243,239,228,.9)'; g.font = `500 ${nm.s}px ${FONT}`; nm.l.forEach((ln, i) => g.fillText(ln, x0, y2 + 34 + 52 + i * nm.lh));
      /* foto em arco (sobra para fora da moldura, como um recorte) */
      const photoTop = frameTop + fh * 0.2, ph = photoBottom - photoTop, pw = Math.min(W * 0.54, ph * 0.78), px = W - M - pw, r = pw / 2;
      const arch = () => { g.beginPath(); g.moveTo(px, photoBottom); g.lineTo(px, photoTop + r); g.arc(px + r, photoTop + r, r, Math.PI, 0); g.lineTo(px + pw, photoBottom); g.closePath(); };
      g.save(); shadow(g, 34, 12, 0.35); g.fillStyle = cream; arch(); g.fill(); g.restore();
      g.save(); arch(); g.clip(); cover(g, im[0], px, photoTop, pw, ph, 0, { fy: 0.3 }); g.restore();
      /* texto em círculo */
      const R = quad ? 92 : 112, ccx = W - R - 52, ccy = photoTop + ph * 0.4; g.save(); shadow(g, 8, 2, 0.5);
      let px2 = quad ? 26 : 30; g.font = `700 ${px2}px ${FONT}`; SP(g, 4); const ws = [...'SEU ESTILO COMEÇA AQUI!'].map(ch => g.measureText(ch).width), tot = ws.reduce((a, b) => a + b, 0) / R; let a = -Math.PI / 2 - tot / 2;
      g.fillStyle = '#fff'; g.textAlign = 'center'; [...'SEU ESTILO COMEÇA AQUI!'].forEach((ch, i) => { const aa = a + ws[i] / 2 / R; g.save(); g.translate(ccx + R * Math.cos(aa), ccy + R * Math.sin(aa)); g.rotate(aa + Math.PI / 2); g.fillText(ch, 0, 0); g.restore(); a += ws[i] / R; }); SP(g, 0); g.textAlign = 'left'; g.restore();
      /* percevejo */
      const pinX = W * 0.47, pinY = frameTop + 6; g.save(); shadow(g, 14, 8, 0.4); const pg = g.createRadialGradient(pinX - 10, pinY - 12, 4, pinX, pinY, 40); pg.addColorStop(0, '#e3e9d8'); pg.addColorStop(1, '#9aa78d'); g.fillStyle = pg; g.beginPath(); g.arc(pinX, pinY, 36, 0, 7); g.fill(); g.restore();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(pinX - 12, pinY - 12, 12, 0, 7); g.fill();
      /* preço e botão */
      const botPad = story ? 190 : quad ? 36 : 52, ctaH = 88, ctaTop = H - botPad - ctaH, ppx = quad ? 58 : 68;
      priceLine(g, c, ppx, M, ctaTop - 30, 'left', cream); offBadge(g, c, W - M, ctaTop - 30 - ppx * 0.95, 34, 'right');
      ctaBtn(g, o.cta.toUpperCase(), M, ctaTop, W - 2 * M, ctaH, cream, dkB, 30);
      if (story) { const ft = footOf(c); if (ft) { g.fillStyle = 'rgba(243,239,228,.8)'; g.font = `500 30px ${FONT}`; g.textAlign = 'center'; g.fillText(ft, W / 2, ctaTop + ctaH + 62); g.textAlign = 'left'; } }
    },
    /* convite para o grupo: celular inclinado com balões de conversa sobre a foto de fundo (não exige foto) */
    grupo(g, W, H, p, c, o, im) {
      const story = o.fmt === 'story', quad = o.fmt === 'quad', M = 64, B = brandColor(), ac = lum(B) < 150 ? shade(B, 0.45) : B, ex = o.extra || [], bg = ex[0] || im[0], pic = im[0] || ex[0], wg = (db.settings.wagroup || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (bg) { cover(g, bg, 0, 0, W, H, 0, { filter: 'blur(8px) grayscale(.55)', zoom: 1.15 }); g.fillStyle = 'rgba(28,32,30,.64)'; g.fillRect(0, 0, W, H); }
      else { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4a4f4a'); gr.addColorStop(1, '#23262a'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
      const top = story ? 150 : quad ? 36 : 70, tt = fit(g, 'Grupo', W - 2 * M - 120, story ? 240 : quad ? 130 : 190, 90, 1, 300), tb = top + tt.s * 0.82;
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `300 ${tt.s}px ${FONT}`; g.fillText(tt.l[0], W / 2, tb);
      const sc = fit(g, String(c.store).toLowerCase().slice(0, 22), W * 0.62, tt.s * 0.55, 40, 1, 'italic 700', HAND), sb = tb + sc.s * 0.62;
      g.save(); g.translate(W / 2, sb); g.rotate(-0.05); g.fillStyle = ac; g.font = `italic 700 ${sc.s}px ${HAND}`; g.fillText(sc.l[0], 0, 0); g.restore(); g.textAlign = 'left';
      const botPad = story ? 190 : quad ? 36 : 70, btnH = 86, extraL = wg && !quad ? 60 : 0, btnTop = H - botPad - extraL - btnH, pTop = sb + 40, pBot = btnTop + 46, hh = pBot - pTop, pw = Math.min(W * 0.7, hh * 0.52), pcx = W / 2, pcy = pTop + hh / 2;
      g.save(); g.translate(pcx, pcy); g.rotate(-0.11);
      g.save(); shadow(g, 40, 18, 0.45); g.fillStyle = '#d9c8b0'; rr(g, -pw / 2, -hh / 2, pw, hh, pw * 0.14); g.fill(); g.restore();
      const sw = pw - 28, sh = hh - 28; g.save(); rr(g, -sw / 2, -sh / 2, sw, sh, pw * 0.11); g.clip();
      if (pic) cover(g, pic, -sw / 2, -sh / 2, sw, sh, 0, { fy: 0.3 }); else { g.fillStyle = hexA(B, 0.5); g.fillRect(-sw / 2, -sh / 2, sw, sh); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `800 ${Math.round(sw * 0.4)}px ${FONT}`; g.fillText(String(c.store).charAt(0).toUpperCase(), 0, sw * 0.14); g.textAlign = 'left'; }
      g.restore(); g.fillStyle = '#111'; rr(g, -pw * 0.15, -hh / 2 + 14, pw * 0.3, 34, 17); g.fill(); g.restore();
      /* balões de conversa */
      const bs = story ? 44 : quad ? 32 : 40, bubble = (t, cy, right, fill, txt) => {
        const f = fit(g, t, W * 0.62, bs, 22, 1, 500), tw = g.measureText(f.l[0]).width, bw = tw + bs * 1.8, bh = bs * 2.2; let x = right ? Math.min(W - 26, pcx + pw * 0.62) - bw : Math.max(26, pcx - pw * 0.62);
        g.save(); shadow(g, 16, 5, 0.25); g.fillStyle = fill; rr(g, x, cy, bw, bh, bh / 2); g.fill(); g.beginPath(); if (right) { g.moveTo(x + bw - bh * 0.5, cy + bh - 4); g.lineTo(x + bw + 12, cy + bh + 10); g.lineTo(x + bw - bh * 0.2, cy + bh - 8); } else { g.moveTo(x + bh * 0.5, cy + bh - 4); g.lineTo(x - 12, cy + bh + 10); g.lineTo(x + bh * 0.2, cy + bh - 8); } g.fill(); g.restore();
        g.fillStyle = txt; g.font = `500 ${f.s}px ${FONT}`; g.textBaseline = 'middle'; g.fillText(f.l[0], x + bs * 0.9, cy + bh / 2 + 1); g.textBaseline = 'alphabetic';
      };
      bubble(o.hook.head, pTop + hh * 0.34, true, ac, ink(ac)); if (o.hook.sub) bubble(o.hook.sub, pTop + hh * 0.34 + bs * 3.4, false, '#fff', '#14171c');
      /* botão com ícone de link */
      g.font = `800 ${story ? 46 : 40}px ${FONT}`; SP(g, 3); const tx = 'ENTRE AQUI', tw2 = g.measureText(tx).width, ic = 52, bw2 = Math.min(W - 2 * M, tw2 + ic + 120), bx = (W - bw2) / 2, bcol = lum(B) > 190 ? '#1d1f22' : shade(B, lum(B) > 120 ? -0.15 : 0.1);
      g.save(); shadow(g, 20, 6, 0.3); g.fillStyle = '#fff'; rr(g, bx, btnTop, bw2, btnH, 18); g.fill(); g.restore();
      const gx = bx + (bw2 - (ic + 18 + tw2)) / 2; g.strokeStyle = bcol; g.lineWidth = 6; g.lineCap = 'round'; g.save(); g.translate(gx + ic / 2, btnTop + btnH / 2); g.rotate(-0.78); rr(g, -ic / 2, -11, ic * 0.58, 22, 11); g.stroke(); rr(g, -ic / 2 + ic * 0.42, -11, ic * 0.58, 22, 11); g.stroke(); g.restore();
      g.fillStyle = bcol; g.textBaseline = 'middle'; g.fillText(tx, gx + ic + 18, btnTop + btnH / 2 + 2); SP(g, 0); g.textBaseline = 'alphabetic';
      if (wg && !quad) { const f = fit(g, wg, W - 2 * M, 30, 20, 1, 500); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `500 ${f.s}px ${FONT}`; g.textAlign = 'center'; g.fillText(f.l[0], W / 2, btnTop + btnH + 44); g.textAlign = 'left'; }
    },
    /* cartaz do cupom: bilhete recortado sobre a foto de fundo (usa a foto do produto, se tiver) */
    cupom(g, W, H, p, c, o, im) {
      const story = o.fmt === 'story', quad = o.fmt === 'quad', B = brandColor(), cp = o.coupon, cream = '#f3efe6', ink2 = '#14171c', code = shade(B, -0.5);
      if (im.length) cover(g, im[0], 0, 0, W, H, 0, { fy: 0.25 }); else { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, B); gr.addColorStop(1, shade(B, -0.45)); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
      let gr = g.createLinearGradient(0, H * 0.55, 0, H); gr.addColorStop(0, 'rgba(10,10,12,0)'); gr.addColorStop(1, 'rgba(10,10,12,.88)'); g.fillStyle = gr; g.fillRect(0, H * 0.55, W, H * 0.45);
      gr = g.createLinearGradient(0, 0, 0, H * 0.18); gr.addColorStop(0, 'rgba(10,10,12,.45)'); gr.addColorStop(1, 'rgba(10,10,12,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.18);
      const top = story ? 120 : quad ? 40 : 58; g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `800 ${quad ? 26 : 30}px ${FONT}`; SP(g, 7); g.fillText(String(c.store).toUpperCase().slice(0, 30), W / 2 + 3, top + 28); SP(g, 0);
      /* medidas do bilhete */
      const tkW = Math.min(W * 0.72, 680), S = story ? 150 : quad ? 96 : 128, tS = story ? 40 : quad ? 30 : 36, cbH = story ? 92 : quad ? 66 : 80, pad = quad ? 40 : 56;
      const rowTitle = S * 0.8, tkH = pad + rowTitle + (quad ? 24 : 40) + 4 + (quad ? 26 : 44) + tS * 2.5 + (quad ? 30 : 56) + 22 + (quad ? 24 : 40) + cbH + pad;
      const cond = [cp.min > 0 && `*Cupom válido para compras acima de ${brl(cp.min)}`, cp.until && `Válido até ${dm(cp.until)}`].filter(Boolean), foot = footOf(c), noteH = (cond.length + (foot ? 1 : 0)) * 40 + 20;
      const tkX = (W - tkW) / 2, tkY = Math.max(top + 70, H - (story ? 130 : quad ? 30 : 50) - noteH - tkH - 20);
      /* recorte do bilhete (bordas serrilhadas e entalhes) */
      const off = document.createElement('canvas'); off.width = Math.ceil(tkW); off.height = Math.ceil(tkH); const q = off.getContext('2d'); q.fillStyle = cream; q.fillRect(0, 0, tkW, tkH); q.globalCompositeOperation = 'destination-out';
      for (let x = 14; x < tkW - 6; x += 30) { q.beginPath(); q.arc(x, 0, 8, 0, 7); q.fill(); q.beginPath(); q.arc(x, tkH, 8, 0, 7); q.fill(); }
      const dotY = tkH - pad - cbH - (quad ? 24 : 40) - 11; [[0, dotY], [tkW, dotY], [tkW / 2, 0], [tkW / 2, tkH]].forEach(([x, y]) => { q.beginPath(); q.arc(x, y, quad ? 26 : 34, 0, 7); q.fill(); });
      g.save(); shadow(g, 36, 12, 0.35); g.drawImage(off, tkX, tkY); g.restore();
      /* textos do bilhete */
      let y = tkY + pad; g.fillStyle = ink2; g.textAlign = 'center';
      g.font = `400 ${S}px ${SERIF}`; const tw0 = g.measureText('CUPOM').width * 0.78, sc = Math.min(1, (tkW - 2 * pad) / tw0); g.save(); g.translate(W / 2, y + rowTitle * 0.98); g.scale(0.78 * sc, sc); g.fillText('CUPOM', 0, 0); g.restore(); y += rowTitle + (quad ? 24 : 40);
      g.fillRect(W / 2 - tkW * 0.14, y, tkW * 0.28, 4); y += 4 + (quad ? 26 : 44) + tS * 0.9;
      g.font = `400 ${tS}px ${FONT}`; g.fillText('Utilize o cupom abaixo', W / 2, y); y += tS * 1.3;
      const a1 = 'e ganhe ', a2 = `${cp.pct}% off!`; g.font = `400 ${tS}px ${FONT}`; const w1 = g.measureText(a1).width; g.font = `800 ${tS}px ${FONT}`; const w2 = g.measureText(a2).width, sx = W / 2 - (w1 + w2) / 2;
      g.textAlign = 'left'; g.font = `400 ${tS}px ${FONT}`; g.fillText(a1, sx, y); g.font = `800 ${tS}px ${FONT}`; g.fillText(a2, sx + w1, y); g.textAlign = 'center';
      const dy = tkY + dotY; for (let x = tkX + 56; x < tkX + tkW - 50; x += 22) { g.fillStyle = (Math.round((x - tkX) / 22) % 3) ? '#3a3d42' : '#8a8f98'; g.beginPath(); g.arc(x, dy, 6, 0, 7); g.fill(); }
      const cbY = tkY + tkH - pad - cbH; g.fillStyle = code; g.fillRect(tkX + pad, cbY, tkW - 2 * pad, cbH);
      SP(g, 2); const cf = fit(g, cp.code, tkW - 2 * pad - 40, story ? 56 : quad ? 40 : 50, 24, 1, 400); g.fillStyle = cream; g.font = `400 ${cf.s}px ${FONT}`; g.textBaseline = 'middle'; g.fillText(cf.l[0], W / 2 + 1, cbY + cbH / 2 + 2); SP(g, 0); g.textBaseline = 'alphabetic';
      /* observações embaixo */
      let ny = tkY + tkH + 54; g.fillStyle = 'rgba(255,255,255,.9)'; cond.forEach(t => { const f = fit(g, t, W - 100, quad ? 26 : 32, 20, 1, 400); g.font = `400 ${f.s}px ${FONT}`; g.fillText(f.l[0], W / 2, ny); ny += 40; });
      if (foot) { g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `500 ${quad ? 24 : 28}px ${FONT}`; g.fillText(foot, W / 2, ny); }
      g.textAlign = 'left';
    }
  };

  /* ---------- tela ---------- */
  const S = { pid: '', fmt: 'feed', style: 'auto', layout: 'auto', angle: 'auto', coupon: '', q: '', has: false };
  const POSTS = window.POSTS = {
    list() {
      const q = slug(S.q), l = db.products.filter(p => !q || slug(p.name + ' ' + (p.category || '')).includes(q));
      $('#plst').innerHTML = l.length ? l.map(p => `<button type="button" class="pg-item ${p.id === S.pid ? 'on' : ''}" onclick="POSTS.sel('${p.id}')">${p.imgs[0] ? `<img class="thumb" src="${esc(p.imgs[0])}" alt="">` : `<span class="thumb ph">${esc(p.name.charAt(0))}</span>`}<span><b>${esc(p.name)}</b><br><small>${brl(salePrice(p))}${p.discount > 0 ? ' (-' + p.discount + '%)' : ''} · ${p.stock} em estoque</small></span></button>`).join('') : '<div class="empty">Nenhum produto encontrado.</div>';
    },
    sel(id) { S.pid = id; POSTS.list(); POSTS.gen(); },
    ui() {
      const l = $('#play').value; $('#pstyw').style.display = l === 'classico' ? '' : 'none'; $('#pcupw').style.display = l === 'cupom' ? '' : 'none';
    },
    async gen() {
      const p = prod(S.pid); if (!p) return toast('Escolha um produto na lista');
      S.fmt = $('#pfmt').value; S.style = $('#psty').value; S.layout = $('#play').value; S.angle = $('#pang').value; S.coupon = $('#pcup').value;
      const c = ctxOf(p), st = db.settings; let hook = pickHook(c, S.angle), layout = S.layout === 'auto' ? pick(['classico', 'capa', 'polaroid', 'colagem', 'carrossel', 'destaques', 'lookdia']) : S.layout, coupon = null, wcap = '';
      const style = layout !== 'classico' ? 'cor' : S.style === 'auto' ? pick(['cor', 'claro', 'escuro']) : S.style;
      const cta = st.wa ? pick(CTAS) : 'Peça já na loja';
      if (layout === 'grupo') {
        const hs = pick([['Faça parte do grupo.', 'E veja as promoções!'], ['Entre no nosso grupo!', 'Novidades antes de todo mundo.'], ['Quer saber primeiro?', 'Entre e receba as ofertas.']]);
        hook = { angle: 'grupo', label: 'Convite para o grupo', head: hs[0], sub: hs[1], note: st.wagroup ? '' : 'Cadastre o link do grupo em Catálogo online para ele aparecer no post.' };
        wcap = [hs[0], hs[1], '', st.wagroup ? `👉 Entre no grupo: ${st.wagroup}` : '👉 Link do grupo na bio', st.wa ? `📲 Ou chame no WhatsApp: ${waFmt(st.wa)}` : '', st.url ? `🔗 ${st.url}` : '', igUser() ? `📸 @${igUser()}` : ''].filter((x, i) => x || i === 2).join('\n');
      }
      if (layout === 'cupom') {
        coupon = db.coupons.find(x => x.id === S.coupon && x.active);
        if (!coupon) { layout = 'classico'; hook.note = 'Crie e escolha um cupom ativo em "Cupons de desconto" para usar esse modelo.'; }
        else {
          hook = { angle: 'cupom', label: 'Cupom de desconto', head: `${coupon.pct}% de desconto`, sub: '', note: '' };
          wcap = [`🎟️ Cupom ${coupon.code}: ${coupon.pct}% de desconto!`, '', `Digite o cupom ${coupon.code} no seu pedido e ganhe ${coupon.pct}% OFF.`, coupon.min > 0 ? `🛒 Compra mínima de ${brl(coupon.min)}` : '', coupon.until ? `⏳ Válido até ${coupon.until.split('-').reverse().join('/')}` : '', coupon.max > 0 ? `Limitado a ${coupon.max} usos` : '', '', st.wa ? `📲 ${cta}: ${waFmt(st.wa)}` : '', st.url ? `🔗 ${st.url}` : '', igUser() ? `📸 @${igUser()}` : ''].filter((x, i) => x || i === 1 || i === 6).join('\n');
        }
      }
      POSTS.cur = { p, c, hook, cta, style, layout };
      await draw($('#pcv'), p, c, { fmt: S.fmt, style, hook, cta, layout, coupon });
      $('#pout').hidden = false; $('#pempty').hidden = true;
      $('#phook').innerHTML = `Gancho usado: <b>${esc(hook.label)}</b>${hook.note ? ` · <span class="warn-t">${esc(hook.note)}</span>` : ''}`;
      $('#pcap').value = wcap || caption(p, c, hook, cta); S.has = true; $('#pgo').textContent = 'Gerar outro gancho';
      if (window.innerWidth < 861) $('#pout').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    file() { return new Promise(res => $('#pcv').toBlob(b => res(new File([b], `post-${slug(S.pid && prod(S.pid)?.name) || 'produto'}-${S.fmt}.png`, { type: 'image/png' })), 'image/png')); },
    async download() { const f = await POSTS.file(), a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); toast('Imagem baixada'); },
    async copy() {
      const t = $('#pcap').value;
      try { await navigator.clipboard.writeText(t); } catch (e) { const a = $('#pcap'); a.select(); document.execCommand('copy'); }
      toast('Legenda copiada');
    },
    async share() {
      const f = await POSTS.file(), data = { files: [f], text: $('#pcap').value };
      if (navigator.canShare && navigator.canShare(data)) { try { await navigator.share(data); } catch (e) { } } else { POSTS.download(); toast('Seu aparelho não compartilha direto: baixei a imagem. Copie a legenda e poste.'); }
    }
  };
  window.registerViews = function (V, TITLES) {
    TITLES.posts = 'Gerador de posts';
    V.posts = () => {
      setActions('');
      if (!db.products.length) { setMain('<div class="card"><div class="empty">Cadastre produtos em <a href="#produtos">Produtos e estoque</a> para criar posts.</div></div>'); return; }
      if (!prod(S.pid)) S.pid = '';
      const opt = (o, v) => Object.entries(o).map(([k, x]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
      setMain(`<div class="grid2 pgrid">
        <div class="card"><h3>1 · Escolha o produto</h3>
          <input id="pq" placeholder="Buscar produto..." value="${esc(S.q)}" oninput="S_q(this.value)">
          <div id="plst" class="pg-list"></div>
          <div class="row"><label>Formato<select id="pfmt">${opt(Object.fromEntries(Object.entries(FORMATS).map(([k, f]) => [k, f.n])), S.fmt)}</select></label>
          <label>Modelo<select id="play" onchange="POSTS.ui()">${opt({ auto: 'Automático (varia)', classico: 'Clássico', capa: 'Foto cheia', polaroid: 'Cartão polaroid', colagem: 'Colagem de fotos', carrossel: 'Vitrine', destaques: 'Destaques com setas', lookdia: 'Look do dia', grupo: 'Convite para o grupo', cupom: 'Cupom de desconto' }, S.layout)}</select></label>
          </div>
          <label id="pstyw">Estilo<select id="psty">${opt({ auto: 'Automático (varia)', cor: 'Cor da loja', claro: 'Claro', escuro: 'Escuro' }, S.style)}</select></label>
          <label id="pcupw">Cupom do post<select id="pcup">${db.coupons.filter(x => x.active).map(x => `<option value="${x.id}" ${x.id === S.coupon ? 'selected' : ''}>${esc(x.code)} — ${x.pct}%</option>`).join('') || '<option value="">Nenhum cupom ativo (crie em Cupons de desconto)</option>'}</select></label>
          <label>Gancho de venda<select id="pang">${opt({ auto: 'Automático — o melhor para este produto', ...Object.fromEntries(Object.entries(ANGLES).map(([k, a]) => [k, a.n])) }, S.angle)}</select></label>
          <button class="btn" id="pgo" style="width:100%" onclick="POSTS.gen()">${S.has ? 'Gerar outro gancho' : 'Gerar post'}</button>
          <p class="sub" style="margin-top:10px">Cada vez que você gerar, o gancho muda. Ele usa só o que é verdade na sua loja: “últimas unidades” aparece só com estoque baixo e “já saíram” só com vendas reais.</p></div>
        <div class="card"><h3>2 · Seu post</h3>
          <div id="pempty" class="empty">Escolha um produto para gerar o post.</div>
          <div id="pout" hidden>
            <canvas id="pcv" class="pg-cv" width="1080" height="1350"></canvas>
            <div class="pg-hook" id="phook"></div>
            <label>Legenda (pode editar)<textarea id="pcap" rows="10"></textarea></label>
            <div class="pg-btns"><button class="btn" onclick="POSTS.download()">Baixar imagem</button><button class="btn" onclick="POSTS.share()">Compartilhar</button><button class="btn ghost" onclick="POSTS.copy()">Copiar legenda</button><button class="btn ghost" onclick="POSTS.gen()">Outro gancho</button></div>
          </div></div></div>`);
      POSTS.ui(); POSTS.list(); if (S.pid && S.has) POSTS.gen();
    };
  };
  window.S_q = v => { S.q = v; POSTS.list(); };
})();
