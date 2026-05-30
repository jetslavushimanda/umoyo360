import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Login ─────────────────────────────────────────────────────────────────
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── Register ──────────────────────────────────────────────────────────────
export async function registerUser(email, password, profileData) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  await setDoc(doc(db, "users", uid), {
    ...profileData,
    email,
    uid,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp()
  });
  return cred.user;
}

// ── Logout ────────────────────────────────────────────────────────────────
export async function logoutUser() {
  await signOut(auth);
  window.location.href = "index.html";
}

// ── Password reset ────────────────────────────────────────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Auth state guard ──────────────────────────────────────────────────────
export function guardPage(redirectIfLoggedIn = false, redirectTo = "index.html") {
  onAuthStateChanged(auth, user => {
    if (redirectIfLoggedIn && user) {
      window.location.href = "dashboard.html";
    } else if (!redirectIfLoggedIn && !user) {
      window.location.href = redirectTo;
    }
  });
}

// ── Get current user ──────────────────────────────────────────────────────
export function getCurrentUser() {
  return auth.currentUser;
}

// ── Error messages ────────────────────────────────────────────────────────
export function getAuthErrorMessage(code) {
  const messages = {
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/invalid-credential": "Incorrect email or password. Please try again."
  };
  return messages[code] || "Something went wrong. Please try again.";
}

// ── Login page logic (runs on index.html) ─────────────────────────────────
export function initLoginPage() {
  guardPage(true);

  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const errorEl = document.getElementById("login-error");
  const btnLogin = document.getElementById("btn-login");
  const forgotLink = document.getElementById("forgot-password");

  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    errorEl.textContent = "";
    btnLogin.disabled = true;
    btnLogin.textContent = "Logging in...";

    try {
      await loginUser(emailInput.value.trim(), passwordInput.value);
      window.location.href = "dashboard.html";
    } catch (err) {
      errorEl.textContent = getAuthErrorMessage(err.code);
      btnLogin.disabled = false;
      btnLogin.textContent = "Login";
    }
  });

  if (forgotLink) {
    forgotLink.addEventListener("click", async e => {
      e.preventDefault();
      const email = emailInput.value.trim();
      if (!email) { errorEl.textContent = "Enter your email first."; return; }
      try {
        await resetPassword(email);
        errorEl.style.color = "#27AE60";
        errorEl.textContent = "Password reset email sent. Check your inbox.";
      } catch (err) {
        errorEl.style.color = "#E74C3C";
        errorEl.textContent = getAuthErrorMessage(err.code);
      }
    });
  }
}
