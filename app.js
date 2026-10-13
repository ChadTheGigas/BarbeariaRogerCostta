(() => {
  const $ = (s) => document.querySelector(s);
  const modal = $('#booking-modal');
  const form = $('#booking-form');
  const steps = [...document.querySelectorAll('.booking-step')];
  const error = $('#booking-error');
  let step = 0, selectedSlot = '', services = [], barbers = [], sb = null;
  const ready = () => window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY && !window.SUPABASE_URL.startsWith('COLE_AQUI') && !window.SUPABASE_ANON_KEY.startsWith('COLE_AQUI');
  if (ready()) sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const showError = msg => { error.textContent = msg || ''; };
  const localISODate = d => { const x = new Date(d.getTime()-d.getTimezoneOffset()*60000); return x.toISOString().slice(0,10); };
  $('#appointment-date').min = localISODate(new Date());
  document.querySelectorAll('[data-book]').forEach(b => b.addEventListener('click', openModal));
  $('#close-booking').addEventListener('click', closeModal);
  $('#finish-booking').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });
  $('.menu-toggle').addEventListener('click', () => $('nav').classList.toggle('open'));
  document.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => $('nav').classList.remove('open')));
  $('#service-select').addEventListener('change', updateServiceSummary);
  $('#barber-select').addEventListener('change', () => { selectedSlot=''; $('#slots').innerHTML=''; });
  $('#appointment-date').addEventListener('change', () => { selectedSlot=''; $('#slots').innerHTML=''; });
  $('#load-slots').addEventListener('click', loadSlots);
  $('#booking-back').addEventListener('click', () => setStep(step-1));
  $('#booking-next').addEventListener('click', nextStep);
  async function openModal(){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; showError(''); $('#booking-form').hidden=false; $('.modal-kicker').hidden=false; $('#booking-title').hidden=false; $('.step-progress').hidden=false; $('#booking-success').hidden=true; setStep(0); if(!services.length || !barbers.length) await loadCatalog(); }
  function closeModal(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';}
  function setStep(n){step=Math.max(0,Math.min(3,n));steps.forEach((s,i)=>s.classList.toggle('active',i===step));$('#step-count').textContent=`ETAPA 0${step+1} / 04`;$('#progress-bar').style.width=`${(step+1)*25}%`;$('#booking-back').hidden=step===0;$('#booking-next').textContent=step===3?'CONFIRMAR AGENDAMENTO ✓':'CONTINUAR →';showError('');if(step===3)buildSummary();}
  async function loadCatalog(){
    if(!sb){ showError('Antes de publicar, configure a Project URL e a chave anon do Supabase no arquivo config.js.'); $('#service-select').innerHTML='<option value="">Configure o Supabase primeiro</option>'; $('#barber-select').innerHTML='<option value="">Configure o Supabase primeiro</option>'; return; }
    $('#service-select').innerHTML='<option value="">Carregando…</option>'; $('#barber-select').innerHTML='<option value="">Carregando…</option>';
    const [sr,br] = await Promise.all([sb.from('services').select('id,name,description,price,active').eq('active',true).order('name'),sb.from('barbers').select('id,name,specialty,photo,active').eq('active',true).order('name')]);
    if(sr.error || br.error){showError('Não foi possível carregar os serviços e barbeiros. Confira as tabelas e as políticas do Supabase.');return;}
    services=sr.data||[];barbers=br.data||[];
    $('#service-select').innerHTML='<option value="">Selecione um serviço</option>'+services.map(s=>`<option value="${s.id}">${esc(s.name)} — ${money(s.price)}</option>`).join('');
    $('#barber-select').innerHTML='<option value="">Selecione um barbeiro</option>'+barbers.map(b=>`<option value="${b.id}">${esc(b.name)}${b.specialty?' — '+esc(b.specialty):''}</option>`).join('');
    updateServiceSummary();
  }
  function updateServiceSummary(){const s=services.find(x=>x.id===$('#service-select').value);$('#selected-service').textContent=s?`${s.name} · ${money(s.price)}${s.description?' — '+s.description:''}`:'O valor do serviço aparecerá aqui.';}
  function validateStep(){if(step===0){const name=form.elements.client_name.value.trim(),phone=form.elements.client_phone.value.trim();if(name.length<3)return 'Informe seu nome completo.';if(phone.replace(/\D/g,'').length<10)return 'Informe um telefone/WhatsApp válido.';}if(step===1&&!$('#service-select').value)return 'Escolha um serviço para continuar.';if(step===2){if(!$('#barber-select').value)return 'Escolha o barbeiro.';if(!$('#appointment-date').value)return 'Escolha a data.';if(!selectedSlot)return 'Consulte e selecione um horário disponível.';}return '';}
  async function nextStep(){showError('');const msg=validateStep();if(msg){showError(msg);return;}if(step<3){setStep(step+1);return;}await submitBooking();}
  async function loadSlots(){showError('');const barberId=$('#barber-select').value,date=$('#appointment-date').value;if(!barberId||!date){showError('Escolha o barbeiro e a data antes de consultar os horários.');return;}if(!sb){showError('Configure o Supabase no arquivo config.js.');return;}$('#slots').innerHTML='<p class="muted tiny">Buscando horários…</p>';selectedSlot='';
    // A função RPC deve devolver uma lista de horários livres no formato [{time:'09:00'}].
    const {data,error:rpcError}=await sb.rpc('get_available_slots',{p_barber_id:barberId,p_date:date,p_service_id:$('#service-select').value});
    if(rpcError){$('#slots').innerHTML='';showError('A consulta de horários ainda não está configurada no banco. Execute o SQL incluído no projeto.');return;}
    const list=(data||[]).map(x=>typeof x==='string'?x:(x.time||x.slot_time||x.start_time)).filter(Boolean);if(!list.length){$('#slots').innerHTML='<p class="muted tiny">Não há horários disponíveis nessa data. Tente outro dia.</p>';return;}
    $('#slots').innerHTML=list.map(t=>`<button type="button" class="slot" data-time="${esc(t)}">${esc(String(t).slice(0,5))}</button>`).join('');$('#slots').querySelectorAll('.slot').forEach(b=>b.addEventListener('click',()=>{selectedSlot=b.dataset.time;$('#slots').querySelectorAll('.slot').forEach(x=>x.classList.toggle('selected',x===b));}));
  }
  function buildSummary(){const s=services.find(x=>x.id===$('#service-select').value),b=barbers.find(x=>x.id===$('#barber-select').value);$('#confirm-summary').innerHTML=`<strong>${esc(form.elements.client_name.value.trim())}</strong><br>${esc(form.elements.client_phone.value.trim())}<hr>Serviço: <strong>${esc(s?.name||'')}</strong><br>Valor: <strong>${money(s?.price)}</strong><br>Barbeiro: <strong>${esc(b?.name||'')}</strong><br>Data: <strong>${esc($('#appointment-date').value.split('-').reverse().join('/'))}</strong><br>Horário: <strong>${esc(String(selectedSlot).slice(0,5))}</strong>`;}
  async function submitBooking(){if(!sb){showError('Configure o Supabase no arquivo config.js.');return;}const btn=$('#booking-next');btn.disabled=true;btn.textContent='SALVANDO…';
    const payload={p_client_name:form.elements.client_name.value.trim(),p_client_phone:form.elements.client_phone.value.trim(),p_service_id:$('#service-select').value,p_barber_id:$('#barber-select').value,p_date:$('#appointment-date').value,p_time:String(selectedSlot).slice(0,5)};
    const {data,error:saveError}=await sb.rpc('create_public_booking',payload);btn.disabled=false;btn.textContent='CONFIRMAR AGENDAMENTO ✓';
    if(saveError){showError(saveError.message?.includes('SLOT_TAKEN')?'Esse horário acabou de ser reservado. Escolha outro horário.':'Não foi possível confirmar. '+(saveError.message||'Tente novamente.'));return;}
    const s=services.find(x=>x.id===payload.p_service_id),b=barbers.find(x=>x.id===payload.p_barber_id);$('#booking-form').hidden=true;$('.modal-kicker').hidden=true;$('#booking-title').hidden=true;$('.step-progress').hidden=true;$('#booking-success').hidden=false;$('#success-message').textContent=`${b?.name||'Seu barbeiro'} · ${s?.name||'Serviço'} · ${payload.p_date.split('-').reverse().join('/')} às ${payload.p_time}. Valor: ${money(s?.price)}. Guarde essas informações para seu atendimento.`;
  }
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
})();
