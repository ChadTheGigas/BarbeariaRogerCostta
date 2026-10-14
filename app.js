(() => {
  const cfg = window.RC_CONFIG || {};
  const configured = cfg.SUPABASE_URL?.startsWith("http") && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("COLE_AQUI");
  const supabase = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  const barbers = [
    {id:"roger", name:"Roger", role:"Barbeiro · Especialista"},
    {id:"vitinho", name:"Vitinho", role:"Barbeiro · Especialista"},
    {id:"caio", name:"Caio", role:"Barbeiro · Especialista"}
  ];
  const defaultSlots = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30"];

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const state = {step:1, name:"", phone:"", barber:null, date:"", time:null, service:"Corte", price:"65", duration:"45 min"};

  const toast = (msg, type="") => {
    const el = $("#toast"); el.textContent = msg; el.className = `toast show ${type}`;
    clearTimeout(window.__toast); window.__toast = setTimeout(()=>el.className="toast", 3600);
  };

  // Loader
  window.addEventListener("load", ()=>setTimeout(()=>$("#loader").classList.add("done"), 750));

  // Reveal
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if(e.isIntersecting){e.target.classList.add("visible");io.unobserve(e.target)}
  }), {threshold:.12});
  $$(".reveal").forEach(el=>io.observe(el));

  // Subtle 3D tilt, disabled on coarse pointers.
  if(matchMedia("(pointer:fine)").matches){
    $$(".tilt").forEach(card=>{
      card.addEventListener("pointermove", e=>{
        const r=card.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
        card.style.transform=`perspective(900px) rotateX(${y*-3}deg) rotateY(${x*4}deg) translateY(-4px)`;
      });
      card.addEventListener("pointerleave",()=>card.style.transform="");
    });
  }

  // Mobile nav
  $(".menu-toggle")?.addEventListener("click", ()=>{
    $(".nav").classList.toggle("mobile-open");
    if($(".nav").classList.contains("mobile-open")){
      Object.assign($(".nav").style,{display:"flex",position:"absolute",top:"88px",left:"0",right:"0",padding:"25px",background:"#080808",flexDirection:"column"});
    }else $(".nav").removeAttribute("style");
  });

  // Three.js hero object: restrained metallic/gold ring + particles.
  if(window.THREE){
    const host=$("#three-canvas"), scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.1,100);
    camera.position.z=7;
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setSize(innerWidth,innerHeight); host.appendChild(renderer.domElement);
    const group=new THREE.Group();
    const mat=new THREE.MeshStandardMaterial({color:0xd5a62a,metalness:.9,roughness:.22});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.028,12,160),mat);
    ring.rotation.x=.75; group.add(ring);
    const ring2=new THREE.Mesh(new THREE.TorusGeometry(1.55,.012,10,160),mat);
    ring2.rotation.x=.95; group.add(ring2);
    const geo=new THREE.BufferGeometry(), count=140, pos=new Float32Array(count*3);
    for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*5;pos[i*3+1]=(Math.random()-.5)*4;pos[i*3+2]=(Math.random()-.5)*3}
    geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
    group.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xe0bb55,size:.018,transparent:true,opacity:.65})));
    scene.add(group);
    scene.add(new THREE.AmbientLight(0xffffff,.5));
    const light=new THREE.PointLight(0xd5a62a,8,10);light.position.set(2,2,3);scene.add(light);
    function animate(){requestAnimationFrame(animate);group.rotation.y+=.0018;group.rotation.x=Math.sin(Date.now()*.00025)*.08;renderer.render(scene,camera)}
    animate();
    addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
  }

  // Modal helpers
  function openModal(id){$(id).classList.add("open");$(id).setAttribute("aria-hidden","false");document.body.classList.add("modal-open")}
  function closeModals(){$$(".modal").forEach(m=>{m.classList.remove("open");m.setAttribute("aria-hidden","true")});document.body.classList.remove("modal-open")}
  $$("[data-close-modal]").forEach(el=>el.addEventListener("click",closeModals));
  $$("[data-open-booking]").forEach(el=>el.addEventListener("click",()=>{state.service="Corte";state.price="65";state.duration="45 min";resetBooking();openModal("#bookingModal")}));
  $$("[data-open-admin]").forEach(el=>el.addEventListener("click",e=>{e.preventDefault();openModal("#adminModal")}));
  $(".modal-close")?.addEventListener("click",closeModals);
  addEventListener("keydown",e=>{if(e.key==="Escape")closeModals()});

  // Service cards open booking with the chosen service.
  const serviceDuration={"Corte":"45 min","Corte + Barba":"75 min","Barba Navalha":"40 min","Acabamento":"20 min"};
  $$(".service-card").forEach(card=>card.addEventListener("click",()=>{
    state.service=card.dataset.service; state.price=card.dataset.price; state.duration=serviceDuration[state.service]||"45 min"; resetBooking(); openModal("#bookingModal");
  }));

  function resetBooking(){
    Object.assign(state,{step:1,name:"",phone:"",barber:null,date:"",time:null,service:state.service||"Corte",price:state.price||"65",duration:state.duration||"45 min"});
    $("#bookingForm").reset();
    const today=new Date(); today.setHours(0,0,0,0);
    $("#bookingDate").min = today.toISOString().slice(0,10);
    renderBarbers(); renderSelectedService(); goStep(1);
    $("#bookingStatus").textContent="";
    $("#slotMorning").innerHTML=""; $("#slotAfternoon").innerHTML="";
    $("#slotState").textContent="Selecione a data e o profissional para consultar os horários.";
  }

  const stepTitles={1:"Escolha seu serviço",2:"Data & horário",3:"Seus dados"};
  function goStep(n){
    state.step=n;
    $$(".booking-step").forEach(s=>s.classList.toggle("active",+s.dataset.step===n));
    $("#stepCurrent").textContent=String(n).padStart(2,"0");
    $("#progressBar").style.width=(n*33.3333)+"%";
    $("#bookingStepTitle").textContent=stepTitles[n];
    $$(".booking-step-dot").forEach((el,i)=>el.classList.toggle("active",i<n));
    if(n===2) renderSelectedService();
    if(n===3) renderSummary();
  }

  function renderSelectedService(){
    $("#selectedServiceMini").innerHTML=`<span><b>${escapeHtml(state.service)}</b><small>${escapeHtml(state.duration)} · ${escapeHtml(formatMoney(state.price))}</small></span><i>✓</i>`;
    $$(".booking-service-card").forEach(card=>card.classList.toggle("selected",card.dataset.service===state.service));
  }

  function renderBarbers(){
    $("#barberGrid").innerHTML=barbers.map(b=>`<button type="button" class="barber-card ${state.barber?.id===b.id?"selected":""}" data-id="${b.id}">
      <span class="barber-avatar"><span>${b.name.slice(0,2).toUpperCase()}</span></span><span><strong>${b.name}</strong><small>${b.role}</small></span><span class="barber-check">✓</span>
    </button>`).join("");
    $$(".barber-card").forEach(el=>el.addEventListener("click",()=>{
      state.barber=barbers.find(b=>b.id===el.dataset.id); state.time=null; renderBarbers(); clearSlots();
      if(state.date) loadSlots();
    }));
  }

  function clearSlots(){ $("#slotMorning").innerHTML=""; $("#slotAfternoon").innerHTML=""; }
  function formatMoney(v){ return `R$ ${Number(v).toFixed(0)}`; }

  function validStep(){
    if(state.step===1){
      if(!state.service){toast("Escolha um serviço.","error");return false}
    }
    if(state.step===2){
      state.date=$("#bookingDate").value;
      if(!state.date){toast("Escolha a data do atendimento.","error");return false}
      const selected=new Date(state.date+"T12:00:00");
      if(selected.getDay()===0){toast("A casa não atende aos domingos.","error");return false}
      if(!state.barber){toast("Escolha um profissional.","error");return false}
      if(!state.time){toast("Escolha um horário disponível.","error");return false}
    }
    if(state.step===3){
      state.name=$("#clientName").value.trim(); state.phone=$("#clientPhone").value.trim();
      if(state.name.length<2 || state.phone.replace(/\D/g,"").length<10){toast("Informe nome e WhatsApp válidos.","error");return false}
    }
    return true;
  }

  $$(".booking-service-card").forEach(card=>card.addEventListener("click",()=>{
    state.service=card.dataset.service; state.price=card.dataset.price; state.duration=card.dataset.duration; state.time=null; renderSelectedService();
  }));

  $$(".next-step").forEach(btn=>btn.addEventListener("click",async()=>{
    if(!validStep())return;
    if(state.step===1){goStep(2);return}
    if(state.step===2){goStep(3);return}
  }));
  $$(".prev-step").forEach(btn=>btn.addEventListener("click",()=>goStep(Math.max(1,state.step-1))));

  $("#bookingDate").addEventListener("change",async()=>{
    state.date=$("#bookingDate").value; state.time=null; clearSlots();
    if(!state.date || !state.barber)return;
    const d=new Date(state.date+"T12:00:00");
    if(d.getDay()===0){$("#slotState").textContent="Domingo: a barbearia não atende.";return}
    await loadSlots();
  });

  function renderSlotButton(t){return `<button type="button" class="slot" data-time="${t}">${t}</button>`}
  function attachSlotEvents(){
    $$(".slot").forEach(el=>el.addEventListener("click",()=>{$$(".slot").forEach(x=>x.classList.remove("selected"));el.classList.add("selected");state.time=el.dataset.time}));
  }
  function normalizeTime(t){ return String(t).slice(0,5); }
  function splitSlots(slots){
    slots=slots.map(normalizeTime);
    const morning=slots.filter(t=>t<"12:00"), afternoon=slots.filter(t=>t>="12:00");
    $("#slotMorning").innerHTML=morning.map(renderSlotButton).join("");
    $("#slotAfternoon").innerHTML=afternoon.map(renderSlotButton).join("");
    attachSlotEvents();
  }

  function serviceMinutes(){ return parseInt(state.duration,10)||30; }
  function fitBusinessHours(slots){
    return slots.filter(t=>{const [h,m]=t.split(":").map(Number);return h*60+m+serviceMinutes()<=20*60;});
  }

  async function loadSlots(){
    $("#slotState").textContent="Consultando disponibilidade…"; clearSlots();
    if(!configured){
      const demo=fitBusinessHours(defaultSlots);
      $("#slotState").textContent="Horários disponíveis · 09h às 20h";
      splitSlots(demo); return;
    }
    const {data,error}=await supabase.rpc("get_available_slots",{p_barber_id:state.barber.id,p_date:state.date});
    if(error){$("#slotState").textContent="Não foi possível consultar a disponibilidade.";toast(error.message,"error");return}
    const slots=fitBusinessHours(data?.length?data.map(x=>x.slot):[]);
    $("#slotState").textContent=slots.length?"Horários disponíveis para esta data":"Nenhum horário disponível para esta data.";
    splitSlots(slots);
  }

  function renderSummary(){
    const dateText=state.date?new Date(state.date+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"}):"—";
    $("#bookingSummary").innerHTML=[
      ["Serviço",`${state.service} · ${formatMoney(state.price)}`],["Duração",state.duration],["Profissional",state.barber?.name||"—"],["Data",dateText],["Horário",state.time||"—"],["Cliente",state.name||"—"],["WhatsApp",state.phone||"—"]
    ].map(r=>`<div class="summary-row"><span>${r[0]}</span><span>${escapeHtml(r[1])}</span></div>`).join("");
  }

  $("#bookingForm").addEventListener("submit",async e=>{
    e.preventDefault(); if(!validStep())return;
    const btn=$("#confirmBooking"); btn.disabled=true; btn.innerHTML="Confirmando…";
    $("#bookingStatus").textContent="";
    if(!configured){
      $("#bookingStatus").textContent="Banco não configurado. Nenhum agendamento foi criado. Configure config.js + Supabase para ativar o fluxo real.";
      btn.disabled=false;btn.innerHTML="Confirmar agendamento ↗";return;
    }
    const {data,error}=await supabase.rpc("create_appointment",{
      p_client_name:state.name,p_phone:state.phone,p_barber_id:state.barber.id,
      p_date:state.date,p_time:state.time,p_service:state.service
    });
    if(error){
      $("#bookingStatus").textContent=error.message.includes("duplicate")?"Este horário acabou de ser reservado. Escolha outro.":"Não foi possível confirmar o agendamento.";
      toast("Falha ao confirmar. Nenhum agendamento foi criado.","error");
      btn.disabled=false;btn.innerHTML="Confirmar agendamento ↗";return;
    }
    toast("Agendamento confirmado.","success");
    $("#bookingStatus").textContent="Tudo certo. Seu horário foi registrado no banco de dados.";
    btn.innerHTML="Agendado ✓"; btn.disabled=true;
  });

  // Admin
  async function requireSession(){
    if(!supabase)return null;
    const {data}=await supabase.auth.getSession(); return data.session;
  }
  $("#loginForm").addEventListener("submit",async e=>{
    e.preventDefault();$("#loginStatus").textContent="";
    if(!configured){$("#loginStatus").textContent="Supabase não configurado. Nenhuma autenticação é simulada.";return}
    const {data,error}=await supabase.auth.signInWithPassword({email:$("#adminEmail").value,password:$("#adminPassword").value});
    if(error){$("#loginStatus").textContent="E-mail ou senha inválidos.";return}
    const {data:role,error:roleError}=await supabase.rpc("is_admin");
    if(roleError || !role){await supabase.auth.signOut();$("#loginStatus").textContent="Usuário autenticado, mas sem permissão administrativa.";return}
    $("#adminLogin").hidden=true;$("#adminDashboard").hidden=false;populateFilter();loadAppointments();
  });
  async function populateFilter(){
    $("#filterBarber").innerHTML='<option value="">Todos</option>'+barbers.map(b=>`<option value="${b.id}">${b.name}</option>`).join("");
  }
  async function loadAppointments(){
    $("#adminStatus").textContent="Carregando…";
    if(!supabase){$("#adminStatus").textContent="Supabase não configurado.";return}
    const {data,error}=await supabase.from("appointments").select("id,client_name,phone,date,time,status,barber_id,barbers(name)").order("date",{ascending:true}).order("time",{ascending:true});
    if(error){$("#adminStatus").textContent="Não foi possível carregar os agendamentos.";return}
    const fd=$("#filterDate").value, fb=$("#filterBarber").value;
    const rows=(data||[]).filter(a=>(!fd||a.date===fd)&&(!fb||a.barber_id===fb));
    $("#appointmentsBody").innerHTML=rows.length?rows.map(a=>`<tr><td><strong>${escapeHtml(a.client_name)}</strong></td><td>${escapeHtml(a.phone)}</td><td>${new Date(a.date+"T12:00:00").toLocaleDateString("pt-BR")}</td><td>${a.time}</td><td><span class="status">${a.barbers?.name||a.barber_id}</span></td><td>${a.status}</td><td><button class="cancel" data-cancel="${a.id}">cancelar</button></td></tr>`).join(""):'<tr><td colspan="7">Nenhum agendamento encontrado.</td></tr>';
    $$(".cancel").forEach(b=>b.addEventListener("click",()=>cancelAppointment(b.dataset.cancel)));
    $("#adminStatus").textContent=`${rows.length} agendamento(s).`;
  }
  async function cancelAppointment(id){
    if(!confirm("Cancelar este agendamento?"))return;
    const {error}=await supabase.from("appointments").update({status:"cancelled"}).eq("id",id);
    if(error){toast("Não foi possível cancelar.","error");return}
    toast("Agendamento cancelado.","success");loadAppointments();
  }
  $("#refreshAppointments").addEventListener("click",loadAppointments);
  $("#filterDate").addEventListener("change",loadAppointments);$("#filterBarber").addEventListener("change",loadAppointments);
  $("#logoutBtn").addEventListener("click",async()=>{await supabase?.auth.signOut();$("#adminLogin").hidden=false;$("#adminDashboard").hidden=true;$("#loginForm").reset()});

  function escapeHtml(v){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
  renderBarbers();
})();
