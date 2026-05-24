const BASE_URL = "http://localhost:8080";
const API_URL = `${BASE_URL}/api/movies`;
const USERS_API_URL = `${BASE_URL}/api/users`;

let allMovies = [];
let currentOpenedMovieId = null;
let currentMockUser = "A. Vývojář";
let currentUserRole = "ADMIN";

document.addEventListener("DOMContentLoaded", () => {
    loadMovies();
});

// ====================== ПРОФІЛЬ ======================
function toggleProfileMenu() {
    document.getElementById("profileDropdown").classList.toggle("show");
}

document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("profileDropdown");
    const avatar = document.querySelector(".avatar-button");
    if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove("show");
    }
});

function mockUserChange(role) {
    currentUserRole = role;
    const roleSpan = document.getElementById("current-user-role");

    if (role === 'ADMIN') {
        currentMockUser = "A. Vývojář";
        roleSpan.innerText = "Administrátor";
    } else if (role === 'MODERATOR') {
        currentMockUser = "Moderátor";
        roleSpan.innerText = "Moderátor";
    } else {
        currentMockUser = "Uživatel";
        roleSpan.innerText = "Uživatel";
    }
    document.getElementById("current-username").innerText = currentMockUser;
}

// ====================== ТАБИ ======================
function switchTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    if (event) event.currentTarget.classList.add('active');

    const title = document.getElementById("main-title");
    if (tabId === 'movies-tab') title.innerText = "Katalog Filmů";
    else if (tabId === 'favorites-tab') title.innerText = "❤️ Oblíbené";
    else if (tabId === 'users-tab') title.innerText = "👥 Uživatelé";
}

// ====================== ФІЛЬМИ ======================
async function loadMovies() {
    try {
        const res = await fetch(API_URL);
        allMovies = await res.json();
        renderMovies(allMovies, "movies-list");
    } catch (e) { console.error(e); }
}

async function renderMovies(movies, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    if (movies.length === 0) {
        container.innerHTML = "<p style='color:#aaa;padding:40px;text-align:center;'>Žádné filmy nenalezeny...</p>";
        return;
    }

    for (const movie of movies) {
        const card = document.createElement("div");
        card.className = "card";

        let isFav = false;
        try {
            const favRes = await fetch(`${API_URL}/${movie.id}/is-favorite`);
            isFav = (await favRes.json()).favorite;
        } catch (e) {}

        card.innerHTML = `
            <img src="${movie.posterUrl}" class="movie-poster">
            <div class="card-info">
                <div class="card-title">${movie.title}</div>
                <div class="card-meta">
                    <span class="rating-badge">⭐ ${movie.rating.toFixed(1)}</span>
                    <span class="fav-heart ${isFav ? 'active' : ''}" 
                          onclick="toggleFav(${movie.id}, '${containerId}', event)">❤️</span>
                </div>
            </div>
        `;

        card.querySelector('.movie-poster').onclick = () => openModal(movie.id);
        card.querySelector('.card-title').onclick = () => openModal(movie.id);

        container.appendChild(card);
    }
}

async function toggleFav(movieId, containerId, event) {
    event.stopPropagation();
    try {
        await fetch(`${API_URL}/${movieId}/favorite`, { method: 'POST' });

        // Оновлюємо обидві вкладки
        loadMovies();
        loadFavorites();
    } catch (err) {
        console.error(err);
    }
}

// ====================== МОДАЛКА ======================
async function openModal(id) {
    currentOpenedMovieId = id;
    try {
        const res = await fetch(`${API_URL}/${id}`);
        const movie = await res.json();

        document.getElementById("modalTitle").innerText = movie.title;
        document.getElementById("modalPoster").src = movie.posterUrl;
        document.getElementById("modalMeta").innerText = `${movie.year} • ⭐ ${movie.rating.toFixed(1)}`;
        document.getElementById("modalDescription").innerText = movie.description;

        // Видаляємо стару кнопку
        const oldBtn = document.getElementById("modalFavBtn");
        if (oldBtn) oldBtn.remove();

        let isFav = false;
        try {
            const favRes = await fetch(`${API_URL}/${id}/is-favorite`);
            isFav = (await favRes.json()).favorite;
        } catch (e) {}

        const favBtn = document.createElement("button");
        favBtn.id = "modalFavBtn";
        favBtn.className = "btn btn-secondary";
        favBtn.style.marginTop = "15px";
        favBtn.style.width = "100%";
        favBtn.innerHTML = isFav ? "❤️ Odebrat z oblíbených" : "❤️ Přidat do oblíbených";

        favBtn.onclick = () => {
            toggleFav(id, 'movies-tab', {stopPropagation: () => {}});
            setTimeout(() => openModal(id), 350);
        };

        document.getElementById("modalDescription").after(favBtn);

        document.getElementById("watchTrailerBtn").onclick = () => {
            if (movie.trailerUrl) openVideoModal(`https://www.youtube.com/embed/${movie.trailerUrl}`);
        };

        loadComments(id);
        document.getElementById("movieModal").style.display = "flex";
    } catch (e) {
        console.error(e);
    }
}

function closeModal() {
    document.getElementById("movieModal").style.display = "none";
}

// ====================== КОМЕНТАРІ ======================
async function loadComments(movieId) {
    try {
        const res = await fetch(`${API_URL}/${movieId}/comments`);
        const comments = await res.json();
        const box = document.getElementById("commentsSection");
        box.innerHTML = "";

        if (comments.length === 0) {
            box.innerHTML = "<p style='color:#666;'>Zatím žádné komentáře...</p>";
            return;
        }

        comments.forEach(c => {
            const div = document.createElement("div");
            div.className = "comment-item";
            div.innerHTML = `
                <strong>${c.username}:</strong> ${c.text}
                ${(currentUserRole === 'ADMIN' || currentUserRole === 'MODERATOR') ?
                `<button onclick="deleteComment(${c.id})" style="float:right;color:#e50914;background:none;border:none;cursor:pointer;">🗑</button>` : ''}
            `;
            box.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

async function deleteComment(commentId) {
    if (!confirm("Opravdu smazat komentář?")) return;
    try {
        await fetch(`${BASE_URL}/api/movies/comments/${commentId}`, { method: 'DELETE' });
        loadComments(currentOpenedMovieId);
    } catch (e) {
        console.error(e);
        alert("Nepodařilo se smazat komentář");
    }
}

async function submitComment() {
    const input = document.getElementById("newCommentInput");
    const text = input.value.trim();
    if (!text) return;

    try {
        await fetch(`${API_URL}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                movieId: currentOpenedMovieId,
                username: currentMockUser,
                text: text
            })
        });
        input.value = "";
        loadComments(currentOpenedMovieId);
    } catch (e) { console.error(e); }
}

// ====================== ІНШЕ ======================
async function loadRandomMovie() {
    try {
        const res = await fetch(`${API_URL}/random`);
        openModal((await res.json()).id);
    } catch (e) { console.error(e); }
}

async function loadFavorites() {
    try {
        const res = await fetch(`${API_URL}/favorites`);
        renderMovies(await res.json(), "favorites-list");
    } catch (e) { console.error(e); }
}

async function loadUsers() {
    try {
        const res = await fetch(USERS_API_URL);
        const users = await res.json();
        const container = document.getElementById("users-list");
        container.innerHTML = "";

        users.forEach(user => {
            const card = document.createElement("div");
            card.className = "card";
            card.style.padding = "20px";
            card.innerHTML = `
                <h3>👤 ${user.username}</h3>
                <p style="color:#aaa;margin:8px 0;">${user.email}</p>
                <span class="rating-badge">${user.role}</span>
            `;
            container.appendChild(card);
        });
    } catch (e) { console.error(e); }
}

function openVideoModal(url) {
    document.getElementById("videoPlayer").src = url;
    document.getElementById("videoModal").style.display = "flex";
}

function closeVideoModal() {
    document.getElementById("videoModal").style.display = "none";
    document.getElementById("videoPlayer").src = "";
}