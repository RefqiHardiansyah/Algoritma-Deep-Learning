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

    const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    const pdfCard = byId('pdfCard');
    const pdfFrame = byId('pdfFrame');
    const pdfLoading = byId('pdfLoading');
    const emptyState = byId('emptyState');
    const weekTitle = byId('weekTitle');
    const crumbWeek = byId('crumbWeek');
    const downloadBtn = byId('downloadBtn');
    const openBtn = byId('openBtn');
    const prevBtn = byId('prevBtn');
    const nextBtn = byId('nextBtn');

    const isHttp = /^https?:$/.test(window.location.protocol);

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

    // Cek keberadaan berkas sebelum memuat iframe, supaya pengguna tidak
    // melihat halaman error mentah dari browser saat PDF hilang.
    const pdfAvailable = async (url) => {
        if (!isHttp) return true;

        try {
            const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
            if (response.status === 405 || response.status === 501) return true;
            return response.ok;
        } catch (error) {
            return true; // jaringan bermasalah: biarkan iframe mencoba
        }
    };

    const setWeekNav = () => {
        const ordered = source
            .filter((item) => item.pdf)
            .sort((a, b) => a.week - b.week);
        const position = ordered.findIndex((item) => item.week === task.week);

        const apply = (button, target, direction) => {
            if (!button || !target) return;

            button.href = `minggu.html?w=${target.week}`;
            button.title = `Minggu ${target.week} - ${target.judul || 'Tugas'}`;
            button.setAttribute('aria-label', `${direction}: minggu ${target.week}`);
            button.hidden = false;
        };

        apply(prevBtn, position > 0 ? ordered[position - 1] : null, 'Tugas sebelumnya');
        apply(nextBtn,
            position >= 0 && position < ordered.length - 1 ? ordered[position + 1] : null,
            'Tugas berikutnya');
    };

    const render = async () => {
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

        // Navigasi minggu tetap tersedia meskipun berkas PDF minggu ini hilang.
        setWeekNav();

        document.addEventListener('keydown', (event) => {
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;

            if (event.key === 'ArrowLeft' && prevBtn && !prevBtn.hidden) prevBtn.click();
            if (event.key === 'ArrowRight' && nextBtn && !nextBtn.hidden) nextBtn.click();
        });

        // Semua PDF berada di satu folder: pdf/
        const src = `pdf/${encodeURIComponent(task.pdf)}`;

        if (!(await pdfAvailable(src))) {
            showEmpty('Berkas laporan tidak ditemukan',
                `Berkas <code>${esc(task.pdf)}</code> tidak ada di folder <code>pdf/</code>. ` +
                'Silakan hubungi pemilik situs atau kembali ke dashboard.',
                '&#128196;');
            return;
        }

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
    };

    render();
})();
