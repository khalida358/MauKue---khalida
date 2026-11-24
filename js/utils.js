/* MauKue shared helpers. Kept framework-free so the site runs from GitHub Pages. */
window.MK = (function () {
  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ESCAPES[c]; });
  }

  function money(value) {
    return 'Rp' + Number(value || 0).toLocaleString('id-ID');
  }

  function root() {
    if (document.body && document.body.dataset.root !== undefined) return document.body.dataset.root;
    return /\/customer\/|\/seller\//.test(location.pathname) ? '..' : '';
  }

  function url(path) {
    const clean = String(path || '').replace(/^\/+/, '');
    const base = root();
    return base ? base + '/' + clean : clean;
  }

  function uid(prefix) {
    return (prefix || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function pad(number) {
    return String(number).padStart(2, '0');
  }

  function localISO(date) {
    const d = date ? new Date(date) : new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function todayISO() {
    return localISO();
  }

  function addDaysISO(days) {
    const d = new Date();
    d.setDate(d.getDate() + Number(days || 0));
    return localISO(d);
  }

  function isPastDate(iso) {
    return Boolean(iso) && String(iso) < todayISO();
  }

  function formatDate(iso, long) {
    if (!iso) return '-';
    const d = new Date(String(iso).length <= 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d.getTime())) return String(iso);
    const options = long
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('id-ID', options);
  }

  function formatDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function timeAgo(iso) {
    if (!iso) return '-';
    const diff = Date.now() - new Date(iso).getTime();
    if (isNaN(diff) || diff < 0) return formatDateTime(iso);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'baru saja';
    if (minutes < 60) return minutes + ' menit lalu';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' jam lalu';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + ' hari lalu';
    return formatDate(iso);
  }

  function statusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s.indexOf('batal') > -1) return 'is-cancelled';
    if (s.indexOf('selesai') > -1 || s.indexOf('lunas') > -1) return 'is-done';
    if (s.indexOf('siap') > -1) return 'is-ready';
    if (s.indexOf('produksi') > -1 || s.indexOf('proses') > -1) return 'is-process';
    if (s.indexOf('dp') > -1) return 'is-dp';
    if (s.indexOf('konfirmasi') > -1 || s.indexOf('belum') > -1) return 'is-pending';
    return 'is-neutral';
  }

  function badge(label) {
    return '<span class="badge ' + statusClass(label) + '">' + esc(label) + '</span>';
  }

  function initials(name) {
    const parts = String(name || 'M').trim().split(/\s+/).slice(0, 2);
    return parts.map(function (p) { return p.charAt(0).toUpperCase(); }).join('') || 'M';
  }

  function isValidPhone(phone) {
    return /^[0-9+()\s-]{8,20}$/.test(String(phone || '')) && String(phone).replace(/\D/g, '').length >= 8;
  }

  function parseCommaList(value) {
    return String(value || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function inferSizeExtra(label) {
    const s = String(label || '').toLowerCase();
    if (s.indexOf('jumbo') > -1 || s.indexOf('20') > -1 || s.indexOf('besar') > -1) return 35000;
    if (s.indexOf('regular') > -1 || s.indexOf('16') > -1) return 15000;
    return 0;
  }

  function clamp(number, min, max) {
    return Math.min(max, Math.max(min, Number(number) || 0));
  }

  function hashPassword(password) {
    /* Local demo only: a deterministic digest so raw passwords are not stored.
       Real authentication must happen on a server; see README. */
    const text = 'maukue-local-demo::' + String(password || '');
    let a = 0x811c9dc5;
    let b = 0x1000193;
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      a ^= code;
      a = Math.imul(a, 16777619);
      b = Math.imul(b ^ code, 2654435761);
    }
    return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
  }

  function photo(src, alt, className) {
    const fallback = url('assets/images/photo-fallback.svg');
    return '<img class="' + esc(className || '') + '" src="' + esc(src || fallback) + '" alt="' + esc(alt || '') +
      '" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' + esc(fallback) + '\'">';
  }

  function compressImage(file, options) {
    const opts = Object.assign({ maxWidth: 1000, maxBytes: 3 * 1024 * 1024, quality: 0.8 }, options || {});
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('Pilih file gambar terlebih dahulu.')); return; }
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        reject(new Error('Format gambar harus JPG, PNG, atau WebP.'));
        return;
      }
      if (file.size > opts.maxBytes) {
        reject(new Error('Ukuran gambar maksimal ' + Math.round(opts.maxBytes / 1024 / 1024) + ' MB.'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = function () { reject(new Error('Gambar tidak dapat dibaca.')); };
      reader.onload = function () {
        const image = new Image();
        image.onerror = function () { reject(new Error('File gambar tidak valid.')); };
        image.onload = function () {
          let width = image.naturalWidth || image.width;
          let height = image.naturalHeight || image.height;
          if (width > opts.maxWidth) {
            height = Math.round(height * (opts.maxWidth / width));
            width = opts.maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fffdf8';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);
          try {
            resolve({ dataUrl: canvas.toDataURL('image/jpeg', opts.quality), name: file.name });
          } catch (error) {
            reject(new Error('Gambar tidak dapat diproses.'));
          }
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function query(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function debounce(fn, wait) {
    let timer = null;
    return function () {
      const args = arguments;
      const context = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(context, args); }, wait || 200);
    };
  }

  return {
    esc: esc,
    money: money,
    root: root,
    url: url,
    uid: uid,
    localISO: localISO,
    todayISO: todayISO,
    addDaysISO: addDaysISO,
    isPastDate: isPastDate,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    timeAgo: timeAgo,
    statusClass: statusClass,
    badge: badge,
    initials: initials,
    isValidPhone: isValidPhone,
    parseCommaList: parseCommaList,
    inferSizeExtra: inferSizeExtra,
    clamp: clamp,
    hashPassword: hashPassword,
    photo: photo,
    compressImage: compressImage,
    query: query,
    debounce: debounce
  };
})();
