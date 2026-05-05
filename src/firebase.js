import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB6jrHib0GKKHRrxTBGivLfoZHcAGJDBwA",
  authDomain: "feast-c9ec5.firebaseapp.com",
  projectId: "feast-c9ec5",
  storageBucket: "feast-c9ec5.firebasestorage.app",
  messagingSenderId: "76177894884",
  appId: "1:76177894884:web:e360725bc739faf9c8abf1"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);