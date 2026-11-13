/* 廣東話小幫手 — Firebase web config (public client config).
   Same sinosee-mathsgame project as the other classroom games.
   Realtime Database path is p3CantoneseTrial (lesson only; not a maths leaderboard).
   Publish the rules that include p3CantoneseTrial, then set
   p3CantoneseTrial/teacherPin in the Firebase console (same 8800 as the in-page PIN).
   The client apiKey is public; database rules protect writes. */
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
