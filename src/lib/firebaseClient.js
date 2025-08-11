// src/lib/firebaseClient.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDhi2xdzxs5tr-C7CSV6Phz4yPQbwg5Vsc",
  authDomain: "tangoapp-8bd65.firebaseapp.com",
  projectId: "tangoapp-8bd65",
  storageBucket: "tangoapp-8bd65.firebasestorage.app",
  messagingSenderId: "1064021178276",
  appId: "1:1064021178276:web:ae52b49cb020a33030b331",
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);

export { auth };