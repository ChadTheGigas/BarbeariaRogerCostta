/* =========================================================
   BARBEARIA ROGER COSTTA — INTERAÇÃO
   ---------------------------------------------------------
   FÁCIL PERSONALIZAÇÃO:
   1) Fotos: troque os arquivos dentro de /images/.
   2) Barbeiros: altere o array BARBERS abaixo.
   3) Serviços/preços: altere o array SERVICES abaixo.
   4) WhatsApp: altere WHATSAPP_NUMBER.
   5) Datas/horários: altere AVAILABLE_TIMES ou a lógica de disponibilidade.
   ========================================================= */

const WHATSAPP_NUMBER = "5551984749346"; // 55 + DDD 51 + 98474-9346

const SERVICES = [
  { name: "Corte", description: "Do clássico ao contemporâneo, com acabamento preciso.", price: "R$ XX", duration: "30 min" },
  { name: "Barba", description: "Desenho, alinhamento e acabamento para valorizar seu rosto.", price: "R$ XX", duration: "30 min" },
  { name: "Corte + Barba", description: "A experiência completa para sair renovado.", price: "R$ XX", duration: "60 min" },
  { name: "Sobrancelha", description: "Acabamento discreto para completar o visual.", price: "R$ XX", duration: "15 min" },
  { name: "Outros serviços", description: "Configure aqui outros serviços da barbearia.", price: "R$ XX", duration: "A definir" }
];

const BARBERS = [
  { name: "Barbeiro 01", specialty: "Especialidade", image: "images/barbeiro-01.jpg" },
  { name: "Barbeiro 02", specialty: "Especialidade", image: "images/barbeiro-02.jpg" },
  { name: "Barbeiro 03", specialty: "Especialidade", image: "images/barbeiro-03.jpg" },
  { name: "Barbeiro 04", specialty: "Especialidade", image: "images/barbeiro-04.jpg" }
];

const AVAILABLE_TIMES = ["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];
const BLOCKED_TIMES = ["11:30","16:30"]; // exemplo visual; ajuste quando tiver a agenda real

let booking = {
  service: null,
  barber: null,
  date: null,
  time: null,
  name: "",
  phone: ""
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", () => {
  initLoader();
  initHeader();
  initMobileMenu();
  initReveal();
  initParallax();
  initCursor();
  initModals();
  initBooking();
  initLightbox();
  init3D();
});

function initLoader() {
  window.addEventListener("load", () => {
    setTimeout(() => $(".page-loader")?.classList.add("loaded"), 550);
  });
}

function initHeader() {
  const header = $(".site-header");
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });
}

function initMobileMenu() {
  const menu = $(".mobile-menu");
  const toggle = $(".menu-toggle");
  toggle?.addEventListener("click", () => {
    menu.classList.toggle("open");
    toggle.classList.toggle("active");
  });
  $$(".mobile-menu button").forEach(btn => btn.addEventListener("click", () => {
    menu.classList.remove("open");
    toggle.classList.remove("active");
  }));
}

function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  $$(".reveal").forEach(el => observer.observe(el));
}

function initParallax() {
  const band = $("[data-parallax]");
  if (!band) return;
  const image = $("img", band);
  window.addEventListener("scroll", () => {
    const rect = band.getBoundingClientRect();
    const center = window.innerHeight / 2;
    const offset = (center - (rect.top + rect.height / 2)) * .08;
    image.style.setProperty("--py", `${offset}px`);
  }, { passive: true });
}

function initCursor() {
  const glow = $(".cursor-glow");
  if (!glow || matchMedia("(pointer: coarse)").matches) return;
  window.addEventListener("pointermove", e => {
    gsap?.to(glow, { x: e.clientX, y: e.clientY, duration: .45, ease: "power3.out", overwrite: true });
  });
}

function initModals() {
  const shell = $("#content-modal");
  const content = $("#modal-content");

  $$("[data-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.modal;
      openContentModal(type);
    });
  });

  $$("[data-close-modal]").forEach(btn => btn.addEventListener("click", closeContentModal));

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeContentModal();
      closeBooking();
      closeLightbox();
    }
  });

  function openContentModal(type) {
    const templates = {
      services: renderServicesModal,
      barbers: renderBarbersModal,
      gallery: renderGalleryModal,
      about: renderAboutModal,
      contact: renderContactModal
    };
    content.innerHTML = (templates[type] || renderServicesModal)();
    shell.classList.add("open");
    shell.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    initModalContent();
  }

  function closeContentModal() {
    shell.classList.remove("open");
    shell.setAttribute("aria-hidden", "true");
    if (!$("#booking-modal")?.classList.contains("open")) document.body.classList.remove("modal-open");
  }
}

function initModalContent() {
  $$(".modal-service [data-service-book]").forEach(btn => {
    btn.addEventListener("click", () => openBooking(btn.dataset.serviceBook));
  });

  $$(".barber-modal-card [data-booker]").forEach(btn => {
    btn.addEventListener("click", () => openBooking(null, btn.dataset.booker));
  });

  $$(".gallery-grid img").forEach(img => {
    img.addEventListener("click", () => openLightbox(img.src, img.alt));
  });
}

function renderServicesModal() {
  return `<div class="modal-content">
    <p class="kicker">SERVIÇOS</p>
    <h2 class="panel-title">Escolha seu<br><em>momento.</em></h2>
    <div class="modal-services">
      ${SERVICES.map(s => `
        <article class="modal-service">
          <h3>${s.name}</h3>
          <p>${s.description}</p>
          <div class="modal-service-meta">${s.price} · ${s.duration.toUpperCase()}</div>
          <button class="card-action" data-service-book="${s.name}">Agendar <span>↗</span></button>
        </article>`).join("")}
    </div>
  </div>`;
}

function renderBarbersModal() {
  return `<div class="modal-content">
    <p class="kicker">EQUIPE</p>
    <h2 class="panel-title">Escolha seu<br><em>barbeiro.</em></h2>
    <div class="booking-options barber-options barber-modal-list">
      ${BARBERS.map(b => `
        <article class="option-card barber-modal-card">
          <div class="barber-mini-silhouette"></div>
          <strong>${b.name}</strong>
          <small>${b.specialty}</small>
          <button class="card-action" data-booker="${b.name}">Escolher <span>↗</span></button>
        </article>`).join("")}
    </div>
  </div>`;
}

function renderGalleryModal() {
  return `<div class="modal-content">
    <p class="kicker">GALERIA</p>
    <h2 class="panel-title">O espaço<br><em>por outro ângulo.</em></h2>
    <div class="gallery-grid">
      <img src="images/banner-barbearia.png" alt="Fachada da Barbearia Roger Costta">
      <img src="images/interior-barbearia.png" alt="Interior da Barbearia Roger Costta">
      <img src="images/reception-barbearia.png" alt="Recepção da Barbearia Roger Costta">
    </div>
  </div>`;
}

function renderAboutModal() {
  return `<div class="about-panel">
    <img src="images/reception-barbearia.png" alt="Interior da Barbearia Roger Costta">
    <div class="about-copy">
      <p class="kicker">SOBRE A BARBEARIA</p>
      <h2 class="panel-title">Feito para<br><em>receber você.</em></h2>
      <p>Este texto é um espaço provisório para a apresentação da Barbearia Roger Costta. Substitua por informações oficiais sobre a história, proposta, equipe e diferenciais da empresa.</p>
      <p>O layout foi pensado para preservar uma comunicação sofisticada e direta, sem inventar fatos sobre a marca.</p>
    </div>
  </div>`;
}

function renderContactModal() {
  return `<div class="contact-panel">
    <div class="contact-card"><small>WHATSAPP</small><a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener">51 98474-9346 ↗</a></div>
    <div class="contact-card"><small>INSTAGRAM</small><a href="https://instagram.com/barbearia_rogercostta" target="_blank" rel="noopener">@barbearia_rogercostta ↗</a></div>
    <div class="contact-card"><small>ENDEREÇO</small><strong>Preencher endereço</strong></div>
    <div class="contact-card"><small>HORÁRIO</small><strong>Preencher horário</strong></div>
    <div class="contact-card" style="grid-column:1/-1"><small>MAPA</small><strong>Área preparada para incorporar Google Maps.</strong></div>
  </div>`;
}

function initBooking() {
  $$("[data-booking]").forEach(btn => btn.addEventListener("click", () => openBooking()));
  $$("[data-service-book]").forEach(btn => btn.addEventListener("click", () => openBooking(btn.dataset.serviceBook)));

  $$(".booking-shell [data-close-booking]").forEach(btn => btn.addEventListener("click", closeBooking));
}

function openBooking(serviceName = null, barberName = null) {
  const contentModal = $("#content-modal");
  contentModal?.classList.remove("open");
  if (serviceName) booking.service = SERVICES.find(s => s.name === serviceName) || null;
  if (barberName) booking.barber = BARBERS.find(b => b.name === barberName) || null;
  booking.date = booking.date || null;
  booking.time = null;
  renderBookingStep(1);

  const shell = $("#booking-modal");
  shell.classList.add("open");
  shell.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeBooking() {
  const shell = $("#booking-modal");
  if (!shell) return;
  shell.classList.remove("open");
  shell.setAttribute("aria-hidden", "true");
  if (!$("#content-modal")?.classList.contains("open")) document.body.classList.remove("modal-open");
}

function updateBookingProgress(step) {
  $$(".booking-progress span").forEach((el, i) => {
    el.classList.toggle("active", i === step - 1);
  });
}

function renderBookingStep(step) {
  updateBookingProgress(step);
  const target = $("#booking-content");
  if (!target) return;

  if (step === 1) {
    target.innerHTML = `<div class="booking-step">
      <h3>Escolha o serviço</h3><p>Selecione o que você deseja agendar.</p>
      <div class="booking-options">${SERVICES.map((s,i) => `
        <button class="option-card ${booking.service?.name === s.name ? "selected" : ""}" data-pick-service="${i}">
          <strong>${s.name}</strong><small>${s.description}</small><div class="option-meta">${s.price} · ${s.duration}</div>
        </button>`).join("")}</div>
    </div>`;
    $$("[data-pick-service]", target).forEach(btn => btn.addEventListener("click", () => {
      booking.service = SERVICES[Number(btn.dataset.pickService)];
      renderBookingStep(2);
    }));
  }

  if (step === 2) {
    target.innerHTML = `<div class="booking-step">
      <h3>Escolha seu barbeiro</h3><p>Você selecionou <strong>${booking.service?.name || "seu serviço"}</strong>.</p>
      <div class="booking-options barber-options">${BARBERS.map((b,i) => `
        <button class="option-card ${booking.barber?.name === b.name ? "selected" : ""}" data-pick-barber="${i}">
          <div class="barber-mini-silhouette"></div><strong>${b.name}</strong><small>${b.specialty}</small>
        </button>`).join("")}</div>
      <div class="booking-actions"><button class="btn-secondary" data-back>Voltar</button></div>
    </div>`;
    $$("[data-pick-barber]", target).forEach(btn => btn.addEventListener("click", () => {
      booking.barber = BARBERS[Number(btn.dataset.pickBarber)];
      renderBookingStep(3);
    }));
    $("[data-back]", target).addEventListener("click", () => renderBookingStep(1));
  }

  if (step === 3) {
    const now = new Date();
    let calendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
    renderCalendar(target, calendarDate);
  }

  if (step === 4) {
    target.innerHTML = `<div class="booking-step">
      <h3>Escolha o horário</h3>
      <p>${formatDate(booking.date)} · selecione um horário disponível.</p>
      <div class="time-grid">${AVAILABLE_TIMES.map(time => {
        const blocked = BLOCKED_TIMES.includes(time);
        return `<button class="time-btn ${blocked ? "blocked" : ""}" ${blocked ? "disabled" : ""} data-time="${time}">${time}</button>`;
      }).join("")}</div>
      <div class="booking-actions"><button class="btn-secondary" data-back>Voltar</button></div>
    </div>`;
    $$("[data-time]", target).forEach(btn => btn.addEventListener("click", () => {
      booking.time = btn.dataset.time;
      renderBookingStep(5);
    }));
    $("[data-back]", target).addEventListener("click", () => renderBookingStep(3));
  }

  if (step === 5) {
    target.innerHTML = `<div class="booking-step">
      <h3>Seus dados</h3><p>Preencha seus dados para montar o resumo do agendamento.</p>
      <div class="form-grid">
        <div class="form-field"><label>Nome</label><input id="client-name" placeholder="Seu nome" value="${booking.name}"></div>
        <div class="form-field"><label>Telefone</label><input id="client-phone" placeholder="(51) 99999-9999" value="${booking.phone}"></div>
      </div>
      <div class="booking-actions">
        <button class="btn-secondary" data-back>Voltar</button>
        <button class="btn btn-gold" data-review>Ver resumo <span>↗</span></button>
      </div>
    </div>`;
    $("[data-back]", target).addEventListener("click", () => renderBookingStep(4));
    $("[data-review]", target).addEventListener("click", () => {
      booking.name = $("#client-name").value.trim();
      booking.phone = $("#client-phone").value.trim();
      if (!booking.name || !booking.phone) {
        alert("Preencha nome e telefone para continuar.");
        return;
      }
      renderBookingStep(6);
    });
  }

  if (step === 6) {
    target.innerHTML = `<div class="booking-step">
      <h3>Resumo do agendamento</h3><p>Confira os dados antes de abrir o WhatsApp.</p>
      <div class="summary">
        <div class="summary-item"><small>SERVIÇO</small><strong>${booking.service?.name}</strong></div>
        <div class="summary-item"><small>BARBEIRO</small><strong>${booking.barber?.name}</strong></div>
        <div class="summary-item"><small>DATA</small><strong>${formatDate(booking.date)}</strong></div>
        <div class="summary-item"><small>HORÁRIO</small><strong>${booking.time}</strong></div>
        <div class="summary-item"><small>NOME</small><strong>${escapeHtml(booking.name)}</strong></div>
        <div class="summary-item"><small>TELEFONE</small><strong>${escapeHtml(booking.phone)}</strong></div>
      </div>
      <div class="booking-actions">
        <button class="btn-secondary" data-back>Voltar</button>
        <button class="btn btn-gold" data-confirm>Confirmar pelo WhatsApp <span>↗</span></button>
      </div>
    </div>`;
    $("[data-back]", target).addEventListener("click", () => renderBookingStep(5));
    $("[data-confirm]", target).addEventListener("click", confirmBooking);
  }
}

function renderCalendar(target, monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const labels = ["dom","seg","ter","qua","qui","sex","sáb"];

  target.innerHTML = `<div class="booking-step">
    <h3>Escolha a data</h3><p>Selecione um dia para consultar os horários.</p>
    <div class="calendar-head">
      <button data-prev-month>‹</button><strong>${new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(monthDate)}</strong><button data-next-month>›</button>
    </div>
    <div class="calendar-grid">${labels.map(l => `<span>${l}</span>`).join("")}</div>
    <div class="calendar-grid date-only"></div>
    <div class="booking-actions"><button class="btn-secondary" data-back>Voltar</button></div>
  </div>`;

  const grid = $(".date-only", target);
  for (let i=0; i<firstDay; i++) grid.appendChild(document.createElement("div"));
  for (let day=1; day<=days; day++) {
    const btn = document.createElement("button");
    btn.className = "date-btn";
    btn.textContent = day;
    const date = new Date(year, month, day);
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isSunday = date.getDay() === 0;
    btn.disabled = isPast || isSunday;
    if (booking.date && sameDate(booking.date, date)) btn.classList.add("selected");
    btn.addEventListener("click", () => {
      booking.date = date;
      renderBookingStep(4);
    });
    grid.appendChild(btn);
  }

  $("[data-prev-month]", target).addEventListener("click", () => {
    renderCalendar(target, new Date(year, month - 1, 1));
  });
  $("[data-next-month]", target).addEventListener("click", () => {
    renderCalendar(target, new Date(year, month + 1, 1));
  });
  $("[data-back]", target).addEventListener("click", () => renderBookingStep(2));
}

function confirmBooking() {
  const text =
`Olá! Gostaria de confirmar meu agendamento.

Nome: ${booking.name}
Telefone: ${booking.phone}
Serviço: ${booking.service?.name}
Barbeiro: ${booking.barber?.name}
Data: ${formatDate(booking.date)}
Horário: ${booking.time}`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener");

  $("#booking-content").innerHTML = `<div class="success">
    <div class="success-mark">✓</div>
    <h3>Quase lá.</h3>
    <p>O WhatsApp foi aberto com sua mensagem pronta. Basta enviar para confirmar o atendimento com a barbearia.</p>
    <button class="btn btn-gold" data-close-booking-final>Fechar <span>×</span></button>
  </div>`;
  updateBookingProgress(5);
  $("[data-close-booking-final]").addEventListener("click", closeBooking);
}

function formatDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" }).format(date);
}
function sameDate(a,b) { return a?.toDateString() === b?.toDateString(); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function initLightbox() {
  const box = document.createElement("div");
  box.className = "lightbox";
  box.innerHTML = `<button aria-label="Fechar">×</button><img alt="">`;
  document.body.appendChild(box);
  box.addEventListener("click", e => { if (e.target === box || e.target.tagName === "BUTTON") closeLightbox(); });
  window._lightbox = box;
}
function openLightbox(src, alt) {
  if (!window._lightbox) return;
  $("img", window._lightbox).src = src;
  $("img", window._lightbox).alt = alt;
  window._lightbox.classList.add("open");
}
function closeLightbox() {
  window._lightbox?.classList.remove("open");
}

/* ---------- 3D SCISSORS / WEBGL ---------- */
function init3D() {
  const canvas = $("#scissor-canvas");
  if (!canvas || !window.THREE) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
  camera.position.set(0, 0, 7);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
  } catch {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const group = new THREE.Group();
  group.rotation.z = -.18;
  scene.add(group);

  const gold = new THREE.MeshStandardMaterial({ color:0xd8b45a, metalness:.9, roughness:.22 });
  const dark = new THREE.MeshStandardMaterial({ color:0x161616, metalness:.8, roughness:.22 });
  const silver = new THREE.MeshStandardMaterial({ color:0xbab7af, metalness:1, roughness:.15 });

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0,0);
  bladeShape.lineTo(3.05,.12);
  bladeShape.lineTo(3.4,.22);
  bladeShape.lineTo(3.05,.33);
  bladeShape.lineTo(0,.46);
  bladeShape.lineTo(0,0);

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth:.075, bevelEnabled:true, bevelSize:.025, bevelThickness:.025, bevelSegments:2 });
  const blade1 = new THREE.Mesh(bladeGeo, silver);
  const blade2 = new THREE.Mesh(bladeGeo, silver);
  blade1.position.set(-2.1,.06,0);
  blade2.position.set(-2.1,-.28,.04);
  blade1.rotation.z = .08;
  blade2.rotation.z = -.08;
  group.add(blade1, blade2);

  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.14,32), gold);
  pivot.rotation.x = Math.PI/2;
  pivot.position.set(1.0,-.02,.1);
  group.add(pivot);

  const ringGeo = new THREE.TorusGeometry(.48,.09,18,40);
  const ring1 = new THREE.Mesh(ringGeo, gold);
  const ring2 = new THREE.Mesh(ringGeo, gold);
  ring1.position.set(1.65,.48,.02);
  ring2.position.set(1.65,-.48,.02);
  group.add(ring1, ring2);

  const handleBarGeo = new THREE.CylinderGeometry(.09,.09,1.05,18);
  const bar1 = new THREE.Mesh(handleBarGeo, dark);
  const bar2 = new THREE.Mesh(handleBarGeo, dark);
  bar1.rotation.z = Math.PI/2 - .25;
  bar2.rotation.z = Math.PI/2 + .25;
  bar1.position.set(1.22,.35,0);
  bar2.position.set(1.22,-.35,0);
  group.add(bar1, bar2);

  scene.add(new THREE.AmbientLight(0xffffff, .7));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3,4,5);
  scene.add(key);
  const rim = new THREE.PointLight(0xd8b45a, 5, 10);
  rim.position.set(-1,1,3);
  scene.add(rim);

  const resize = () => {
    const w = canvas.clientWidth || 500, h = canvas.clientHeight || 500;
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
  };
  window.addEventListener("resize", resize);
  resize();

  let targetX=0, targetY=0;
  window.addEventListener("pointermove", e => {
    if (matchMedia("(pointer: coarse)").matches) return;
    targetX = (e.clientX / innerWidth - .5) * .5;
    targetY = (e.clientY / innerHeight - .5) * .3;
  }, { passive:true });

  let scrollTarget = 0;
  window.addEventListener("scroll", () => { scrollTarget = window.scrollY; }, { passive:true });

  const tick = () => {
    const time = performance.now() * .001;
    const scrollRotation = scrollTarget * .00065;
    group.rotation.y += (targetX - group.rotation.y) * .025;
    group.rotation.x += (-targetY - group.rotation.x) * .025;
    group.rotation.z = -.18 + scrollRotation * .35;
    group.position.y = Math.sin(time * .7) * .07 - Math.min(scrollTarget * .00015, .45);
    group.scale.setScalar(1 + Math.min(scrollTarget * .00008, .12));
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();
}
