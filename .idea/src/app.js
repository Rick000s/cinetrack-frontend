const API_URL = "http://localhost:8080/api/movies";

// Перемикання вкладок
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Завантажити всі фільми з Java Spring Boot
async function loadAllMovies() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Помилка сервера");
        const movies = await response.json();
        displayMovies(movies);
    } catch (error) {
        alert("Не вдалося підключитися до бекенду! Перевір, чи запущена Java в IntelliJ IDEA на порті 8080");
    }
}

// Завантажити рандомний фільм
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

// Виведення карток на екран
function displayMovies(movies) {
    const listDiv = document.getElementById("movies-list");
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