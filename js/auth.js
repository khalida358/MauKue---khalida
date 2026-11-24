/* Local-only authentication for the MVP. Replace with server sessions for production.
   Customer and seller areas use different login pages and dashboards, and every
   role guard refuses to render a page from the other area. */
window.Auth = (function () {
  function session() {
    const saved = DB.session.get();
    if (!saved) return null;
    const user = DB.users.get(saved.userId);
    if (!user) { DB.session.clear(); return null; }
    return { userId: user.id, role: user.role, name: user.name, username: user.username };
  }

  function currentUser() {
    const saved = session();
    return saved ? DB.users.get(saved.userId) : null;
  }

  function dashboardPath(role) {
    return role === 'seller' ? MK.url('seller/dashboard.html') : MK.url('customer/dashboard.html');
  }

  function loginPath(role) {
    return role === 'seller' ? MK.url('seller/login.html') : MK.url('login.html');
  }

  function cartOwner() {
    const saved = session();
    return saved && saved.role === 'customer' ? saved.userId : 'guest';
  }

  function mergeGuestCart(userId) {
    const guest = DB.cart.get('guest');
    if (!guest.length) return;
    const userCart = DB.cart.get(userId);
    guest.forEach(function (line) {
      if (line.type === 'product') {
        const existing = userCart.find(function (item) {
          return item.type === 'product' && String(item.productId) === String(line.productId) &&
            item.size === line.size && item.flavor === line.flavor;
        });
        if (existing) {
          existing.qty = MK.clamp(Number(existing.qty) + Number(line.qty || 1), 1, 99);
          existing.lineTotal = existing.unitPrice * existing.qty;
        } else {
          userCart.push(line);
        }
      } else {
        userCart.push(line);
      }
    });
    DB.cart.save(userId, userCart);
    DB.cart.clear('guest');
  }

  function login(input) {
    const username = String(input.username || '').trim();
    const password = String(input.password || '');
    const role = input.role === 'seller' ? 'seller' : 'customer';
    if (!username || !password) throw new Error('Masukkan username dan password.');
    const user = DB.users.findByUsername(username);
    if (!user || user.password !== MK.hashPassword(password)) {
      throw new Error('Username atau password salah.');
    }
    if (user.role !== role) {
      throw new Error('Akun ini terdaftar sebagai ' + (user.role === 'seller' ? 'penjual' : 'pembeli') +
        '. Gunakan halaman login ' + (user.role === 'seller' ? 'admin penjual' : 'pembeli') + '.');
    }
    DB.session.set({ userId: user.id, role: user.role, name: user.name, username: user.username, at: new Date().toISOString() });
    if (user.role === 'customer') mergeGuestCart(user.id);
    return user;
  }

  function register(input) {
    const name = String(input.name || '').trim();
    const username = String(input.username || '').trim();
    const phone = String(input.phone || '').trim();
    const password = String(input.password || '');
    const confirm = String(input.confirm || '');
    if (name.length < 2) throw new Error('Nama minimal 2 karakter.');
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) throw new Error('Username 3-30 karakter, hanya huruf, angka, titik, garis bawah, atau strip.');
    if (DB.users.findByUsername(username)) throw new Error('Username sudah digunakan.');
    if (!MK.isValidPhone(phone)) throw new Error('Nomor telepon tidak valid.');
    if (password.length < 6) throw new Error('Password minimal 6 karakter.');
    if (password !== confirm) throw new Error('Konfirmasi password tidak sama.');
    const user = DB.users.add({
      name: name,
      username: username,
      phone: phone,
      role: 'customer',
      password: MK.hashPassword(password)
    });
    DB.session.set({ userId: user.id, role: 'customer', name: user.name, username: user.username, at: new Date().toISOString() });
    mergeGuestCart(user.id);
    return user;
  }

  function logout() {
    const saved = session();
    DB.session.clear();
    location.href = saved && saved.role === 'seller' ? loginPath('seller') : MK.url('index.html');
  }

  function safeNext(next, role) {
    const fallback = dashboardPath(role);
    if (!next) return fallback;
    if (next.charAt(0) !== '/' || next.charAt(1) === '/') return fallback;
    const sellerPath = next.indexOf('/seller/') > -1;
    if (role === 'seller') {
      if (!sellerPath || /\/seller\/login(\.html)?(\?|$)/.test(next)) return fallback;
      return next;
    }
    if (sellerPath || /\/login(\.html)?(\?|$)/.test(next) || /\/register(\.html)?(\?|$)/.test(next)) return fallback;
    return next;
  }

  function requireRole(role) {
    const saved = session();
    if (!saved) {
      const next = location.pathname + location.search;
      location.replace(loginPath(role) + '?next=' + encodeURIComponent(next));
      return null;
    }
    if (saved.role !== role) {
      location.replace(dashboardPath(saved.role));
      return null;
    }
    return DB.users.get(saved.userId);
  }

  /* Runs as soon as this file loads on a seller page: a customer (or a guest)
     never gets to use a seller controller, even by typing the URL. */
  function guardSellerArea() {
    if (location.pathname.indexOf('/seller/') < 0) return;
    /* Static hosts may serve this page as /seller/login.html or /seller/login. */
    if (/\/seller\/login(\.html)?$/.test(location.pathname)) return;
    const saved = session();
    if (saved && saved.role === 'seller') return;
    if (saved) {
      location.replace(dashboardPath(saved.role));
      return;
    }
    const next = location.pathname + location.search;
    location.replace(loginPath('seller') + '?next=' + encodeURIComponent(next));
  }

  function sessionNotice(role) {
    const host = document.getElementById('session-notice');
    if (!host) return;
    const existing = session();
    if (!existing || existing.role === role) { host.hidden = true; return; }
    host.hidden = false;
    host.innerHTML = existing.role === 'seller'
      ? '<strong>Kamu sedang masuk sebagai penjual.</strong><span>Sesi admin aktif. <a class="text-link" href="' + MK.url('seller/dashboard.html') + '">Buka dashboard admin</a> atau keluar untuk masuk ke area pembeli.</span><button class="btn btn-xs btn-ghost" type="button" data-session-logout>Keluar</button>'
      : '<strong>Kamu sedang masuk sebagai pembeli.</strong><span>Sesi pembeli aktif. <a class="text-link" href="' + MK.url('customer/dashboard.html') + '">Buka beranda pembeli</a> atau keluar untuk masuk ke area admin.</span><button class="btn btn-xs btn-ghost" type="button" data-session-logout>Keluar</button>';
    const button = host.querySelector('[data-session-logout]');
    if (button) {
      button.addEventListener('click', function () {
        DB.session.clear();
        location.reload();
      });
    }
  }

  function initLoginPage(role) {
    const form = document.getElementById('login-form');
    if (!form) return;
    const params = new URLSearchParams(location.search);
    const next = params.get('next');
    const errorBox = document.getElementById('login-error');
    const submit = document.getElementById('login-submit');

    const existing = session();
    if (existing && existing.role === role) {
      location.replace(safeNext(next, role));
      return;
    }
    sessionNotice(role);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (errorBox) errorBox.textContent = '';
      if (submit) submit.disabled = true;
      try {
        const user = login({
          role: role,
          username: document.getElementById('login-username').value,
          password: document.getElementById('login-password').value
        });
        location.href = safeNext(next, user.role);
      } catch (error) {
        if (errorBox) errorBox.textContent = error.message;
        if (submit) submit.disabled = false;
      }
    });
  }

  function initRegisterPage() {
    const form = document.getElementById('register-form');
    if (!form) return;
    const errorBox = document.getElementById('register-error');
    const submit = document.getElementById('register-submit');
    const params = new URLSearchParams(location.search);
    const next = params.get('next');

    if (session()) {
      location.replace(safeNext(next, session().role));
      return;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (errorBox) errorBox.textContent = '';
      if (submit) submit.disabled = true;
      try {
        register({
          name: document.getElementById('reg-name').value,
          username: document.getElementById('reg-username').value,
          phone: document.getElementById('reg-phone').value,
          password: document.getElementById('reg-password').value,
          confirm: document.getElementById('reg-confirm').value
        });
        location.href = safeNext(next, 'customer');
      } catch (error) {
        if (errorBox) errorBox.textContent = error.message;
        if (submit) submit.disabled = false;
      }
    });
  }

  guardSellerArea();

  document.addEventListener('DOMContentLoaded', function () {
    const page = document.body.dataset.page;
    if (page === 'login' || page === 'customer-login') initLoginPage('customer');
    if (page === 'seller-login') initLoginPage('seller');
    if (page === 'register') initRegisterPage();
  });

  return {
    session: session,
    currentUser: currentUser,
    cartOwner: cartOwner,
    login: login,
    register: register,
    logout: logout,
    safeNext: safeNext,
    requireRole: requireRole,
    dashboardPath: dashboardPath,
    loginPath: loginPath
  };
})();
