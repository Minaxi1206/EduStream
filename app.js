// -----------------------------
// Mock Data
// -----------------------------
const COURSES = [
  { id: "c-html", title: "Modern HTML & Semantics", price: 29, level: "Beginner", hours: 6 },
  { id: "c-css", title: "Responsive CSS with Flex/Grid", price: 39, level: "Beginner", hours: 8 },
  { id: "c-js", title: "JavaScript Essentials", price: 49, level: "Intermediate", hours: 10 },
  { id: "c-react", title: "React & State Management", price: 69, level: "Intermediate", hours: 12 },
];

const MEDIA = [
  {
    id: "m1",
    type: "video",
    title: "Intro to EduStream",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&q=80&auto=format&fit=crop",
  },
  {
    id: "m2",
    type: "audio",
    title: "Sample Audio Lecture",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
  },
];

// -----------------------------
// Persistent State Helpers
// -----------------------------
const storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  del(key) { localStorage.removeItem(key); },
};

const state = {
  theme: storage.get("edustream.theme", "light"),
  cart: storage.get("edustream.cart", []),
  auth: storage.get("edustream.auth", null), // { token, user:{email,name} }
};

// -----------------------------
// Theme
// -----------------------------
const applyTheme = (t) => document.documentElement.setAttribute("data-theme", t);
applyTheme(state.theme);

document.getElementById("themeToggle").addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  storage.set("edustream.theme", state.theme);
  applyTheme(state.theme);
});

// -----------------------------
// Tabs
// -----------------------------
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// -----------------------------
// Media Gallery with Canvas Progress
// -----------------------------
const mediaGrid = document.getElementById("mediaGrid");

function renderMediaCard(m) {
  const card = document.createElement("div");
  card.className = "card media-card";

  // Header
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `<div class="title">${m.title}</div><span class="badge">${m.type.toUpperCase()}</span>`;
  card.appendChild(meta);

  // Media + Canvas progress
  const row = document.createElement("div");
  row.className = "row";

  const mediaWrap = document.createElement("div");
  if (m.type === "video") {
    const v = document.createElement("video");
    v.controls = true;
    v.src = m.src;
    if (m.poster) v.poster = m.poster;
    v.setAttribute("playsinline", "true");
    mediaWrap.appendChild(v);
    attachMediaProgress(v, row);
  } else {
    const pad = document.createElement("div");
    const a = document.createElement("audio");
    a.controls = true;
    a.src = m.src;
    pad.appendChild(a);
    mediaWrap.appendChild(pad);
    attachMediaProgress(a, row);
  }

  row.appendChild(mediaWrap);
  card.appendChild(row);
  return card;
}

function attachMediaProgress(mediaEl, rowEl) {
  const canvas = document.createElement("canvas");
  canvas.width = 120; canvas.height = 120;
  canvas.style.width = "120px"; canvas.style.height = "120px";
  canvas.setAttribute("aria-label", "Playback progress ring");
  rowEl.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const size = 120, r = 52, cx = size/2, cy = size/2;

  function draw(p) {
    ctx.clearRect(0,0,size,size);
    // bg circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--border");
    ctx.lineWidth = 10; ctx.stroke();
    // progress
    const start = -Math.PI/2;
    const end = start + Math.PI*2*p;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--primary");
    ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.stroke();
    // text
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text");
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(p*100)}%`, cx, cy);
  }
  draw(0);

  const onTime = () => {
    const p = mediaEl.duration ? (mediaEl.currentTime / mediaEl.duration) : 0;
    draw(p);
  };
  mediaEl.addEventListener("timeupdate", onTime);
  mediaEl.addEventListener("play", onTime);
  mediaEl.addEventListener("pause", onTime);
}

MEDIA.forEach(m => mediaGrid.appendChild(renderMediaCard(m)));

// -----------------------------
// Courses + Cart
// -----------------------------
const courseList = document.getElementById("courseList");
const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartModal = document.getElementById("cartModal");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");

function renderCourse(c) {
  const el = document.createElement("div");
  el.className = "course";
  el.innerHTML = `
    <div class="title" style="font-weight:800">${c.title}</div>
    <div class="meta">${c.level} • ${c.hours}h</div>
    <div style="display:flex; align-items:center; justify-content: space-between;">
      <div style="font-weight:800">$${c.price}</div>
      <button class="primary">Add to Cart</button>
    </div>
  `;
  el.querySelector("button").addEventListener("click", () => addToCart(c));
  return el;
}

COURSES.forEach(c => courseList.appendChild(renderCourse(c)));

function addToCart(course) {
  const existing = state.cart.find(i => i.id === course.id);
  if (existing) existing.qty += 1;
  else state.cart.push({ ...course, qty: 1 });
  storage.set("edustream.cart", state.cart);
  syncCartUI();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  storage.set("edustream.cart", state.cart);
  syncCartUI();
}
function incQty(id) {
  const item = state.cart.find(i => i.id === id);
  if (item) { item.qty += 1; storage.set("edustream.cart", state.cart); syncCartUI(); }
}
function decQty(id) {
  const item = state.cart.find(i => i.id === id);
  if (item) { item.qty = Math.max(1, item.qty - 1); storage.set("edustream.cart", state.cart); syncCartUI(); }
}

function cartTotal() {
  return state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function syncCartUI() {
  cartCount.textContent = state.cart.reduce((sum, i) => sum + i.qty, 0);
  cartItemsEl.innerHTML = "";
  if (state.cart.length === 0) {
    cartItemsEl.innerHTML = `<div class="muted">Cart is empty. Add some courses!</div>`;
  } else {
    state.cart.forEach(i => {
      const row = document.createElement("div");
      row.className = "cart-row";
      row.innerHTML = `
        <div style="font-weight:700">${i.title}</div>
        <button class="icon" data-dec>-</button>
        <div style="text-align:center; font-weight:700">${i.qty}</div>
        <button class="icon" data-inc>+</button>
        <div style="font-weight:700">$${(i.price * i.qty).toFixed(2)}</div>
        <button class="icon" data-remove title="Remove">🗑️</button>
      `;
      row.querySelector("[data-inc]").addEventListener("click", () => incQty(i.id));
      row.querySelector("[data-dec]").addEventListener("click", () => decQty(i.id));
      row.querySelector("[data-remove]").addEventListener("click", () => removeFromCart(i.id));
      cartItemsEl.appendChild(row);
    });
  }
  cartTotalEl.textContent = cartTotal().toFixed(2);
}
syncCartUI();

cartBtn.addEventListener("click", () => cartModal.showModal());

// -----------------------------
// Auth (Mocked JWT)
// -----------------------------
const authBtn = document.getElementById("authBtn");
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");

function setAuth(auth) {
  state.auth = auth;
  if (auth) storage.set("edustream.auth", auth); else storage.del("edustream.auth");
  updateAuthUI();
}

function updateAuthUI() {
  if (state.auth) {
    authBtn.textContent = `🚪 Logout (${state.auth.user.name})`;
  } else {
    authBtn.textContent = "🔐 Login";
  }
}
updateAuthUI();

authBtn.addEventListener("click", () => {
  if (state.auth) {
    setAuth(null);
  } else {
    loginModal.showModal();
  }
});

function fakeJwt(payload) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const sig = btoa("demo-signature");
  return `${header}.${body}.${sig}`;
}

document.getElementById("doLogin").addEventListener("click", (e) => {
  e.preventDefault();
  if (!loginForm.reportValidity()) return;
  const email = loginForm.elements.email.value;
  const password = loginForm.elements.password.value;
  // Mocked: accept any
  const token = fakeJwt({ sub: email, roles: ["student"], iat: Date.now()/1000 });
  const user = { email, name: email.split("@")[0] || "student" };
  setAuth({ token, user });
  loginModal.close();
});

// Checkout gated by auth
checkoutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (!state.auth) {
    alert("Please log in to complete purchase.");
    loginModal.showModal();
    return;
  }
  if (state.cart.length === 0) return;
  // Pretend to send order
  const orderId = Math.random().toString(36).slice(2);
  alert(`Order placed! ID: ${orderId}`);
  cartModal.close();
});

// -----------------------------
// Signup Form – Real-time Validation
// -----------------------------
const signupForm = document.getElementById("signupForm");
function validationMessage(validity) {
  if (validity.valueMissing) return "This field is required";
  if (validity.typeMismatch) return "Enter a valid format";
  if (validity.tooShort) return "Too short";
  if (validity.patternMismatch) return "Does not meet requirements";
  if (validity.rangeOverflow || validity.rangeUnderflow) return "Out of range";
  return "";
}
function bindRealtimeValidation(form) {
  form.addEventListener("input", (e) => {
    const el = e.target;
    const errorEl = el.parentElement.querySelector("small.error");
    if (!errorEl) return;
    errorEl.textContent = el.validity.valid ? "" : validationMessage(el.validity);
  });
}
bindRealtimeValidation(signupForm);
bindRealtimeValidation(loginForm);

signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!signupForm.reportValidity()) return;
  const email = signupForm.elements.email.value;
  const name = signupForm.elements.name.value;
  // Auto-login upon signup (demo)
  const token = fakeJwt({ sub: email, roles: ["student"], iat: Date.now()/1000 });
  setAuth({ token, user: { email, name } });
  alert(`Welcome, ${name}! Your account is ready.`);
});

// Quiz validation
const quizForm = document.getElementById("quizForm");
bindRealtimeValidation(quizForm);
quizForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!quizForm.reportValidity()) return;
  alert("Quiz submitted! ✅");
});

// -----------------------------
// Dashboard Charts (Canvas 2D)
// -----------------------------
const weekly = [
  { day: "Mon", mins: 35 },
  { day: "Tue", mins: 50 },
  { day: "Wed", mins: 20 },
  { day: "Thu", mins: 75 },
  { day: "Fri", mins: 60 },
  { day: "Sat", mins: 90 },
  { day: "Sun", mins: 30 },
];

const composition = [
  { name: "Videos", value: 60 },
  { name: "Quizzes", value: 25 },
  { name: "Reading", value: 15 },
];

const progress = [
  { week: "W1", percent: 10 },
  { week: "W2", percent: 28 },
  { week: "W3", percent: 45 },
  { week: "W4", percent: 68 },
  { week: "W5", percent: 82 },
  { week: "W6", percent: 100 },
];

function drawBarChart(canvas, data) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const pad = 40;
  const max = Math.max(...data.map(d => d.mins), 100);
  const bw = (W - pad*2) / data.length * 0.7;
  const gap = (W - pad*2) / data.length * 0.3;

  // axes
  ctx.strokeStyle = "#ddd";
  ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H-pad); ctx.lineTo(W-pad, H-pad); ctx.stroke();

  // bars
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--primary");
  data.forEach((d, i) => {
    const x = pad + i * (bw + gap) + gap/2;
    const h = (d.mins / max) * (H - pad*2);
    const y = (H - pad) - h;
    ctx.fillRect(x, y, bw, h);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text");
    ctx.font = "12px system-ui"; ctx.textAlign = "center";
    ctx.fillText(d.day, x + bw/2, H - pad + 14);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--primary");
  });
}

function drawPieChart(canvas, data) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const cx = W/2, cy = H/2, r = Math.min(W, H)/2 - 10;
  const total = data.reduce((s, d) => s + d.value, 0);
  let start = -Math.PI/2;
  const colors = ["#60a5fa","#34d399","#f59e0b","#f472b6","#a78bfa"];

  data.forEach((d, i) => {
    const angle = (d.value/total) * Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    start += angle;
  });

  // labels
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text");
  ctx.font = "12px system-ui"; ctx.textAlign = "center";
  let y = 16;
  data.forEach((d, i) => {
    ctx.fillText(`${d.name}: ${d.value}%`, cx, H - (data.length - i) * 16 - 6);
  });
}

function drawLineChart(canvas, data) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const pad = 40;
  const maxY = 100;
  const stepX = (W - pad*2) / (data.length - 1);

  // axes
  ctx.strokeStyle = "#ddd";
  ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H-pad); ctx.lineTo(W-pad, H-pad); ctx.stroke();

  // line
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--primary");
  ctx.lineWidth = 2; ctx.beginPath();
  data.forEach((d, i) => {
    const x = pad + i * stepX;
    const y = (H - pad) - (d.percent / maxY) * (H - pad*2);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // points + labels
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text");
  ctx.font = "12px system-ui"; ctx.textAlign = "center";
  data.forEach((d, i) => {
    const x = pad + i * stepX;
    const y = (H - pad) - (d.percent / maxY) * (H - pad*2);
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillText(d.week, x, H - pad + 14);
  });
}

drawBarChart(document.getElementById("barChart"), weekly);
drawPieChart(document.getElementById("pieChart"), composition);
drawLineChart(document.getElementById("lineChart"), progress);

// -----------------------------
// Cart open buttons
// -----------------------------
document.getElementById("cartBtn").addEventListener("click", syncCartUI);
