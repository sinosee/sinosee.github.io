/* Divisibility Drop — Firebase web config (public client config).
   Realtime Database rules still need to be published: LEADERBOARD.md
   The client apiKey is public by design; database rules protect the scores.
   Analytics is not loaded; measurementId is unused by the leaderboard. */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAMiaQhNkj_RqM0GiWazXPs7wNorY5qld4",
  authDomain: "sinosee-mathsgame.firebaseapp.com",
  databaseURL: "https://sinosee-mathsgame-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sinosee-mathsgame",
  storageBucket: "sinosee-mathsgame.firebasestorage.app",
  messagingSenderId: "85436615444",
  appId: "1:85436615444:web:b70f223c4ef025471e5001",
  measurementId: "G-G5R8MT3M72"
};
