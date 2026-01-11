import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Elementos del DOM
const datePicker = document.getElementById('date-picker');
const slotsSection = document.getElementById('slots-section');
const timeSlots = document.getElementById('time-slots');
const confirmBtn = document.getElementById('confirm-btn');
const currentApptDiv = document.getElementById('current-appointment');
const detailsText = document.getElementById('details-text');

const inputNombre = document.getElementById('nombre');
const inputTelef = document.getElementById('telefono');
const inputCobertura = document.getElementById('cobertura');

let selectedTime = null;

// 1. CONFIGURACIÓN INICIAL DE FECHA
const hoy = new Date().toISOString().split('T')[0];
if(datePicker) datePicker.min = hoy;

// 2. ESCUCHAR CAMBIO DE FECHA (CON MEJORA PARA iOS Y ANDROID)
if (datePicker) {
    // Usamos 'change' en lugar de 'input' para mayor compatibilidad con campos readonly
    datePicker.addEventListener('change', async (e) => {
        const fecha = e.target.value;
        if (!fecha) return;

        // Validar que sea Martes (1) o Jueves (3) - En JS Date.getDay() 0 es Domingo
        // Nota: split('-') para evitar problemas de zona horaria local
        const [y, m, d] = fecha.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        
        if (date.getDay() !== 2 && date.getDay() !== 4) {
            alert("Atención: La Dra. Noelia atiende únicamente los días Martes y Jueves.");
            e.target.value = "";
            slotsSection.classList.add('hidden');
            return;
        }

        slotsSection.classList.remove('hidden');
        await renderSlotsFirebase(fecha);
    });
}

// 3. RENDERIZAR HORARIOS DESDE FIREBASE
async function renderSlotsFirebase(fecha) {
    timeSlots.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">Cargando disponibilidad...</p>';
    selectedTime = null;
    confirmBtn.disabled = true;

    try {
        // Consultar turnos ya reservados en esa fecha
        const q = query(collection(db, "turnos"), where("fecha", "==", fecha));
        const querySnapshot = await getDocs(q);
        const ocupados = querySnapshot.docs.map(doc => doc.data().hora);

        const horarios = [
            "10:30", "10:40", "10:50", "11:00", "11:10", "11:20", "11:30", 
            "11:40", "11:50", "12:00", "12:10", "12:20", "12:30", "12:40", "12:50"
        ];

        timeSlots.innerHTML = "";
        horarios.forEach(hora => {
            const btn = document.createElement('button');
            btn.className = 'slot-btn';
            btn.textContent = hora;
            
            if (ocupados.includes(hora)) {
                btn.classList.add('ocupado');
                btn.disabled = true;
            } else {
                btn.onclick = () => {
                    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedTime = hora;
                    confirmBtn.disabled = false;
                };
            }
            timeSlots.appendChild(btn);
        });
    } catch (error) {
        console.error("Error al cargar turnos:", error);
        timeSlots.innerHTML = '<p style="color:red;">Error al conectar con la base de datos.</p>';
    }
}

// 4. GUARDAR TURNO EN FIREBASE
if (confirmBtn) {
    confirmBtn.onclick = async () => {
        const nombre = inputNombre.value.trim();
        const tel = inputTelef.value.trim();
        const cob = inputCobertura.value.trim();

        if (!nombre || !tel || !cob) {
            alert("Por favor, completa todos tus datos personales.");
            return;
        }

        const nuevoTurno = {
            nombre,
            telefono: tel,
            cobertura: cob,
            fecha: datePicker.value,
            hora: selectedTime,
            estado: "Pendiente",
            notas: ""
        };

        try {
            confirmBtn.disabled = true;
            confirmBtn.textContent = "Procesando...";
            
            const docRef = await addDoc(collection(db, "turnos"), nuevoTurno);
            
            // Guardar en local para que el paciente vea su turno al recargar
            localStorage.setItem('mi_ultimo_turno', JSON.stringify(nuevoTurno));
            localStorage.setItem('ultimo_id_firebase', docRef.id);

            alert("¡Turno confirmado con éxito!");
            mostrarTurnoConfirmado(nuevoTurno);
        } catch (e) {
            console.error("Error al guardar:", e);
            alert("Hubo un error al guardar el turno. Reintenta.");
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirmar Turno";
        }
    };
}

function mostrarTurnoConfirmado(turno) {
    document.querySelector('.container').querySelectorAll('input, label, #slots-section').forEach(el => el.style.display = 'none');
    document.querySelector('h3').style.display = 'none';
    
    currentApptDiv.classList.remove('hidden');
    detailsText.innerHTML = `<strong>Fecha:</strong> ${turno.fecha}<br><strong>Hora:</strong> ${turno.hora} hs<br><strong>Paciente:</strong> ${turno.nombre}`;
}

// 5. CANCELAR TURNO (LADO PACIENTE)
window.cancelarTurno = async function() {
    const idFirebase = localStorage.getItem('ultimo_id_firebase');
    if (!idFirebase) return;

    if (confirm("¿Seguro que deseas cancelar tu turno?")) {
        try {
            await deleteDoc(doc(db, "turnos", idFirebase));
            localStorage.removeItem('ultimo_id_firebase');
            localStorage.removeItem('mi_ultimo_turno');
            alert("Turno cancelado correctamente.");
            location.reload();
        } catch (e) {
            alert("No se pudo cancelar. Intenta más tarde.");
        }
    }
}

// 6. ACCESO PROFESIONAL (MODAL Y LOGIN)
window.abrirModal = () => document.getElementById('modalLogin').style.display = 'flex';
window.cerrarModal = () => document.getElementById('modalLogin').style.display = 'none';

window.validarAcceso = async () => {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    const errorMsg = document.getElementById('errorMsg');

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = "panelprofesional.html";
    } catch (error) {
        errorMsg.textContent = "Credenciales incorrectas.";
    }
};

// Al cargar, ver si ya tiene un turno en este dispositivo
window.onload = () => {
    const guardado = localStorage.getItem('mi_ultimo_turno');
    if (guardado) {
        mostrarTurnoConfirmado(JSON.parse(guardado));
    }
};