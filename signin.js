import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

console.log("signin.js loaded");

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB43JB9Av96sFP2QlPgvP8EnQe2xwGegvk",
  authDomain: "primlix.firebaseapp.com",
  projectId: "primlix",
  storageBucket: "primlix.firebasestorage.app",
  messagingSenderId: "328270714984",
  appId: "1:328270714984:web:5dfaab404549f695d643dd",
  measurementId: "G-XCBHEHQXZK",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function showMessage(msg, color = "red") {
  const messageElem = document.getElementById("message");
  messageElem.style.color = color;
  messageElem.innerText = msg;
}

function highlightInput(inputId, hasError = true) {
  const input = document.getElementById(inputId);
  if (hasError) {
    input.style.border = "2px solid red";
  } else {
    input.style.border = "2px solid var(--purple-400)";
  }
}

// Handle email/password signin
const signinForm = document.getElementById("signinForm");

signinForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  ["email", "password"].forEach((id) => highlightInput(id, false));
  showMessage("");

  if (email === "") {
    showMessage("Email cannot be empty.");
    highlightInput("email");
    return;
  }

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    showMessage("Please enter a valid email address.");
    highlightInput("email");
    return;
  }

  if (password === "") {
    showMessage("Password cannot be empty.");
    highlightInput("password");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      showMessage("Sign in successful! Redirecting...", "green");
      setTimeout(() => {
        window.location.href = "home.html";
      }, 1500);
    })
    .catch((error) => {
      let msg;
      if (error.code === "auth/user-not-found") {
        msg = "No account found with this email.";
        highlightInput("email");
      } else if (error.code === "auth/wrong-password") {
        msg = "Incorrect password.";
        highlightInput("password");
      } else if (error.code === "auth/invalid-email") {
        msg = "Invalid email format.";
        highlightInput("email");
      } else {
        msg = error.message;
      }
      showMessage(msg);
    });
});

// Handle Google signin
function socialSignIn(provider, successMsg) {
  showMessage("");
  signInWithPopup(auth, provider)
    .then(() => {
      showMessage(successMsg + " Redirecting...", "green");
      setTimeout(() => {
        window.location.href = "home.html";
      }, 1500);
    })
    .catch((error) => {
      if (error.code === "auth/popup-closed-by-user") {
        showMessage("Popup closed before completing sign-in.");
      } else if (error.code === "auth/cancelled-popup-request") {
        showMessage("Sign-in popup was cancelled.");
      } else {
        showMessage(error.message);
      }
    });
}

document.getElementById("googleSignin").addEventListener("click", () => {
  socialSignIn(new GoogleAuthProvider(), "Google sign in successful!");
});
