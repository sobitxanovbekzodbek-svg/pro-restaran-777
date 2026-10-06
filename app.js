// ===================================================
// DEWAYS RESTAURANT - INTERACTIVE LOGIC & STORE
// ===================================================

// Global State
let currentCategory = 'all';
let searchQuery = '';
let currentSort = 'popular';
let cart = [];
let appliedPromo = null;

// Valid Promo Codes
const PROMO_CODES = {
    'DEWAYS10': { discount: 0.10, desc: '10% maxsus chegirma' },
    'ZAFARAN10': { discount: 0.10, desc: '10% maxsus chegirma' },
    'MEHMON': { discount: 0.15, desc: '15% xush kelibsiz chegirmasi' }
};

// Initialize App on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    loadCartFromStorage();
    renderCategories();
    renderDishes();
    renderReviews();
    renderChefs();
    setupEventListeners();
    updateCartUI();
    initScrollReveal();
    initScrollToTop();
    initBackgroundMusic();
});

// Setup DOM Event Listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim().toLowerCase();
            renderDishes();
        });
    }

    // Sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderDishes();
        });
    }

    // Reservation form submit
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleReservationSubmit);
    }

    // Review form submit
    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }

    // Checkout form submit
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    }
}

// Format Currency UZS
function formatPrice(num) {
    return new Intl.NumberFormat('uz-UZ').format(num) + " so'm";
}

// ----------------------------------------------------
// SCROLL REVEAL & ANIMATIONS INITIALIZATION
// ----------------------------------------------------
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
        reveals.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(el => observer.observe(el));
}

function initScrollToTop() {
    const btn = document.getElementById('scroll-top-btn');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.classList.add('is-active');
        } else {
            btn.classList.remove('is-active');
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Flying Dish to Cart Animation
function animateFlyToCart(sourceElement, imageSrc) {
    if (!sourceElement || !imageSrc) return;

    const cartBtn = document.getElementById('navbar-cart-btn') || document.querySelector('button[onclick="toggleCartDrawer()"]');
    if (!cartBtn) return;

    const sourceRect = sourceElement.getBoundingClientRect();
    const cartRect = cartBtn.getBoundingClientRect();

    const flyer = document.createElement('img');
    flyer.src = imageSrc;
    flyer.className = 'flying-cart-ghost';
    flyer.style.width = '60px';
    flyer.style.height = '60px';
    flyer.style.left = `${sourceRect.left + sourceRect.width / 2 - 30}px`;
    flyer.style.top = `${sourceRect.top + sourceRect.height / 2 - 30}px`;
    flyer.style.opacity = '1';

    document.body.appendChild(flyer);

    // Trigger reflow to start CSS transition
    void flyer.offsetWidth;

    // Transition to cart position
    flyer.style.left = `${cartRect.left + cartRect.width / 2 - 15}px`;
    flyer.style.top = `${cartRect.top + cartRect.height / 2 - 15}px`;
    flyer.style.width = '24px';
    flyer.style.height = '24px';
    flyer.style.opacity = '0.2';
    flyer.style.transform = 'scale(0.4) rotate(720deg)';

    setTimeout(() => {
        flyer.remove();
        // Trigger bounce on cart icon
        cartBtn.classList.remove('cart-bounce-active');
        void cartBtn.offsetWidth;
        cartBtn.classList.add('cart-bounce-active');
    }, 850);
}

// ----------------------------------------------------
// MENU & DISHES RENDERING
// ----------------------------------------------------
function renderCategories() {
    const container = document.getElementById('categories-container');
    if (!container) return;

    container.innerHTML = RESTAURANT_DATA.categories.map(cat => `
        <button 
            onclick="setCategory('${cat.id}')"
            class="category-btn flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border border-white/10 ${cat.id === currentCategory ? 'active' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:border-amber-500/40'}">
            <i class="fa-solid ${cat.icon} text-amber-400"></i>
            <span>${cat.name}</span>
        </button>
    `).join('');
}

function setCategory(catId) {
    currentCategory = catId;
    renderCategories();
    renderDishes();
}

function renderDishes() {
    const grid = document.getElementById('dishes-grid');
    const emptyState = document.getElementById('dishes-empty');
    if (!grid) return;

    let filtered = [...RESTAURANT_DATA.dishes];

    // Filter by Category
    if (currentCategory !== 'all') {
        filtered = filtered.filter(d => d.category === currentCategory);
    }

    // Filter by Search Query
    if (searchQuery) {
        filtered = filtered.filter(d => 
            d.name.toLowerCase().includes(searchQuery) || 
            d.description.toLowerCase().includes(searchQuery) ||
            d.ingredients.toLowerCase().includes(searchQuery)
        );
    }

    // Sort
    if (currentSort === 'price-low') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price-high') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (currentSort === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
    }

    if (filtered.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    grid.innerHTML = filtered.map((dish, idx) => {
        const badgeClass = dish.badgeColor === 'gold' ? 'badge-gold' : 
                           dish.badgeColor === 'red' ? 'badge-red' : 
                           dish.badgeColor === 'green' ? 'badge-green' : 'badge-blue';

        const delayClass = (idx % 3 === 1) ? 'reveal-delay-1' : (idx % 3 === 2) ? 'reveal-delay-2' : '';

        return `
        <div class="glass-card reveal ${delayClass} rounded-2xl overflow-hidden flex flex-col group relative">
            <!-- Image Wrap -->
            <div class="dish-card-img-wrap h-56 relative bg-slate-900 cursor-pointer" onclick="openDishModal(${dish.id})">
                <img src="${dish.image}" alt="${dish.name}" class="w-full h-full object-cover" loading="lazy">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                
                <!-- Badge -->
                ${dish.badge ? `
                <span class="absolute top-3 left-3 text-xs font-semibold px-3 py-1 rounded-full ${badgeClass}">
                    ${dish.badge}
                </span>` : ''}

                <!-- Halal Indicator -->
                <span class="absolute top-3 right-3 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-sm">
                    <i class="fa-solid fa-check text-[10px]"></i> 100% Halol
                </span>

                <!-- Quick specs bottom-right on image -->
                <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300">
                    <span class="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                        <i class="fa-solid fa-weight-hanging text-amber-400"></i> ${dish.weight}
                    </span>
                    <span class="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                        <i class="fa-solid fa-star text-amber-400"></i> ${dish.rating} (${dish.reviewsCount})
                    </span>
                </div>
            </div>

            <!-- Content -->
            <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <h3 class="font-bold text-lg text-white group-hover:text-amber-300 transition-colors line-clamp-1 cursor-pointer" onclick="openDishModal(${dish.id})">
                        ${dish.name}
                    </h3>
                    <p class="text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        ${dish.description}
                    </p>
                </div>

                <div class="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                        <div class="text-xs text-slate-400">Narxi:</div>
                        <div class="text-lg font-extrabold text-amber-400 flex items-center gap-2">
                            ${formatPrice(dish.price)}
                            ${dish.oldPrice ? `<span class="text-xs text-slate-500 line-through font-normal">${formatPrice(dish.oldPrice)}</span>` : ''}
                        </div>
                    </div>

                    <button 
                        onclick="addToCart(${dish.id}, event)"
                        class="btn-gold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2"
                        title="Savatga qo'shish">
                        <i class="fa-solid fa-cart-plus"></i>
                        <span>Qo'shish</span>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Re-observe newly rendered cards
    initScrollReveal();
}

// ----------------------------------------------------
// DISH DETAIL MODAL
// ----------------------------------------------------
function openDishModal(dishId) {
    const dish = RESTAURANT_DATA.dishes.find(d => d.id === dishId);
    if (!dish) return;

    const modal = document.getElementById('dish-modal');
    const content = document.getElementById('dish-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
        <div class="relative h-72 w-full">
            <img src="${dish.image}" alt="${dish.name}" class="w-full h-full object-cover">
            <button onclick="closeDishModal()" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="absolute bottom-4 left-4 flex gap-2">
                <span class="bg-black/70 backdrop-blur-md text-amber-400 text-xs font-semibold px-3 py-1 rounded-full border border-amber-400/30">
                    <i class="fa-solid fa-fire mr-1"></i> ${dish.calories}
                </span>
                <span class="bg-black/70 backdrop-blur-md text-slate-200 text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
                    <i class="fa-solid fa-scale-balanced mr-1"></i> ${dish.weight}
                </span>
            </div>
        </div>
        <div class="p-6">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-white">${dish.name}</h2>
                    <div class="flex items-center gap-2 mt-1 text-sm text-amber-400">
                        <i class="fa-solid fa-star"></i>
                        <span class="font-bold">${dish.rating}</span>
                        <span class="text-slate-400">(${dish.reviewsCount} ta ijobiy baho)</span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-extrabold text-amber-400">${formatPrice(dish.price)}</div>
                    ${dish.oldPrice ? `<div class="text-sm text-slate-500 line-through">${formatPrice(dish.oldPrice)}</div>` : ''}
                </div>
            </div>

            <p class="text-slate-300 mt-4 leading-relaxed">${dish.description}</p>

            <div class="mt-5 p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 class="text-xs uppercase tracking-wider font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                    <i class="fa-solid fa-pepper-hot"></i> Tarkibi va masalliqlar:
                </h4>
                <p class="text-xs text-slate-300 leading-normal">${dish.ingredients}</p>
            </div>

            <div class="mt-6 flex items-center gap-3">
                <button onclick="addToCart(${dish.id}, event); closeDishModal();" class="btn-gold flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    <i class="fa-solid fa-cart-plus"></i> Savatga qo'shish (${formatPrice(dish.price)})
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeDishModal() {
    const modal = document.getElementById('dish-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// ----------------------------------------------------
// CART MANAGEMENT (Savat)
// ----------------------------------------------------
function loadCartFromStorage() {
    try {
        const saved = localStorage.getItem('deways_cart') || localStorage.getItem('zafaran_cart');
        if (saved) {
            cart = JSON.parse(saved);
        }
    } catch (e) {
        cart = [];
    }
}

function saveCartToStorage() {
    localStorage.setItem('deways_cart', JSON.stringify(cart));
}

function addToCart(dishId, event) {
    const dish = RESTAURANT_DATA.dishes.find(d => d.id === dishId);
    if (!dish) return;

    // Trigger visual flying dish animation
    if (event && event.currentTarget) {
        animateFlyToCart(event.currentTarget, dish.image);
    }

    const existing = cart.find(item => item.id === dishId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: dish.id,
            name: dish.name,
            price: dish.price,
            image: dish.image,
            quantity: 1
        });
    }

    saveCartToStorage();
    updateCartUI();
    showToast(`"${dish.name}" savatga qo'shildi!`, "success");
}

function changeCartQty(dishId, delta) {
    const item = cart.find(i => i.id === dishId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== dishId);
    }

    saveCartToStorage();
    updateCartUI();
}

function removeFromCart(dishId) {
    cart = cart.filter(i => i.id !== dishId);
    saveCartToStorage();
    updateCartUI();
    showToast("Taom savatdan o'chirildi", "info");
}

function clearCart() {
    if (cart.length === 0) return;
    cart = [];
    appliedPromo = null;
    saveCartToStorage();
    updateCartUI();
    showToast("Savat tozalandi", "info");
}

function toggleCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (!drawer) return;

    const isOpen = !drawer.classList.contains('translate-x-full');
    if (isOpen) {
        drawer.classList.add('translate-x-full');
        if (backdrop) backdrop.classList.add('hidden');
    } else {
        drawer.classList.remove('translate-x-full');
        if (backdrop) backdrop.classList.remove('hidden');
    }
}

function updateCartUI() {
    const countBadges = document.querySelectorAll('.cart-count-badge');
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

    countBadges.forEach(badge => {
        badge.innerText = totalQty;
        badge.style.display = totalQty > 0 ? 'flex' : 'none';
    });

    const itemsContainer = document.getElementById('cart-items-container');
    const emptyState = document.getElementById('cart-empty-state');
    const footer = document.getElementById('cart-footer');

    if (!itemsContainer) return;

    if (cart.length === 0) {
        itemsContainer.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        if (footer) footer.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (footer) footer.classList.remove('hidden');

    itemsContainer.innerHTML = cart.map(item => `
        <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-amber-400/30 transition-all">
            <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-lg object-cover">
            <div class="flex-1 min-w-0">
                <h4 class="text-sm font-semibold text-white truncate">${item.name}</h4>
                <div class="text-xs text-amber-400 font-bold mt-1">${formatPrice(item.price)}</div>
                <div class="flex items-center gap-2 mt-2">
                    <button onclick="changeCartQty(${item.id}, -1)" class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs transition-colors">-</button>
                    <span class="text-xs font-semibold text-slate-200 px-1">${item.quantity}</span>
                    <button onclick="changeCartQty(${item.id}, 1)" class="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs transition-colors">+</button>
                </div>
            </div>
            <button onclick="removeFromCart(${item.id})" class="text-slate-500 hover:text-red-400 p-2 text-sm transition-colors">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `).join('');

    // Totals calculation
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceFee = Math.round(subtotal * 0.10); // 10% xizmat haqi
    let discountAmount = 0;

    if (appliedPromo && PROMO_CODES[appliedPromo]) {
        discountAmount = Math.round(subtotal * PROMO_CODES[appliedPromo].discount);
    }

    const grandTotal = subtotal + serviceFee - discountAmount;

    document.getElementById('cart-subtotal').innerText = formatPrice(subtotal);
    document.getElementById('cart-service').innerText = formatPrice(serviceFee);
    document.getElementById('cart-total').innerText = formatPrice(grandTotal);

    const promoRow = document.getElementById('cart-discount-row');
    const discountEl = document.getElementById('cart-discount');
    if (promoRow && discountEl) {
        if (discountAmount > 0) {
            promoRow.classList.remove('hidden');
            discountEl.innerText = `-${formatPrice(discountAmount)}`;
        } else {
            promoRow.classList.add('hidden');
        }
    }
}

function applyPromoCode() {
    const input = document.getElementById('promo-input');
    if (!input) return;
    const code = input.value.trim().toUpperCase();

    if (PROMO_CODES[code]) {
        appliedPromo = code;
        updateCartUI();
        showToast(`Promo-kod faollashtirildi: ${PROMO_CODES[code].desc}!`, "success");
    } else {
        showToast("Noto'g'ri promo-kod! Masalan: DEWAYS10", "error");
    }
}

// ----------------------------------------------------
// CHECKOUT & ORDER CONFIRMATION
// ----------------------------------------------------
function openCheckoutModal() {
    if (cart.length === 0) {
        showToast("Savat bo'sh! Iltimos taom tanlang.", "warning");
        return;
    }
    toggleCartDrawer();

    const modal = document.getElementById('checkout-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    // Populate order brief in checkout
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceFee = Math.round(subtotal * 0.10);
    let discount = 0;
    if (appliedPromo && PROMO_CODES[appliedPromo]) {
        discount = Math.round(subtotal * PROMO_CODES[appliedPromo].discount);
    }
    const total = subtotal + serviceFee - discount;

    const summaryEl = document.getElementById('checkout-summary-text');
    if (summaryEl) {
        summaryEl.innerText = `${cart.length} xil taom • Jami: ${formatPrice(total)}`;
    }
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function handleCheckoutSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('checkout-name').value.trim();
    const phone = document.getElementById('checkout-phone').value.trim();
    const address = document.getElementById('checkout-address').value.trim();
    const orderType = document.querySelector('input[name="order_type"]:checked')?.value || 'Yetkazib berish';
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'Payme';
    const notes = document.getElementById('checkout-notes').value.trim();

    if (!name || !phone) {
        showToast("Iltimos, ism va telefon raqamingizni kiriting!", "warning");
        return;
    }

    const orderNumber = "DW-" + Math.floor(100000 + Math.random() * 900000);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceFee = Math.round(subtotal * 0.10);
    let discount = 0;
    if (appliedPromo && PROMO_CODES[appliedPromo]) {
        discount = Math.round(subtotal * PROMO_CODES[appliedPromo].discount);
    }
    const grandTotal = subtotal + serviceFee - discount;

    // Show Success Receipt Modal
    closeCheckoutModal();
    openReceiptModal({
        orderNumber,
        name,
        phone,
        address,
        orderType,
        paymentMethod,
        notes,
        items: [...cart],
        subtotal,
        serviceFee,
        discount,
        grandTotal,
        date: new Date().toLocaleString('uz-UZ')
    });

    // Clear cart after order
    cart = [];
    appliedPromo = null;
    saveCartToStorage();
    updateCartUI();
}

function openReceiptModal(data) {
    const modal = document.getElementById('receipt-modal');
    const content = document.getElementById('receipt-content');
    if (!modal || !content) return;

    content.innerHTML = `
        <div class="text-center pb-5 border-b border-white/10">
            <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto mb-3">
                <i class="fa-solid fa-check"></i>
            </div>
            <h3 class="text-2xl font-bold text-white">Buyurtmangiz qabul qilindi!</h3>
            <p class="text-xs text-slate-400 mt-1">Buyurtma ID: <span class="text-amber-400 font-mono font-bold">${data.orderNumber}</span></p>
            <p class="text-xs text-slate-400">${data.date}</p>
        </div>

        <div class="py-4 space-y-2 text-sm text-slate-300 border-b border-white/10">
            <div class="flex justify-between"><span class="text-slate-400">Buyurtmachi:</span> <span class="font-semibold text-white">${data.name}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Telefon:</span> <span class="font-semibold text-white">${data.phone}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Xizmat turi:</span> <span class="font-semibold text-amber-300">${data.orderType}</span></div>
            ${data.address ? `<div class="flex justify-between"><span class="text-slate-400">Manzil:</span> <span class="font-semibold text-white text-right">${data.address}</span></div>` : ''}
            <div class="flex justify-between"><span class="text-slate-400">To'lov usuli:</span> <span class="font-semibold text-white">${data.paymentMethod}</span></div>
        </div>

        <div class="py-4 space-y-2 max-h-48 overflow-y-auto border-b border-white/10 text-xs">
            <div class="font-bold text-amber-400 uppercase tracking-wider mb-2">Buyurtma tarkibi:</div>
            ${data.items.map(item => `
                <div class="flex justify-between text-slate-300">
                    <span>${item.name} × ${item.quantity}</span>
                    <span class="font-mono">${formatPrice(item.price * item.quantity)}</span>
                </div>
            `).join('')}
        </div>

        <div class="pt-4 space-y-1.5 text-sm">
            <div class="flex justify-between text-slate-400 text-xs"><span>Taomlar narxi:</span> <span>${formatPrice(data.subtotal)}</span></div>
            <div class="flex justify-between text-slate-400 text-xs"><span>Xizmat haqi (10%):</span> <span>${formatPrice(data.serviceFee)}</span></div>
            ${data.discount > 0 ? `<div class="flex justify-between text-emerald-400 text-xs"><span>Chegirma:</span> <span>-${formatPrice(data.discount)}</span></div>` : ''}
            <div class="flex justify-between text-lg font-bold text-white pt-2 border-t border-white/10">
                <span>Jami to'lov:</span> <span class="text-amber-400">${formatPrice(data.grandTotal)}</span>
            </div>
        </div>

        <div class="mt-6 text-center">
            <p class="text-xs text-slate-400 mb-4">DEWAYS operatori 3 daqiqa ichida buyurtmani tasdiqlash uchun siz bilan bog'lanadi.</p>
            <button onclick="closeReceiptModal()" class="btn-gold w-full py-3 rounded-xl font-bold">
                Tushunarli, rahmat!
            </button>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// ----------------------------------------------------
// TABLE RESERVATION (Stol band qilish)
// ----------------------------------------------------
function handleReservationSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('reserve-name').value.trim();
    const phone = document.getElementById('reserve-phone').value.trim();
    const guests = document.getElementById('reserve-guests').value;
    const date = document.getElementById('reserve-date').value;
    const time = document.getElementById('reserve-time').value;
    const zone = document.querySelector('input[name="reserve_zone"]:checked')?.value || 'Asosiy zal';
    const notes = document.getElementById('reserve-notes').value.trim();

    if (!name || !phone || !date || !time) {
        showToast("Iltimos, barcha zarur maydonlarni to'ldiring!", "warning");
        return;
    }

    const bookingCode = "DW-RES-" + Math.floor(1000 + Math.random() * 9000);

    // Show Reservation Confirmation Modal
    const modal = document.getElementById('reservation-confirm-modal');
    const content = document.getElementById('reservation-confirm-content');

    if (modal && content) {
        content.innerHTML = `
            <div class="text-center pb-5 border-b border-white/10">
                <div class="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto mb-3">
                    <i class="fa-solid fa-calendar-check"></i>
                </div>
                <h3 class="text-2xl font-bold text-white">Stol muvaffaqiyatli band qilindi!</h3>
                <p class="text-xs text-slate-400 mt-1">Bron kodi: <span class="text-amber-400 font-mono font-bold">${bookingCode}</span></p>
            </div>

            <div class="py-5 space-y-2.5 text-sm text-slate-300">
                <div class="flex justify-between"><span class="text-slate-400">Mehmon ismi:</span> <span class="font-semibold text-white">${name}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Telefon:</span> <span class="font-semibold text-white">${phone}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Mehmonlar soni:</span> <span class="font-semibold text-amber-300">${guests} kishi</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Sana va vaqt:</span> <span class="font-semibold text-white">${date} | ${time}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Tanlangan hudud:</span> <span class="font-semibold text-emerald-400">${zone}</span></div>
                ${notes ? `<div class="mt-3 p-3 bg-white/5 rounded-lg text-xs text-slate-300 border border-white/5"><span class="text-amber-400 font-bold">Maxsus istak:</span> ${notes}</div>` : ''}
            </div>

            <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 text-center">
                <i class="fa-solid fa-circle-info mr-1"></i> Sizning broningiz tasdiqlandi. Belgilangan vaqtdan 15 daqiqa oldin tashrif buyurishingizni so'raymiz.
            </div>

            <div class="mt-6">
                <button onclick="closeReservationConfirmModal()" class="btn-gold w-full py-3 rounded-xl font-bold">
                    Tayyor, saqlab qo'yish
                </button>
            </div>
        `;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    // Reset Form
    e.target.reset();
}

function closeReservationConfirmModal() {
    const modal = document.getElementById('reservation-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// ----------------------------------------------------
// CHEFS & REVIEWS RENDERING
// ----------------------------------------------------
function renderChefs() {
    const container = document.getElementById('chefs-container');
    if (!container) return;

    container.innerHTML = RESTAURANT_DATA.chefs.map((chef, idx) => {
        const delayClass = idx === 1 ? 'reveal-delay-1' : idx === 2 ? 'reveal-delay-2' : '';
        return `
        <div class="glass-card reveal ${delayClass} rounded-2xl overflow-hidden group">
            <div class="h-72 overflow-hidden relative">
                <img src="${chef.image}" alt="${chef.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                <div class="absolute bottom-4 left-4 right-4">
                    <span class="text-xs font-semibold px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ${chef.exp}
                    </span>
                    <h3 class="text-xl font-bold text-white mt-2">${chef.name}</h3>
                    <p class="text-xs text-amber-400 font-medium">${chef.role}</p>
                </div>
            </div>
            <div class="p-5">
                <p class="text-sm text-slate-300 leading-relaxed">${chef.desc}</p>
            </div>
        </div>
        `;
    }).join('');
}

function renderReviews() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    // Read stored reviews or fallback
    let allReviews = [...RESTAURANT_DATA.reviews];
    try {
        const custom = localStorage.getItem('deways_custom_reviews') || localStorage.getItem('zafaran_custom_reviews');
        if (custom) {
            allReviews = [...JSON.parse(custom), ...allReviews];
        }
    } catch (e) {}

    container.innerHTML = allReviews.map((r, idx) => {
        const delayClass = idx % 3 === 1 ? 'reveal-delay-1' : idx % 3 === 2 ? 'reveal-delay-2' : '';
        return `
        <div class="glass-card reveal ${delayClass} p-6 rounded-2xl flex flex-col justify-between">
            <div>
                <div class="flex items-center gap-1 text-amber-400 text-sm mb-3">
                    ${Array.from({ length: 5 }).map((_, i) => `
                        <i class="fa-solid fa-star ${i < r.rating ? '' : 'text-slate-600'}"></i>
                    `).join('')}
                </div>
                <p class="text-sm text-slate-300 leading-relaxed italic">
                    "${r.text}"
                </p>
            </div>
            <div class="flex items-center gap-3.5 mt-6 pt-4 border-t border-white/5">
                <img src="${r.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}" alt="${r.author}" class="w-11 h-11 rounded-full object-cover border border-amber-400/30">
                <div>
                    <h4 class="text-sm font-bold text-white">${r.author}</h4>
                    <p class="text-xs text-slate-400">${r.role || 'Mehmon'} • ${r.date}</p>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function openAddReviewModal() {
    const modal = document.getElementById('add-review-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeAddReviewModal() {
    const modal = document.getElementById('add-review-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function handleReviewSubmit(e) {
    e.preventDefault();
    const author = document.getElementById('review-author').value.trim();
    const role = document.getElementById('review-role').value.trim() || 'Mehmon';
    const rating = parseInt(document.getElementById('review-rating').value) || 5;
    const text = document.getElementById('review-text').value.trim();

    if (!author || !text) {
        showToast("Iltimos, ism va fikringizni yozing!", "warning");
        return;
    }

    const newReview = {
        id: Date.now(),
        author,
        role,
        rating,
        text,
        date: "Hozirgina",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
    };

    try {
        let custom = [];
        const saved = localStorage.getItem('deways_custom_reviews');
        if (saved) custom = JSON.parse(saved);
        custom.unshift(newReview);
        localStorage.setItem('deways_custom_reviews', JSON.stringify(custom));
    } catch (e) {}

    renderReviews();
    initScrollReveal();
    closeAddReviewModal();
    e.target.reset();
    showToast("Samimiy fikringiz uchun tashakkur!", "success");
}

// ----------------------------------------------------
// TOAST NOTIFICATIONS
// ----------------------------------------------------
function showToast(message, type = "info") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-anim flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-sm border z-50 transition-all duration-300 ${
        type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100' :
        type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-100' :
        type === 'warning' ? 'bg-amber-950/90 border-amber-500/50 text-amber-100' :
        'bg-slate-900/90 border-slate-700 text-slate-100'
    }`;

    const icon = type === 'success' ? 'fa-circle-check text-emerald-400' :
                 type === 'error' ? 'fa-circle-exclamation text-rose-400' :
                 type === 'warning' ? 'fa-triangle-exclamation text-amber-400' :
                 'fa-circle-info text-blue-400';

    toast.innerHTML = `
        <i class="fa-solid ${icon} text-lg"></i>
        <span class="font-medium">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => toast.remove(), 350);
    }, 3200);
}

// Mobile Menu Toggle
function toggleMobileNav() {
    const mobileMenu = document.getElementById('mobile-nav-menu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('hidden');
    }
}

// ===================================================
// BACKGROUND LOUNGE MUSIC SYSTEM
// ===================================================
let bgAudio = null;
let isMusicPlaying = false;
let isMusicMuted = false;
let currentVolume = 0.35;
let synthPlayer = null;

const LOUNGE_STREAM_URL = 'https://ice2.somafm.com/illstreet-128-mp3';
const BACKUP_STREAM_URL = 'https://ice4.somafm.com/groovesalad-128-mp3';

// Ambient Rhodes / Piano Synthesizer for 100% offline & instant playback guarantee
class AmbientLoungeSynth {
    constructor() {
        this.ctx = null;
        this.timer = null;
        this.isPlaying = false;
        // Warm jazz lounge chords (frequencies in Hz: Fmaj9, Dm9, Gm9, C9)
        this.chords = [
            [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9
            [146.83, 220.00, 261.63, 311.13, 369.99], // Dm9
            [196.00, 246.94, 293.66, 349.23, 440.00], // Gm9
            [130.81, 196.00, 261.63, 329.63, 392.00]  // C9
        ];
        this.chordIndex = 0;
    }

    initCtx() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    start() {
        this.initCtx();
        this.isPlaying = true;
        this.playChord();
        this.timer = setInterval(() => {
            if (this.isPlaying) this.playChord();
        }, 4000);
    }

    stop() {
        this.isPlaying = false;
        if (this.timer) clearInterval(this.timer);
    }

    playChord() {
        if (!this.ctx || !this.isPlaying) return;
        const now = this.ctx.currentTime;
        const chord = this.chords[this.chordIndex % this.chords.length];
        this.chordIndex++;

        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            // Warm Rhodes-like tone with soft harmonics
            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(350, now + 3.5);

            // Envelope: soft attack, gentle decay
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.04 * (isMusicMuted ? 0 : currentVolume), now + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.08);
            osc.stop(now + 4.0);
        });
    }
}

function initBackgroundMusic() {
    bgAudio = new Audio();
    bgAudio.src = LOUNGE_STREAM_URL;
    bgAudio.volume = currentVolume;
    bgAudio.preload = 'none';

    synthPlayer = new AmbientLoungeSynth();

    // Error handling on audio stream -> fallback to backup stream, then to synth
    bgAudio.addEventListener('error', () => {
        if (bgAudio.src !== BACKUP_STREAM_URL) {
            bgAudio.src = BACKUP_STREAM_URL;
            bgAudio.play().catch(() => {
                if (isMusicPlaying) synthPlayer.start();
            });
        } else {
            if (isMusicPlaying) synthPlayer.start();
        }
    });

    // Attempt autoplay immediately
    tryAutoplayMusic();

    // If autoplay was blocked by modern browser, start on first user interaction anywhere
    const onFirstUserAction = () => {
        if (!isMusicPlaying) {
            startBackgroundMusic(true);
        }
        window.removeEventListener('click', onFirstUserAction);
        window.removeEventListener('touchstart', onFirstUserAction);
        window.removeEventListener('scroll', onFirstUserAction);
        window.removeEventListener('keydown', onFirstUserAction);
    };

    window.addEventListener('click', onFirstUserAction, { once: true });
    window.addEventListener('touchstart', onFirstUserAction, { once: true });
    window.addEventListener('scroll', onFirstUserAction, { once: true });
    window.addEventListener('keydown', onFirstUserAction, { once: true });
}

function tryAutoplayMusic() {
    if (!bgAudio) return;
    bgAudio.play().then(() => {
        isMusicPlaying = true;
        updateMusicUI(true);
    }).catch(() => {
        // Autoplay policy prevented immediate playback without user interaction
        isMusicPlaying = false;
        updateMusicUI(false, "Musiqani yoqish uchun bosing 🎵");
    });
}

function startBackgroundMusic(notify = false) {
    if (!bgAudio) return;
    bgAudio.volume = currentVolume;

    bgAudio.play().then(() => {
        isMusicPlaying = true;
        updateMusicUI(true);
        if (notify) showToast("🎵 DEWAYS Lounge musiqasi yoqildi", "info");
    }).catch(() => {
        // If external audio stream fails to connect, start built-in ambient lounge synth
        synthPlayer.start();
        isMusicPlaying = true;
        updateMusicUI(true);
        if (notify) showToast("🎵 DEWAYS Relax musiqasi yoqildi", "info");
    });
}

function pauseBackgroundMusic() {
    if (bgAudio) bgAudio.pause();
    if (synthPlayer) synthPlayer.stop();
    isMusicPlaying = false;
    updateMusicUI(false, "Musiqa to'xtatildi");
}

function toggleBackgroundMusic() {
    if (isMusicPlaying) {
        pauseBackgroundMusic();
        showToast("Musiqa to'xtatildi", "info");
    } else {
        startBackgroundMusic(true);
    }
}

function setMusicVolume(val) {
    currentVolume = parseFloat(val);
    if (bgAudio) bgAudio.volume = isMusicMuted ? 0 : currentVolume;
    if (currentVolume === 0) {
        isMusicMuted = true;
    } else {
        isMusicMuted = false;
    }
    updateVolumeIcon();
}

function toggleMusicMute() {
    isMusicMuted = !isMusicMuted;
    if (bgAudio) bgAudio.volume = isMusicMuted ? 0 : currentVolume;
    updateVolumeIcon();
}

function updateVolumeIcon() {
    const muteBtn = document.getElementById('music-mute-btn');
    if (!muteBtn) return;
    if (isMusicMuted || currentVolume === 0) {
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark text-rose-400"></i>';
    } else if (currentVolume < 0.5) {
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
    } else {
        muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }
}

function updateMusicUI(playing, customText) {
    const eq = document.getElementById('music-eq');
    const playIcon = document.getElementById('music-play-icon');
    const statusText = document.getElementById('music-status-text');
    const liveDot = document.getElementById('music-live-dot');

    if (playing) {
        if (eq) eq.classList.add('is-playing');
        if (playIcon) playIcon.classList.add('hidden');
        if (eq) eq.classList.remove('hidden');
        if (statusText) statusText.innerText = "Lounge musiqa yangramoqda";
        if (liveDot) liveDot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
    } else {
        if (eq) {
            eq.classList.remove('is-playing');
            eq.classList.add('hidden');
        }
        if (playIcon) playIcon.classList.remove('hidden');
        if (statusText) statusText.innerText = customText || "Musiqa to'xtatilgan";
        if (liveDot) liveDot.className = "w-2 h-2 rounded-full bg-amber-500/50";
    }
}

