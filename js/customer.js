/* Customer page controllers. */
(function () {
  function cartLines() {
    return DB.cart.get(Auth.cartOwner());
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function emptyState(title, text, ctaLabel, ctaHref, iconName) {
    return '<div class="empty-state"><div class="empty-icon">' + MK.icon(iconName || 'box') + '</div><h3>' + MK.esc(title) + '</h3><p>' + MK.esc(text) + '</p>' +
      (ctaLabel ? '<a class="btn btn-sm" href="' + ctaHref + '">' + MK.esc(ctaLabel) + '</a>' : '') + '</div>';
  }

  function renderHeroPhotos(targetId, products) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const picks = [products[0], products[products.length - 1]].filter(Boolean);
    target.innerHTML = picks.map(function (product, index) {
      return '<figure class="hero-photo hero-photo-' + (index + 1) + '">' +
        MK.photo(product.image, product.name, '') +
        '<figcaption><small>' + MK.esc(product.category) + '</small><strong>' + MK.esc(product.name) + '</strong></figcaption>' +
      '</figure>';
    }).join('') + '<span class="hero-sticker">' + MK.icon('spark') + 'Freshly baked</span>';
  }

  function initDashboard() {
    const products = DB.products.available();
    const user = Auth.currentUser();
    const name = user ? user.name.split(' ')[0] : 'Sobat Manis';
    setText('greeting-name', user ? 'Hai, ' + name : 'Hai, Sobat Manis');
    setText('greeting-note', user
      ? 'Mau bikin momen apa hari ini? Pilih kue favoritmu atau rancang kue custom sendiri.'
      : 'Jelajahi kue pilihan MauKue, atau masuk untuk menyimpan pesanan dan alamatmu.');
    const loginLink = document.getElementById('dashboard-login');
    if (loginLink) loginLink.hidden = Boolean(user);

    renderHeroPhotos('hero-photos', products);
    const categories = Array.from(new Set(products.map(function (p) { return p.category; })));
    const chips = document.getElementById('home-categories');
    if (chips) {
      chips.innerHTML = categories.map(function (category) {
        return '<a class="category-chip" href="' + MK.url('customer/catalog.html?category=' + encodeURIComponent(category)) + '">' + MK.esc(category) + '</a>';
      }).join('');
    }
    MK.renderGrid('featured-grid', products.slice(0, 4));
    const latest = products.slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).slice(0, 4);
    MK.renderGrid('latest-grid', latest);

    const activeHost = document.getElementById('active-order');
    if (activeHost) {
      const active = user ? DB.orders.list().filter(function (order) {
        return order.userId === user.id && Orders.isActive(order);
      }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); })[0] : null;
      if (!active) {
        activeHost.hidden = true;
      } else {
        activeHost.hidden = false;
        activeHost.innerHTML = '<div class="active-order-copy"><span class="eyebrow">Pesanan aktif</span><h3>' + MK.esc(active.id) + '</h3>' +
          '<p>' + MK.esc(Orders.itemSummary(active)) + ' · ' + MK.esc(active.date ? MK.formatDate(active.date) : '-') + '</p></div>' +
          '<div class="active-order-side">' + MK.badge(active.status) + '<a class="btn btn-sm btn-ghost" href="' + MK.url('customer/order-detail.html?id=' + encodeURIComponent(active.id)) + '">Lihat status</a></div>';
      }
    }
  }

  function initCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;
    let all = DB.products.available();
    const params = new URLSearchParams(location.search);
    const state = {
      q: '',
      category: params.get('category') || '',
      sort: 'recommended'
    };
    const chips = document.getElementById('catalog-chips');
    const search = document.getElementById('catalog-search');
    const sort = document.getElementById('catalog-sort');
    const count = document.getElementById('catalog-count');

    function categoryCount(category) {
      return all.filter(function (p) { return p.category === category; }).length;
    }

    function renderChips() {
      if (!chips) return;
      const categories = Array.from(new Set(all.map(function (p) { return p.category; })));
      chips.innerHTML = '<button class="category-chip' + (!state.category ? ' active' : '') + '" type="button" data-category="">Semua <span>' + all.length + '</span></button>' +
        categories.map(function (category) {
          return '<button class="category-chip' + (state.category === category ? ' active' : '') + '" type="button" data-category="' + MK.esc(category) + '">' +
            MK.esc(category) + ' <span>' + categoryCount(category) + '</span></button>';
        }).join('');
    }

    function apply() {
      let list = all.slice();
      if (state.category) list = list.filter(function (p) { return p.category === state.category; });
      if (state.q) {
        const q = state.q.toLowerCase();
        list = list.filter(function (p) {
          return String(p.name).toLowerCase().indexOf(q) > -1 ||
            String(p.category).toLowerCase().indexOf(q) > -1 ||
            String(p.desc || '').toLowerCase().indexOf(q) > -1;
        });
      }
      if (state.sort === 'price-asc') list.sort(function (a, b) { return Number(a.price) - Number(b.price); });
      else if (state.sort === 'price-desc') list.sort(function (a, b) { return Number(b.price) - Number(a.price); });
      else if (state.sort === 'newest') list.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
      MK.renderGrid('catalog-grid', list);
      if (count) count.textContent = list.length + ' kue ditemukan';
      renderChips();
    }

    if (search) {
      search.value = state.q;
      search.addEventListener('input', MK.debounce(function () { state.q = search.value.trim(); apply(); }, 120));
    }
    if (sort) {
      sort.addEventListener('change', function () { state.sort = sort.value; apply(); });
    }
    if (chips) {
      chips.addEventListener('click', function (event) {
        const button = event.target.closest('[data-category]');
        if (!button) return;
        state.category = button.dataset.category;
        const next = new URL(location.href);
        if (state.category) next.searchParams.set('category', state.category);
        else next.searchParams.delete('category');
        history.replaceState({}, '', next);
        apply();
      });
    }
    apply();

    /* A product added or edited in the admin tab appears here without a manual refresh. */
    window.addEventListener('storage', function (event) {
      if (event.key !== DB.PREFIX + 'products') return;
      all = DB.products.available();
      if (state.category && !all.some(function (product) { return product.category === state.category; })) {
        state.category = '';
      }
      apply();
    });
  }

  function initProductDetail() {
    const host = document.getElementById('product-detail');
    if (!host) return;
    const id = MK.query('id');
    const product = DB.products.get(id);
    if (!product) {
      host.innerHTML = emptyState('Produk tidak ditemukan', 'Kue yang kamu cari mungkin sudah dihapus penjual.', 'Kembali ke katalog', MK.url('customer/catalog.html'), 'search');
      return;
    }
    document.title = product.name + ' | MauKue';
    setText('breadcrumb-name', product.name);
    const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : [{ label: 'Regular (16 cm)', extra: 0 }];
    const flavors = Array.isArray(product.flavors) && product.flavors.length ? product.flavors : ['Vanilla'];
    const available = product.available !== false;
    const credit = product.photoCredit ? '<span class="photo-credit">' + MK.esc(product.photoCredit) + '</span>' : '';

    host.innerHTML = '<div class="detail-grid">' +
      '<div class="detail-media">' + MK.photo(product.image || product.fallbackImage, product.name, 'detail-photo') +
        '<div class="detail-category">' + MK.esc(product.category) + '</div>' + credit +
      '</div>' +
      '<div class="detail-info">' +
        '<div class="detail-head"><span class="eyebrow">' + MK.esc(product.category) + '</span>' +
          '<h1>' + MK.esc(product.name) + '</h1>' +
          '<div class="detail-price"><strong id="detail-price">' + MK.money(product.price) + '</strong><span>harga dasar</span></div>' +
        '</div>' +
        '<p class="detail-desc">' + MK.esc(product.desc || 'Kue pilihan MauKue.') + '</p>' +
        '<div class="detail-badges"><span class="mini-badge">' + MK.icon('clock') + 'Dibuat fresh</span><span class="mini-badge">' + MK.icon('store') + 'Pickup / delivery</span><span class="mini-badge">' + MK.icon('wallet') + 'DP 50%</span></div>' +
        '<div class="price-breakdown">' +
          '<div><span>Harga dasar</span><strong>' + MK.money(product.price) + '</strong></div>' +
          '<div><span>Tambahan ukuran <small id="size-note">' + MK.esc(sizes[0].label) + '</small></span><strong id="size-extra">+' + MK.money(sizes[0].extra || 0) + '</strong></div>' +
          '<div class="breakdown-unit"><span>Harga per kue</span><strong id="unit-price">' + MK.money(Number(product.price) + Number(sizes[0].extra || 0)) + '</strong></div>' +
        '</div>' +
        (available ? '' : '<div class="alert alert-error">Produk ini sedang tidak tersedia.</div>') +
        '<div class="detail-form">' +
          '<div class="form-grid">' +
            '<div class="field"><label for="detail-size">Ukuran</label><select id="detail-size">' + sizes.map(function (size) {
              return '<option value="' + MK.esc(size.label) + '">' + MK.esc(size.label) + (Number(size.extra) ? ' (+' + MK.money(size.extra) + ')' : '') + '</option>';
            }).join('') + '</select></div>' +
            '<div class="field"><label for="detail-flavor">Rasa</label><select id="detail-flavor">' + flavors.map(function (flavor) {
              return '<option value="' + MK.esc(flavor) + '">' + MK.esc(flavor) + '</option>';
            }).join('') + '</select></div>' +
          '</div>' +
          '<div class="field"><label for="detail-notes">Catatan untuk penjual <span class="optional">(opsional)</span></label><textarea id="detail-notes" rows="2" placeholder="Contoh: tulisan Happy Birthday, Mia!"></textarea></div>' +
          '<div class="detail-buy"><div class="qty-control" aria-label="Jumlah"><button type="button" id="detail-minus" aria-label="Kurangi">-</button><input id="detail-qty" type="number" min="1" max="99" value="1" aria-label="Jumlah"><button type="button" id="detail-plus" aria-label="Tambah">+</button></div>' +
            '<div class="detail-total"><small>Total</small><strong id="detail-total">' + MK.money(product.price) + '</strong></div>' +
            '<button class="btn" id="detail-add" type="button"' + (available ? '' : ' disabled') + '>' + MK.icon('cart') + 'Tambah ke keranjang</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    const sizeSelect = document.getElementById('detail-size');
    const flavorSelect = document.getElementById('detail-flavor');
    const qtyInput = document.getElementById('detail-qty');
    const notes = document.getElementById('detail-notes');

    function currentSize() {
      return sizes.find(function (size) { return size.label === sizeSelect.value; }) || sizes[0];
    }

    function paintPrice() {
      const size = currentSize();
      const extra = Number(size.extra || 0);
      const unit = Number(product.price) + extra;
      const qty = MK.clamp(qtyInput.value, 1, 99);
      document.getElementById('size-note').textContent = size.label;
      document.getElementById('size-extra').textContent = '+' + MK.money(extra);
      document.getElementById('unit-price').textContent = MK.money(unit);
      document.getElementById('detail-total').textContent = MK.money(unit * qty);
    }

    sizeSelect.addEventListener('change', paintPrice);
    qtyInput.addEventListener('input', paintPrice);
    document.getElementById('detail-minus').addEventListener('click', function () { qtyInput.value = MK.clamp(Number(qtyInput.value) - 1, 1, 99); paintPrice(); });
    document.getElementById('detail-plus').addEventListener('click', function () { qtyInput.value = MK.clamp(Number(qtyInput.value) + 1, 1, 99); paintPrice(); });
    paintPrice();
    document.getElementById('detail-add').addEventListener('click', function () {
      const saved = Auth.session();
      if (saved && saved.role === 'seller') { MK.showToast('Masuk sebagai pembeli untuk memesan.', 'error'); return; }
      const size = currentSize();
      const qty = MK.clamp(qtyInput.value, 1, 99);
      const unit = Number(product.price) + Number(size.extra || 0);
      const line = {
        lineId: MK.uid('ln_'),
        type: 'product',
        productId: product.id,
        name: product.name,
        image: product.image,
        size: size.label,
        flavor: flavorSelect.value,
        qty: qty,
        unitPrice: unit,
        lineTotal: unit * qty,
        notes: notes.value.trim()
      };
      try {
        DB.cart.add(Auth.cartOwner(), line);
        MK.updateCartCount();
        MK.showToast(qty + ' ' + product.name + ' masuk ke keranjang.');
      } catch (error) {
        MK.showToast(error.message, 'error');
      }
    });

    const related = DB.products.available().filter(function (p) {
      return p.category === product.category && String(p.id) !== String(product.id);
    });
    if (related.length < 4) {
      DB.products.available().forEach(function (p) {
        if (String(p.id) !== String(product.id) && related.indexOf(p) < 0 && related.length < 4) related.push(p);
      });
    }
    MK.renderGrid('related-products', related.slice(0, 4));
  }

  function customSelectOptions(target, items, valueKey, labelBuilder) {
    if (!target) return;
    target.innerHTML = items.map(function (item) {
      return '<option value="' + MK.esc(item[valueKey]) + '">' + MK.esc(labelBuilder(item)) + '</option>';
    }).join('');
  }

  function initCustomOrder() {
    const form = document.getElementById('custom-form');
    if (!form) return;
    const options = Orders.customOptions();
    const settings = DB.settings.get();
    customSelectOptions(document.getElementById('custom-size'), options.sizes, 'label', function (item) {
      return item.label + ' - mulai ' + MK.money(item.base);
    });
    customSelectOptions(document.getElementById('custom-flavor'), options.flavors.map(function (f) { return { label: f }; }), 'label', function (item) { return item.label; });
    customSelectOptions(document.getElementById('custom-decoration'), options.decorations, 'label', function (item) {
      return item.label + (Number(item.extra) ? ' (+' + MK.money(item.extra) + ')' : '');
    });
    customSelectOptions(document.getElementById('custom-theme'), options.themes.map(function (t) { return { label: t }; }), 'label', function (item) { return item.label; });
    customSelectOptions(document.getElementById('custom-layers'), options.layers, 'label', function (item) {
      return item.label + (Number(item.extra) ? ' (+' + MK.money(item.extra) + ')' : '');
    });

    const dateInput = document.getElementById('custom-date');
    const timeSelect = document.getElementById('custom-time');
    dateInput.min = MK.todayISO();
    dateInput.value = MK.addDaysISO(2);
    timeSelect.innerHTML = settings.timeSlots.map(function (slot) { return '<option>' + MK.esc(slot) + '</option>'; }).join('');

    const referenceInput = document.getElementById('custom-reference');
    const preview = document.getElementById('reference-preview');
    const previewImage = document.getElementById('reference-image');
    const previewName = document.getElementById('reference-name');
    const errorBox = document.getElementById('custom-error');
    let reference = null;

    function state() {
      return {
        size: document.getElementById('custom-size').value,
        flavor: document.getElementById('custom-flavor').value,
        primaryColor: document.getElementById('custom-primary').value,
        secondaryColor: document.getElementById('custom-secondary').value,
        decoration: document.getElementById('custom-decoration').value,
        theme: document.getElementById('custom-theme').value,
        cakeText: document.getElementById('custom-cake-text').value.trim(),
        layers: document.getElementById('custom-layers').value,
        date: dateInput.value,
        time: timeSelect.value,
        notes: document.getElementById('custom-notes').value.trim(),
        referenceImage: reference ? reference.dataUrl : '',
        referenceName: reference ? reference.name : ''
      };
    }

    function paintSummary() {
      const data = state();
      const estimate = Orders.estimateCustom(data);
      const rows = [
        ['Ukuran', data.size],
        ['Rasa', data.flavor],
        ['Jumlah tingkat', data.layers],
        ['Dekorasi', data.decoration],
        ['Tema', data.theme],
        ['Tulisan', data.cakeText || 'Tanpa tulisan'],
        ['Tanggal', MK.formatDate(data.date) + ' · ' + data.time],
        ['Referensi', reference ? reference.name : 'Belum ada']
      ];
      const host = document.getElementById('custom-summary');
      if (host) {
        host.innerHTML = '<div class="summary-colors"><span style="background:' + MK.esc(data.primaryColor) + '"></span><span style="background:' + MK.esc(data.secondaryColor) + '"></span><small>Warna utama &amp; tambahan</small></div>' +
          '<dl class="summary-list">' + rows.map(function (row) {
            return '<div><dt>' + row[0] + '</dt><dd>' + MK.esc(row[1]) + '</dd></div>';
          }).join('') + '</dl>' +
          '<div class="summary-total"><span>Estimasi harga</span><strong>' + MK.money(estimate) + '</strong></div>' +
          '<p class="summary-note">Harga final dikonfirmasi penjual setelah desain dan tingkat kesulitan diperiksa.</p>';
      }
      setText('custom-estimate', MK.money(estimate));
    }

    form.addEventListener('input', paintSummary);
    form.addEventListener('change', paintSummary);

    referenceInput.addEventListener('change', function () {
      const file = referenceInput.files[0];
      if (!file) return;
      errorBox.textContent = '';
      const oldLabel = previewName.textContent;
      previewName.textContent = 'Memproses gambar...';
      MK.compressImage(file, { maxWidth: 1100, quality: 0.78 }).then(function (result) {
        reference = result;
        previewImage.src = result.dataUrl;
        previewImage.hidden = false;
        previewName.textContent = result.name;
        preview.hidden = false;
        paintSummary();
      }).catch(function (error) {
        previewName.textContent = oldLabel;
        errorBox.textContent = error.message;
        referenceInput.value = '';
      });
    });

    const removeReference = document.getElementById('remove-reference');
    if (removeReference) {
      removeReference.addEventListener('click', function () {
        reference = null;
        referenceInput.value = '';
        preview.hidden = true;
        previewImage.hidden = true;
        previewImage.removeAttribute('src');
        paintSummary();
      });
    }

    function validate(data) {
      if (!data.size || !data.flavor || !data.layers || !data.decoration || !data.theme) return 'Lengkapi ukuran, rasa, tingkat, dekorasi, dan tema kue.';
      if (!data.date || MK.isPastDate(data.date)) return 'Pilih tanggal hari ini atau setelahnya.';
      if (!data.time) return 'Pilih waktu pengambilan atau pengiriman.';
      if (!/^#[0-9a-fA-F]{6}$/.test(data.primaryColor) || !/^#[0-9a-fA-F]{6}$/.test(data.secondaryColor)) return 'Warna tidak valid.';
      return '';
    }

    function addToCart() {
      errorBox.textContent = '';
      const saved = Auth.session();
      if (saved && saved.role === 'seller') {
        errorBox.textContent = 'Masuk sebagai pembeli untuk membuat pesanan custom.';
        return false;
      }
      const data = state();
      const problem = validate(data);
      if (problem) {
        errorBox.textContent = problem;
        return false;
      }
      const line = {
        lineId: MK.uid('ln_'),
        type: 'custom',
        name: 'Kue Custom',
        image: '',
        qty: 1,
        unitPrice: Orders.estimateCustom(data),
        lineTotal: Orders.estimateCustom(data),
        notes: data.notes,
        custom: data
      };
      try {
        DB.cart.add(Auth.cartOwner(), line);
        MK.updateCartCount();
        MK.showToast('Kue custom masuk ke keranjang. Harga masih estimasi.');
        return true;
      } catch (error) {
        errorBox.textContent = error.message;
        return false;
      }
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      addToCart();
    });
    document.getElementById('custom-checkout').addEventListener('click', function () {
      if (addToCart()) location.href = MK.url('customer/checkout.html');
    });

    paintSummary();
  }

  function cartItemInfo(line) {
    if (line.type === 'custom') {
      const c = line.custom || {};
      return {
        variant: [c.size, c.flavor, c.layers, c.theme].filter(Boolean).join(' · '),
        notes: c.notes || '',
        when: c.date ? MK.formatDate(c.date) + ' · ' + (c.time || '') : '',
        image: c.referenceImage || ''
      };
    }
    return {
      variant: [line.size, line.flavor].filter(Boolean).join(' · '),
      notes: line.notes || '',
      when: '',
      image: line.image || ''
    };
  }

  function initCart() {
    const host = document.getElementById('cart-root');
    if (!host) return;

    function render() {
      const lines = cartLines();
      if (!lines.length) {
        host.innerHTML = emptyState('Keranjangmu masih kosong', 'Yuk pilih kue favorit atau rancang kue custom impianmu.', 'Lihat katalog', MK.url('customer/catalog.html'), 'cart') +
          '<div class="center-link"><a class="text-link" href="' + MK.url('customer/custom-order.html') + '">atau pesan kue custom →</a></div>';
        return;
      }
      const totals = Orders.summarize(lines, 'pickup');
      let hasUnavailable = false;
      const rows = lines.map(function (line) {
        const info = cartItemInfo(line);
        if (line.type === 'product') {
          const product = DB.products.get(line.productId);
          if (!product || product.available === false) hasUnavailable = true;
        }
        return '<div class="cart-line" data-line="' + MK.esc(line.lineId) + '">' +
          '<div class="cart-thumb">' + MK.photo(info.image, line.name, '') + (line.type === 'custom' ? '<span class="type-flag">Custom</span>' : '') + '</div>' +
          '<div class="cart-info"><div class="cart-title"><h3>' + MK.esc(line.name) + '</h3>' + MK.badge(line.type === 'custom' ? 'Kue Custom' : 'Produk') + '</div>' +
            '<p class="cart-variant">' + MK.esc(info.variant || '-') + '</p>' +
            (info.when ? '<p class="cart-note">' + MK.icon('calendar') + 'Diinginkan: ' + MK.esc(info.when) + '</p>' : '') +
            (info.notes ? '<p class="cart-note">' + MK.icon('receipt') + MK.esc(info.notes) + '</p>' : '') +
            (line.type === 'custom' ? '<p class="cart-note is-estimate">Harga estimasi, menunggu konfirmasi penjual.</p>' : '') +
          '</div>' +
          '<div class="cart-qty">' + (line.type === 'product'
            ? '<div class="qty-control"><button type="button" data-qty="dec" aria-label="Kurangi">-</button><input type="number" min="1" max="99" value="' + line.qty + '" data-qty-input aria-label="Jumlah"><button type="button" data-qty="inc" aria-label="Tambah">+</button></div>'
            : '<span class="qty-static">1 item</span>') +
            '<small>' + MK.money(line.unitPrice) + ' / item</small>' +
          '</div>' +
          '<div class="cart-price"><strong>' + MK.money(line.lineTotal) + '</strong><button class="icon-button danger" type="button" data-remove aria-label="Hapus ' + MK.esc(line.name) + '">' + MK.icon('trash') + '</button></div>' +
        '</div>';
      }).join('');

      host.innerHTML = '<div class="cart-layout"><div class="cart-lines">' + rows + '</div>' +
        '<aside class="cart-summary">' +
          '<h2>Ringkasan</h2>' +
          '<div class="summary-row"><span>' + lines.reduce(function (sum, line) { return sum + Number(line.qty || 1); }, 0) + ' item</span><strong>' + MK.money(totals.subtotal) + '</strong></div>' +
          '<div class="summary-row"><span>Pengiriman</span><span>Dihitung saat checkout</span></div>' +
          '<div class="summary-row total"><span>Subtotal</span><strong>' + MK.money(totals.subtotal) + '</strong></div>' +
          '<div class="dp-note">' + MK.icon('wallet') + '<div><strong>DP ' + DB.settings.get().dpPercent + '%</strong><span>Dibayar setelah penjual mengonfirmasi pesanan.</span></div></div>' +
          (hasUnavailable ? '<div class="alert alert-error">Ada produk yang sudah tidak tersedia. Hapus produk tersebut sebelum checkout.</div>' : '') +
          '<a class="btn btn-block' + (hasUnavailable ? ' is-disabled' : '') + '" href="' + (hasUnavailable ? '#' : MK.url('customer/checkout.html')) + '"' + (hasUnavailable ? ' aria-disabled="true"' : '') + '>Lanjut ke checkout</a>' +
          '<a class="text-link center-link" href="' + MK.url('customer/catalog.html') + '">Tambah kue lain →</a>' +
        '</aside>' +
      '</div>';

      const blocked = host.querySelector('a.btn.is-disabled');
      if (blocked) blocked.addEventListener('click', function (event) { event.preventDefault(); MK.showToast('Hapus produk yang tidak tersedia terlebih dahulu.', 'error'); });
    }

    host.addEventListener('click', function (event) {
      const lineEl = event.target.closest('[data-line]');
      if (!lineEl) return;
      const lineId = lineEl.dataset.line;
      const line = cartLines().find(function (item) { return item.lineId === lineId; });
      if (!line) return;
      if (event.target.closest('[data-remove]')) {
        if (!window.confirm('Hapus "' + line.name + '" dari keranjang?')) return;
        DB.cart.remove(Auth.cartOwner(), lineId);
        MK.updateCartCount();
        MK.showToast('Item dihapus dari keranjang.');
        render();
        return;
      }
      const qtyButton = event.target.closest('[data-qty]');
      if (qtyButton && line.type === 'product') {
        const next = Number(line.qty) + (qtyButton.dataset.qty === 'inc' ? 1 : -1);
        DB.cart.updateQty(Auth.cartOwner(), lineId, next);
        MK.updateCartCount();
        render();
      }
    });
    host.addEventListener('change', function (event) {
      const input = event.target.closest('[data-qty-input]');
      if (!input) return;
      const lineEl = input.closest('[data-line]');
      DB.cart.updateQty(Auth.cartOwner(), lineEl.dataset.line, input.value);
      MK.updateCartCount();
      render();
    });
    render();
  }

  function initCheckout() {
    const form = document.getElementById('checkout-form');
    if (!form) return;
    const user = Auth.requireRole('customer');
    if (!user) return;
    const lines = cartLines();
    const errorBox = document.getElementById('checkout-error');
    const submit = document.getElementById('checkout-submit');
    const dateInput = document.getElementById('checkout-date');
    const timeSelect = document.getElementById('checkout-time');
    const addressField = document.getElementById('delivery-fields');
    const addressInput = document.getElementById('checkout-address');
    const savedSelect = document.getElementById('saved-address');
    const settings = DB.settings.get();

    if (!lines.length) {
      const summary = document.getElementById('checkout-summary');
      if (summary) summary.innerHTML = emptyState('Keranjang kosong', 'Tambahkan kue terlebih dahulu sebelum checkout.', 'Kembali ke katalog', MK.url('customer/catalog.html'), 'cart');
      submit.disabled = true;
      return;
    }

    const nameInput = document.getElementById('checkout-name');
    const phoneInput = document.getElementById('checkout-phone');
    const notesInput = document.getElementById('checkout-notes');
    nameInput.value = user.name || '';
    phoneInput.value = user.phone || '';

    dateInput.min = MK.todayISO();
    const customLine = lines.find(function (line) { return line.type === 'custom'; });
    const suggestedDate = customLine && customLine.custom && !MK.isPastDate(customLine.custom.date) ? customLine.custom.date : MK.addDaysISO(2);
    dateInput.value = suggestedDate;
    timeSelect.innerHTML = settings.timeSlots.map(function (slot) { return '<option>' + MK.esc(slot) + '</option>'; }).join('');
    if (customLine && customLine.custom && settings.timeSlots.indexOf(customLine.custom.time) > -1) {
      timeSelect.value = customLine.custom.time;
    }

    const addresses = Array.isArray(user.addresses) ? user.addresses : [];
    if (addresses.length) {
      savedSelect.innerHTML = '<option value="">Pilih alamat tersimpan</option>' + addresses.map(function (address) {
        return '<option value="' + MK.esc(address.id) + '">' + MK.esc(address.label) + (address.isDefault ? ' (utama)' : '') + ' - ' + MK.esc(address.address) + '</option>';
      }).join('');
      const primary = addresses.find(function (address) { return address.isDefault; }) || addresses[0];
      savedSelect.value = primary.id;
      addressInput.value = primary.address;
      savedSelect.addEventListener('change', function () {
        const selected = addresses.find(function (address) { return address.id === savedSelect.value; });
        if (selected) addressInput.value = selected.address;
      });
    } else {
      savedSelect.disabled = true;
      savedSelect.innerHTML = '<option value="">Belum ada alamat tersimpan</option>';
    }

    function method() {
      const checked = form.querySelector('input[name="method"]:checked');
      return checked ? checked.value : 'pickup';
    }

    function paintMethod() {
      const current = method();
      form.querySelectorAll('.method-card').forEach(function (card) {
        card.classList.toggle('selected', card.dataset.method === current);
      });
      addressField.hidden = current !== 'delivery';
    }

    function paintSummary() {
      const totals = Orders.summarize(lines, method());
      const host = document.getElementById('checkout-summary');
      host.innerHTML = '<h2>Ringkasan pesanan</h2>' +
        '<div class="checkout-items">' + lines.map(function (line) {
          const info = cartItemInfo(line);
          return '<div class="checkout-item"><div class="checkout-thumb">' + MK.photo(info.image, line.name, '') + '</div>' +
            '<div><strong>' + MK.esc(line.name) + '</strong><small>' + MK.esc(info.variant || '-') + ' · ' + line.qty + ' item</small></div>' +
            '<span>' + MK.money(line.lineTotal) + '</span></div>';
        }).join('') + '</div>' +
        '<div class="summary-row"><span>Subtotal</span><strong>' + MK.money(totals.subtotal) + '</strong></div>' +
        '<div class="summary-row"><span>' + (method() === 'delivery' ? 'Pengiriman' : 'Ambil di toko') + '</span><strong>' + (totals.deliveryFee ? MK.money(totals.deliveryFee) : 'Gratis') + '</strong></div>' +
        '<div class="summary-row total"><span>Total</span><strong>' + MK.money(totals.total) + '</strong></div>' +
        '<div class="dp-box"><span>DP ' + settings.dpPercent + '%</span><strong>' + MK.money(totals.dpAmount) + '</strong><small>Sisa ' + MK.money(totals.total - totals.dpAmount) + ' dibayar setelah konfirmasi penjual.</small></div>' +
        '<p class="summary-note">Pembayaran dicatat manual oleh penjual. Tidak ada pembayaran otomatis di versi ini.</p>';
    }

    form.querySelectorAll('input[name="method"]').forEach(function (radio) {
      radio.addEventListener('change', function () { paintMethod(); paintSummary(); });
    });
    paintMethod();
    paintSummary();

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      errorBox.textContent = '';
      submit.disabled = true;
      try {
        const order = Orders.createOrder({
          user: user,
          cart: lines,
          form: {
            name: nameInput.value,
            phone: phoneInput.value,
            method: method(),
            address: addressInput.value,
            date: dateInput.value,
            time: timeSelect.value,
            notes: notesInput.value
          }
        });
        DB.cart.clear(Auth.cartOwner());
        MK.updateCartCount();
        location.href = MK.url('customer/orders.html?new=' + encodeURIComponent(order.id));
      } catch (error) {
        errorBox.textContent = error.message;
        submit.disabled = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  function orderCard(order) {
    return '<article class="order-card">' +
      '<div class="order-card-head"><div><span class="eyebrow">Nomor pesanan</span><h3>' + MK.esc(order.id) + '</h3><small>Dibuat ' + MK.formatDateTime(order.createdAt) + '</small></div>' +
        '<div class="order-badges">' + MK.badge(order.status) + MK.badge(order.paymentStatus) + '</div></div>' +
      '<div class="order-meta">' +
        '<div><small>Jadwal</small><strong>' + MK.esc(order.date ? MK.formatDate(order.date) : '-') + ' · ' + MK.esc(order.time || '-') + '</strong></div>' +
        '<div><small>Metode</small><strong>' + (order.method === 'delivery' ? 'Delivery' : 'Pickup') + '</strong></div>' +
        '<div><small>Item</small><strong>' + Orders.totalQty(order) + ' item</strong></div>' +
        '<div><small>Total</small><strong>' + MK.money(order.total) + '</strong></div>' +
      '</div>' +
      '<div class="order-products">' + order.items.map(function (item) {
        return '<div class="order-product"><div class="order-thumb">' + MK.photo(item.image, item.name, '') + '</div><div><strong>' + MK.esc(item.name) + '</strong><small>' +
          MK.esc([item.size, item.flavor, item.type === 'custom' ? 'Custom' : ''].filter(Boolean).join(' · ')) + ' · ' + item.qty + 'x</small></div><span>' + MK.money(item.lineTotal) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="order-card-foot"><span>' + (order.method === 'delivery' ? 'Dikirim ke ' + MK.esc(order.address) : 'Diambil di toko') + '</span>' +
        '<a class="btn btn-sm btn-ghost" href="' + MK.url('customer/order-detail.html?id=' + encodeURIComponent(order.id)) + '">Lihat detail ' + MK.icon('arrow') + '</a></div>' +
    '</article>';
  }

  function initOrders() {
    const host = document.getElementById('orders-root');
    if (!host) return;
    const user = Auth.requireRole('customer');
    if (!user) return;
    const filter = document.getElementById('orders-filter');
    const success = document.getElementById('order-success');
    const newId = MK.query('new');

    if (newId) {
      const order = DB.orders.get(newId);
      if (order && order.userId === user.id && success) {
        success.hidden = false;
        success.innerHTML = '<div class="success-mark">' + MK.icon('check') + '</div><div><strong>Pesanan ' + MK.esc(order.id) + ' berhasil dibuat.</strong><p>Penjual akan mengonfirmasi detail dan DP pesananmu. Pantau statusnya di halaman ini.</p></div>';
      }
    }

    if (filter) {
      filter.innerHTML = '<option value="">Semua status</option>' + Orders.STATUSES.map(function (status) {
        return '<option value="' + MK.esc(status) + '">' + MK.esc(status) + '</option>';
      }).join('');
    }

    function render() {
      const all = DB.orders.list().filter(function (order) { return order.userId === user.id; })
        .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
      const filtered = filter && filter.value ? all.filter(function (order) { return order.status === filter.value; }) : all;
      if (!filtered.length) {
        host.innerHTML = emptyState(all.length ? 'Tidak ada pesanan dengan status ini' : 'Belum ada pesanan', all.length ? 'Coba pilih status lain.' : 'Pesanan yang kamu buat akan muncul di sini.', 'Mulai pesan kue', MK.url('customer/catalog.html'), 'receipt');
      } else {
        host.innerHTML = filtered.map(orderCard).join('');
      }
    }
    if (filter) filter.addEventListener('change', render);
    render();
  }

  function customDetailRows(custom) {
    if (!custom) return '';
    const rows = [
      ['Ukuran', custom.size],
      ['Rasa', custom.flavor],
      ['Jumlah tingkat', custom.layers],
      ['Dekorasi', custom.decoration],
      ['Tema', custom.theme],
      ['Tulisan di kue', custom.cakeText || '-'],
      ['Warna utama', custom.primaryColor],
      ['Warna tambahan', custom.secondaryColor],
      ['Catatan', custom.notes || '-']
    ];
    return '<dl class="detail-list">' + rows.map(function (row) {
      return '<div><dt>' + row[0] + '</dt><dd>' + MK.esc(row[1]) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function initOrderDetail() {
    const host = document.getElementById('order-detail-root');
    if (!host) return;
    const user = Auth.requireRole('customer');
    if (!user) return;
    const id = MK.query('id');
    const order = DB.orders.get(id);
    if (!order || order.userId !== user.id) {
      host.innerHTML = emptyState('Pesanan tidak ditemukan', 'Pesanan ini tidak ada atau bukan milik akunmu.', 'Kembali ke pesanan', MK.url('customer/orders.html'), 'receipt');
      return;
    }
    setText('order-code', order.id);
    document.title = order.id + ' | MauKue';
    const settings = DB.settings.get();
    const steps = ['Menunggu Konfirmasi', 'Diproses', 'Dalam Produksi', 'Siap Diambil/Dikirim', 'Selesai'];
    const currentStep = order.status === 'Dibatalkan' ? -1 : steps.indexOf(order.status);
    const tracker = '<div class="status-tracker">' + steps.map(function (step, index) {
      const done = currentStep >= index;
      return '<div class="status-step' + (done ? ' done' : '') + (currentStep === index ? ' current' : '') + '"><span>' + (done ? MK.icon('check') : index + 1) + '</span><small>' + step + '</small></div>';
    }).join('') + '</div>';
    const waText = encodeURIComponent('Halo MauKue, saya ingin menanyakan pesanan ' + order.id + '.');

    host.innerHTML = '<div class="order-detail-head"><div><span class="eyebrow">Detail pesanan</span><h1>' + MK.esc(order.id) + '</h1><p>Dibuat ' + MK.formatDateTime(order.createdAt) + '</p></div><div class="order-badges">' + MK.badge(order.status) + MK.badge(order.paymentStatus) + '</div></div>' +
      (order.status === 'Dibatalkan' ? '<div class="alert alert-error">Pesanan ini telah dibatalkan oleh penjual.</div>' : tracker) +
      '<div class="order-detail-grid"><div class="order-detail-main">' +
        '<section class="panel"><div class="panel-head"><h2>Item pesanan</h2><span>' + Orders.totalQty(order) + ' item</span></div>' +
          order.items.map(function (item) {
            return '<div class="detail-item"><div class="detail-item-photo">' + MK.photo(item.image, item.name, '') + '</div><div class="detail-item-copy"><div class="detail-item-top"><h3>' + MK.esc(item.name) + '</h3><span>' + MK.money(item.lineTotal) + '</span></div>' +
              '<p>' + MK.esc([item.size, item.flavor].filter(Boolean).join(' · ')) + ' · ' + item.qty + 'x · ' + MK.money(item.unitPrice) + ' / item</p>' +
              (item.type === 'custom' ? customDetailRows(item.custom) : (item.notes ? '<p class="item-note">Catatan: ' + MK.esc(item.notes) + '</p>' : '')) +
              (item.custom && item.custom.referenceImage ? '<div class="reference-preview"><small>Referensi desain</small><img src="' + MK.esc(item.custom.referenceImage) + '" alt="Referensi desain ' + MK.esc(order.id) + '"></div>' : '') +
            '</div></div>';
          }).join('') +
        '</section>' +
        '<section class="panel"><div class="panel-head"><h2>Catatan pesanan</h2></div><p class="muted">' + (order.notes ? MK.esc(order.notes) : 'Tidak ada catatan tambahan.') + '</p>' +
          '<div class="detail-list"><div><dt>Metode</dt><dd>' + (order.method === 'delivery' ? 'Delivery' : 'Pickup') + '</dd></div><div><dt>Jadwal</dt><dd>' + MK.esc(order.date ? MK.formatDate(order.date, true) : '-') + ' · ' + MK.esc(order.time) + '</dd></div>' +
          '<div><dt>' + (order.method === 'delivery' ? 'Alamat pengiriman' : 'Lokasi pengambilan') + '</dt><dd>' + (order.method === 'delivery' ? MK.esc(order.address) : MK.esc(settings.address)) + '</dd></div></div>' +
          '<div class="panel-actions"><a class="btn btn-sm btn-ghost" href="https://wa.me/' + MK.esc(settings.whatsapp) + '?text=' + waText + '" target="_blank" rel="noopener">' + MK.icon('phone') + 'Hubungi penjual</a></div>' +
        '</section>' +
      '</div><aside class="order-detail-side">' +
        '<section class="panel"><h2>Pembayaran</h2><div class="summary-row"><span>Subtotal</span><strong>' + MK.money(order.subtotal) + '</strong></div>' +
          '<div class="summary-row"><span>Pengiriman</span><strong>' + (order.deliveryFee ? MK.money(order.deliveryFee) : 'Gratis') + '</strong></div>' +
          '<div class="summary-row total"><span>Total</span><strong>' + MK.money(order.total) + '</strong></div>' +
          '<div class="summary-row"><span>DP ' + settings.dpPercent + '%</span><strong>' + MK.money(order.dpAmount) + '</strong></div>' +
          '<div class="summary-row"><span>Sudah dibayar</span><strong>' + MK.money(order.paidAmount) + '</strong></div>' +
          '<div class="summary-row"><span>Sisa</span><strong>' + MK.money(Orders.remaining(order)) + '</strong></div>' +
          (order.paymentNote ? '<p class="summary-note">Catatan pembayaran: ' + MK.esc(order.paymentNote) + '</p>' : '') +
        '</section>' +
        '<section class="panel"><h2>Riwayat status</h2><ol class="timeline">' + (order.history || []).slice().reverse().map(function (entry) {
          return '<li><span class="timeline-dot"></span><div><strong>' + MK.esc(entry.status) + '</strong><small>' + MK.formatDateTime(entry.at) + ' · ' + MK.esc(entry.by || 'Sistem') + '</small></div></li>';
        }).join('') + '</ol></section>' +
        '<a class="btn btn-ghost btn-block" href="' + MK.url('customer/orders.html') + '">Kembali ke semua pesanan</a>' +
      '</aside></div>';
  }

  function initProfile() {
    const form = document.getElementById('profile-form');
    if (!form) return;
    const user = Auth.requireRole('customer');
    if (!user) return;
    const nameInput = document.getElementById('profile-name');
    const phoneInput = document.getElementById('profile-phone');
    const feedback = document.getElementById('profile-feedback');
    const addressHost = document.getElementById('address-list');
    const addressForm = document.getElementById('address-form');
    const addressError = document.getElementById('address-error');

    nameInput.value = user.name || '';
    phoneInput.value = user.phone || '';
    setText('profile-display-name', user.name);
    setText('profile-username', user.username);
    setText('profile-role', 'Pembeli');
    setText('profile-joined', MK.formatDate(user.createdAt));
    setText('profile-order-count', DB.orders.list().filter(function (order) { return order.userId === user.id; }).length);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      feedback.textContent = '';
      if (nameInput.value.trim().length < 2) { feedback.textContent = 'Nama minimal 2 karakter.'; return; }
      if (!MK.isValidPhone(phoneInput.value)) { feedback.textContent = 'Nomor telepon tidak valid.'; return; }
      try {
        const updated = DB.users.update(user.id, { name: nameInput.value.trim(), phone: phoneInput.value.trim() });
        DB.session.set({ userId: updated.id, role: updated.role, name: updated.name, username: updated.username, at: new Date().toISOString() });
        feedback.textContent = 'Profil berhasil disimpan.';
        MK.showToast('Profil diperbarui.');
        const chipName = document.querySelector('.account-copy strong');
        if (chipName) chipName.textContent = updated.name;
        setText('profile-display-name', updated.name);
        const avatar = document.querySelector('.account-chip .avatar');
        if (avatar) avatar.textContent = MK.initials(updated.name);
      } catch (error) {
        feedback.textContent = error.message;
      }
    });

    function renderAddresses() {
      const latest = DB.users.get(user.id);
      const addresses = Array.isArray(latest.addresses) ? latest.addresses : [];
      if (!addresses.length) {
        addressHost.innerHTML = '<p class="muted">Belum ada alamat tersimpan. Tambahkan alamat untuk mempermudah checkout delivery.</p>';
        return;
      }
      addressHost.innerHTML = addresses.map(function (address) {
        return '<div class="address-card"><div class="address-head"><strong>' + MK.esc(address.label) + '</strong>' + (address.isDefault ? '<span class="badge is-ready">Utama</span>' : '') + '</div>' +
          '<p>' + MK.esc(address.address) + '</p><small>' + MK.esc(address.phone || '') + '</small>' +
          '<div class="address-actions">' + (address.isDefault ? '' : '<button class="text-link" type="button" data-default-address="' + MK.esc(address.id) + '">Jadikan utama</button>') +
          '<button class="text-link danger-text" type="button" data-delete-address="' + MK.esc(address.id) + '">Hapus</button></div></div>';
      }).join('');
    }

    addressHost.addEventListener('click', function (event) {
      const latest = DB.users.get(user.id);
      const addresses = Array.isArray(latest.addresses) ? latest.addresses.slice() : [];
      const defaultButton = event.target.closest('[data-default-address]');
      if (defaultButton) {
        addresses.forEach(function (address) { address.isDefault = address.id === defaultButton.dataset.defaultAddress; });
        DB.users.update(user.id, { addresses: addresses });
        renderAddresses();
        MK.showToast('Alamat utama diperbarui.');
        return;
      }
      const deleteButton = event.target.closest('[data-delete-address]');
      if (deleteButton) {
        const target = addresses.find(function (address) { return address.id === deleteButton.dataset.deleteAddress; });
        if (!target || !window.confirm('Hapus alamat "' + target.label + '"?')) return;
        const next = addresses.filter(function (address) { return address.id !== target.id; });
        if (next.length && !next.some(function (address) { return address.isDefault; })) next[0].isDefault = true;
        DB.users.update(user.id, { addresses: next });
        renderAddresses();
        MK.showToast('Alamat dihapus.');
      }
    });

    addressForm.addEventListener('submit', function (event) {
      event.preventDefault();
      addressError.textContent = '';
      const label = document.getElementById('address-label').value.trim();
      const text = document.getElementById('address-text').value.trim();
      const phone = document.getElementById('address-phone').value.trim();
      if (label.length < 2) { addressError.textContent = 'Label alamat minimal 2 karakter.'; return; }
      if (text.length < 10) { addressError.textContent = 'Alamat lengkap minimal 10 karakter.'; return; }
      if (phone && !MK.isValidPhone(phone)) { addressError.textContent = 'Nomor telepon alamat tidak valid.'; return; }
      const latest = DB.users.get(user.id);
      const addresses = Array.isArray(latest.addresses) ? latest.addresses.slice() : [];
      addresses.push({ id: MK.uid('addr_'), label: label, address: text, phone: phone, isDefault: addresses.length === 0 });
      DB.users.update(user.id, { addresses: addresses });
      addressForm.reset();
      renderAddresses();
      MK.showToast('Alamat ditambahkan.');
    });

    renderAddresses();
  }

  const pages = {
    'customer-dashboard': initDashboard,
    'customer-catalog': initCatalog,
    'customer-product': initProductDetail,
    'customer-custom': initCustomOrder,
    'customer-cart': initCart,
    'customer-checkout': initCheckout,
    'customer-orders': initOrders,
    'customer-order': initOrderDetail,
    'customer-profile': initProfile
  };

  document.addEventListener('DOMContentLoaded', function () {
    const init = pages[document.body.dataset.page];
    if (init) init();
  });
})();
