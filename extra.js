'use strict';
/* Soluzioni e bonus: sblocco con il codice inviato da Brevo.
   I file in x/ sono cifrati: senza il codice giusto non si leggono. */

const BREVO = {
  // indirizzo del modulo Brevo di ogni libro (action del form) e nomi dei campi
  modulo: {
    avvento: 'https://ac3d4cfd.sibforms.com/serve/MUIFAPy3ymMdjn1QnqeQ8kA2rxSmCUGLu3_2sgTClKP2JbfhpRTKShIpA0fQcSehPxthHEnLTvtv8aCEV-sFmoLlmWo5oO0iq1rYMmPBlxG9isEXxqQps8pGPkO6RyJT4oZZQNcCftR2VzhWA378ilah5CUtKD9nwK-cR9BPsPVSgiEr1u92Hluj8Up077d3KeedN0QYs3YiS2b_-w==',
    torneo: 'https://ac3d4cfd.sibforms.com/serve/MUIFAMgAsSNIz3MyfpMWkZlzOZE5_KsVJP9BeiiVGgT3Os2PyD9xo3eKrWSoAJ12QUfpoBMcQRLFpNQUxRw0WyZ9Jr-bXQ-9qH1IT2TAQJYlQPW1r_AQGjIlFdJAzqiUTolVj4ouPaOGBNb4pE40Xq0ZOUXDrn50Mj4dnjBq6RaWSeDvqk8l2idSBrWqM9x0kC4arMYoew6iNUvebg=='
  },
  campi: { email: 'EMAIL', nomi: 'NOMI', consenso: 'CONSENSO_NOVITA' }
};

const normCodice = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const chiavi = {};
async function chiaveDa(k, codice) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ludika|' + k + '|' + codice));
  return crypto.subtle.importKey('raw', h, 'AES-GCM', false, ['decrypt']);
}
async function apri(k, f, chiave) {
  const r = await fetch('x/' + k + '/' + f);
  if (!r.ok) throw new Error('file');
  const b = new Uint8Array(await r.arrayBuffer());
  const dati = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, chiave || chiavi[k], b.slice(12));
  return new Uint8Array(dati);
}
async function provaCodice(k, codice) {
  codice = normCodice(codice);
  if (!codice) return false;
  try {
    const ch = await chiaveDa(k, codice);
    await apri(k, EXTRA[k].soluz[0].f, ch);
    chiavi[k] = ch; S.codici[k] = codice; salva();
    return true;
  } catch (e) { return false; }
}
async function preparaChiave(k) {
  if (chiavi[k] || !S.codici[k]) return !!chiavi[k];
  chiavi[k] = await chiaveDa(k, S.codici[k]);
  return true;
}

/* ---------- schermata ---------- */
function navExtra(k) { return k === 'avvento' ? navAv('extra') : navTo('extra'); }
function pExtra() {
  const k = vista.libro; const av = k === 'avvento';
  const cl = av ? 'av' : 'to';
  let h = `<div class="pag ${cl}">`;
  h += av ? `<div class="top"><div class="ttl">SOLUZIONI E BONUS</div></div>` : `<div class="hd"><div class="top"><div class="ttl">SOLUZIONI E BONUS</div></div></div>`;
  if (!S.codici[k]) h += pRichiesta(k, av);
  else h += pSbloccato(k, av);
  return h + navExtra(k) + '</div>';
}
function pRichiesta(k, av) {
  const nb = av ? '24 sfide extra per le 12 sere da Santo Stefano all\'Epifania' : '40 sfide bonus nuove da giocare in due';
  const btn = av ? 'b-gia' : 'b-r';
  let h = `<div class="card"><div class="anton" style="font-size:21px;${av ? '' : 'color:#c8102e'}">SBLOCCATE TUTTO, UNA VOLTA SOLA</div>
  <ul class="elenco">
    <li><b>Le soluzioni</b> di tutti i giochi, da leggere qui nell'app.</li>
    <li><b>Il bonus:</b> ${nb}.</li>
    <li><b>Da stampare</b> subito dal telefono con una stampante wifi o bluetooth, oppure da scaricare e stampare dal PC o in copisteria.</li>
  </ul></div>`;
  if (!S.inviata || !(k in S.inviata)) {
    h += `<div class="card"><label class="et" for="em">La vostra email</label><input class="campo" id="em" type="email" inputmode="email" autocomplete="email" placeholder="nome@esempio.it">
    <button class="btn in ${btn}" data-invia>MANDATEMI IL CODICE ›</button>
    <div class="piccolo grigio">Vi mandiamo un'email con il codice di sblocco. Vi avviseremo solo per le nuove uscite di Ludika. Potete cancellarvi quando volete.</div></div>
    <button class="link" data-hocodice style="margin:4px 16px;${av ? "" : "color:#c8102e"}">Avete già il codice? Inseritelo qui</button>`;
  } else {
    h += `<div class="card">${S.inviata[k] ? `<div style="font-weight:700;font-size:17px;margin-bottom:6px">📩 Email inviata a ${esc(S.inviata[k])}</div>
    <div class="piccolo" style="margin-bottom:8px">Dentro c'è il codice. Non la trovate? Guardate anche in <b>Spam</b>, <b>Promozioni</b> e <b>Social</b>.</div>` : ''}
    <label class="et" for="cod">Il codice</label><input class="campo" id="cod" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CODICE">
    <button class="btn in ${btn}" data-sblocca>SBLOCCA ›</button>
    <button class="link" data-rifaiemail style="${av ? 'color:#13265c' : 'color:#c8102e'}">${S.inviata[k] ? 'Email sbagliata? Riscrivetela' : 'Non avete il codice? Chiedetelo con la vostra email'}</button></div>`;
  }
  return h;
}
function nomiGioco(k) { const n = k === 'avvento' ? AV().nomi : TO().nomi; return n && n[0] && n[1] ? n : null; }
function pSbloccato(k, av) {
  const n = nomiGioco(k); const btn = av ? 'b-gia' : 'b-r';
  let h = `<div class="sez">LE SOLUZIONI</div><div class="card"><div class="piccolo" style="margin-bottom:8px">Allargate con due dita per leggere meglio. Non sbirciate prima di aver giocato!</div><div id="soluz" class="pagine"><div class="piccolo grigio">Caricamento...</div></div></div>`;
  h += `<div class="sez">IL BONUS DA STAMPARE</div><div class="card">`;
  h += `<div style="margin-bottom:8px;line-height:1.45">${EXTRA[k].bonus.length} pagine da stampare.</div>`;
  if (!n) h += `<div class="errore" style="margin-bottom:6px">Prima scrivete i vostri nomi.</div><button class="btn in ${btn}" data-vainomi>SCRIVI I NOMI ›</button>`;
  else h += `<div style="margin-bottom:8px">Giocatori: <b>${esc(n[0])}</b> e <b>${esc(n[1])}</b> <button class="link" data-cambianomi style="display:inline;padding:0 0 0 6px;${av ? 'color:#13265c' : 'color:#c8102e'}">cambia</button></div><button class="btn in ${btn}" data-stampa>🖨️ STAMPA</button><button class="btn in b-bia" style="border:2px solid ${av ? '#13265c' : '#c8102e'};${av ? '' : 'color:#c8102e'}" data-scarica>⬇️ SCARICA IL PDF</button><div id="stato" class="piccolo grigio" style="margin-top:8px"></div>`;
  h += `<div class="piccolo grigio" style="margin-top:8px">Stampate in A4. Dal telefono scegliete la vostra stampante wifi o bluetooth; con «Scarica» il PDF resta sul telefono e lo potete stampare dal PC o in copisteria.</div></div>`;
  return h;
}
async function mostraSoluzioni(k) {
  const box = $('#soluz'); if (!box) return;
  try {
    await preparaChiave(k);
    box.innerHTML = '';
    for (const p of EXTRA[k].soluz) {
      const b = await apri(k, p.f);
      const img = document.createElement('img'); img.alt = 'Pagina delle soluzioni';
      img.src = URL.createObjectURL(new Blob([b], { type: 'image/jpeg' }));
      box.appendChild(img);
    }
  } catch (e) { box.innerHTML = '<div class="errore">Non riesco a caricare le soluzioni. Controllate la connessione e riaprite questa pagina.</div>'; }
}

/* ---------- invio a Brevo ---------- */
async function inviaEmail(k) {
  const em = $('#em').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return finestra('<h3>Email non valida</h3><p style="margin-bottom:14px">Controllate di averla scritta per intero, per esempio nome@gmail.com.</p><button class="btn in b-blu" data-chiudi>OK</button>');
  if (!BREVO.modulo[k]) return finestra('<h3>Quasi pronto</h3><p style="margin-bottom:14px">L\'invio del codice si attiva tra pochi giorni. Riprovate presto.</p><button class="btn in b-blu" data-chiudi>OK</button>');
  const n = nomiGioco(k);
  const fd = new URLSearchParams();
  fd.append(BREVO.campi.email, em);
  if (n) fd.append(BREVO.campi.nomi, n[0] + ' e ' + n[1]);
  fd.append('locale', 'it'); fd.append('email_address_check', ''); fd.append('html_type', 'simple');
  try { await fetch(BREVO.modulo[k], { method: 'POST', mode: 'no-cors', body: fd }); }
  catch (e) { return finestra('<h3>Invio non riuscito</h3><p style="margin-bottom:14px">Controllate la connessione e riprovate.</p><button class="btn in b-blu" data-chiudi>OK</button>'); }
  S.inviata = S.inviata || {}; S.inviata[k] = em; salva(); render();
}
async function sblocca(k, codice) {
  const ok = await provaCodice(k, codice);
  if (ok) { render(); finestra('<h3>🎉 Sbloccato!</h3><p style="margin-bottom:14px">Soluzioni e bonus sono vostri, anche le prossime volte che aprite l\'app su questo telefono.</p><button class="btn in b-blu" data-chiudi>EVVIVA</button>'); }
  else finestra('<h3>Codice non giusto</h3><p style="margin-bottom:14px">Copiatelo esattamente come lo trovate nell\'email. Maiuscole e spazi non contano.</p><button class="btn in b-blu" data-chiudi>OK</button>');
}

/* ---------- pagine con i nomi ---------- */
async function paginaConNomi(k, p, nomi) {
  const b = await apri(k, p.f);
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(new Blob([b], { type: 'image/jpeg' })); });
  const W = 1240, H = 1754; const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.drawImage(img, 0, 0, W, H);
  const campi = (p.s && p.s.c) || [];
  for (const f of campi) {
    const nome = nomi[f.n];
    let fs = f.fs;
    g.font = '600 ' + fs + 'px Poppins, sans-serif';
    while (g.measureText(nome).width > f.max && fs > 10) { fs -= 1; g.font = '600 ' + fs + 'px Poppins, sans-serif'; }
    g.fillStyle = '#13265c'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.save(); g.translate(f.x, f.y);
    if (f.d === 'su') g.rotate(-Math.PI / 2);
    else if (f.d === 'giu') g.rotate(Math.PI / 2);
    g.fillText(nome, 0, f.d === 'dx' ? 0 : -fs * 0.18);
    g.restore();
  }
  URL.revokeObjectURL(img.src);
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.85));
}
async function tuttePagine(k, stato) {
  await preparaChiave(k);
  try { await document.fonts.load('600 20px Poppins'); } catch (e) {}
  const n = nomiGioco(k);
  const out = []; const tot = EXTRA[k].bonus.length;
  for (let i = 0; i < tot; i++) { stato('Preparo le pagine: ' + (i + 1) + ' di ' + tot + '...'); out.push(await paginaConNomi(k, EXTRA[k].bonus[i], n)); }
  return out;
}
async function creaPdf(blobs) {
  const enc = new TextEncoder(); const parti = []; let pos = 0; const off = [];
  const add = (x) => { const u = typeof x === 'string' ? enc.encode(x) : x; parti.push(u); pos += u.length; };
  const n = blobs.length; const PW = 595.28, PH = 841.89;
  add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const obj = (id, body) => { off[id] = pos; add(id + ' 0 obj\n'); body(); add('\nendobj\n'); };
  obj(1, () => add('<< /Type /Catalog /Pages 2 0 R >>'));
  const kids = []; for (let i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
  obj(2, () => add('<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>'));
  for (let i = 0; i < n; i++) {
    const p = 3 + i * 3, c = p + 1, im = p + 2;
    const jpg = new Uint8Array(await blobs[i].arrayBuffer());
    const cs = 'q ' + PW + ' 0 0 ' + PH + ' 0 0 cm /I Do Q';
    obj(p, () => add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /I ' + im + ' 0 R >> >> /Contents ' + c + ' 0 R >>'));
    obj(c, () => { add('<< /Length ' + cs.length + ' >>\nstream\n'); add(cs); add('\nendstream'); });
    obj(im, () => { add('<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n'); add(jpg); add('\nendstream'); });
  }
  const tot = 3 + n * 3; const xref = pos;
  let x = 'xref\n0 ' + tot + '\n0000000000 65535 f \n';
  for (let i = 1; i < tot; i++) x += String(off[i]).padStart(10, '0') + ' 00000 n \n';
  add(x + 'trailer\n<< /Size ' + tot + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
  return new Blob(parti, { type: 'application/pdf' });
}
let occupato = false;
async function stampaOScarica(k, modo) {
  if (occupato) return; occupato = true;
  const st = $('#stato'); const stato = (t) => { if (st) st.textContent = t; };
  try {
    const pagine = await tuttePagine(k, stato);
    if (modo === 'scarica') {
      stato('Creo il PDF...');
      const pdf = await creaPdf(pagine);
      const a = document.createElement('a'); a.href = URL.createObjectURL(pdf);
      a.download = (k === 'avvento' ? 'Sfide sotto l\'albero' : 'Giochi in due') + ' - bonus.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      stato('Fatto: il PDF è nei download del telefono.');
    } else {
      let d = $('#stampa'); if (d) d.remove();
      d = document.createElement('div'); d.id = 'stampa';
      for (const b of pagine) { const i = document.createElement('img'); i.src = URL.createObjectURL(b); d.appendChild(i); }
      document.body.appendChild(d);
      await Promise.all([...d.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
      stato('');
      window.print();
    }
  } catch (e) { stato('Qualcosa non è andato. Controllate la connessione e riprovate.'); }
  occupato = false;
}

/* ---------- eventi della schermata ---------- */
function agganciaExtra(D) {
  const k = vista.libro;
  if ('invia' in D) { inviaEmail(k); return true; }
  if ('hocodice' in D) { S.inviata = S.inviata || {}; S.inviata[k] = S.inviata[k] || ''; salva(); render(); return true; }
  if ('rifaiemail' in D) { delete S.inviata[k]; salva(); render(); return true; }
  if ('sblocca' in D) { sblocca(k, $('#cod').value); return true; }
  if ('vainomi' in D) { vai(k, 'nomi', 'extra'); return true; }
  if ('cambianomi' in D) { if (nomiModificabili(k)) vai(k, 'nomi', 'extra'); else nomiBloccati(k); return true; }
  if ('stampa' in D) { stampaOScarica(k, 'stampa'); return true; }
  if ('scarica' in D) { stampaOScarica(k, 'scarica'); return true; }
  return false;
}

/* ---------- modifica dei nomi ---------- */
const ASSISTENZA = 'ludikaedizioni@gmail.com';
const HASH_SBLOCCO_NOMI = '1b5826193ac19ce6c93d420c6dc89540046849bb87eef5652f2f74730f9bfd38';
function nomiModificabili(k) {
  const v = S.vincoli[k]; if (!v) return true;
  return (v.cambi || 0) < 3 && Date.now() - v.t0 < 24 * 3600 * 1000;
}
function nomiBloccati(k) {
  const f = finestra(`<h3>Nomi non modificabili</h3><p style="margin-bottom:10px">Se hai commesso per la terza volta un errore di compilazione, scrivi all'assistenza (<b>${ASSISTENZA}</b>) chiedendo di sbloccare la modifica.</p>
  <label class="et" for="csn">Codice ricevuto dall'assistenza</label><input class="campo" id="csn" autocomplete="off" autocapitalize="characters">
  <button class="btn in b-blu" id="oksn">SBLOCCA</button><button class="btn in b-bia" style="border:2px solid #ccc" data-chiudi>CHIUDI</button>`);
  f.querySelector('#oksn').onclick = async () => {
    const c = normCodice(f.querySelector('#csn').value);
    const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ludika-nomi|' + c)))).map((b) => b.toString(16).padStart(2, '0')).join('');
    if (h === HASH_SBLOCCO_NOMI) { S.vincoli[k] = { t0: Date.now(), cambi: 0 }; salva(); f.remove(); vai(k, 'nomi', vista.pagina === 'extra' ? 'extra' : vista.param); }
    else { f.querySelector('#csn').value = ''; f.querySelector('#csn').placeholder = 'Codice non valido'; }
  };
}
