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

// 2. ESCUCHAR CAMBIO DE FECHA (CON MEJORA PARA iOS)
if (datePicker) {
    datePicker.addEventListener('input', async (e) => {
        const fecha = e.target.value;
        if (!fecha) return;

        const [y, m, d] = fecha.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        
        if (date.getDay() !== 2 && date.getDay() !== 4) {
            alert("La Dra. atiende solo Martes y Jueves.");
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
    timeSlots.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">Cargando horarios...</p>';
    selectedTime = null;
    confirmBtn.disabled = true;

    try {
        // Consultar turnos ya ocupados en Firebase para esa fecha
        const q = query(collection(db, "turnos"), where("fecha", "==", fecha));
        const querySnapshot = await getDocs(q);
        const ocupados = querySnapshot.docs.map(doc => doc.data().hora);

        timeSlots.innerHTML = '';
        let current = new Date(`2026-01-01T10:30:00`);
        const end = new Date(`2026-01-01T13:00:00`);

        while (current <= end) {
            const timeStr = current.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            const slot = document.createElement('div');
            const estaOcupado = ocupados.includes(timeStr);
            
            slot.className = 'slot' + (estaOcupado ? ' occupied' : '');
            slot.textContent = timeStr;

            if (!estaOcupado) {
                slot.onclick = () => {
                    document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
                    slot.classList.add('selected');
                    selectedTime = timeStr;
                    confirmBtn.disabled = false;
                };
            }
            timeSlots.appendChild(slot);
            current.setMinutes(current.getMinutes() + 10);
        }
    } catch (error) {
        console.error("Error al obtener turnos:", error);
        timeSlots.innerHTML = 'Error al cargar datos.';
    }
}

// 4. CONFIRMAR TURNO (GUARDAR EN FIREBASE)
if (confirmBtn) {
    confirmBtn.onclick = async () => {
        if (!inputNombre.value || !inputTelef.value) {
            alert("Completá nombre y teléfono.");
            return;
        }

        const nuevoTurno = {
            nombre: inputNombre.value.toUpperCase(),
            telefono: inputTelef.value,
            cobertura: inputCobertura.value || 'PARTICULAR',
            fecha: datePicker.value,
            hora: selectedTime,
            estado: 'Pendiente',
            notas: "",
            createdAt: new Date()
        };

        try {
            confirmBtn.disabled = true;
            confirmBtn.textContent = "Guardando...";
            
            const docRef = await addDoc(collection(db, "turnos"), nuevoTurno);
            
            // Guardamos el ID localmente por si quiere cancelar en la misma sesión
            localStorage.setItem('ultimo_id_firebase', docRef.id);
            localStorage.setItem('mi_ultimo_turno', JSON.stringify(nuevoTurno));

            mostrarTurnoActual(datePicker.value, nuevoTurno);
            await renderSlotsFirebase(datePicker.value);
            
            alert("¡Turno confirmado con éxito!");
            confirmBtn.textContent = "Confirmar Turno";
        } catch (e) {
            console.error("Error al guardar:", e);
            alert("Hubo un problema al guardar el turno.");
            confirmBtn.disabled = false;
        }
    };
}

function mostrarTurnoActual(fecha, turno) {
    if(!currentApptDiv) return;
    currentApptDiv.classList.remove('hidden');
    detailsText.innerHTML = `<strong>Día:</strong> ${fecha}<br><strong>Hora:</strong> ${turno.hora} hs<br><strong>Paciente:</strong> ${turno.nombre}`;
}

// 5. CANCELAR TURNO (LADO PACIENTE)
window.cancelarTurno = async function() {
    const idFirebase = localStorage.getItem('ultimo_id_firebase');
    if (!idFirebase) {
        alert("No se encontró un turno activo para cancelar.");
        return;
    }

    if (confirm("¿Seguro que deseas cancelar tu turno?")) {
        try {
            await deleteDoc(doc(db, "turnos", idFirebase));
            localStorage.removeItem('ultimo_id_firebase');
            localStorage.removeItem('mi_ultimo_turno');
            alert("Turno cancelado.");
            location.reload();
        } catch (e) {
            alert("Error al cancelar.");
        }
    }
}

// 6. ACCESO PROFESIONAL (LOGIN CON FIREBASE)
window.abrirModal = () => document.getElementById('modalLogin').style.display = 'flex';
window.cerrarModal = () => document.getElementById('modalLogin').style.display = 'none';

window.validarAcceso = async () => {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    const errorMsg = document.getElementById('errorMsg');

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = 'panelprofesional.html';
    } catch (error) {
        errorMsg.textContent = "Usuario o contraseña incorrectos.";
    }
};