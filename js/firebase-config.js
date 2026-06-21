import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDS36QKFwTP_sg38tZW7RyiQZNfcUnwrOs",
  authDomain: "cookieesandcakes.firebaseapp.com",
  projectId: "cookieesandcakes",
  storageBucket: "cookieesandcakes.firebasestorage.app",
  messagingSenderId: "104755675311",
  appId: "1:104755675311:web:f9d4c23925b32d46b1d45a",
  measurementId: "G-J596MMLGCG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { app, db, auth, analytics };
