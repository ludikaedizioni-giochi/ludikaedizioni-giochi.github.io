'use strict';
/* App Ludika: Sfide sotto l'albero (avvento) e Giochi in due (torneo).
   Tutti i dati restano sul telefono (localStorage). */

const CONFIG = {
  // Moduli Brevo per gli avvisi (si riempiono quando i moduli sono pronti; vuoti = schermata saltata)
  moduloEmail: { avvento: '', torneo: '' },
  // Contatore anonimo delle attivazioni (vuoto = nessun conteggio)
  contatore: '',
  amazon: { avvento: 'https://www.amazon.it/dp/B0HPCV4244', torneo: 'https://www.amazon.it/dp/B0HQWPSW2L' },
  recensione: { avvento: 'https://www.amazon.it/review/create-review?asin=B0HPCV4244', torneo: 'https://www.amazon.it/review/create-review?asin=B0HQWPSW2L' }
};

const LIBRI = {
  avvento: { nome: "Sfide sotto l'albero", img: 'img/cover05.jpg', classe: 'av', parola: 'della sfida',
    domande: [[12, ['biscotti', 'natale']], [13, ['elfo', 'illuminare']], [18, ['cesto', 'ridere']], [19, ['due', 'potare']], [21, ['nascoste', 'carbone']]], perGiorno: true },
  torneo: { nome: 'Giochi in due', img: 'img/cover06.jpg', classe: 'to', parola: 'del gioco',
    domande: [[54, 'bilance'], [58, 'frecce'], [66, 'numeri'], [78, 'messaggio'], [94, 'mancanti']] }
};

/* ---------- memoria ---------- */
const CHIAVE = 'ludika.app.v1';
let S;
function carica() {
  try { S = JSON.parse(localStorage.getItem(CHIAVE)) || {}; } catch (e) { S = {}; }
  S.sblocchi = S.sblocchi || {};
  S.domanda = S.domanda || {};
  S.email = S.email || {};
  S.codici = S.codici || {};
  S.vincoli = S.vincoli || {};
  S.avvento = S.avvento || { nomi: null, ris: {}, libero: false, serate: {} };
  S.torneo = S.torneo || nuovoTorneo();
}
function nuovoTorneo() {
  return { nomi: null, lista: 'famiglia', ris: {}, doppio: {}, jolly: { A: {}, B: {} }, premiUsati: [], pegniUsati: [], tappe: {} };
}
function salva() { try { localStorage.setItem(CHIAVE, JSON.stringify(S)); } catch (e) {} }

/* ---------- utilità ---------- */
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
let vista = { libro: null, pagina: 'home', param: null };
function vai(libro, pagina, param) { vista = { libro, pagina, param }; render(); window.scrollTo(0, 0); }
function finestra(html) {
  const d = document.createElement('div'); d.className = 'finestra';
  d.innerHTML = '<div class="in">' + html + '</div>';
  d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-chiudi]')) d.remove(); });
  document.body.appendChild(d); return d;
}

/* ---------- avvio ---------- */
function avvio() {
  carica();
  const q = new URLSearchParams(location.search); const p = q.get('libro');
  if (p && LIBRI[p] && q.get('codice')) { S.codicePend = S.codicePend || {}; S.codicePend[p] = q.get('codice'); salva(); }
  if (p && LIBRI[p]) {
    if (S.sblocchi[p]) apriLibro(p); else vai(p, 'domanda');
  } else {
    const aperti = Object.keys(LIBRI).filter((k) => S.sblocchi[k]);
    if (aperti.length === 1) apriLibro(aperti[0]); else vai(null, 'home');
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
function apriLibro(k) {
  if (!S.sblocchi[k]) return vai(k, 'domanda');
  if (S.codicePend && S.codicePend[k]) {
    const c = S.codicePend[k]; delete S.codicePend[k]; salva();
    if (!S.codici[k]) { provaCodice(k, c).then((ok) => { if (ok) vai(k, 'extra'); }); }
  }
  const st = S[k];
  if (!st.nomi) return vai(k, 'nomi');
  vai(k, k === 'avvento' ? 'calendario' : 'torneo');
}

function render() {
  const app = $('#app');
  const v = vista;
  let h = '';
  if (v.pagina === 'home') h = pHome();
  else if (v.pagina === 'domanda') h = pDomanda(v.libro);
  else if (v.pagina === 'email') h = pEmail(v.libro);
  else if (v.pagina === 'extra') h = pExtra();
  else if (v.pagina === 'nomi') h = v.libro === 'avvento' ? pNomiAv() : pNomiTo();
  else if (v.libro === 'avvento') h = ({ calendario: pCal, sera: pSera, punteggi: pPunti, crono: pCrono, aiuto: pAiutoAv })[v.pagina](v.param);
  else h = ({ torneo: pTorneo, tappa: pTappa, premi: pPremi, timer: pTimer, regole: pRegole })[v.pagina](v.param);
  app.innerHTML = h;
  document.body.style.background = v.libro === 'avvento' && v.pagina !== 'home' ? '#13265c' : v.libro === 'torneo' && v.pagina !== 'home' ? '#fbf5ec' : '#f4f1ea';
  aggancia();
}

/* ---------- HOME e accesso ---------- */
function pHome() {
  let h = '<div class="pag home senzanav"><div class="logo"><img src="img/logo.png" alt="">LUDIKA<br><small>EDIZIONI</small></div>';
  h += '<div class="anton centro" style="font-size:30px;color:#13265c;margin-top:4px">QUALE LIBRO AVETE?</div><div class="centro piccolo" style="margin-bottom:10px">Toccate la copertina del vostro libro</div>';
  for (const k of ['avvento', 'torneo']) {
    const L = LIBRI[k]; const ok = S.sblocchi[k];
    h += `<button class="libro" data-libro="${k}"><img src="${L.img}" alt="Copertina di ${esc(L.nome)}"><div class="t" style="color:${k === 'avvento' ? '#13265c' : '#c8102e'}">${esc(L.nome.toUpperCase())}<span style="${k === 'avvento' ? 'background:#f6c843;color:#13265c' : 'background:#c8102e;color:#fff'}">${ok ? 'APRI' : 'SCEGLI'}</span></div></button>`;
  }
  h += '<div class="centro piccolo" style="padding:4px 20px;color:#555">I dati del gioco restano solo su questo telefono.</div></div>';
  return h;
}
function domandaCorrente(k) {
  const d = S.domanda[k] || {};
  if (d.i == null) { d.i = Math.floor(Math.random() * 5); d.err = 0; S.domanda[k] = d; salva(); }
  return d;
}
function pDomanda(k) {
  const L = LIBRI[k]; const d = domandaCorrente(k); const [pag] = L.domande[d.i];
  const av = k === 'avvento';
  let h = `<div class="pag senzanav" style="${av ? 'background:linear-gradient(180deg,#1d3a86,#13265c);color:#fff' : 'background:linear-gradient(180deg,#c8102e,#9e0c22);color:#fff'}">`;
  h += `<div class="top"><button class="indietro" data-home>‹</button></div>`;
  h += `<div class="mini"><img src="${L.img}" alt=""><b>${esc(L.nome.toUpperCase())}</b></div>`;
  h += `<div class="card" style="color:${av ? '#13265c' : '#3a2a20'};border:0"><div class="anton" style="font-size:22px;color:${av ? '#13265c' : '#c8102e'}">PRENDETE IL LIBRO</div>`;
  h += L.perGiorno ? `<div style="margin:8px 0 12px;line-height:1.45">Cercate le pagine del Giorno ${pag}, il numero grande in alto a destra, e scrivete l'<b>ultima parola di uno dei due titoli</b>.</div>`
    : `<div style="margin:8px 0 12px;line-height:1.45">Apritelo a questa pagina e scrivete l'<b>ultima parola del titolo ${L.parola}</b>.</div>`;
  h += `<div class="centro" style="font-size:14px;font-weight:700">${L.perGiorno ? 'GIORNO' : 'PAGINA'}</div><div class="grande" style="color:${av ? '#13265c' : '#c8102e'}">${pag}</div>`;
  h += `<input class="campo" id="risp" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="La parola" style="${av ? '' : 'color:#3a2a20'}">`;
  if (d.err > 0) h += `<div class="errore">Non è la parola giusta. Controllate ${L.perGiorno ? 'le pagine del Giorno' : 'la pagina'} ${pag} e riprovate (tentativo ${d.err} di 3).</div>`;
  h += `<button class="btn in ${av ? 'b-gia' : 'b-r'}" data-verifica>ENTRA NELL'APP ›</button></div>`;
  h += `<div class="testo piccolo" style="opacity:.92">Maiuscole e accenti non contano. Dopo 3 tentativi sbagliati arriva un'altra domanda.</div>`;
  h += `<div class="testo piccolo" style="opacity:.92">Non avete ancora il libro? <a href="${CONFIG.amazon[k]}" target="_blank" rel="noopener" style="color:inherit;font-weight:700">Lo trovate su Amazon</a>.</div></div>`;
  return h;
}
function verifica(k) {
  const L = LIBRI[k]; const d = domandaCorrente(k); const giusta = L.domande[d.i][1];
  const r = norm($('#risp').value);
  if (!r) return;
  if ([].concat(giusta).includes(r)) {
    S.sblocchi[k] = true; S.domanda[k] = { i: d.i, ok: true }; salva();
    if (CONFIG.contatore) { try { fetch(CONFIG.contatore + '?libro=' + k, { method: 'POST', mode: 'no-cors', keepalive: true }); } catch (e) {} }
    apriLibro(k);
  } else {
    d.err = (d.err || 0) + 1;
    if (d.err >= 3) { let n; do { n = Math.floor(Math.random() * 5); } while (n === d.i); d.i = n; d.err = 0; }
    salva(); render();
    if (d.err === 0) finestra('<h3>Proviamo con ' + (L.perGiorno ? 'un altro giorno' : 'un\'altra pagina') + '</h3><p style="margin-bottom:14px">Tre risposte non giuste: ecco una domanda nuova.</p><button class="btn in b-blu" data-chiudi>VA BENE</button>');
  }
}
function pEmail(k) {
  const av = k === 'avvento';
  let h = `<div class="pag senzanav ${av ? 'av' : 'to'}"><div class="top"><div class="ttl" style="${av ? '' : 'color:#c8102e'}">RESTIAMO IN CONTATTO</div></div>`;
  h += `<div class="testo">Lasciate nome ed email se volete ricevere da Ludika Edizioni le novità sui nostri giochi. È facoltativo: l'app funziona lo stesso.</div>`;
  h += `<div style="margin:0 16px"><iframe class="modulo" src="${CONFIG.moduloEmail[k]}" title="Modulo email"></iframe></div>`;
  h += `<button class="btn ${av ? 'b-gia' : 'b-r'}" data-emailfatto>CONTINUA ›</button></div>`;
  return h;
}

/* ---------- AVVENTO ---------- */
const AV = () => S.avvento;
function oggiGiorno() {
  const o = new Date(); const m = o.getMonth();
  if (m === 11) return Math.min(o.getDate(), 24);
  if (m === 0) return 24;
  return 0;
}
function giornoFatto(g) { const r = AV().ris; return r[2 * g - 1] != null && r[2 * g] != null; }
function giornoAperto(g) {
  if (giornoFatto(g)) return true;
  if (g <= oggiGiorno()) return true;
  if (AV().libero && (g === 1 || giornoFatto(g - 1))) return true;
  return false;
}
function vittorie() { const v = [0, 0]; for (const n in AV().ris) { const x = AV().ris[n]; if (x === 0 || x === 1) v[x]++; } return v; }
function navAv(on) {
  const b = (p, i, t) => `<button data-av="${p}" class="${on === p ? 'on' : ''}"><i>${i}</i>${t}</button>`;
  return `<div class="nav">${b('calendario', '🎄', 'Calendario')}${b('punteggi', '🏆', 'Punteggi')}${b('crono', '⏱️', 'Cronometro')}${b('extra', '🔑', 'Soluzioni e bonus')}${b('aiuto', '❓', 'Aiuto')}</div>`;
}
function pNomiAv() {
  return `<div class="pag av senzanav"><div class="top"><div class="ttl">IL VOSTRO AVVENTO</div></div>
  <div class="card"><div class="anton" style="font-size:22px">COME VI CHIAMATE?</div>
  <label class="et">Primo giocatore</label><input class="campo" id="n1" maxlength="14" placeholder="Nome" value="${esc((AV().nomi || [''])[0])}">
  <label class="et">Secondo giocatore</label><input class="campo" id="n2" maxlength="14" placeholder="Nome" value="${esc((AV().nomi || ['', ''])[1])}">
  <button class="btn in b-gia" data-salvanomi="avvento">INIZIAMO ›</button></div>
  <div class="testo piccolo" style="opacity:.9">I nomi servono solo per il tabellone e restano su questo telefono.</div></div>`;
}
function pCal() {
  const og = oggiGiorno(); const o = new Date();
  let conta;
  if (og === 0) {
    const dic = new Date(o.getFullYear(), 11, 1); const gg = Math.ceil((dic - new Date(o.getFullYear(), o.getMonth(), o.getDate())) / 86400000);
    conta = `<div><div class="anton" style="font-size:18px">MANCANO</div><div class="piccolo">al 1° dicembre</div></div><div class="n">${gg} ${gg === 1 ? 'GIORNO' : 'GIORNI'}</div>`;
  } else if (o.getMonth() === 11 && o.getDate() < 24) {
    const n = 24 - o.getDate();
    conta = `<div><div class="anton" style="font-size:18px">MANCANO</div><div class="piccolo">alla Vigilia</div></div><div class="n">${n} ${n === 1 ? 'SERA' : 'SERE'}</div>`;
  } else {
    conta = `<div><div class="anton" style="font-size:18px">${o.getMonth() === 11 && o.getDate() === 24 ? 'STASERA' : 'BUONE FESTE'}</div><div class="piccolo">${o.getMonth() === 11 && o.getDate() === 24 ? 'il Gran Finale' : 'il torneo è aperto'}</div></div><div class="n">${o.getMonth() === 11 && o.getDate() === 24 ? 'VIGILIA' : '★'}</div>`;
  }
  let h = `<div class="pag av"><div class="top"><button class="indietro" data-home>‹</button><div class="ttl">IL VOSTRO AVVENTO</div></div><div class="conta">${conta}</div><div class="griglia">`;
  let prossimo = null;
  for (let g = 1; g <= 24; g++) {
    const f = giornoFatto(g), a = giornoAperto(g);
    if (!f && a && prossimo == null) prossimo = g;
    const c = f ? 'fatto' : a ? 'aperto' : 'chiuso';
    h += `<button class="g ${c} ${g === 24 ? 'vigilia' : ''}" data-giorno="${g}">${g}${g === 24 && !f ? '★' : ''}</button>`;
  }
  h += `</div><div class="leg"><span>✓ fatto</span><span>⬜ da fare</span><span>🔒 si apre quel giorno</span></div>`;
  if (prossimo) h += `<button class="btn b-gia" data-giorno="${prossimo}">GIORNO ${prossimo} ›</button>`;
  if (!AV().libero) h += `<button class="btn b-bia" data-libero>INIZIATE QUANDO VOLETE</button>`;
  h += `<div class="testo piccolo" style="opacity:.9">Il modo classico è dal 1° dicembre alla Vigilia. Avete iniziato in ritardo? I giorni già passati sono aperti: recuperate con più sfide nella stessa sera. Con «Iniziate quando volete» ogni giorno si apre appena finite il precedente.</div>`;
  return h + navAv('calendario') + '</div>';
}
function nomi() { return AV().nomi || ['Primo', 'Secondo']; }
function recVisibile(k) {
  const r = (S.recensione || {})[k] || {}; const ora = Date.now();
  if (r.stato === 'fatto') return false;
  if (r.dopo && ora < r.dopo) return false;
  if (r.stato === 'forse' && ora - r.ts < 7 * 864e5) return false;
  return true;
}
function cardStelle(k) {
  if (!recVisibile(k)) return '';
  return `<div class="card stelle"><div class="st">☆☆☆☆☆</div><div class="tx">La vostra opinione è importante: lasciate una recensione su Amazon, ci aiuta a fare giochi sempre migliori.</div><a class="btn in b-amz" href="${CONFIG.recensione[k]}" target="_blank" rel="noopener" data-recapri="${k}">LASCIA LA TUA RECENSIONE ›</a><div class="recbt"><button data-recdopo="${k}">Ricordamelo più tardi</button><button data-recfatto="${k}">L'ho già fatto</button></div></div>`;
}
function linkStelle(k) {
  return `<a class="link" style="display:block;margin:10px 16px 0;text-align:center;text-decoration:none" href="${CONFIG.recensione[k]}" target="_blank" rel="noopener" data-recapri="${k}"><span style="display:block;font-size:24px;letter-spacing:4px;color:#f6b400;line-height:1.1;margin-bottom:2px">☆☆☆☆☆</span><span style="text-decoration:underline">Lascia una recensione su Amazon ›</span></a>`;
}
function pSera(g) {
  const [a, b] = nomi(); const r = AV().ris; const date = g + ' DICEMBRE';
  let h = `<div class="pag av"><div class="top"><button class="indietro" data-av="calendario">‹</button><div class="ttl">GIORNO ${g} · ${date}</div></div>`;
  for (const n of [2 * g - 1, 2 * g]) {
    const s = SFIDE05[n - 1]; const x = r[n];
    const sup = n >= 47 ? ' · SUPER-SFIDA DEL GRAN FINALE' : '';
    h += `<div class="card sf"><div class="h"><span class="num">SFIDA ${n}${sup}</span></div><div class="nm">${esc(s[1])}</div>
    <div class="tags"><span class="tag">${esc(s[3])}</span><span class="tag">${s[4]} min.</span><span class="tag">${esc(s[5])}</span></div>
    <div class="nota">Chi ha vinto?</div><div class="chi"><button data-vince="${n}:0" class="${x === 0 ? 'sel' : ''}">${esc(a)}</button><button data-vince="${n}:1" class="${x === 1 ? 'sel' : ''}">${esc(b)}</button>${n === 47 ? '' : `<button data-pari="${n}">PARI</button>`}</div></div>`;
  }
  h += `<div class="fila"><button class="btn in b-gia" style="font-size:18px" data-av="crono">⏱️ CRONOMETRO</button><button class="btn in b-bia" style="font-size:18px" data-lampo>⚡ PROVA LAMPO</button></div>`;
  const x1 = r[2 * g - 1], x2 = r[2 * g];
  const pag = SFIDE05[2 * g - 1];
  if (x1 != null && x2 != null) {
    let perde;
    if (x1 === x2) perde = 1 - x1;
    else { const sl = AV().serate[g]; perde = sl == null ? null : sl; }
    h += `<div class="giallo"><div class="a">IL PEGNO DELLA SERATA</div>`;
    if (perde == null) {
      h += `<div class="nota">Serata 1 a 1: decide una prova lampo. Chi l'ha persa?</div><div class="chi"><button data-serata="${g}:0">${esc(a)}</button><button data-serata="${g}:1">${esc(b)}</button></div>`;
    } else {
      h += `<div class="nota"><b>${esc(nomi()[perde])}</b> ha perso la serata e paga un pegno: uno dolce o uno piccante, a scelta, in fondo alla sfida ${2 * g} del libro.</div>`;
    }
    h += `</div>`;
    if (g === 3 || g === 24) h += cardStelle('avvento');
    if (g === 24) h += `<button class="btn b-gia" data-av="punteggi">🏆 GUARDATE CHI HA VINTO</button>`;
    else if (giornoAperto(g + 1)) h += `<button class="btn b-bia" data-giorno="${g + 1}">GIORNO ${g + 1} ›</button>`;
  } else {
    h += `<div class="giallo"><div class="a">IL PEGNO DELLA SERATA</div><div class="nota">Chi perde la serata ne sceglie uno, dolce o piccante, in fondo alla sfida ${2 * g} del libro.</div></div>`;
  }
  return h + navAv('calendario') + '</div>';
}
function pPunti() {
  const [a, b] = nomi(); const v = vittorie(); const tot = v[0] + v[1];
  let lead = v[0] === v[1] ? 'PARITÀ' : (v[0] > v[1] ? a : b).toUpperCase() + ' IN TESTA DI ' + Math.abs(v[0] - v[1]);
  const fine = tot >= 48;
  if (fine) lead = v[0] === v[1] ? 'PARITÀ: DECIDE UNA PROVA LAMPO' : 'CAMPIONE DI NATALE: ' + (v[0] > v[1] ? a : b).toUpperCase();
  let h = `<div class="pag av"><div class="top"><button class="indietro" data-av="calendario">‹</button><div class="ttl">LA GARA FINO ALLA VIGILIA</div></div>
  <div class="punti"><div class="p ${v[0] > v[1] ? 'cap' : ''}"><div class="nmx">${esc(a.toUpperCase())}</div><div class="v">${v[0]}</div><div class="piccolo">vittorie</div></div><div class="p ${v[1] > v[0] ? 'cap' : ''}"><div class="nmx">${esc(b.toUpperCase())}</div><div class="v">${v[1]}</div><div class="piccolo">vittorie</div></div></div>
  <div class="testa">${esc(lead)}</div>
  <div class="barra"><div style="display:flex;justify-content:space-between" class="piccolo"><span>${tot} sfide su 48</span><span>Gran Finale il 24</span></div><div class="tr"><div class="fi" style="width:${Math.round(tot / 48 * 100)}%"></div></div></div>`;
  if (fine) h += `<div class="giallo"><div class="a">🏆 IL TORNEO È FINITO</div><div class="nota">Compilate insieme le ultime pagine del libro: i due buoni per chi ha vinto e l'attestato di coppia.</div></div>`;
  if (tot >= 10 && !fine) h += `<div class="trat"><div class="a">CHECKPOINT DOPO 10 SFIDE</div>Sommate i punti e assegnate un piccolo premio a chi è in testa, ad esempio scegliere il film o la pizza della serata.</div>`;
  const fatti = Object.keys(AV().ris).map(Number).sort((x, y) => y - x);
  if (fatti.length) {
    h += `<div class="sez">ULTIME SFIDE</div><div class="elenco">`;
    for (const n of fatti.slice(0, 12)) { const s = SFIDE05[n - 1]; h += `<div class="riga"><span>Giorno ${s[2]} · ${esc(s[1].charAt(0) + s[1].slice(1).toLowerCase())}</span><b>${esc(nomi()[AV().ris[n]].toUpperCase())}</b></div>`; }
    h += `</div>`;
  } else h += `<div class="testo">Il tabellone si riempie man mano che segnate chi vince le sfide.</div>`;
  if (tot >= 10) h += cardStelle('avvento');
  return h + navAv('punteggi') + '</div>';
}
let T = { avvio: 0, base: 0, va: false, giu: 0, tipo: 'su', id: null };
function pCrono() { return pOrologio('avvento') + navAv('crono') + '</div>'; }
function pOrologio(k) {
  const av = k === 'avvento';
  let h = `<div class="pag ${av ? 'av' : 'to'}">`;
  h += av ? `<div class="top"><button class="indietro" data-av="calendario">‹</button><div class="ttl">CRONOMETRO</div></div>` : `<div class="hd"><div class="top"><button class="indietro" data-to="torneo">‹</button><div class="ttl">TIMER <span class="gold">· al posto di quello da cucina</span></div></div></div>`;
  h += `<div class="orologio" id="cerchio"><div><b id="tempo">0:00</b><span class="piccolo" id="sotto"></span></div></div>`;
  const preset = av ? [0, 1, 2, 3, 5] : [1, 5, 10, 15];
  h += `<div class="fila">` + preset.map((m) => `<button class="chip" data-preset="${m}">${m === 0 ? 'CRONO' : m + ' MIN'}</button>`).join('') + `</div>`;
  h += `<div class="fila"><button class="btn in ${av ? 'b-gia' : 'b-oro'}" id="avvia" data-avvia>▶ AVVIA</button><button class="btn in ${av ? 'b-bia' : 'b-bordo'}" data-dacapo>↺ DA CAPO</button></div>`;
  if (!av) h += pJolly();
  return h;
}
function pAiutoAv() {
  let h = `<div class="pag av"><div class="top"><button class="indietro" data-av="calendario">‹</button><div class="ttl">AIUTO</div></div><div class="card testo" style="margin:8px 16px">
  <p><b>Come si gioca.</b> Disponetevi uno di fronte all'altro, con il libro aperto in mezzo. 48 sfide numerate, 2 al giorno: il modo classico è iniziare il 1° dicembre e arrivare alla sera della Vigilia.</p>
  <p><b>Pareggio.</b> Scegliete insieme una prova lampo o un mini-duello improvvisato, poi segnate chi l'ha vinta.</p>
  <p><b>Checkpoint.</b> Dopo 10 sfide sommate i punti e assegnate un piccolo premio a chi è in testa.</p>
  <p><b>Il pegno della serata.</b> Chi perde la serata paga un pegno: in fondo alla seconda sfida di ogni giorno ce ne sono due, uno dolce e uno piccante. Serata 1 a 1? Decide una prova lampo.</p>
  <p><b>Gran Finale.</b> Il 24 ci sono due super-sfide per incoronare il Campione o la Campionessa di Natale.</p>
  <p><b>I vostri dati.</b> Nomi e risultati restano solo su questo telefono.</p></div>
  ${linkStelle('avvento')}<button class="btn b-bia" data-cambia>CAMBIA LIBRO</button><button class="btn b-tenue" data-azzera="avvento">RICOMINCIA DA CAPO</button>`;
  return h + navAv('aiuto') + '</div>';
}
const LAMPO_IDEE = ['Testa o croce con una moneta.', 'Sasso, carta, forbice: vince chi arriva a 2.', 'Pari o dispari con le dita.', 'Gara di sguardi: perde chi ride per primo.', 'Chi dice più parole natalizie in 30 secondi.'];

/* ---------- TORNEO ---------- */
const TO = () => S.torneo;
const PREMI = {
  coppia: ['Massaggio alle spalle.', 'Colazione a letto.', 'Scegli il film.', 'Niente piatti per un giorno.', "Una cena cucinata dall'altro.", 'Passeggiata dove dici tu.', 'Il posto migliore sul divano.'],
  amici: ['Un caffè offerto.', 'Scegli dove uscire.', 'Un messaggio di complimenti.', 'Scegli la musica.', 'Uno spuntino offerto.', 'Scegli il prossimo film.', 'Un gelato offerto.'],
  famiglia: ['Scegli il film.', "Una merenda fatta dall'altro.", 'Scegli il dolce della domenica.', 'Un abbraccio di un minuto.', "L'altro riordina per te.", 'Scegli il gioco di domani.', 'Una storia raccontata a te.']
};
const PEGNI = {
  coppia: ["Canta una canzone d'amore.", "Di' tre cose che ami dell'altro.", "Scrivi un biglietto d'amore.", "Racconta un ricordo d'infanzia.", 'Racconta il primo incontro come una fiaba.', 'Massaggio ai piedi.', 'Rifai il letto domani.'],
  amici: ["Canta una canzone scelta dall'altro.", 'Parla da robot per un minuto.', 'Racconta la tua figura più buffa.', 'Fai il verso di tre animali.', 'Telecronaca di un minuto.', 'Un complimento in rima.', 'Inventa un saluto segreto.'],
  famiglia: ['Fai il verso di tre animali.', 'Una storia di un minuto.', 'Sparecchia la tavola.', "Canta una canzone scelta dall'altro.", 'Cammina come un robot.', 'Racconta la cosa più bella di oggi.', 'Parla con una voce buffa.']
};
const LAMPO = {
  coppia: ['Un bacio sulla guancia.', 'Una dichiarazione in 5 parole.', 'Un complimento sul sorriso.', 'Occhi negli occhi per 10 secondi.', "Un applauso all'altro.", "Una frase d'amore sussurrata.", "Canta il nome dell'altro."],
  amici: ["Un applauso all'altro.", "Di' «sei un genio», serio.", 'Fai un inchino.', 'Imita una gallina.', 'Fai una faccia buffa.', "Di' il tuo nome al contrario.", "Un complimento all'altro."],
  famiglia: ["Fai l'occhiolino.", 'Fai una faccia buffa.', "Dai il cinque all'altro.", 'Fai un inchino.', 'Fai il verso del gatto.', "Di' «bravo» o «brava».", 'Fai un abbraccio.']
};
function nomiTo() { return TO().nomi || ['A', 'B']; }
function puntiGioco(n) {
  const x = TO().ris[n]; if (!x) return [0, 0];
  const fin = n === 45; const d = TO().doppio[n];
  if (x === 'A') return [fin ? 6 : d === 'A' ? 6 : 3, 0];
  if (x === 'B') return [0, fin ? 6 : d === 'B' ? 6 : 3];
  if (x === 'P') return [fin ? 2 : d === 'A' ? 2 : 1, fin ? 2 : d === 'B' ? 2 : 1];
  return [0, 0];
}
function puntiTappa(t) { const p = [0, 0]; for (let n = 5 * t - 4; n <= 5 * t; n++) { const q = puntiGioco(n); p[0] += q[0]; p[1] += q[1]; } return p; }
function tappaFinita(t) { for (let n = 5 * t - 4; n <= 5 * t; n++) if (!TO().ris[n]) return false; return true; }
function vincitoreTappa(t) { if (!tappaFinita(t)) return null; const p = puntiTappa(t); return p[0] > p[1] ? 'A' : p[1] > p[0] ? 'B' : 'P'; }
function totale() { const p = [0, 0]; for (let t = 1; t <= 9; t++) { const q = puntiTappa(t); p[0] += q[0]; p[1] += q[1]; } return p; }
function navTo(on) {
  const b = (p, i, t) => `<button data-to="${p}" class="${on === p ? 'on' : ''}"><i>${i}</i>${t}</button>`;
  return `<div class="nav">${b('torneo', '🏆', 'Torneo')}${b('premi', '🎁', 'Premi e pegni')}${b('timer', '⏱️', 'Timer e jolly')}${b('extra', '🔑', 'Soluzioni e bonus')}${b('regole', '❓', 'Regole')}</div>`;
}
function pNomiTo() {
  return `<div class="pag to senzanav"><div class="hd"><div class="top"><div class="ttl">GIOCHI IN DUE <span class="gold">· il patto</span></div></div></div>
  <div class="card"><div style="font-weight:700;font-size:18px;color:#c8102e">CHI GIOCA?</div>
  <label class="et">Giocatore A (pagina di sinistra)</label><input class="campo" id="n1" maxlength="14" placeholder="Nome" value="${esc((TO().nomi || [''])[0])}">
  <label class="et">Giocatore B (pagina di destra)</label><input class="campo" id="n2" maxlength="14" placeholder="Nome" value="${esc((TO().nomi || ['', ''])[1])}">
  <label class="et">Lista di premi e pegni</label><div class="seg" style="margin:0" id="lista">${['coppia', 'amici', 'famiglia'].map((l) => `<button data-sceglilista="${l}" class="${TO().lista === l ? 'on' : ''}">${l[0].toUpperCase() + l.slice(1)}</button>`).join('')}</div>
  <button class="btn in b-r" data-salvanomi="torneo">INIZIA IL TORNEO ›</button></div>
  <div class="testo piccolo">È lo stesso Patto dei giocatori di pagina 11. I nomi restano su questo telefono.</div></div>`;
}
function pTorneo() {
  const [a, b] = nomiTo(); const tot = totale();
  let h = `<div class="pag to"><div class="hd"><div class="top"><button class="indietro" data-home>‹</button><div class="ttl">GIOCHI IN DUE <span class="gold">· il torneo</span></div></div>
  <div class="vs"><div class="pl"><div class="n">A · ${esc(a.toUpperCase())}</div><div class="v">${tot[0]}</div><div class="s">punti</div></div><div class="vsx">VS</div><div class="pl"><div class="n">B · ${esc(b.toUpperCase())}</div><div class="v">${tot[1]}</div><div class="s">punti</div></div></div></div>`;
  h += `<div class="sez">LE 9 TAPPE · 5 GIOCHI L'UNA</div><div class="tappe">`;
  let corso = null;
  for (let t = 1; t <= 9; t++) {
    const w = vincitoreTappa(t); let c = '', lab = '&nbsp;';
    if (w === 'A' || w === 'B') { c = 'vinta'; lab = esc(nomiTo()[w === 'A' ? 0 : 1].toUpperCase()); }
    else if (w === 'P') { c = 'pari'; lab = 'PARI'; }
    else if (corso == null) { corso = t; c = 'corso'; lab = Object.keys(TO().ris).some((n) => n > 5 * t - 5 && n <= 5 * t) ? 'IN CORSO' : 'PROSSIMA'; }
    if (t === 9 && !w) lab = corso === 9 ? lab : 'FINALISSIMA';
    h += `<button class="tp ${c} ${t === 9 ? 'fin' : ''}" data-tappa="${t}"><div class="k">TAPPA ${t}</div><div class="b">${5 * t - 4}-${5 * t}</div><div class="w">${lab}</div></button>`;
  }
  h += `</div>`;
  if (corso) h += `<button class="btn b-r" data-tappa="${corso}">${Object.keys(TO().ris).some((n) => n > 5 * corso - 5 && n <= 5 * corso) ? 'CONTINUA' : 'GIOCA'} LA TAPPA ${corso} ›</button>`;
  else h += campione();
  const daChiudere = [...Array(9).keys()].map((i) => i + 1).filter((t) => (vincitoreTappa(t) === 'A' || vincitoreTappa(t) === 'B') && !(TO().tappe[t] || {}).chiusa);
  if (daChiudere.length) h += `<button class="btn b-oro" data-to="premi">🎁 PREMIO E PEGNO DELLA TAPPA ${daChiudere[0]}</button>`;
  h += `<button class="btn b-bordo" data-nuovotorneo>NUOVO TORNEO</button>`;
  if (!corso) h += cardStelle('torneo');
  return h + navTo('torneo') + '</div>';
}
function campione() {
  const [a, b] = nomiTo(); const tot = totale(); let w;
  if (tot[0] !== tot[1]) w = tot[0] > tot[1] ? a : b;
  else {
    const f = TO().ris[45];
    if (f === 'A' || f === 'B') w = f === 'A' ? a : b;
    else {
      const g = [0, 0]; for (const n in TO().ris) { if (TO().ris[n] === 'A') g[0]++; if (TO().ris[n] === 'B') g[1]++; }
      if (g[0] !== g[1]) w = g[0] > g[1] ? a : b;
      else { const tp = [0, 0]; for (let t = 1; t <= 9; t++) { const v = vincitoreTappa(t); if (v === 'A') tp[0]++; if (v === 'B') tp[1]++; } w = tp[0] !== tp[1] ? (tp[0] > tp[1] ? a : b) : null; }
    }
  }
  return `<div class="card centro" style="background:#f4c95d;border-color:#e0a526"><div style="font-size:40px">🏆</div><div class="anton" style="font-size:28px">${w ? 'CAMPIONE: ' + esc(w.toUpperCase()) : 'CAMPIONI A PARI MERITO'}</div><div class="piccolo">Scrivetelo nell'Albo d'oro a pagina 10.</div></div>`;
}
function pTappa(t) {
  const [a, b] = nomiTo(); const p = puntiTappa(t);
  let h = `<div class="pag to"><div class="hd"><div class="top"><button class="indietro" data-to="torneo">‹</button><div class="ttl">TAPPA ${t} · <span class="gold">${esc(a.toUpperCase())} ${p[0]} · ${esc(b.toUpperCase())} ${p[1]}</span></div></div></div>`;
  for (let n = 5 * t - 4; n <= 5 * t; n++) {
    const g = GIOCHI06[n - 1]; const x = TO().ris[n]; const q = puntiGioco(n); const d = TO().doppio[n];
    let res = '';
    if (x === 'A') res = esc(a.toUpperCase()) + ' +' + q[0]; else if (x === 'B') res = esc(b.toUpperCase()) + ' +' + q[1]; else if (x === 'P') res = 'PARI'; else if (x === 'S') res = 'SALTATO';
    h += `<div class="card gi"><div class="h"><div class="nu">${n}</div><div class="nm">${n === 45 ? 'FINALISSIMA · ' : ''}${esc(g[1])}</div><div class="res">${res}</div></div>
    <div class="tags"><span class="tag k">${esc(g[2].toUpperCase())}</span>${g[3] ? `<span class="tag">${g[3]} min</span>` : ''}${g[4] ? `<span class="tag">da ${g[4]} anni</span>` : ''}${g[5] ? `<span class="tag">timer ${g[5]}</span>` : ''}<span class="tag">pag. ${g[6]}-${g[7]}</span></div>
    <div class="corpo"><div class="chi"><button data-ris="${n}:A" class="${x === 'A' ? 'sel' : ''}">${esc(a)}</button><button data-ris="${n}:B" class="${x === 'B' ? 'sel' : ''}">${esc(b)}</button><button data-ris="${n}:P" class="${x === 'P' ? 'sel' : ''}">PARI</button><button data-ris="${n}:S" class="${x === 'S' ? 'sel' : ''}" title="Gioco saltato per l'età">SALTA</button></div>`;
    if (n !== 45) {
      const dis = ['A', 'B'].filter((w) => d === w || !TO().jolly[w].doppio);
      if (d) h += `<div class="nota" style="color:#c8102e;font-weight:700">★ Jolly «Doppio» di ${esc(nomiTo()[d === 'A' ? 0 : 1])} su questo gioco <button class="link" data-togliDoppio="${n}">annulla</button></div>`;
      else if (!x && dis.length) h += `<div class="nota">Jolly «Doppio» prima di giocare: ${dis.map((w) => `<button class="link" data-doppio="${n}:${w}">${esc(nomiTo()[w === 'A' ? 0 : 1])}</button>`).join(' · ')}</div>`;
    } else h += `<div class="nota">La Finalissima vale doppio: 6 punti a chi vince, 2 a testa se è pari.</div>`;
    if (g[5]) h += `<button class="link" data-to="timer">⏱️ Apri il timer da ${g[5]}</button> `;
    if ((x === 'A' || x === 'B') && ![19, 36, 45].includes(n)) h += `<button class="link" data-lampoTo="${n}">Perso male? Pegno lampo</button>`;
    h += `</div></div>`;
  }
  const w = vincitoreTappa(t);
  if (w) {
    h += `<div class="card centro"><div class="anton" style="font-size:24px;color:#c8102e">${w === 'P' ? 'TAPPA PARI: NIENTE PEGNO' : 'HA VINTO ' + esc(nomiTo()[w === 'A' ? 0 : 1].toUpperCase())}</div>${w !== 'P' ? `<button class="btn in b-oro" data-to="premi">🎁 PREMIO E PEGNO ›</button>` : ''}</div>`;
    if (t < 9) h += `<button class="btn b-r" data-tappa="${t + 1}">TAPPA ${t + 1} ›</button>`;
    else h += `<button class="btn b-r" data-to="torneo">🏆 CLASSIFICA FINALE</button>`;
  }
  if (vincitoreTappa(t) && [1, 5, 9].includes(t)) h += cardStelle('torneo');
  return h + navTo('torneo') + '</div>';
}
function pPremi() {
  const lista = TO().lista; const [a, b] = nomiTo();
  const t = [...Array(9).keys()].map((i) => i + 1).find((x) => (vincitoreTappa(x) === 'A' || vincitoreTappa(x) === 'B') && !(TO().tappe[x] || {}).chiusa);
  let h = `<div class="pag to"><div class="hd"><div class="top"><button class="indietro" data-to="torneo">‹</button><div class="ttl">PREMI E PEGNI</div></div></div>`;
  h += `<div class="seg">${['coppia', 'amici', 'famiglia'].map((l) => `<button data-lista="${l}" class="${lista === l ? 'on' : ''}">${l[0].toUpperCase() + l.slice(1)}</button>`).join('')}</div>`;
  if (!t) {
    h += `<div class="testo">Qui arrivate quando qualcuno vince una tappa: sceglie un premio e indica due pegni, chi ha perso sceglie quale fare. Le liste sono quelle delle pagine 8 e 9.</div>`;
    h += elencoSemplice('PREMI', PREMI[lista], TO().premiUsati) + elencoSemplice('PEGNI DI TAPPA', PEGNI[lista], TO().pegniUsati);
    return h + navTo('premi') + '</div>';
  }
  const w = vincitoreTappa(t); const vi = w === 'A' ? 0 : 1; const pe = 1 - vi; const st = TO().tappe[t] = TO().tappe[t] || {};
  h += `<div class="sez">TAPPA ${t} · HA VINTO ${esc(nomiTo()[vi].toUpperCase())}</div>`;
  // premio
  h += `<div class="sez" style="margin-top:4px">${esc(nomiTo()[vi].toUpperCase())} SCEGLIE UN PREMIO</div><div class="scatola">`;
  PREMI[lista].forEach((p, i) => { const u = TO().premiUsati.includes(i) && st.premio !== i; h += `<button class="voce ${u ? 'usato' : ''} ${st.premio === i ? 'on' : ''}" ${u ? 'disabled' : `data-premio="${t}:${i}"`}><span class="qd">${st.premio === i || u ? '✓' : ''}</span>${i + 1}. ${esc(p)}</button>`; });
  h += `</div><div class="testo piccolo">Il premio lo offre chi ha perso. Se la lista finisce, si riparte da capo.</div>`;
  // pegni
  const usati = TO().pegniUsati; const liberi = PEGNI[lista].map((_, i) => i).filter((i) => !usati.includes(i) || (st.indicati || []).includes(i));
  const scelgo = st.scelgoIo;
  h += `<div class="sez">${scelgo ? esc(nomiTo()[vi].toUpperCase()) + ' SCEGLIE IL PEGNO (JOLLY «SCELGO IO»)' : esc(nomiTo()[vi].toUpperCase()) + ' INDICA DUE PEGNI, ' + esc(nomiTo()[pe].toUpperCase()) + ' NE FA UNO'}</div><div class="scatola">`;
  PEGNI[lista].forEach((p, i) => {
    const u = !liberi.includes(i); const ind = (st.indicati || []).includes(i); const fatto = st.pegno === i;
    h += `<button class="voce ${u ? 'usato' : ''} ${ind || fatto ? 'on' : ''}" ${u ? 'disabled' : `data-pegno="${t}:${i}"`}><span class="qd">${ind || fatto || u ? '✓' : ''}</span>${i + 1}. ${esc(p)}${fatto ? ' <b>← da fare</b>' : ''}</button>`;
  });
  h += `</div>`;
  const jv = TO().jolly[w]; const jp = TO().jolly[pe === 0 ? 'A' : 'B'];
  h += `<div class="fila" style="flex-wrap:wrap">`;
  if (!scelgo && !jv.scelgo && st.pegno == null) h += `<button class="chip" data-scelgoio="${t}">Jolly «Scelgo io» di ${esc(nomiTo()[vi])}</button>`;
  if (!jp.scudo && !st.scudo && st.pegno != null) h += `<button class="chip" data-scudo="${t}">Jolly «Scudo» di ${esc(nomiTo()[pe])}</button>`;
  h += `</div>`;
  if (st.scudo) h += `<div class="card centro"><b>Scudo usato: il pegno è cancellato.</b></div>`;
  if (st.premio != null && (st.pegno != null || st.scudo)) h += `<button class="btn b-r" data-chiuditappa="${t}">FATTO ✓</button>`;
  else h += `<div class="testo piccolo">${scelgo ? 'Toccate il pegno scelto.' : 'Toccate i due pegni indicati da chi ha vinto, poi quello scelto da chi ha perso.'} Si usano una volta sola; quando ne resta uno solo, valgono di nuovo tutti.</div>`;
  return h + navTo('premi') + '</div>';
}
function elencoSemplice(t, arr, usati) {
  let h = `<div class="sez">${t}</div><div class="scatola">`;
  arr.forEach((p, i) => { h += `<div class="voce ${usati.includes(i) ? 'usato' : ''}"><span class="qd">${usati.includes(i) ? '✓' : ''}</span>${i + 1}. ${esc(p)}</div>`; });
  return h + '</div>';
}
function pJolly() {
  const [a, b] = nomiTo();
  const riga = (w, n) => `<div style="font-weight:700;font-size:14px;margin-top:8px">${w} · ${esc(n)}</div><div class="fila" style="margin:6px 0 0">${['doppio', 'scelgo', 'scudo'].map((j) => `<button class="chip ${TO().jolly[w][j] ? 'usato' : ''}" data-jolly="${w}:${j}">${{ doppio: 'DOPPIO', scelgo: 'SCELGO IO', scudo: 'SCUDO' }[j]}</button>`).join('')}</div>`;
  return `<div class="sez">I JOLLY · 3 A TESTA, UNA VOLTA SOLA</div><div class="scatola" style="padding:8px 12px 12px">${riga('A', a)}${riga('B', b)}</div><div class="testo piccolo">Doppio: dillo prima di un gioco (si segna nella tappa). Scelgo io: quando vinci una tappa scegli tu il pegno. Scudo: cancella un pegno che ti tocca. Toccate un jolly per segnarlo usato o di nuovo libero.</div>`;
}
function pTimer() { return pOrologio('torneo') + navTo('timer') + '</div>'; }
function pRegole() {
  return `<div class="pag to"><div class="hd"><div class="top"><button class="indietro" data-to="torneo">‹</button><div class="ttl">LE REGOLE IN 2 MINUTI</div></div></div><div class="card testo" style="margin:10px 16px">
  <p><b>Punti.</b> Vince il gioco chi fa più punti. Nel tabellone: 3 punti a chi vince, 1 a testa se è pari, 0 a chi perde. La Finalissima (gioco 45) vale doppio: 6 punti a chi vince, 2 a testa se è pari.</p>
  <p><b>Tappe.</b> 45 giochi in 9 tappe da 5. Vince la tappa chi fa più punti nei suoi 5 giochi. Dopo ogni tappa chi l'ha vinta sceglie un premio e indica due pegni; tappa pari, niente pegno.</p>
  <p><b>Pegno lampo.</b> Chi perde male (l'altro ha almeno il doppio dei suoi punti e almeno 4 più di lui, oppure ha detto STOP con un errore) fa subito un pegno lampo. Niente pegno lampo nei giochi 19, 36 e 45.</p>
  <p><b>Gioco per un'età più alta.</b> Se uno dei due è più piccolo, saltatelo: nessuno prende punti.</p>
  <p><b>Torneo pari.</b> Vince chi ha vinto la Finalissima; se no, chi ha vinto più giochi, poi più tappe; se no, campioni a pari merito.</p>
  <p>Le regole complete sono alle pagine 4 e 5 del libro. Le soluzioni sono qui nell'app, alla voce «Soluzioni e bonus».</p>
  <p><b>I vostri dati.</b> Nomi e punti restano solo su questo telefono.</p></div>
  ${linkStelle('torneo')}<button class="btn b-bordo" data-cambia>CAMBIA LIBRO</button><button class="btn b-bordo" data-azzera="torneo" style="opacity:.8">CANCELLA TUTTO IL TORNEO</button>` + navTo('regole') + '</div>';
}

/* ---------- eventi ---------- */
function aggancia() {
  const app = $('#app');
  app.onclick = (e) => {
    const el = e.target.closest('button,[data-libro],a[data-recapri]'); if (!el) return;
    const D = el.dataset;
    if (D.recapri) { S.recensione = S.recensione || {}; const r = S.recensione[D.recapri] = S.recensione[D.recapri] || {}; r.cliccato = true; salva(); return; }
    if (D.recdopo) { S.recensione = S.recensione || {}; const r = S.recensione[D.recdopo] = S.recensione[D.recdopo] || {}; r.dopo = Date.now() + 864e5; salva(); return render(); }
    if (D.recfatto) { S.recensione = S.recensione || {}; const r = S.recensione[D.recfatto] = S.recensione[D.recfatto] || {}; r.stato = (r.cliccato || r.stato === 'forse') ? 'fatto' : 'forse'; r.ts = Date.now(); r.dopo = 0; salva(); return render(); }
    if (vista.pagina === 'extra' && agganciaExtra(D)) return;
    if (D.libro) return apriLibro(D.libro);
    if ('home' in D || 'cambia' in D) return vai(null, 'home');
    if ('verifica' in D) return verifica(vista.libro);
    if ('emailfatto' in D) { S.email[vista.libro] = 'visto'; salva(); return apriLibro(vista.libro); }
    if (D.salvanomi) {
      const n1 = $('#n1').value.trim(), n2 = $('#n2').value.trim();
      if (!n1 || !n2) return finestra('<h3>Mancano i nomi</h3><p style="margin-bottom:14px">Scrivete il nome di tutti e due i giocatori.</p><button class="btn in b-blu" data-chiudi>OK</button>');
      const k = D.salvanomi, prima = S[k].nomi, v = S.vincoli[k];
      const cambiati = !prima || prima[0] !== n1 || prima[1] !== n2;
      if (cambiati && prima && v) {
        if (!nomiModificabili(k)) return nomiBloccati(k);
        v.cambi = (v.cambi || 0) + 1;
      }
      if (!v) S.vincoli[k] = { t0: Date.now(), cambi: 0 };
      S[k].nomi = [n1, n2]; salva(); if (vista.param === 'extra') return vai(k, 'extra'); return apriLibro(k);
    }
    if (D.sceglilista) { TO().lista = D.sceglilista; salva(); const n1 = $('#n1').value, n2 = $('#n2').value; render(); $('#n1').value = n1; $('#n2').value = n2; return; }
    if (D.av) return vai('avvento', D.av);
    if (D.to) return vai('torneo', D.to);
    if (D.giorno) { const g = +D.giorno; if (!giornoAperto(g)) return finestra(`<h3>Il giorno ${g} non è ancora aperto</h3><p style="margin-bottom:14px">Si apre il ${g} dicembre. Se volete giocare al vostro ritmo, toccate «Iniziate quando volete» nel calendario: ogni giorno si apre appena finite il precedente.</p><button class="btn in b-blu" data-chiudi>OK</button>`); return vai('avvento', 'sera', g); }
    if ('libero' in D) { AV().libero = true; salva(); return render(); }
    if (D.vince) { const [n, w] = D.vince.split(':').map(Number); AV().ris[n] = w; delete AV().serate[Math.ceil(n / 2)]; salva(); return render(); }
    if (D.pari) return finestra(`<h3>Pareggio</h3><p style="margin-bottom:10px">Scegliete insieme una prova lampo o un mini-duello improvvisato, poi segnate chi l'ha vinta. Qualche idea:</p><ul style="margin:0 0 14px 18px;line-height:1.6">${LAMPO_IDEE.map((x) => '<li>' + x + '</li>').join('')}</ul><button class="btn in b-blu" data-chiudi>OK</button>`);
    if ('lampo' in D) return finestra(`<h3>Prova lampo</h3><p style="margin-bottom:10px">Qualche idea per decidere in fretta:</p><ul style="margin:0 0 14px 18px;line-height:1.6">${LAMPO_IDEE.map((x) => '<li>' + x + '</li>').join('')}</ul><button class="btn in b-blu" data-chiudi>OK</button>`);
    if (D.serata) { const [g, w] = D.serata.split(':').map(Number); AV().serate[g] = w; salva(); return render(); }
    if (D.azzera) { const k = D.azzera; const f = finestra(`<h3>Ricominciare da capo?</h3><p style="margin-bottom:14px">Si cancellano i risultati di ${esc(LIBRI[k].nome)} su questo telefono. I nomi restano. Non si può annullare.</p><button class="btn in b-r" id="okaz">SÌ, CANCELLA</button><button class="btn in b-bia" style="border:2px solid #ccc" data-chiudi>NO</button>`); f.querySelector('#okaz').onclick = () => { const n = S[k].nomi; S[k] = k === 'avvento' ? { nomi: null, ris: {}, libero: false, serate: {} } : nuovoTorneo(); S[k].nomi = n; salva(); f.remove(); apriLibro(k); }; return; }
    if ('nuovotorneo' in D) { const f = finestra(`<h3>Nuovo torneo?</h3><p style="margin-bottom:14px">Si azzerano punti, jolly, premi e pegni. I nomi restano.</p><button class="btn in b-r" id="oknt">SÌ, NUOVO TORNEO</button><button class="btn in b-bia" style="border:2px solid #ccc" data-chiudi>NO</button>`); f.querySelector('#oknt').onclick = () => { const n = TO().nomi, l = TO().lista; S.torneo = nuovoTorneo(); S.torneo.nomi = n; S.torneo.lista = l; salva(); f.remove(); render(); }; return; }
    if (D.tappa) return vai('torneo', 'tappa', +D.tappa);
    if (D.ris) { const [n, w] = D.ris.split(':'); if (TO().ris[n] === w) delete TO().ris[n]; else TO().ris[n] = w; salva(); return render(); }
    if (D.doppio) { const [n, w] = D.doppio.split(':'); TO().doppio[n] = w; TO().jolly[w].doppio = true; salva(); return render(); }
    if (D.toglidoppio) { const n = D.toglidoppio; const w = TO().doppio[n]; delete TO().doppio[n]; if (w) TO().jolly[w].doppio = false; salva(); return render(); }
    if (D.lampoto) { const l = TO().lista; return finestra(`<h3>Pegno lampo</h3><p style="margin-bottom:8px">Si perde male quando l'altro ha almeno il doppio dei tuoi punti e almeno 4 più di te, oppure quando hai detto STOP con un errore. Chi ha vinto ne indica due, chi ha perso ne fa subito uno.</p><ol style="margin:0 0 14px 20px;line-height:1.6">${LAMPO[l].map((x) => '<li>' + esc(x) + '</li>').join('')}</ol><button class="btn in b-r" data-chiudi>OK</button>`); }
    if (D.lista) { TO().lista = D.lista; salva(); return render(); }
    if (D.premio) { const [t, i] = D.premio.split(':').map(Number); const st = TO().tappe[t]; if (st.premio != null) TO().premiUsati = TO().premiUsati.filter((x) => x !== st.premio); st.premio = i; if (!TO().premiUsati.includes(i)) TO().premiUsati.push(i); salva(); return render(); }
    if (D.pegno) {
      const [t, i] = D.pegno.split(':').map(Number); const st = TO().tappe[t]; st.indicati = st.indicati || [];
      if (st.scelgoIo || st.indicati.length >= 2) { if (st.scelgoIo || st.indicati.includes(i)) { st.pegno = i; } }
      else if (st.indicati.includes(i)) st.indicati = st.indicati.filter((x) => x !== i);
      else st.indicati.push(i);
      salva(); return render();
    }
    if (D.scelgoio) { const t = +D.scelgoio; const st = TO().tappe[t]; st.scelgoIo = true; st.indicati = []; const w = vincitoreTappa(t); TO().jolly[w].scelgo = true; salva(); return render(); }
    if (D.scudo) { const t = +D.scudo; const st = TO().tappe[t]; st.scudo = true; const w = vincitoreTappa(t) === 'A' ? 'B' : 'A'; TO().jolly[w].scudo = true; salva(); return render(); }
    if (D.chiuditappa) {
      const t = +D.chiuditappa; const st = TO().tappe[t];
      if (st.pegno != null && !st.scudo && !TO().pegniUsati.includes(st.pegno)) TO().pegniUsati.push(st.pegno);
      if (7 - TO().pegniUsati.length <= 1) TO().pegniUsati = [];
      if (TO().premiUsati.length >= 7) TO().premiUsati = [];
      st.chiusa = true; salva(); return vai('torneo', 'torneo');
    }
    if (D.jolly) { const [w, j] = D.jolly.split(':'); TO().jolly[w][j] = !TO().jolly[w][j]; salva(); return render(); }
    if (D.preset != null) return impostaTimer(+D.preset);
    if ('avvia' in D) return avviaTimer();
    if ('dacapo' in D) return impostaTimer(T.tipo === 'su' ? 0 : T.giu / 60000);
  };
  if (vista.pagina === 'domanda') { const i = $('#risp'); if (i) i.addEventListener('keydown', (e) => { if (e.key === 'Enter') verifica(vista.libro); }); }
  if (vista.pagina === 'extra') { if (S.codici[vista.libro]) mostraSoluzioni(vista.libro); const c = $('#cod'); if (c) c.addEventListener('keydown', (e) => { if (e.key === 'Enter') sblocca(vista.libro, c.value); }); }
  if (vista.pagina === 'crono' || vista.pagina === 'timer') { if (!T.inizializzato) impostaTimer(vista.libro === 'avvento' ? 0 : 1); else disegnaTimer(); }
}

/* ---------- timer ---------- */
function impostaTimer(min) {
  clearInterval(T.id); T = { inizializzato: true, va: false, base: 0, avvio: 0, tipo: min === 0 ? 'su' : 'giu', giu: min * 60000, id: null, min };
  disegnaTimer();
}
function trascorso() { return T.base + (T.va ? Date.now() - T.avvio : 0); }
function avviaTimer() {
  if (T.va) { T.base = trascorso(); T.va = false; clearInterval(T.id); }
  else { T.avvio = Date.now(); T.va = true; T.id = setInterval(disegnaTimer, 250); }
  disegnaTimer();
}
function fmt(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function disegnaTimer() {
  const t = $('#tempo'); if (!t) { clearInterval(T.id); T.va = false; return; }
  const e = trascorso(); let frac = 0;
  if (T.tipo === 'su') { const sec = Math.floor(e / 1000); t.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); $('#sotto').textContent = 'cronometro'; frac = (e % 60000) / 60000; }
  else {
    const r = T.giu - e; t.textContent = fmt(r); $('#sotto').textContent = 'su ' + T.min + (T.min === 1 ? ' minuto' : ' minuti'); frac = Math.min(1, e / T.giu);
    if (r <= 0 && T.va) { T.va = false; T.base = T.giu; clearInterval(T.id); suona(); }
  }
  const col = vista.libro === 'avvento' ? '#f6c843' : '#c8102e'; const fondo = vista.libro === 'avvento' ? 'rgba(255,255,255,.15)' : '#f1e3cf';
  const c = $('#cerchio'); const resto = T.tipo === 'su' ? frac : 1 - frac;
  c.style.background = `conic-gradient(${col} 0 ${resto * 100}%, ${fondo} ${resto * 100}% 100%)`;
  const b = $('#avvia'); if (b) b.textContent = T.va ? '⏸ PAUSA' : '▶ AVVIA';
  document.querySelectorAll('[data-preset]').forEach((x) => x.classList.toggle('on', +x.dataset.preset === (T.tipo === 'su' ? 0 : T.min)));
}
function suona() {
  try { if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]); } catch (e) {}
  try {
    const A = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.45, 0.9].forEach((d) => { const o = A.createOscillator(), g = A.createGain(); o.frequency.value = 880; o.connect(g); g.connect(A.destination); g.gain.setValueAtTime(0.25, A.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, A.currentTime + d + 0.4); o.start(A.currentTime + d); o.stop(A.currentTime + d + 0.42); });
  } catch (e) {}
  finestra('<h3>⏰ Tempo scaduto!</h3><p style="margin-bottom:14px">Penne giù.</p><button class="btn in b-r" data-chiudi>OK</button>');
}

avvio();
