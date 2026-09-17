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

// Cambiar entre pantallas según sesión
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('app-section').classList.remove('hidden');

        await loadUserData(user.uid);
        document.getElementById('user-display-name').innerText = userSettings.username || user.email;
        renderViews();
    } else {
        currentUser = null;
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('app-section').classList.add('hidden');
    }
});

// Toggle entre vista Login y Registro
window.showRegisterView = (showReg) => {
    if (showReg) {
        document.getElementById('reg-username-container').classList.remove('hidden');
        document.getElementById('btn-login').classList.add('hidden');
        document.getElementById('btn-register').classList.remove('hidden');
        document.getElementById('toggle-msg').innerHTML = '¿Ya tienes cuenta? <a href="#" onclick="showRegisterView(false)" class="text-blue-600 underline">Inicia Sesión</a>';
    } else {
        document.getElementById('reg-username-container').classList.add('hidden');
        document.getElementById('btn-login').classList.remove('hidden');
        document.getElementById('btn-register').classList.add('hidden');
        document.getElementById('toggle-msg').innerHTML = '¿No tienes cuenta? <a href="#" onclick="showRegisterView(true)" class="text-blue-600 underline">Regístrate</a>';
    }
};

// Registro de usuario
window.handleRegister = async () => {
    const username = document.getElementById('username').value.trim().toLowerCase();
    const email = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !email || !password) {
        alert("Completa todos los campos (Nombre de usuario, Email y Contraseña).");
        return;
    }

    if (password.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    try {
        // Comprobar si el username ya está ocupado
        const usernameRef = doc(db, "usernames", username);
        const usernameSnap = await getDoc(usernameRef);

        if (usernameSnap.exists()) {
            alert("Ese nombre de usuario ya está registrado por otra persona.");
            return;
        }

        // Crear usuario en Auth
        const res = await createUserWithEmailAndPassword(auth, email, password);

        // Guardar mapeo Username -> Email
        await setDoc(usernameRef, { email: email, uid: res.user.uid });

        // Guardar perfil del usuario
        userSettings.username = username;
        await saveUserData(res.user.uid);

        alert("¡Registro completado con éxito!");
    } catch (err) {
        alert("Error en el registro: " + err.message);
    }
};

// Inicio de sesión (Soporta Email o Username)
window.handleLogin = async () => {
    const input = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!input || !password) {
        alert("Introduce tu usuario/email y tu contraseña.");
        return;
    }

    let loginEmail = input;

    // Si no contiene '@', asumimos que metió un Nombre de Usuario
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
            alert("Error buscando el usuario: " + err.message);
            return;
        }
    }

    try {
        await signInWithEmailAndPassword(auth, loginEmail, password);
    } catch (err) {
        alert("Error al iniciar sesión: " + err.message);
    }
};

window.handleLogout = () => signOut(auth);

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
        console.error("Error cargando datos:", err);
    }
}

async function saveUserData(uid = currentUser?.uid) {
    if (!uid) return;
    const baseDist = parseFloat(document.getElementById('baseDistance').value) || 100;
    const baseT = parseFloat(document.getElementById('baseTime').value) || 13.05;

    userSettings.baseDistance = baseDist;
    userSettings.baseTime = baseT;

    try {
        await setDoc(doc(db, "users", uid), userSettings);
        renderViews();
    } catch (err) {
        console.error("Error al guardar datos:", err);
    }
}

window.updateSettings = () => saveUserData();

window.addDistance = () => {
    const val = parseFloat(document.getElementById('newDistance').value);
    if (val && !userSettings.distances.includes(val)) {
        userSettings.distances.push(val);
        userSettings.distances.sort((a, b) => a - b);
        document.getElementById('newDistance').value = '';
        saveUserData();
    }
};

window.removeDistance = (dist) => {
    userSettings.distances = userSettings.distances.filter(d => d !== dist);
    saveUserData();
};

function formatTime(seconds) {
    return seconds < 60
        ? seconds.toFixed(2) + 's'
        : `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}s`;
}

function renderViews() {
    const baseDist = userSettings.baseDistance;
    const baseT = userSettings.baseTime;
    const percentages = [100, 95, 90, 85, 80, 75, 70, 65, 60];
    const m = 1.08; // Exponente de fatiga de Riegel

    const mobileContainer = document.getElementById('mobile-cards-container');
    mobileContainer.innerHTML = '';

    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    userSettings.distances.forEach(d => {
        const time100 = baseT * Math.pow(d / baseDist, m);
        const isBase = d === baseDist;

        // Vista Móvil
        const card = document.createElement('div');
        card.className = `p-4 rounded-lg border shadow-sm ${isBase ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`;

        let cardHtml = `
                    <div class="flex justify-between items-center mb-3 border-b pb-2">
                        <span class="text-lg font-bold ${isBase ? 'text-blue-700' : 'text-gray-800'}">${d} metros ${isBase ? '(Base)' : ''}</span>
                        <button onclick="removeDistance(${d})" class="text-red-500 hover:text-red-700 font-bold px-2">✕</button>
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-center">
                `;

        percentages.forEach(pct => {
            const timeSec = time100 / (pct / 100);
            cardHtml += `
                        <div class="bg-gray-100 p-2 rounded">
                            <div class="text-xs text-gray-500 font-semibold">${pct}%</div>
                            <div class="text-sm font-bold text-gray-800">${formatTime(timeSec)}</div>
                        </div>
                    `;
        });

        cardHtml += `</div>`;
        card.innerHTML = cardHtml;
        mobileContainer.appendChild(card);

        // Vista Escritorio
        const tr = document.createElement('tr');
        let rowHtml = `<td class="p-3 border text-center font-bold ${isBase ? 'bg-blue-100 text-blue-700' : ''}">
                    ${d}m 
                    <button onclick="removeDistance(${d})" class="ml-2 text-red-500 hover:text-red-700 font-normal">✕</button>
                </td>`;

        percentages.forEach(pct => {
            const timeSec = time100 / (pct / 100);
            rowHtml += `<td class="p-3 border text-center text-sm ${pct === 100 ? 'font-semibold bg-gray-50' : ''}">${formatTime(timeSec)}</td>`;
        });

        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    });
}