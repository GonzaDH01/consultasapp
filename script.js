import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const datePicker = document.getElementById('date-picker');
const slotsSection = document.getElementById('slots-section');
const timeSlots = document.getElementById('time-slots');
const confirmBtn = document.getElementById('confirm-btn');
const currentApptDiv = document.getElementById('current-appointment');
const bookingForm = document.getElementById('booking-form');
const detailsText = document.getElementById('details-text');

let selectedTime = null;

const hoy = new Date().toISOString().split('T')[0];
if(datePicker) datePicker.min = hoy;

if (datePicker) {
    datePicker.addEventListener('change', async (e) => {
        const fecha = e.target.value;
        const [y, m, d] = fecha.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        
        if (date.getDay() !== 2 && date.getDay() !== 4) {
            Swal.fire({ icon: 'info', title: 'Atención', text: 'Atención solo Martes y Jueves.', confirmButtonColor: '#4db6ac' });
            e.target.value = "";
            slotsSection.classList.add('hidden');
            return;
        }
        slotsSection.classList.remove('hidden');
        renderSlotsFirebase(fecha);
    });
}

async function renderSlotsFirebase(fecha) {
    timeSlots.innerHTML = '<p style="grid-column:1/-1; text-align:center;">Cargando...</p>';
    const q = query(collection(db, "turnos"), where("fecha", "==", fecha));
    const querySnapshot = await getDocs(q);
    const ocupados = querySnapshot.docs.map(d => d.data().hora);

    const horarios = ["10:30", "10:40", "10:50", "11:00", "11:10", "11:20", "11:30", "11:40", "11:50", "12:00", "12:10", "12:20", "12:30", "12:40", "12:50"];
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
}

if (confirmBtn) {
    confirmBtn.onclick = async () => {
        const nombre = document.getElementById('nombre').value.trim();
        if (!nombre) return Swal.fire('Error', 'Ingresá tu nombre.', 'warning');

        const nuevoTurno = {
            nombre,
            telefono: document.getElementById('telefono').value,
            cobertura: document.getElementById('cobertura').value,
            fecha: datePicker.value,
            hora: selectedTime,
            estado: "Pendiente"
        };

        try {
            confirmBtn.disabled = true;
            confirmBtn.textContent = "Guardando...";
            const docRef = await addDoc(collection(db, "turnos"), nuevoTurno);
            localStorage.setItem('mi_ultimo_turno', JSON.stringify(nuevoTurno));
            localStorage.setItem('ultimo_id_firebase', docRef.id);
            
            Swal.fire('¡Éxito!', 'Tu turno ha sido reservado.', 'success');
            mostrarTurnoConfirmado(nuevoTurno);
        } catch (e) { confirmBtn.disabled = false; confirmBtn.textContent = "Confirmar Turno"; }
    };
}

function mostrarTurnoConfirmado(turno) {
    if(bookingForm) bookingForm.classList.add('hidden');
    currentApptDiv.classList.remove('hidden');
    detailsText.innerHTML = `<strong>Día:</strong> ${turno.fecha}<br><strong>Hora:</strong> ${turno.hora} hs<br><strong>Paciente:</strong> ${turno.nombre}`;
}

window.cancelarTurno = async function() {
    const id = localStorage.getItem('ultimo_id_firebase');
    if (!id) return;

    Swal.fire({
        title: '¿Anular turno?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar',
        confirmButtonColor: '#e11d48'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(db, "turnos", id));
                localStorage.clear();
                Swal.fire('Eliminado', 'Turno cancelado.', 'success').then(() => location.reload());
            } catch (e) {
                Swal.fire('Error', 'No se pudo cancelar. Revisa las reglas de Firebase.', 'error');
            }
        }
    });
}

window.abrirModal = () => document.getElementById('modalLogin').style.display = 'flex';
window.cerrarModal = () => document.getElementById('modalLogin').style.display = 'none';
window.validarAcceso = async () => {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = "panelprofesional.html";
    } catch (e) { document.getElementById('errorMsg').textContent = "Error de ingreso."; }
};

window.onload = () => {
    const guardado = localStorage.getItem('mi_ultimo_turno');
    if (guardado) mostrarTurnoConfirmado(JSON.parse(guardado));
};