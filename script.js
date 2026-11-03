/* ============================================================
   Dashboard: membaca data/tugas.js lalu merender kartu, statistik,
   dan progres. Status "Selesai" ditentukan otomatis dari field `pdf`.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('taskGrid');
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const resultInfo = document.getElementById('resultInfo');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const progressLabel = document.getElementById('progressLabel');
    const filterChips = document.querySelectorAll('.chip[data-filter]');
    const sortToggle = document.getElementById('sortToggle');
    const sortLabel = document.getElementById('sortLabel');
    const sortIcon = sortToggle ? sortToggle.querySelector('.sort-icon') : null;

    if (!grid) return;

    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    const tasks = (Array.isArray(window.TUGAS) ? window.TUGAS : [])
        .slice()
        .sort((a, b) => a.week - b.week)
        .map((task) => ({
            week: task.week,
            judul: task.judul || `Tugas Minggu ${task.week}`,
            selesai: Boolean(task.pdf),
            pdf: task.pdf || '',
            pdfHref: task.pdf ? `pdf/${encodeURIComponent(task.pdf)}` : '',
            link: `minggu.html?w=${task.week}`
        }));

    const doneCount = tasks.filter((task) => task.selesai).length;
    const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

    const setText = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    };

    setText('statTotal', tasks.length);
    setText('statDone', doneCount);
    setText('statProgress', `${percent}%`);

    if (progressBar) {
        progressBar.setAttribute('aria-valuemax', String(tasks.length));
        progressBar.setAttribute('aria-valuenow', String(doneCount));
    }
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressLabel) progressLabel.textContent = `${doneCount} dari ${tasks.length} tugas selesai`;

    const filterLabels = {
        all: 'semua',
        done: 'selesai',
        pending: 'belum tersedia'
    };

    let activeFilter = 'all';
    let sortAsc = true;

    const updateSortControl = () => {
        if (!sortToggle) return;

        sortToggle.setAttribute('aria-pressed', String(!sortAsc));
        if (sortLabel) {
            const first = tasks.length ? tasks[0].week : 1;
            const last = tasks.length ? tasks[tasks.length - 1].week : 0;
            sortLabel.textContent = sortAsc
                ? `Minggu ${first} \u2192 ${last}`
                : `Minggu ${last} \u2192 ${first}`;
        }
        if (sortIcon) sortIcon.textContent = sortAsc ? '\u2191' : '\u2193';
    };

    const render = (query = '') => {
        const term = query.trim().toLowerCase();

        let filtered = tasks.filter((task) => {
            if (activeFilter === 'done' && !task.selesai) return false;
            if (activeFilter === 'pending' && task.selesai) return false;
            return true;
        });

        if (term) {
            filtered = filtered.filter((task) =>
                task.judul.toLowerCase().includes(term) ||
                String(task.week).includes(term) ||
                `minggu ${task.week}`.includes(term)
            );
        }

        filtered = filtered.slice().sort((a, b) => (sortAsc ? a.week - b.week : b.week - a.week));

        grid.innerHTML = '';

        const context = [];
        if (term) context.push(`pencarian \u201C${query.trim()}\u201D`);
        if (activeFilter !== 'all') context.push(`filter ${filterLabels[activeFilter]}`);

        if (resultInfo) {
            resultInfo.textContent = context.length
                ? `Menampilkan ${filtered.length} dari ${tasks.length} tugas (${context.join(', ')}).`
                : '';
        }
        if (searchClear) searchClear.hidden = term === '';

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="emoji" aria-hidden="true">&#128269;</span>
                    <h2>Tugas tidak ditemukan</h2>
                    <p>Coba kata kunci lain, misalnya &ldquo;minggu 4&rdquo; atau &ldquo;MNIST&rdquo;, atau ubah filternya.</p>
                </div>`;
            return;
        }

        filtered.forEach((task, index) => {
            const card = document.createElement('article');
            card.className = `card ${task.selesai ? 'is-done' : 'is-locked'}`;
            card.style.setProperty('--i', String(index));

            if (!task.selesai) card.setAttribute('aria-disabled', 'true');

            card.innerHTML = `
                ${task.selesai
                    ? `<a class="card-hit" href="${task.link}" aria-label="Lihat tugas minggu ${task.week}"></a>`
                    : ''}
                <div class="card-top">
                    <div class="card-header">
                        <span class="week-badge">Minggu ${task.week}</span>
                        <span class="pill ${task.selesai ? 'is-done' : 'is-locked'}">
                            <span class="dot" aria-hidden="true"></span>
                            ${task.selesai ? 'Selesai' : 'Belum Tersedia'}
                        </span>
                    </div>
                    <h2>${escapeHtml(task.judul)}</h2>
                    <p>${task.selesai ? 'Laporan tersedia dalam format PDF.' : 'Laporan belum diunggah.'}</p>
                </div>
                <div class="card-footer">
                    <span class="card-cta">
                        ${task.selesai
                            ? 'Lihat tugas <span class="arrow" aria-hidden="true">&rarr;</span>'
                            : 'Belum tersedia <span aria-hidden="true">&#128274;</span>'}
                    </span>
                    ${task.selesai
                        ? `<a class="card-download" href="${task.pdfHref}" download="${escapeHtml(task.pdf)}">Unduh PDF</a>`
                        : ''}
                </div>`;

            grid.appendChild(card);
        });
    };

    updateSortControl();
    render();

    filterChips.forEach((chip) => {
        chip.addEventListener('click', () => {
            activeFilter = chip.dataset.filter || 'all';

            filterChips.forEach((item) => {
                const isActive = item === chip;
                item.classList.toggle('is-active', isActive);
                item.setAttribute('aria-pressed', String(isActive));
            });

            render(searchInput ? searchInput.value : '');
        });
    });

    if (sortToggle) {
        sortToggle.addEventListener('click', () => {
            sortAsc = !sortAsc;
            updateSortControl();
            render(searchInput ? searchInput.value : '');
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (event) => render(event.target.value));

        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                searchInput.value = '';
                render();
            }
        });

        if (searchClear) {
            searchClear.addEventListener('click', () => {
                searchInput.value = '';
                render();
                searchInput.focus();
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === '/' && document.activeElement !== searchInput
                && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
                event.preventDefault();
                searchInput.focus();
            }
        });
    }
});
