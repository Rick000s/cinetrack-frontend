const BASE_URL = "https://cinetrack-backend-kbq7.onrender.com";
const API_URL = `${BASE_URL}/api/movies`;
const USERS_API_URL = `${BASE_URL}/api/users`;
const AUTH_API_URL = `${BASE_URL}/api/auth`;
const COMMUNITY_API_URL = `${BASE_URL}/api/community`;

const roleLabels = {
    ADMIN: "Administrátor",
    MODERATOR: "Moderátor",
    USER: "Uživatel",
    GUEST: "Host"
};

let allMovies = [];
let allUsers = [];
let friends = [];
let activeTab = "movies-tab";
let authMode = "login";
let selectedFriendId = null;
let currentOpenedMovieId = null;
let currentUser = null;
let currentMockUser = "Host";
let currentUserRole = "GUEST";
let movieSearchTimer = null;
let userSearchTimer = null;

document.addEventListener("DOMContentLoaded", () => {
    restoreSession();
    loadMovieGenres();
    loadMovies();
    updateAuthUI();
});

// ====================== PROFIL / LOGIN ======================
function restoreSession() {
    try {
        const storedUser = localStorage.getItem("cinetrackUser");
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser), false);
        }
    } catch (e) {
        localStorage.removeItem("cinetrackUser");
        console.error(e);
    }
}

function setCurrentUser(user, persist = true) {
    currentUser = user;
    currentMockUser = user?.username || "Host";
    currentUserRole = user?.role || "GUEST";

    if (persist && user) {
        localStorage.setItem("cinetrackUser", JSON.stringify(user));
    }
}

function toggleProfileMenu() {
    document.getElementById("profileDropdown").classList.toggle("show");
}

document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("profileDropdown");
    const avatar = document.querySelector(".avatar-button");
    if (!dropdown || !avatar) return;

    if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove("show");
    }
});

function showAuthPanel(mode) {
    authMode = mode;
    const loginPanel = document.getElementById("loginPanel");
    const registerPanel = document.getElementById("registerPanel");
    const buttons = document.querySelectorAll(".auth-switch__btn");

    if (loginPanel) loginPanel.style.display = mode === "login" ? "flex" : "none";
    if (registerPanel) registerPanel.style.display = mode === "register" ? "flex" : "none";

    buttons.forEach(button => button.classList.remove("active"));
    const activeButton = mode === "login" ? buttons[0] : buttons[1];
    if (activeButton) activeButton.classList.add("active");
}

async function loginUser(event) {
    event.preventDefault();

    const loginInput = document.getElementById("loginInput");
    const passwordInput = document.getElementById("passwordInput");
    const error = document.getElementById("loginError");
    const login = loginInput.value.trim();
    const password = passwordInput.value.trim();

    error.innerText = "";
    if (!login || !password) {
        error.innerText = "Vyplňte jméno i heslo.";
        return;
    }

    try {
        const res = await fetch(`${AUTH_API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login, password })
        });

        if (!res.ok) {
            error.innerText = "Neplatné přihlašovací údaje.";
            return;
        }

        setCurrentUser(await res.json());
        passwordInput.value = "";
        document.getElementById("profileDropdown").classList.remove("show");
        updateAuthUI();

        if (activeTab === "community-tab") loadCommunity();
        if (activeTab === "users-tab") loadUsers();
    } catch (e) {
        console.error(e);
        error.innerText = "Přihlášení se nepodařilo.";
    }
}

async function registerUser(event) {
    event.preventDefault();

    const usernameInput = document.getElementById("registerNameInput");
    const emailInput = document.getElementById("registerEmailInput");
    const passwordInput = document.getElementById("registerPasswordInput");
    const error = document.getElementById("registerError");

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    error.innerText = "";
    if (!username || !email || !password) {
        error.innerText = "Vyplňte login, e-mail i heslo.";
        return;
    }

    try {
        const res = await fetch(`${AUTH_API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        if (!res.ok) {
            error.innerText = "Tento login nebo e-mail už existuje.";
            return;
        }

        setCurrentUser(await res.json());
        event.target.reset();
        document.getElementById("profileDropdown").classList.remove("show");
        updateAuthUI();

        if (activeTab === "community-tab") loadCommunity();
        if (activeTab === "users-tab") loadUsers();
    } catch (e) {
        console.error(e);
        error.innerText = "Registrace se nepodařila.";
    }
}

async function saveProfile(event) {
    event.preventDefault();

    if (!currentUser) {
        alert("Nejprve se přihlaste.");
        return;
    }

    const username = document.getElementById("profileNameInput").value.trim();
    const email = document.getElementById("profileEmailInput").value.trim();
    const password = document.getElementById("profilePasswordInput").value.trim();

    if (!username || !email) {
        alert("Jméno a e-mail nesmí být prázdné.");
        return;
    }

    const payload = { username, email };
    if (password) payload.password = password;

    try {
        const res = await fetch(`${USERS_API_URL}/${currentUser.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Profil se nepodařilo uložit");

        setCurrentUser(await res.json());
        document.getElementById("profilePasswordInput").value = "";
        updateAuthUI();

        if (activeTab === "community-tab") loadCommunity();
        if (activeTab === "users-tab") loadUsers();
    } catch (e) {
        console.error(e);
        alert("Profil se nepodařilo uložit.");
    }
}

function logoutUser() {
    localStorage.removeItem("cinetrackUser");
    currentUser = null;
    currentMockUser = "Host";
    currentUserRole = "GUEST";
    authMode = "login";
    selectedFriendId = null;
    friends = [];

    updateAuthUI();
    document.getElementById("profileDropdown").classList.remove("show");

    if (activeTab === "community-tab") renderCommunityLocked();
    if (activeTab === "users-tab") renderUsers(allUsers);
}

function updateAuthUI() {
    const isLoggedIn = Boolean(currentUser);
    const loginPanel = document.getElementById("loginPanel");
    const registerPanel = document.getElementById("registerPanel");
    const authSwitch = document.getElementById("authSwitch");
    const profilePanel = document.getElementById("profilePanel");
    const statusDot = document.querySelector(".user-status-dot");

    document.getElementById("current-username").innerText = currentMockUser;
    document.getElementById("current-user-role").innerText = roleLabels[currentUserRole] || "Host";

    if (authSwitch) authSwitch.style.display = isLoggedIn ? "none" : "grid";
    if (loginPanel) loginPanel.style.display = !isLoggedIn && authMode === "login" ? "flex" : "none";
    if (registerPanel) registerPanel.style.display = !isLoggedIn && authMode === "register" ? "flex" : "none";
    if (profilePanel) profilePanel.style.display = isLoggedIn ? "flex" : "none";
    if (statusDot) statusDot.classList.toggle("active", isLoggedIn);

    if (isLoggedIn) {
        document.getElementById("profileNameInput").value = currentUser.username || "";
        document.getElementById("profileEmailInput").value = currentUser.email || "";
    }

    updateAdminVisibility();
}

// ====================== TABY ======================
function switchTab(tabId, event) {
    activeTab = tabId;

    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(button => button.classList.remove("active"));

    document.getElementById(tabId).classList.add("active");
    if (event) event.currentTarget.classList.add("active");

    const title = document.getElementById("main-title");
    const movieFilterBar = document.getElementById("movieFilterBar");

    if (tabId === "movies-tab") {
        title.innerText = "Katalog Filmů";
        movieFilterBar.style.display = "flex";
        loadMovies();
    } else if (tabId === "favorites-tab") {
        title.innerText = "❤ Oblíbené";
        movieFilterBar.style.display = "flex";
        loadFavorites();
    } else if (tabId === "community-tab") {
        title.innerText = "Komunita";
        movieFilterBar.style.display = "none";
        loadCommunity();
    } else if (tabId === "users-tab") {
        title.innerText = "Správa uživatelů";
        movieFilterBar.style.display = "none";
        loadUsers();
    }
}

// ====================== FILMY ======================
function getMovieSearchQuery() {
    return document.getElementById("movieSearchInput")?.value.trim() || "";
}

function getMovieGenreFilter() {
    return document.getElementById("genreFilterSelect")?.value || "";
}

function getMovieSort() {
    return document.getElementById("movieSortSelect")?.value || "";
}

function buildUrl(url, query) {
    return buildUrlWithParams(url, { query });
}

function buildMovieUrl(url, query, genre = getMovieGenreFilter(), sort = getMovieSort()) {
    return buildUrlWithParams(url, { query, genre, sort });
}

function buildUrlWithParams(url, params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.set(key, value);
    });

    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
}

async function loadMovieGenres() {
    try {
        const res = await fetch(`${API_URL}/genres`);
        if (!res.ok) throw new Error("Zanry se nepodarilo nacist");

        const genres = await res.json();
        const select = document.getElementById("genreFilterSelect");
        if (!select) return;

        select.innerHTML = '<option value="">Vsechny zanry</option>';
        genres.forEach(genre => {
            const option = document.createElement("option");
            option.value = genre;
            option.innerText = genre;
            select.appendChild(option);
        });
    } catch (e) {
        console.error(e);
    }
}

async function loadMovies(query = getMovieSearchQuery()) {
    try {
        const res = await fetch(buildMovieUrl(API_URL, query));
        if (!res.ok) throw new Error("Nepodařilo se načíst filmy");

        allMovies = await res.json();
        renderMovies(allMovies, "movies-list");
    } catch (e) {
        console.error(e);
        showEmptyState("movies-list", "Filmy se nepodařilo načíst.");
    }
}

function handleSearch() {
    clearTimeout(movieSearchTimer);
    movieSearchTimer = setTimeout(() => {
        if (activeTab === "favorites-tab") {
            loadFavorites();
        } else {
            loadMovies();
        }
    }, 250);
}

function handleMovieFilterChange() {
    if (activeTab === "favorites-tab") {
        loadFavorites();
    } else {
        loadMovies();
    }
}

function resetMovieSearch() {
    const input = document.getElementById("movieSearchInput");
    if (input) input.value = "";

    const genreSelect = document.getElementById("genreFilterSelect");
    if (genreSelect) genreSelect.value = "";

    const sortSelect = document.getElementById("movieSortSelect");
    if (sortSelect) sortSelect.value = "";

    if (activeTab === "favorites-tab") {
        loadFavorites("");
    } else {
        loadMovies("");
    }
}

async function renderMovies(movies, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    if (movies.length === 0) {
        showEmptyState(containerId, "Žádné filmy nenalezeny...");
        return;
    }

    for (const movie of movies) {
        const card = document.createElement("div");
        card.className = "card";

        let isFav = false;
        try {
            const favRes = await fetch(`${API_URL}/${movie.id}/is-favorite`);
            isFav = (await favRes.json()).favorite;
        } catch (e) {
            console.error(e);
        }

        card.innerHTML = `
            <img src="${escapeAttribute(movie.posterUrl)}" class="movie-poster" alt="${escapeAttribute(movie.title)}">
            <div class="card-info">
                <div class="card-title">${escapeHtml(movie.title)}</div>
                <div class="card-genre">${escapeHtml(getMovieGenreLabel(movie))}</div>
                <div class="card-meta">
                    <span class="rating-badge">★ ${Number(movie.rating || 0).toFixed(1)}</span>
                    <button class="fav-heart ${isFav ? "active" : ""}" type="button" aria-label="Oblíbené">❤</button>
                </div>
            </div>
        `;

        card.querySelector(".movie-poster").onclick = () => openModal(movie.id);
        card.querySelector(".card-title").onclick = () => openModal(movie.id);
        card.querySelector(".fav-heart").onclick = (event) => toggleFav(movie.id, event);

        container.appendChild(card);
    }
}

async function toggleFav(movieId, event) {
    event.stopPropagation();
    try {
        await fetch(`${API_URL}/${movieId}/favorite`, { method: "POST" });

        if (activeTab === "favorites-tab") {
            loadFavorites();
        } else {
            loadMovies();
        }
    } catch (err) {
        console.error(err);
    }
}

// ====================== MODÁLNÍ OKNO ======================
async function openModal(id) {
    currentOpenedMovieId = id;
    try {
        const res = await fetch(`${API_URL}/${id}`);
        if (!res.ok) throw new Error("Film nebyl nalezen");

        const movie = await res.json();
        document.getElementById("modalTitle").innerText = movie.title;
        document.getElementById("modalPoster").src = movie.posterUrl;
        document.getElementById("modalPoster").alt = movie.title;
        document.getElementById("modalMeta").innerText = `${movie.year} • ★ ${Number(movie.rating || 0).toFixed(1)}`;
        document.getElementById("modalDescription").innerText = movie.description || "Popis není dostupný.";

        const oldBtn = document.getElementById("modalFavBtn");
        if (oldBtn) oldBtn.remove();

        let isFav = false;
        try {
            const favRes = await fetch(`${API_URL}/${id}/is-favorite`);
            isFav = (await favRes.json()).favorite;
        } catch (e) {
            console.error(e);
        }

        const favBtn = document.createElement("button");
        favBtn.id = "modalFavBtn";
        favBtn.className = "btn btn-secondary modal-favorite-btn";
        favBtn.innerHTML = isFav ? "❤ Odebrat z oblíbených" : "❤ Přidat do oblíbených";
        favBtn.onclick = async (event) => {
            await toggleFav(id, event);
            openModal(id);
        };

        document.getElementById("modalDescription").after(favBtn);

        const trailerButton = document.getElementById("watchTrailerBtn");
        trailerButton.disabled = !movie.trailerUrl;
        trailerButton.innerText = movie.trailerUrl ? "▶ Přehrát trailer" : "Trailer není dostupný";
        trailerButton.onclick = () => {
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

// ====================== KOMENTÁŘE ======================
async function loadComments(movieId) {
    try {
        const res = await fetch(`${API_URL}/${movieId}/comments`);
        if (!res.ok) throw new Error("Komentáře se nepodařilo načíst");

        const comments = await res.json();
        const box = document.getElementById("commentsSection");
        box.innerHTML = "";

        if (comments.length === 0) {
            box.innerHTML = "<p class='muted-text'>Zatím žádné komentáře...</p>";
            return;
        }

        comments.forEach(comment => {
            const div = document.createElement("div");
            div.className = "comment-item";

            const text = document.createElement("span");
            text.innerHTML = `<strong>${escapeHtml(comment.username)}:</strong> ${escapeHtml(comment.text)}`;
            div.appendChild(text);

            if (currentUserRole === "ADMIN" || currentUserRole === "MODERATOR") {
                const deleteButton = document.createElement("button");
                deleteButton.className = "icon-danger-btn";
                deleteButton.type = "button";
                deleteButton.innerText = "×";
                deleteButton.title = "Smazat komentář";
                deleteButton.onclick = () => deleteComment(comment.id);
                div.appendChild(deleteButton);
            }

            box.appendChild(div);
        });
    } catch (e) {
        console.error(e);
    }
}

async function deleteComment(commentId) {
    if (!confirm("Opravdu smazat komentář?")) return;
    try {
        await fetch(`${BASE_URL}/api/movies/comments/${commentId}`, { method: "DELETE" });
        loadComments(currentOpenedMovieId);
    } catch (e) {
        console.error(e);
        alert("Nepodařilo se smazat komentář");
    }
}

async function submitComment() {
    if (!currentUser) {
        alert("Pro komentování se nejprve přihlaste.");
        return;
    }

    const input = document.getElementById("newCommentInput");
    const text = input.value.trim();
    if (!text) return;

    try {
        await fetch(`${API_URL}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                movieId: currentOpenedMovieId,
                username: currentMockUser,
                text: text
            })
        });
        input.value = "";
        loadComments(currentOpenedMovieId);
    } catch (e) {
        console.error(e);
    }
}

// ====================== OBLÍBENÉ ======================
async function loadRandomMovie() {
    try {
        const res = await fetch(`${API_URL}/random`);
        if (!res.ok) throw new Error("Náhodný film není dostupný");
        openModal((await res.json()).id);
    } catch (e) {
        console.error(e);
    }
}

async function loadFavorites(query = getMovieSearchQuery()) {
    try {
        const res = await fetch(`${API_URL}/favorites`);
        if (!res.ok) throw new Error("Oblíbené se nepodařilo načíst");

        const favoritesList = await res.json();
        const normalizedQuery = query.toLowerCase();
        const selectedGenre = getMovieGenreFilter();
        const sort = getMovieSort();

        let filteredFavorites = favoritesList
            .filter(movie => !normalizedQuery || movieMatchesQuery(movie, normalizedQuery))
            .filter(movie => movieMatchesGenre(movie, selectedGenre));

        if (sort === "genre") {
            filteredFavorites = filteredFavorites.sort((a, b) =>
                getMovieGenreLabel(a).localeCompare(getMovieGenreLabel(b))
                || String(a.title || "").localeCompare(String(b.title || ""))
            );
        }

        renderMovies(filteredFavorites, "favorites-list");
    } catch (e) {
        console.error(e);
        showEmptyState("favorites-list", "Oblíbené filmy se nepodařilo načíst.");
    }
}

function movieMatchesQuery(movie, query) {
    return [movie.title, movie.genre, movie.description, movie.year, getMovieGenreLabel(movie)]
        .some(value => String(value || "").toLowerCase().includes(query));
}

function movieMatchesGenre(movie, selectedGenre) {
    if (!selectedGenre) return true;

    const genres = Array.isArray(movie.genres) && movie.genres.length > 0
        ? movie.genres
        : String(movie.genre || "").split(",");

    return genres.some(genre => genre.trim().toLowerCase() === selectedGenre.toLowerCase());
}

function getMovieGenreLabel(movie) {
    if (Array.isArray(movie.genres) && movie.genres.length > 0) {
        return movie.genres.join(", ");
    }

    return movie.genre || "";
}

// ====================== KOMUNITA ======================
async function loadCommunity() {
    if (!currentUser) {
        renderCommunityLocked();
        return;
    }

    document.getElementById("communityLocked").style.display = "none";
    document.getElementById("communityLayout").style.display = "grid";

    try {
        const res = await fetch(`${COMMUNITY_API_URL}/friends/${currentUser.id}`);
        if (!res.ok) throw new Error("Přátele se nepodařilo načíst");

        friends = await res.json();
        if (!selectedFriendId && friends.length > 0) {
            selectedFriendId = friends[0].id;
        }

        renderFriends();
        if (selectedFriendId) {
            loadCommunityMessages();
        } else {
            renderEmptyChat("Zatím nejsou dostupní žádní přátelé.");
        }
    } catch (e) {
        console.error(e);
        renderEmptyChat("Komunita se nepodařila načíst.");
    }
}

function renderCommunityLocked() {
    const locked = document.getElementById("communityLocked");
    const layout = document.getElementById("communityLayout");
    if (locked) locked.style.display = "block";
    if (layout) layout.style.display = "none";
}

function renderFriends() {
    const container = document.getElementById("friendsList");
    container.innerHTML = "";

    friends.forEach(friend => {
        const button = document.createElement("button");
        button.className = `friend-item ${friend.id === selectedFriendId ? "active" : ""}`;
        button.type = "button";
        button.innerHTML = `
            <span class="user-card__avatar small">${escapeHtml(getInitials(friend.username))}</span>
            <span>
                <strong>${escapeHtml(friend.username)}</strong>
                <small>${escapeHtml(roleLabels[friend.role] || friend.role)}</small>
            </span>
        `;
        button.onclick = () => selectFriend(friend.id);
        container.appendChild(button);
    });
}

function selectFriend(friendId) {
    selectedFriendId = friendId;
    renderFriends();
    loadCommunityMessages();
}

async function loadCommunityMessages() {
    const friend = friends.find(item => item.id === selectedFriendId);
    document.getElementById("chatFriendName").innerText = friend?.username || "Vyberte přítele";

    if (!currentUser || !selectedFriendId) {
        renderEmptyChat("Vyberte přítele.");
        return;
    }

    try {
        const res = await fetch(`${COMMUNITY_API_URL}/messages?userId=${currentUser.id}&friendId=${selectedFriendId}`);
        if (!res.ok) throw new Error("Zprávy se nepodařilo načíst");

        const messages = await res.json();
        renderCommunityMessages(messages);
    } catch (e) {
        console.error(e);
        renderEmptyChat("Zprávy se nepodařilo načíst.");
    }
}

function renderCommunityMessages(messages) {
    const container = document.getElementById("chatMessages");
    container.innerHTML = "";

    if (messages.length === 0) {
        renderEmptyChat("Začněte novou konverzaci.");
        return;
    }

    messages.forEach(message => {
        const item = document.createElement("div");
        item.className = `message-bubble ${message.senderId === currentUser.id ? "mine" : "theirs"}`;
        item.innerHTML = `
            <strong>${escapeHtml(message.senderName)}</strong>
            <p>${escapeHtml(message.text)}</p>
            <time>${escapeHtml(message.createdAt)}</time>
        `;
        container.appendChild(item);
    });

    container.scrollTop = container.scrollHeight;
}

function renderEmptyChat(message) {
    const container = document.getElementById("chatMessages");
    container.innerHTML = `<p class="empty-state">${escapeHtml(message)}</p>`;
}

async function sendCommunityMessage(event) {
    event.preventDefault();

    if (!currentUser) {
        alert("Pro chat se nejprve přihlaste.");
        return;
    }

    if (!selectedFriendId) {
        alert("Vyberte přítele.");
        return;
    }

    const input = document.getElementById("chatMessageInput");
    const text = input.value.trim();
    if (!text) return;

    try {
        const res = await fetch(`${COMMUNITY_API_URL}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                senderId: currentUser.id,
                receiverId: selectedFriendId,
                text
            })
        });

        if (!res.ok) throw new Error("Zprávu se nepodařilo odeslat");

        input.value = "";
        loadCommunityMessages();
    } catch (e) {
        console.error(e);
        alert("Zprávu se nepodařilo odeslat.");
    }
}

// ====================== UŽIVATELÉ / ADMIN ======================
function getUserSearchQuery() {
    return document.getElementById("userSearchInput")?.value.trim() || "";
}

function handleUserSearch() {
    clearTimeout(userSearchTimer);
    userSearchTimer = setTimeout(() => loadUsers(), 250);
}

function resetUserSearch() {
    const input = document.getElementById("userSearchInput");
    if (input) input.value = "";
    loadUsers("");
}

async function loadUsers(query = getUserSearchQuery()) {
    try {
        const res = await fetch(buildUrl(USERS_API_URL, query));
        if (!res.ok) throw new Error("Uživatele se nepodařilo načíst");

        allUsers = await res.json();
        renderUsers(allUsers);
    } catch (e) {
        console.error(e);
        showEmptyState("users-list", "Uživatele se nepodařilo načíst.");
    }
}

function renderUsers(users) {
    const container = document.getElementById("users-list");
    const canManageUsers = currentUserRole === "ADMIN";
    container.innerHTML = "";

    if (users.length === 0) {
        showEmptyState("users-list", "Žádní uživatelé nenalezeni...");
        return;
    }

    users.forEach(user => {
        const card = document.createElement("div");
        card.className = "user-card";
        card.innerHTML = `
            <div class="user-card__identity">
                <div class="user-card__avatar">${escapeHtml(getInitials(user.username))}</div>
                <div>
                    <h3>${escapeHtml(user.username)}</h3>
                    <p>${escapeHtml(user.email)}</p>
                </div>
            </div>
            <div class="user-card__actions">
                <select class="role-select" ${canManageUsers ? "" : "disabled"}>
                    ${renderRoleOptions(user.role)}
                </select>
                <button class="btn btn-danger" type="button" ${canManageUsers ? "" : "disabled"}>Smazat</button>
            </div>
        `;

        card.querySelector(".role-select").addEventListener("change", (event) => {
            updateUserRole(user.id, event.target.value);
        });
        card.querySelector(".btn-danger").addEventListener("click", () => deleteUser(user.id));

        container.appendChild(card);
    });
}

async function createUser(event) {
    event.preventDefault();

    if (currentUserRole !== "ADMIN") {
        alert("Pouze administrátor může přidávat uživatele.");
        return;
    }

    const usernameInput = document.getElementById("newUserNameInput");
    const emailInput = document.getElementById("newUserEmailInput");
    const passwordInput = document.getElementById("newUserPasswordInput");
    const roleSelect = document.getElementById("newUserRoleSelect");

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const role = roleSelect.value;

    if (!username || !email || !password) {
        alert("Vyplňte jméno, e-mail i heslo.");
        return;
    }

    try {
        const res = await fetch(USERS_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password, role })
        });
        if (!res.ok) throw new Error("Uživatele se nepodařilo přidat");

        event.target.reset();
        roleSelect.value = "USER";
        loadUsers();
    } catch (e) {
        console.error(e);
        alert("Uživatele se nepodařilo přidat.");
    }
}

async function updateUserRole(userId, role) {
    if (currentUserRole !== "ADMIN") return;

    try {
        const res = await fetch(`${USERS_API_URL}/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role })
        });
        if (!res.ok) throw new Error("Roli se nepodařilo změnit");

        if (currentUser?.id === userId) {
            setCurrentUser(await res.json());
            updateAuthUI();
        }
        loadUsers();
    } catch (e) {
        console.error(e);
        alert("Roli se nepodařilo změnit.");
        loadUsers();
    }
}

async function deleteUser(userId) {
    if (currentUserRole !== "ADMIN") return;
    if (!confirm("Opravdu smazat uživatele?")) return;

    try {
        const res = await fetch(`${USERS_API_URL}/${userId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Uživatele se nepodařilo smazat");

        if (currentUser?.id === userId) logoutUser();
        loadUsers();
    } catch (e) {
        console.error(e);
        alert("Uživatele se nepodařilo smazat.");
    }
}

function updateAdminVisibility() {
    const adminPanel = document.getElementById("adminCreateUserPanel");
    const hint = document.getElementById("adminAccessHint");
    if (!adminPanel || !hint) return;

    const canManageUsers = currentUserRole === "ADMIN";
    adminPanel.style.display = canManageUsers ? "grid" : "none";
    hint.style.display = canManageUsers ? "none" : "block";
}

function renderRoleOptions(selectedRole) {
    return Object.entries(roleLabels)
        .filter(([value]) => value !== "GUEST")
        .map(([value, label]) => `<option value="${value}" ${value === selectedRole ? "selected" : ""}>${label}</option>`)
        .join("");
}

function getInitials(name) {
    return String(name || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0].toUpperCase())
        .join("");
}

// ====================== VIDEO ======================
function openVideoModal(url) {
    document.getElementById("videoPlayer").src = url;
    document.getElementById("videoModal").style.display = "flex";
}

function closeVideoModal() {
    document.getElementById("videoModal").style.display = "none";
    document.getElementById("videoPlayer").src = "";
}

// ====================== HELPERS ======================
function showEmptyState(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<p class="empty-state">${escapeHtml(message)}</p>`;
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
}
