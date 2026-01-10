import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, inMemoryPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBS8PoYjqttetJqzSaB3Z2KCiHefc6dxDg",
  authDomain: "portfolio-challenge.firebaseapp.com",
  projectId: "portfolio-challenge",
  storageBucket: "portfolio-challenge.firebasestorage.app",
  messagingSenderId: "22931205428",
  appId: "1:22931205428:web:22dcef8b18f0c80ad5c961"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// 👇 esto hace que al cerrar el navegador, se pierda la sesión
setPersistence(auth, inMemoryPersistence).catch(console.error);