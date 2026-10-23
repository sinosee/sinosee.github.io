/* 立體圖形對對碰 — Firebase web config (public client config).
   Same sinosee-mathsgame project as divisibility-drop.
   Realtime Database path is p1SolidShapes (not under divisibilityDrop).
   Publish the rules in LEADERBOARD.md, then set p1SolidShapes/teacherPin in the console.
   The client apiKey is public; database rules protect the scores. */
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
