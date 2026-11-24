# MauKue — Website Pemesanan Kue UMKM

MauKue adalah website pemesanan kue untuk UMKM dengan dua area yang terpisah: pembeli dan admin/penjual. Masing-masing punya halaman login dan dashboard sendiri. Project ini adalah MVP statis yang memakai `localStorage`, sehingga dapat dibuka langsung dari GitHub Pages, Live Server, atau server statis biasa tanpa backend.

## Menjalankan

```bash
python3 -m http.server 3000
```

Buka `http://localhost:3000`. Bisa juga memakai ekstensi Live Server di VS Code.

Semua path relatif, jadi project tetap berjalan bila dipasang di subfolder GitHub Pages.

## Akun demo penjual

- Username: `Khalida`
- Password: `aktivasicreativehub`
- Login admin: `seller/login.html`
- Dashboard: `seller/dashboard.html`

Akun ini hanya untuk demo lokal. Password disimpan sebagai digest sederhana di browser, bukan autentikasi produksi. Untuk situs publik, autentikasi harus dipindahkan ke server.

Pembeli membuat akun sendiri melalui `register.html` dan masuk lewat `login.html`.

## Pemisahan area dan akses

- **Pembeli:** login `login.html`, dashboard `customer/dashboard.html`. Hanya bisa melihat katalog, memesan, checkout, melihat riwayat, dan mengubah profil.
- **Admin/penjual:** login `seller/login.html`, dashboard `seller/dashboard.html` dengan sidebar. Bisa mengelola produk, pesanan, pembayaran DP, jadwal produksi, dan pelanggan.
- Setiap halaman admin memakai guard peran. Pembeli yang mengetik URL admin akan dipindahkan ke dashboard pembeli (atau ke login admin bila belum masuk).
- Setiap halaman pembeli yang membutuhkan akun akan menolak sesi penjual dan mengembalikannya ke dashboard admin.
- Login admin tidak pernah mengarah ke beranda pembeli; setelah masuk langsung ke dashboard admin.
- Produk dan pesanan dibaca langsung dari `localStorage` yang sama, sehingga perubahan admin langsung terlihat di katalog pembeli.

## Fitur yang sudah berjalan

### Pembeli
- Beranda pembeli dengan sapaan, kategori, produk unggulan, dan pesanan aktif.
- Katalog dengan pencarian, filter kategori, dan pengurutan.
- Detail produk: ukuran, rasa, jumlah, catatan, rincian harga, dan produk serupa.
- Keranjang persisten: ubah jumlah, hapus, subtotal, dan estimasi DP.
- Pesanan custom: ukuran, rasa, tingkat, dekorasi, tema, warna, tulisan, tanggal, waktu, catatan, upload referensi, estimasi harga, dan ringkasan live.
- Checkout: data penerima, pickup/delivery, alamat tersimpan, tanggal, waktu, catatan, validasi, dan ringkasan pembayaran.
- Riwayat pesanan, detail pesanan, status produksi, status pembayaran, riwayat status, dan kontak penjual.
- Profil: nama, nomor WhatsApp, alamat tersimpan, dan logout.

### Penjual
- Login dengan proteksi peran; halaman penjual tidak bisa dibuka sebagai pembeli.
- Dashboard dengan statistik nyata dari pesanan, pesanan terbaru, jadwal terdekat, dan aktivitas.
- Kelola produk: tambah, edit, hapus, upload foto, harga, kategori, deskripsi, ukuran, rasa, dan ketersediaan.
- Kelola pesanan: pencarian, filter status, detail lengkap, detail custom, foto referensi, dan update status.
- Pembayaran DP manual: tandai DP diterima atau lunas, catat sisa pembayaran.
- Jadwal produksi per tanggal.
- Daftar pelanggan dari akun dan pesanan.

## Aturan harga

- Harga produk = harga dasar + tambahan ukuran yang dipilih.
- Contoh produk Rainbow Palette Cake: Rp85.000 (Mini) + Rp15.000 (Regular) = Rp100.000 per kue. Dua kue = Rp200.000.
- Harga custom adalah estimasi dari ukuran, tingkat, dekorasi, dan tulisan; harga final menunggu konfirmasi penjual.
- Delivery memakai tarif tetap Rp15.000; pickup gratis.
- DP 50% dihitung dari total pesanan.

## Struktur

```
index.html, login.html (pembeli), register.html (pembeli)
customer/  dashboard, catalog, product-detail, custom-order, cart,
           checkout, orders, order-detail, profile
seller/    login, dashboard, products, add-product, orders, order-detail,
           schedule, payments, customers
assets/    favicon dan fallback foto
css/       style.css, customer.css, seller.css
js/        utils, products (data + foto), database, auth, orders,
           app, customer, seller
```

`MauKue_Desktop.html` dipertahankan sebagai prototipe desain lama dan tidak dipakai oleh halaman MVP.

## Penyimpanan data

Semua data disimpan di `localStorage` browser:

- `maukue_products`, `maukue_users`, `maukue_orders`, `maukue_settings`
- `maukue_session`
- `maukue_cart_<userId>` / `maukue_cart_guest`

Keterbatasan:
- Data hanya ada di browser yang dipakai; tidak sinkron antarperangkat atau antar pengguna.
- Pembeli dan penjual harus membuka browser yang sama untuk melihat pesanan yang sama.
- Menghapus data situs akan menghapus produk, akun, dan pesanan lokal.
- Foto upload disimpan sebagai data URL; penyimpanan browser terbatas.

## Belum diimplementasikan

- Database online dan API backend.
- Autentikasi server yang aman.
- Payment gateway otomatis.
- Integrasi kurir/pengiriman.
- AI Cake Designer.
- Notifikasi WhatsApp/email otomatis.

## Testing manual

Alur yang sudah diuji di browser:

1. Registrasi pembeli → dashboard pembeli → katalog → detail → ukuran Regular + jumlah 2.
2. Total detail, keranjang, checkout, dan dashboard admin sama: Rp200.000.
3. Login admin lewat `seller/login.html` → langsung ke dashboard admin.
4. Pembeli membuka URL admin → ditolak dan dikembalikan ke area pembeli.
5. Admin menambah produk → produk muncul di katalog pembeli; edit dan hapus juga tercermin.
6. Pesanan custom → checkout → pesanan muncul di riwayat pembeli dan halaman pesanan admin.
7. Admin → detail pesanan → ubah status menjadi Dalam Produksi → tandai DP diterima.
8. Login pembeli → status dan pembayaran yang diperbarui terlihat.
9. Logout masing-masing peran kembali ke area login yang sesuai.
