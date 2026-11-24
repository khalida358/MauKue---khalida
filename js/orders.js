/* Order and payment rules shared by the customer and seller areas. */
window.Orders = (function () {
  const STATUSES = [
    'Menunggu Konfirmasi',
    'Menunggu DP',
    'Diproses',
    'Dalam Produksi',
    'Siap Diambil/Dikirim',
    'Selesai',
    'Dibatalkan'
  ];
  const ACTIVE_STATUSES = ['Menunggu Konfirmasi', 'Menunggu DP', 'Diproses', 'Dalam Produksi', 'Siap Diambil/Dikirim'];
  const PAYMENT_STATUSES = ['Belum Dibayar', 'DP Diterima', 'Lunas'];

  function customOptions() {
    return window.MAUKUE_CUSTOM || {
      sizes: [{ label: 'Mini (12 cm)', base: 50000 }, { label: 'Regular (16 cm)', base: 80000 }, { label: 'Jumbo (20 cm)', base: 120000 }],
      flavors: ['Vanilla', 'Cokelat', 'Red Velvet', 'Matcha'],
      decorations: [{ label: 'Minimalis', extra: 0 }, { label: 'Doodle', extra: 15000 }, { label: 'Rainbow', extra: 20000 }, { label: 'Vintage', extra: 25000 }, { label: 'Karakter', extra: 35000 }],
      themes: ['Ulang Tahun', 'Wisuda', 'Pernikahan', 'Anak-anak', 'Bunga', 'Karakter', 'Lainnya'],
      layers: [{ label: '1 tingkat', extra: 0 }, { label: '2 tingkat', extra: 30000 }, { label: '3 tingkat', extra: 60000 }],
      writingExtra: 5000
    };
  }

  function estimateCustom(custom) {
    const options = customOptions();
    const size = options.sizes.find(function (item) { return item.label === custom.size; }) || options.sizes[0];
    const layers = options.layers.find(function (item) { return item.label === custom.layers; }) || options.layers[0];
    const decoration = options.decorations.find(function (item) { return item.label === custom.decoration; }) || options.decorations[0];
    let total = Number(size.base) + Number(layers.extra) + Number(decoration.extra);
    if (String(custom.cakeText || '').trim()) total += Number(options.writingExtra || 0);
    return Math.round(total / 1000) * 1000;
  }

  function roundThousands(value) {
    return Math.round(Number(value || 0) / 1000) * 1000;
  }

  function makeOrderCode() {
    const now = new Date();
    const stamp = String(now.getFullYear()).slice(-2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    let code = '';
    do {
      code = 'MK-' + stamp + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    } while (DB.orders.get(code));
    return code;
  }

  function normalizeItems(cart) {
    return cart.map(function (line) {
      if (line.type === 'custom') {
        const custom = Object.assign({}, line.custom);
        const price = estimateCustom(custom);
        return {
          lineId: line.lineId,
          type: 'custom',
          productId: null,
          name: 'Kue Custom',
          image: custom.referenceImage || '',
          size: custom.size,
          flavor: custom.flavor,
          qty: 1,
          unitPrice: price,
          lineTotal: price,
          notes: custom.notes || '',
          custom: custom
        };
      }
      const product = DB.products.get(line.productId);
      if (!product) throw new Error('Produk "' + (line.name || '') + '" sudah tidak tersedia. Hapus dari keranjang untuk melanjutkan.');
      if (product.available === false) throw new Error('Produk "' + product.name + '" sedang tidak tersedia.');
      const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : [{ label: 'Regular (16 cm)', extra: 0 }];
      const size = sizes.find(function (item) { return item.label === line.size; }) || sizes[0];
      const flavors = Array.isArray(product.flavors) && product.flavors.length ? product.flavors : ['Vanilla'];
      const qty = MK.clamp(Math.round(Number(line.qty) || 1), 1, 99);
      const unitPrice = Number(product.price) + Number(size.extra || 0);
      return {
        lineId: line.lineId,
        type: 'product',
        productId: product.id,
        name: product.name,
        image: product.image,
        category: product.category,
        size: size.label,
        flavor: flavors.indexOf(line.flavor) > -1 ? line.flavor : flavors[0],
        qty: qty,
        unitPrice: unitPrice,
        lineTotal: unitPrice * qty,
        notes: line.notes || ''
      };
    });
  }

  function summarize(lines, method) {
    const settings = DB.settings.get();
    const subtotal = lines.reduce(function (sum, line) { return sum + Number(line.lineTotal || line.unitPrice * line.qty || 0); }, 0);
    const deliveryFee = method === 'delivery' ? Number(settings.deliveryFee || 0) : 0;
    const total = subtotal + deliveryFee;
    const dpAmount = roundThousands(total * (Number(settings.dpPercent || 50) / 100));
    return { subtotal: subtotal, deliveryFee: deliveryFee, total: total, dpAmount: dpAmount };
  }

  function createOrder(input) {
    const user = input.user;
    if (!user || user.role !== 'customer') throw new Error('Masuk sebagai pembeli untuk membuat pesanan.');
    if (!Array.isArray(input.cart) || !input.cart.length) throw new Error('Keranjang masih kosong.');
    const form = input.form || {};
    const name = String(form.name || '').trim();
    const phone = String(form.phone || '').trim();
    const method = form.method === 'delivery' ? 'delivery' : 'pickup';
    const date = String(form.date || '');
    const time = String(form.time || '');
    const address = String(form.address || '').trim();
    const settings = DB.settings.get();

    if (name.length < 2) throw new Error('Nama penerima minimal 2 karakter.');
    if (!MK.isValidPhone(phone)) throw new Error('Nomor telepon tidak valid.');
    if (!date || MK.isPastDate(date)) throw new Error('Tanggal pesanan tidak boleh di masa lalu.');
    if (settings.timeSlots.indexOf(time) < 0) throw new Error('Pilih waktu pengambilan atau pengiriman.');
    if (method === 'delivery' && address.length < 10) throw new Error('Alamat pengiriman wajib diisi minimal 10 karakter.');

    const items = normalizeItems(input.cart);
    const totals = summarize(items, method);
    const now = new Date().toISOString();
    const order = {
      id: makeOrderCode(),
      userId: user.id,
      customerName: name,
      phone: phone,
      items: items,
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      dpAmount: totals.dpAmount,
      paidAmount: 0,
      method: method,
      address: method === 'delivery' ? address : '',
      date: date,
      time: time,
      notes: String(form.notes || '').trim(),
      status: 'Menunggu Konfirmasi',
      paymentStatus: 'Belum Dibayar',
      paymentNote: '',
      history: [{ status: 'Menunggu Konfirmasi', at: now, by: 'Pelanggan' }],
      createdAt: now,
      updatedAt: now
    };
    return DB.orders.add(order);
  }

  function updateStatus(id, status, by) {
    if (STATUSES.indexOf(status) < 0) throw new Error('Status pesanan tidak dikenal.');
    const order = DB.orders.get(id);
    if (!order) throw new Error('Pesanan tidak ditemukan.');
    if (order.status === status) return order;
    const history = Array.isArray(order.history) ? order.history.slice() : [];
    history.push({ status: status, at: new Date().toISOString(), by: by || 'Penjual' });
    return DB.orders.update(id, { status: status, history: history, updatedAt: new Date().toISOString() });
  }

  function updatePayment(id, paymentStatus, note, by) {
    if (PAYMENT_STATUSES.indexOf(paymentStatus) < 0) throw new Error('Status pembayaran tidak dikenal.');
    const order = DB.orders.get(id);
    if (!order) throw new Error('Pesanan tidak ditemukan.');
    let paidAmount = 0;
    if (paymentStatus === 'DP Diterima') paidAmount = Number(order.dpAmount) || 0;
    if (paymentStatus === 'Lunas') paidAmount = Number(order.total) || 0;
    const patch = {
      paymentStatus: paymentStatus,
      paidAmount: paidAmount,
      paymentNote: String(note || '').trim(),
      updatedAt: new Date().toISOString()
    };
    let updated = DB.orders.update(id, patch);
    if (paymentStatus === 'DP Diterima' && (order.status === 'Menunggu Konfirmasi' || order.status === 'Menunggu DP')) {
      updated = updateStatus(id, 'Diproses', by || 'Penjual');
    }
    return updated;
  }

  function remaining(order) {
    return Math.max(Number(order.total || 0) - Number(order.paidAmount || 0), 0);
  }

  function isActive(order) {
    return ACTIVE_STATUSES.indexOf(order.status) > -1;
  }

  function itemSummary(order) {
    return (order.items || []).map(function (item) {
      return item.name + (item.type === 'product' ? ' (' + item.qty + 'x)' : '');
    }).join(', ');
  }

  function totalQty(order) {
    return (order.items || []).reduce(function (sum, item) { return sum + Number(item.qty || 1); }, 0);
  }

  return {
    STATUSES: STATUSES,
    ACTIVE_STATUSES: ACTIVE_STATUSES,
    PAYMENT_STATUSES: PAYMENT_STATUSES,
    customOptions: customOptions,
    estimateCustom: estimateCustom,
    normalizeItems: normalizeItems,
    summarize: summarize,
    createOrder: createOrder,
    updateStatus: updateStatus,
    updatePayment: updatePayment,
    remaining: remaining,
    isActive: isActive,
    itemSummary: itemSummary,
    totalQty: totalQty
  };
})();
