/* ============================================================
   Tema terang/gelap.
   Urutan preferensi: pilihan pengguna (localStorage) -> setelan sistem.
   Tema awal sudah dipasang oleh skrip kecil di <head> agar tidak berkedip.
   ============================================================ */

(function () {
    const STORAGE_KEY = 'adl-theme';
    const root = document.documentElement;
    const button = document.getElementById('themeToggle');
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const readStored = () => {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            return null;
        }
    };

    const systemTheme = () => (media.matches ? 'dark' : 'light');

    const apply = (theme) => {
        root.dataset.theme = theme;

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1020' : '#4f46e5');

        if (!button) return;

        const isDark = theme === 'dark';
        button.setAttribute('aria-pressed', String(isDark));
        button.setAttribute('aria-label', isDark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap');

        const icon = button.querySelector('.theme-icon');
        if (icon) icon.textContent = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';
    };

    apply(readStored() || systemTheme());

    if (button) {
        button.addEventListener('click', () => {
            const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
            try {
                localStorage.setItem(STORAGE_KEY, next);
            } catch (error) {
                /* mode privat: abaikan */
            }
            apply(next);
        });
    }

    media.addEventListener('change', (event) => {
        if (!readStored()) apply(event.matches ? 'dark' : 'light');
    });
})();
