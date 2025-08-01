// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDxqus-0C_B1dAkM8MPZu7c-OZOszkUw_0",
  authDomain: "imheretravelsadmin.firebaseapp.com",
  projectId: "imheretravelsadmin",
  storageBucket: "imheretravelsadmin.firebasestorage.app",
  messagingSenderId: "588795124138",
  appId: "1:588795124138:web:8c5762c81fdb1c816d73d3",
  measurementId: "G-S9N27KE79R",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
