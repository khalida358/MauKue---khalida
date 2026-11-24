# MauKue — Website Pemesanan Kue UMKM

Versi awal frontend yang dipisah per halaman/fitur. Desain desktop-first. Data produk dan foto katalog diambil dari file HTML MauKue sebelumnya dan dipertahankan di `js/products.js`.

## Menjalankan
1. Ekstrak folder ini.
2. Buka `index.html` atau jalankan dengan ekstensi Live Server di VS Code.
3. Pilih masuk sebagai pembeli atau penjual.

## Demo penjual
- Username: `Khalida`
- Password: `aktivasicreativehub`

Akun demo hanya untuk uji coba lokal. Jangan gunakan password ini untuk situs publik. Autentikasi aman harus dipindahkan ke backend.

## Struktur
- `index.html`, `login.html`: halaman awal dan login
- `customer/`: beranda, katalog, detail produk, custom order, keranjang, checkout, pesanan, profil
- `seller/`: dashboard, produk, pesanan, jadwal produksi, pembayaran
- `css/style.css`: tampilan bersama
- `js/products.js`: produk dan foto asli dari file lama
- `js/app.js`: fungsi antarmuka dan penyimpanan lokal

## Catatan versi ini
Data masih tersimpan di browser menggunakan `localStorage`. Belum ada database online, upload file permanen, pembayaran otomatis, kurir, atau AI Cake Designer. Setelah halaman dan alur lokal stabil, backend Freebuff dapat disambungkan berdasarkan dokumentasi/API resminya. Jangan menambahkan URL endpoint atau SDK yang belum diverifikasi.
