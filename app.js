import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDtDX8xK1m1VxjfRMFsDZXoAH36l8Izyz8",
    authDomain: "control-transporte-c4f61.firebaseapp.com",
    projectId: "control-transporte-c4f61",
    storageBucket: "control-transporte-c4f61.appspot.com",
    messagingSenderId: "447956658904",
    appId: "1:447956658904:web:81e9b40fb55107f93ec5ad"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Función helper para obtener la fecha de hoy en formato YYYY-MM-DD
const getTodayDate = () => new Date().toISOString().slice(0, 10);

// Función helper para formatear fechas (para evitar problemas de zona horaria)
const formatDate = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
}

// Comprobar estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Si no hay usuario, redirigir a login
        window.location.href = 'login.html';
    } else {
        // Si hay usuario, mostrar la app e inicializar
        document.body.style.display = 'block';
        inicializarApp();
    }
});

// Función para cargar el HTML dinámico de las secciones
const cargarContenidoHTML = () => {
    
    // HTML para el Panel de Inicio
    document.getElementById('tab-inicio').innerHTML = `
        
        <!-- Contenedor de Estadísticas (KPIs) -->
        <div class="kpi-container">
            <div class="kpi-card">
                <h3>Volumen de Hoy (m³)</h3>
                <p id="kpi-volumen-hoy">Cargando...</p>
            </div>
            <div class="kpi-card">
                <h3>Volumen Semanal (m³)</h3>
                <p id="kpi-volumen-semanal">Cargando...</p>
            </div>
            <div class="kpi-card">
                <h3>Volumen Mensual (m³)</h3>
                <p id="kpi-volumen-mensual">Cargando...</p>
            </div>
        </div>

        <!-- Contenedor de Accesos Directos -->
        <div class="card">
            <div class="quick-links">
                <button class="quick-link-btn" data-tab="tab-registro">
                    <span>🚚</span> Nuevo Registro
                </button>
                <button class="quick-link-btn" data-tab="tab-summary">
                    <span>📊</span> Ver Reportes
                </button>
                <button class="quick-link-btn" data-tab="tab-admin">
                    <span>⚙️</span> Administrar Datos
                </button>
            </div>
        </div>
    `;
    
    // HTML para la sección de Registro (con botón "Volver")
    document.getElementById('tab-registro').innerHTML = `
        <button class="btn-back-to-home no-print">🏠 Volver al Panel</button>
        <div class="card">
            <h2 id="formViajeTitulo">🚚 Nuevo Registro de Viaje</h2>
            <form id="transporteForm">
                <input type="hidden" id="indiceEdicion">
                <!-- FORMULARIO EN UNA COLUMNA -->
                <select id="selectNombres" required><option value="">1. Seleccionar Chofer</option></select>
                <select id="selectPlaca" required disabled><option value="">2. Seleccionar Placa</option></select>
                <input type="number" id="volumen" placeholder="Volumen (m³)" step="0.01" readonly required>
                <select id="selectMaterial" required><option value="">3. Seleccionar Material</option></select>
                <input type="date" id="fecha" required>
                <input type="number" id="numViajes" placeholder="# de Viajes" value="1" min="1" required>
                <select id="selectCantera" required><option value="">Seleccionar Cantera</option></select>
                <select id="selectProyecto" required><option value="">Seleccionar Proyecto</option></select>
                <textarea id="observaciones" placeholder="Observaciones (opcional)" rows="3"></textarea>
                
                <div class="form-buttons">
                    <button type="submit" id="btnSubmitViaje" class="btn-primary" style="flex-grow: 1;">Agregar Registro</button>
                    <button type="button" id="btnCancelarEdicion" class="btn-secondary" style="flex-grow: 1;">Cancelar</button>
                </div>
                <p id="formViajeError" class="error-message"></p>
            </form>
        </div>`;
    
    // HTML para la sección de Administración (con botón "Volver")
    document.getElementById('tab-admin').innerHTML = `
        <button class="btn-back-to-home no-print">🏠 Volver al Panel</button>
        <div class="admin-container">
            <div class="admin-sidebar">
                <button data-section="choferes" class="active">👤 Nombres de Choferes</button>
                <button data-section="vehiculos">🚛 Asignar Vehículo</button>
                <button data-section="materiales">💎 Materiales</button>
                <button data-section="canteras">📍 Canteras</button>
                <button data-section="proyectos">🏁 Proyectos</button>
            </div>
            <div id="admin-content" class="admin-content"></div>
        </div>`;
        
    // HTML para la sección de Reportes (con botón "Volver")
    document.getElementById('tab-summary').innerHTML = `
        <button class="btn-back-to-home no-print">🏠 Volver al Panel</button>
        
        <div class="card no-print"> 
            <h2>🔎 Filtrar e Imprimir</h2>
            <div class="filter-form">
                <label for="filtroMes"><strong>Filtrar por Mes:</strong></label><input type="month" id="filtroMes">
                <span style="border-left: 1px solid var(--color-borde); margin: 0 10px;"></span>
                <label for="fechaInicio">Desde:</label><input type="date" id="fechaInicio">
                <label for="fechaFin">Hasta:</label><input type="date" id="fechaFin">
                <label for="filtroMaterial">Material:</label>
                <select id="filtroMaterial"><option value="">-- Todos --</option></select>
                <label for="filtroCantera">Cantera:</label>
                <select id="filtroCantera"><option value="">-- Todas --</option></select>
                <label for="filtroProyecto">Proyecto:</label>
                <select id="filtroProyecto"><option value="">-- Todos --</option></select>
                <label for="filtroChofer">Chofer:</label>
                <select id="filtroChofer"><option value="">-- Todos --</option></select>
                <button id="btnFiltrar" class="btn-primary">Filtrar</button>
                <button id="btnMostrarTodo" class="btn-secondary">Mostrar Todo</button>
                <button id="btnPrint" class="btn-primary">🖨️ Imprimir</button>
                <button id="btnExportarExcel" class="btn-success">📄 Exportar a Excel</button>
            </div>
        </div>

        <div class="card"> 
            {/* COMENTARIO CORRECTAMENTE ELIMINADO */}
            <div class="print-only report-title">TRANSPORTE DE MATERIALES PETREOS</div> 
            <div id="print-filter-summary" class="print-only"></div> 
            <h2 class="no-print">Historial de Viajes</h2>
            <div style="overflow-x:auto;">
                <table id="registrosTabla">
                    <thead><tr><th>Item</th><th>Fecha</th><th>Nombres</th><th>Placa</th><th>Material</th><th>Cantera</th><th>Proyecto</th><th>Observaciones</th><th>Volumen</th><th># Viajes</th><th>Vol. Total</th><th class="action-cell">Acciones</th></tr></thead>
                    <tbody id="registrosBody"></tbody>
                    <tfoot id="registrosTfoot"></tfoot>
                </table>
            </div>
        </div>`;
    
    // HTML para la firma (sección de impresión)
    document.getElementById('signature-section').innerHTML = `<div class="signature-box"><div class="signature-line"></div><p>Ing. Jose L. Macas P.</p><p>Residente de Obra</p></div>`;
};

// Variable global para almacenar los registros filtrados (para exportar)
let registrosFiltrados = [];

// Función para renderizar los registros en la tabla
const renderizarRegistros = (registros) => {
    registrosFiltrados = registros; 

    const registrosBody = document.getElementById('registrosBody');
    const registrosTfoot = document.getElementById('registrosTfoot');

    // Ordenar por fecha descendente
    registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    registrosBody.innerHTML = '';
    registrosTfoot.innerHTML = '';

    if (registros.length === 0) {
        registrosBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 20px;">No se encontraron registros.</td></tr>`;
        return;
    }
    
    let totalViajes = 0;
    let totalVolumen = 0;
    
    registros.forEach((registro, index) => {
        const fila = document.createElement('tr');
        const volumen = parseFloat(registro.volumen) || 0;
        const numViajes = parseInt(registro.numViajes) || 0;
        const volumenTotal = (volumen * numViajes);
        totalViajes += numViajes;
        totalVolumen += volumenTotal;
        fila.innerHTML = `
            <td>${index + 1}</td>
            <td>${registro.fecha}</td>
            <td>${registro.nombres}</td>
            <td>${registro.placa}</td>
            <td>${registro.material || ''}</td>
            <td>${registro.cantera || ''}</td>
            <td>${registro.proyecto || ''}</td>
            <td>${registro.observaciones || ''}</td>
            <td>${volumen.toFixed(2)}</td>
            <td>${numViajes}</td>
            <td><b>${volumenTotal.toFixed(2)}</b></td>
            <td class="action-cell">
                <button title="Modificar" class="action-btn edit-btn" data-id="${registro.id}">✏️</button>
                <button title="Borrar" class="action-btn delete-btn" data-id="${registro.id}">🗑️</button>
            </td>`;
        registrosBody.appendChild(fila);
    });
    
    if (registros.length > 0) {
        const pieDeTabla = document.createElement('tr');
        pieDeTabla.innerHTML = `
            <td colspan="9" style="text-align: right;"><strong>TOTALES:</strong></td>
            <td><strong>${totalViajes}</strong></td>
            <td><strong>${totalVolumen.toFixed(2)}</strong></td>
            <td class="action-cell"></td>`;
        registrosTfoot.appendChild(pieDeTabla);
    }
};

// Función genérica para administrar listas simples (Materiales, Canteras, Proyectos)
const administrarListaSimple = async (collectionName, formId, inputId, listaId, selectIds, nombreSingular) => {
    const form = document.getElementById(formId);
    const inputEl = document.getElementById(inputId);
    const listaUl = document.getElementById(listaId);
    const editIdInput = form.querySelector('.edit-id');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Resetea el formulario de admin
    const resetForm = () => { 
        editIdInput.value = ''; 
        inputEl.value = ''; 
        submitBtn.textContent = 'Agregar'; 
        submitBtn.classList.remove('btn-success');
    };
    
    // Renderiza la lista
    const render = async () => {
        const q = query(collection(db, collectionName));
        const snapshot = await getDocs(q);
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        items.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        listaUl.innerHTML = '';
        
        // Actualiza todos los <select> que usan esta lista
        const selectsToUpdate = Array.from(document.querySelectorAll(selectIds.join(','))).filter(el => el);
        selectsToUpdate.forEach(sel => { 
            const currentValue = sel.value; // Guardar valor actual si existe
            sel.innerHTML = `<option value="">-- Todos --</option>`; // Opción por defecto para filtros
            
            if (sel.id === 'selectMaterial' || sel.id === 'selectCantera' || sel.id === 'selectProyecto') {
                 sel.innerHTML = `<option value="">Seleccionar ${nombreSingular}</option>`; // Opción por defecto para formulario
            } else if (sel.id === 'selectNombres') {
                 sel.innerHTML = `<option value="">1. Seleccionar Chofer</option>`;
            } else if (sel.id === 'selectNombreAdmin') {
                 sel.innerHTML = `<option value="">Seleccionar Chofer</option>`;
            }
            // Para '#filtroChofer', se queda con "-- Todos --", lo cual es correcto.
            
            items.forEach(item => sel.add(new Option(item.nombre, item.nombre)));
            sel.value = currentValue; // Restaurar valor
        });
        
        // Renderiza la lista <ul>
        items.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.nombre}</span>
                <div class="actions">
                    <button class="list-action-btn edit-btn" title="Modificar" data-id="${item.id}" data-nombre="${item.nombre}">✏️</button>
                    <button class="list-action-btn delete-btn" title="Borrar" data-id="${item.id}">🗑️</button>
                </div>`;
            listaUl.appendChild(li);
        });
    };
    
    // Manejador para enviar el formulario (Agregar/Editar)
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const nuevoValor = inputEl.value.trim();
        const idParaEditar = editIdInput.value;
        if (nuevoValor) {
            try {
                if(idParaEditar) { 
                    await updateDoc(doc(db, collectionName, idParaEditar), { nombre: nuevoValor }); 
                } else { 
                    await addDoc(collection(db, collectionName), { nombre: nuevoValor }); 
                }
                resetForm(); 
                await render();
            } catch (error) {
                console.error(`Error al guardar ${nombreSingular}:`, error);
                alert(`Error al guardar ${nombreSingular}.`);
            }
        }
    });
    
    // Manejador para botones (Borrar/Editar) en la lista <ul>
    listaUl.addEventListener('click', async e => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        
        if (target.classList.contains('delete-btn')) {
            if (confirm(`¿Seguro que quieres borrar este ${nombreSingular}?`)) {
                try {
                    await deleteDoc(doc(db, collectionName, id));
                    await render();
                } catch (error) {
                    console.error(`Error al borrar ${nombreSingular}:`, error);
                    alert(`Error al borrar ${nombreSingular}.`);
                }
            }
        } else if (target.classList.contains('edit-btn')) {
            inputEl.value = target.dataset.nombre;
            editIdInput.value = id;
            submitBtn.textContent = 'Guardar';
            submitBtn.classList.add('btn-success');
            inputEl.focus();
        }
    });
    
    await render(); // Carga inicial
};

// Caché para la lista de choferes/vehículos
let choferesVehiculosCache = [];

// Función para administrar la lista de Choferes-Vehículos
const administrarChoferesVehiculos = async () => {
    const form = document.getElementById('choferVehiculoForm');
    const listaUl = document.getElementById('choferesVehiculosLista');
    const editIdInput = form.querySelector('.edit-id');
    const submitBtn = form.querySelector('button[type="submit"]');
    const selectNombreEl = document.getElementById('selectNombreAdmin');
    const nuevaPlacaEl = document.getElementById('nuevaPlaca');
    const nuevoVolumenEl = document.getElementById('nuevoVolumen');

    // Cargar select de choferes
    const qNombres = query(collection(db, "nombresDeChoferes"));
    const snapshotNombres = await getDocs(qNombres);
    selectNombreEl.innerHTML = '<option value="">Seleccionar Chofer</option>';
    snapshotNombres.forEach(doc => selectNombreEl.add(new Option(doc.data().nombre, doc.data().nombre)));

    const resetForm = () => { 
        editIdInput.value = ''; 
        form.reset(); 
        submitBtn.textContent = 'Asignar'; 
        submitBtn.classList.remove('btn-success'); 
    };
    
    // Renderizar lista de vehículos asignados
    const render = async () => {
        const q = query(collection(db, "choferesVehiculos"));
        const snapshot = await getDocs(q);
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        items.sort((a, b) => a.nombre.localeCompare(b.nombre) || a.placa.localeCompare(b.placa));
        
        listaUl.innerHTML = '';
        choferesVehiculosCache = items; // Actualizar caché
        
        items.forEach(chofer => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${chofer.nombre} - ${chofer.placa} (${chofer.volumen} m³)</span>
                <div class="actions">
                    <button class="list-action-btn edit-btn" title="Modificar" data-id="${chofer.id}">✏️</button>
                    <button class="list-action-btn delete-btn" title="Borrar" data-id="${chofer.id}">🗑️</button>
                </div>`;
            listaUl.appendChild(li);
        });
    };
    
    // Manejador para asignar/editar vehículo
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idParaEditar = editIdInput.value;
        const data = { 
            nombre: selectNombreEl.value, 
            placa: nuevaPlacaEl.value.trim().toUpperCase(), 
            volumen: parseFloat(nuevoVolumenEl.value) 
        };
        if (!data.nombre || !data.placa || !data.volumen) {
            alert('Por favor, complete todos los campos.');
            return;
        }
        
        try {
            if(idParaEditar) { 
                await updateDoc(doc(db, "choferesVehiculos", idParaEditar), data); 
            } else { 
                await addDoc(collection(db, "choferesVehiculos"), data); 
            }
            resetForm(); 
            await render();
        } catch (error) {
            console.error("Error al asignar vehículo:", error);
            alert("Error al asignar vehículo.");
        }
    });
    
    // Manejador para botones (Borrar/Editar) en la lista <ul>
    listaUl.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        
        if (target.classList.contains('delete-btn')) {
            if (confirm(`¿Seguro que quieres borrar esta asignación?`)) {
                try {
                    await deleteDoc(doc(db, "choferesVehiculos", id));
                    await render();
                } catch (error) {
                    console.error("Error al borrar asignación:", error);
                    alert("Error al borrar asignación.");
                }
            }
        } else if (target.classList.contains('edit-btn')) {
            const item = choferesVehiculosCache.find(c => c.id === id);
            if(item) {
                selectNombreEl.value = item.nombre;
                nuevaPlacaEl.value = item.placa;
                nuevoVolumenEl.value = item.volumen;
                editIdInput.value = id;
                submitBtn.textContent = 'Guardar';
                submitBtn.classList.add('btn-success');
            }
        }
    });
    
    await render(); // Carga inicial
};

// --- FUNCIÓN DE KPIs MODIFICADA ---
const cargarKPIs = async () => {
    try {
        // 1. Obtener referencias a los elementos del DOM
        const kpiVolumenHoyEl = document.getElementById('kpi-volumen-hoy');
        const kpiVolumenSemanalEl = document.getElementById('kpi-volumen-semanal');
        const kpiVolumenMensualEl = document.getElementById('kpi-volumen-mensual');
        
        if (!kpiVolumenHoyEl || !kpiVolumenSemanalEl || !kpiVolumenMensualEl) {
             console.log("Elementos KPI no encontrados, saltando carga.");
             return;
        }

        // Poner en estado de carga
        kpiVolumenHoyEl.textContent = "Cargando...";
        kpiVolumenSemanalEl.textContent = "Cargando...";
        kpiVolumenMensualEl.textContent = "Cargando...";

        // 2. Definir rangos de fechas
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Hoy
        const hoyStr = formatDate(hoy);

        // Semanal (Domingo a Sábado)
        const diaSemana = hoy.getDay(); // 0 = Domingo
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - diaSemana);
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        
        const inicioSemanaStr = formatDate(inicioSemana);
        const finSemanaStr = formatDate(finSemana);

        // Mensual
        const anio = hoy.getFullYear();
        const mes = hoy.getMonth();
        const inicioMes = new Date(anio, mes, 1);
        const finMes = new Date(anio, mes + 1, 0); // Día 0 del prox mes
        
        const inicioMesStr = formatDate(inicioMes);
        const finMesStr = formatDate(finMes);

        // 3. Crear función para sumar volumen
        const calcularVolumen = (snapshot) => {
            let volumenTotal = 0;
            snapshot.forEach(doc => {
                const registro = doc.data();
                const numViajes = parseInt(registro.numViajes) || 0;
                const volumen = parseFloat(registro.volumen) || 0;
                volumenTotal += (volumen * numViajes);
            });
            return volumenTotal;
        };

        // 4. Ejecutar Queries
        
        // Query Hoy
        const qHoy = query(collection(db, "registros"), where("fecha", "==", hoyStr));
        const snapshotHoy = await getDocs(qHoy);
        kpiVolumenHoyEl.textContent = calcularVolumen(snapshotHoy).toFixed(2);
        
        // Query Semanal
        const qSemana = query(collection(db, "registros"), 
                            where("fecha", ">=", inicioSemanaStr), 
                            where("fecha", "<=", finSemanaStr));
        const snapshotSemana = await getDocs(qSemana);
        kpiVolumenSemanalEl.textContent = calcularVolumen(snapshotSemana).toFixed(2);

        // Query Mensual
        const qMes = query(collection(db, "registros"), 
                         where("fecha", ">=", inicioMesStr), 
                         where("fecha", "<=", finMesStr));
        const snapshotMes = await getDocs(qMes);
        kpiVolumenMensualEl.textContent = calcularVolumen(snapshotMes).toFixed(2);
        
    } catch (error) {
        console.error("Error al cargar KPIs:", error);
        if(document.getElementById('kpi-volumen-hoy')) document.getElementById('kpi-volumen-hoy').textContent = "Error";
        if(document.getElementById('kpi-volumen-semanal')) document.getElementById('kpi-volumen-semanal').textContent = "Error";
        if(document.getElementById('kpi-volumen-mensual')) document.getElementById('kpi-volumen-mensual').textContent = "Error";
    }
};

// Función principal de inicialización de la app
const inicializarApp = async () => {
    // 1. Cargar todo el HTML de las secciones
    cargarContenidoHTML();

    // 2. Poner fecha de hoy en el formulario de registro
    document.getElementById('fecha').value = getTodayDate();

    // 3. Configurar botón de Cerrar Sesión
    document.getElementById('btnLogout').addEventListener('click', () => signOut(auth).catch((error) => console.error("Error al cerrar sesión", error)));
    
    // 4. Obtener referencias a elementos del DOM
    const transporteForm = document.getElementById('transporteForm');
    const selectNombres = document.getElementById('selectNombres');
    const selectPlaca = document.getElementById('selectPlaca');
    const volumenInput = document.getElementById('volumen');
    const indiceEdicionInput = document.getElementById('indiceEdicion');
    const formViajeTitulo = document.getElementById('formViajeTitulo');
    const btnSubmitViaje = document.getElementById('btnSubmitViaje');
    const formViajeError = document.getElementById('formViajeError');
    
    const adminContent = document.getElementById('admin-content');
    const adminSidebarButtons = document.querySelectorAll('.admin-sidebar button');

    // 5. Definir las secciones de Administración
    const adminSections = {
        choferes: {
            html: `<div class="card"><h2>👤 Nombres de Choferes</h2><form id="nombreChoferForm"><input type="hidden" class="edit-id"><input type="text" id="nuevoNombreChofer" placeholder="Nombre y Apellido" required><button type="submit" class="btn-primary">Agregar</button></form><ul id="nombresChoferesLista"></ul></div>`,
            loader: () => administrarListaSimple('nombresDeChoferes', 'nombreChoferForm', 'nuevoNombreChofer', 'nombresChoferesLista', ['#selectNombreAdmin', '#selectNombres', '#filtroChofer'], 'Nombre de Chofer')
        },
        vehiculos: {
            html: `<div class="card"><h2>🚛 Asignar Vehículo</h2><form id="choferVehiculoForm"><input type="hidden" class="edit-id"><select id="selectNombreAdmin" required><option value="">Seleccionar Chofer</option></select><input type="text" id="nuevaPlaca" placeholder="Placa" required><input type="number" id="nuevoVolumen" placeholder="Volumen (m³)" step="0.01" required><button type="submit" class="btn-primary">Asignar</button></form><ul id="choferesVehiculosLista"></ul></div>`,
            loader: administrarChoferesVehiculos
        },
        materiales: {
            html: `<div class="card"><h2>💎 Materiales</h2><form id="materialForm"><input type="hidden" class="edit-id"><input type="text" id="nuevoMaterial" placeholder="Nombre" required><button type="submit" class="btn-primary">Agregar</button></form><ul id="materialesLista"></ul></div>`,
            loader: () => administrarListaSimple('materiales', 'materialForm', 'nuevoMaterial', 'materialesLista', ['#selectMaterial', '#filtroMaterial'], 'Material')
        },
        canteras: {
            html: `<div class="card"><h2>📍 Canteras</h2><form id="canteraForm"><input type="hidden" class="edit-id"><input type="text" id="nuevaCantera" placeholder="Nombre" required><button type="submit" class="btn-primary">Agregar</button></form><ul id="canterasLista"></ul></div>`,
            loader: () => administrarListaSimple('canteras', 'canteraForm', 'nuevaCantera', 'canterasLista', ['#selectCantera', '#filtroCantera'], 'Cantera')
        },
        proyectos: {
            html: `<div class="card"><h2>🏁 Proyectos</h2><form id="proyectoForm"><input type="hidden" class="edit-id"><input type="text" id="nuevoProyecto" placeholder="Nombre" required><button type="submit" class="btn-primary">Agregar</button></form><ul id="proyectosLista"></ul></div>`,
            loader: () => administrarListaSimple('proyectos', 'proyectoForm', 'nuevoProyecto', 'proyectosLista', ['#selectProyecto', '#filtroProyecto'], 'Proyecto')
        }
    };

    // 6. Lógica para mostrar secciones de Administración
    const showAdminSection = (sectionName) => {
        if (!adminSections[sectionName]) return;
        adminSidebarButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.section === sectionName));
        adminContent.innerHTML = adminSections[sectionName].html;
        adminSections[sectionName].loader();
    };

    adminSidebarButtons.forEach(button => button.addEventListener('click', () => showAdminSection(button.dataset.section)));
    showAdminSection('choferes'); // Mostrar la primera sección por defecto

    // 7. Función para cargar registros en la tabla de reportes
    const cargarRegistros = async (filtros = []) => {
        const registrosBody = document.getElementById('registrosBody');
        registrosBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 20px;">Cargando registros...</td></tr>`;
        document.getElementById('registrosTfoot').innerHTML = '';

        let q = query(collection(db, "registros"));
        if (filtros.length > 0) { 
            q = query(collection(db, "registros"), ...filtros); 
        }
        try {
            const snapshot = await getDocs(q);
            const registrosData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            renderizarRegistros(registrosData);
        } catch (error) {
            console.error("Error al cargar registros:", error);
            registrosBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 20px; color: var(--color-error);">Error al cargar registros.</td></tr>`;
        }
    };
    
    // 8. Lógica para manejar el "clic" en las pestañas (ocultas)
    // Esto es lo que permite que los Accesos Directos funcionen
    const allTabs = document.querySelectorAll('.tab-button');
    const allTabContents = document.querySelectorAll('.tab-content');
    
    allTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            allTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            allTabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
            
            // Si volvemos al inicio, recargar KPIs
            if (tab.dataset.tab === 'tab-inicio') {
                cargarKPIs();
            }
        });
    });

    // 9. Lógica para los filtros de Reportes
    document.getElementById('btnPrint').addEventListener('click', () => {
        const fechaInicio = document.getElementById('fechaInicio').value;
        const fechaFin = document.getElementById('fechaFin').value;
        const material = document.getElementById('filtroMaterial').value;
        const cantera = document.getElementById('filtroCantera').value;
        const proyecto = document.getElementById('filtroProyecto').value;
        const chofer = document.getElementById('filtroChofer').value;
        const filtroMes = document.getElementById('filtroMes').value;
        let filtrosUsados = [];
        if (filtroMes) {
            const [year, month] = filtroMes.split('-');
            filtrosUsados.push(`<strong>Mes:</strong> ${month}/${year}`);
        } else if (fechaInicio || fechaFin) {
            if (fechaInicio && fechaFin) {
                filtrosUsados.push(`<strong>Fechas:</strong> ${fechaInicio} al ${fechaFin}`);
            } else if (fechaInicio) {
                filtrosUsados.push(`<strong>Desde:</strong> ${fechaInicio}`);
            } else if (fechaFin) {
                filtrosUsados.push(`<strong>Hasta:</strong> ${fechaFin}`);
            }
        }
        if (material) { filtrosUsados.push(`<strong>Material:</strong> ${material}`); }
        if (cantera) { filtrosUsados.push(`<strong>Cantera:</strong> ${cantera}`); }
        if (proyecto) { filtrosUsados.push(`<strong>Proyecto:</strong> ${proyecto}`); }
        if (chofer) { filtrosUsados.push(`<strong>Chofer:</strong> ${chofer}`); }
        const resumenContainer = document.getElementById('print-filter-summary');
        if (filtrosUsados.length > 0) {
            resumenContainer.innerHTML = '<i>Filtros Aplicados: &nbsp; ' + filtrosUsados.join(' &nbsp; | &nbsp; ') + '</i>';
        } else {
            resumenContainer.innerHTML = '<i>Mostrando todos los registros (sin filtros)</i>';
        }
        window.print();
    });
    
    document.getElementById('btnExportarExcel').addEventListener('click', () => {
        if (registrosFiltrados.length === 0) {
            alert("No hay datos para exportar. Por favor, realiza una búsqueda primero.");
            return;
        }
        const tablaOriginal = document.getElementById('registrosTabla');
        const tablaClonada = tablaOriginal.cloneNode(true);
        Array.from(tablaClonada.querySelectorAll('.action-cell')).forEach(celda => celda.remove());
        const hojaDeCalculo = XLSX.utils.table_to_sheet(tablaClonada, {raw: true});
        hojaDeCalculo['!cols'] = [ { wch: 5 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 } ];
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, hojaDeCalculo, 'Reporte');
        const nombreArchivo = `Reporte_Transporte_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(libro, nombreArchivo);
    });

    document.getElementById('filtroMes').addEventListener('change', () => {
        const mesSeleccionado = document.getElementById('filtroMes').value;
        if (!mesSeleccionado) {
            document.getElementById('fechaInicio').value = '';
            document.getElementById('fechaFin').value = '';
            return;
        }
        const [year, month] = mesSeleccionado.split('-').map(Number);
        const primerDia = new Date(year, month - 1, 1);
        const ultimoDia = new Date(year, month, 0);
        document.getElementById('fechaInicio').value = formatDate(primerDia);
        document.getElementById('fechaFin').value = formatDate(ultimoDia);
        document.getElementById('btnFiltrar').click();
    });

    document.getElementById('btnFiltrar').addEventListener('click', () => {
        const fechaInicio = document.getElementById('fechaInicio').value;
        const fechaFin = document.getElementById('fechaFin').value;
        const material = document.getElementById('filtroMaterial').value;
        const cantera = document.getElementById('filtroCantera').value;
        const proyecto = document.getElementById('filtroProyecto').value;
        const chofer = document.getElementById('filtroChofer').value;
        let filtros = [];
        if (fechaInicio) filtros.push(where("fecha", ">=", fechaInicio));
        if (fechaFin) filtros.push(where("fecha", "<=", fechaFin));
        if (material) filtros.push(where("material", "==", material));
        if (cantera) filtros.push(where("cantera", "==", cantera));
        if (proyecto) filtros.push(where("proyecto", "==", proyecto));
        if (chofer) filtros.push(where("nombres", "==", chofer));
        cargarRegistros(filtros);
    });

    document.getElementById('btnMostrarTodo').addEventListener('click', () => {
        document.getElementById('filtroMes').value = '';
        document.getElementById('fechaInicio').value = '';
        document.getElementById('fechaFin').value = '';
        document.getElementById('filtroMaterial').selectedIndex = 0;
        document.getElementById('filtroCantera').selectedIndex = 0;
        document.getElementById('filtroProyecto').selectedIndex = 0;
        document.getElementById('filtroChofer').selectedIndex = 0;
        cargarRegistros();
    });

    // 10. Lógica del formulario de Registro
    selectNombres.addEventListener('change', async () => {
        const nombreSeleccionado = selectNombres.value;
        selectPlaca.innerHTML = '<option value="">2. Seleccionar Placa</option>';
        volumenInput.value = '';
        
        const q = query(collection(db, "choferesVehiculos"), where("nombre", "==", nombreSeleccionado));
        const snapshot = await getDocs(q);
        const vehiculosDelChofer = [];
        snapshot.forEach(doc => vehiculosDelChofer.push(doc.data()));

        if (nombreSeleccionado) {
            vehiculosDelChofer.forEach(v => {
                const option = new Option(`${v.placa} (${v.volumen} m³)`, v.placa);
                option.dataset.volumen = v.volumen;
                selectPlaca.add(option);
            });
            selectPlaca.disabled = false;
        } else { 
            selectPlaca.disabled = true; 
        }
    });
    
    // Cargar selects del formulario de registro
    // Nota: La carga de "selectNombres" se hace desde administrarListaSimple('nombresDeChoferes'...)
    poblarSelects('materiales', 'selectMaterial');
    poblarSelects('canteras', 'selectCantera');
    poblarSelects('proyectos', 'selectProyecto');
    
    // Cargar selects de los filtros de reportes
    poblarSelects('materiales', 'filtroMaterial');
    poblarSelects('canteras', 'filtroCantera');
    poblarSelects('proyectos', 'filtroProyecto');
    // Nota: "filtroChofer" se puebla desde administrarListaSimple('nombresDeChoferes'...)

    // Función helper para poblar selects (usada arriba)
    async function poblarSelects(collectionName, selectId) {
        try {
            const selectEl = document.getElementById(selectId);
            const q = query(collection(db, collectionName));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => selectEl.add(new Option(doc.data().nombre, doc.data().nombre)));
        } catch (error) {
            console.error(`Error poblando select ${selectId}:`, error);
        }
    }

    selectPlaca.addEventListener('change', () => {
        const selectedOption = selectPlaca.options[selectPlaca.selectedIndex];
        volumenInput.value = selectedOption.dataset.volumen || '';
    });

    const cancelarEdicion = () => {
        formViajeTitulo.textContent = '🚚 Nuevo Registro de Viaje';
        indiceEdicionInput.value = '';
        transporteForm.reset();
        document.getElementById('fecha').value = getTodayDate();
        selectPlaca.innerHTML = '<option value="">2. Seleccionar Placa</option>';
        selectPlaca.disabled = true;
        btnSubmitViaje.textContent = 'Agregar Registro';
        btnSubmitViaje.classList.replace('btn-success', 'btn-primary');
        document.getElementById('btnCancelarEdicion').style.display = 'none';
        formViajeError.textContent = '';
    };
    document.getElementById('btnCancelarEdicion').addEventListener('click', cancelarEdicion);

    // 11. Lógica de la tabla de Reportes (Editar/Borrar)
    document.getElementById('registrosBody').addEventListener('click', async e => {
        const target = e.target.closest('button');
        if (!target) return;
        const docId = target.dataset.id;
        
        if (target.classList.contains('delete-btn')) {
            if (confirm(`¿Seguro que quieres borrar este viaje?`)) {
                try {
                    await deleteDoc(doc(db, "registros", docId));
                    await cargarRegistros(); // Recargar tabla
                    await cargarKPIs(); // Recargar estadísticas
                } catch (error) {
                    console.error("Error al borrar registro:", error);
                    alert("Error al borrar registro.");
                }
            }
        } else if (target.classList.contains('edit-btn')) {
            try {
                const docSnap = await getDoc(doc(db, "registros", docId));
                if (docSnap.exists()) {
                    const registroAEditar = docSnap.data();
                    
                    // Simula clic en la pestaña "Registro" (oculta)
                    document.querySelector('.tab-button[data-tab="tab-registro"]').click();
                    
                    formViajeTitulo.textContent = `✍️ Modificando Viaje`;
                    indiceEdicionInput.value = docId;
                    selectNombres.value = registroAEditar.nombres;
                    // Disparar 'change' para cargar vehículos
                    selectNombres.dispatchEvent(new Event('change')); 
                    
                    // Esperar a que se carguen los vehículos antes de seleccionar uno
                    setTimeout(() => {
                        selectPlaca.value = registroAEditar.placa;
                        selectPlaca.dispatchEvent(new Event('change')); // Cargar volumen
                        document.getElementById('fecha').value = registroAEditar.fecha;
                        document.getElementById('selectMaterial').value = registroAEditar.material;
                        document.getElementById('selectCantera').value = registroAEditar.cantera;
                        document.getElementById('selectProyecto').value = registroAEditar.proyecto;
                        document.getElementById('numViajes').value = registroAEditar.numViajes;
                        document.getElementById('observaciones').value = registroAEditar.observaciones || '';
                    }, 200); // 200ms de espera
                    
                    btnSubmitViaje.textContent = 'Guardar Cambios';
                    btnSubmitViaje.classList.replace('btn-primary', 'btn-success');
                    document.getElementById('btnCancelarEdicion').style.display = 'block';
                    window.scrollTo(0, 0); // Subir al inicio de la página
                }
            } catch (error) {
                console.error("Error al obtener registro para editar:", error);
                alert("Error al cargar datos para editar.");
            }
        }
    });

    // 12. Lógica para Enviar Formulario de Registro
    transporteForm.addEventListener('submit', async e => {
        e.preventDefault();
        formViajeError.textContent = '';
        
        const btn = btnSubmitViaje;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Guardando...';
        
        try {
            const idParaEditar = indiceEdicionInput.value;
            const registro = {
                fecha: document.getElementById('fecha').value,
                nombres: selectNombres.value,
                placa: selectPlaca.value,
                material: document.getElementById('selectMaterial').value,
                volumen: volumenInput.value,
                numViajes: document.getElementById('numViajes').value,
                cantera: document.getElementById('selectCantera').value,
                proyecto: document.getElementById('selectProyecto').value,
                observaciones: document.getElementById('observaciones').value
            };
            
            // Validación mejorada
            if (!registro.nombres || !registro.placa || !registro.material || !registro.fecha || !registro.volumen || !registro.numViajes || !registro.cantera || !registro.proyecto) {
                formViajeError.textContent = 'Por favor, complete todos los campos requeridos.';
                btn.disabled = false;
                btn.textContent = originalText;
                return;
            }
            
            if (idParaEditar) { 
                await updateDoc(doc(db, "registros", idParaEditar), registro); 
            } else { 
                await addDoc(collection(db, "registros"), registro); 
            }
            
            await cargarRegistros(); // Recargar tabla
            await cargarKPIs(); // Recargar estadísticas
            cancelarEdicion();
            
            // Volver al panel de inicio después de guardar
            document.querySelector('.tab-button[data-tab="tab-inicio"]').click();
            
        } catch (error) {
            console.error("Error al guardar el registro:", error);
            formViajeError.textContent = 'Hubo un error al guardar el registro.';
        } finally {
            btn.disabled = false;
            if (!indiceEdicionInput.value) {
                btn.textContent = 'Agregar Registro';
            } else {
                btn.textContent = 'Guardar Cambios';
            }
        }
    });
    
    // 13. Lógica para Accesos Directos
    document.querySelectorAll('.quick-link-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            const tabButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
            if (tabButton) {
                tabButton.click(); // Simula clic en la pestaña oculta
            }
        });
    });

    // 14. Lógica para botones "Volver"
    document.querySelectorAll('.btn-back-to-home').forEach(btn => {
        btn.addEventListener('click', () => {
            // Simula clic en la pestaña "Inicio" (oculta)
            const tabButton = document.querySelector(`.tab-button[data-tab="tab-inicio"]`);
            if (tabButton) {
                tabButton.click();
            }
        });
    });

    // 15. Carga inicial de datos
    await cargarRegistros();
    await cargarKPIs();
};

