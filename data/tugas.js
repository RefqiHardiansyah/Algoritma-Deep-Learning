/* ============================================================
   SUMBER DATA TUNGGAL — dashboard, viewer, dan panel admin membaca file ini.

   Struktur:
   - Semua PDF disimpan di folder  pdf/  dengan nama bebas.
   - Field `pdf` hanya berisi NAMA FILE (tanpa folder).
   - Field `pdf` kosong / tidak ditulis = tugas belum tersedia.

   Cara menambah tugas:
   - Cara mudah: buka admin.html (Chrome/Edge), login, lalu tambah entri
     dan seret PDF-nya. Panel admin akan menulis file ini otomatis.
   - Cara manual: taruh PDF di folder pdf/, lalu tambahkan satu baris
     di array di bawah ini.
   ============================================================ */

window.TUGAS = [
    { week: 1, judul: 'Perbandingan Generative AI', pdf: 'minggu-01-perbandingan-generative-ai.pdf' },
    { week: 2, judul: 'Gerbang Logika AND, OR, dan XOR', pdf: 'minggu-02-gerbang-logika.pdf' },
    { week: 3, judul: 'Tugas Minggu 3' },
    { week: 4, judul: 'Klasifikasi Citra MNIST', pdf: 'minggu-04-klasifikasi-citra-mnist.pdf' },
    { week: 5, judul: 'Tugas Minggu 5' },
    { week: 6, judul: 'Tugas Minggu 6' },
    { week: 7, judul: 'Tugas Minggu 7' },
    { week: 8, judul: 'Tugas Minggu 8' },
    { week: 9, judul: 'Tugas Minggu 9' },
    { week: 10, judul: 'Tugas Minggu 10' },
    { week: 11, judul: 'Tugas Minggu 11' },
    { week: 12, judul: 'Tugas Minggu 12' },
    { week: 13, judul: 'Tugas Minggu 13' },
    { week: 14, judul: 'Tugas Minggu 14' }
];
