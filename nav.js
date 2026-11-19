/* ============================================================
   Navigasi sidebar bersama: daftar minggu, progres, tinggi header
   aktual, dan drawer untuk layar kecil. Dipakai index.html dan
   minggu.html. Bergantung pada data/tugas.js (window.TUGAS).
   ============================================================ */

(function () {
    const root = document.documentElement;
    const body = document.body;

    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    const tasks = (Array.isArray(window.TUGAS) ? window.TUGAS : [])
        .slice()
        .sort((a, b) => a.week - b.week);

    const currentWeek = (() => {
        const params = new URLSearchParams(window.location.search);
        const raw = params.get('w') ?? params.get('minggu');
        const week = Number.parseInt(raw, 10);
        return Number.isInteger(week) ? week : null;
    })();

    /* ---------- Daftar minggu ---------- */
    const list = document.getElementById('weekNavList');

    if (list) {
        const items = tasks.map((task) => {
            const done = Boolean(task.pdf);
            const title = task.judul || `Tugas Minggu ${task.week}`;
            const isCurrent = task.week === currentWeek;
            const inner = `
                <span class="week-no">M${task.week}</span>
                <span class="week-name" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
                <span class="week-dot" aria-hidden="true"></span>`;

            if (!done) {
                return `<li>
                    <span class="week-link" aria-disabled="true" title="Minggu ${task.week}: belum tersedia">
                        ${inner}
                        <span class="sr-only">Belum tersedia</span>
                    </span>
                </li>`;
            }

            return `<li>
                <a class="week-link is-done${isCurrent ? ' is-active' : ''}"
                    href="minggu.html?w=${task.week}"
                    ${isCurrent ? 'aria-current="page"' : ''}
                    title="Minggu ${task.week}: ${escapeHtml(title)}">
                    ${inner}
                </a>
            </li>`;
        });

        list.innerHTML = items.length
            ? items.join('')
            : '<li class="week-empty">Belum ada data tugas.</li>';
    }

    /* ---------- Progres pengumpulan ---------- */
    const total = tasks.length;
    const done = tasks.filter((task) => task.pdf).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressLabel');
    const bar = document.getElementById('progressBar');

    if (fill) fill.style.width = `${percent}%`;
    if (label) label.textContent = `${done} dari ${total} tugas selesai`;
    if (bar) {
        bar.setAttribute('aria-valuemax', String(total));
        bar.setAttribute('aria-valuenow', String(done));
    }

    /* ---------- Tinggi header aktual (bisa berubah saat wrap) ---------- */
    const header = document.getElementById('appHeader');

    if (header) {
        const syncHeaderHeight = () => {
            root.style.setProperty('--header-h', `${header.offsetHeight}px`);
        };

        syncHeaderHeight();

        if ('ResizeObserver' in window) {
            new ResizeObserver(syncHeaderHeight).observe(header);
        } else {
            window.addEventListener('resize', syncHeaderHeight);
        }
    }

    /* ---------- Drawer sidebar (layar kecil) ---------- */
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const backdrop = document.getElementById('sidebarBackdrop');

    if (!sidebar || !toggle) return;

    let lastFocus = null;
    let previousOverflow = '';
    let previousPadding = '';

    const focusableItems = () => Array.from(sidebar.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter((el) => el.getClientRects().length > 0);

    const isOpen = () => body.classList.contains('nav-open');

    const lockScroll = () => {
        previousOverflow = root.style.overflow;
        previousPadding = body.style.paddingRight;

        const scrollbar = window.innerWidth - root.clientWidth;
        root.style.overflow = 'hidden';
        if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    };

    const unlockScroll = () => {
        root.style.overflow = previousOverflow;
        body.style.paddingRight = previousPadding;
    };

    const open = () => {
        lastFocus = document.activeElement;
        body.classList.add('nav-open');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Tutup menu navigasi');
        if (backdrop) backdrop.hidden = false;
        lockScroll();

        const first = focusableItems()[0];
        if (first) window.requestAnimationFrame(() => first.focus());
    };

    const close = (restoreFocus = true) => {
        if (!isOpen()) return;

        body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Buka menu navigasi');
        if (backdrop) backdrop.hidden = true;
        unlockScroll();

        if (restoreFocus && lastFocus && typeof lastFocus.focus === 'function') {
            lastFocus.focus();
        }
    };

    toggle.addEventListener('click', () => {
        if (isOpen()) close();
        else open();
    });

    if (backdrop) backdrop.addEventListener('click', () => close());

    document.addEventListener('keydown', (event) => {
        if (!isOpen()) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            close();
            return;
        }

        if (event.key !== 'Tab') return;

        const items = focusableItems();
        if (!items.length) return;

        const first = items[0];
        const last = items[items.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    sidebar.addEventListener('click', (event) => {
        if (event.target.closest('a[href]')) close(false);
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024 && isOpen()) close(false);
    });
})();
