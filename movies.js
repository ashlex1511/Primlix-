import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  arrayUnion,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB43JB9Av96sFP2QlPgvP8EnQe2xwGegvk",
  authDomain: "primlix.firebaseapp.com",
  projectId: "primlix",
  storageBucket: "primlix.firebasestorage.app",
  messagingSenderId: "328270714984",
  appId: "1:328270714984:web:5dfaab404549f695d643dd",
  measurementId: "G-XCBHEHQXZK",
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const apiKey = "be10e1983750cb2f144861fc47e16cb7";
const tmdbBaseUrl = "https://api.themoviedb.org/3";

// Store current page for pagination
let currentPage = 1;
let totalPages = 1;
let totalResults = 0;

// NEW: Store the Choices.js instance
let genreChoices;

document.addEventListener("DOMContentLoaded", async () => {
  // --- Reusable Search Bar Logic ---
  const searchIcon = document.querySelector(".search-icon");
  const searchBar = document.querySelector(".search-bar");

  searchIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    searchBar.classList.toggle("active");
    if (searchBar.classList.contains("active")) {
      searchBar.focus();
    }
  });

  document.addEventListener("click", (e) => {
    if (!searchBar.contains(e.target) && !searchIcon.contains(e.target)) {
      searchBar.classList.remove("active");
    }
  });

  searchBar.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const query = searchBar.value.trim();
      if (query) {
        handleSearch(query);
      }
    }
  });
  // --- End Search Bar Logic ---

  // --- Profile Pic Logic ---
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const profilePic = document.getElementById("profile-pic");
      profilePic.src =
        user.photoURL || "https://www.w3schools.com/w3images/avatar2.png";
      profilePic.addEventListener("click", () => {
        window.location.href = "profile.html";
      });
    }
  });

  // --- Filter Logic ---
  // UPDATED: Wait for genres to populate *before* initializing Choices.js
  await populateGenreFilter();
  genreChoices = new Choices("#filter-genre", {
    removeItemButton: true, // Show 'x' on selected items
    placeholder: true,
    placeholderValue: "Search or select genres...",
    allowSearch: true, // Show search bar
    classNames: {
      containerOuter: "choices",
      // We use CSS to style from here
    },
  });

  const applyFiltersBtn = document.getElementById("apply-filters-btn");
  const clearFiltersBtn = document.getElementById("clear-filters-btn");

  applyFiltersBtn.addEventListener("click", () => {
    currentPage = 1; // Reset to page 1 for new filter
    discoverMovies();
  });

  // UPDATED: Clear button now clears the Choices.js instance
  clearFiltersBtn.addEventListener("click", () => {
    document.getElementById("filter-sort").value = "popularity.desc";

    // NEW: Clear Choices.js
    genreChoices.removeActiveItems();
    genreChoices.clearInput();

    document.getElementById("genre-mode").value = ","; // Reset to "All (AND)"
    document.getElementById("filter-year").value = "";
    document.getElementById("filter-provider").value = "";
    document.getElementById("filter-language").value = "";
    document.getElementById("filter-released").checked = false;
    document.getElementById("filter-unreleased").checked = false;

    currentPage = 1;
    discoverMovies();
  });

  // Toggle logic: prevent both from being checked
  const releasedToggle = document.getElementById("filter-released");
  const unreleasedToggle = document.getElementById("filter-unreleased");
  releasedToggle.addEventListener("change", () => {
    if (releasedToggle.checked) unreleasedToggle.checked = false;
  });
  unreleasedToggle.addEventListener("change", () => {
    if (unreleasedToggle.checked) releasedToggle.checked = false;
  });

  // --- Initial Load ---
  discoverMovies(); // Load default popular movies on page load
});

/**
 * Fetches genres from TMDB and populates the genre dropdown.
 * This now returns a Promise.
 */
async function populateGenreFilter() {
  const genreSelect = document.getElementById("filter-genre");
  const url = `${tmdbBaseUrl}/genre/movie/list?api_key=${apiKey}&language=en-US`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    data.genres.forEach((genre) => {
      const option = document.createElement("option");
      option.value = genre.id;
      option.textContent = genre.name;
      genreSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error fetching genres:", error);
  }
}

/**
 * Main function to fetch and display movies from the /discover endpoint.
 */
async function discoverMovies() {
  // --- UPDATED: Get genre values from Choices.js ---
  const genres = genreChoices.getValue(true); // Get values as an array (e.g., ['28', '12'])
  const genreMode = document.getElementById("genre-mode").value; // ',' for AND, '|' for OR

  const sort = document.getElementById("filter-sort").value;
  const yearRange = document.getElementById("filter-year").value;
  const provider = document.getElementById("filter-provider").value;
  const language = document.getElementById("filter-language").value;
  const released = document.getElementById("filter-released").checked;
  const unreleased = document.getElementById("filter-unreleased").checked;

  let discoverUrl = `${tmdbBaseUrl}/discover/movie?api_key=${apiKey}&language=en-US&page=${currentPage}`;
  discoverUrl += `&sort_by=${sort}`;

  // --- UPDATED: Build genre query string ---
  if (genres && genres.length > 0) {
    // TMDB uses comma for AND, pipe for OR
    discoverUrl += `&with_genres=${genres.join(genreMode)}`;
  }

  if (provider)
    discoverUrl += `&with_watch_providers=${provider}&watch_region=US`;
  if (language) discoverUrl += `&with_original_language=${language}`;

  if (yearRange) {
    const [startYear, endYear] = yearRange.split("-");
    discoverUrl += `&primary_release_date.gte=${startYear}-01-01&primary_release_date.lte=${endYear}-12-31`;
  }

  const today = new Date().toISOString().split("T")[0];
  if (released) {
    discoverUrl += `&primary_release_date.lte=${today}`;
  }
  if (unreleased) {
    discoverUrl += `&primary_release_date.gte=${today}`;
  }

  const grid = document.querySelector(".results-grid");

  // Clear grid ONLY if it's the first page
  if (currentPage === 1) {
    grid.innerHTML = "<p>Loading...</p>";
  }

  try {
    const response = await fetch(discoverUrl);
    const data = await response.json();

    totalPages = data.total_pages;
    totalResults = data.total_results;

    if (currentPage === 1) grid.innerHTML = ""; // Clear "Loading..."

    displayMovieGrid(data.results);
    updateResultsCount(data.page, data.results.length, totalResults);
    renderPagination(data.page, totalPages);
  } catch (error) {
    console.error("Error discovering movies:", error);
    grid.innerHTML =
      "<p>Error loading movies. Please try adjusting your filters.</p>";
  }
}

/**
 * Updates the "Showing X-Y of Z results" text.
 */
function updateResultsCount(page, resultsOnPage, total) {
  const countSpan = document.getElementById("results-count");
  if (total === 0) {
    countSpan.textContent = "Showing 0 results";
    return;
  }
  const start = (page - 1) * 20 + 1;
  const end = start + resultsOnPage - 1;
  countSpan.textContent = `Showing ${start} - ${end} of ${total.toLocaleString()} results`;
}

/**
 * Renders the pagination controls.
 */
function renderPagination(currentPage, totalPages) {
  const container = document.getElementById("pagination-controls");
  container.innerHTML = ""; // Clear old controls

  // Cap total pages at 500 as per TMDB API limits
  const maxPages = Math.min(totalPages, 500);

  if (maxPages === 0) return; // Don't show pagination if no results

  let startPage, endPage;
  if (maxPages <= 7) {
    // Show all pages if 7 or less
    startPage = 1;
    endPage = maxPages;
  } else {
    // Show 7 pages, with current in middle
    if (currentPage <= 4) {
      startPage = 1;
      endPage = 7;
    } else if (currentPage + 3 >= maxPages) {
      startPage = maxPages - 6;
      endPage = maxPages;
    } else {
      startPage = currentPage - 3;
      endPage = currentPage + 3;
    }
  }

  // "Previous" Button
  container.appendChild(
    createPageButton("<", currentPage - 1, "Previous", currentPage === 1)
  );

  // First page & dots
  if (startPage > 1) {
    container.appendChild(createPageButton(1, 1, "Page 1"));
    if (startPage > 2) {
      const dots = document.createElement("span");
      dots.className = "page-dots";
      dots.textContent = "...";
      container.appendChild(dots);
    }
  }

  // Page number buttons
  for (let i = startPage; i <= endPage; i++) {
    container.appendChild(
      createPageButton(i, i, `Page ${i}`, i === currentPage)
    );
  }

  // Last page & dots
  if (endPage < maxPages) {
    if (endPage < maxPages - 1) {
      const dots = document.createElement("span");
      dots.className = "page-dots";
      dots.textContent = "...";
      container.appendChild(dots);
    }
    container.appendChild(
      createPageButton(maxPages, maxPages, `Page ${maxPages}`)
    );
  }

  // "Next" Button
  container.appendChild(
    createPageButton(">", currentPage + 1, "Next", currentPage === maxPages)
  );
}

/**
 * Helper function to create a single pagination button.
 */
function createPageButton(
  text,
  page,
  ariaLabel,
  isDisabled = false,
  isActive = false
) {
  const button = document.createElement("button");
  button.className = "page-btn";
  button.textContent = text;
  button.setAttribute("aria-label", ariaLabel);
  button.disabled = isDisabled;
  if (isActive) {
    button.classList.add("active");
  }

  button.addEventListener("click", () => {
    if (currentPage === page) return; // Do nothing if clicking current page
    currentPage = page;
    discoverMovies();
    // Scroll to top of results
    document
      .querySelector(".results-container")
      .scrollIntoView({ behavior: "smooth" });
  });

  return button;
}

/**
 * Displays movies in the main results grid.
 * @param {Array} movies - An array of movie objects from TMDB.
 */
function displayMovieGrid(movies) {
  const grid = document.querySelector(".results-grid");

  if (movies.length === 0 && currentPage === 1) {
    grid.innerHTML = "<p>No movies found matching your criteria.</p>";
    return;
  }

  movies.forEach((movie) => {
    const movieCard = document.createElement("div");
    movieCard.className = "movie-card"; // Reuse home.css style
    movieCard.innerHTML = createMovieCard(movie); // Reuse home.js function

    // --- Add Event Listeners from home.js ---
    movieCard.querySelector(".btn-save").addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card click
      handleFirebaseAction("savedMovies", movie);
    });

    movieCard.querySelector(".btn-like").addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card click
      handleFirebaseAction("likedMovies", movie);
    });

    movieCard.querySelector(".btn-details").addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card click
      window.location.href = `movie_details.html?id=${movie.id}`;
    });

    grid.appendChild(movieCard);
  });
}

// --- REUSABLE FUNCTIONS (Copied from home.js) ---

/**
 * Searches for a movie on TMDB and redirects to its details page.
 */
async function handleSearch(query) {
  const searchUrl = `${tmdbBaseUrl}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
    query
  )}&language=en-US&page=1`;

  try {
    const response = await fetch(searchUrl);
    if (!response.ok) throw new Error("Search request failed.");

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const firstMovie = data.results[0]; // Get the top result
      window.location.href = `movie_details.html?id=${firstMovie.id}`;
    } else {
      alert(`No movies found matching "${query}".`);
    }
  } catch (error) {
    console.error("Error handling search:", error);
    alert("Search failed. Please try again.");
  }
}

/**
 * Creates the HTML for a single movie card.
 * (Copied from home.js)
 * @param {object} movie - The movie object from TMDB.
 * @returns {string} - The HTML string for the movie card.
 */
function createMovieCard(movie) {
  const poster = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "path/to/default-poster.jpg"; // Add a fallback image

  return `
      <img src="${poster}" alt="${movie.title}" class="movie-poster" />
      <div class="movie-overlay">
        <div class="movie-actions">
          <button class="btn-like">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span>Like</span>
          </button>
          <button class="btn-save">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            <span>Save</span>
          </button>
          <button class="btn-details">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
            <span>Details</span>
          </button>
        </div>
      </div>
    `;
}

/**
 * FIREBASE: Handles saving a "like" or "save" to Firestore.
 * (Copied from home.js)
 * @param {string} listName - The name of the array in Firestore (e.g., "likedMovies").
 * @param {object} movie - The movie object to save.
 */
async function handleFirebaseAction(listName, movie) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to save or like movies!");
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const movieData = {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
  };

  try {
    await setDoc(
      userDocRef,
      {
        [listName]: arrayUnion(movieData),
      },
      { merge: true }
    );

    const action = listName === "likedMovies" ? "Liked" : "Saved";
    alert(`${action} "${movie.title}"!`);
  } catch (error) {
    console.error(`Error saving to ${listName}:`, error);
    alert(`Failed to save ${movie.title}. Please try again.`);
  }
}
