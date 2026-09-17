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
    console.error("Error inicializando Firebase:", e);
}

let currentUser = null;
let userSettings = {
    username: "",
    baseDistance: 100,
    baseTime: 13.05,
    distances: [30, 40, 50, 60, 80, 100, 120, 150, 180, 200, 250, 300, 350, 400]
};

// VINCULACIÓN DE EVENTOS SEGURA
window.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const btnLogout = document.getElementById('btn-logout');
    const btnAddDist = document.getElementById('btn-add-distance');

    if (btnLogin) btnLogin.onclick = handleLogin;
    if (btnRegister) btnRegister.onclick = handleRegister;
    if (btnLogout) btnLogout.onclick = () => signOut(auth);
    if (btnAddDist) btnAddDist.onclick = addDistance;

    const baseDistInput = document.getElementById('baseDistance');
    const baseTimeInput = document.getElementById('baseTime');
    if (baseDistInput) baseDistInput.onchange = updateSettings;
    if (baseTimeInput) baseTimeInput.onchange = updateSettings;

    setupAuthToggle();
});

function setupAuthToggle() {
    const linkReg = document.getElementById('link-show-register');
    if (linkReg) {
        linkReg.onclick = (e) => {
            e.preventDefault();
            toggleAuthView(true);
        };
    }
}

// SESIÓN DE USUARIO
if (auth) {
    onAuthStateChanged(auth, async (user) => {
        const userHeader = document.getElementById('user-header');
        const authSection = document.getElementById('auth-section');
        const appSection = document.getElementById('app-section');

        if (user) {
            currentUser = user;
            if (authSection) authSection.classList.add('hidden');
            if (userHeader) userHeader.classList.remove('hidden');
            if (appSection) appSection.classList.remove('hidden');

            await loadUserData(user.uid);
            const nameDisplay = document.getElementById('user-display-name');
            if (nameDisplay) nameDisplay.innerText = userSettings.username || user.email;
            renderViews();
        } else {
            currentUser = null;
            if (userHeader) userHeader.classList.add('hidden');
            if (authSection) authSection.classList.remove('hidden');
            if (appSection) appSection.classList.add('hidden');
        }
    });
}

function toggleAuthView(showRegister) {
    const regUsername = document.getElementById('reg-username-container');
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const toggleMsg = document.getElementById('toggle-msg');

    if (showRegister) {
        if (regUsername) regUsername.classList.remove('hidden');
        if (btnLogin) btnLogin.classList.add('hidden');
        if (btnRegister) btnRegister.classList.remove('hidden');
        if (toggleMsg) {
            toggleMsg.innerHTML = '¿Ya tienes cuenta? <a href="#" id="link-show-login">Inicia Sesión</a>';
            document.getElementById('link-show-login').onclick = (e) => {
                e.preventDefault();
                toggleAuthView(false);
            };
        }
    } else {
        if (regUsername) regUsername.classList.add('hidden');
        if (btnLogin) btnLogin.classList.remove('hidden');
        if (btnRegister) btnRegister.classList.add('hidden');
        if (toggleMsg) {
            toggleMsg.innerHTML = '¿No tienes cuenta? <a href="#" id="link-show-register">Regístrate</a>';
            setupAuthToggle();
        }
    }
}

async function handleRegister() {
    const usernameInput = document.getElementById('username');
    const identifierInput = document.getElementById('identifier');
    const passwordInput = document.getElementById('password');

    const username = usernameInput ? usernameInput.value.trim().toLowerCase() : '';
    const email = identifierInput ? identifierInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!username || !email || !password) {
        alert("Completa todos los campos.");
        return;
    }

    try {
        const usernameRef = doc(db, "usernames", username);
        const usernameSnap = await getDoc(usernameRef);

        if (usernameSnap.exists()) {
            alert("El nombre de usuario ya existe.");
            return;
        }

        const res = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(usernameRef, { email, uid: res.user.uid });

        userSettings.username = username;
        await saveUserData(res.user.uid);

        alert("¡Cuenta creada correctamente!");
    } catch (err) {
        alert("Error al registrarse: " + err.message);
    }
}

async function handleLogin() {
    const identifierInput = document.getElementById('identifier');
    const passwordInput = document.getElementById('password');

    const input = identifierInput ? identifierInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    if (!input || !password) {
        alert("Escribe tu usuario/email y contraseña.");
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
                alert("El nombre de usuario no existe.");
                return;
            }
        } catch (err) {
            alert("Error al buscar usuario: " + err.message);
            return;
        }
    }

    try {
        await signInWithEmailAndPassword(auth, loginEmail, password);
    } catch (err) {
        alert("Error al iniciar sesión: " + err.message);
    }
}

async function loadUserData(uid) {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            userSettings = docSnap.data();
            const baseDistInput = document.getElementById('baseDistance');
            const baseTimeInput = document.getElementById('baseTime');
            if (baseDistInput) baseDistInput.value = userSettings.baseDistance;
            if (baseTimeInput) baseTimeInput.value = userSettings.baseTime;
        } else {
            await saveUserData(uid);
        }
    } catch (err) {
        console.error("Error cargando datos:", err);
    }
}

async function saveUserData(uid = currentUser?.uid) {
    if (!uid) return;
    const baseDistInput = document.getElementById('baseDistance');
    const baseTimeInput = document.getElementById('baseTime');

    if (baseDistInput) userSettings.baseDistance = parseFloat(baseDistInput.value) || 100;
    if (baseTimeInput) userSettings.baseTime = parseFloat(baseTimeInput.value) || 13.05;

    try {
        await setDoc(doc(db, "users", uid), userSettings);
        renderViews();
    } catch (err) {
        console.error("Error guardando datos:", err);
    }
}

function updateSettings() {
    saveUserData();
}

function addDistance() {
    const input = document.getElementById('newDistance');
    const val = parseFloat(input ? input.value : '');
    if (val && !userSettings.distances.includes(val)) {
        userSettings.distances.push(val);
        userSettings.distances.sort((a, b) => a - b);
        if (input) input.value = '';
        saveUserData();
    }
}

function removeDistance(dist) {
    userSettings.distances = userSettings.distances.filter(d => d !== dist);
    saveUserData();
}

function formatTime(seconds) {
    return seconds < 60
        ? seconds.toFixed(2) + 's'
        : `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}s`;
}

function renderViews() {
    const baseDist = userSettings.baseDistance;
    const baseT = userSettings.baseTime;
    const percentages = [100, 95, 90, 85, 80, 75, 70, 65, 60];
    const m = 1.08;

    const mobileContainer = document.getElementById('mobile-cards-container');
    const tbody = document.getElementById('table-body');
    
    if (mobileContainer) mobileContainer.innerHTML = '';
    if (tbody) tbody.innerHTML = '';

    userSettings.distances.forEach(d => {
        const time100 = baseT * Math.pow(d / baseDist, m);
        const isBase = d === baseDist;

        if (mobileContainer) {
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
        }

        if (tbody) {
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
        }
    });

    document.querySelectorAll('.btn-icon-delete').forEach(btn => {
        btn.onclick = (e) => {
            const dist = parseFloat(e.target.getAttribute('data-dist'));
            removeDistance(dist);
        };
    });
}