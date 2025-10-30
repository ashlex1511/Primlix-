import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

console.log("signup.js loaded");

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
    input.style.border = "1px solid #ccc";
  }
}

// Handle email/password signup
const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const fullName = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  ["name", "email", "password", "confirmPassword"].forEach((id) =>
    highlightInput(id, false)
  );
  showMessage("");

  if (fullName === "") {
    showMessage("Full name cannot be empty.");
    highlightInput("name");
    return;
  }

  const emailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailPattern.test(email)) {
    showMessage("Please enter a valid Gmail address.");
    highlightInput("email");
    return;
  }

  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!passwordPattern.test(password)) {
    showMessage(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
    );
    highlightInput("password");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match.");
    highlightInput("confirmPassword");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      return updateProfile(userCredential.user, { displayName: fullName });
    })
    .then(() => {
      showMessage("Signup successful! Redirecting...", "green");
      setTimeout(() => {
        window.location.href = "home.html";
      }, 1500);
    })
    .catch((error) => {
      let msg;
      if (error.code === "auth/email-already-in-use") {
        msg = "This email is already registered.";
        highlightInput("email");
      } else if (error.code === "auth/invalid-email") {
        msg = "Invalid email format.";
        highlightInput("email");
      } else if (error.code === "auth/weak-password") {
        msg = "Password is too weak.";
        highlightInput("password");
      } else {
        msg = error.message;
      }
      showMessage(msg);
    });
});

// Handle Google signup
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

document.getElementById("googleSignup").addEventListener("click", () => {
  socialSignIn(new GoogleAuthProvider(), "Google signup successful!");
});
