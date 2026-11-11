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
    return { id: p.id, name: p.name, price: p.price, pt: brl(p.price), sizes: uniq('size'), colors: uniq('color'), stock: p.stock, sold, cat: p.category || '', desc: p.desc || '', store: st.name || 'Minha loja' };
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
      else note = forced === 'escassez' ? 'Escassez só é usada com estoque de 1 a 5 unidades.' : forced === 'prova' ? 'A prova social só é usada quando o produto já tem vendas.' : 'Esse gancho não se aplica a este produto.';
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
    L.push(`💰 ${c.pt}`);
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
  function fit(g, text, maxW, size, min, maxLines, weight) {
    for (let s = size; s >= min; s -= 4) {
      g.font = `${weight} ${s}px ${FONT}`; const l = wrap(g, text, maxW);
      if (l.length <= maxLines && l.every(x => g.measureText(x).width <= maxW)) return { s, l };
    }
    g.font = `${weight} ${min}px ${FONT}`; return { s: min, l: wrap(g, text, maxW).slice(0, maxLines) };
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.closePath(); }
  const loadImg = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  function theme(style, brand) {
    const dark = shade(brand, -0.38), iw = ink(brand) === '#ffffff';
    if (style === 'claro') return { bg: ['#fbf8f3', '#efe9df'], txt: '#14171c', sub: '#4a5058', card: '#ffffff', badge: brand, badgeTxt: ink(brand), cta: brand, ctaTxt: ink(brand), chip: 'rgba(20,23,28,.07)', chipTxt: '#14171c', deco: hexA(brand, 0.1), foot: '#5a6068' };
    if (style === 'escuro') { const ac = lum(brand) < 70 ? shade(brand, 0.35) : brand; return { bg: ['#14181d', '#0a0c0f'], txt: '#ffffff', sub: 'rgba(255,255,255,.78)', card: '#ffffff', badge: '#ffd23f', badgeTxt: '#111418', cta: ac, ctaTxt: ink(ac), chip: 'rgba(255,255,255,.12)', chipTxt: '#ffffff', deco: hexA(ac, 0.28), foot: 'rgba(255,255,255,.65)' }; }
    return { bg: [brand, dark], txt: ink(brand), sub: iw ? 'rgba(255,255,255,.86)' : 'rgba(17,20,24,.78)', card: '#ffffff', badge: '#ffd23f', badgeTxt: '#111418', cta: iw ? '#ffffff' : '#111418', ctaTxt: iw ? dark : '#ffffff', chip: iw ? 'rgba(255,255,255,.2)' : 'rgba(17,20,24,.12)', chipTxt: ink(brand), deco: iw ? 'rgba(255,255,255,.09)' : 'rgba(17,20,24,.07)', foot: iw ? 'rgba(255,255,255,.75)' : 'rgba(17,20,24,.65)' };
  }
  async function draw(cv, p, c, o) {
    const F = FORMATS[o.fmt], st = db.settings, W = F.w, H = F.h, P = 72, story = o.fmt === 'story';
    cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const T = theme(o.style, brandColor()), img = await loadImg((p.imgs || [])[0]);
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, T.bg[0]); gr.addColorStop(1, T.bg[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = T.deco; [[W * 0.92, H * 0.1, 360], [W * 0.02, H * 0.78, 270]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    const top = story ? 210 : P, bot = story ? 250 : P, hw = W - 2 * P, hasChips = c.sizes.length || c.colors.length, foot = [igUser() && '@' + igUser(), st.wa && waFmt(st.wa)].filter(Boolean).join('   •   ');
    const minCard = story ? 640 : o.fmt === 'quad' ? 360 : 500;
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    let lay;
    for (let size = story ? 112 : 100; size >= 48; size -= 6) {
      const h = fit(g, o.hook.head, hw, size, 44, 4, 800), sub = fit(g, o.hook.sub || '', hw, Math.round(size * 0.5), 32, 3, 500);
      const hh = h.l.length * Math.round(h.s * 1.06), sh = o.hook.sub ? sub.l.length * Math.round(sub.s * 1.32) : 0;
      let ctaY = H - bot - 112 - (foot ? 60 : 0), chipsY = hasChips && o.fmt !== 'quad' ? ctaY - 26 - 68 : ctaY - 4;
      const cardTop = top + 64 + hh + 22 + sh + (sh ? 28 : 6), avail = chipsY - 30 - cardTop;
      lay = { h, sub, hh, sh, ctaY, chipsY, cardTop, avail, chips: hasChips && o.fmt !== 'quad' };
      if (avail >= minCard) break;
    }
    /* marca */
    g.fillStyle = T.txt; g.font = `700 30px ${FONT}`; try { g.letterSpacing = '5px'; } catch (e) { }
    g.fillText(String(c.store).toUpperCase().slice(0, 32), P, top + 28); try { g.letterSpacing = '0px'; } catch (e) { }
    /* título e subtítulo */
    let y = top + 64; g.fillStyle = T.txt; g.font = `800 ${lay.h.s}px ${FONT}`;
    const lh = Math.round(lay.h.s * 1.06); y += lay.h.s * 0.86;
    lay.h.l.forEach((ln, i) => g.fillText(ln, P, y + i * lh)); y += (lay.h.l.length - 1) * lh + 22;
    if (lay.sh) { g.fillStyle = T.sub; g.font = `500 ${lay.sub.s}px ${FONT}`; const sl = Math.round(lay.sub.s * 1.32); y += lay.sub.s; lay.sub.l.forEach((ln, i) => g.fillText(ln, P, y + i * sl)); }
    /* cartão da foto */
    const side = Math.min(W - 2 * P, Math.max(lay.avail, 240)), cx = (W - side) / 2, cy = lay.cardTop + Math.max(0, (lay.avail - side) / 2);
    g.save(); g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 50; g.shadowOffsetY = 18; g.fillStyle = T.card; rr(g, cx, cy, side, side, 44); g.fill(); g.restore();
    g.save(); rr(g, cx, cy, side, side, 44); g.clip();
    if (img) {
      const pad = 22, bw = side - 2 * pad, k = Math.min(bw / img.width, bw / img.height), iw = img.width * k, ih = img.height * k;
      g.drawImage(img, cx + (side - iw) / 2, cy + (side - ih) / 2, iw, ih);
    } else {
      const bg = g.createLinearGradient(cx, cy, cx + side, cy + side); bg.addColorStop(0, hexA(brandColor(), 0.18)); bg.addColorStop(1, hexA(brandColor(), 0.05)); g.fillStyle = bg; g.fillRect(cx, cy, side, side);
      g.fillStyle = hexA(brandColor(), 0.9); g.textAlign = 'center'; g.font = `800 ${Math.round(side * 0.42)}px ${FONT}`; g.fillText(p.name.charAt(0).toUpperCase(), cx + side / 2, cy + side * 0.6);
      g.fillStyle = '#4a5058'; const nf = fit(g, p.name, side - 80, 44, 26, 2, 700); nf.l.forEach((ln, i) => g.fillText(ln, cx + side / 2, cy + side * 0.78 + i * 52)); g.textAlign = 'left';
    }
    g.restore();
    /* etiqueta de preço */
    g.font = `800 ${Math.round(Math.min(64, side / 8))}px ${FONT}`; const pw = g.measureText(c.pt).width + 64, ph = Math.round(Math.min(64, side / 8) * 1.6), bx = cx + 24, by = cy + 24;
    g.save(); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 18; g.shadowOffsetY = 6; g.fillStyle = T.badge; rr(g, bx, by, pw, ph, ph / 2); g.fill(); g.restore();
    g.fillStyle = T.badgeTxt; g.textBaseline = 'middle'; g.fillText(c.pt, bx + 32, by + ph / 2 + 2); g.textBaseline = 'alphabetic';
    /* tamanhos e cores */
    if (lay.chips) {
      const parts = [c.sizes.length && 'Tamanhos: ' + c.sizes.join(' · '), c.colors.length && 'Cores: ' + c.colors.join(' · ')].filter(Boolean);
      g.font = `600 34px ${FONT}`; const gap = 16, maxEach = (W - 2 * P - gap * (parts.length - 1)) / parts.length;
      const ws = parts.map(t => { let s = t; while (g.measureText(s).width + 52 > maxEach && s.length > 8) s = s.slice(0, -2); if (s !== t) s = s.replace(/[ ·]+$/, '') + '…'; return { s, w: Math.min(maxEach, g.measureText(s).width + 52) }; });
      let x = (W - ws.reduce((a, b) => a + b.w, 0) - gap * (ws.length - 1)) / 2;
      ws.forEach(q => { g.fillStyle = T.chip; rr(g, x, lay.chipsY, q.w, 68, 34); g.fill(); g.fillStyle = T.chipTxt; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(q.s, x + q.w / 2, lay.chipsY + 36); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; x += q.w + gap; });
    }
    /* chamada para ação */
    const cw = W - 2 * P; g.save(); g.shadowColor = 'rgba(0,0,0,.22)'; g.shadowBlur = 24; g.shadowOffsetY = 8; g.fillStyle = T.cta; rr(g, P, lay.ctaY, cw, 112, 56); g.fill(); g.restore();
    const cf = fit(g, o.cta + '  →', cw - 80, 54, 30, 1, 800); g.fillStyle = T.ctaTxt; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cf.l[0], W / 2, lay.ctaY + 58); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (foot) { g.fillStyle = T.foot; g.textAlign = 'center'; g.font = `500 32px ${FONT}`; g.fillText(foot, W / 2, lay.ctaY + 112 + 44); g.textAlign = 'left'; }
  }

  /* ---------- tela ---------- */
  const S = { pid: '', fmt: 'feed', style: 'auto', angle: 'auto', q: '', has: false };
  const POSTS = window.POSTS = {
    list() {
      const q = slug(S.q), l = db.products.filter(p => !q || slug(p.name + ' ' + (p.category || '')).includes(q));
      $('#plst').innerHTML = l.length ? l.map(p => `<button type="button" class="pg-item ${p.id === S.pid ? 'on' : ''}" onclick="POSTS.sel('${p.id}')">${p.imgs[0] ? `<img class="thumb" src="${esc(p.imgs[0])}" alt="">` : `<span class="thumb ph">${esc(p.name.charAt(0))}</span>`}<span><b>${esc(p.name)}</b><br><small>${brl(p.price)} · ${p.stock} em estoque</small></span></button>`).join('') : '<div class="empty">Nenhum produto encontrado.</div>';
    },
    sel(id) { S.pid = id; POSTS.list(); POSTS.gen(); },
    async gen() {
      const p = prod(S.pid); if (!p) return toast('Escolha um produto na lista');
      S.fmt = $('#pfmt').value; S.style = $('#psty').value; S.angle = $('#pang').value;
      const c = ctxOf(p), hook = pickHook(c, S.angle), style = S.style === 'auto' ? pick(['cor', 'claro', 'escuro']) : S.style;
      const cta = db.settings.wa ? pick(CTAS) : 'Peça já na loja';
      POSTS.cur = { p, c, hook, cta, style };
      await draw($('#pcv'), p, c, { fmt: S.fmt, style, hook, cta });
      $('#pout').hidden = false; $('#pempty').hidden = true;
      $('#phook').innerHTML = `Gancho usado: <b>${esc(hook.label)}</b>${hook.note ? ` · <span class="warn-t">${esc(hook.note)}</span>` : ''}`;
      $('#pcap').value = caption(p, c, hook, cta); S.has = true; $('#pgo').textContent = 'Gerar outro gancho';
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
          <label>Estilo<select id="psty">${opt({ auto: 'Automático (varia)', cor: 'Cor da loja', claro: 'Claro', escuro: 'Escuro' }, S.style)}</select></label></div>
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
      POSTS.list(); if (S.pid && S.has) POSTS.gen();
    };
  };
  window.S_q = v => { S.q = v; POSTS.list(); };
})();
