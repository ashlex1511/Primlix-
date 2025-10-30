import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
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
const tmdbBaseUrl = "https://api.themoviedb.org/3"; // Added for search

document.addEventListener("DOMContentLoaded", () => {
  // ===== SEARCH BAR LOGIC =====
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

  // --- NEW: Handle search on "Enter" key ---
  searchBar.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Stop default form submission
      const query = searchBar.value.trim();
      if (query) {
        handleSearch(query);
      }
    }
  });
  // --- END NEW ---

  // --- 1. Check for a logged-in user ---
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is logged in, NOW we can fetch their recommendations
      console.log("User logged in:", user.uid);
      fetchPersonalizedRecommendations(user.uid);
      fetchPersonalizedFeed(user.uid);

      // --- NEW: Update profile pic in header ---
      const profilePic = document.querySelector(".profile-pic");
      if (profilePic) {
        profilePic.src =
          user.photoURL || "https://www.w3schools.com/w3images/avatar2.png";
      }
    } else {
      // User is signed out, do nothing
      console.log("User is not logged in.");
      // The recommendations section will correctly stay hidden
    }
  });

  // --- 2. Load all movie sections ---
  fetchLatestMovies();
  fetchTopRatedMovies();
  fetchGenres();
  fetchPopularMovies();
  displayStudios();
});

// --- NEW SEARCH FUNCTION ---
/**
 * Searches for a movie on TMDB and redirects to its details page.
 * @param {string} query - The user's search term.
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
      // Redirect to the movie details page with the ID
      window.location.href = `movie_details.html?id=${firstMovie.id}`;
    } else {
      alert(`No movies found matching "${query}".`);
    }
  } catch (error) {
    console.error("Error handling search:", error);
    alert("Search failed. Please try again.");
  }
}
// --- END NEW SEARCH FUNCTION ---

/**
 * Creates the HTML for a single movie card.
 *
 * @param {object} movie - The movie object from TMDB.
 * @returns {string} - The HTML string for the movie card.
 */
function createMovieCard(movie) {
  const poster = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "path/to/default-poster.jpg"; // Add a fallback image

  // Note: I'm using simple, common SVG paths for the icons.
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
 * REUSABLE: Populates any movie grid and sets up its button actions.
 *
 * @param {Array} movies - The array of movie objects.
 * @param {string} gridSelector - The CSS selector for the grid (e.g., ".movies-grid").
 */
function displayMovieRow(movies, gridSelector) {
  const grid = document.querySelector(gridSelector);
  if (!grid) {
    console.error(`Grid element not found: ${gridSelector}`);
    return;
  }
  grid.innerHTML = ""; // Clear existing

  movies.forEach((movie) => {
    const movieCard = document.createElement("div");
    movieCard.className = "movie-card";
    movieCard.innerHTML = createMovieCard(movie);

    // --- Add Event Listeners ---
    movieCard.querySelector(".btn-save").addEventListener("click", () => {
      handleFirebaseAction("savedMovies", movie);
    });

    // FIREBASE: Save functionality
    movieCard.querySelector(".btn-like").addEventListener("click", () => {
      handleFirebaseAction("likedMovies", movie);
    });

    // FIREBASE: Like functionality
    movieCard.querySelector(".btn-details").addEventListener("click", () => {
      // This will take the user to a new page.
      window.location.href = `movie_details.html?id=${movie.id}`;
    });

    grid.appendChild(movieCard);
  });
}

/**
 * REUSABLE: Sets up left/right arrow scrolling for any grid.
 *
 * @param {string} gridSelector - The CSS selector for the grid.
 * @param {string} leftArrowSelector - The CSS selector for the left arrow.
 * @param {string} rightArrowSelector - The CSS selector for the right arrow.
 */
function setupScrolling(gridSelector, leftArrowSelector, rightArrowSelector) {
  const grid = document.querySelector(gridSelector);
  const leftArrow = document.querySelector(leftArrowSelector);
  const rightArrow = document.querySelector(rightArrowSelector);

  if (!grid || !leftArrow || !rightArrow) {
    console.warn(`Scrolling elements not found for: ${gridSelector}`);
    return;
  }

  leftArrow.addEventListener("click", () => {
    grid.scrollBy({ left: -200, behavior: "smooth" });
  });

  rightArrow.addEventListener("click", () => {
    grid.scrollBy({ left: 200, behavior: "smooth" });
  });

  // Disable arrows at start/end
  function updateArrows() {
    leftArrow.disabled = grid.scrollLeft <= 0;
    rightArrow.disabled =
      grid.scrollLeft >= grid.scrollWidth - grid.clientWidth - 1; // -1 for precision
  }

  grid.addEventListener("scroll", updateArrows);
  updateArrows();
}

/**
 * FIREBASE: Handles saving a "like" or "save" to Firestore.
 *
 * @param {string} listName - The name of the array in Firestore (e.g., "likedMovies").
 * @param {object} movie - The movie object to save.
 */
async function handleFirebaseAction(listName, movie) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to save or like movies!");
    return;
  }

  // This reference points to the user's document
  const userDocRef = doc(db, "users", user.uid);
  const movieData = {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path, // Save poster for "My List" page
  };

  try {
    // Use setDoc with { merge: true } to create or update the document
    // Use arrayUnion to add the movie to the array only if it's not already there
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

async function fetchLatestMovies() {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&language=en-US&page=1`
    );
    const data = await response.json();
    displayMovieRow(data.results, ".movies-grid");
    setupScrolling(".movies-grid", ".left-arrow", ".right-arrow");
  } catch (error) {
    console.error("Error fetching movies:", error);
    document.querySelector(".movies-grid").innerHTML =
      "<p>Failed to load latest movies.</p>";
  }
}

async function fetchTopRatedMovies() {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/top_rated?api_key=${apiKey}&language=en-US&page=1`
    );
    const data = await response.json();
    displayMovieRow(data.results, ".top-rated-grid");
    setupScrolling(".top-rated-grid", ".top-left-arrow", ".top-right-arrow");
  } catch (error) {
    console.error("Error fetching top rated movies:", error);
    document.querySelector(".top-rated-grid").innerHTML =
      "<p>Failed to load top rated movies.</p>";
  }
}

// --- FETCH POPULAR MOVIES ---
async function fetchPopularMovies() {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=en-US&page=1`
    );
    const data = await response.json();
    displayMovieRow(data.results, ".popular-grid");
    setupScrolling(".popular-grid", ".pop-left-arrow", ".pop-right-arrow");
  } catch (error) {
    console.error("Error fetching popular movies:", error);
    document.querySelector(".popular-grid").innerHTML =
      "<p>Failed to load popular movies.</p>";
  }
}

// --- FETCH GENRES ---
async function fetchGenres() {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=en-US`
    );
    const data = await response.json();
    displayGenres(data.genres); // Use its custom display function
    setupScrolling(".genres-grid", ".genre-left-arrow", ".genre-right-arrow"); // But use the reusable scrolling
  } catch (error) {
    console.error("Error fetching genres:", error);
    document.querySelector(".genres-grid").innerHTML =
      "<p>Failed to load genres.</p>";
  }
}

function displayGenres(genres) {
  const genresGrid = document.querySelector(".genres-grid");
  genresGrid.innerHTML = ""; // clear existing

  const popularGenreIDs = [
    28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878,
    10770, 53, 10752, 37,
  ];
  const filteredGenres = genres.filter((genre) =>
    popularGenreIDs.includes(genre.id)
  );

  filteredGenres.forEach((genre) => {
    const genreCard = document.createElement("div");
    genreCard.className = "genre-card";
    genreCard.textContent = genre.name;

    genreCard.addEventListener("click", () => {
      window.location.href = `movies.html?genre=${genre.id}`;
    });

    genresGrid.appendChild(genreCard);
  });
}

/**
 * Fetches the user's liked movies from Firestore.
 *
 * @param {string} userId - The user's Firebase Auth UID.
 */
async function fetchPersonalizedRecommendations(userId) {
  const userDocRef = doc(db, "users", userId);

  try {
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data().likedMovies?.length > 0) {
      // User has liked movies, let's get recommendations
      const likedMovies = userDoc.data().likedMovies;

      // Pick one movie to base recommendations on (e.g., the last one they liked)
      const randomIndex = Math.floor(Math.random() * likedMovies.length);
      const randomLikedMovie = likedMovies[randomIndex];

      // Now, fetch and display recommendations for this movie
      await fetchAndDisplayRecommendations(
        randomLikedMovie.id,
        randomLikedMovie.title
      );
    } else {
      // No liked movies, so we don't show the section
      console.log("User has no liked movies yet.");
    }
  } catch (error) {
    console.error("Error fetching user document:", error);
  }
}

/**
 * NEW: Fetches recommendations from our OWN Flask server.
 *
 * @param {number} movieId - The TMDB ID of the movie (we'll ignore this for now).
 * @param {string} movieTitle - The title of the movie.
 */
async function fetchAndDisplayRecommendations(movieId, movieTitle) {
  console.log(`Fetching recommendations for: ${movieTitle}`);
  try {
    // --- 1. Call our Flask API ---
    // Note: 'encodeURIComponent' safely formats titles like "Demon Slayer: ..." for a URL
    const flaskResponse = await fetch(
      `http://127.0.0.1:5000/recommend?movie=${encodeURIComponent(movieTitle)}`
    );

    if (!flaskResponse.ok) {
      throw new Error("Failed to fetch from Flask server.");
    }

    const data = await flaskResponse.json();
    const recommendedTitles = data.recommendations;

    if (!recommendedTitles || recommendedTitles.length === 0) {
      console.log(`No recommendations found from Flask for ${movieTitle}`);
      return;
    }

    // --- 2. Get TMDB details for each recommended title ---
    const moviePromises = recommendedTitles.map(async (title) => {
      try {
        const searchResponse = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
            title
          )}&page=1`
        );
        const searchData = await searchResponse.json();
        if (searchData.results && searchData.results.length > 0) {
          // Return the first and most likely match
          return searchData.results[0];
        }
        return null; // No match found
      } catch (error) {
        console.error(`Error searching for title ${title}:`, error);
        return null;
      }
    });

    // Wait for all the TMDB searches to complete
    const recommendedMovies = (await Promise.all(moviePromises)).filter(
      (movie) => movie !== null
    ); // Filter out any nulls

    // --- 3. Display the results ---
    if (recommendedMovies.length > 0) {
      const recSection = document.getElementById("recommendations-section");
      const recTitle = document.getElementById("recommendations-title");

      recTitle.textContent = `Because You Liked ${movieTitle}`;

      // Use our existing functions to display and set up scrolling
      displayMovieRow(recommendedMovies, ".rec-grid");
      setupScrolling(".rec-grid", ".left-arrow", ".right-arrow"); // Note: Selects the arrows in the rec section

      recSection.style.display = "block";
    } else {
      console.log("No TMDB details found for recommended titles.");
    }
  } catch (error) {
    console.error("Error in fetchAndDisplayRecommendations:", error);
  }
}

/**
 * NEW: Fetches movies for the "You Might Also Like" section
 * by sending the user's *entire* taste profile to our Flask server.
 * @param {string} userId - The user's Firebase Auth UID.
 */
async function fetchPersonalizedFeed(userId) {
  const userDocRef = doc(db, "users", userId);
  try {
    const userDoc = await getDoc(userDocRef);

    // 1. Get all 5 lists from the user's Firestore document
    if (!userDoc.exists()) {
      console.log("No user data to build a personalized feed.");
      return;
    }

    const userData = userDoc.data();

    // Helper function to get titles from a movie list
    const getTitles = (list) => (list || []).map((movie) => movie.title);

    // Get all 5 lists of titles
    const bodyData = {
      liked_titles: getTitles(userData.likedMovies),
      disliked_titles: getTitles(userData.dislikedMovies),
      watched_titles: getTitles(userData.watchedMovies),
      watching_titles: getTitles(userData.currentlyWatchingMovies),
      watchlist_titles: getTitles(userData.savedMovies), // 'savedMovies' is the Watchlist
    };

    // 2. Call our NEW Flask endpoint with this data
    const flaskResponse = await fetch(`http://127.0.0.1:5000/get-feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyData),
    });

    if (!flaskResponse.ok) {
      throw new Error("Failed to fetch from Flask /get-feed");
    }

    const data = await flaskResponse.json();
    const recommendedTitles = data.recommendations;

    if (!recommendedTitles || recommendedTitles.length === 0) {
      console.log("Flask returned no feed recommendations.");
      return;
    }

    // 3. Get TMDB details for each recommended title
    // This function (fetchAndDisplayFeed) is almost identical to the "double-fetch"
    // in fetchAndDisplayRecommendations, just with different selectors.
    await fetchAndDisplayFeed(recommendedTitles);
  } catch (error) {
    console.error("Error fetching personalized feed:", error);
  }
}

/**
 * NEW: Helper function to get TMDB details for the feed and display them.
 * @param {Array<string>} recommendedTitles - A list of movie titles from our Flask API.
 */
async function fetchAndDisplayFeed(recommendedTitles) {
  try {
    const moviePromises = recommendedTitles.map(async (title) => {
      try {
        const searchResponse = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
            title
          )}&page=1`
        );
        const searchData = await searchResponse.json();
        if (searchData.results && searchData.results.length > 0) {
          return searchData.results[0]; // Return the first match
        }
        return null;
      } catch (error) {
        console.error(`Error searching for title ${title}:`, error);
        return null;
      }
    });

    const recommendedMovies = (await Promise.all(moviePromises)).filter(
      (movie) => movie !== null
    );

    // 4. Display the Section
    if (recommendedMovies.length > 0) {
      const feedSection = document.getElementById("personalized-feed-section");
      const feedTitle = document.getElementById("personalized-feed-title");

      feedTitle.textContent = "Based On Your Preferences"; // Set the title

      // Use the new, unique classes for this section
      displayMovieRow(recommendedMovies, ".feed-grid");
      setupScrolling(".feed-grid", ".feed-left-arrow", ".feed-right-arrow");

      feedSection.style.display = "block";
    }
  } catch (error) {
    console.error("Error fetching and displaying feed:", error);
  }
}

function displayStudios() {
  const studiosGrid = document.querySelector(".studios-grid");
  studiosGrid.innerHTML = ""; // clear existing

  // Hardcoded list of popular studios (TMDB company IDs and names)
  const studios = [
    { id: 420, name: "Marvel Studios" },
    { id: 2, name: "Walt Disney Pictures" },
    { id: 3, name: "Pixar" },
    { id: 10342, name: "Studio Ghibli" },
    { id: 5, name: "Columbia Pictures" },
    { id: 174, name: "Warner Bros. Pictures" },
    { id: 25, name: "20th Century Studios" },
    { id: 4, name: "Paramount Pictures" },
    { id: 33, name: "Universal Pictures" },
    { id: 7, name: "DreamWorks Animation" },
    // Add more as needed
  ];

  studios.forEach((studio) => {
    const studioCard = document.createElement("div");
    studioCard.className = "studio-card";
    studioCard.textContent = studio.name;

    // Click to navigate to movies page with studio filter
    studioCard.addEventListener("click", () => {
      window.location.href = `movies.html?studio=${studio.id}`;
    });

    studiosGrid.appendChild(studioCard);
  });

  // Add arrow scrolling functionality for studios section
  const leftArrow = document.querySelector(".studio-left-arrow");
  const rightArrow = document.querySelector(".studio-right-arrow");

  leftArrow.addEventListener("click", () => {
    studiosGrid.scrollBy({ left: -200, behavior: "smooth" }); // Scroll left by ~1 card width + gap
  });

  rightArrow.addEventListener("click", () => {
    studiosGrid.scrollBy({ left: 200, behavior: "smooth" }); // Scroll right by ~1 card width + gap
  });

  // Optional: Disable arrows at start/end for better UX
  function updateArrows() {
    leftArrow.disabled = studiosGrid.scrollLeft <= 0;
    rightArrow.disabled =
      studiosGrid.scrollLeft >=
      studiosGrid.scrollWidth - studiosGrid.clientWidth;
  }

  studiosGrid.addEventListener("scroll", updateArrows);
  updateArrows(); // Initial check
}
