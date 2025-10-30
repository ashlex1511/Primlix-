import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// --- Firebase Storage imports removed ---

const firebaseConfig = {
  apiKey: "AIzaSyB43JB9Av96sFP2QlPgvP8EnQe2xwGegvk",
  authDomain: "primlix.firebaseapp.com",
  projectId: "primlix",
  storageBucket: "primlix.firebasestorage.app",
  messagingSenderId: "328270714984",
  appId: "1:328270714984:web:5dfaab404549f695d643dd",
  measurementId: "G-XCBHEHQXZK",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// --- storage initialization removed ---

// --- ADDED Global Constants ---
const apiKey = "be10e1983750cb2f144861fc47e16cb7";
const tmdbBaseUrl = "https://api.themoviedb.org/3";
// --- END ADDED ---

document.addEventListener("DOMContentLoaded", () => {
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
  // --- END NEW ---

  // ===== CHECK AUTH STATE =====
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadUserProfile(user);
    } else {
      alert("You must be logged in to view your profile.");
      window.location.href = "signin.html"; // Redirect if not logged in
    }
  });

  // ===== ACCOUNT MANAGEMENT BUTTONS (EXISTING SECTION) =====
  const changePasswordBtn = document.getElementById("change-password-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const deleteAccountBtn = document.getElementById("delete-account-btn");

  changePasswordBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await sendPasswordResetEmail(auth, user.email);
      alert("Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Error sending password reset:", error);
      alert("Failed to send reset email. Try again.");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      alert("Logged out successfully!");
      window.location.href = "signin.html"; // Redirect to sign-in page
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Failed to log out.");
    }
  });

  deleteAccountBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    const confirmDelete = confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    if (!confirmDelete) return;

    // Prompt for password to re-authenticate
    const password = prompt("Enter your password to confirm deletion:");
    if (!password) return;

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Delete user data from Firestore
      const userDocRef = doc(db, "users", user.uid);
      await deleteDoc(userDocRef);

      // Delete the user account
      await deleteUser(user);
      alert("Account deleted successfully!");
      window.location.href = "signin.html"; // Redirect to sign-in
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account. Check your password and try again.");
    }
  });
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
 * Creates the HTML for a single movie card (updated to include Remove button).
 *
 * @param {object} movie - The movie object from Firestore.
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
          <button class="btn-details">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
            <span>Details</span>
          </button>
          <button class="btn-remove">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2,2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            <span>Remove</span>
          </button>
        </div>
      </div>
    `;
}

/**
 * REUSABLE: Populates any movie grid and sets up its button actions (updated for remove functionality).
 *
 * @param {Array} movies - The array of movie objects.
 * @param {string} gridSelector - The CSS selector for the grid (e.g., ".saved-grid").
 * @param {string} listType - "saved", "liked", "watching", "watched", or "disliked"
 */
function displayMovieRow(movies, gridSelector, listType) {
  const grid = document.querySelector(gridSelector);
  if (!grid) {
    console.error(`Grid element not found: ${gridSelector}`);
    return;
  }
  grid.innerHTML = ""; // Clear existing

  if (movies.length === 0) {
    grid.innerHTML = "<p>No movies in this list yet.</p>";
    return;
  }

  movies.forEach((movie) => {
    const movieCard = document.createElement("div");
    movieCard.className = "movie-card";
    movieCard.innerHTML = createMovieCard(movie);

    // Details button
    movieCard.querySelector(".btn-details").addEventListener("click", () => {
      window.location.href = `movie_details.html?id=${movie.id}`;
    });

    // Remove button
    movieCard
      .querySelector(".btn-remove")
      .addEventListener("click", async () => {
        await handleRemoveMovie(movie, listType);
        // Reload the user's profile to update the grid
        const user = auth.currentUser;
        if (user) {
          loadUserProfile(user);
        }
      });

    grid.appendChild(movieCard);
  });
}

/**
 * Handles removing a movie from a user's list in Firestore.
 *
 * @param {object} movie - The movie object to remove.
 * @param {string} listType - "saved", "liked", "watching", "watched", or "disliked".
 */
async function handleRemoveMovie(movie, listType) {
  const user = auth.currentUser;
  if (!user) {
    alert("Please log in to manage your lists!");
    return;
  }

  // --- UPDATED listNameMap ---
  const listNameMap = {
    saved: "savedMovies",
    liked: "likedMovies",
    watching: "currentlyWatchingMovies",
    watched: "watchedMovies",
    disliked: "dislikedMovies", // <-- ADDED
  };
  // --- END UPDATE ---

  const listName = listNameMap[listType];
  if (!listName) {
    console.error(`Invalid listType: ${listType}`);
    return;
  }

  const userDocRef = doc(db, "users", user.uid);

  try {
    await updateDoc(userDocRef, {
      [listName]: arrayRemove(movie),
    });
    alert(`"${movie.title}" removed from your ${listType} list!`);
  } catch (error) {
    console.error(`Error removing from ${listName}:`, error);
    alert(`Failed to remove "${movie.title}". Please try again.`);
  }
}

/**
 * REUSABLE: Sets up left/right arrow scrolling for any grid (reuse from home.js).
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
      grid.scrollLeft >= grid.scrollWidth - grid.clientWidth - 1;
  }

  grid.addEventListener("scroll", updateArrows);
  updateArrows();
}

/**
 * Fetches and displays user profile info and lists (updated for profile pic).
 *
 * @param {object} user - The Firebase user object.
 */
async function loadUserProfile(user) {
  // Display basic info
  document.getElementById("username").textContent =
    user.displayName || "Not set";
  document.getElementById("email").textContent = user.email;
  document.getElementById("join-date").textContent = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString()
    : "Unknown";

  // Display profile pic: Use Google photoURL if available, else default
  const profilePic = document.getElementById("profile-pic");
  // The photoURL is updated after a successful upload
  profilePic.src =
    user.photoURL || "https://www.w3schools.com/w3images/avatar2.png";

  const profilePic1 = document.getElementById("profile-pic1");
  // The photoURL is updated after a successful upload
  profilePic1.src =
    user.photoURL || "https://www.w3schools.com/w3images/avatar2.png";

  // Fetch saved and liked movies from Firestore
  const userDocRef = doc(db, "users", user.uid);
  try {
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();

      // Saved (Watchlist)
      displayMovieRow(data.savedMovies || [], ".saved-grid", "saved");
      setupScrolling(".saved-grid", ".saved-left-arrow", ".saved-right-arrow");

      // Liked
      displayMovieRow(data.likedMovies || [], ".liked-grid", "liked");
      setupScrolling(".liked-grid", ".liked-left-arrow", ".liked-right-arrow");

      // Currently Watching
      displayMovieRow(
        data.currentlyWatchingMovies || [],
        ".watching-grid",
        "watching"
      );
      setupScrolling(
        ".watching-grid",
        ".watching-left-arrow",
        ".watching-right-arrow"
      );

      // Watched
      displayMovieRow(data.watchedMovies || [], ".watched-grid", "watched");
      setupScrolling(
        ".watched-grid",
        ".watched-left-arrow",
        ".watched-right-arrow"
      );

      // --- NEW ---
      // Disliked
      displayMovieRow(data.dislikedMovies || [], ".disliked-grid", "disliked");
      setupScrolling(
        ".disliked-grid",
        ".disliked-left-arrow",
        ".disliked-right-arrow"
      );
      // --- END NEW ---

      // --- NEW CHART LOGIC ---
      // Get the data for the chart
      const chartData = {
        labels: ["Watchlist", "Watching", "Watched", "Liked", "Disliked"],
        values: [
          (data.savedMovies || []).length,
          (data.currentlyWatchingMovies || []).length,
          (data.watchedMovies || []).length,
          (data.likedMovies || []).length,
          (data.dislikedMovies || []).length,
        ],
      };

      // Render the chart
      renderActivityChart(chartData);
      // --- END NEW CHART LOGIC ---
    } else {
      console.log("No user document found.");
      // Clear all grids
      displayMovieRow([], ".saved-grid", "saved");
      displayMovieRow([], ".liked-grid", "liked");
      displayMovieRow([], ".watching-grid", "watching");
      displayMovieRow([], ".watched-grid", "watched");
      displayMovieRow([], ".disliked-grid", "disliked"); // <-- ADDED
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    alert("Failed to load profile data.");
  }
}

/**
 * NEW: Renders the user activity bar chart.
 * @param {object} chartData - An object with {labels: [], values: []}
 */
function renderActivityChart(chartData) {
  const ctx = document.getElementById("activityChart").getContext("2d");

  // Clear previous chart if it exists (prevents bugs on data reload)
  if (window.myActivityChart) {
    window.myActivityChart.destroy();
  }

  window.myActivityChart = new Chart(ctx, {
    type: "bar", // You can also try 'pie' or 'doughnut'
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: "Total Movies",
          data: chartData.values,
          backgroundColor: [
            "rgba(168, 85, 247, 0.6)", // Purple (Watchlist)
            "rgba(59, 130, 246, 0.6)", // Blue (Watching)
            "rgba(34, 197, 94, 0.6)", // Green (Watched)
            "rgba(234, 179, 8, 0.6)", // Yellow (Liked)
            "rgba(239, 68, 68, 0.6)", // Red (Disliked)
          ],
          borderColor: [
            "rgba(168, 85, 247, 1)",
            "rgba(59, 130, 246, 1)",
            "rgba(34, 197, 94, 1)",
            "rgba(234, 179, 8, 1)",
            "rgba(239, 68, 68, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Allows chart to fill the container height
      plugins: {
        legend: {
          display: false, // Hide legend for a cleaner look
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "#e5e7eb", // Light text for ticks
            stepSize: 1, // Show integer steps (1, 2, 3...)
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)", // Light grid lines
          },
        },
        x: {
          ticks: {
            color: "#e5e7eb", // Light text for labels
          },
          grid: {
            display: false, // Hide vertical grid lines
          },
        },
      },
    },
  });
}
