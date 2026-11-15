const V='ludika-v6';
const FILES=['./','index.html','stile.css','app.js','dati.js','dati_extra.js','extra.js','manifest.webmanifest','img/cover05.jpg','img/cover06.jpg','img/logo.png','img/icona192.png','img/icona180.png','img/icona512.png','img/icona512_maskable.png','f/Anton-Regular.ttf','f/Poppins-Regular.ttf','f/Poppins-Medium.ttf','f/Poppins-Bold.ttf'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true})));});
