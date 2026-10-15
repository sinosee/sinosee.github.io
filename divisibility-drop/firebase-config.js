/* Divisibility Drop — Firebase web config.
   Replace every YOUR_* value with the Web app config from Firebase console.
   Steps and Realtime Database rules: LEADERBOARD.md
   The client apiKey is public by design; database rules protect the scores.
   Keep the placeholders until the teacher pastes real values. */
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
