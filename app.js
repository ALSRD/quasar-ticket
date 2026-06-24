const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const STORE = 'quasarTicketsV1';
let tickets = JSON.parse(localStorage.getItem(STORE) || '[]');
let installPrompt;
const LOTTERIES = {
  'Leidsa': {games:['Quiniela Leidsa','Loto Leidsa','Pega 3 Más','Súper Kino TV','Loto Pool'], weekdays:['8:55 PM'], sunday:['3:55 PM']},
  'Loteka': {games:['Quiniela Loteka','Mega Chances','MegaLotto','Toca 3'], weekdays:['7:55 PM']},
  'Lotería Nacional': {games:['Quiniela Nacional','Juega Más + Pega Más','Gana Más'], weekdays:['2:30 PM','9:00 PM'], sunday:['6:00 PM']},
  'Lotería Real': {games:['Quiniela Real','Tu Fecha Real','Loto Pool Real','Loto Real'], weekdays:['12:55 PM','8:00 PM']},
  'La Primera': {games:['Quiniela Día y Noche','Loto 5'], weekdays:['12:00 PM','7:00 PM']},
  'LoteDom': {games:['Quiniela LoteDom','Quemaito Mayor'], weekdays:['12:00 PM']},
  'La Suerte Dominicana': {games:['Quiniela La Suerte'], weekdays:['12:30 PM','6:00 PM']}
};
const money = n => `RD$ ${Number(n).toLocaleString('es-DO', {minimumFractionDigits: 2})}`;
const escapeHtml = value => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function save(){ localStorage.setItem(STORE, JSON.stringify(tickets)); renderHistory(); }
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2200); }
function uid(){ const d=new Date(); const date=[d.getFullYear()%100,String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join(''); const seed=String((Date.now()%10000)).padStart(4,'0'); return `${date}-${seed}`; }

function addPlay(data={type:'Quiniela',number:'',amount:''}){
  const row=document.createElement('div'); row.className='play-row';
  row.innerHTML=`<select class="play-type" aria-label="Tipo"><option>Quiniela</option><option>Palé</option><option>Tripleta</option></select><input class="play-number" aria-label="Números" inputmode="numeric" placeholder="Ej. 12" maxlength="8" required><input class="play-amount" aria-label="Monto" type="number" min="1" step="1" placeholder="RD$" required><button class="remove-play" type="button" aria-label="Eliminar">×</button>`;
  $('.play-type',row).value=data.type; $('.play-number',row).value=data.number; $('.play-amount',row).value=data.amount;
  $('#plays').append(row); row.addEventListener('input',updateTotal); $('.remove-play',row).onclick=()=>{ if($$('.play-row').length>1){row.remove();updateTotal();} }; updateTotal();
}
function updateTotal(){ const rows=$$('.play-row'); const total=rows.reduce((s,r)=>s+(Number($('.play-amount',r).value)||0),0); $('#saleTotal').textContent=money(total); $('#playCount').textContent=`${rows.length} jugada${rows.length===1?'':'s'}`; }
function updateLotteryOptions(){
  const lottery=$('#lottery').value, config=LOTTERIES[lottery], date=new Date(`${$('#drawDate').value || new Date().toISOString().slice(0,10)}T12:00:00`), sunday=date.getDay()===0;
  $('#game').innerHTML=config.games.map(game=>`<option>${escapeHtml(game)}</option>`).join('');
  const times=sunday&&config.sunday?config.sunday:config.weekdays;
  $('#drawTime').innerHTML=times.map(time=>`<option>${time}</option>`).join('');
  $('#scheduleNote').textContent=sunday&&config.sunday?'Horario especial de domingo aplicado.':`Horario disponible: ${times.join(' y ')}.`;
}

function qrFallback(text){
  // Respaldo visual para impresión sin conexión; la numeración es el identificador canónico.
  let seed=[...text].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,2166136261); const size=25, cells=[];
  const finder=(x,y)=> x<7&&y<7 || x>=size-7&&y<7 || x<7&&y>=size-7;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){let on;if(finder(x,y)){const lx=x>=size-7?x-(size-7):x,ly=y>=size-7?y-(size-7):y;on=(lx===0||ly===0||lx===6||ly===6||(lx>=2&&lx<=4&&ly>=2&&ly<=4));}else{seed=(seed*1664525+1013904223)>>>0;on=(seed>>>30)&1;}if(on)cells.push(`<rect x="${x+2}" y="${y+2}" width="1" height="1"/>`)}
  return `<svg viewBox="0 0 ${size+4} ${size+4}" role="img" aria-label="Referencia visual del ticket"><rect width="100%" height="100%" fill="white"/><g fill="#000">${cells.join('')}</g></svg>`;
}
function paper(ticket){ const qr=`https://quickchart.io/qr?size=180&margin=1&text=${encodeURIComponent(ticket.id)}`; return `<article class="paper"><header class="paper-header"><b>QUASAR DIGITAL</b><h2>QUASAR TICKET</h2><small>COMPROBANTE DE JUGADA</small></header><div class="paper-meta">TICKET: <b>${escapeHtml(ticket.id)}</b><br>FECHA: ${new Date(ticket.created).toLocaleString('es-DO')}<br>LOTERÍA: ${escapeHtml(ticket.lottery)}<br>SORTEO: ${escapeHtml(ticket.game || ticket.lottery)} · ${escapeHtml(ticket.drawTime)}<br>JUEGA: ${escapeHtml(ticket.drawDate)}</div>${ticket.plays.map(p=>`<div class="paper-play"><b>${escapeHtml(p.type)}</b><span>${escapeHtml(p.number)}</span><span>${money(p.amount)}</span></div>`).join('')}<div class="paper-total"><span>TOTAL</span><span>${money(ticket.total)}</span></div><div class="qr-code"><img src="${qr}" alt="QR del ticket">${qrFallback(ticket.id)}</div><div class="paper-footer"><b>${escapeHtml(ticket.id)}</b><small>Conserve este comprobante. Sujeto a validación.<br>Desarrollado por Quasar Digital</small></div></article>`; }
function openTicket(ticket){ $('#printTicket').innerHTML=paper(ticket); $('#ticketDialog').showModal(); }

$('#saleForm').addEventListener('submit',e=>{e.preventDefault();const plays=$$('.play-row').map(r=>({type:$('.play-type',r).value,number:$('.play-number',r).value.trim(),amount:Number($('.play-amount',r).value)}));const total=plays.reduce((s,p)=>s+p.amount,0);if(!total)return toast('Agrega un monto válido');const ticket={id:uid(),lottery:$('#lottery').value,game:$('#game').value,drawDate:$('#drawDate').value,drawTime:$('#drawTime').value,plays,total,created:new Date().toISOString(),status:'active',prize:0};tickets.unshift(ticket);save();openTicket(ticket);e.target.reset();$('#drawDate').valueAsDate=new Date();updateLotteryOptions();$('#plays').innerHTML='';addPlay();});
$('#addPlay').onclick=()=>addPlay(); $('#closeTicket').onclick=()=>$('#ticketDialog').close(); $('#printButton').onclick=()=>window.print();

function renderHistory(filter=''){ const list=$('#ticketList'); const shown=tickets.filter(t=>`${t.id} ${t.lottery} ${t.game||''}`.toLowerCase().includes(filter.toLowerCase())); list.innerHTML=shown.length?shown.map(t=>`<button class="ticket-item" data-id="${escapeHtml(t.id)}"><div><h3>${escapeHtml(t.id)}</h3><p>${escapeHtml(t.game || t.lottery)} · ${new Date(t.created).toLocaleDateString('es-DO')}</p><span class="status ${t.status==='paid'?'paid':''}">${t.status==='paid'?'PAGADO':'VIGENTE'}</span></div><strong>${money(t.total)}</strong></button>`).join(''):`<div class="empty">Aún no hay tickets guardados.</div>`; $$('.ticket-item',list).forEach(b=>b.onclick=()=>openTicket(tickets.find(t=>t.id===b.dataset.id))); $('#ticketStat').textContent=tickets.length; $('#salesStat').textContent=money(tickets.reduce((s,t)=>s+t.total,0)).replace('.00',''); $('#paidStat').textContent=money(tickets.reduce((s,t)=>s+(t.status==='paid'?t.prize:0),0)).replace('.00',''); }
$('#historySearch').oninput=e=>renderHistory(e.target.value);

function lookup(id){ const ticket=tickets.find(t=>t.id.toLowerCase()===id.trim().toLowerCase()); const box=$('#checkResult'); if(!ticket){box.innerHTML='<div class="card result-card"><h3>Ticket no encontrado</h3><p class="microcopy">Verifica la numeración. Los tickets solo existen en el dispositivo donde fueron emitidos.</p></div>';return;} box.innerHTML=`<div class="card result-card"><h3>Ticket ${escapeHtml(ticket.id)}</h3><div class="result-meta"><span>Estado</span><b>${ticket.status==='paid'?'PAGADO':'VIGENTE'}</b></div><div class="result-meta"><span>Lotería</span><b>${escapeHtml(ticket.lottery)}</b></div><div class="result-meta"><span>Sorteo</span><b>${escapeHtml(ticket.game || ticket.lottery)} · ${escapeHtml(ticket.drawTime)}</b></div><div class="result-meta"><span>Apostado</span><b>${money(ticket.total)}</b></div>${ticket.status==='paid'?`<div class="prize-box"><small>Premio pagado</small><strong>${money(ticket.prize)}</strong></div>`:`<label style="margin-top:16px">Números ganadores (1.º, 2.º, 3.º)</label><div class="winning-inputs"><input maxlength="2" inputmode="numeric" placeholder="00"><input maxlength="2" inputmode="numeric" placeholder="00"><input maxlength="2" inputmode="numeric" placeholder="00"></div><button class="secondary calc-button" type="button">Calcular premio</button><div class="prize-output"></div>`}</div>`; const calc=$('.calc-button',box); if(calc)calc.onclick=()=>calculate(ticket,box); }
function calculate(ticket,box){ const winners=$$('.winning-inputs input',box).map(i=>i.value.padStart(2,'0')); if(winners.some(x=>!/^[0-9]{2}$/.test(x)))return toast('Introduce los tres resultados');let prize=0;ticket.plays.forEach(p=>{const nums=p.number.match(/\d{2}/g)||[];if(p.type==='Quiniela'&&nums[0]){const pos=winners.indexOf(nums[0]);prize+=pos===0?p.amount*60:pos===1?p.amount*8:pos===2?p.amount*4:0;}if(p.type==='Palé'&&nums.length>=2&&nums.slice(0,2).every(n=>winners.includes(n)))prize+=p.amount*1000;if(p.type==='Tripleta'&&nums.length>=3&&nums.slice(0,3).every(n=>winners.includes(n)))prize+=p.amount*10000;});ticket.prize=prize;$('.prize-output',box).innerHTML=`<div class="prize-box"><small>Premio calculado</small><strong>${money(prize)}</strong></div>${prize>0?'<button class="pay-button" type="button">Marcar como pagado</button>':''}<p class="microcopy">Tabla demo: Quiniela 60×/8×/4×, Palé 1,000×, Tripleta 10,000×. Configure las tasas oficiales antes de operar.</p>`;const pay=$('.pay-button',box);if(pay)pay.onclick=()=>{ticket.status='paid';ticket.paidAt=new Date().toISOString();save();lookup(ticket.id);toast('Pago registrado en este dispositivo');};}
$('#lookupForm').onsubmit=e=>{e.preventDefault();lookup($('#ticketNumber').value)};

$('#scanButton').onclick=async()=>{const msg=$('#scanMessage'),video=$('#camera');if(!('BarcodeDetector'in window)){msg.textContent='Este navegador no admite lectura QR. Usa la numeración manual.';return;}try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});video.hidden=false;video.srcObject=stream;await video.play();const detector=new BarcodeDetector({formats:['qr_code']});const timer=setInterval(async()=>{const codes=await detector.detect(video);if(codes[0]){clearInterval(timer);stream.getTracks().forEach(t=>t.stop());video.hidden=true;const raw=codes[0].rawValue.replace('QUASAR:','');$('#ticketNumber').value=raw;lookup(raw);}},500);setTimeout(()=>{clearInterval(timer);stream.getTracks().forEach(t=>t.stop());video.hidden=true;},30000);}catch{msg.textContent='No se pudo abrir la cámara. Revisa el permiso o usa la numeración.';}};

$$('.bottom-nav button').forEach(b=>b.onclick=()=>{$$('.bottom-nav button').forEach(x=>x.classList.toggle('active',x===b));$$('.screen').forEach(s=>s.classList.toggle('active',s.id===`screen-${b.dataset.screen}`));if(b.dataset.screen==='tickets')renderHistory();scrollTo(0,0);});
$('#exportButton').onclick=()=>{const blob=new Blob([JSON.stringify(tickets,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`quasar-tickets-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);};
$('#clearButton').onclick=()=>{if(confirm('¿Borrar todos los tickets guardados en este dispositivo?')){tickets=[];save();toast('Datos locales borrados');}};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installButton').hidden=false;}); $('#installButton').onclick=async()=>{installPrompt?.prompt();await installPrompt?.userChoice;$('#installButton').hidden=true;};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
const now=new Date();$('#todayLabel').textContent=now.toLocaleDateString('es-DO',{weekday:'long',day:'numeric',month:'long'}).toUpperCase();$('#drawDate').valueAsDate=now;$('#lottery').addEventListener('change',updateLotteryOptions);$('#drawDate').addEventListener('change',updateLotteryOptions);updateLotteryOptions();addPlay();renderHistory();
