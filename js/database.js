/* Central localStorage data layer for the MauKue MVP.
   Every screen reads and writes through this module so a future API can replace it. */
window.DB = (function () {
  const PREFIX = 'maukue_';
  const memory = {};
  const hasStorage = (function () {
    try {
      const key = '__maukue_test__';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  })();

  function read(key, fallback) {
    try {
      if (!hasStorage) return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : fallback;
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn('MauKue: data tidak dapat dibaca', key, error);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      if (!hasStorage) { memory[key] = value; return true; }
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('MauKue: data tidak dapat disimpan', key, error);
      window.dispatchEvent(new CustomEvent('maukue:quota'));
      return false;
    }
  }

  const DEFAULT_SETTINGS = {
    storeName: 'MauKue',
    tagline: 'Kue custom sesukamu',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    instagram: '@maukue',
    address: 'Jl. Kue Manis No. 12, Jakarta Selatan',
    openHours: 'Setiap hari, 08.00-20.00',
    deliveryFee: 15000,
    dpPercent: 50,
    timeSlots: ['09.00-11.00', '11.00-13.00', '13.00-15.00', '15.00-17.00', '17.00-19.00']
  };

  const DEFAULT_SIZES = [
    { label: 'Mini (12 cm)', extra: 0 },
    { label: 'Regular (16 cm)', extra: 15000 },
    { label: 'Jumbo (20 cm)', extra: 35000 }
  ];

  const DEFAULT_FLAVORS = ['Vanilla', 'Cokelat', 'Red Velvet', 'Matcha'];

  function buildSeedProducts() {
    const source = window.MAUKUE_PRODUCTS || [];
    const meta = window.MAUKUE_PRODUCT_META || {};
    return source.map(function (product, index) {
      const extra = meta[product.id] || {};
      return Object.assign({}, product, {
        available: true,
        sizes: DEFAULT_SIZES.map(function (size) { return Object.assign({}, size); }),
        flavors: DEFAULT_FLAVORS.slice(),
        fallbackImage: extra.fallbackImage || '',
        photoCredit: extra.photoCredit || '',
        createdAt: new Date(Date.now() - (source.length - index) * 86400000).toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  function seedUsers() {
    const users = read('users', []);
    if (!Array.isArray(users)) { write('users', []); return; }
    const hasSeller = users.some(function (user) { return user.role === 'seller'; });
    if (!hasSeller) {
      users.push({
        id: 'usr_demo_seller',
        username: 'Khalida',
        name: 'Khalida',
        role: 'seller',
        phone: '0812-3456-7890',
        password: MK.hashPassword('aktivasicreativehub'),
        addresses: [],
        createdAt: new Date().toISOString()
      });
      write('users', users);
    }
  }

  function normalizeStoredOrder(order) {
    const normalized = Object.assign({}, order);
    const statusMap = {
      'Menunggu konfirmasi': 'Menunggu Konfirmasi',
      'Diproses': 'Diproses',
      'Dalam produksi': 'Dalam Produksi',
      'Siap diambil': 'Siap Diambil/Dikirim',
      'Dalam pengantaran': 'Siap Diambil/Dikirim',
      'Selesai': 'Selesai',
      'Dibatalkan': 'Dibatalkan'
    };
    normalized.status = statusMap[normalized.status] || normalized.status || 'Menunggu Konfirmasi';
    if (!normalized.paymentStatus) {
      normalized.paymentStatus = normalized.payment === 'DP diterima' ? 'DP Diterima' : 'Belum Dibayar';
    }
    if (!Array.isArray(normalized.items)) normalized.items = [];
    normalized.items = normalized.items.map(function (item, index) {
      return Object.assign({
        lineId: 'migrated_' + index,
        type: 'product',
        qty: 1,
        unitPrice: Number(item.price) || 0,
        lineTotal: (Number(item.price) || 0) * (Number(item.qty) || 1)
      }, item);
    });
    normalized.subtotal = Number(normalized.subtotal != null ? normalized.subtotal : normalized.total) || 0;
    normalized.total = Number(normalized.total) || 0;
    normalized.deliveryFee = Number(normalized.deliveryFee) || 0;
    normalized.dpAmount = Number(normalized.dpAmount) || 0;
    normalized.paidAmount = Number(normalized.paidAmount) || 0;
    normalized.userId = normalized.userId || null;
    normalized.customerName = normalized.customerName || normalized.customer || 'Pelanggan';
    normalized.createdAt = normalized.createdAt || new Date().toISOString();
    normalized.updatedAt = normalized.updatedAt || normalized.createdAt;
    if (!Array.isArray(normalized.history)) {
      normalized.history = [{ status: normalized.status, at: normalized.createdAt, by: 'Sistem' }];
    }
    return normalized;
  }

  function init() {
    const products = read('products', null);
    if (!Array.isArray(products) || !products.length) {
      write('products', buildSeedProducts());
    } else if (products.some(function (product) { return !product.id; })) {
      /* Repair products created by an earlier build that saved id: null. */
      write('products', products.map(function (product) {
        return Object.assign({}, product, { id: product.id || MK.uid('p_') });
      }));
    }
    seedUsers();
    if (!read('settings', null)) write('settings', DEFAULT_SETTINGS);
    if (!Array.isArray(read('orders', []))) write('orders', []);
    const orders = read('orders', []);
    if (orders.some(function (order) { return !order.customerName || !order.history; })) {
      write('orders', orders.map(normalizeStoredOrder));
    }
    if (!read('session', null)) write('session', null);
  }

  const users = {
    list: function () {
      const list = read('users', []);
      return Array.isArray(list) ? list : [];
    },
    get: function (id) {
      return users.list().find(function (user) { return user.id === id; }) || null;
    },
    findByUsername: function (username) {
      const needle = String(username || '').trim().toLowerCase();
      return users.list().find(function (user) { return String(user.username).toLowerCase() === needle; }) || null;
    },
    add: function (data) {
      const list = users.list();
      const user = Object.assign({
        id: MK.uid('usr_'),
        addresses: [],
        createdAt: new Date().toISOString()
      }, data);
      list.push(user);
      if (!write('users', list)) throw new Error('Akun tidak dapat disimpan. Penyimpanan browser penuh.');
      return user;
    },
    update: function (id, patch) {
      const list = users.list();
      const index = list.findIndex(function (user) { return user.id === id; });
      if (index < 0) return null;
      list[index] = Object.assign({}, list[index], patch, { id: id });
      write('users', list);
      return list[index];
    }
  };

  const products = {
    list: function () {
      const list = read('products', []);
      return Array.isArray(list) ? list : [];
    },
    available: function () {
      return products.list().filter(function (product) { return product.available !== false; });
    },
    get: function (id) {
      return products.list().find(function (product) { return String(product.id) === String(id); }) || null;
    },
    save: function (data) {
      const list = products.list();
      const now = new Date().toISOString();
      const payload = Object.assign({}, data);
      if (!payload.id) delete payload.id;
      if (payload.id) {
        const index = list.findIndex(function (product) { return String(product.id) === String(payload.id); });
        if (index < 0) return null;
        list[index] = Object.assign({}, list[index], payload, { id: list[index].id, updatedAt: now });
        if (!write('products', list)) throw new Error('Produk tidak dapat disimpan. Penyimpanan browser penuh.');
        return list[index];
      }
      const product = Object.assign({
        available: true,
        createdAt: now,
        updatedAt: now
      }, payload, { id: MK.uid('p_') });
      list.unshift(product);
      if (!write('products', list)) throw new Error('Produk tidak dapat disimpan. Penyimpanan browser penuh.');
      return product;
    },
    remove: function (id) {
      const list = products.list().filter(function (product) { return String(product.id) !== String(id); });
      write('products', list);
    }
  };

  const orders = {
    list: function () {
      const list = read('orders', []);
      return Array.isArray(list) ? list : [];
    },
    get: function (id) {
      return orders.list().find(function (order) { return String(order.id) === String(id); }) || null;
    },
    add: function (order) {
      const list = orders.list();
      list.unshift(order);
      if (!write('orders', list)) throw new Error('Pesanan tidak dapat disimpan. Penyimpanan browser penuh.');
      return order;
    },
    update: function (id, patch) {
      const list = orders.list();
      const index = list.findIndex(function (order) { return String(order.id) === String(id); });
      if (index < 0) return null;
      list[index] = Object.assign({}, list[index], patch, { id: list[index].id });
      if (!write('orders', list)) throw new Error('Perubahan pesanan tidak dapat disimpan.');
      return list[index];
    }
  };

  function cart(owner) {
    const key = String(owner || 'guest');
    const items = read('cart_' + key, []);
    return Array.isArray(items) ? items : [];
  }

  function saveCart(owner, items) {
    return write('cart_' + String(owner || 'guest'), items);
  }

  function addCart(owner, item) {
    const items = cart(owner);
    if (item.type === 'product') {
      const existing = items.find(function (line) {
        return line.type === 'product' &&
          String(line.productId) === String(item.productId) &&
          line.size === item.size &&
          line.flavor === item.flavor;
      });
      if (existing) {
        existing.qty = MK.clamp(Number(existing.qty) + Number(item.qty || 1), 1, 99);
        existing.lineTotal = existing.unitPrice * existing.qty;
      } else {
        items.push(item);
      }
    } else {
      items.push(item);
    }
    if (!saveCart(owner, items)) throw new Error('Keranjang tidak dapat disimpan. Penyimpanan browser penuh.');
    return items;
  }

  return {
    PREFIX: PREFIX,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    hasStorage: hasStorage,
    init: init,
    users: users,
    products: products,
    orders: orders,
    settings: {
      get: function () { return Object.assign({}, DEFAULT_SETTINGS, read('settings', {})); },
      save: function (patch) {
        const next = Object.assign({}, DB.settings.get(), patch);
        write('settings', next);
        return next;
      }
    },
    session: {
      get: function () { return read('session', null); },
      set: function (session) { write('session', session); },
      clear: function () { write('session', null); }
    },
    cart: {
      get: cart,
      save: saveCart,
      add: addCart,
      remove: function (owner, lineId) {
        const items = cart(owner).filter(function (line) { return line.lineId !== lineId; });
        saveCart(owner, items);
        return items;
      },
      updateQty: function (owner, lineId, qty) {
        const items = cart(owner);
        const line = items.find(function (item) { return item.lineId === lineId; });
        if (line) {
          line.qty = MK.clamp(Math.round(Number(qty) || 1), 1, 99);
          line.lineTotal = line.unitPrice * line.qty;
          saveCart(owner, items);
        }
        return items;
      },
      clear: function (owner) { saveCart(owner, []); }
    }
  };
})();

DB.init();
