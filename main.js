import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC20hdEsrcGjCdfrGZ1bQKaQI1dAULZUaY",
    authDomain: "atletismo-27061.firebaseapp.com",
    projectId: "atletismo-27061",
    storageBucket: "atletismo-27061.firebasestorage.app",
    messagingSenderId: "4223238228",
    appId: "1:4223238228:web:59947fced3c5feca9aadc1",
    measurementId: "G-C7SRZLBCRY"
};

let auth, db;

try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Error al inicializar Firebase:", e);
}

let currentUser = null;
let userSettings = {
    username: "",
    baseDistance: 100,
    baseTime: 13.05,
    distances: [30, 40, 50, 60, 80, 100, 120, 150, 180, 200, 250, 300, 350, 400]
};

// VINCULACIÓN DE EVENTOS CON EL DOM
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-register').addEventListener('click', handleRegister);
    document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));
    document.getElementById('btn-add-distance').addEventListener('click', addDistance);
    
    document.getElementById('baseDistance').addEventListener('change', updateSettings);
    document.getElementById('baseTime').addEventListener('change', updateSettings);

    document.getElementById('link-show-register').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthView(true);
    });
});

// SESIÓN DE USUARIO
onAuthStateChanged(auth, async (user) => {
    const userHeader = document.getElementById('user-header');
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');

    if (user) {
        currentUser = user;
        authSection.classList.add('hidden');
        userHeader.classList.remove('hidden');
        appSection.classList.remove('hidden');

        await loadUserData(user.uid);
        document.getElementById('user-display-name').innerText = userSettings.username || user.email;
        renderViews();
    } else {
        currentUser = null;
        userHeader.classList.add('hidden');
        authSection.classList.remove('hidden');
        appSection.classList.add('hidden');
    }
});

function toggleAuthView(showRegister) {
    const regUsername = document.getElementById('reg-username-container');
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const toggleMsg = document.getElementById('toggle-msg');

    if (showRegister) {
        regUsername.classList.remove('hidden');
        btnLogin.classList.add('hidden');
        btnRegister.classList.remove('hidden');
        toggleMsg.innerHTML = '¿Ya tienes cuenta? <a href="#" id="link-show-login">Inicia Sesión</a>';
        document.getElementById('link-show-login').addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthView(false);
        });
    } else {
        regUsername.classList.add('hidden');
        btnLogin.classList.remove('hidden');
        btnRegister.classList.add('hidden');
        toggleMsg.innerHTML = '¿No tienes cuenta? <a href="#" id="link-show-register">Regístrate</a>';
        document.getElementById('link-show-register').addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthView(true);
        });
    }
}

async function handleRegister() {
    const username = document.getElementById('username').value.trim().toLowerCase();
    const email = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !email || !password) {
        alert("Completa todos los campos obligatorios.");
        return;
    }

    if (password.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    try {
        const usernameRef = doc(db, "usernames", username);
        const usernameSnap = await getDoc(usernameRef);

        if (usernameSnap.exists()) {
            alert("El nombre de usuario ya está en uso.");
            return;
        }

        const res = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(usernameRef, { email, uid: res.user.uid });

        userSettings.username = username;
        await saveUserData(res.user.uid);

        alert("¡Registro completado con éxito!");
    } catch (err) {
        alert("Error en el registro: " + err.message);
    }
}

async function handleLogin() {
    const input = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!input || !password) {
        alert("Introduce tu usuario/email y contraseña.");
        return;
    }

    let loginEmail = input;

    if (!input.includes('@')) {
        const usernameLower = input.toLowerCase();
        try {
            const usernameDoc = await getDoc(doc(db, "usernames", usernameLower));
            if (usernameDoc.exists()) {
                loginEmail = usernameDoc.data().email;
            } else {
                alert("El usuario no existe.");
                return;
            }
        } catch (err) {
            alert("Error consultando usuario: " + err.message);
            return;
        }
    }

    try {
        await signInWithEmailAndPassword(auth, loginEmail, password);
    } catch (err) {
        alert("Error al iniciar sesión: " + err.message);
    }
}

// PERSISTENCIA DE DATOS
async function loadUserData(uid) {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            userSettings = docSnap.data();
            document.getElementById('baseDistance').value = userSettings.baseDistance;
            document.getElementById('baseTime').value = userSettings.baseTime;
        } else {
            await saveUserData(uid);
        }
    } catch (err) {
        console.error("Error al cargar datos:", err);
    }
}

async function saveUserData(uid = currentUser?.uid) {
    if (!uid) return;
    userSettings.baseDistance = parseFloat(document.getElementById('baseDistance').value) || 100;
    userSettings.baseTime = parseFloat(document.getElementById('baseTime').value) || 13.05;

    try {
        await setDoc(doc(db, "users", uid), userSettings);
        renderViews();
    } catch (err) {
        console.error("Error al guardar datos:", err);
    }
}

function updateSettings() {
    saveUserData();
}

function addDistance() {
    const input = document.getElementById('newDistance');
    const val = parseFloat(input.value);
    if (val && !userSettings.distances.includes(val)) {
        userSettings.distances.push(val);
        userSettings.distances.sort((a, b) => a - b);
        input.value = '';
        saveUserData();
    }
}

function removeDistance(dist) {
    userSettings.distances = userSettings.distances.filter(d => d !== dist);
    saveUserData();
}

// FORMATO Y CÁLCULOS
function formatTime(seconds) {
    return seconds < 60
        ? seconds.toFixed(2) + 's'
        : `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}s`;
}

function renderViews() {
    const baseDist = userSettings.baseDistance;
    const baseT = userSettings.baseTime;
    const percentages = [100, 95, 90, 85, 80, 75, 70, 65, 60];
    const m = 1.08; // Exponente de Riegel

    const mobileContainer = document.getElementById('mobile-cards-container');
    const tbody = document.getElementById('table-body');
    
    mobileContainer.innerHTML = '';
    tbody.innerHTML = '';

    userSettings.distances.forEach(d => {
        const time100 = baseT * Math.pow(d / baseDist, m);
        const isBase = d === baseDist;

        // Tarjetas Móviles
        const card = document.createElement('div');
        card.className = `distance-card ${isBase ? 'is-base' : ''}`;
        
        let cardHtml = `
            <div class="card-header">
                <span>${d} metros ${isBase ? '(Base)' : ''}</span>
                <button class="btn-icon-delete" data-dist="${d}">✕</button>
            </div>
            <div class="card-metrics">
        `;

        percentages.forEach(pct => {
            const timeSec = time100 / (pct / 100);
            cardHtml += `
                <div class="metric-box">
                    <div class="metric-pct">${pct}%</div>
                    <div class="metric-val">${formatTime(timeSec)}</div>
                </div>
            `;
        });

        cardHtml += `</div>`;
        card.innerHTML = cardHtml;
        mobileContainer.appendChild(card);

        // Tabla Escritorio
        const tr = document.createElement('tr');
        let rowHtml = `
            <td class="${isBase ? 'is-base' : ''}">
                ${d}m
                <button class="btn-icon-delete" data-dist="${d}">✕</button>
            </td>
        `;

        percentages.forEach(pct => {
            const timeSec = time100 / (pct / 100);
            rowHtml += `<td>${formatTime(timeSec)}</td>`;
        });

        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    });

    // Delegación de eventos para eliminar distancias
    document.querySelectorAll('.btn-icon-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dist = parseFloat(e.target.getAttribute('data-dist'));
            removeDistance(dist);
        });
    });
}