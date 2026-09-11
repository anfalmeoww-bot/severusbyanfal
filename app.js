const OWNER_PHONE = '0505298177';
const storageKey = 'severus-by-anfal-state';
const SUPABASE_URL = 'https://klmqqcnkxvxzzxsrxqeo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsbXFxY25reHZ4enp4c3J4cWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMjQ0NTcsImV4cCI6MjEwNDcwMDQ1N30.dWkOlUhVepatyVyyv4E3QKkbRurLSDeHHUxTgV0hz6Y';

const defaultState = {
  users: [],
  categories: [],
  products: [
    { id: 1, name: 'حزمة تنبيهات سماوية', category: 'تصاميم اليرتات', price: 39, symbol: '✦', description: 'مجموعة تنبيهات أنيقة لبثك بتفاصيل سماوية هادئة.' },
    { id: 2, name: 'هوية بث ليلية', category: 'هويات البث', price: 79, symbol: '◌', description: 'هوية متكاملة تمنح قناتك حضورًا واضحًا ومميزًا.' },
    { id: 3, name: 'شارات أعضاء الغزال', category: 'تصاميم اليرتات', price: 25, symbol: '♢', description: 'شارات عضوية متناسقة بتفاصيل ناعمة لعائلتك.' },
    { id: 4, name: 'قوالب منشورات', category: 'قوالب جاهزة', price: 29, symbol: '▦', description: 'قوالب مرنة وسريعة لتجهيز منشوراتك اليومية.' }
  ]
};

let state = JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultState;
let session = JSON.parse(localStorage.getItem('severus-by-anfal-session') || 'null');
let cart = JSON.parse(localStorage.getItem('severus-by-anfal-cart') || '[]');
let selectedCategory = 'الكل';
let cloudSyncTimer;

const app = document.querySelector('#app');
const save = () => localStorage.setItem(storageKey, JSON.stringify(state));
const saveSession = () => localStorage.setItem('severus-by-anfal-session', JSON.stringify(session));
const saveCart = () => localStorage.setItem('severus-by-anfal-cart', JSON.stringify(cart));
const supabaseHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { ...supabaseHeaders, ...(options.headers || {}) } });
  if (!response.ok) {
    const error = new Error(`Supabase ${response.status}`);
    error.status = response.status;
    error.detail = await response.text();
    throw error;
  }
  return response.status === 204 ? null : response.json();
}
async function loadCloudState() {
  try {
    const [products, categories] = await Promise.all([supabaseRequest('products?select=*&order=id'), supabaseRequest('categories?select=*&order=id')]);
    state.products = products;
    state.categories = categories.map(category => category.name);
    save();
  } catch (error) {
    console.warn('Cloud data unavailable; using local data.', error);
  }
}
async function createCloudProduct(product) {
  return supabaseRequest('products', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(product) });
}
async function deleteCloudProduct(id) {
  await supabaseRequest(`products?id=eq.${id}`, { method: 'DELETE' });
}
async function createCloudCategory(name) {
  await supabaseRequest('categories', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name }) });
}
const money = value => `${value.toFixed(2)} ر.س`;
const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));

function logo() {
  return `<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M25 14c-4-5-8-8-13-9 1 5 3 9 7 12-5 1-8 3-11 7 5 0 9-1 13-4l2 5-4 10h14l-4-10 2-5c4 3 8 4 13 4-3-4-6-6-11-7 4-3 6-7 7-12-5 1-9 4-13 9Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="22" cy="20" r="1.2" fill="currentColor"/></svg></span>`;
}

function header() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return `<header class="app-header"><div class="brand">${logo()}<span class="brand-name">SeverusByAnfal</span></div><div class="header-actions"><button class="profile-chip" data-action="owner">${session?.isOwner ? 'لوحة التحكم' : `أهلًا ${escapeHtml(session?.name || 'بك')}`}</button><button class="cart-btn" data-action="cart" aria-label="فتح السلة">السلة <span class="cart-count">${count}</span></button><button class="icon-btn" data-action="logout" title="تسجيل الخروج">↪</button></div></header>`;
}

function authView(mode = 'login') {
  const isSignup = mode === 'signup';
  app.innerHTML = `<main class="auth-shell"><section class="auth-card"><div class="auth-art"><div class="brand">${logo()}<span>SeverusByAnfal</span></div><div><span class="art-badge">متجر رقمي بطابعك</span><h1>صممي حضورك.<br>وخلي الباقي علينا.</h1><p>مكان واحد لعرض منتجاتك الرقمية، استقبال طلباتك، وإدارة متجرك بهدوء.</p></div><small>دخول آمن برقم الجوال</small></div><div class="auth-form"><span class="eyebrow">${isSignup ? 'مرحبًا بك' : 'عودة جميلة'}</span><h2>${isSignup ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h2><p>${isSignup ? 'بيانات بسيطة ونبدأ معك مباشرة.' : 'اكتبي رقم جوالك للوصول إلى متجرك.'}</p><form id="auth-form"><label class="field">رقم الجوال<input name="phone" type="tel" inputmode="tel" placeholder="05xxxxxxxx" pattern="[0-9+ ]{9,15}" required></label>${isSignup ? '<label class="field">الاسم<input name="name" type="text" placeholder="اسمك" required></label><label class="field">الجنس<select name="gender" required><option value="">اختاري</option><option>أنثى</option><option>ذكر</option></select></label>' : ''}<button class="primary" type="submit">${isSignup ? 'إنشاء الحساب' : 'دخول المتجر'}</button></form><div class="auth-switch">${isSignup ? 'لديك حساب؟' : 'أول مرة هنا؟'} <button class="text-btn" data-auth-mode="${isSignup ? 'login' : 'signup'}">${isSignup ? 'تسجيل الدخول' : 'إنشاء حساب'}</button></div></div></section></main>`;
  document.querySelector('#auth-form').addEventListener('submit', handleAuth);
  document.querySelector('[data-auth-mode]').addEventListener('click', event => authView(event.currentTarget.dataset.authMode));
}

async function handleAuth(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const phone = data.phone.replace(/\s/g, '');
  if (phone === OWNER_PHONE) session = { phone, name: 'صاحبة المتجر', isOwner: true };
  else if (event.currentTarget.querySelector('[name="name"]')) {
    const existing = state.users.find(user => user.phone === phone);
    if (!existing) { state.users.push({ phone, name: data.name, gender: data.gender }); save(); }
    session = { phone, name: existing?.name || data.name, isOwner: false };
  } else {
    const existing = state.users.find(user => user.phone === phone);
    if (!existing) return showToast('هذا الرقم غير مسجل، أنشئي حسابًا أولًا');
    session = { phone, name: existing.name, isOwner: false };
  }
  saveSession();
  await loadCloudState();
  renderStore();
}

function categories() { return ['الكل', ...new Set(state.categories.length ? state.categories : state.products.map(product => product.category))]; }
function productCard(product) { return `<article class="product-card"><div class="product-visual" data-product="${product.id}">${product.symbol}</div><div class="product-info"><h3>${escapeHtml(product.name)}</h3><div class="product-meta"><span>${escapeHtml(product.category)}</span><span class="price">${money(product.price)}</span></div><button class="add-btn" data-add="${product.id}">+ أضيفي للسلة</button></div></article>`; }

function renderStore() {
  if (!session) return authView();
  app.innerHTML = `${header()}<main class="page">${session.isOwner ? `<div class="owner-banner"><div><strong>لوحة صاحبة المتجر</strong><span>أنتِ الآن في وضع الإدارة. أضيفي منتجاتك ورتبي تصنيفاتك.</span></div><button class="secondary" data-action="owner-view">مشاهدة المتجر</button></div>` : ''}<section class="hero"><div><span class="eyebrow">${session.isOwner ? 'إدارة المتجر' : 'منتجات مختارة لك'}</span><h1>مساحتك<br>تأخذ شكلها.</h1><p>${session.isOwner ? 'أديري المنتجات والتصنيفات من مكان واحد.' : 'تصفحي التصاميم، اختاري ما يناسبك، وخذيها معك بخطوة.'}</p></div><div class="hero-note">✦ دفع سريع وآمن<br>Apple Pay · Visa · Mastercard</div></section>${session.isOwner ? ownerPanel() : customerStore()}</main>`;
  bindStoreEvents();
  startCloudSync();
}

function startCloudSync() {
  clearInterval(cloudSyncTimer);
  if (!session || session.isOwner) return;
  cloudSyncTimer = setInterval(async () => {
    const previous = JSON.stringify({ products: state.products, categories: state.categories });
    await loadCloudState();
    const current = JSON.stringify({ products: state.products, categories: state.categories });
    if (current !== previous) renderStore();
  }, 5000);
}

function customerStore() { return `<div class="store-layout"><aside class="sidebar"><h3>تصنيفات المتجر</h3><div class="category-list">${categories().map(category => `<button class="category-item ${selectedCategory === category ? 'active' : ''}" data-category="${escapeHtml(category)}"><span>${escapeHtml(category)}</span><span class="category-count">${category === 'الكل' ? state.products.length : state.products.filter(product => product.category === category).length}</span></button>`).join('')}</div></aside><section class="products-area"><div class="section-row"><h2>${escapeHtml(selectedCategory)}</h2><span class="eyebrow">${state.products.filter(product => selectedCategory === 'الكل' || product.category === selectedCategory).length} منتجات</span></div><div class="products">${state.products.filter(product => selectedCategory === 'الكل' || product.category === selectedCategory).map(productCard).join('') || '<div class="empty-state">لا توجد منتجات في هذا التصنيف بعد.</div>'}</div></section></div>`; }

function ownerPanel() { return `<div class="owner-grid"><section><div class="panel"><h2>إضافة تصنيف</h2><form id="category-form"><label class="field">اسم التصنيف<input name="category" placeholder="مثل: تصاميم اليرتات" required></label><button class="primary" type="submit">+ إضافة التصنيف</button></form></div><div class="panel"><h2>تصنيفاتك</h2><div class="category-list">${state.categories.map(category => `<div class="category-item active"><span>${escapeHtml(category)}</span><span class="category-count">${state.products.filter(product => product.category === category).length}</span></div>`).join('') || '<div class="empty-state">أضيفي أول تصنيف لمتجرك.</div>'}</div></div></section><section class="panel"><h2>إضافة منتج</h2><form id="product-form"><label class="field">اسم المنتج<input name="name" placeholder="اسم المنتج" required></label><label class="field">التصنيف<select name="category" required><option value="">اختاري تصنيفًا</option>${state.categories.map(category => `<option>${escapeHtml(category)}</option>`).join('')}</select></label><label class="field">السعر بالريال<input name="price" type="number" min="0" step="0.01" placeholder="39" required></label><label class="field">رمز المنتج<input name="symbol" maxlength="2" placeholder="✦" required></label><label class="field">وصف المنتج<textarea name="description" rows="3" placeholder="وصف مختصر للمنتج" required></textarea></label><button class="primary" type="submit">+ نشر المنتج</button></form><div class="section-row" style="margin-top:30px"><h2>منتجاتك</h2><span class="eyebrow">${state.products.length} منتجات</span></div><div class="admin-products">${state.products.map(product => `<div class="admin-product"><span class="product-symbol">${product.symbol}</span><div class="admin-product-info"><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)} · ${money(product.price)}</small></div><button class="delete-btn" data-delete="${product.id}">حذف</button></div>`).join('')}</div></section></div>`; }

function bindStoreEvents() {
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => { selectedCategory = button.dataset.category; renderStore(); }));
  document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => addToCart(Number(button.dataset.add))));
  document.querySelectorAll('[data-product]').forEach(item => item.addEventListener('click', () => showProduct(Number(item.dataset.product))));
  document.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', async () => { const id = Number(button.dataset.delete); try { await deleteCloudProduct(id); } catch (error) { console.error(error); return showToast('تعذر حذف المنتج من قاعدة البيانات'); } state.products = state.products.filter(product => product.id !== id); save(); renderStore(); showToast('تم حذف المنتج'); }));
  document.querySelector('[data-action="cart"]')?.addEventListener('click', showCart);
  document.querySelector('[data-action="logout"]')?.addEventListener('click', () => { session = null; saveSession(); authView(); });
  document.querySelector('[data-action="owner"]')?.addEventListener('click', () => { session.isOwner ? renderStore() : showToast('לוח הניהול זמין רק לבעלת החנות'); });
  document.querySelector('[data-action="owner-view"]')?.addEventListener('click', () => { session.isOwner = false; renderStore(); });
  document.querySelector('#category-form')?.addEventListener('submit', async event => { event.preventDefault(); const category = new FormData(event.currentTarget).get('category').trim(); if (state.categories.includes(category)) return showToast('هذا التصنيف موجود بالفعل'); try { await createCloudCategory(category); } catch (error) { console.error(error); return showToast(error.status === 409 ? 'هذا التصنيف موجود بالفعل' : 'تعذر حفظ التصنيف في قاعدة البيانات'); } state.categories.push(category); save(); renderStore(); showToast('تمت إضافة التصنيف'); });
  document.querySelector('#product-form')?.addEventListener('submit', async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const product = { name: data.name, category: data.category, price: Number(data.price), symbol: data.symbol, description: data.description }; let created; try { [created] = await createCloudProduct(product); } catch (error) { console.error(error); return showToast('تعذر حفظ المنتج في قاعدة البيانات'); } state.products.unshift(created); save(); renderStore(); showToast('تم نشر المنتج'); });
}

function addToCart(id) { const item = cart.find(entry => entry.id === id); if (item) item.quantity += 1; else cart.push({ id, quantity: 1 }); saveCart(); renderStore(); showToast('تمت إضافة المنتج للسلة'); }
function showProduct(id) { const product = state.products.find(item => item.id === id); if (!product) return; showModal(`<div class="modal-head"><h2>${escapeHtml(product.name)}</h2><button class="icon-btn" data-close>×</button></div><div class="product-visual">${product.symbol}</div><p style="line-height:1.9;color:var(--muted)">${escapeHtml(product.description)}</p><div class="total"><span>السعر</span><span>${money(product.price)}</span></div><button class="primary" style="width:100%" data-modal-add="${product.id}">أضيفي للسلة</button>`); document.querySelector('[data-modal-add]').addEventListener('click', () => { addToCart(product.id); closeModal(); }); }
function showCart() { const items = cart.map(item => ({ ...item, product: state.products.find(product => product.id === item.id) })).filter(item => item.product); const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0); showModal(`<div class="modal-head"><h2>سلة مشترياتك</h2><button class="icon-btn" data-close>×</button></div>${items.length ? items.map(item => `<div class="cart-item"><div><strong>${escapeHtml(item.product.name)}</strong><small>${money(item.product.price)} × ${item.quantity}</small></div><div class="qty"><button data-qty="${item.id}" data-change="-1">−</button><span>${item.quantity}</span><button data-qty="${item.id}" data-change="1">+</button></div></div>`).join('') + `<div class="total"><span>الإجمالي</span><span>${money(total)}</span></div><div class="payment-methods"><button class="payment-method selected">Apple Pay</button><button class="payment-method">Visa</button><button class="payment-method">Mastercard</button></div><button class="primary" style="width:100%" data-checkout>إتمام الدفع · ${money(total)}</button>` : '<div class="empty-state">السلة فارغة حاليًا.</div>'}`); document.querySelectorAll('[data-qty]').forEach(button => button.addEventListener('click', () => { const item = cart.find(entry => entry.id === Number(button.dataset.qty)); item.quantity += Number(button.dataset.change); cart = cart.filter(entry => entry.quantity > 0); saveCart(); closeModal(); showCart(); })); document.querySelectorAll('.payment-method').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.payment-method').forEach(item => item.classList.remove('selected')); button.classList.add('selected'); })); document.querySelector('[data-checkout]')?.addEventListener('click', () => { closeModal(); showToast('واجهة الدفع جاهزة للربط ببوابة الدفع'); }); }
function showModal(content) { const modal = document.createElement('div'); modal.className = 'modal-backdrop'; modal.innerHTML = `<div class="modal">${content}</div>`; modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('[data-close]')) closeModal(); }); document.body.appendChild(modal); }
function closeModal() { document.querySelector('.modal-backdrop')?.remove(); }
function showToast(message) { const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message; document.body.appendChild(toast); setTimeout(() => toast.remove(), 2400); }

window.addEventListener('storage', event => {
  if (event.key !== storageKey || !event.newValue) return;
  state = JSON.parse(event.newValue);
  cart = cart.filter(item => state.products.some(product => product.id === item.id));
  saveCart();
  if (selectedCategory !== 'الكل' && !state.products.some(product => product.category === selectedCategory)) selectedCategory = 'الكل';
  renderStore();
  showToast('تم تحديث المنتجات');
});

if (session) {
  loadCloudState().finally(renderStore);
} else {
  renderStore();
}
