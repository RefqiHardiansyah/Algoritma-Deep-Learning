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

    if (!grid) return;

    const total = Array.isArray(window.TUGAS) ? window.TUGAS.length : 0;

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

    const render = (query = '') => {
        const term = query.trim().toLowerCase();
        const filtered = term
            ? tasks.filter((task) =>
                task.judul.toLowerCase().includes(term) ||
                String(task.week).includes(term) ||
                `minggu ${task.week}`.includes(term)
            )
            : tasks;

        grid.innerHTML = '';

        if (resultInfo) {
            resultInfo.textContent = term
                ? `Menampilkan ${filtered.length} dari ${tasks.length} tugas untuk “${query.trim()}”.`
                : '';
        }
        if (searchClear) searchClear.hidden = term === '';

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="emoji" aria-hidden="true">&#128269;</span>
                    <h2>Tugas tidak ditemukan</h2>
                    <p>Coba kata kunci lain, misalnya &ldquo;minggu 4&rdquo; atau &ldquo;MNIST&rdquo;.</p>
                </div>`;
            return;
        }

        filtered.forEach((task, index) => {
            const card = document.createElement(task.selesai ? 'a' : 'div');

            if (task.selesai) {
                card.href = task.link;
            } else {
                card.setAttribute('aria-disabled', 'true');
            }

            card.className = `card ${task.selesai ? 'is-done' : 'is-locked'}`;
            card.style.setProperty('--i', String(index));

            card.innerHTML = `
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
                    ${task.selesai
                    ? 'Lihat tugas <span class="arrow" aria-hidden="true">&rarr;</span>'
                    : 'Belum tersedia <span aria-hidden="true">&#128274;</span>'}
                </div>`;

            grid.appendChild(card);
        });
    };

    render();

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
