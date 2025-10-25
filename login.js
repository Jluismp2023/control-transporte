import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// TU CONFIGURACIÓN DE FIREBASE (la misma de tu index.html)
const firebaseConfig = {
    apiKey: "AIzaSyDtDX8xK1m1VxjfRMFsDZXoAH36l8Izyz8",
    authDomain: "control-transporte-c4f61.firebaseapp.com",
    projectId: "control-transporte-c4f61",
    storageBucket: "control-transporte-c4f61.appspot.com",
    messagingSenderId: "447956658904",
    appId: "1:447956658904:web:81e9b40fb55107f93ec5ad"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Si el inicio de sesión es exitoso, redirige a la página principal
            window.location.href = 'index.html';
        })
        .catch((error) => {
            // Muestra un mensaje de error si las credenciales son incorrectas
            errorMessage.textContent = 'Usuario o contraseña incorrectos.';
        });
});