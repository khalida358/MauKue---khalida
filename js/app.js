/* Shared interface shell used on every customer/public page. */
(function () {
  const ICONS = {
    cart: '<path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h6.9a2 2 0 0 0 2-1.5L20 8H6"/><circle cx="10" cy="19" r="1.2"/><circle cx="17" cy="19" r="1.2"/>',
    user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c.7-3.5 3.4-5.5 7-5.5s6.3 2 7 5.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    box: '<path d="M4 8l8-4 8 4-8 4-8-4Z"/><path d="M4 8v8l8 4 8-4V8"/><path d="M12 12v8"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    wallet: '<path d="M4 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/><path d="M4 6V5a2 2 0 0 1 2-2h11"/><path d="M16 13h.01"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c.5-3.4 2.8-5.2 6-5.2s5.5 1.8 6 5.2"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.8c2.1.5 3.3 2.3 3.6 5.2"/>',
    store: '<path d="M4 10v9h16v-9"/><path d="M3 10l2-6h14l2 6"/><path d="M3 10a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2"/><path d="M9 19v-5h6v5"/>',
    logout: '<path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4M9 12h9"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/><path d="M10 11v5M14 11v5"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    pin: '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/>',
    phone: '<path d="M7 3h3l1.5 5-2 1.5a12 12 0 0 0 5 5l1.5-2 5 1.5v3a2 2 0 0 1-2 2A17 17 0 0 1 5 5a2 2 0 0 1 2-2Z"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="M18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16Z"/>',
    chevron: '<path d="M8 10l4 4 4-4"/>'
  };

  function icon(name, className) {
    const body = ICONS[name] || '';
    return '<svg class="icon ' + (className || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  MK.icon = icon;

  function showToast(message, type) {
    let stack = document.getElementById('toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'toast-stack';
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type === 'error' ? 'toast-error' : 'toast-ok');
    toast.innerHTML = '<span class="toast-dot"></span><span>' + MK.esc(message) + '</span>';
    stack.appendChild(toast);
    window.setTimeout(function () { toast.classList.add('show'); }, 10);
    window.setTimeout(function () {
      toast.classList.remove('show');
      window.setTimeout(function () { toast.remove(); }, 250);
    }, 3200);
  }

  function cartCount() {
    return DB.cart.get(Auth.cartOwner()).reduce(function (sum, line) { return sum + Number(line.qty || 1); }, 0);
  }

  function updateCartCount() {
    const count = cartCount();
    document.querySelectorAll('[data-cart-count]').forEach(function (node) {
      node.textContent = count;
      node.classList.toggle('is-empty', count === 0);
      node.setAttribute('aria-label', count + ' item di keranjang');
    });
  }

  function activeNav(page) {
    if (['home', 'customer-dashboard'].indexOf(page) > -1) return 'home';
    if (['customer-catalog', 'customer-product'].indexOf(page) > -1) return 'catalog';
    if (page === 'customer-custom') return 'custom';
    if (['customer-orders', 'customer-order', 'customer-checkout'].indexOf(page) > -1) return 'orders';
    if (page === 'customer-profile') return 'profile';
    return '';
  }

  function renderHeader() {
    const host = document.getElementById('site-header');
    if (!host) return;
    const page = document.body.dataset.page || '';
    const active = activeNav(page);
    const saved = Auth.session();
    const links = [
      { key: 'home', label: 'Beranda', href: MK.url('customer/dashboard.html') },
      { key: 'catalog', label: 'Katalog', href: MK.url('customer/catalog.html') },
      { key: 'custom', label: 'Kue Custom', href: MK.url('customer/custom-order.html') },
      { key: 'orders', label: 'Pesanan', href: MK.url('customer/orders.html') }
    ];
    const nav = links.map(function (item) {
      return '<a class="nav-link' + (active === item.key ? ' active' : '') + '" href="' + item.href + '">' + item.label + '</a>';
    }).join('');

    let account = '<a class="btn btn-ghost btn-sm header-login" href="' + MK.url('login.html') + '">Masuk</a>';
    if (saved) {
      const isSeller = saved.role === 'seller';
      account = '<a class="account-chip" href="' + MK.url(isSeller ? 'seller/dashboard.html' : 'customer/profile.html') + '" title="' + (isSeller ? 'Buka dashboard penjual' : 'Buka profil') + '">' +
        '<span class="avatar">' + MK.esc(MK.initials(saved.name)) + '</span>' +
        '<span class="account-copy"><small>' + (isSeller ? 'Penjual' : 'Hai,') + '</small><strong>' + MK.esc(saved.name) + '</strong></span>' +
        '</a>';
    }

    host.innerHTML = '<div class="shell header-inner">' +
      '<a class="brand" href="' + MK.url('index.html') + '" aria-label="MauKue beranda">mau<span>kue</span></a>' +
      '<nav class="main-nav" aria-label="Navigasi utama">' + nav + '</nav>' +
      '<div class="header-actions">' + account +
        '<a class="cart-button" href="' + MK.url('customer/cart.html') + '" aria-label="Buka keranjang">' + icon('cart') +
          '<span class="cart-count" data-cart-count>0</span>' +
        '</a>' +
        '<button class="menu-button" id="nav-toggle" type="button" aria-label="Buka menu" aria-expanded="false">' + icon('menu') + '</button>' +
      '</div>' +
    '</div>';

    const toggle = document.getElementById('nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        const open = host.classList.toggle('header-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.innerHTML = open ? icon('close') : icon('menu');
      });
    }
    host.querySelectorAll('.main-nav a').forEach(function (link) {
      link.addEventListener('click', function () { host.classList.remove('header-open'); });
    });
    updateCartCount();
  }

  function renderFooter() {
    const host = document.getElementById('site-footer');
    if (!host) return;
    const settings = DB.settings.get();
    host.innerHTML = '<div class="shell footer-grid">' +
      '<div class="footer-brand">' +
        '<a class="brand" href="' + MK.url('index.html') + '">mau<span>kue</span></a>' +
        '<p>' + MK.esc(settings.tagline) + '. Kue buatan rumahan untuk ulang tahun, wisuda, pernikahan, dan momen kecil yang ingin dirayakan.</p>' +
        '<span class="footer-note">Demo MVP · data tersimpan di browser ini</span>' +
      '</div>' +
      '<div class="footer-col"><h4>Jelajahi</h4>' +
        '<a href="' + MK.url('customer/catalog.html') + '">Katalog kue</a>' +
        '<a href="' + MK.url('customer/custom-order.html') + '">Pesan custom</a>' +
        '<a href="' + MK.url('customer/orders.html') + '">Riwayat pesanan</a>' +
        '<a href="' + MK.url('login.html') + '">Masuk pembeli</a>' +
        '<a href="' + MK.url('seller/login.html') + '">Login admin</a>' +
      '</div>' +
      '<div class="footer-col"><h4>Hubungi</h4>' +
        '<span>' + MK.esc(settings.address) + '</span>' +
        '<a href="https://wa.me/' + MK.esc(settings.whatsapp) + '" target="_blank" rel="noopener">WhatsApp ' + MK.esc(settings.phone) + '</a>' +
        '<span>Instagram ' + MK.esc(settings.instagram) + '</span>' +
        '<span>' + MK.esc(settings.openHours) + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="shell footer-bottom"><span>&copy; ' + new Date().getFullYear() + ' MauKue. Dibuat untuk UMKM kue Indonesia.</span><span>Pickup &amp; delivery · DP ' + MK.esc(settings.dpPercent) + '%</span></div>';
  }

  function productCard(product) {
    const available = product.available !== false;
    const href = MK.url('customer/product-detail.html?id=' + encodeURIComponent(product.id));
    const image = MK.photo(product.image || product.fallbackImage, product.name, 'product-photo');
    return '<article class="product-card' + (available ? '' : ' is-unavailable') + '">' +
      '<a class="product-media" href="' + href + '" aria-label="Lihat ' + MK.esc(product.name) + '">' + image +
        '<span class="product-category">' + MK.esc(product.category) + '</span>' +
        (available ? '' : '<span class="product-soldout">Tidak tersedia</span>') +
      '</a>' +
      '<div class="product-body">' +
        '<div class="product-title-row"><h3><a href="' + href + '">' + MK.esc(product.name) + '</a></h3>' +
          (product.tag ? '<span class="product-tag">' + MK.esc(product.tag) + '</span>' : '') +
        '</div>' +
        '<p class="product-desc">' + MK.esc(product.desc || 'Kue pilihan MauKue.') + '</p>' +
        '<div class="product-foot">' +
          '<div class="product-price"><small>Mulai dari</small><strong>' + MK.money(product.price) + '</strong></div>' +
          '<button class="btn btn-sm btn-soft quick-add" type="button" data-quick-add="' + MK.esc(product.id) + '"' + (available ? '' : ' disabled') + '>' +
            icon('plus') + '<span>Keranjang</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderGrid(targetId, products) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.innerHTML = products.length ? products.map(productCard).join('') : '<div class="empty-state"><div class="empty-icon">' + icon('box') + '</div><h3>Belum ada kue di sini</h3><p>Coba kategori lain atau tambahkan produk dari area penjual.</p></div>';
  }

  function quickAdd(productId) {
    const saved = Auth.session();
    if (saved && saved.role === 'seller') {
      showToast('Masuk sebagai pembeli untuk menambahkan kue ke keranjang.', 'error');
      return;
    }
    const product = DB.products.get(productId);
    if (!product) { showToast('Produk tidak ditemukan.', 'error'); return; }
    if (product.available === false) { showToast('Produk sedang tidak tersedia.', 'error'); return; }
    const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : [{ label: 'Regular (16 cm)', extra: 0 }];
    const flavors = Array.isArray(product.flavors) && product.flavors.length ? product.flavors : ['Vanilla'];
    const size = sizes[0];
    const unitPrice = Number(product.price) + Number(size.extra || 0);
    const line = {
      lineId: MK.uid('ln_'),
      type: 'product',
      productId: product.id,
      name: product.name,
      image: product.image,
      size: size.label,
      flavor: flavors[0],
      qty: 1,
      unitPrice: unitPrice,
      lineTotal: unitPrice,
      notes: ''
    };
    try {
      DB.cart.add(Auth.cartOwner(), line);
      updateCartCount();
      window.dispatchEvent(new CustomEvent('maukue:cart'));
      showToast(product.name + ' masuk ke keranjang.');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  function initLanding() {
    const products = DB.products.available();
    if (!products.length) return;
    const categories = Array.from(new Set(products.map(function (p) { return p.category; })));
    const chips = document.getElementById('home-categories');
    if (chips) {
      chips.innerHTML = categories.map(function (category) {
        return '<a class="category-chip" href="' + MK.url('customer/catalog.html?category=' + encodeURIComponent(category)) + '">' + MK.esc(category) + '</a>';
      }).join('');
    }
    const featured = products.slice(0, 4);
    MK.renderGrid('featured-grid', featured);
    const latest = products.slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).slice(0, 4);
    MK.renderGrid('latest-grid', latest);

    const hero = document.getElementById('hero-photos');
    if (hero) {
      const picks = [products[0], products[products.length - 1]].filter(Boolean);
      hero.innerHTML = picks.map(function (product, index) {
        return '<figure class="hero-photo hero-photo-' + (index + 1) + '">' +
          MK.photo(product.image, product.name, '') +
          '<figcaption><small>' + MK.esc(product.category) + '</small><strong>' + MK.esc(product.name) + '</strong></figcaption>' +
        '</figure>';
      }).join('') + '<span class="hero-sticker">' + icon('spark') + 'Freshly baked</span>';
    }
    const aboutPhoto = document.getElementById('about-photo');
    if (aboutPhoto) {
      const product = products[1] || products[0];
      aboutPhoto.src = product.image;
      aboutPhoto.alt = product.name;
    }
    document.querySelectorAll('[data-product-count]').forEach(function (node) { node.textContent = products.length; });
  }

  function initShell() {
    renderHeader();
    renderFooter();
    const page = document.body.dataset.page;
    if (page === 'home') initLanding();
    updateCartCount();
  }

  MK.productCard = productCard;
  MK.renderGrid = renderGrid;
  MK.showToast = showToast;
  MK.updateCartCount = updateCartCount;

  document.addEventListener('DOMContentLoaded', initShell);
  document.addEventListener('click', function (event) {
    const quick = event.target.closest('[data-quick-add]');
    if (quick) {
      event.preventDefault();
      quickAdd(quick.dataset.quickAdd);
      return;
    }
    const logout = event.target.closest('[data-logout]');
    if (logout) {
      event.preventDefault();
      Auth.logout();
    }
  });
  document.addEventListener('maukue:cart', updateCartCount);
  window.addEventListener('storage', function (event) {
    if (event.key && event.key.indexOf(DB.PREFIX) === 0) updateCartCount();
  });
  window.addEventListener('maukue:quota', function () {
    showToast('Penyimpanan browser penuh. Hapus beberapa foto produk atau gunakan gambar yang lebih kecil.', 'error');
  });
})();
