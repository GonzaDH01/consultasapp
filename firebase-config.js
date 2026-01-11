// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6R03GRAJ0Hkg64GdwGGqt4ATDJQSuU_4",
  authDomain: "ooop-e35c5.firebaseapp.com",
  projectId: "ooop-e35c5",
  storageBucket: "ooop-e35c5.firebasestorage.app",
  messagingSenderId: "509575652850",
  appId: "1:509575652850:web:d6dc364654c00c7b27f76b",
  measurementId: "G-R8ZW3S4X8F"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Exportamos para que script.js pueda usarlos
export { db, auth };