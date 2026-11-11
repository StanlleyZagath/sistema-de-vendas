/* Modelo do catálogo público: gera um único arquivo HTML, sem dependências.
   Regra: o script e o CSS internos não podem usar crases, ${ } nem barras invertidas. */
const CATALOG_TPL = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Catálogo</title>
<style>
:root{color-scheme:light dark;--bg:#f5f5f7;--card:#fff;--txt:#1d1d1f;--mut:#6e6e73;--line:#d2d2d7;--sub:#fbfbfd;--ac:#0071e3;--glass:rgba(255,255,255,.72)}
@media (prefers-color-scheme:dark){:root{--bg:#000;--card:#1d1d1f;--txt:#f5f5f7;--mut:#a1a1a6;--line:#38383c;--sub:#2a2a2d;--glass:rgba(29,29,31,.72)}}
*{box-sizing:border-box}
select option{background-color:var(--card);color:var(--txt)}
html{scroll-behavior:smooth}
body{margin:0;font:17px/1.47 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;background:var(--bg);color:var(--txt);-webkit-font-smoothing:antialiased}
button,input,select,textarea{font:inherit;color:inherit}
.hd{position:sticky;top:0;z-index:20;background:var(--glass);-webkit-backdrop-filter:saturate(180%) blur(22px);backdrop-filter:saturate(180%) blur(22px);border-bottom:1px solid rgba(128,128,128,.22)}
.hd div{max-width:1080px;margin:0 auto;padding:0 20px;height:52px;display:flex;align-items:center;justify-content:space-between}
.brand{font-weight:600;font-size:19px;letter-spacing:-.01em}
.bagb{position:relative;background:var(--ac);color:var(--at,#fff);border:0;cursor:pointer;padding:8px 16px;border-radius:99px;font-size:15px;font-weight:600;display:flex;gap:8px;align-items:center;box-shadow:0 4px 14px rgba(0,0,0,.18);transition:transform .2s ease,filter .2s}
.bagb:hover{filter:brightness(1.1)}
.bagb svg{width:18px;height:18px;flex:none}
.bagb i{font-style:normal;background:var(--at,#fff);color:var(--ac);border-radius:99px;min-width:22px;height:22px;padding:0 6px;font-size:13px;font-weight:700;display:none;align-items:center;justify-content:center}
.bagb i.on{display:inline-flex}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}
.pop{animation:pop .45s ease}
#fab{position:fixed;left:12px;right:12px;margin:0 auto;max-width:560px;bottom:16px;transform:translateY(160%);z-index:30;border:0;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;border-radius:20px;background:var(--ac);color:var(--at,#fff);font-size:17px;font-weight:600;box-shadow:0 14px 40px rgba(0,0,0,.3);transition:transform .35s cubic-bezier(.2,.9,.3,1.2)}
#fab.on{transform:none}
#fab small{display:block;font-size:13px;font-weight:500;opacity:.9}
#fab .r{display:flex;align-items:center;gap:8px}
#fab.pop{animation:none}
#fab.bump{animation:fabpop .45s ease}
@keyframes fabpop{0%{transform:scale(1)}40%{transform:scale(1.04)}100%{transform:scale(1)}}
.hero{max-width:1080px;margin:0 auto;padding:56px 20px 20px}
.hero .eb{font-size:15px;color:var(--mut);margin:0 0 6px;font-weight:600}
.hero h1{margin:0;font-size:clamp(36px,7vw,64px);line-height:1.05;letter-spacing:-.03em;font-weight:700}
.hero p.tg{margin:12px 0 0;font-size:clamp(18px,2.6vw,24px);color:var(--mut);max-width:640px;line-height:1.3}
.ctl{max-width:1080px;margin:0 auto;padding:18px 20px 6px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.cats{display:flex;gap:8px;overflow-x:auto;flex:1 1 100%;padding:2px 0 6px;scrollbar-width:none}
.cats button{white-space:nowrap;border:0;background:rgba(128,128,128,.14);border-radius:99px;padding:8px 16px;font-size:15px;cursor:pointer}
.cats button.on{background:var(--txt);color:var(--bg)}
.ctl input[type=search],.ctl select{border:1px solid var(--line);background:var(--card);border-radius:12px;padding:10px 14px;font-size:15px;min-width:0}
.ctl input[type=search]{flex:1 1 220px}
.chk{display:flex;gap:8px;align-items:center;font-size:15px;color:var(--mut);cursor:pointer;margin:0;white-space:nowrap}
.chk input{display:inline-block;width:auto;margin:0;padding:0;border:0}
#grid{max-width:1080px;margin:0 auto;padding:14px 20px 90px;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:20px}
.p{background:var(--card);border-radius:24px;overflow:hidden;display:flex;flex-direction:column;cursor:pointer;transition:transform .25s ease,box-shadow .25s ease}
.p:hover{transform:translateY(-3px);box-shadow:0 14px 34px rgba(0,0,0,.12)}
.im{position:relative;aspect-ratio:1;background:var(--sub);display:flex;align-items:center;justify-content:center;font-size:64px;color:var(--line);overflow:hidden}
.im img{width:100%;height:100%;object-fit:contain;padding:14px}
.pb{padding:16px 20px 20px;display:flex;flex-direction:column;gap:4px;flex:1}
.pb .eb{font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.pb h3{margin:0;font-size:19px;font-weight:600;letter-spacing:-.01em;line-height:1.25}
.pb .ds{margin:0;color:var(--mut);font-size:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pb .pr{margin-top:auto;padding-top:10px;font-size:17px;font-weight:600}
.pb .low{font-size:13px;color:#c2410c}
.go{margin-top:10px;border:0;border-radius:99px;background:var(--ac);color:var(--at,#fff);padding:10px 18px;font-size:15px;font-weight:500;cursor:pointer;align-self:flex-start}
.go:disabled{background:rgba(128,128,128,.25);color:var(--mut);cursor:not-allowed}
.go:hover:not(:disabled){filter:brightness(1.08)}
.bd{position:absolute;top:12px;left:12px;background:var(--ac);color:var(--at,#fff);font-size:12px;font-weight:600;padding:4px 11px;border-radius:99px}
.empty{grid-column:1/-1;text-align:center;color:var(--mut);padding:60px 0}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.4);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:none;z-index:40;align-items:center;justify-content:center;padding:20px}
.ov.on{display:flex}
.sh{background:var(--card);border-radius:28px;width:min(940px,100%);max-height:92vh;overflow:auto;position:relative;padding:28px}
.bagsh{width:min(480px,100%);align-self:stretch;margin-left:auto;border-radius:28px}
.cl{position:absolute;top:14px;right:16px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(128,128,128,.2);font-size:22px;line-height:1;cursor:pointer;z-index:2}
.dg{display:grid;grid-template-columns:1.1fr 1fr;gap:28px}
.mainim{aspect-ratio:1;background:var(--sub);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:90px;color:var(--line);overflow:hidden}
.mainim img{width:100%;height:100%;object-fit:contain;padding:18px}
.ths{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.th{width:62px;height:62px;padding:3px;border-radius:12px;border:2px solid transparent;background:var(--sub);cursor:pointer}
.th.on{border-color:var(--ac)}
.th img{width:100%;height:100%;object-fit:contain;border-radius:8px}
.di .eb{margin:0;font-size:13px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.di h2{margin:4px 0 8px;font-size:clamp(26px,4vw,38px);line-height:1.1;letter-spacing:-.025em}
.dp{font-size:26px;font-weight:600;margin-bottom:12px}
.dd{color:var(--mut);margin:0 0 16px;white-space:pre-line}
.buy{width:100%;border:0;border-radius:14px;background:var(--ac);color:var(--at,#fff);padding:15px;font-size:17px;font-weight:600;cursor:pointer}
.buy:disabled{background:rgba(128,128,128,.25);color:var(--mut);cursor:not-allowed}
.vo-t{margin:14px 0 8px;font-size:14px;font-weight:600}
.vo-w{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.vo-w .vo-t{flex:0 0 100%;margin:0}
.vo{border:2px solid var(--line);background:var(--sub);color:var(--txt);border-radius:12px;padding:9px 14px;font-size:15px;cursor:pointer}
.vo.on{border-color:var(--ac);box-shadow:0 0 0 1px var(--ac) inset;font-weight:600}
.vo.off{opacity:.4;text-decoration:line-through;cursor:not-allowed}
.bagsh h2{margin:0 0 14px;font-size:28px;letter-spacing:-.02em}
.ln{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}
.ln img,.ln .ph{width:54px;height:54px;border-radius:10px;object-fit:contain;background:var(--sub);flex:none;display:flex;align-items:center;justify-content:center;color:var(--line);font-size:22px}
.ln span{flex:1;min-width:0;font-size:15px}
.ln small{color:var(--mut)}
.ln button{width:30px;height:30px;border-radius:50%;border:1px solid var(--line);background:var(--card);cursor:pointer;font-size:16px}
.tot{display:flex;justify-content:space-between;font-size:20px;font-weight:600;margin:16px 0 2px}
.fr{color:var(--mut);font-size:14px;margin:0 0 16px}
label{display:block;font-size:13px;color:var(--mut);margin-bottom:12px}
label input,label select,label textarea{display:block;width:100%;margin-top:4px;border:1px solid var(--line);background:var(--card);border-radius:12px;padding:11px 13px;font-size:16px}
.wa{width:100%;border:0;border-radius:14px;background:#25a244;color:#fff;padding:15px;font-size:17px;font-weight:600;cursor:pointer}
.mt{color:var(--mut);text-align:center;padding:40px 0}
.ft{max-width:1080px;margin:0 auto;padding:10px 20px 40px;color:var(--mut);font-size:13px;text-align:center}
@media (max-width:720px){.dg{grid-template-columns:1fr}.sh{padding:20px 16px;border-radius:24px}.ov{padding:10px;align-items:flex-end}.bagsh{align-self:auto;margin:0 auto;max-height:94vh}#grid{gap:12px;grid-template-columns:repeat(2,1fr)}.pb{padding:12px 14px 16px}.pb h3{font-size:16px}.hero{padding-top:34px}}
</style></head><body>
<header class="hd"><div><span class="brand" id="brand"></span><button class="bagb" id="bagbtn" aria-label="Abrir sacola"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg><span>Sacola</span><i id="cnt"></i></button></div></header>
<button id="fab" aria-label="Ver sacola"><span><span id="fabn"></span><small id="fabt"></small></span><span class="r">Ver sacola &rarr;</span></button>
<section class="hero"><p class="eb">Catálogo</p><h1 id="ttl"></h1><p class="tg" id="tg"></p></section>
<div class="ctl"><div class="cats" id="cats"></div><input id="q" type="search" placeholder="Buscar produtos"><select id="sort" aria-label="Ordenar"><option value="">Em destaque</option><option value="asc">Menor preço</option><option value="desc">Maior preço</option><option value="az">A a Z</option></select><label class="chk"><input type="checkbox" id="only"> Só disponíveis</label></div>
<main id="grid"></main>
<div class="ft">Frete e prazo combinados com a loja pelo WhatsApp.</div>
<div class="ov" id="pd"><div class="sh" id="pdc"></div></div>
<div class="ov" id="bag"><div class="sh bagsh"><button class="cl" data-close="bag" aria-label="Fechar">&times;</button><h2>Sacola</h2><div id="lines"></div>
<div id="bform"><div class="tot"><span>Subtotal</span><span id="tot"></span></div><p class="fr">Frete calculado pela loja no WhatsApp.</p>
<form id="f" onsubmit="return false">
<label>Seu nome<input name="nome" required autocomplete="name"></label>
<label>Telefone / WhatsApp<input name="tel" type="tel" required autocomplete="tel"></label>
<label>Endereço de entrega (vazio = retirada)<input name="end" autocomplete="street-address"></label>
<label>Forma de pagamento<select name="pag"><option>Pix</option><option>Dinheiro</option><option>Cartão de débito</option><option>Cartão de crédito</option></select></label>
<label>Observações<textarea name="obs" rows="2"></textarea></label>
<button class="wa" id="send">Enviar pedido pelo WhatsApp</button></form></div></div></div>
<script>
var D=__DATA__,cart={},cat="",q="",sort="",only=false,openId="",selVid="",NL=String.fromCharCode(10);
function $(s){return document.querySelector(s)}
function brl(n){return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function byId(id){for(var i=0;i<D.products.length;i++)if(D.products[i].id===id)return D.products[i]}
function sp(k){var a=k.split("~");return{id:a[0],vid:a[1]||""}}
function vo(p,vid){var a=p.vars||[];for(var i=0;i<a.length;i++)if(a[i].id===vid)return a[i]}
function vl(v){return [v.s,v.c].filter(Boolean).join(" · ")||"Sem variação"}
function stk(k){var s=sp(k),p=byId(s.id),v=vo(p,s.vid);return v?v.q:p.stock}
function count(){var n=0,t=0;for(var k in cart){n+=cart[k];t+=cart[k]*byId(sp(k).id).price}return{n:n,t:t}}
function cats(){var s=[""];D.products.forEach(function(p){if(p.cat&&s.indexOf(p.cat)<0)s.push(p.cat)});
 $("#cats").innerHTML=s.length>2?s.map(function(c){return '<button data-cat="'+esc(c)+'" class="'+(c===cat?"on":"")+'">'+(c?esc(c):"Tudo")+'</button>'}).join(""):""}
function list(){
 var L=D.products.filter(function(p){
  if(cat&&p.cat!==cat)return false;if(only&&p.stock<=0)return false;
  if(q&&(p.name+" "+p.cat+" "+(p.desc||"")).toLowerCase().indexOf(q)<0)return false;return true});
if(!sort)L.sort(function(a,b){return (b.feat?1:0)-(a.feat?1:0)});
 if(sort==="asc")L.sort(function(a,b){return a.price-b.price});
 else if(sort==="desc")L.sort(function(a,b){return b.price-a.price});
 else if(sort==="az")L.sort(function(a,b){return a.name.localeCompare(b.name)});
 var h=L.map(function(p){var out=p.stock<=0,im=p.imgs&&p.imgs[0];
  return '<article class="p" data-open="'+p.id+'"><div class="im">'+(im?'<img src="'+esc(im)+'" alt="">':esc(p.name.charAt(0)))+(p.feat?'<span class="bd">Destaque</span>':'')+'</div><div class="pb">'+(p.cat?'<span class="eb">'+esc(p.cat)+'</span>':'')+'<h3>'+esc(p.name)+'</h3>'+(p.desc?'<p class="ds">'+esc(p.desc)+'</p>':'')+(!out&&p.stock<=5?'<span class="low">Últimas '+p.stock+' unidades</span>':'')+'<div class="pr">'+brl(p.price)+'</div>'+(out?'<button class="go" disabled>Esgotado</button>':(p.vars&&p.vars.length?'<button class="go" data-open="'+p.id+'">Escolher opções</button>':'<button class="go" data-add="'+p.id+'">Comprar</button>'))+'</div></article>'}).join("");
 $("#grid").innerHTML=h||'<p class="empty">Nenhum produto encontrado.</p>'}
function pop(el){el.classList.remove("pop");void el.offsetWidth;el.classList.add("pop")}
function bar(add){var c=count(),e=$("#cnt"),f=$("#fab");e.textContent=c.n;e.className=c.n?"on":"";
 $("#fabn").textContent=c.n+(c.n===1?" item na sacola":" itens na sacola");$("#fabt").textContent="Subtotal "+brl(c.t);
 f.classList.toggle("on",c.n>0&&!$("#bag").classList.contains("on")&&!$("#pd").classList.contains("on"));
 if(add){pop($("#bagbtn"));f.classList.remove("bump");void f.offsetWidth;f.classList.add("bump")}}
function lines(){var h="";for(var k in cart){var s=sp(k),p=byId(s.id),v=vo(p,s.vid),im=p.imgs&&p.imgs[0];
  h+='<div class="ln">'+(im?'<img src="'+esc(im)+'" alt="">':'<div class="ph">'+esc(p.name.charAt(0))+'</div>')+'<span>'+esc(p.name)+(v?'<br><small>'+esc(vl(v))+'</small>':'')+'<br><small>'+brl(p.price)+'</small></span><button data-q="'+k+':-1" aria-label="Diminuir">-</button><b>'+cart[k]+'</b><button data-q="'+k+':1" aria-label="Aumentar">+</button></div>'}
 $("#lines").innerHTML=h||'<p class="mt">Sua sacola está vazia.</p>';$("#bform").style.display=count().n?"block":"none";$("#tot").textContent=brl(count().t)}
function bump(k,d){var m=stk(k),n=(cart[k]||0)+d;if(n<=0)delete cart[k];else if(n>m){alert("Só temos "+m+" em estoque.");return}else cart[k]=n;bar(d>0);lines()}
function opts(p){return '<div class="vo-w"><p class="vo-t">Escolha o tamanho e a cor</p>'+p.vars.map(function(v){return '<button class="vo'+(v.q<=0?' off':'')+(v.id===selVid?' on':'')+'" data-vo="'+v.id+'"'+(v.q<=0?' disabled':'')+'>'+esc(vl(v))+'</button>'}).join("")+'</div>'}
function detail(id){var p=byId(id),im=p.imgs||[];openId=id;selVid="";
 var th=im.length>1?im.map(function(s,i){return '<button class="th'+(i?"":" on")+'" data-th="'+i+'" aria-label="Foto '+(i+1)+'"><img src="'+esc(s)+'" alt=""></button>'}).join(""):"";
 $("#pdc").innerHTML='<button class="cl" data-close="pd" aria-label="Fechar">&times;</button><div class="dg"><div><div class="mainim" id="mim">'+(im[0]?'<img src="'+esc(im[0])+'" alt="">':esc(p.name.charAt(0)))+'</div><div class="ths">'+th+'</div></div><div class="di"><p class="eb">'+esc(p.cat)+'</p><h2>'+esc(p.name)+'</h2><div class="dp">'+brl(p.price)+'</div>'+(p.desc?'<p class="dd">'+esc(p.desc)+'</p>':'')+(p.vars&&p.vars.length?'':(p.stock>0&&p.stock<=5?'<p class="dd">Últimas '+p.stock+' unidades.</p>':''))+(p.vars&&p.vars.length&&p.stock>0?opts(p):'')+(p.stock>0?'<button class="buy" data-addd="'+p.id+'">Adicionar à sacola</button>':'<button class="buy" disabled>Esgotado</button>')+'</div></div>';
 $("#pd").classList.add("on")}
function closeAll(){$("#pd").classList.remove("on");$("#bag").classList.remove("on");bar()}
document.addEventListener("click",function(e){var t=e.target,x;
 if(x=t.closest("[data-close]")){$("#"+x.getAttribute("data-close")).classList.remove("on");bar();return}
 if(t.classList&&t.classList.contains("ov")){t.classList.remove("on");bar();return}
 if(x=t.closest("[data-add]")){bump(x.getAttribute("data-add"),1);x.textContent="Adicionado";setTimeout(list,900);return}
 if(x=t.closest("[data-vo]")){selVid=x.getAttribute("data-vo");var vs=document.querySelectorAll(".vo");for(var j=0;j<vs.length;j++)vs[j].classList.toggle("on",vs[j]===x);return}
 if(x=t.closest("[data-addd]")){var pid=x.getAttribute("data-addd"),pv=byId(pid),key=pid;
  if(pv.vars&&pv.vars.length){if(!selVid){alert("Escolha o tamanho e a cor.");return}key=pid+"~"+selVid;bump(key,1);var bt=x;bt.textContent="Adicionado. Ver sacola ("+count().n+")";setTimeout(function(){bt.textContent="Adicionar à sacola"},1500);return}
  bump(key,1);x.textContent="Adicionado. Ver sacola ("+count().n+")";x.removeAttribute("data-addd");x.setAttribute("data-bag","1");return}
 if(x=t.closest("[data-bag]")){openBag();return}
 if(x=t.closest("[data-th]")){var p=byId(openId),i=parseInt(x.getAttribute("data-th"),10);$("#mim").innerHTML='<img src="'+esc(p.imgs[i])+'" alt="">';var a=document.querySelectorAll(".th");for(var k=0;k<a.length;k++)a[k].className="th"+(k===i?" on":"");return}
 if(x=t.closest("[data-open]")){detail(x.getAttribute("data-open"));return}
 if(x=t.closest("[data-cat]")){cat=x.getAttribute("data-cat");cats();list();return}
 if(x=t.closest("[data-q]")){var a2=x.getAttribute("data-q").split(":");bump(a2[0],parseInt(a2[1],10));return}
});
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeAll()});
$("#q").oninput=function(){q=this.value.toLowerCase();list()};
$("#sort").onchange=function(){sort=this.value;list()};
$("#only").onchange=function(){only=this.checked;list()};
function openBag(){lines();$("#pd").classList.remove("on");$("#bag").classList.add("on");bar()}
$("#bagbtn").onclick=openBag;$("#fab").onclick=openBag;
$("#send").onclick=function(){var f=$("#f");
 if(!f.nome.value.trim()||!f.tel.value.trim()){alert("Informe seu nome e telefone.");return}
 if(!D.wa){alert("Esta loja ainda não configurou o WhatsApp.");return}
 var L=[],ref=[],t=0;for(var k in cart){var s=sp(k),p=byId(s.id),v=vo(p,s.vid),nm=p.name+(v?" ("+vl(v)+")":"");t+=p.price*cart[k];L.push(cart[k]+"x "+nm+" - "+brl(p.price*cart[k]));ref.push(k+":"+cart[k])}
 var msg="*Novo pedido - "+D.name+"*"+NL+NL+L.join(NL)+NL+NL+"*Subtotal: "+brl(t)+"* (frete a combinar)"+NL+NL+"Cliente: "+f.nome.value.trim()+NL+"Telefone: "+f.tel.value.trim()+NL+"Endereco: "+(f.end.value.trim()||"retirada")+NL+"Pagamento: "+f.pag.value+(f.obs.value.trim()?NL+"Obs: "+f.obs.value.trim():"")+NL+NL+"[[PED "+ref.join(",")+"]]";
 window.open("https://wa.me/"+D.wa+"?text="+encodeURIComponent(msg),"_blank")};
var hx=(D.color||"#0071e3").replace("#",""),cr=parseInt(hx.substr(0,2),16),cg=parseInt(hx.substr(2,2),16),cb=parseInt(hx.substr(4,2),16);
document.documentElement.style.setProperty("--ac",D.color||"#0071e3");document.documentElement.style.setProperty("--at",(0.299*cr+0.587*cg+0.114*cb)>150?"#111":"#fff");
document.title=D.name;$("#brand").textContent=D.name;$("#ttl").textContent=D.name;$("#tg").textContent=D.tagline||"";
cats();list();bar();
</script></body></html>`;
