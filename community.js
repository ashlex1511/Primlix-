import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  orderBy,
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const apiKey = "be10e1983750cb2f144861fc47e16cb7"; // TMDB API key

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      document.getElementById("create-post-section").style.display = "block";
      document.querySelector(".profile-pic").src =
        user.photoURL || "https://www.w3schools.com/w3images/avatar2.png";
    } else {
      document.getElementById("create-post-section").style.display = "none";
      alert("Please log in to participate in the community.");
    }
    loadPosts();
  });

  // Search posts
  document.querySelector(".search-bar").addEventListener("input", (e) => {
    filterPosts(e.target.value);
  });

  // Filters
  document
    .getElementById("filter-category")
    .addEventListener("change", loadPosts);
  document.getElementById("filter-movie").addEventListener("input", loadPosts);

  // Create post
  document
    .getElementById("create-post-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUser) return;

      const title = document.getElementById("post-title").value;
      const category = document.getElementById("post-category").value;
      const content = document.getElementById("post-content").value;
      const movieQuery = document.getElementById("movie-search").value;

      let movieData = {};
      if (movieQuery) {
        const response = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
            movieQuery
          )}&page=1`
        );
        const data = await response.json();
        if (data.results.length > 0) {
          const movie = data.results[0];
          movieData = {
            movieId: movie.id,
            movieTitle: movie.title,
            posterPath: movie.poster_path,
          };
        }
      }

      await addDoc(collection(db, "posts"), {
        title,
        content,
        category,
        ...movieData,
        authorId: currentUser.uid,
        authorPhotoURL:
          currentUser.photoURL ||
          "https://www.w3schools.com/w3images/avatar2.png",
        authorName: currentUser.displayName || "Anonymous",
        timestamp: new Date(),
        likes: [],
        dislikes: [],
        reports: [],
      });

      document.getElementById("create-post-form").reset();
      loadPosts();
    });
});

async function loadPosts() {
  const postsList = document.getElementById("posts-list");
  postsList.innerHTML = "";

  let q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  const categoryFilter = document.getElementById("filter-category").value;
  const movieFilter = document
    .getElementById("filter-movie")
    .value.toLowerCase();

  if (categoryFilter) q = query(q, where("category", "==", categoryFilter));

  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((docSnap) => {
    const post = { id: docSnap.id, ...docSnap.data() };
    if (movieFilter && !post.movieTitle?.toLowerCase().includes(movieFilter))
      return;

    const postEl = createPostElement(post);
    postsList.appendChild(postEl);
  });
}

function createPostElement(post) {
  const isLiked = currentUser && post.likes.includes(currentUser.uid);
  const isDisliked = currentUser && post.dislikes.includes(currentUser.uid);
  const relativeTime = getRelativeTime(post.timestamp);
  const profilePic =
    post.authorPhotoURL || "https://www.w3schools.com/w3images/avatar2.png"; // Assuming you store photoURL in post data; if not, fetch from auth

  const postEl = document.createElement("div");
  postEl.className = "post";
  postEl.innerHTML = `
    <div class="post-clickable" data-post-id="${post.id}">
      <div class="post-header">
        <img src="${profilePic}" alt="Profile" class="post-profile-pic" />
        <span class="post-author">${post.authorName}</span>
        <span class="post-dot">•</span>
        <span class="post-time">${relativeTime}</span>
      </div>
      <h3 class="post-title">${post.title}</h3>
      <span class="post-category">${post.category}</span>
      <p class="post-content">${post.content}</p>
    </div>
    <div class="post-actions">
      <button class="like-btn ${isLiked ? "liked" : ""}" title="Like">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <span class="count">${post.likes.length}</span>
      </button>
      <button class="dislike-btn ${
        isDisliked ? "disliked" : ""
      }" title="Dislike">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
        </svg>
        <span class="count">${post.dislikes.length}</span>
      </button>
      <button class="comment-btn" title="Comment">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    </div>
  `;

  // Make the post clickable (navigate to details page)
  postEl.querySelector(".post-clickable").addEventListener("click", (e) => {
    if (!e.target.closest(".post-actions")) {
      // Avoid triggering if clicking buttons
      window.location.href = `post_details.html?id=${post.id}`;
    }
  });

  // Event listeners for buttons (unchanged)
  postEl
    .querySelector(".like-btn")
    .addEventListener("click", () => toggleLike(post.id, "likes"));
  postEl
    .querySelector(".dislike-btn")
    .addEventListener("click", () => toggleLike(post.id, "dislikes"));
  postEl
    .querySelector(".comment-btn")
    .addEventListener("click", () => showCommentForm(post.id, postEl));

  return postEl;
}

function getRelativeTime(timestamp) {
  const now = new Date();
  const diffMs = now - timestamp.toDate();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

async function toggleLike(postId, type) {
  if (!currentUser) return;
  const postRef = doc(db, "posts", postId);
  const opposite = type === "likes" ? "dislikes" : "likes";
  await updateDoc(postRef, {
    [type]: arrayUnion(currentUser.uid),
    [opposite]: arrayRemove(currentUser.uid),
  });
  loadPosts();
}

async function showCommentForm(postId, postEl) {
  if (!currentUser) return;
  const form = document.createElement("div");
  form.className = "comment-form";
  form.innerHTML = `<textarea placeholder="Add a comment..."></textarea><button>Submit</button>`;
  postEl.appendChild(form);

  form.querySelector("button").addEventListener("click", async () => {
    const content = form.querySelector("textarea").value;
    if (!content) return;
    await addDoc(collection(db, "posts", postId, "comments"), {
      content,
      authorId: currentUser.uid,
      authorPhotoURL:
        currentUser.photoURL ||
        "https://www.w3schools.com/w3images/avatar2.png",
      authorName: currentUser.displayName || "Anonymous",
      timestamp: new Date(),
      likes: [],
      dislikes: [],
    });
    form.remove();
    loadComments(postId, postEl.querySelector(".comments"));
  });
}

async function loadComments(postId, commentsEl) {
  commentsEl.innerHTML = "";
  const querySnapshot = await getDocs(
    collection(db, "posts", postId, "comments")
  );
  querySnapshot.forEach((docSnap) => {
    const comment = docSnap.data();
    const commentEl = document.createElement("div");
    commentEl.className = "comment";
    commentEl.innerHTML = `<p><strong>${comment.authorName}:</strong> ${comment.content}</p>`;
    commentsEl.appendChild(commentEl);
  });
}

async function reportPost(postId) {
  if (!currentUser) return;
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, { reports: arrayUnion(currentUser.uid) });
  alert("Post reported.");
}

function filterPosts(searchTerm) {
  // Simple client-side filter; reload for server-side if needed
  loadPosts();
}
