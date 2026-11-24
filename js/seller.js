/* Seller dashboard controllers. */
(function () {
  const PAGE_TITLES = {
    'seller-dashboard': 'Dashboard',
    'seller-products': 'Kelola produk',
    'seller-add-product': 'Tambah / edit produk',
    'seller-orders': 'Kelola pesanan',
    'seller-order': 'Detail pesanan',
    'seller-schedule': 'Jadwal produksi',
    'seller-payments': 'Pembayaran & DP',
    'seller-customers': 'Pelanggan'
  };

  function emptyState(title, text, ctaLabel, ctaHref, iconName) {
    return '<div class="empty-state"><div class="empty-icon">' + MK.icon(iconName || 'box') + '</div><h3>' + MK.esc(title) + '</h3><p>' + MK.esc(text) + '</p>' +
      (ctaLabel ? '<a class="btn btn-sm" href="' + ctaHref + '">' + MK.esc(ctaLabel) + '</a>' : '') + '</div>';
  }

  function renderShell(user) {
    const sidebar = document.getElementById('seller-sidebar');
    const topbar = document.getElementById('seller-topbar');
    const page = document.body.dataset.page;
    const links = [
      { page: 'seller-dashboard', label: 'Dashboard', icon: 'grid', href: 'seller/dashboard.html' },
      { page: 'seller-products', label: 'Produk', icon: 'box', href: 'seller/products.html' },
      { page: 'seller-orders', label: 'Pesanan', icon: 'receipt', href: 'seller/orders.html' },
      { page: 'seller-schedule', label: 'Jadwal produksi', icon: 'calendar', href: 'seller/schedule.html' },
      { page: 'seller-payments', label: 'Pembayaran & DP', icon: 'wallet', href: 'seller/payments.html' },
      { page: 'seller-customers', label: 'Pelanggan', icon: 'users', href: 'seller/customers.html' }
    ];
    const active = page === 'seller-add-product' ? 'seller-products' : (page === 'seller-order' ? 'seller-orders' : page);
    if (sidebar) {
      sidebar.innerHTML = '<div class="sidebar-brand"><a class="brand" href="' + MK.url('seller/dashboard.html') + '">mau<span>kue</span></a><span>Admin studio</span></div>' +
        '<div class="sidebar-store"><span class="avatar">' + MK.esc(MK.initials(user.name)) + '</span><div><strong>' + MK.esc(user.name) + '</strong><small>Toko demo</small></div></div>' +
        '<nav class="seller-nav" aria-label="Navigasi admin">' + links.map(function (link) {
          return '<a class="seller-nav-link' + (active === link.page ? ' active' : '') + '" href="' + MK.url(link.href) + '">' + MK.icon(link.icon) + '<span>' + link.label + '</span>' +
            (active === link.page ? '<span class="nav-marker"></span>' : '') + '</a>';
        }).join('') + '</nav>' +
        '<div class="sidebar-foot"><a class="seller-nav-link" href="' + MK.url('customer/dashboard.html') + '">' + MK.icon('store') + '<span>Lihat toko</span></a>' +
          '<button class="seller-nav-link logout-link" type="button" data-logout>' + MK.icon('logout') + '<span>Keluar</span></button></div>';
    }
    if (topbar) {
      topbar.innerHTML = '<div class="dash-topbar-inner"><button class="menu-button seller-menu" id="seller-menu-toggle" type="button" aria-label="Buka menu penjual">' + MK.icon('menu') + '</button>' +
        '<div class="topbar-title"><span class="eyebrow">Area admin</span><strong>' + MK.esc(PAGE_TITLES[page] || 'Dashboard') + '</strong></div>' +
        '<div class="topbar-actions"><span class="topbar-date">' + new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</span>' +
          '<a class="account-chip compact" href="' + MK.url('customer/dashboard.html') + '" title="Lihat toko"><span class="avatar">' + MK.esc(MK.initials(user.name)) + '</span><span class="account-copy"><small>Penjual</small><strong>' + MK.esc(user.name) + '</strong></span></a></div>' +
      '</div>';
    }
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    document.body.appendChild(overlay);
    function closeNav() { document.body.classList.remove('seller-nav-open'); }
    const toggle = document.getElementById('seller-menu-toggle');
    if (toggle) toggle.addEventListener('click', function () { document.body.classList.toggle('seller-nav-open'); });
    overlay.addEventListener('click', closeNav);
    if (sidebar) sidebar.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', closeNav); });
  }

  function statCard(label, value, tone, hint) {
    return '<div class="stat-card ' + (tone || '') + '"><span>' + MK.esc(label) + '</span><strong>' + value + '</strong>' + (hint ? '<small>' + MK.esc(hint) + '</small>' : '') + '</div>';
  }

  function recentRow(order) {
    return '<tr><td><a class="code-link" href="' + MK.url('seller/order-detail.html?id=' + encodeURIComponent(order.id)) + '">' + MK.esc(order.id) + '</a></td>' +
      '<td><strong>' + MK.esc(order.customerName) + '</strong><small class="table-sub">' + MK.esc(order.phone) + '</small></td>' +
      '<td>' + MK.esc(order.date ? MK.formatDate(order.date) : '-') + '<small class="table-sub">' + MK.esc(order.time || '-') + '</small></td>' +
      '<td>' + Orders.totalQty(order) + ' item<small class="table-sub">' + MK.esc(Orders.itemSummary(order)) + '</small></td>' +
      '<td><strong>' + MK.money(order.total) + '</strong><small class="table-sub">' + MK.esc(order.paymentStatus) + '</small></td>' +
      '<td>' + MK.badge(order.status) + '</td>' +
      '<td><a class="icon-button" href="' + MK.url('seller/order-detail.html?id=' + encodeURIComponent(order.id)) + '" aria-label="Buka detail">' + MK.icon('arrow') + '</a></td></tr>';
  }

  function initDashboard(user) {
    const orders = DB.orders.list();
    const today = MK.todayISO();
    const total = orders.length;
    const fresh = orders.filter(function (order) { return order.status === 'Menunggu Konfirmasi'; }).length;
    const production = orders.filter(function (order) { return order.status === 'Diproses' || order.status === 'Dalam Produksi'; }).length;
    const completed = orders.filter(function (order) { return order.status === 'Selesai'; }).length;
    const waitingDp = orders.filter(function (order) { return order.status !== 'Dibatalkan' && order.paymentStatus === 'Belum Dibayar'; }).length;
    const revenue = orders.filter(function (order) { return order.status !== 'Dibatalkan'; }).reduce(function (sum, order) { return sum + Number(order.total || 0); }, 0);

    const stats = document.getElementById('dashboard-stats');
    if (stats) {
      stats.innerHTML = statCard('Total pesanan', total, 'tone-butter', 'Semua pesanan tercatat') +
        statCard('Pesanan baru', fresh, 'tone-cherry', 'Menunggu konfirmasi') +
        statCard('Dalam produksi', production, 'tone-blue', 'Diproses & produksi') +
        statCard('Selesai', completed, 'tone-green', 'Pesanan tuntas') +
        statCard('Menunggu DP', waitingDp, 'tone-plain', 'Belum ada pembayaran') +
        statCard('Nilai pesanan', MK.money(revenue), 'tone-plain', 'Tanpa pesanan batal');
    }

    const recent = orders.slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).slice(0, 6);
    const recentBody = document.getElementById('recent-orders-body');
    if (recentBody) {
      recentBody.innerHTML = recent.length ? recent.map(recentRow).join('') : '<tr><td colspan="7">' + emptyState('Belum ada pesanan', 'Pesanan baru dari pembeli akan muncul di sini.', 'Lihat katalog toko', MK.url('customer/catalog.html'), 'receipt') + '</td></tr>';
    }

    const upcoming = orders.filter(function (order) {
      return Orders.isActive(order) && order.date && order.date >= today;
    }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }).slice(0, 5);
    const scheduleHost = document.getElementById('upcoming-schedule');
    if (scheduleHost) {
      scheduleHost.innerHTML = upcoming.length ? upcoming.map(function (order) {
        return '<a class="schedule-mini" href="' + MK.url('seller/order-detail.html?id=' + encodeURIComponent(order.id)) + '">' +
          '<span class="schedule-date"><strong>' + MK.esc(new Date(order.date + 'T00:00:00').getDate()) + '</strong><small>' + MK.esc(new Date(order.date + 'T00:00:00').toLocaleDateString('id-ID', { month: 'short' })) + '</small></span>' +
          '<span class="schedule-copy"><strong>' + MK.esc(order.customerName) + '</strong><small>' + MK.esc(Orders.itemSummary(order)) + ' · ' + MK.esc(order.time) + '</small></span>' +
          MK.badge(order.status) + '</a>';
      }).join('') : '<p class="muted">Belum ada jadwal produksi terdekat.</p>';
    }

    const activity = [];
    orders.forEach(function (order) {
      (order.history || []).forEach(function (entry) {
        activity.push({ id: order.id, customer: order.customerName, status: entry.status, at: entry.at, by: entry.by });
      });
    });
    activity.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    const activityHost = document.getElementById('recent-activity');
    if (activityHost) {
      activityHost.innerHTML = activity.length ? activity.slice(0, 7).map(function (item) {
        return '<div class="activity-row"><span class="activity-dot"></span><div><strong>' + MK.esc(item.id) + ' · ' + MK.esc(item.status) + '</strong><small>' + MK.esc(item.customer) + ' · ' + MK.timeAgo(item.at) + '</small></div></div>';
      }).join('') : '<p class="muted">Belum ada aktivitas.</p>';
    }

    const greeting = document.getElementById('seller-greeting');
    if (greeting) greeting.textContent = 'Selamat datang, ' + user.name.split(' ')[0] + '.';
  }

  function initProducts() {
    const tbody = document.getElementById('seller-products-body');
    if (!tbody) return;
    const search = document.getElementById('product-search');
    const category = document.getElementById('product-category');
    const emptyHint = document.getElementById('products-empty');
    const params = new URLSearchParams(location.search);
    if (params.get('saved') && MK.showToast) MK.showToast('Perubahan produk disimpan.');
    const categories = Array.from(new Set(DB.products.list().map(function (product) { return product.category; })));
    if (category) {
      category.innerHTML = '<option value="">Semua kategori</option>' + categories.map(function (item) { return '<option value="' + MK.esc(item) + '">' + MK.esc(item) + '</option>'; }).join('');
    }

    function render() {
      const q = search ? search.value.trim().toLowerCase() : '';
      const cat = category ? category.value : '';
      let list = DB.products.list().slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
      if (q) list = list.filter(function (product) { return String(product.name).toLowerCase().indexOf(q) > -1 || String(product.category).toLowerCase().indexOf(q) > -1; });
      if (cat) list = list.filter(function (product) { return product.category === cat; });
      emptyHint.hidden = list.length > 0;
      tbody.innerHTML = list.map(function (product) {
        return '<tr><td><div class="table-product">' + MK.photo(product.image || product.fallbackImage, product.name, 'table-thumb') + '<div><strong>' + MK.esc(product.name) + '</strong><small>' + MK.esc(product.category) + '</small></div></div></td>' +
          '<td><strong>' + MK.money(product.price) + '</strong><small class="table-sub">Harga dasar</small></td>' +
          '<td><button class="badge ' + (product.available === false ? 'is-cancelled' : 'is-done') + ' badge-button" type="button" data-toggle-product="' + MK.esc(product.id) + '">' + (product.available === false ? 'Tidak tersedia' : 'Tersedia') + '</button></td>' +
          '<td>' + MK.esc(product.tag || '-') + '</td>' +
          '<td><div class="table-actions"><a class="icon-button" href="' + MK.url('seller/add-product.html?id=' + encodeURIComponent(product.id)) + '" aria-label="Edit ' + MK.esc(product.name) + '">' + MK.icon('edit') + '</a>' +
            '<button class="icon-button danger" type="button" data-delete-product="' + MK.esc(product.id) + '" aria-label="Hapus ' + MK.esc(product.name) + '">' + MK.icon('trash') + '</button></div></td></tr>';
      }).join('');
    }

    if (search) search.addEventListener('input', MK.debounce(render, 120));
    if (category) category.addEventListener('change', render);
    tbody.addEventListener('click', function (event) {
      const toggle = event.target.closest('[data-toggle-product]');
      if (toggle) {
        const product = DB.products.get(toggle.dataset.toggleProduct);
        if (!product) return;
        DB.products.save({ id: product.id, available: product.available === false });
        render();
        MK.showToast(product.available === false ? 'Produk tersedia kembali.' : 'Produk ditandai tidak tersedia.');
        return;
      }
      const remove = event.target.closest('[data-delete-product]');
      if (remove) {
        const product = DB.products.get(remove.dataset.deleteProduct);
        if (!product || !window.confirm('Hapus produk "' + product.name + '"? Foto dan produk akan dihapus dari katalog.')) return;
        DB.products.remove(product.id);
        render();
        MK.showToast('Produk dihapus dari katalog.');
      }
    });
    render();
  }

  function initProductForm() {
    const form = document.getElementById('product-form');
    if (!form) return;
    const id = MK.query('id');
    const existing = id ? DB.products.get(id) : null;
    if (id && !existing) {
      document.getElementById('product-form-title').textContent = 'Produk tidak ditemukan';
      form.hidden = true;
      return;
    }
    const title = document.getElementById('product-form-title');
    const categorySelect = document.getElementById('product-category-input');
    categorySelect.innerHTML = (window.MAUKUE_CATEGORIES || ['Birthday Cake', 'Custom Cake', 'Brownies', 'Dessert Box', 'Wedding Cake', 'Lainnya']).map(function (category) {
      return '<option value="' + MK.esc(category) + '">' + MK.esc(category) + '</option>';
    }).join('');
    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-price');
    const descInput = document.getElementById('product-desc');
    const tagInput = document.getElementById('product-tag');
    const sizesInput = document.getElementById('product-sizes');
    const flavorsInput = document.getElementById('product-flavors');
    const availableInput = document.getElementById('product-available');
    const imageFile = document.getElementById('product-image-file');
    const imageUrl = document.getElementById('product-image-url');
    const preview = document.getElementById('product-image-preview');
    const errorBox = document.getElementById('product-form-error');
    let uploaded = null;
    let currentImage = existing ? existing.image : '';

    if (existing) {
      title.textContent = 'Edit produk';
      document.title = 'Edit ' + existing.name + ' | MauKue Seller';
      nameInput.value = existing.name;
      categorySelect.value = existing.category;
      priceInput.value = existing.price;
      descInput.value = existing.desc || '';
      tagInput.value = existing.tag || '';
      sizesInput.value = (existing.sizes || []).map(function (size) { return size.label; }).join(', ');
      flavorsInput.value = (existing.flavors || []).join(', ');
      availableInput.checked = existing.available !== false;
      if (currentImage) {
        preview.src = currentImage;
        preview.hidden = false;
      }
    } else {
      title.textContent = 'Tambah produk baru';
      sizesInput.value = 'Mini (12 cm), Regular (16 cm), Jumbo (20 cm)';
      flavorsInput.value = 'Vanilla, Cokelat, Red Velvet, Matcha';
      availableInput.checked = true;
    }

    imageFile.addEventListener('change', function () {
      const file = imageFile.files[0];
      if (!file) return;
      errorBox.textContent = '';
      MK.compressImage(file, { maxWidth: 1000, quality: 0.8 }).then(function (result) {
        uploaded = result.dataUrl;
        currentImage = result.dataUrl;
        preview.src = result.dataUrl;
        preview.hidden = false;
        imageUrl.value = '';
        MK.showToast('Foto siap disimpan.');
      }).catch(function (error) { errorBox.textContent = error.message; });
    });
    imageUrl.addEventListener('input', function () {
      if (imageUrl.value.trim()) {
        uploaded = null;
        currentImage = imageUrl.value.trim();
        preview.src = currentImage;
        preview.hidden = false;
      }
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      errorBox.textContent = '';
      const name = nameInput.value.trim();
      const price = Number(priceInput.value);
      const category = categorySelect.value;
      const desc = descInput.value.trim();
      const image = uploaded || imageUrl.value.trim() || currentImage;
      if (name.length < 3) { errorBox.textContent = 'Nama produk minimal 3 karakter.'; return; }
      if (!Number.isFinite(price) || price < 1000) { errorBox.textContent = 'Harga minimal Rp1.000.'; return; }
      if (!category) { errorBox.textContent = 'Pilih kategori produk.'; return; }
      if (desc.length < 10) { errorBox.textContent = 'Deskripsi minimal 10 karakter.'; return; }
      if (!image) { errorBox.textContent = 'Unggah foto produk atau tempel URL gambar.'; return; }
      const sizeLabels = MK.parseCommaList(sizesInput.value);
      const flavors = MK.parseCommaList(flavorsInput.value);
      if (!sizeLabels.length) { errorBox.textContent = 'Isi minimal satu pilihan ukuran.'; return; }
      if (!flavors.length) { errorBox.textContent = 'Isi minimal satu pilihan rasa.'; return; }
      try {
        DB.products.save({
          id: existing ? existing.id : null,
          name: name,
          category: category,
          price: price,
          desc: desc,
          tag: tagInput.value.trim(),
          image: image,
          sizes: sizeLabels.map(function (label) { return { label: label, extra: MK.inferSizeExtra(label) }; }),
          flavors: flavors,
          available: availableInput.checked
        });
        location.href = MK.url('seller/products.html?saved=1');
      } catch (error) {
        errorBox.textContent = error.message;
      }
    });
  }

  function initOrdersPage() {
    const tbody = document.getElementById('seller-orders-body');
    if (!tbody) return;
    const search = document.getElementById('seller-order-search');
    const status = document.getElementById('seller-order-status');
    if (status) {
      status.innerHTML = '<option value="">Semua status</option>' + Orders.STATUSES.map(function (item) { return '<option value="' + MK.esc(item) + '">' + MK.esc(item) + '</option>'; }).join('');
    }
    function render() {
      const q = search ? search.value.trim().toLowerCase() : '';
      let list = DB.orders.list().slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
      if (q) list = list.filter(function (order) {
        return String(order.id).toLowerCase().indexOf(q) > -1 ||
          String(order.customerName).toLowerCase().indexOf(q) > -1 ||
          String(order.phone).indexOf(q) > -1;
      });
      if (status && status.value) list = list.filter(function (order) { return order.status === status.value; });
      tbody.innerHTML = list.length ? list.map(function (order) {
        return '<tr><td><a class="code-link" href="' + MK.url('seller/order-detail.html?id=' + encodeURIComponent(order.id)) + '">' + MK.esc(order.id) + '</a><small class="table-sub">' + MK.formatDateTime(order.createdAt) + '</small></td>' +
          '<td><strong>' + MK.esc(order.customerName) + '</strong><small class="table-sub">' + MK.esc(order.phone) + '</small></td>' +
          '<td>' + MK.esc(order.date ? MK.formatDate(order.date) : '-') + '<small class="table-sub">' + MK.esc(order.time || '-') + ' · ' + (order.method === 'delivery' ? 'Delivery' : 'Pickup') + '</small></td>' +
          '<td>' + Orders.totalQty(order) + ' item<small class="table-sub">' + MK.esc(Orders.itemSummary(order)) + '</small></td>' +
          '<td><strong>' + MK.money(order.total) + '</strong><small class="table-sub">' + MK.esc(order.paymentStatus) + '</small></td>' +
          '<td>' + MK.badge(order.status) + '</td>' +
          '<td><a class="btn btn-sm btn-ghost" href="' + MK.url('seller/order-detail.html?id=' + encodeURIComponent(order.id)) + '">Detail</a></td></tr>';
      }).join('') : '<tr><td colspan="7">' + emptyState('Tidak ada pesanan', 'Belum ada pesanan yang cocok dengan filter ini.', '', '', 'receipt') + '</td></tr>';
    }
    if (search) search.addEventListener('input', MK.debounce(render, 120));
    if (status) status.addEventListener('change', render);
    render();
  }

  function customDetailRows(custom) {
    if (!custom) return '';
    const rows = [
      ['Ukuran', custom.size], ['Rasa', custom.flavor], ['Jumlah tingkat', custom.layers],
      ['Dekorasi', custom.decoration], ['Tema', custom.theme], ['Tulisan', custom.cakeText || '-'],
      ['Warna utama', custom.primaryColor], ['Warna tambahan', custom.secondaryColor], ['Catatan custom', custom.notes || '-']
    ];
    return '<dl class="detail-list compact">' + rows.map(function (row) { return '<div><dt>' + row[0] + '</dt><dd>' + MK.esc(row[1]) + '</dd></div>'; }).join('') + '</dl>';
  }

  function initOrderDetail() {
    const host = document.getElementById('seller-order-root');
    if (!host) return;
    const id = MK.query('id');
    const settings = DB.settings.get();

    function render() {
      const order = DB.orders.get(id);
      if (!order) {
        host.innerHTML = emptyState('Pesanan tidak ditemukan', 'Nomor pesanan tidak ada di penyimpanan browser ini.', 'Kembali ke pesanan', MK.url('seller/orders.html'), 'receipt');
        return;
      }
      document.title = order.id + ' | MauKue Seller';
      const waText = encodeURIComponent('Halo ' + order.customerName + ', kami dari MauKue ingin mengonfirmasi pesanan ' + order.id + '.');
      host.innerHTML = '<div class="dash-page-head"><div><a class="back-link" href="' + MK.url('seller/orders.html') + '">← Semua pesanan</a><h1>' + MK.esc(order.id) + '</h1><p>Dibuat ' + MK.formatDateTime(order.createdAt) + '</p></div><div class="order-badges">' + MK.badge(order.status) + MK.badge(order.paymentStatus) + '</div></div>' +
        '<div class="seller-order-grid"><div class="seller-order-main">' +
          '<section class="panel"><div class="panel-head"><h2>Informasi pelanggan</h2></div><div class="info-grid">' +
            '<div><small>Nama</small><strong>' + MK.esc(order.customerName) + '</strong></div>' +
            '<div><small>Telepon</small><strong>' + MK.esc(order.phone) + '</strong></div>' +
            '<div><small>Metode</small><strong>' + (order.method === 'delivery' ? 'Delivery' : 'Pickup') + '</strong></div>' +
            '<div><small>Jadwal</small><strong>' + MK.esc(order.date ? MK.formatDate(order.date, true) : '-') + '<br>' + MK.esc(order.time || '-') + '</strong></div>' +
            '<div class="info-wide"><small>' + (order.method === 'delivery' ? 'Alamat pengiriman' : 'Lokasi pengambilan') + '</small><strong>' + (order.method === 'delivery' ? MK.esc(order.address) : MK.esc(settings.address)) + '</strong></div>' +
            (order.notes ? '<div class="info-wide"><small>Catatan pelanggan</small><strong>' + MK.esc(order.notes) + '</strong></div>' : '') +
          '</div><div class="panel-actions"><a class="btn btn-sm btn-ghost" href="https://wa.me/' + MK.esc(order.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')) + '?text=' + waText + '" target="_blank" rel="noopener">' + MK.icon('phone') + 'Chat pelanggan</a></div></section>' +
          '<section class="panel"><div class="panel-head"><h2>Item pesanan</h2><span>' + Orders.totalQty(order) + ' item</span></div>' +
            order.items.map(function (item) {
              return '<div class="detail-item"><div class="detail-item-photo">' + MK.photo(item.image, item.name, '') + '</div><div class="detail-item-copy"><div class="detail-item-top"><h3>' + MK.esc(item.name) + (item.type === 'custom' ? ' <span class="badge is-dp">Custom</span>' : '') + '</h3><span>' + MK.money(item.lineTotal) + '</span></div>' +
                '<p>' + MK.esc([item.size, item.flavor].filter(Boolean).join(' · ')) + ' · ' + item.qty + 'x · ' + MK.money(item.unitPrice) + ' / item</p>' +
                (item.type === 'custom' ? customDetailRows(item.custom) : (item.notes ? '<p class="item-note">Catatan: ' + MK.esc(item.notes) + '</p>' : '')) +
                (item.custom && item.custom.referenceImage ? '<div class="reference-preview"><small>Referensi desain dari pelanggan</small><a href="' + MK.esc(item.custom.referenceImage) + '" target="_blank" rel="noopener"><img src="' + MK.esc(item.custom.referenceImage) + '" alt="Referensi desain ' + MK.esc(order.id) + '"></a></div>' : '') +
              '</div></div>';
            }).join('') +
          '</section>' +
          '<section class="panel"><div class="panel-head"><h2>Pembayaran &amp; DP</h2><span>Manual</span></div>' +
            '<div class="money-grid"><div><small>Total</small><strong>' + MK.money(order.total) + '</strong></div><div><small>DP ' + settings.dpPercent + '%</small><strong>' + MK.money(order.dpAmount) + '</strong></div>' +
            '<div><small>Sudah dibayar</small><strong>' + MK.money(order.paidAmount) + '</strong></div><div><small>Sisa</small><strong>' + MK.money(Orders.remaining(order)) + '</strong></div></div>' +
            '<div class="form-grid payment-form"><div class="field"><label for="payment-status">Status pembayaran</label><select id="payment-status">' + Orders.PAYMENT_STATUSES.map(function (status) {
              return '<option' + (order.paymentStatus === status ? ' selected' : '') + '>' + MK.esc(status) + '</option>';
            }).join('') + '</select></div><div class="field"><label for="payment-note">Catatan pembayaran</label><input id="payment-note" value="' + MK.esc(order.paymentNote || '') + '" placeholder="Contoh: DP transfer 24 Nov"></div></div>' +
            '<button class="btn btn-sm" id="save-payment" type="button">' + MK.icon('wallet') + 'Simpan pembayaran</button>' +
            '<p class="summary-note">Hanya catat pembayaran yang sudah benar-benar kamu terima. Tidak ada uang yang diproses website.</p>' +
          '</section>' +
        '</div><aside class="seller-order-side">' +
          '<section class="panel"><h2>Perbarui status</h2><div class="field"><label for="order-status">Status produksi</label><select id="order-status">' + Orders.STATUSES.map(function (status) {
            return '<option' + (order.status === status ? ' selected' : '') + '>' + MK.esc(status) + '</option>';
          }).join('') + '</select></div><button class="btn btn-block" id="save-status" type="button">Simpan status</button>' +
            '<p class="summary-note">Perubahan langsung terlihat di halaman pesanan pelanggan pada browser ini.</p></section>' +
          '<section class="panel"><h2>Riwayat status</h2><ol class="timeline">' + (order.history || []).slice().reverse().map(function (entry) {
            return '<li><span class="timeline-dot"></span><div><strong>' + MK.esc(entry.status) + '</strong><small>' + MK.formatDateTime(entry.at) + ' · ' + MK.esc(entry.by || 'Sistem') + '</small></div></li>';
          }).join('') + '</ol></section>' +
          '<a class="btn btn-ghost btn-block" href="' + MK.url('seller/orders.html') + '">Kembali</a>' +
        '</aside></div>';

      document.getElementById('save-status').addEventListener('click', function () {
        try {
          Orders.updateStatus(order.id, document.getElementById('order-status').value, 'Penjual');
          MK.showToast('Status pesanan diperbarui.');
          render();
        } catch (error) { MK.showToast(error.message, 'error'); }
      });
      document.getElementById('save-payment').addEventListener('click', function () {
        try {
          Orders.updatePayment(order.id, document.getElementById('payment-status').value, document.getElementById('payment-note').value, 'Penjual');
          MK.showToast('Pembayaran dicatat.');
          render();
        } catch (error) { MK.showToast(error.message, 'error'); }
      });
    }
    render();
  }

  function initSchedule() {
    const host = document.getElementById('schedule-root');
    if (!host) return;
    const filter = document.getElementById('schedule-filter');
    const today = MK.todayISO();
    function render() {
      const mode = filter ? filter.value : 'upcoming';
      let list = DB.orders.list().slice();
      if (mode === 'upcoming') {
        list = list.filter(function (order) { return order.status !== 'Dibatalkan' && order.status !== 'Selesai' && order.date && order.date >= today; });
      }
      list.sort(function (a, b) { return ((a.date || '') + (a.time || '')).localeCompare((b.date || '') + (b.time || '')); });
      if (!list.length) {
        host.innerHTML = emptyState('Belum ada jadwal', 'Jadwal produksi muncul setelah ada pesanan dengan tanggal.', 'Kelola pesanan', MK.url('seller/orders.html'), 'calendar');
        return;
      }
      const groups = {};
      list.forEach(function (order) {
        const key = order.date || 'Tanpa tanggal';
        if (!groups[key]) groups[key] = [];
        groups[key].push(order);
      });
      host.innerHTML = Object.keys(groups).sort().map(function (date) {
        const orders = groups[date];
        return '<section class="schedule-group"><div class="schedule-day-head"><div><span class="eyebrow">' + (date === today ? 'Hari ini' : 'Jadwal') + '</span><h2>' + (date === 'Tanpa tanggal' ? date : MK.formatDate(date, true)) + '</h2></div><span class="schedule-count">' + orders.length + ' pesanan</span></div>' +
          '<div class="schedule-table">' + orders.map(function (order) {
            return '<a class="schedule-row" href="' + MK.url('seller/order-detail.html?id=' + encodeURIComponent(order.id)) + '">' +
              '<span class="schedule-time">' + MK.esc(order.time || '-') + '</span>' +
              '<span class="schedule-main"><strong>' + MK.esc(order.customerName) + '</strong><small>' + MK.esc(Orders.itemSummary(order)) + '</small></span>' +
              '<span class="schedule-qty">' + Orders.totalQty(order) + ' item</span>' +
              '<span class="schedule-method">' + (order.method === 'delivery' ? 'Delivery' : 'Pickup') + '</span>' +
              MK.badge(order.status) + '</a>';
          }).join('') + '</div></section>';
      }).join('');
    }
    if (filter) filter.addEventListener('change', render);
    render();
  }

  function initPayments() {
    const host = document.getElementById('payments-root');
    if (!host) return;
    const search = document.getElementById('payment-search');
    function render() {
      const q = search ? search.value.trim().toLowerCase() : '';
      let orders = DB.orders.list().slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
      if (q) orders = orders.filter(function (order) {
        return String(order.id).toLowerCase().indexOf(q) > -1 || String(order.customerName).toLowerCase().indexOf(q) > -1;
      });
      const totalValue = orders.reduce(function (sum, order) { return sum + Number(order.total || 0); }, 0);
      const received = orders.reduce(function (sum, order) { return sum + Number(order.paidAmount || 0); }, 0);
      const remaining = orders.reduce(function (sum, order) { return sum + Orders.remaining(order); }, 0);
      const unpaid = orders.filter(function (order) { return order.paymentStatus === 'Belum Dibayar'; }).length;
      host.innerHTML = '<div class="stats-row">' + statCard('Total nilai', MK.money(totalValue), 'tone-butter', 'Semua pesanan') +
        statCard('Sudah diterima', MK.money(received), 'tone-green', 'DP & pelunasan') +
        statCard('Sisa tagihan', MK.money(remaining), 'tone-cherry', 'Belum dibayar') +
        statCard('Belum ada DP', unpaid, 'tone-blue', 'Perlu ditindaklanjuti') + '</div>' +
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>Pesanan</th><th>Pelanggan</th><th>Total</th><th>DP</th><th>Dibayar</th><th>Sisa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        (orders.length ? orders.map(function (order) {
          return '<tr><td><a class="code-link" href="' + MK.url('seller/order-detail.html?id=' + encodeURIComponent(order.id)) + '">' + MK.esc(order.id) + '</a><small class="table-sub">' + MK.formatDate(order.date) + '</small></td>' +
            '<td><strong>' + MK.esc(order.customerName) + '</strong><small class="table-sub">' + MK.esc(order.phone) + '</small></td>' +
            '<td>' + MK.money(order.total) + '</td><td>' + MK.money(order.dpAmount) + '</td><td><strong>' + MK.money(order.paidAmount) + '</strong></td><td>' + MK.money(Orders.remaining(order)) + '</td>' +
            '<td>' + MK.badge(order.paymentStatus) + '</td>' +
            '<td><div class="table-actions">' + (order.paymentStatus !== 'DP Diterima' && order.paymentStatus !== 'Lunas' ? '<button class="btn btn-xs" type="button" data-mark-dp="' + MK.esc(order.id) + '">DP diterima</button>' : '') +
              (order.paymentStatus !== 'Lunas' ? '<button class="btn btn-xs btn-soft" type="button" data-mark-paid="' + MK.esc(order.id) + '">Lunas</button>' : '<span class="muted small">Lunas</span>') + '</div></td></tr>';
        }).join('') : '<tr><td colspan="8">' + emptyState('Belum ada pembayaran', 'Pembayaran akan muncul setelah pesanan dibuat.', '', '', 'wallet') + '</td></tr>') +
        '</tbody></table></div>' +
        '<p class="summary-note">Pembayaran dicatat manual. Website tidak memproses atau memverifikasi transfer.</p>';

      host.querySelectorAll('[data-mark-dp]').forEach(function (button) {
        button.addEventListener('click', function () {
          const order = DB.orders.get(button.dataset.markDp);
          if (!order || !window.confirm('Tandai DP ' + MK.money(order.dpAmount) + ' untuk ' + order.id + ' sudah diterima?')) return;
          try { Orders.updatePayment(order.id, 'DP Diterima', order.paymentNote || 'DP diterima manual', 'Penjual'); MK.showToast('DP ditandai diterima.'); render(); }
          catch (error) { MK.showToast(error.message, 'error'); }
        });
      });
      host.querySelectorAll('[data-mark-paid]').forEach(function (button) {
        button.addEventListener('click', function () {
          const order = DB.orders.get(button.dataset.markPaid);
          if (!order || !window.confirm('Tandai pesanan ' + order.id + ' sudah lunas?')) return;
          try { Orders.updatePayment(order.id, 'Lunas', 'Pelunasan diterima manual', 'Penjual'); MK.showToast('Pesanan ditandai lunas.'); render(); }
          catch (error) { MK.showToast(error.message, 'error'); }
        });
      });
    }
    if (search) search.addEventListener('input', MK.debounce(render, 120));
    render();
  }

  function initCustomers() {
    const host = document.getElementById('customers-root');
    if (!host) return;
    const search = document.getElementById('customer-search');
    function render() {
      const q = search ? search.value.trim().toLowerCase() : '';
      const orders = DB.orders.list();
      const customers = DB.users.list().filter(function (user) { return user.role === 'customer'; }).map(function (user) {
        const own = orders.filter(function (order) { return order.userId === user.id; });
        const last = own.slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); })[0];
        return {
          name: user.name,
          username: user.username,
          phone: user.phone || (last ? last.phone : ''),
          count: own.length,
          total: own.filter(function (order) { return order.status !== 'Dibatalkan'; }).reduce(function (sum, order) { return sum + Number(order.total || 0); }, 0),
          last: last ? last.createdAt : null
        };
      });
      const filtered = customers.filter(function (customer) {
        return !q || customer.name.toLowerCase().indexOf(q) > -1 || String(customer.username).toLowerCase().indexOf(q) > -1 || String(customer.phone).indexOf(q) > -1;
      }).sort(function (a, b) { return String(b.last || '').localeCompare(String(a.last || '')); });
      host.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Pelanggan</th><th>Kontak</th><th>Pesanan</th><th>Total belanja</th><th>Pesanan terakhir</th><th>Aksi</th></tr></thead><tbody>' +
        (filtered.length ? filtered.map(function (customer) {
          const wa = String(customer.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '62');
          return '<tr><td><div class="customer-cell"><span class="avatar">' + MK.esc(MK.initials(customer.name)) + '</span><div><strong>' + MK.esc(customer.name) + '</strong><small>@' + MK.esc(customer.username) + '</small></div></div></td>' +
            '<td>' + MK.esc(customer.phone || '-') + '</td><td>' + customer.count + '</td><td><strong>' + MK.money(customer.total) + '</strong></td>' +
            '<td>' + (customer.last ? MK.formatDate(customer.last) : '-') + '</td><td>' + (wa ? '<a class="btn btn-xs btn-ghost" href="https://wa.me/' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' : '<span class="muted small">-</span>') + '</td></tr>';
        }).join('') : '<tr><td colspan="6">' + emptyState('Belum ada pelanggan', 'Pelanggan terdaftar akan muncul di sini. Pesanan tamu tidak disimpan pada MVP ini.', 'Kelola pesanan', MK.url('seller/orders.html'), 'users') + '</td></tr>') +
        '</tbody></table></div>' +
        '<p class="summary-note">Data pelanggan berasal dari akun demo yang tersimpan di browser ini.</p>';
    }
    if (search) search.addEventListener('input', MK.debounce(render, 120));
    render();
  }

  const pages = {
    'seller-dashboard': initDashboard,
    'seller-products': initProducts,
    'seller-add-product': initProductForm,
    'seller-orders': initOrdersPage,
    'seller-order': initOrderDetail,
    'seller-schedule': initSchedule,
    'seller-payments': initPayments,
    'seller-customers': initCustomers
  };

  document.addEventListener('DOMContentLoaded', function () {
    const page = document.body.dataset.page;
    const init = pages[page];
    if (!init) return;
    const user = Auth.requireRole('seller');
    if (!user) return;
    renderShell(user);
    init(user);
  });
})();
