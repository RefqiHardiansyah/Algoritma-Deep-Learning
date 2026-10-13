document.addEventListener('DOMContentLoaded', () => {
    const taskGrid = document.getElementById('taskGrid');
    const searchInput = document.getElementById('searchInput');

    // Data Tugas (Minggu 1 - 14)
    const tasks = Array.from({ length: 14 }, (_, i) => ({
        week: i + 1,
        title: i === 13 ? 'Algoritma Deep Learning' : `Tugas Minggu-${i + 1}`,
        description: i === 13 
            ? 'Tugas Dalam Bentuk PDF' 
            : `Tugas Dalam Bentuk PDF.`,
        link: `minggu-${String(i + 1).padStart(2, '0')}/index.html`,
        
        // PENTING: Ganti angka 3 di bawah ini dengan minggu tugas yang sudah Anda selesaikan
        // Jika Anda sudah mengerjakan sampai minggu 4, ubah menjadi "i < 4", dst.
        status: i < 2 ? 'Selesai' : 'Belum Tersedia'
    }));

    // Fungsi Render Card
    const renderCards = (filterText = '') => {
        taskGrid.innerHTML = '';
        
        const filteredTasks = tasks.filter(task => 
            task.title.toLowerCase().includes(filterText.toLowerCase()) || 
            task.week.toString().includes(filterText)
        );

        if(filteredTasks.length === 0) {
            taskGrid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #888;">Tugas tidak ditemukan.</p>`;
            return;
        }

        filteredTasks.forEach(task => {
            const isDone = task.status === 'Selesai';
            
            // Logika Kunci (Lock):
            // Jika sudah selesai, gunakan tag <a> agar bisa diklik pindah halaman.
            // Jika belum selesai, gunakan tag <div> agar mati (mute/tidak bisa diklik).
            const card = document.createElement(isDone ? 'a' : 'div');
            
            if (isDone) {
                card.href = task.link;
            }
            
            // Tambahkan class 'disabled' jika tugas belum tersedia
            card.className = isDone ? 'card' : 'card disabled';
            
            card.innerHTML = `
                <div>
                    <div class="card-header">
                        <span class="week-badge">Minggu ${task.week}</span>
                        <span style="font-size: 0.8rem; color: ${isDone ? '#10b981' : '#f59e0b'};">
                            ● ${task.status}
                        </span>
                    </div>
                    <h2>${task.title}</h2>
                    <p>${task.description}</p>
                </div>
                <div class="card-footer">
                    ${isDone ? 'Lihat Tugas <span>→</span>' : 'Belum Selesai <span>🔒</span>'}
                </div>
            `;
            taskGrid.appendChild(card);
        });
    };

    renderCards();

    searchInput.addEventListener('input', (e) => {
        renderCards(e.target.value);
    });
});
