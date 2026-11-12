/* Gera loja/index.html: a vitrine pública, que lê produtos e estoque ao vivo do Firestore.
   Só precisa rodar de novo (e publicar) se o modelo do catálogo (catalog.js) mudar:  node build-loja.js */
const fs = require('fs');
const tpl = new Function(fs.readFileSync('catalog.js', 'utf8') + ';return CATALOG_TPL')();
global.window = {}; eval(fs.readFileSync('firebase-config.js', 'utf8'));
const live = JSON.stringify(window.FIREBASE_CONFIG);
const shell = JSON.stringify({ name: 'Loja', wa: '', tagline: '', color: '#0071e3', products: [] });
fs.mkdirSync('loja', { recursive: true });
fs.writeFileSync('loja/index.html', tpl.replace('__LIVE__', () => live).replace('__DATA__', () => shell));
console.log('loja/index.html gerado');
