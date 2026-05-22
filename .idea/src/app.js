const API_URL = "http://localhost:8080/api/movies";
const USERS_API_URL = "http://localhost:8080/api/users";

let currentUserId = 2; // Поточний користувач (Олексій_Бекенд)

document.addEventListener("DOMContentLoaded", () => {
    loadAllMovies();
    loadCurrentUserProfile();
});

function switchTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    if (tabId === 'users-tab') {
        loadAllUsers();
    } else if (tabId === 'profile-tab') {
        loadCurrentUserProfile();
    } else if (tabId === 'admin-tab') {
        loadAdminPanel();
    }
}

// ==========================================
// ФІЛЬМИ
// ==========================================
async function loadAllMovies() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Помилка сервера");
        const movies = await response.json();
        displayMovies(movies);
    } catch (error) {
        console.error("Не вдалося підключитися до бекенду фільмів", error);
    }
}

async function loadRandomMovie() {
    try {
        const response = await fetch(`${API_URL}/random`);
        if (!response.ok) throw new Error("Помилка сервера");
        const movie = await response.json();
        displayMovies([movie]);
    } catch (error) {
        alert("Помилка при отриманні рандомного фільму");
    }
}

function displayMovies(movies) {
    const listDiv = document.getElementById("movies-list");
    if (!listDiv) return;
    listDiv.innerHTML = "";

    movies.forEach(movie => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <h3>${movie.title} (${movie.year})</h3>
            <p><strong>Жанр:</strong> ${movie.genre}</p>
            <p class="rating">⭐ ${movie.rating}/10</p>
            <p style="font-size: 14px; color: #bbb;">${movie.description}</p>
        `;
        listDiv.appendChild(card);
    });
}

function handleSearch() {
    const searchText = document.getElementById("movieSearchInput").value.toLowerCase();
    const movieCards = document.querySelectorAll("#movies-list .card");

    movieCards.forEach(card => {
        const title = card.querySelector("h3").innerText.toLowerCase();
        const fullContent = card.innerText.toLowerCase();

        if (title.includes(searchText) || fullContent.includes(searchText)) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

// ==========================================
// МЕНЮ ПРОФІЛЮ
// ==========================================
function toggleProfileMenu() {
    document.getElementById("profileDropdown").classList.toggle("show");
}

document.addEventListener('click', function (event) {
    const profileMenu = document.querySelector('.user-profile-menu');
    const dropdown = document.getElementById('profileDropdown');

    if (profileMenu && dropdown && !profileMenu.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

async function loadCurrentUserProfile() {
    try {
        const response = await fetch(`${USERS_API_URL}/${currentUserId}`);
        if (!response.ok) throw new Error("Користувача не знайдено");
        const user = await response.json();

        document.getElementById("current-username").innerText = user.username;
        document.getElementById("current-user-role").innerText = user.role === "ADMIN" ? "🛡️ Адміністратор" : "Користувач";

        const profileTab = document.getElementById("profile-tab");
        if (profileTab) {
            profileTab.innerHTML = `
                <div class="profile-card" style="background: #1f1f1f; padding: 25px; border-radius: 10px; max-width: 500px; margin-top: 20px; border: 1px solid #333;">
                    <h2>⚙️ Налаштування профілю (ID: #${user.id})</h2>
                    <p style="color: #888; margin-bottom: 20px;">Редагування профілю на Spring Boot сервері</p>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display:block; margin-bottom:5px;">Нікнейм:</label>
                        <input type="text" id="edit-username" value="${user.username}" style="width:100%; padding:10px; background:#333; color:white; border:1px solid #444; border-radius:5px;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display:block; margin-bottom:5px;">Email адреса:</label>
                        <input type="email" id="edit-email" value="${user.email}" style="width:100%; padding:10px; background:#333; color:white; border:1px solid #444; border-radius:5px;">
                    </div>
                    
                    <button class="btn btn-primary" onclick="saveUserProfile()">💾 Зберегти зміни</button>
                </div>
            `;
        }
    } catch (error) {
        console.error(error);
    }
}

async function saveUserProfile() {
    const updatedName = document.getElementById("edit-username").value;
    const updatedEmail = document.getElementById("edit-email").value;

    try {
        const response = await fetch(`${USERS_API_URL}/${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: updatedName, email: updatedEmail })
        });

        if (response.ok) {
            alert("Профіль успішно оновлено!");
            loadCurrentUserProfile();
        } else {
            alert("Помилка збереження даних!");
        }
    } catch (error) {
        console.error(error);
    }
}

function mockUserChange(role) {
    if (role === "ADMIN") {
        currentUserId = 1;
        document.getElementById("admin-menu-link").style.display = "block";
    } else {
        currentUserId = 2;
        document.getElementById("admin-menu-link").style.display = "none";
        if (document.getElementById("admin-tab").classList.contains("active")) {
            switchTab("movies-tab");
        }
    }
    loadCurrentUserProfile();
}

// ==========================================
// АДМІНКА
// ==========================================
async function loadAdminPanel() {
    const adminTab = document.getElementById("admin-tab");
    if (!adminTab) return;

    try {
        const response = await fetch(USERS_API_URL);
        const users = await response.json();

        adminTab.innerHTML = `
            <div style="display: flex; gap: 30px; flex-wrap: wrap; margin-top: 20px;">
                <div class="card" style="flex: 1; min-width: 300px; padding: 20px; background: #1a1a1a; border: 1px solid #333;">
                    <h3>🍿 Додати новий фільм каталог</h3>
                    <div style="margin-top:15px;">
                        <input type="text" id="new-title" placeholder="Назва фільму" style="width:100%; padding:10px; margin-bottom:10px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
                        <input type="text" id="new-genre" placeholder="Жанр" style="width:100%; padding:10px; margin-bottom:10px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
                        <input type="number" id="new-year" placeholder="Рік випуску" style="width:100%; padding:10px; margin-bottom:10px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
                        <input type="number" step="0.1" id="new-rating" placeholder="Рейтинг (напр. 8.5)" style="width:100%; padding:10px; margin-bottom:10px; background:#222; color:white; border:1px solid #444; border-radius:4px;">
                        <textarea id="new-desc" placeholder="Короткий опис..." style="width:100%; padding:10px; margin-bottom:15px; background:#222; color:white; border:1px solid #444; border-radius:4px; height:80px;"></textarea>
                        <button class="btn btn-primary" onclick="adminAddMovie()" style="width:100%;">🚀 Створити фільм</button>
                    </div>
                </div>

                <div class="card" style="flex: 1; min-width: 300px; padding: 20px; background: #1a1a1a; border: 1px solid #333;">
                    <h3>👥 Керування користувачами</h3>
                    <ul style="list-style:none; padding:0; margin-top:15px;">
                        ${users.map(u => `
                            <li style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom:1px solid #333;">
                                <span><strong>${u.username}</strong> (${u.role || 'USER'})</span>
                                ${u.id !== 1 ? `<button class="btn" style="background:#b80710; padding:5px 12px; font-size:12px;" onclick="adminDeleteUser(${u.id})">❌ Видалити</button>` : `<span style="color:#666; font-size:12px;">(Засновник)</span>`}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    } catch (error) {
        console.error(error);
    }
}

async function adminAddMovie() {
    const movieData = {
        title: document.getElementById("new-title").value,
        genre: document.getElementById("new-genre").value,
        year: parseInt(document.getElementById("new-year").value),
        rating: parseFloat(document.getElementById("new-rating").value),
        description: document.getElementById("new-desc").value
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movieData)
    });

    if (response.ok) {
        alert("Фільм успішно збережено в базі!");
        switchTab("movies-tab");
        loadAllMovies();
    }
}

async function adminDeleteUser(userId) {
    if (!confirm("Ви впевнені, що хочете видалити цього користувача?")) return;

    const response = await fetch(`${USERS_API_URL}/${userId}`, {
        method: 'DELETE'
    });

    if (response.ok) {
        alert("Користувача стерто з системи!");
        loadAdminPanel();
    }
}

// ==========================================
// СПІЛЬНОТА
// ==========================================
async function loadAllUsers() {
    try {
        const response = await fetch(USERS_API_URL);
        const users = await response.json();
        const listDiv = document.getElementById("users-list");
        if (!listDiv) return;
        listDiv.innerHTML = "";

        users.forEach(user => {
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <h3>👥 ${user.username}</h3>
                <p style="font-size: 14px; color: #bbb; margin-top: 8px;"><strong>Email:</strong> ${user.email}</p>
                <p style="font-size: 12px; color: #666; margin-top: 4px;">ID: #${user.id} | Група: ${user.role || 'USER'}</p>
            `;
            listDiv.appendChild(card);
        });
    } catch (error) { console.error(error); }
}