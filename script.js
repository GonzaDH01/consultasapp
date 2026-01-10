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
let dbTurnos = JSON.parse(localStorage.getItem('turnos_medicos_v2')) || {};

// Configuración de fecha mínima (hoy)
const hoy = new Date();
const fechaHoyStr = hoy.toISOString().split('T')[0];
if(datePicker) datePicker.min = fechaHoyStr;

// Al cargar la página, verificar si el usuario ya tiene un turno guardado
window.addEventListener('DOMContentLoaded', () => {
    const miTurno = JSON.parse(localStorage.getItem('mi_ultimo_turno'));
    if (miTurno && detailsText) mostrarTurnoActual(miTurno.fecha, miTurno);
});

/* --- CORRECCIÓN PARA iOS: Evento 'input' y showPicker --- */
if (datePicker) {
    // Forzamos la apertura del selector en móviles al hacer clic
    datePicker.addEventListener('click', function() {
        if (this.showPicker) this.showPicker();
    });

    datePicker.addEventListener('input', (e) => {
        const valorFecha = e.target.value;
        if (!valorFecha) return;
        
        // Corregir desfase de zona horaria
        const [year, month, day] = valorFecha.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        
        // Validación: Solo Martes (2) y Jueves (4)
        const diaSemana = date.getDay();
        if (diaSemana !== 2 && diaSemana !== 4) {
            alert("Atención: La Dra. Ribotta atiende solo los días Martes y Jueves.");
            e.target.value = "";
            slotsSection.classList.add('hidden');
            return;
        }
        
        slotsSection.classList.remove('hidden');
        renderSlots(valorFecha);
    });
}

// Función para generar la cuadrícula de horarios (Grid Slots)
function renderSlots(fecha) {
    timeSlots.innerHTML = '';
    selectedTime = null;
    confirmBtn.disabled = true;

    // Rango horario: 10:30 a 13:00 cada 10 minutos
    let current = new Date(`2026-01-01T10:30:00`);
    const end = new Date(`2026-01-01T13:00:00`);
    const ocupados = dbTurnos[fecha] || [];

    while (current <= end) {
        const timeStr = current.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const slot = document.createElement('div');
        const estaOcupado = ocupados.some(t => t.hora === timeStr);
        
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
}

// Lógica de confirmación de turno (Paciente)
if (confirmBtn) {
    confirmBtn.onclick = () => {
        if (!inputNombre.value || !inputTelef.value) {
            alert("Por favor, completa Nombre y Teléfono.");
            return;
        }

        const nuevoTurno = { 
            fecha: datePicker.value, 
            hora: selectedTime, 
            nombre: inputNombre.value.toUpperCase(),
            telefono: inputTelef.value,
            cobertura: inputCobertura.value || 'PARTICULAR',
            estado: 'Pendiente',
            notas: "" 
        };

        if (!dbTurnos[datePicker.value]) dbTurnos[datePicker.value] = [];
        dbTurnos[datePicker.value].push(nuevoTurno);
        
        localStorage.setItem('turnos_medicos_v2', JSON.stringify(dbTurnos));
        localStorage.setItem('mi_ultimo_turno', JSON.stringify(nuevoTurno));
        
        mostrarTurnoActual(datePicker.value, nuevoTurno);
        renderSlots(datePicker.value);
        alert("¡Turno reservado correctamente!");
    };
}

function mostrarTurnoActual(fecha, turno) {
    if(!currentApptDiv) return;
    currentApptDiv.classList.remove('hidden');
    detailsText.innerHTML = `<strong>Día:</strong> ${fecha}<br><strong>Hora:</strong> ${turno.hora} hs<br><strong>Paciente:</strong> ${turno.nombre}`;
}

// Función de Cancelación desde el lado del Paciente
function cancelarTurno() {
    if (confirm("¿Deseas cancelar tu turno reservado?")) {
        const miTurno = JSON.parse(localStorage.getItem('mi_ultimo_turno'));
        if (miTurno) {
            if (dbTurnos[miTurno.fecha]) {
                dbTurnos[miTurno.fecha] = dbTurnos[miTurno.fecha].filter(t => t.hora !== miTurno.hora);
                localStorage.setItem('turnos_medicos_v2', JSON.stringify(dbTurnos));
            }
            localStorage.removeItem('mi_ultimo_turno');
            location.reload(); 
        }
    }
}

/* --- LÓGICA DE ACCESO PROFESIONAL (MODAL) --- */
function abrirModal() { 
    const modal = document.getElementById('modalLogin');
    if(modal) {
        modal.style.display = 'flex'; 
        document.getElementById('errorMsg').textContent = "";
    }
}

function cerrarModal() { 
    const modal = document.getElementById('modalLogin');
    if(modal) modal.style.display = 'none'; 
}

function validarAcceso() {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    
    if (email === "ribottanoelia@gmail.com" && pass === "1234") {
        window.location.href = 'panelprofesional.html';
    } else {
        document.getElementById('errorMsg').textContent = "Credenciales incorrectas.";
    }
}

// Cerrar modal al tocar fuera
window.onclick = function(event) {
    const modal = document.getElementById('modalLogin');
    if (event.target == modal) cerrarModal();
}