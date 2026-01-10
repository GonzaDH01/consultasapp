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
datePicker.min = hoy.toISOString().split('T')[0];

// Al cargar la página, verificar si el usuario ya tiene un turno guardado
window.addEventListener('DOMContentLoaded', () => {
    const miTurno = JSON.parse(localStorage.getItem('mi_ultimo_turno'));
    if (miTurno) mostrarTurnoActual(miTurno.fecha, miTurno);
});

// Escuchar cambios en el selector de fecha
datePicker.addEventListener('change', (e) => {
    if (!e.target.value) return;
    
    // Corregir desfase de zona horaria al leer la fecha
    const [year, month, day] = e.target.value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Validación: Solo Martes (2) y Jueves (4)
    if (date.getDay() !== 2 && date.getDay() !== 4) {
        alert("Atención: Solo atendemos los días Martes y Jueves.");
        e.target.value = "";
        slotsSection.classList.add('hidden');
        return;
    }
    
    slotsSection.classList.remove('hidden');
    renderSlots(e.target.value);
});

// Función para generar la cuadrícula de horarios
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
                // Quitar selección previa
                document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
                // Seleccionar actual
                slot.classList.add('selected');
                selectedTime = timeStr;
                confirmBtn.disabled = false;
            };
        }
        
        timeSlots.appendChild(slot);
        current.setMinutes(current.getMinutes() + 10);
    }
}

// Lógica de confirmación de turno
confirmBtn.onclick = () => {
    if (!inputNombre.value || !inputTelef.value) {
        alert("Por favor, completa al menos Nombre y Teléfono.");
        return;
    }

    const nuevoTurno = { 
        fecha: datePicker.value, 
        hora: selectedTime, 
        nombre: inputNombre.value.toUpperCase(), // Guardar en mayúsculas para el panel
        telefono: inputTelef.value,
        cobertura: inputCobertura.value || 'Particular', // Evitar el "undefined"
        notas: "" 
    };

    if (!dbTurnos[datePicker.value]) dbTurnos[datePicker.value] = [];
    dbTurnos[datePicker.value].push(nuevoTurno);
    
    // Guardar en Base de Datos general y en sesión del usuario
    localStorage.setItem('turnos_medicos_v2', JSON.stringify(dbTurnos));
    localStorage.setItem('mi_ultimo_turno', JSON.stringify(nuevoTurno));
    
    mostrarTurnoActual(datePicker.value, nuevoTurno);
    renderSlots(datePicker.value);
    alert("¡Turno confirmado con éxito!");
};

// Mostrar la tarjeta de información del turno actual
function mostrarTurnoActual(fecha, turno) {
    currentApptDiv.classList.remove('hidden');
    detailsText.innerHTML = `<strong>Día:</strong> ${fecha}<br><strong>Hora:</strong> ${turno.hora} hs<br><strong>Paciente:</strong> ${turno.nombre}`;
}

// FUNCIÓN DE CANCELACIÓN (Mejora solicitada)
function cancelarTurno() {
    if (confirm("¿Estás seguro de que deseas cancelar tu turno?")) {
        const miTurno = JSON.parse(localStorage.getItem('mi_ultimo_turno'));
        if (miTurno) {
            // 1. Eliminarlo de la base de datos general
            if (dbTurnos[miTurno.fecha]) {
                dbTurnos[miTurno.fecha] = dbTurnos[miTurno.fecha].filter(t => t.hora !== miTurno.hora);
                localStorage.setItem('turnos_medicos_v2', JSON.stringify(dbTurnos));
            }
            
            // 2. Limpiar el registro del usuario y recargar la vista
            localStorage.removeItem('mi_ultimo_turno');
            location.reload(); 
        }
    }
}

// LÓGICA DEL MODAL PROFESIONAL
function abrirModal() { 
    document.getElementById('modalLogin').style.display = 'flex'; 
    document.getElementById('errorMsg').textContent = "";
}

function cerrarModal() { 
    document.getElementById('modalLogin').style.display = 'none'; 
}

function validarAcceso() {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    
    if (email === "ribottanoelia@gmail.com" && pass === "1234") {
        window.location.href = 'panelprofesional.html';
    } else {
        document.getElementById('errorMsg').textContent = "Correo o contraseña incorrectos.";
    }
}

// Cerrar el modal al hacer clic fuera del contenido
window.onclick = function(event) {
    const modal = document.getElementById('modalLogin');
    if (event.target == modal) {
        cerrarModal();
    }
}