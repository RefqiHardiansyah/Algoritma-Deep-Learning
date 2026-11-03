# Font Inter (self-hosted)

Berkas di folder ini berasal dari Google Fonts (keluaran CSS API untuk Inter v20,
variabel weight 400–800), subset `latin` dan `latin-ext`, format WOFF2.

- Sumber: https://fonts.google.com/specimen/Inter
- Repositori: https://github.com/rsms/inter
- Lisensi: SIL Open Font License 1.1 (lihat `LICENSE.txt`)

Cara memperbarui: unduh ulang `inter-latin.woff2` dan `inter-latin-ext.woff2`
dari Google Fonts, lalu ganti berkas di folder ini. Tidak ada dependensi lain;
`style.css` memuatnya lewat `@font-face` dengan `font-weight: 400 800`.
