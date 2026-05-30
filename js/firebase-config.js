import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0VO4thKjQFDxqCw51PxPQ2PQSmD3541s",
  authDomain: "umoyo360.firebaseapp.com",
  projectId: "umoyo360",
  storageBucket: "umoyo360.firebasestorage.app",
  messagingSenderId: "306511976845",
  appId: "1:306511976845:web:105d1df33611e3277d85c4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
