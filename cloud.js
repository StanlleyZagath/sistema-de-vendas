/* cloud.js — sincronização com o Firebase (Authentication + Firestore).
   Só liga se firebase-config.js tiver a configuração do seu projeto; sem ela o sistema
   continua 100% local, como antes. O app.js conversa com este arquivo por window.CLOUD. */
(function () {
  const cfg = window.FIREBASE_CONFIG;
  const C = { enabled: !!(cfg && cfg.apiKey && cfg.projectId), busy: false, role: '' };
  window.CLOUD = C;
  if (!C.enabled) return;

  const COLS = ['products', 'clients', 'leads', 'sales', 'receivables', 'users'];
  const METAS = {
    settings: {
      admin: true,
      get: db => ({ settings: db.settings, categories: db.categories, nfeKeys: db.nfeKeys }),
      set: (db, d) => { fillObj(db.settings, d.settings || {}); fillArr(db.categories, d.categories || []); fillArr(db.nfeKeys, d.nfeKeys || []); }
    },
    counter: {
      get: db => ({ seq: db.seq || 0 }),
      set: (db, d) => { db.seq = Math.max(db.seq || 0, d.seq || 0); }
    }
  };

  let sdk, app, auth, fs, getDb, hooks = {}, unsubs = [], snap = {}, pushTimer = null, tsn = 0, started = false;

  /* ---------- utilidades ---------- */
  const canon = v => {
    if (v === undefined) return undefined;
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(x => canon(x) ?? 'null').join(',') + ']';
    return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  };
  const clean = v => JSON.parse(JSON.stringify(v));
  function fillObj(t, s) { Object.keys(t).forEach(k => { if (!(k in s)) delete t[k]; }); Object.assign(t, s); }
  function fillArr(t, s) { t.length = 0; s.forEach(x => t.push(x)); }
  const mapOf = k => (snap[k] ||= new Map());
  const say = m => { try { hooks.toast && hooks.toast(m); } catch (e) { } };

  /* ---------- SDK ---------- */
  C.init = async function () {
    if (app) return;
    if (window.__FB_MOCK) sdk = window.__FB_MOCK;
    else {
      const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
      const [a, au, f] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
      sdk = { ...a, ...au, ...f };
    }
    app = sdk.initializeApp(cfg);
    auth = sdk.getAuth(app);
    try { fs = sdk.initializeFirestore(app, { localCache: sdk.persistentLocalCache({ tabManager: sdk.persistentMultipleTabManager() }) }); }
    catch (e) { fs = sdk.getFirestore(app); }
  };

  /* ---------- autenticação ---------- */
  C.onAuth = cb => sdk.onAuthStateChanged(auth, cb);
  C.signIn = (email, pass) => sdk.signInWithEmailAndPassword(auth, email, pass).then(c => c.user);
  C.resetPassword = email => sdk.sendPasswordResetEmail(auth, email);
  C.changePassword = pass => sdk.updatePassword(auth.currentUser, pass);
  /* Confere a senha de quem está logado, sem trocar a sessão (usado para confirmar ações perigosas). */
  C.verifyPassword = pass => { const u = auth.currentUser; return sdk.reauthenticateWithCredential(u, sdk.EmailAuthProvider.credential(u.email, pass)); };
  C.signOut = async () => { C.stop(); await sdk.signOut(auth); };
  C.ownerExists = async () => { try { return (await sdk.getDoc(sdk.doc(fs, 'meta', 'owner'))).exists(); } catch (e) { return true; } };

  /* Primeiro acesso: cria a conta e, no mesmo lote, o "dono" e o perfil de administrador. */
  C.signUpOwner = async (name, email, pass) => {
    C.busy = true;
    try {
      const u = (await sdk.createUserWithEmailAndPassword(auth, email, pass)).user;
      const b = sdk.writeBatch(fs);
      b.set(sdk.doc(fs, 'meta', 'owner'), { uid: u.uid });
      b.set(sdk.doc(fs, 'users', u.uid), { id: u.uid, name, login: email, role: 'admin', commission: 0, _ts: Date.now() });
      try { await b.commit(); } catch (e) { try { await u.delete(); } catch (x) { } throw e; }
      return u;
    } finally { C.busy = false; }
  };

  /* Admin cria o acesso de outra pessoa sem sair da própria sessão (app secundário). */
  C.createUser = async (email, pass) => {
    const sec = sdk.initializeApp(cfg, 'sec' + Date.now()), a2 = sdk.getAuth(sec);
    try { const u = (await sdk.createUserWithEmailAndPassword(a2, email, pass)).user; await sdk.signOut(a2); return u.uid; }
    finally { try { sdk.deleteApp && sdk.deleteApp(sec); } catch (e) { } }
  };

  /* ---------- sincronização ---------- */
  function applyCol(col, qs) {
    const db = getDb(), arr = db[col], m = mapOf(col), byId = new Map(arr.map(x => [x.id, x])), seen = new Set(), applied = [];
    qs.docs.forEach(d => {
      const id = d.id, data = { ...d.data() }; data.id ||= id; seen.add(id);
      const loc = byId.get(id), c = canon(data);
      if (!loc) { arr.push(data); byId.set(id, data); applied.push(id); return; }
      if (canon(loc) !== m.get(id)) return;           // alteração local ainda não enviada: a local vence
      if (c !== m.get(id)) { fillObj(loc, data); applied.push(id); }
      else applied.push(id);
    });
    for (const id of [...m.keys()]) {
      if (seen.has(id)) continue;
      const loc = byId.get(id);
      if (loc && canon(loc) === m.get(id)) arr.splice(arr.indexOf(loc), 1);
      m.delete(id);
    }
    arr.sort((a, b) => (a._ts || 0) - (b._ts || 0));
    hooks.norm && hooks.norm(db);                     // aplica os valores padrão sem contar como alteração
    applied.forEach(id => { const loc = byId.get(id); if (loc) m.set(id, canon(loc)); });
  }
  function applyMeta(key, ds) {
    const db = getDb(), M = METAS[key], m = mapOf('meta');
    if (ds.exists()) {
      if (m.has(key) && canon(M.get(db)) !== m.get(key)) return;   // local ainda não enviado
      M.set(db, ds.data());
    }
    hooks.norm && hooks.norm(db);
    if (ds.exists()) m.set(key, canon(M.get(db)));
  }

  C.start = function (dbGetter, h) {
    C.stop(); getDb = dbGetter; hooks = h || {}; started = true;
    const firsts = [];
    const watch = (register) => {
      let first = true, resolveFirst; firsts.push(new Promise(r => { resolveFirst = r; }));
      unsubs.push(register(() => { if (first) { first = false; resolveFirst(); } }));
    };
    COLS.forEach(col => watch(done => sdk.onSnapshot(sdk.collection(fs, col), qs => {
      applyCol(col, qs); done(); if (hooks.onRemote) hooks.onRemote(col);
    }, err => { done(); if (err && err.code !== 'permission-denied') say('Sincronização: ' + (err.code || err.message)); })));
    Object.keys(METAS).forEach(key => watch(done => sdk.onSnapshot(sdk.doc(fs, 'meta', key), ds => {
      applyMeta(key, ds); done(); if (hooks.onRemote) hooks.onRemote('meta');
    }, err => { done(); })));
    return Promise.race([Promise.all(firsts), new Promise(r => setTimeout(r, 12000))]);
  };
  C.stop = function () {
    unsubs.forEach(u => { try { u(); } catch (e) { } }); unsubs = []; snap = {}; started = false; clearTimeout(pushTimer);
  };

  /* Compara o estado local com o último estado sincronizado e envia só o que mudou. */
  async function push() {
    if (!started) return;
    const db = getDb(), ops = [];
    COLS.forEach(col => {
      const m = mapOf(col), seen = new Set();
      db[col].forEach(it => {
        if (!it.id) return; seen.add(it.id);
        if (!it._ts) it._ts = Date.now() + (tsn++ % 1000) / 1000;
        const c = canon(it);
        if (m.get(it.id) !== c) ops.push({ col, id: it.id, data: clean(it), c });
      });
      for (const id of m.keys()) if (!seen.has(id)) ops.push({ col, id, del: true });
    });
    Object.keys(METAS).forEach(key => {
      if (METAS[key].admin && C.role !== 'admin') return;
      const m = mapOf('meta'), c = canon(METAS[key].get(db));
      if (m.get(key) !== c) ops.push({ col: 'meta', id: key, data: clean(METAS[key].get(db)), c, meta: true });
    });
    if (!ops.length) return;
    try {
      for (let i = 0; i < ops.length; i += 400) {
        const chunk = ops.slice(i, i + 400), b = sdk.writeBatch(fs);
        chunk.forEach(o => { const r = sdk.doc(fs, o.col, o.id); o.del ? b.delete(r) : b.set(r, o.data); });
        chunk.forEach(o => { const m = mapOf(o.col); if (o.del) m.delete(o.id); else m.set(o.id, o.c); });   // marca como enviado (otimista)
        await b.commit();
      }
    } catch (e) {
      say(e && e.code === 'permission-denied' ? 'Sem permissão para essa alteração' : 'Erro ao sincronizar: ' + ((e && (e.code || e.message)) || e));
    }
  }
  C.schedulePush = function () { clearTimeout(pushTimer); pushTimer = setTimeout(push, 250); };
  C.pushNow = function () { clearTimeout(pushTimer); return push(); };
})();
