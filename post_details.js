import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
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

let currentUser = null;
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get("id");

// Add global event listener to close menus on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest(".options-menu")) {
    document
      .querySelectorAll(".options-dropdown.show")
      .forEach((menu) => menu.classList.remove("show"));
  }
});

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
      document.querySelector(".profile-pic").src =
        user.photoURL || "https://www.w3schools.com/w3images/avatar2.png";
    }
    if (postId) loadPostDetails(postId);
  });

  document
    .getElementById("submit-comment")
    .addEventListener("click", () => addComment(postId, null));
});

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

async function loadPostDetails(postId) {
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  if (postSnap.exists()) {
    const post = postSnap.data();
    const relativeTime = getRelativeTime(post.timestamp);
    const profilePic =
      post.authorPhotoURL || "https://www.w3schools.com/w3images/avatar2.png";
    const isLiked = currentUser && post.likes.includes(currentUser.uid);
    const isDisliked = currentUser && post.dislikes.includes(currentUser.uid);

    const movieLinkButton = post.movieId
      ? `
        <a href="movie_details.html?id=${post.movieId}" class="btn-movie-details">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
          <span>View Movie</span>
        </a>
      `
      : "";

    document.getElementById("post-content").innerHTML = `
      <div class="post-header">
        <div class="header-left">
          <img src="${profilePic}" alt="Profile" class="post-profile-pic" />
          <span class="post-author">${post.authorName}</span>
          <span class="post-dot">•</span>
          <span class="post-time">${relativeTime}</span>
        </div>
        <div class="options-menu">
          <button class="options-btn" title="Options">⋮</button>
          <div class="options-dropdown">
            <button class="save-btn">Save</button>
            <button class="hide-btn">Hide</button>
            <button class="report-btn">Report</button>
            ${
              currentUser && post.authorId === currentUser.uid
                ? '<button class="delete-btn">Delete</button>'
                : ""
            }
          </div>
        </div>
      </div>
      <h2>${post.title}</h2>
      <span class="post-category">${post.category}</span>
      <p class="full-content">${post.content}</p>
      
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
        ${movieLinkButton}
      </div>
    `;

    // Add event listeners for post actions
    document
      .querySelector(".like-btn")
      .addEventListener("click", () => toggleLike(postId, "likes", "posts"));
    document
      .querySelector(".dislike-btn")
      .addEventListener("click", () => toggleLike(postId, "dislikes", "posts"));
    document.querySelector(".comment-btn").addEventListener("click", () => {
      const form = document.getElementById("add-comment");
      form.style.display = form.style.display === "block" ? "none" : "block";
    });

    // Add event listeners for post options menu
    document.querySelector(".options-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleOptionsMenu(document.querySelector(".options-dropdown"));
    });
    document
      .querySelector(".save-btn")
      .addEventListener("click", () => saveItem(postId, "posts"));
    document
      .querySelector(".hide-btn")
      .addEventListener("click", () => hideItem(postId, "posts"));
    document
      .querySelector(".report-btn")
      .addEventListener("click", () => reportPost(postId, "posts"));
    if (currentUser && post.authorId === currentUser.uid) {
      document
        .querySelector(".delete-btn")
        .addEventListener("click", () => deleteItem(postId, "posts"));
    }

    loadComments(postId);
  }
}

async function loadComments(postId) {
  const commentsEl = document.getElementById("comments-list");
  commentsEl.innerHTML = "";
  const querySnapshot = await getDocs(
    collection(db, "posts", postId, "comments")
  );
  const comments = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Build a comment tree
  const commentMap = {};
  const rootComments = [];

  comments.forEach((comment) => {
    commentMap[comment.id] = { ...comment, replies: [] };
  });

  comments.forEach((comment) => {
    if (comment.parentId) {
      if (commentMap[comment.parentId]) {
        commentMap[comment.parentId].replies.push(commentMap[comment.id]);
      }
    } else {
      rootComments.push(commentMap[comment.id]);
    }
  });

  // Render root comments and their nested replies
  rootComments.forEach((comment) => {
    commentsEl.appendChild(createCommentElement(comment, postId, 0));
  });
}

function createCommentElement(comment, postId, depth) {
  const relativeTime = getRelativeTime(comment.timestamp);
  const profilePic =
    comment.authorPhotoURL || "https://www.w3schools.com/w3images/avatar2.png";
  const isLiked = currentUser && comment.likes.includes(currentUser.uid);
  const isDisliked = currentUser && comment.dislikes.includes(currentUser.uid);

  const commentEl = document.createElement("div");
  commentEl.className = `comment ${depth > 0 ? "nested" : ""}`;
  commentEl.setAttribute("data-comment-id", comment.id);
  commentEl.innerHTML = `
    <div class="comment-header">
      <div class="header-left">
        <img src="${profilePic}" alt="Profile" class="post-profile-pic" />
        <span class="comment-author">${comment.authorName}</span>
        <span class="comment-dot">•</span>
        <span class="comment-time">${relativeTime}</span>
      </div>
      <div class="options-menu">
        <button class="options-btn" title="Options">⋮</button>
        <div class="options-dropdown">
          <button class="save-btn">Save</button>
          <button class="hide-btn">Hide</button>
          <button class="report-btn">Report</button>
          ${
            currentUser && comment.authorId === currentUser.uid
              ? '<button class="delete-btn">Delete</button>'
              : ""
          }
        </div>
      </div>
    </div>
    <p class="comment-content">${comment.content}</p>
    <div class="comment-actions">
      <button class="like-btn ${isLiked ? "liked" : ""}" title="Like">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <span class="count">${comment.likes.length}</span>
      </button>
      <button class="dislike-btn ${
        isDisliked ? "disliked" : ""
      }" title="Dislike">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
        </svg>
        <span class="count">${comment.dislikes.length}</span>
      </button>
      <button class="reply-btn" title="Reply">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    </div>
  `;

  // Add event listeners for comment actions
  commentEl
    .querySelector(".like-btn")
    .addEventListener("click", () =>
      toggleLike(comment.id, "likes", `posts/${postId}/comments`)
    );
  commentEl
    .querySelector(".dislike-btn")
    .addEventListener("click", () =>
      toggleLike(comment.id, "dislikes", `posts/${postId}/comments`)
    );
  commentEl
    .querySelector(".reply-btn")
    .addEventListener("click", () => showCommentForm(postId, comment.id));

  // Add event listeners for comment options menu
  commentEl.querySelector(".options-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleOptionsMenu(commentEl.querySelector(".options-dropdown"));
  });
  commentEl
    .querySelector(".save-btn")
    .addEventListener("click", () =>
      saveItem(comment.id, `posts/${postId}/comments`)
    );
  commentEl
    .querySelector(".hide-btn")
    .addEventListener("click", () =>
      hideItem(comment.id, `posts/${postId}/comments`)
    );
  commentEl
    .querySelector(".report-btn")
    .addEventListener("click", () =>
      reportPost(comment.id, `posts/${postId}/comments`)
    );
  if (currentUser && comment.authorId === currentUser.uid) {
    commentEl
      .querySelector(".delete-btn")
      .addEventListener("click", () =>
        deleteItem(comment.id, `posts/${postId}/comments`)
      );
  }

  // Render replies recursively
  if (comment.replies && comment.replies.length > 0) {
    comment.replies.forEach((reply) => {
      commentEl.appendChild(createCommentElement(reply, postId, depth + 1));
    });
  }

  return commentEl;
}

async function addComment(postId, parentId) {
  if (!currentUser) return;
  const content = parentId
    ? document.querySelector(`#reply-text-${parentId}`).value
    : document.getElementById("comment-text").value;
  if (!content) return;

  await addDoc(collection(db, "posts", postId, "comments"), {
    content,
    authorId: currentUser.uid,
    authorName: currentUser.displayName || "Anonymous",
    authorPhotoURL:
      currentUser.photoURL || "https://www.w3schools.com/w3images/avatar2.png",
    timestamp: new Date(),
    likes: [],
    dislikes: [],
    parentId: parentId || null,
  });

  if (parentId) {
    document.querySelector(`#reply-form-${parentId}`).remove();
  } else {
    document.getElementById("comment-text").value = "";
    document.getElementById("add-comment").style.display = "none"; // Hide after submit
  }
  loadComments(postId);
}

function showCommentForm(postId, parentId) {
  if (!currentUser) return;

  const formId = parentId ? `reply-form-${parentId}` : "add-comment";
  const existingForm = document.getElementById(formId);
  if (existingForm) {
    existingForm.remove();
    return;
  }

  const form = document.createElement("div");
  form.id = formId;
  form.className = "comment-form";
  form.innerHTML = `
    <textarea id="${
      parentId ? `reply-text-${parentId}` : "comment-text"
    }" placeholder="Add a ${parentId ? "reply" : "comment"}..."></textarea>
    <button id="${
      parentId ? `submit-reply-${parentId}` : "submit-comment"
    }">Submit</button>
  `;

  if (parentId) {
    const parentComment = document.querySelector(
      `[data-comment-id="${parentId}"]`
    );
    parentComment.appendChild(form);
  } else {
    document.getElementById("comments-section").appendChild(form);
  }

  form
    .querySelector("button")
    .addEventListener("click", () => addComment(postId, parentId));
}

async function toggleLike(id, type, path) {
  if (!currentUser) return;
  const ref = doc(db, path, id);
  const opposite = type === "likes" ? "dislikes" : "likes";
  await updateDoc(ref, {
    [type]: arrayUnion(currentUser.uid),
    [opposite]: arrayRemove(currentUser.uid),
  });
  if (path.includes("posts/")) {
    loadPostDetails(postId); // Reload post
  } else {
    loadComments(postId); // Reload comments
  }
}

async function reportPost(id, path) {
  if (!currentUser) return;
  const ref = doc(db, path, id);
  await updateDoc(ref, { reports: arrayUnion(currentUser.uid) });
  alert("Reported.");
}

function toggleOptionsMenu(dropdown) {
  // Close other open menus
  document.querySelectorAll(".options-dropdown.show").forEach((menu) => {
    if (menu !== dropdown) menu.classList.remove("show");
  });
  dropdown.classList.toggle("show");
}

async function saveItem(id, path) {
  if (!currentUser) return;
  const userDocRef = doc(db, "users", currentUser.uid);
  const itemRef =
    path === "posts"
      ? doc(db, path, id)
      : doc(db, path.split("/")[0], path.split("/")[1], path.split("/")[2], id);
  const itemSnap = await getDoc(itemRef);
  if (itemSnap.exists()) {
    const itemData = {
      id,
      title:
        itemSnap.data().title ||
        itemSnap.data().content.substring(0, 50) + "...",
      type: path.includes("comments") ? "comment" : "post",
    };
    await updateDoc(
      userDocRef,
      { savedItems: arrayUnion(itemData) },
      { merge: true }
    );
    alert("Saved!");
  }
}

async function hideItem(id, path) {
  if (!currentUser) return;
  const userDocRef = doc(db, "users", currentUser.uid);
  await updateDoc(userDocRef, { hiddenItems: arrayUnion(id) }, { merge: true });
  alert("Hidden!");
  // Hide the element from the page
  const selector =
    path === "posts" ? `#post-content` : `[data-comment-id="${id}"]`;
  const element = document.querySelector(selector);
  if (element) element.style.display = "none";
}

async function deleteItem(id, path) {
  if (!currentUser) return;
  const itemRef =
    path === "posts"
      ? doc(db, path, id)
      : doc(db, path.split("/")[0], path.split("/")[1], path.split("/")[2], id);
  const itemSnap = await getDoc(itemRef);
  if (itemSnap.exists() && itemSnap.data().authorId === currentUser.uid) {
    await deleteDoc(itemRef);
    alert("Deleted!");
    location.reload(); // Reload to reflect changes
  } else {
    alert("You can only delete your own posts/comments.");
  }
}
