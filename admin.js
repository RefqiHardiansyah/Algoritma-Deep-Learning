/* ============================================================
   Panel admin lokal.

   - Login dengan PBKDF2-SHA256 + salt (kata sandi tidak disimpan).
   - Data dibaca dari data/tugas.js lalu bisa ditambah / diedit / dihapus.
   - PDF diseret ke formulir, otomatis dinamai minggu-XX-topik.pdf,
     lalu ditulis ke folder pdf/ lewat File System Access API.
   - File data/tugas.js ditulis ulang langsung dari panel ini.
   - Halaman ini diblokir 404 saat situs di-deploy ke Netlify.
   ============================================================ */

(function () {
    'use strict';

    /* ---------- Konfigurasi login ---------- */
    const AUTH = {
        user: 'tugasADL123456789',
        salt: '52a2509a3c44b9ce3b6df0773d568ebd',
        iterations: 210000,
        hash: '8333d331e4364b8b17a9433ced2a166203bccc87c61320211053eac821371f6b'
    };

    const BASE_TITLE = 'Panel Admin - Algoritma Deep Learning';

    const SESSION_KEY = 'adl-admin-session';
    const ATTEMPT_KEY = 'adl-admin-attempts';
    const LOCK_KEY = 'adl-admin-lock';
    const MAX_ATTEMPTS = 5;
    const LOCK_MS = 30 * 1000;

    const IDB_NAME = 'adl-admin';
    const IDB_STORE = 'kv';
    const HANDLE_KEY = 'project';

    const FILE_HEADER = [
        '/* ============================================================',
        '   SUMBER DATA TUNGGAL — dashboard, viewer, dan panel admin membaca file ini.',
        '',
        '   Struktur:',
        '   - Semua PDF disimpan di folder  pdf/  dengan nama bebas.',
        '   - Field `pdf` hanya berisi NAMA FILE (tanpa folder).',
        '   - Field `pdf` kosong / tidak ditulis = tugas belum tersedia.',
        '',
        '   File ini dihasilkan oleh admin.html dan boleh diedit manual.',
        '   ============================================================ */',
        '',
        'window.TUGAS = ['
    ].join('\n');

    /* ---------- Util ---------- */
    const $ = (id) => document.getElementById(id);

    const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    const store = {
        get(key) {
            try { return sessionStorage.getItem(key); } catch (error) { return null; }
        },
        set(key, value) {
            try { sessionStorage.setItem(key, value); } catch (error) { /* abaikan */ }
        },
        remove(key) {
            try { sessionStorage.removeItem(key); } catch (error) { /* abaikan */ }
        }
    };

    const supportsFS = () => typeof window.showDirectoryPicker === 'function';

    function hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
        }
        return bytes;
    }

    const toHex = (buffer) => Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');

    async function deriveHash(password) {
        if (!window.crypto || !window.crypto.subtle) return null;

        const key = await window.crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );

        const bits = await window.crypto.subtle.deriveBits({
            name: 'PBKDF2',
            salt: hexToBytes(AUTH.salt),
            iterations: AUTH.iterations,
            hash: 'SHA-256'
        }, key, 256);

        return toHex(bits);
    }

    function formatSize(bytes) {
        if (!bytes) return '0 KB';
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }

    function slugify(text) {
        const slug = String(text)
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60);
        return slug || 'tugas';
    }

    function defaultFileName(week, judul) {
        return `minggu-${String(week).padStart(2, '0')}-${slugify(judul)}.pdf`;
    }

    function normalizeFileName(name) {
        return String(name)
            .trim()
            .replace(/[\\/:*?"<>|]+/g, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();
    }

    function quote(value) {
        return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ')}'`;
    }

    /* ---------- IndexedDB (menyimpan handle folder) ---------- */
    function idbOpen() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB tidak tersedia'));
                return;
            }
            const request = indexedDB.open(IDB_NAME, 1);
            request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function idbSet(key, value) {
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).put(value, key);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    async function idbGet(key) {
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const request = tx.objectStore(IDB_STORE).get(key);
            request.onsuccess = () => { db.close(); resolve(request.result); };
            request.onerror = () => { db.close(); reject(request.error); };
        });
    }

    /* ---------- State ---------- */
    let entries = [];
    let editingWeek = null;
    let pendingFile = null;
    let fileTouched = false;
    let projectRoot = null;
    let pdfDir = null;
    let dataDir = null;
    let initialized = false;
    let lockTimer = null;
    let dirty = false;
    let orphanFiles = [];

    const fileStatus = new Map();

    /* ---------- Elemen ---------- */
    const loginView = $('loginView');
    const adminView = $('adminView');
    const loginForm = $('loginForm');
    const loginUser = $('loginUser');
    const loginPass = $('loginPass');
    const loginBtn = $('loginBtn');
    const loginError = $('loginError');

    const dataRows = $('dataRows');
    const entryForm = $('entryForm');
    const weekInput = $('weekInput');
    const judulInput = $('judulInput');
    const pdfNameInput = $('pdfName');
    const fileInput = $('fileInput');
    const dropzone = $('dropzone');
    const filePill = $('filePill');
    const formError = $('formError');
    const formTitle = $('formTitle');
    const cancelBtn = $('cancelBtn');
    const statsChip = $('statsChip');
    const folderStatus = $('folderStatus');
    const folderNote = $('folderNote');
    const saveHint = $('saveHint');
    const dirtyChip = $('dirtyChip');
    const scanBtn = $('scanBtn');
    const orphanPanel = $('orphanPanel');
    const orphanCount = $('orphanCount');
    const orphanNote = $('orphanNote');
    const orphanList = $('orphanList');

    /* ============================================================
       AUTH
       ============================================================ */

    function lockRemaining() {
        return Math.max(0, Number(store.get(LOCK_KEY) || 0) - Date.now());
    }

    function setLoginError(message) {
        loginError.textContent = message || '';
    }

    function setLoginDisabled(disabled) {
        loginUser.disabled = disabled;
        loginPass.disabled = disabled;
        loginBtn.disabled = disabled;
    }

    function showLockNotice() {
        const tick = () => {
            const remaining = lockRemaining();
            if (remaining <= 0) {
                window.clearInterval(lockTimer);
                lockTimer = null;
                setLoginDisabled(false);
                setLoginError('');
                return;
            }
            setLoginDisabled(true);
            setLoginError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(remaining / 1000)} detik.`);
        };
        window.clearInterval(lockTimer);
        lockTimer = window.setInterval(tick, 500);
        tick();
    }

    function registerFailure() {
        const attempts = Number(store.get(ATTEMPT_KEY) || 0) + 1;

        if (attempts >= MAX_ATTEMPTS) {
            store.set(LOCK_KEY, String(Date.now() + LOCK_MS));
            store.remove(ATTEMPT_KEY);
            loginPass.value = '';
            showLockNotice();
            return;
        }

        store.set(ATTEMPT_KEY, String(attempts));
        setLoginError(`ID atau kata sandi salah. Sisa percobaan: ${MAX_ATTEMPTS - attempts}.`);
        loginPass.value = '';
    }

    async function onLogin(event) {
        event.preventDefault();

        if (lockRemaining() > 0) {
            showLockNotice();
            return;
        }

        const user = loginUser.value.trim();
        const pass = loginPass.value;

        if (!user || !pass) {
            setLoginError('ID admin dan kata sandi wajib diisi.');
            return;
        }

        const hash = await deriveHash(pass);

        if (hash === null) {
            setLoginError('Browser ini tidak mendukung verifikasi sandi. Gunakan Chrome atau Edge terbaru.');
            return;
        }

        if (user !== AUTH.user || hash !== AUTH.hash) {
            registerFailure();
            return;
        }

        store.remove(ATTEMPT_KEY);
        store.remove(LOCK_KEY);
        store.set(SESSION_KEY, 'ok');
        setLoginError('');
        openAdmin();
    }

    function openAdmin() {
        loginView.hidden = true;
        adminView.hidden = false;
        initAdmin();
    }

    function bootAuth() {
        if (store.get(SESSION_KEY) === 'ok') {
            openAdmin();
            return;
        }
        if (lockRemaining() > 0) showLockNotice();
    }

    /* ============================================================
       ADMIN — inisialisasi
       ============================================================ */

    function initAdmin() {
        if (initialized) return;
        initialized = true;

        entries = (Array.isArray(window.TUGAS) ? window.TUGAS : [])
            .map((item) => ({
                week: Number(item.week),
                judul: item.judul || `Tugas Minggu ${item.week}`,
                pdf: item.pdf || ''
            }))
            .filter((item) => Number.isInteger(item.week) && item.week > 0)
            .sort((a, b) => a.week - b.week);

        if (!supportsFS()) {
            setFolderStatus('warn', 'Browser tanpa akses folder');
            notify('Browser ini tidak mendukung akses folder. Data masih bisa diunduh manual lewat tombol di bawah.');
        }

        renderTable();
        resetForm();
        setDirty(false);
        restoreFolder();
    }

    function setDirty(value) {
        dirty = Boolean(value);
        document.title = dirty ? `\u25CF ${BASE_TITLE}` : BASE_TITLE;
        if (dirtyChip) dirtyChip.hidden = !dirty;
    }

    function setFolderStatus(state, text) {
        folderStatus.textContent = text;
        folderStatus.classList.remove('ok', 'warn');
        folderStatus.classList.add(state);
    }

    function notify(message, isError) {
        saveHint.textContent = message;
        saveHint.classList.toggle('is-error', Boolean(isError));
    }

    /* ============================================================
       FOLDER PROYEK
       ============================================================ */

    async function attachProject(handle, options) {
        const settings = options || {};
        try {
            if (settings.request) {
                const permission = await handle.requestPermission({ mode: 'readwrite' });
                if (permission !== 'granted') {
                    if (!settings.silent) notify('Izin akses folder ditolak.', true);
                    return false;
                }
            }

            const nextPdf = await handle.getDirectoryHandle('pdf');
            const nextData = await handle.getDirectoryHandle('data');

            projectRoot = handle;
            pdfDir = nextPdf;
            dataDir = nextData;

            idbSet(HANDLE_KEY, handle).catch(() => { /* file:// mungkin menolak */ });

            setFolderStatus('ok', 'Folder terhubung');
            folderNote.hidden = true;
            if (!settings.silent) notify('Folder proyek terhubung. PDF akan disimpan ke pdf/.');

            await checkAllFiles();
            return true;
        } catch (error) {
            if (!settings.silent) {
                setFolderStatus('warn', 'Folder belum terhubung');
                notify('Folder tidak dikenali. Pastikan folder yang dipilih berisi pdf/ dan data/.', true);
            }
            return false;
        }
    }

    async function restoreFolder() {
        if (!supportsFS()) return;

        let handle = null;
        try {
            handle = await idbGet(HANDLE_KEY);
        } catch (error) {
            return;
        }
        if (!handle) return;

        try {
            const permission = await handle.queryPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
                await attachProject(handle, { silent: true });
            } else {
                projectRoot = handle;
                setFolderStatus('warn', 'Klik "Pilih folder proyek" untuk memberi izin');
            }
        } catch (error) {
            /* handle lama tidak valid — abaikan */
        }
    }

    async function onConnect() {
        if (!supportsFS()) {
            notify('Browser ini tidak mendukung akses folder. Gunakan Chrome/Edge desktop, atau unduh tugas.js secara manual.', true);
            return;
        }

        let handle = projectRoot;
        if (!handle) {
            try { handle = await idbGet(HANDLE_KEY); } catch (error) { handle = null; }
        }

        if (handle) {
            try {
                const permission = await handle.requestPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                    const connected = await attachProject(handle);
                    if (connected) return;
                }
            } catch (error) {
                /* handle kedaluwarsa — lanjut ke pemilih folder */
            }
        }

        try {
            const picked = await window.showDirectoryPicker({ mode: 'readwrite', id: 'adl-project' });
            await attachProject(picked, { request: true });
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            notify('Gagal membuka folder: ' + (error && error.message ? error.message : 'tidak diketahui'), true);
        }
    }

    /* ============================================================
       TABEL
       ============================================================ */

    async function checkAllFiles() {
        fileStatus.clear();

        if (!pdfDir) {
            renderTable();
            return;
        }

        for (const entry of entries) {
            if (!entry.pdf) continue;
            try {
                await pdfDir.getFileHandle(entry.pdf);
                fileStatus.set(entry.week, 'ok');
            } catch (error) {
                fileStatus.set(entry.week, 'missing');
            }
        }

        renderTable();
    }

    function renderTable() {
        if (!dataRows) return;

        if (!entries.length) {
            dataRows.innerHTML = '<tr><td colspan="4" class="empty-row">Belum ada data. Tambahkan lewat formulir.</td></tr>';
        } else {
            dataRows.innerHTML = entries.map((entry) => {
                const state = !entry.pdf ? 'none' : (fileStatus.get(entry.week) || 'unknown');
                const stateText = state === 'ok' ? '&#10003; Ada'
                    : state === 'missing' ? '&#9888; Tidak ditemukan'
                        : state === 'none' ? 'Tidak ada PDF'
                            : 'belum dicek';

                return `<tr data-week="${entry.week}" class="${editingWeek === entry.week ? 'is-editing' : ''}">
                    <td class="week-cell">Minggu ${entry.week}</td>
                    <td class="task-cell">
                        <span class="task-title">${esc(entry.judul)}</span>
                        <span class="file-name" title="${esc(entry.pdf || '')}">${entry.pdf ? esc(entry.pdf) : 'belum ada berkas'}</span>
                    </td>
                    <td><span class="file-state ${state}" title="${state === 'unknown' ? 'Hubungkan folder proyek untuk memeriksa berkas' : ''}">${stateText}</span></td>
                    <td>
                        <div class="row-actions">
                            ${entry.pdf ? `<a class="btn btn-ghost btn-sm" href="pdf/${encodeURIComponent(entry.pdf)}" target="_blank" rel="noopener">Lihat</a>` : ''}
                            <button class="btn btn-ghost btn-sm" type="button" data-action="edit" data-week="${entry.week}">Edit</button>
                            <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-week="${entry.week}">Hapus</button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }

        const withPdf = entries.filter((entry) => entry.pdf).length;
        statsChip.textContent = `${entries.length} entri \u00B7 ${withPdf} PDF`;
    }

    function editEntry(week) {
        const entry = entries.find((item) => item.week === week);
        if (!entry) return;

        editingWeek = week;
        fileTouched = true;
        pendingFile = null;

        weekInput.value = entry.week;
        judulInput.value = entry.judul;
        pdfNameInput.value = entry.pdf;
        fileInput.value = '';
        filePill.hidden = true;
        filePill.textContent = '';
        formError.textContent = '';
        formTitle.textContent = `Edit minggu ${week}`;
        cancelBtn.hidden = false;

        renderTable();
        entryForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function deleteEntry(week) {
        const entry = entries.find((item) => item.week === week);
        if (!entry) return;

        if (!window.confirm(`Hapus entri minggu ${week}? Berkas PDF di folder pdf/ tidak ikut dihapus.`)) return;

        entries = entries.filter((item) => item.week !== week);
        fileStatus.delete(week);
        hideOrphans();
        if (editingWeek === week) resetForm();

        renderTable();
        setDirty(true);
        notify(`Entri minggu ${week} dihapus dari daftar. Simpan data/tugas.js untuk menerapkan.`);
    }

    /* ============================================================
       BERKAS YATIM
       ============================================================ */

    function hideOrphans() {
        orphanFiles = [];
        if (orphanPanel) orphanPanel.hidden = true;
        if (orphanList) orphanList.innerHTML = '';
    }

    function renderOrphans() {
        orphanPanel.hidden = false;
        orphanCount.textContent = `${orphanFiles.length} berkas`;

        if (!orphanFiles.length) {
            orphanNote.textContent = 'Semua berkas PDF di folder pdf/ sudah dipakai oleh data tugas.';
            orphanList.innerHTML = '';
            return;
        }

        orphanNote.textContent = 'Berkas berikut tidak dipakai oleh entri mana pun. Hapus hanya jika Anda yakin.';
        orphanList.innerHTML = orphanFiles.map((name) => `
            <li class="orphan-item">
                <span class="file-name" title="${esc(name)}">${esc(name)}</span>
                <button class="btn btn-danger btn-sm" type="button" data-orphan="${esc(name)}">Hapus</button>
            </li>`).join('');
    }

    async function scanOrphans() {
        if (!pdfDir) {
            notify('Hubungkan folder proyek dulu untuk memeriksa folder pdf/.', true);
            return;
        }

        try {
            const found = [];
            for await (const [name, handle] of pdfDir.entries()) {
                if (handle.kind === 'file' && /\.pdf$/i.test(name)) found.push(name);
            }

            const referenced = new Set(entries.map((entry) => entry.pdf).filter(Boolean));
            orphanFiles = found.filter((name) => !referenced.has(name)).sort();
            renderOrphans();
            notify(orphanFiles.length
                ? `${orphanFiles.length} berkas di pdf/ belum dipakai.`
                : 'Tidak ada berkas yatim.');
        } catch (error) {
            notify('Gagal membaca folder pdf/: ' + (error && error.message ? error.message : 'kesalahan'), true);
        }
    }

    async function deleteOrphan(name) {
        if (!window.confirm(`Hapus berkas "${name}" dari folder pdf/?`)) return;

        try {
            await pdfDir.removeEntry(name);
            orphanFiles = orphanFiles.filter((item) => item !== name);
            renderOrphans();
            notify(`Berkas ${name} dihapus dari pdf/.`);
        } catch (error) {
            notify('Gagal menghapus berkas: ' + (error && error.message ? error.message : 'kesalahan'), true);
        }
    }

    /* ============================================================
       FORMULIR
       ============================================================ */

    function nextWeek() {
        const max = entries.reduce((highest, entry) => Math.max(highest, entry.week), 0);
        return Math.min(99, max + 1);
    }

    function syncFileName() {
        if (fileTouched) return;
        const week = Number(weekInput.value);
        if (!Number.isInteger(week) || week < 1) return;
        pdfNameInput.value = defaultFileName(week, judulInput.value.trim());
    }

    function resetForm() {
        editingWeek = null;
        pendingFile = null;
        fileTouched = false;

        entryForm.reset();
        weekInput.value = nextWeek();
        pdfNameInput.value = '';
        filePill.hidden = true;
        filePill.textContent = '';
        formError.textContent = '';
        formTitle.textContent = 'Tambah tugas';
        cancelBtn.hidden = true;

        syncFileName();
        renderTable();
    }

    async function handleFile(file) {
        if (!file) return;

        const looksPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        if (!looksPdf) {
            formError.textContent = 'Berkas harus berformat PDF.';
            return;
        }

        let header = '';
        try {
            header = await file.slice(0, 1024).text();
        } catch (error) {
            header = '';
        }

        if (!header.includes('%PDF-')) {
            formError.textContent = 'Isi berkas bukan PDF yang valid.';
            return;
        }

        formError.textContent = '';
        pendingFile = file;
        filePill.hidden = false;
        filePill.textContent = `Berkas dipilih: ${file.name} (${formatSize(file.size)})`;

        if (!fileTouched) {
            const week = Number(weekInput.value);
            if (Number.isInteger(week) && week > 0) {
                pdfNameInput.value = defaultFileName(week, judulInput.value.trim());
            }
        }
    }

    async function fileExists(name) {
        try {
            await pdfDir.getFileHandle(name);
            return true;
        } catch (error) {
            return false;
        }
    }

    async function writeBlob(name, blob) {
        const handle = await pdfDir.getFileHandle(name, { create: true });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
    }

    async function writePdf(file, name) {
        if (await fileExists(name) && !window.confirm(`Berkas "${name}" sudah ada di folder pdf/. Timpa?`)) {
            return false;
        }

        await writeBlob(name, file);
        return true;
    }

    async function movePdf(previousName, nextName) {
        if (!pdfDir || !previousName || !nextName || previousName === nextName) return true;
        if (!(await fileExists(previousName))) return true;
        if (await fileExists(nextName)) return true;

        if (!window.confirm(`Pindahkan berkas "${previousName}" menjadi "${nextName}"?`)) {
            return false;
        }

        const handle = await pdfDir.getFileHandle(previousName);
        const file = await handle.getFile();
        await writeBlob(nextName, file);
        await pdfDir.removeEntry(previousName);
        return true;
    }

    async function saveEntry(event) {
        event.preventDefault();
        formError.textContent = '';

        const week = Number(weekInput.value);
        const judul = judulInput.value.trim();
        let pdf = pdfNameInput.value.trim();

        if (!Number.isInteger(week) || week < 1 || week > 99) {
            formError.textContent = 'Nomor minggu harus antara 1 dan 99.';
            return;
        }

        if (!judul) {
            formError.textContent = 'Judul tugas wajib diisi.';
            return;
        }

        if (pdf) pdf = normalizeFileName(pdf);

        if (pdf && !/\.pdf$/i.test(pdf)) {
            formError.textContent = 'Nama berkas harus berakhiran .pdf.';
            return;
        }

        const duplicate = entries.find((entry) => entry.week === week && entry.week !== editingWeek);
        if (duplicate) {
            formError.textContent = `Minggu ${week} sudah ada. Pilih nomor lain atau edit entri tersebut.`;
            return;
        }

        const previous = editingWeek !== null
            ? entries.find((item) => item.week === editingWeek)
            : null;

        if (pendingFile) {
            if (!pdfDir) {
                formError.textContent = 'Hubungkan folder proyek dulu agar PDF bisa disimpan ke folder pdf/.';
                return;
            }
            if (!pdf) pdf = defaultFileName(week, judul);

            try {
                const written = await writePdf(pendingFile, pdf);
                if (!written) return;
            } catch (error) {
                formError.textContent = 'Gagal menyimpan PDF: ' + (error && error.message ? error.message : 'kesalahan tidak diketahui');
                return;
            }
        } else if (previous && previous.pdf && pdf) {
            // Nama berkas diubah tanpa mengunggah PDF baru: pindahkan berkas lamanya.
            try {
                const moved = await movePdf(previous.pdf, pdf);
                if (!moved) {
                    formError.textContent = 'Penyimpanan dibatalkan. Nama berkas tidak diubah.';
                    return;
                }
            } catch (error) {
                formError.textContent = 'Gagal memindahkan berkas: ' + (error && error.message ? error.message : 'kesalahan tidak diketahui');
                return;
            }
        }

        const entry = { week, judul, pdf };

        if (editingWeek !== null) {
            const index = entries.findIndex((item) => item.week === editingWeek);
            if (index >= 0) entries[index] = entry;
            else entries.push(entry);
        } else {
            entries.push(entry);
        }

        entries.sort((a, b) => a.week - b.week);
        await checkAllFiles();
        hideOrphans();
        resetForm();
        setDirty(true);
        notify(`Minggu ${week} masuk ke daftar. Klik "Simpan data/tugas.js" atau tekan Ctrl+S untuk menulis ke file.`);
    }

    /* ============================================================
       SIMPAN DATA
       ============================================================ */

    function buildFileContent() {
        const lines = entries.map((entry) => {
            const fields = [`week: ${entry.week}`, `judul: ${quote(entry.judul)}`];
            if (entry.pdf) fields.push(`pdf: ${quote(entry.pdf)}`);
            return `    { ${fields.join(', ')} }`;
        });

        return `${FILE_HEADER}\n${lines.join(',\n')}\n];\n`;
    }

    function downloadFile(content) {
        const blob = new Blob([content], { type: 'text/javascript;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tugas.js';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        notify('tugas.js diunduh. Timpa file data/tugas.js dengan hasil unduhan ini.');
    }

    async function backupDataFile() {
        try {
            const current = await dataDir.getFileHandle('tugas.js');
            const text = await (await current.getFile()).text();
            if (!text.trim()) return;

            const backup = await dataDir.getFileHandle('tugas.backup.js', { create: true });
            const writable = await backup.createWritable();
            await writable.write(text);
            await writable.close();
        } catch (error) {
            /* file belum ada — tidak ada yang perlu dicadangkan */
        }
    }

    async function saveDataFile() {
        const content = buildFileContent();

        if (!dataDir) {
            downloadFile(content);
            return;
        }

        try {
            await backupDataFile();
            const handle = await dataDir.getFileHandle('tugas.js', { create: true });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            setDirty(false);
            notify('data/tugas.js berhasil disimpan (cadangan: tugas.backup.js). Muat ulang dashboard untuk melihat perubahan.');
        } catch (error) {
            notify('Gagal menulis data/tugas.js: ' + (error && error.message ? error.message : 'kesalahan tidak diketahui'), true);
        }
    }

    async function copyJson() {
        const text = JSON.stringify(entries, null, 2);

        try {
            await navigator.clipboard.writeText(text);
            notify('JSON disalin ke clipboard.');
            return;
        } catch (error) {
            /* lanjut ke fallback */
        }

        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();

        try {
            document.execCommand('copy');
            notify('JSON disalin ke clipboard.');
        } catch (error) {
            notify('Gagal menyalin. Gunakan tombol "Unduh tugas.js".', true);
        }

        area.remove();
    }

    /* ============================================================
       EVENT
       ============================================================ */

    loginForm.addEventListener('submit', onLogin);

    dataRows.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const week = Number(button.dataset.week);
        if (button.dataset.action === 'edit') editEntry(week);
        if (button.dataset.action === 'delete') deleteEntry(week);
    });

    entryForm.addEventListener('submit', saveEntry);

    weekInput.addEventListener('input', syncFileName);
    judulInput.addEventListener('input', syncFileName);
    pdfNameInput.addEventListener('input', () => { fileTouched = true; });

    fileInput.addEventListener('change', () => handleFile(fileInput.files && fileInput.files[0]));

    ['dragenter', 'dragover'].forEach((type) => {
        dropzone.addEventListener(type, (event) => {
            event.preventDefault();
            dropzone.classList.add('is-dragover');
        });
    });

    ['dragleave', 'dragend', 'drop'].forEach((type) => {
        dropzone.addEventListener(type, () => dropzone.classList.remove('is-dragover'));
    });

    dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
        handleFile(file);
    });

    $('newBtn').addEventListener('click', resetForm);
    cancelBtn.addEventListener('click', resetForm);
    $('connectBtn').addEventListener('click', onConnect);
    $('saveFileBtn').addEventListener('click', saveDataFile);
    $('downloadBtn').addEventListener('click', () => downloadFile(buildFileContent()));
    $('copyBtn').addEventListener('click', copyJson);
    scanBtn.addEventListener('click', scanOrphans);

    orphanList.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-orphan]');
        if (button) deleteOrphan(button.dataset.orphan);
    });

    document.addEventListener('keydown', (event) => {
        if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
        if (adminView.hidden) return;
        event.preventDefault();
        saveDataFile();
    });

    window.addEventListener('beforeunload', (event) => {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = '';
    });

    $('logoutBtn').addEventListener('click', () => {
        if (dirty && !window.confirm('Ada perubahan yang belum disimpan ke data/tugas.js. Keluar tetap?')) {
            return;
        }

        setDirty(false);
        store.remove(SESSION_KEY);
        window.location.reload();
    });

    bootAuth();
})();
