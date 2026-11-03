/* ============================================================
   SUMBER DATA TUNGGAL — dashboard & halaman viewer membaca file ini.

   Cara menambah tugas minggu baru:
   1. Taruh file PDF di folder  minggu-XX/  (nama file bebas, spasi aman).
   2. Tambahkan satu baris di array di bawah, contoh:
        { week: 5, judul: 'Convolutional Neural Network', pdf: 'Tugas 5 - CNN.pdf' },
   3. Selesai. Kartu otomatis berstatus "Selesai" karena field `pdf` terisi.

   Field:
   - week  : nomor minggu (wajib)
   - judul : judul/topik tugas (opsional, default "Tugas Minggu N")
   - pdf   : nama file di dalam folder minggu tersebut (kosongkan jika belum ada)
   ============================================================ */

window.TUGAS = [
    { week: 1,  judul: 'Perbandingan Generative AI',      pdf: 'laporan.pdf' },
    { week: 2,  judul: 'Gerbang Logika AND, OR, dan XOR', pdf: 'laporan.pdf' },
    { week: 3,  judul: 'Tugas Minggu 3' },
    { week: 4,  judul: 'Klasifikasi Citra MNIST',         pdf: 'M4_4IA08_Refqi Hardiansyah_51423263_ADL.pdf' },
    { week: 5,  judul: 'Tugas Minggu 5' },
    { week: 6,  judul: 'Tugas Minggu 6' },
    { week: 7,  judul: 'Tugas Minggu 7' },
    { week: 8,  judul: 'Tugas Minggu 8' },
    { week: 9,  judul: 'Tugas Minggu 9' },
    { week: 10, judul: 'Tugas Minggu 10' },
    { week: 11, judul: 'Tugas Minggu 11' },
    { week: 12, judul: 'Tugas Minggu 12' },
    { week: 13, judul: 'Tugas Minggu 13' },
    { week: 14, judul: 'Tugas Minggu 14' }
];
