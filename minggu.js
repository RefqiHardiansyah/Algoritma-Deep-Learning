/* ============================================================
   Viewer tugas dinamis.
   URL: minggu.html?w=4  (atau minggu.html?minggu=4)
   Nama file PDF diambil dari data/tugas.js sehingga bebas.
   ============================================================ */

(function () {
    const params = new URLSearchParams(window.location.search);
    const rawWeek = params.get('w') ?? params.get('minggu');
    const week = Number.parseInt(rawWeek, 10);

    const source = Array.isArray(window.TUGAS) ? window.TUGAS : [];
    const task = Number.isInteger(week) ? source.find((item) => item.week === week) : null;

    const byId = (id) => document.getElementById(id);

    const pdfCard = byId('pdfCard');
    const pdfFrame = byId('pdfFrame');
    const pdfLoading = byId('pdfLoading');
    const emptyState = byId('emptyState');
    const weekTitle = byId('weekTitle');
    const crumbWeek = byId('crumbWeek');
    const downloadBtn = byId('downloadBtn');
    const openBtn = byId('openBtn');

    const showEmpty = (title, message, emoji) => {
        document.title = `${title} - Algoritma Deep Learning`;

        if (weekTitle) weekTitle.textContent = title;
        if (pdfCard) pdfCard.hidden = true;

        if (downloadBtn) {
            downloadBtn.removeAttribute('href');
            downloadBtn.setAttribute('aria-disabled', 'true');
            downloadBtn.classList.add('is-disabled');
        }
        if (openBtn) {
            openBtn.removeAttribute('href');
            openBtn.setAttribute('aria-disabled', 'true');
        }

        if (emptyState) {
            emptyState.hidden = false;
            emptyState.innerHTML = `
                <span class="emoji" aria-hidden="true">${emoji}</span>
                <h2>${title}</h2>
                <p>${message}</p>
                <a class="btn btn-primary" href="index.html">Kembali ke dashboard</a>`;
        }
    };

    if (!task) {
        showEmpty('Minggu tidak ditemukan',
            'Alamat halaman ini tidak cocok dengan data tugas yang tersedia.',
            '&#129517;');
        return;
    }

    const label = task.judul || `Tugas Minggu ${task.week}`;
    document.title = `Minggu ${task.week} - ${label} | Algoritma Deep Learning`;

    if (weekTitle) weekTitle.textContent = `Minggu ${task.week} - ${label}`;
    if (crumbWeek) crumbWeek.textContent = `Minggu ${task.week}`;

    if (!task.pdf) {
        showEmpty(`Minggu ${task.week} belum tersedia`,
            'Laporan untuk minggu ini belum diunggah. Silakan periksa kembali nanti.',
            '&#128196;');
        return;
    }

    const folder = `minggu-${String(task.week).padStart(2, '0')}`;
    const src = `${folder}/${encodeURIComponent(task.pdf)}`;

    if (pdfFrame) {
        pdfFrame.addEventListener('load', () => {
            if (pdfLoading) pdfLoading.hidden = true;
        }, { once: true });

        pdfFrame.title = `Pembaca PDF ${label}`;
        pdfFrame.hidden = false;
        pdfFrame.src = `${src}#toolbar=0&navpanes=0&view=FitH`;

        // Jaring pengaman: jangan biarkan spinner berputar selamanya.
        window.setTimeout(() => {
            if (pdfLoading) pdfLoading.hidden = true;
        }, 6000);
    }

    if (downloadBtn) {
        downloadBtn.href = src;
        downloadBtn.setAttribute('download', task.pdf);
    }

    if (openBtn) {
        openBtn.href = src;
    }
})();
