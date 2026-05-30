import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function registerUser(email, password, profileData) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  await setDoc(doc(db, "users", uid), {
    ...profileData, email, uid,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp()
  });
  return cred.user;
}

export async function logoutUser() {
  await signOut(auth);
  window.location.href = "index.html";
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export function guardPage(redirectIfLoggedIn = false, redirectTo = "index.html") {
  onAuthStateChanged(auth, user => {
    if (redirectIfLoggedIn && user) window.location.href = "dashboard.html";
    else if (!redirectIfLoggedIn && !user) window.location.href = redirectTo;
  });
}

export function getCurrentUser() { return auth.currentUser; }

export function getAuthErrorMessage(code) {
  console.error("Firebase Auth Error:", code);
  const messages = {
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a few minutes.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/invalid-credential": "Incorrect email or password. Please try again.",
    "auth/operation-not-allowed": "Email/Password login not enabled. Go to Firebase Console → Authentication → Sign-in method → Enable Email/Password.",
    "auth/unauthorized-domain": "Domain not authorized. Add 'localhost' in Firebase Console → Authentication → Settings → Authorized domains."
  };
  return messages[code] || `Error (${code}). Please try again.`;
}

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

  forgotLink?.addEventListener("click", async e => {
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
