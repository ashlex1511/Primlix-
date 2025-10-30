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
  updateDoc, // <-- ADDED
  arrayRemove, // <-- ADDED
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
const posterBaseUrl = "https://image.tmdb.org/t/p/w500";
const backdropBaseUrl = "https://image.tmdb.org/t/p/original";

// Store the fetched movie object to use with action buttons
let currentMovie;

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const movieId = urlParams.get("id");

  if (movieId) {
    fetchMovieDetails(movieId);
  } else {
    document.querySelector("main").innerHTML = "<h1>Movie ID not found.</h1>";
  }

  // Check auth state to update profile picture
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const profilePic = document.getElementById("profile-pic");
      // Use user's photoURL if available
      profilePic.src =
        user.photoURL || "https://www.w3schools.com/w3images/avatar2.png";
      // Add click listener to go to profile
      profilePic.addEventListener("click", () => {
        window.location.href = "profile.html";
      });
    }
  });

  // ===== SEARCH BAR LOGIC (from file) =====
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

  // --- Handle search on "Enter" key ---
  searchBar.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Stop default form submission
      const query = searchBar.value.trim();
      if (query) {
        handleSearch(query);
      }
    }
  });
});

// --- SEARCH FUNCTION ---
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

/**
 * Fetches all necessary movie details from TMDB using concurrent requests.
 *
 * @param {string} movieId - The ID of the movie to fetch.
 */
async function fetchMovieDetails(movieId) {
  const movieUrl = `${tmdbBaseUrl}/movie/${movieId}?api_key=${apiKey}&language=en-US`;
  const creditsUrl = `${tmdbBaseUrl}/movie/${movieId}/credits?api_key=${apiKey}&language=en-US`;
  const videosUrl = `${tmdbBaseUrl}/movie/${movieId}/videos?api_key=${apiKey}&language=en-US`;

  try {
    const [movieRes, creditsRes, videosRes] = await Promise.all([
      fetch(movieUrl),
      fetch(creditsUrl),
      fetch(videosUrl),
    ]);

    if (!movieRes.ok) throw new Error("Failed to fetch movie details.");

    const movie = await movieRes.json();
    const credits = await creditsRes.json();
    const videos = await videosRes.json();

    // Store the simplified movie object for Firebase
    currentMovie = {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
    };

    // Display all fetched data
    displayMainDetails(movie);
    displayCast(credits.cast);
    setupScrolling(".cast-grid", ".cast-left-arrow", ".cast-right-arrow"); // Added for cast scrolling
    displayTrailer(videos.results);

    // Call the Flask recommendation logic from home.js
    fetchAndDisplayRecommendations(movie.id, movie.title);

    setupActionButtons();
  } catch (error) {
    console.error("Error fetching movie details:", error);
    document.querySelector("main").innerHTML = "<h1>Failed to load movie.</h1>";
  }
}

/**
 * Populates the hero section with main movie details.
 *
 * @param {object} movie - The movie object from TMDB.
 */
function displayMainDetails(movie) {
  // Backdrop
  document.getElementById(
    "movie-backdrop"
  ).style.backgroundImage = `url(${backdropBaseUrl}${movie.backdrop_path})`;

  // Poster
  document.getElementById(
    "movie-poster"
  ).src = `${posterBaseUrl}${movie.poster_path}`;

  // Text Info
  document.getElementById("movie-title").textContent = movie.title;
  document.getElementById("movie-tagline").textContent = movie.tagline;
  document.getElementById("movie-overview").textContent = movie.overview;
  document.getElementById("movie-release-date").textContent = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "N/A";
  document.getElementById("movie-runtime").textContent = formatRuntime(
    movie.runtime
  );
  document.getElementById("movie-genres").textContent = formatGenres(
    movie.genres
  );
}

/**
 * Populates the cast grid.
 *
 * @param {Array} cast - The cast array from the /credits endpoint.
 */
function displayCast(cast) {
  const grid = document.querySelector(".cast-grid");
  grid.innerHTML = ""; // Clear
  const topCast = cast.slice(0, 10); // Show top 10 actors

  topCast.forEach((actor) => {
    const poster = actor.profile_path
      ? `${posterBaseUrl}${actor.profile_path}`
      : "https://via.placeholder.com/150x225?text=No+Image";

    grid.innerHTML += `
      <div class="cast-card">
        <img src="${poster}" alt="${actor.name}" />
        <p class="cast-name">${actor.name}</p>
        <p class="cast-char">${actor.character}</p>
      </div>
    `;
  });
}

/**
 * Finds and embeds the official YouTube trailer.
 *
 * @param {Array} videos - The videos array from the /videos endpoint.
 */
function displayTrailer(videos) {
  const container = document.getElementById("trailer-container");
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    videos.find((v) => v.site === "YouTube"); // Fallback to any video

  if (trailer) {
    container.innerHTML = `
      <iframe 
        src="https://www.youtube.com/embed/${trailer.key}" 
        title="Official Trailer" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    `;
  } else {
    container.innerHTML = "<p>No official trailer found.</p>";
  }
}

/**
 * --- UPDATED ---
 * Sets up click listeners for all hero action buttons.
 *
 */
function setupActionButtons() {
  document
    .getElementById("btn-watchlist")
    .addEventListener("click", () =>
      handleFirebaseAction("savedMovies", currentMovie)
    );

  // --- USE NEW FUNCTION ---
  document
    .getElementById("btn-like")
    .addEventListener("click", () => handleLikeMovie(currentMovie));

  // --- USE NEW FUNCTION ---
  document
    .getElementById("btn-dislike")
    .addEventListener("click", () => handleDislikeMovie(currentMovie));

  document
    .getElementById("btn-watched")
    .addEventListener("click", () =>
      handleFirebaseAction("watchedMovies", currentMovie)
    );
  document
    .getElementById("btn-watching")
    .addEventListener("click", () =>
      handleFirebaseAction("currentlyWatchingMovies", currentMovie)
    );
}

// --- REUSABLE FUNCTIONS (COPIED *EXACTLY* FROM home.js) ---

/**
 * Creates the HTML for a single movie card.
 * (Copied from home.js)
 *
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
 * REUSABLE: Populates any movie grid and sets up its button actions.
 * (Copied from home.js)
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
    // Pass the *listName* to the generic handler
    movieCard.querySelector(".btn-save").addEventListener("click", () => {
      handleFirebaseAction("savedMovies", movie);
    });

    // Pass the *movie object* to the specific handler
    movieCard.querySelector(".btn-like").addEventListener("click", () => {
      handleLikeMovie(movie); // Use specific handler
    });

    // FIREBASE: Like functionality
    movieCard.querySelector(".btn-details").addEventListener("click", () => {
      window.location.href = `movie_details.html?id=${movie.id}`;
    });

    grid.appendChild(movieCard);
  });
}

/**
 * REUSABLE: Sets up left/right arrow scrolling for any grid.
 * (Copied from home.js)
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
 * REUSABLE: Handles saving a *non-conflicting* action to Firestore (Watchlist, Watched, etc.).
 *
 * @param {string} listName - The name of the array in Firestore (e.g., "watchedMovies").
 * @param {object} movie - The movie object to save.
 */
async function handleFirebaseAction(listName, movie) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to manage your lists!");
    return;
  }

  // This reference points to the user's document
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

    // Updated alert logic
    let action = "Added to list";
    switch (listName) {
      case "savedMovies":
        action = "Added to Watchlist";
        break;
      case "watchedMovies":
        action = "Added to Watched";
        break;
      case "currentlyWatchingMovies":
        action = "Set as Currently Watching";
        break;
    }
    alert(`${action} "${movie.title}"!`);
  } catch (error) {
    console.error(`Error saving to ${listName}:`, error);
    alert(`Failed to save ${movie.title}. Please try again.`);
  }
}

// --- NEW SPECIALIZED FUNCTION ---
/**
 * Handles the "Like" action, adding to 'likedMovies' and removing from 'dislikedMovies'.
 * @param {object} movie - The movie object to like.
 */
async function handleLikeMovie(movie) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to like movies!");
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const movieData = {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
  };

  try {
    // Use updateDoc to perform both actions at once
    await updateDoc(userDocRef, {
      likedMovies: arrayUnion(movieData), // Add to 'liked'
      dislikedMovies: arrayRemove(movieData), // Remove from 'disliked'
    });
    alert(`Liked "${movie.title}"!`);
  } catch (error) {
    console.error("Error liking movie:", error);
    // If updateDoc fails (e.g., doc doesn't exist), use setDoc with merge
    try {
      await setDoc(
        userDocRef,
        {
          likedMovies: arrayUnion(movieData),
          dislikedMovies: arrayRemove(movieData),
        },
        { merge: true }
      );
      alert(`Liked "${movie.title}"!`);
    } catch (e) {
      console.error("Error liking movie with setDoc:", e);
      alert(`Failed to like "${movie.title}". Please try again.`);
    }
  }
}

// --- NEW SPECIALIZED FUNCTION ---
/**
 * Handles the "Dislike" action, adding to 'dislikedMovies' and removing from 'likedMovies'.
 * @param {object} movie - The movie object to dislike.
 */
async function handleDislikeMovie(movie) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to dislike movies!");
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const movieData = {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
  };

  try {
    // Use updateDoc to perform both actions at once
    await updateDoc(userDocRef, {
      dislikedMovies: arrayUnion(movieData), // Add to 'disliked'
      likedMovies: arrayRemove(movieData), // Remove from 'liked'
    });
    alert(`Disliked "${movie.title}"!`);
  } catch (error) {
    console.error("Error disliking movie:", error);
    // If updateDoc fails (e.g., doc doesn't exist), use setDoc with merge
    try {
      await setDoc(
        userDocRef,
        {
          dislikedMovies: arrayUnion(movieData),
          likedMovies: arrayRemove(movieData),
        },
        { merge: true }
      );
      alert(`Disliked "${movie.title}"!`);
    } catch (e) {
      console.error("Error disliking movie with setDoc:", e);
      alert(`Failed to dislike "${movie.title}". Please try again.`);
    }
  }
}

/**
 * Fetches recommendations from our OWN Flask server.
 * (Copied from home.js and *ADAPTED* for movie_details.html)
 *
 * @param {number} movieId - The TMDB ID of the movie.
 * @param {string} movieTitle - The title of the movie.
 */
async function fetchAndDisplayRecommendations(movieId, movieTitle) {
  console.log(`Fetching recommendations for: ${movieTitle}`);

  // Target the elements from movie_details.html
  const recSection = document.querySelector(".similar-movies");
  const recTitle = document.getElementById("similar-title");
  const recGrid = document.querySelector(".similar-grid");

  try {
    // --- 1. Call our Flask API ---
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
      recGrid.innerHTML = "<p>No recommendations found.</p>";
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
          return searchData.results[0];
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

    // --- 3. Display the results ---
    if (recommendedMovies.length > 0) {
      recTitle.textContent = `Similar to ${movieTitle}`; // Set correct title

      // Use our existing functions with the correct selectors for this page
      displayMovieRow(recommendedMovies, ".similar-grid");
      setupScrolling(
        ".similar-grid",
        ".similar-left-arrow",
        ".similar-right-arrow"
      );

      recSection.style.display = "block"; // Ensure section is visible
    } else {
      console.log("No TMDB details found for recommended titles.");
      recGrid.innerHTML = "<p>Could not load recommendations.</p>";
    }
  } catch (error) {
    console.error("Error in fetchAndDisplayRecommendations:", error);
    recGrid.innerHTML = "<p>Error loading recommendations.</p>";
  }
}

// --- HELPER FUNCTIONS ---

/**
 * Formats runtime from minutes to "Xh Ym".
 *
 * @param {number} minutes - The runtime in minutes.
 * @returns {string} - The formatted string.
 */
function formatRuntime(minutes) {
  if (!minutes) return "N/A";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Joins an array of genre objects into a single string.
 *
 * @param {Array} genres - Array of genre objects (e.g., [{id: 1, name: "Action"}]).
 * @returns {string} - A comma-separated string of genre names.
 */
function formatGenres(genres) {
  if (!genres || genres.length === 0) return "N/A";
  return genres.map((g) => g.name).join(", ");
}
