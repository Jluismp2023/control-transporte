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

// Variable global para almacenar los registros filtrados (para exportar)
let registrosFiltrados = [];

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

// =========================================================================
// LÓGICA DE ROLES
// =========================================================================

// Configuración de roles
const ADMIN_EMAILS = ['admin@obreco.com', 'otroadmin@obreco.com']; // Ejemplo de administradores
const OBSERVER_EMAIL = 'obreco@observador.com';

const getUserRole = (user) => {
    if (!user) return 'guest';
    if (ADMIN_EMAILS.includes(user.email)) return 'admin';
    if (user.email === OBSERVER_EMAIL) return 'observer';
    return 'user';
};

// =========================================================================
// FIN LÓGICA DE ROLES
// =========================================================================


// Comprobar estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Si no hay usuario, redirigir a login
        window.location.href = 'login.html';
    } else {
        // Si hay usuario, mostrar la app e inicializar
        document.body.style.display = 'block';
        inicializarApp(user);
    }
});


// =========================================================================
// FUNCIONES GLOBALES DE MANEJO DE DATOS
// =========================================================================

// Función para renderizar los registros en la tabla
const renderizarRegistros = (registros) => {
    registrosFiltrados = registros; 

    const registrosBody = document.getElementById('registrosBody');
    const registrosTfoot = document.getElementById('registrosTfoot');
    const userRole = getUserRole(auth.currentUser); // Obtener rol para ocultar/mostrar acciones

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
                ${userRole !== 'observer' ? `<button title="Modificar" class="action-btn edit-btn" data-id="${registro.id}">✏️</button>
                <button title="Borrar" class="action-btn delete-btn" data-id="${registro.id}">🗑️</button>` : ''}
            </td>`;
        registrosBody.appendChild(fila);
    });
    
    // Ocultar la columna de acciones si el usuario es observador
    const tabla = document.getElementById('registrosTabla');
    if (tabla) {
        const accionesHeader = tabla.querySelector('th:last-child');
        if (accionesHeader && userRole === 'observer') {
            accionesHeader.classList.add('no-print');
        } else if (accionesHeader) {
            accionesHeader.classList.remove('no-print');
        }
    }


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

// Función para cargar registros en la tabla de reportes
const cargarRegistros = async (filtros = []) => {
    const registrosBody = document.getElementById('registrosBody');
    // Asegurarse de que el elemento exista antes de intentar manipularlo
    if (!registrosBody) return; 

    registrosBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 20px;">Cargando registros...</td></tr>`;
    const registrosTfoot = document.getElementById('registrosTfoot');
    if (registrosTfoot) registrosTfoot.innerHTML = '';

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

// Función para calcular y mostrar el resumen analítico
const cargarResumenAnalitico = async (filtrosAnaliticos = []) => {
    const errorEl = document.getElementById('analitics-error');
    if (!errorEl) return;
    
    errorEl.textContent = 'Cargando datos analíticos...';

    const tablaProyectoMaterial = document.getElementById('tablaProyectoMaterial');
    const tablaMateriales = document.getElementById('tablaMateriales');
    const tablaChoferes = document.getElementById('tablaChoferes');
    
    // Inicializar tablas con mensaje de carga
    const generarCarga = (titulo1, titulo2 = "Volumen Total (m³)") => `<thead><tr><th>${titulo1}</th><th>${titulo2}</th><th># Viajes</th></tr></thead><tbody><tr><td colspan="3" style="text-align:center;">Cargando...</td></tr></tbody>`;
    if (tablaProyectoMaterial) tablaProyectoMaterial.innerHTML = generarCarga("Proyecto / Material");
    if (tablaMateriales) tablaMateriales.innerHTML = generarCarga("Material");
    if (tablaChoferes) tablaChoferes.innerHTML = generarCarga("Chofer");
    
    try {
        // Ejecutar la consulta con los filtros de Reportes
        let q = query(collection(db, "registros"));
        if (filtrosAnaliticos.length > 0) { 
            q = query(collection(db, "registros"), ...filtrosAnaliticos); 
        }
        
        const snapshot = await getDocs(q);
        const registros = snapshot.docs.map(doc => doc.data());
        
        if (registros.length === 0) {
            errorEl.textContent = 'No hay registros de viajes para analizar con los filtros actuales.';
            const sinDatos = (titulo) => generarCarga(titulo).replace('Cargando...', 'Sin datos');
            if (tablaProyectoMaterial) tablaProyectoMaterial.innerHTML = sinDatos("Proyecto / Material");
            if (tablaMateriales) tablaMateriales.innerHTML = sinDatos("Material");
            if (tablaChoferes) tablaChoferes.innerHTML = sinDatos("Chofer");
            return;
        }

        // --- LÓGICA DE AGRUPACIÓN ANIDADA (Proyecto vs Material) ---
        const agruparProyectoMaterial = (data) => {
            if (!tablaProyectoMaterial) return;

            const resumen = data.reduce((acc, registro) => {
                const proyectoKey = registro.proyecto || 'SIN PROYECTO';
                const materialKey = registro.material || 'SIN MATERIAL';
                const volumen = parseFloat(registro.volumen) || 0;
                const numViajes = parseInt(registro.numViajes) || 0;
                const volumenTotal = volumen * numViajes;

                if (!acc[proyectoKey]) {
                    acc[proyectoKey] = { 
                        totalVolumen: 0, 
                        totalViajes: 0, 
                        materiales: {} 
                    };
                }
                
                if (!acc[proyectoKey].materiales[materialKey]) {
                    acc[proyectoKey].materiales[materialKey] = { volumen: 0, viajes: 0 };
                }

                acc[proyectoKey].materiales[materialKey].volumen += volumenTotal;
                acc[proyectoKey].materiales[materialKey].viajes += numViajes;
                acc[proyectoKey].totalVolumen += volumenTotal;
                acc[proyectoKey].totalViajes += numViajes;
                
                return acc;
            }, {});
            
            let html = `<thead><tr><th>Proyecto / Material</th><th>Volumen Total (m³)</th><th># Viajes</th></tr></thead><tbody>`;
            
            const proyectosOrdenados = Object.entries(resumen)
                .sort(([, a], [, b]) => b.totalVolumen - a.totalVolumen);

            let totalGeneralVolumen = 0;
            let totalGeneralViajes = 0;

            proyectosOrdenados.forEach(([proyecto, datos]) => {
                html += `<tr class="analitics-group-header"><td colspan="3"><strong>🏁 ${proyecto}</strong></td></tr>`;
                
                const materialesOrdenados = Object.entries(datos.materiales)
                    .sort(([, a], [, b]) => b.volumen - a.volumen);
                    
                materialesOrdenados.forEach(([material, value]) => {
                    html += `
                        <tr class="analitics-sub-item">
                            <td>— ${material}</td>
                            <td style="text-align:right;">${value.volumen.toFixed(2)}</td>
                            <td style="text-align:center;">${value.viajes}</td>
                        </tr>
                    `;
                });
                
                html += `
                    <tr class="analitics-sub-total">
                        <td><strong>Subtotal ${proyecto}</strong></td>
                        <td style="text-align:right;"><strong>${datos.totalVolumen.toFixed(2)}</strong></td>
                        <td style="text-align:center;"><strong>${datos.totalViajes}</strong></td>
                    </tr>
                `;
                totalGeneralVolumen += datos.totalVolumen;
                totalGeneralViajes += datos.totalViajes;
            });
            
            // Fila de totales
            html += `
                <tr class="analitics-total">
                    <td><strong>TOTAL GENERAL</strong></td>
                    <td style="text-align:right;"><strong>${totalGeneralVolumen.toFixed(2)}</strong></td>
                    <td style="text-align:center;"><strong>${totalGeneralViajes}</strong></td>
                </tr>
            `;

            html += `</tbody>`;
            tablaProyectoMaterial.innerHTML = html;
        };
        
        // Función general de agrupación simple (mantener para Chofer y Material)
        const agruparYRenderizarSimple = (data, campoAgrupacion, tablaElemento, tituloColumna) => {
            if (!tablaElemento) return;

            const resumen = data.reduce((acc, registro) => {
                const key = registro[campoAgrupacion] || 'SIN ESPECIFICAR';
                const volumen = parseFloat(registro.volumen) || 0;
                const numViajes = parseInt(registro.numViajes) || 0;
                const volumenTotal = volumen * numViajes;

                if (!acc[key]) {
                    acc[key] = { volumen: 0, viajes: 0 };
                }
                acc[key].volumen += volumenTotal;
                acc[key].viajes += numViajes;
                return acc;
            }, {});

            let html = `<thead><tr><th>${tituloColumna}</th><th>Volumen Total (m³)</th><th># Viajes</th></tr></thead><tbody>`;
            
            // Ordenar por volumen total descendente
            const itemsOrdenados = Object.entries(resumen)
                .sort(([, a], [, b]) => b.volumen - a.volumen);
            
            itemsOrdenados.forEach(([key, value]) => {
                html += `
                    <tr>
                        <td>${key}</td>
                        <td style="text-align:right;">${value.volumen.toFixed(2)}</td>
                        <td style="text-align:center;">${value.viajes}</td>
                    </tr>
                `;
            });

            // Fila de totales
            const totalVolumenGlobal = itemsOrdenados.reduce((sum, [, v]) => sum + v.volumen, 0);
            const totalViajesGlobal = itemsOrdenados.reduce((sum, [, v]) => sum + v.viajes, 0);

            html += `
                <tr class="analitics-total">
                    <td><strong>TOTAL GENERAL</strong></td>
                    <td style="text-align:right;"><strong>${totalVolumenGlobal.toFixed(2)}</strong></td>
                    <td style="text-align:center;"><strong>${totalViajesGlobal}</strong></td>
                </tr>
            `;

            html += `</tbody>`;
            tablaElemento.innerHTML = html;
        };

        // 1. Por Proyecto vs Material (Anidado)
        agruparProyectoMaterial(registros);

        // 2. Por Material (Simple)
        agruparYRenderizarSimple(registros, 'material', tablaMateriales, 'Material');

        // 3. Por Chofer (Simple)
        agruparYRenderizarSimple(registros, 'nombres', tablaChoferes, 'Chofer');
        
        errorEl.textContent = 'Datos analíticos cargados.'; 

    } catch (error) {
        console.error("Error al cargar resumen analítico:", error);
        errorEl.textContent = 'Error al cargar los datos analíticos. Revise la consola para detalles.';
    }
};


// Función para cargar el HTML dinámico de las secciones (Volumen de Hoy ELIMINADO y Botón Excel ELIMINADO)
const cargarContenidoHTML = () => {
    
    // Obtener rol actual para decidir qué contenido cargar
    const userRole = getUserRole(auth.currentUser);
    const isAdminOrUser = userRole !== 'observer'; 
    const isObserver = userRole === 'observer'; // Para simplificar la lógica

    // HTML para el Panel de Inicio (Solo Volumen Semanal y Mensual)
    document.getElementById('tab-inicio').innerHTML = `
        
        <div class="kpi-container">
            <div class="kpi-card">
                <h3>Volumen Semanal (m³)</h3>
                <p id="kpi-volumen-semanal">Cargando...</p>
            </div>
            <div class="kpi-card">
                <h3>Volumen Mensual (m³)</h3>
                <p id="kpi-volumen-mensual">Cargando...</p>
            </div>
        </div>

        <div class="card">
            <div class="quick-links">
                ${!isObserver ? `
                <button class="quick-link-btn" data-tab="tab-registro">
                    <span>🚚</span> Registro
                </button>` : ''}
                <button class="quick-link-btn" data-tab="tab-summary">
                    <span>📊</span> Reportes
                </button>
                ${isAdminOrUser ? `
                <button class="quick-link-btn" data-tab="tab-admin">
                    <span>⚙️</span> BD
                </button>` : ''}
                <button class="quick-link-btn" data-tab="tab-analytics">
                    <span>📈</span> Análisis
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
    
    // HTML para la sección de Administración (Oculta para Observador)
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
        
    // HTML para la sección de Reportes (Botón Exportar ELIMINADO)
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
                <select id="filtroCantera"><option value="">-- Todos --</option></select>
                <label for="filtroProyecto">Proyecto:</label>
                <select id="filtroProyecto"><option value="">-- Todos --</option></select>
                <label for="filtroChofer">Chofer:</label>
                <select id="filtroChofer"><option value="">-- Todos --</option></select>
                <button id="btnFiltrar" class="btn-primary">Filtrar</button>
                <button id="btnMostrarTodo" class="btn-secondary">Mostrar Todo</button>
                <button id="btnPrint" class="btn-primary">🖨️ Imprimir</button>
            </div>
        </div>

        <div class="card"> 
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
    
    // --- NUEVO HTML PARA ANÁLISIS (Texto descriptivo eliminado) ---
    document.getElementById('tab-analytics').innerHTML = `
        <button class="btn-back-to-home no-print">🏠 Volver al Panel</button>
        <div class="card">
            <h2>📈 Resumen Analítico de Transporte</h2>
            
            <div class="analitics-section" style="grid-column: 1 / -1; margin-bottom: 20px;">
                <h3>🏁 Proyectos vs. Materiales Suministrados</h3>
                <div style="overflow-x:auto;">
                    <table class="analitics-table" id="tablaProyectoMaterial"></table>
                </div>
            </div>
            <div class="analitics-container">
                <div class="analitics-section">
                    <h3>💎 Por Material</h3>
                    <div style="overflow-x:auto;">
                        <table class="analitics-table" id="tablaMateriales"></table>
                    </div>
                </div>
                <div class="analitics-section">
                    <h3>👤 Por Chofer</h3>
                    <div style="overflow-x:auto;">
                        <table class="analitics-table" id="tablaChoferes"></table>
                    </div>
                </div>
            </div>
            <p id="analitics-error" class="error-message"></p>
        </div>
    `;

    // HTML para la firma (sección de impresión)
    document.getElementById('signature-section').innerHTML = `<div class="signature-box"><div class="signature-line"></div><p>Ing. Jose L. Macas P.</p><p>Residente de Obra</p></div>`;
};

// Función genérica para administrar listas simples (Materiales, Canteras, Proyectos, Nombres de Choferes)
const administrarListaSimple = async (collectionName, formId, inputId, listaId, selectIds, nombreSingular) => {
    const form = document.getElementById(formId);
    const inputEl = document.getElementById(inputId);
    const listaUl = document.getElementById(listaId);
    const editIdInput = form.querySelector('.edit-id');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    const userRole = getUserRole(auth.currentUser);

    // Resetea el formulario de admin
    const resetForm = () => { 
        editIdInput.value = ''; 
        inputEl.value = ''; 
        submitBtn.textContent = 'Agregar'; 
        submitBtn.classList.remove('btn-success');
        delete inputEl.dataset.nombreAntiguo; // Limpiar nombre antiguo
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
            // Si es un filtro, la primera opción es "Todos"
            if (sel.id.startsWith('filtro')) {
                sel.innerHTML = `<option value="">-- Todos --</option>`;
            } else {
                // Si es el formulario de registro/admin, la primera opción es de selección
                sel.innerHTML = `<option value="">Seleccionar ${nombreSingular}</option>`;
            }
            if (sel.id === 'selectNombres') {
                 sel.innerHTML = `<option value="">1. Seleccionar Chofer</option>`;
            } else if (sel.id === 'selectNombreAdmin') {
                 sel.innerHTML = `<option value="">Seleccionar Chofer</option>`;
            }
            
            items.forEach(item => sel.add(new Option(item.nombre, item.nombre)));
            sel.value = currentValue; // Restaurar valor
        });
        
        // Renderiza la lista <ul>
        items.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.nombre}</span>
                <div class="actions">
                    ${userRole !== 'observer' ? `
                    <button class="list-action-btn edit-btn" title="Modificar" data-id="${item.id}" data-nombre="${item.nombre}">✏️</button>
                    <button class="list-action-btn delete-btn" title="Borrar" data-id="${item.id}">🗑️</button>
                    ` : '<span style="color: gray;">(Solo lectura)</span>'}
                </div>`;
            listaUl.appendChild(li);
        });
        
        // Deshabilitar formulario si es observador
        if (userRole === 'observer') {
            Array.from(form.elements).forEach(element => {
                element.disabled = true;
            });
            submitBtn.textContent = 'Acceso Denegado (Observador)';
            submitBtn.disabled = true;
        }
    };
    
    // Manejador para enviar el formulario (Agregar/Editar)
    form.addEventListener('submit', async e => {
        e.preventDefault();
        
        // BLOQUEO DE ESCRITURA
        if (userRole === 'observer') {
            alert("Acceso denegado. Los usuarios observadores no pueden modificar datos en la Base de Datos.");
            return;
        }
        
        const nuevoValor = inputEl.value.trim();
        const idParaEditar = editIdInput.value;
        const nombreAntiguo = inputEl.dataset.nombreAntiguo; // Recuperamos el nombre anterior
        
        if (nuevoValor) {
            try {
                if(idParaEditar) { 
                    // --- LÓGICA DE ACTUALIZACIÓN MASIVA (MEJORA DE CONSISTENCIA DE DATOS) ---
                    await updateDoc(doc(db, collectionName, idParaEditar), { nombre: nuevoValor }); 
                    
                    if (nombreAntiguo && nombreAntiguo !== nuevoValor) {
                        // 1. Determinar el campo de registro a actualizar (nombres, material, cantera, proyecto)
                        let campoRegistro = '';
                        if (collectionName === 'nombresDeChoferes') campoRegistro = 'nombres';
                        if (collectionName === 'materiales') campoRegistro = 'material';
                        if (collectionName === 'canteras') campoRegistro = 'cantera';
                        if (collectionName === 'proyectos') campoRegistro = 'proyecto';

                        if (campoRegistro) {
                            // 2. Buscar todos los registros que tienen el nombre antiguo
                            const qRegistros = query(collection(db, "registros"), where(campoRegistro, "==", nombreAntiguo));
                            const snapshotRegistros = await getDocs(qRegistros);
                            
                            // 3. Actualizar todos los registros encontrados con el nuevo nombre
                            const updates = snapshotRegistros.docs.map(docRegistro => {
                                return updateDoc(doc(db, "registros", docRegistro.id), { [campoRegistro]: nuevoValor });
                            });
                            await Promise.all(updates);
                            console.log(`[Actualización Masiva] Se actualizaron ${updates.length} registros en 'registros' para el campo ${campoRegistro}.`);
                            
                            // Si actualizamos el nombre de un chofer, también debemos actualizar el nombre en 'choferesVehiculos'
                            if (collectionName === 'nombresDeChoferes') {
                                const qVehiculos = query(collection(db, "choferesVehiculos"), where("nombre", "==", nombreAntiguo));
                                const snapshotVehiculos = await getDocs(qVehiculos);
                                
                                const vehicleUpdates = snapshotVehiculos.docs.map(docVehiculo => {
                                    return updateDoc(doc(db, "choferesVehiculos", docVehiculo.id), { nombre: nuevoValor });
                                });
                                await Promise.all(vehicleUpdates);
                                console.log(`[Actualización Masiva] Se actualizaron ${vehicleUpdates.length} registros en 'choferesVehiculos'.`);
                            }
                        }
                    }
                    // --- FIN LÓGICA DE ACTUALIZACIÓN MASIVA ---
                } else { 
                    await addDoc(collection(db, collectionName), { nombre: nuevoValor }); 
                }
                
                resetForm(); 
                // Después de la actualización masiva, recargar todo lo necesario
                await render();
                await cargarRegistros(); // CORRECCIÓN: Recargar tabla de reportes después de editar/agregar
                await cargarResumenAnalitico(); // NUEVO: Recargar resumen analítico
                
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

        // BLOQUEO DE ESCRITURA
        if (userRole === 'observer') {
            alert("Acceso denegado. Los usuarios observadores no pueden modificar datos en la Base de Datos.");
            return;
        }
        
        if (target.classList.contains('delete-btn')) {
            if (confirm(`¿Seguro que quieres borrar este ${nombreSingular}? Ten en cuenta que los registros de viajes que usaban este nombre quedarán con un valor inconsistente.`)) {
                try {
                    await deleteDoc(doc(db, collectionName, id));
                    await render();
                    await cargarRegistros(); // CORRECCIÓN: Recargar tabla de reportes después de borrar
                    await cargarResumenAnalitico(); // NUEVO: Recargar resumen analítico
                } catch (error) {
                    console.error(`Error al borrar ${nombreSingular}:`, error);
                    alert(`Error al borrar ${nombreSingular}.`);
                }
            }
        } else if (target.classList.contains('edit-btn')) {
            // Permitir la precarga del formulario (pero el submit sigue bloqueado)
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
    
    const userRole = getUserRole(auth.currentUser);

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
                    ${userRole !== 'observer' ? `
                    <button class="list-action-btn edit-btn" title="Modificar" data-id="${chofer.id}">✏️</button>
                    <button class="list-action-btn delete-btn" title="Borrar" data-id="${chofer.id}">🗑️</button>
                    ` : '<span style="color: gray;">(Solo lectura)</span>'}
                </div>`;
            listaUl.appendChild(li);
        });
        
        // Deshabilitar formulario si es observador
        if (userRole === 'observer') {
            Array.from(form.elements).forEach(element => {
                element.disabled = true;
            });
            submitBtn.textContent = 'Acceso Denegado (Observador)';
            submitBtn.disabled = true;
        }
    };
    
    // Manejador para asignar/editar vehículo
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // BLOQUEO DE ESCRITURA
        if (userRole === 'observer') {
            alert("Acceso denegado. Los usuarios observadores no pueden modificar datos en la Base de Datos.");
            return;
        }

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
            await cargarRegistros(); // Recargar la tabla de reportes por si el volumen cambió
            await cargarResumenAnalitico(); // NUEVO: Recargar resumen analítico
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
        
        // BLOQUEO DE ESCRITURA
        if (userRole === 'observer') {
            alert("Acceso denegado. Los usuarios observadores no pueden modificar datos en la Base de Datos.");
            return;
        }

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
            // Permitir la precarga del formulario (pero el submit sigue bloqueado)
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

// --- FUNCIÓN DE KPIs MODIFICADA (Volumen de Hoy ELIMINADO) ---
const cargarKPIs = async () => {
    try {
        // 1. Obtener referencias a los elementos del DOM (Solo Semanal y Mensual)
        const kpiVolumenSemanalEl = document.getElementById('kpi-volumen-semanal');
        const kpiVolumenMensualEl = document.getElementById('kpi-volumen-mensual');
        
        if (!kpiVolumenSemanalEl || !kpiVolumenMensualEl) {
             console.log("Elementos KPI no encontrados, saltando carga.");
             return;
        }

        // Poner en estado de carga
        kpiVolumenSemanalEl.textContent = "Cargando...";
        kpiVolumenMensualEl.textContent = "Cargando...";

        // 2. Definir rangos de fechas
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

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
        if(document.getElementById('kpi-volumen-semanal')) document.getElementById('kpi-volumen-semanal').textContent = "Error";
        if(document.getElementById('kpi-volumen-mensual')) document.getElementById('kpi-volumen-mensual').textContent = "Error";
    }
};

// Función principal de inicialización de la app
const inicializarApp = async (user) => {
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
    
    const filtroMes = document.getElementById('filtroMes');
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');

    // Ocultar botón BD y Registro si es Observador
    const userRole = getUserRole(user);
    if (userRole === 'observer') {
        const bdButton = document.querySelector('.tab-button[data-tab="tab-admin"]');
        if (bdButton) bdButton.remove();
        const quickBdButton = document.querySelector('.quick-link-btn[data-tab="tab-admin"]');
        if (quickBdButton) quickBdButton.remove();
        const registroButton = document.querySelector('.tab-button[data-tab="tab-registro"]');
        if (registroButton) registroButton.remove();
        const quickRegistroButton = document.querySelector('.quick-link-btn[data-tab="tab-registro"]');
        if (quickRegistroButton) quickRegistroButton.remove();
        
        // Deshabilitar formulario de Registro para observadores
        if (transporteForm) {
            Array.from(transporteForm.elements).forEach(element => {
                element.disabled = true;
            });
            if (btnSubmitViaje) btnSubmitViaje.textContent = "Acceso Denegado (Observador)";
            if (btnSubmitViaje) btnSubmitViaje.disabled = true;
            document.getElementById('formViajeError').textContent = "Acceso de solo lectura. No se permite ingresar ni modificar datos.";
        }
    }


    // 5. Definir las secciones de Administración
    const adminSections = {
        choferes: {
            html: `<div class="card"><h2>👤 Nombres de Choferes</h2><form id="nombreChoferForm"><input type="hidden" class="edit-id"><input type="text" id="nuevoNombreChofer" placeholder="Nombre y Apellido" required><button type="submit" class="btn-primary">Agregar</button></form><ul id="nombresChoferesLista"></ul></div>`,
            loader: () => administrarListaSimple('nombresDeChoferes', 'nombreChoferForm', 'nuevoNombreChofer', 'nombresChoferesLista', ['#selectNombreAdmin', '#selectNombres', '#filtroChofer'], 'Chofer')
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
            // Si vamos a Análisis, cargar el resumen
            if (tab.dataset.tab === 'tab-analytics') {
                // Obtener filtros actuales de Reportes para sincronizar el Análisis
                const filtros = obtenerFiltrosReporte();
                cargarResumenAnalitico(filtros);
            }
        });
    });

    // Función auxiliar para obtener los filtros de Reportes (para sincronización)
    const obtenerFiltrosReporte = () => {
        const fechaInicioVal = fechaInicio.value;
        const fechaFinVal = fechaFin.value;
        const material = document.getElementById('filtroMaterial').value;
        const cantera = document.getElementById('filtroCantera').value;
        const proyecto = document.getElementById('filtroProyecto').value;
        const chofer = document.getElementById('filtroChofer').value;

        let filtros = [];
        if (fechaInicioVal) filtros.push(where("fecha", ">=", fechaInicioVal));
        if (fechaFinVal) filtros.push(where("fecha", "<=", fechaFinVal));
        if (material) filtros.push(where("material", "==", material));
        if (cantera) filtros.push(where("cantera", "==", cantera));
        if (proyecto) filtros.push(where("proyecto", "==", proyecto));
        if (chofer) filtros.push(where("nombres", "==", chofer));
        return filtros;
    };


    // 9. Lógica para los filtros de Reportes
    document.getElementById('btnPrint').addEventListener('click', () => {
        const fechaInicioVal = fechaInicio.value;
        const fechaFinVal = fechaFin.value;
        const material = document.getElementById('filtroMaterial').value;
        const cantera = document.getElementById('filtroCantera').value;
        const proyecto = document.getElementById('filtroProyecto').value;
        const chofer = document.getElementById('filtroChofer').value;
        const filtroMesVal = filtroMes.value;
        let filtrosUsados = [];
        if (filtroMesVal) {
            const [year, month] = filtroMesVal.split('-');
            filtrosUsados.push(`<strong>Mes:</strong> ${month}/${year}`);
        } else if (fechaInicioVal || fechaFinVal) {
            if (fechaInicioVal && fechaFinVal) {
                filtrosUsados.push(`<strong>Fechas:</strong> ${fechaInicioVal} al ${fechaFinVal}`);
            } else if (fechaInicioVal) {
                filtrosUsados.push(`<strong>Desde:</strong> ${fechaInicioVal}`);
            } else if (fechaFinVal) {
                filtrosUsados.push(`<strong>Hasta:</strong> ${fechaFinVal}`);
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
    
    // NOTA: Se eliminó el bloque de código de Exportar a Excel.

    // --- LÓGICA DE FILTROS DE FECHA EXCLUYENTE ---
    filtroMes.addEventListener('change', () => {
        const mesSeleccionado = filtroMes.value;
        if (!mesSeleccionado) {
            fechaInicio.value = '';
            fechaFin.value = '';
            fechaInicio.disabled = false; // Habilitar fechas
            fechaFin.disabled = false;
            return;
        }
        
        const [year, month] = mesSeleccionado.split('-').map(Number);
        const primerDia = new Date(year, month - 1, 1);
        const ultimoDia = new Date(year, month, 0);
        
        // Llenar y deshabilitar fechas individuales
        fechaInicio.value = formatDate(primerDia);
        fechaFin.value = formatDate(ultimoDia);
        fechaInicio.disabled = true; // Deshabilitar fechas
        fechaFin.disabled = true;
        
        document.getElementById('btnFiltrar').click();
    });

    fechaInicio.addEventListener('change', () => {
        if (fechaInicio.value || fechaFin.value) {
            filtroMes.value = ''; // Limpiar mes si se usa la fecha individual
            fechaInicio.disabled = false;
            fechaFin.disabled = false;
        }
    });
    
    fechaFin.addEventListener('change', () => {
        if (fechaInicio.value || fechaFin.value) {
            filtroMes.value = ''; // Limpiar mes si se usa la fecha individual
            fechaInicio.disabled = false;
            fechaFin.disabled = false;
        }
    });
    // --- FIN LÓGICA DE FILTROS DE FECHA EXCLUYENTE ---


    document.getElementById('btnFiltrar').addEventListener('click', () => {
        const filtros = obtenerFiltrosReporte();

        cargarRegistros(filtros);
        
        // Sincronizar el Análisis
        cargarResumenAnalitico(filtros);
    });

    document.getElementById('btnMostrarTodo').addEventListener('click', () => {
        filtroMes.value = ''; 
        fechaInicio.value = ''; 
        fechaFin.value = '';
        fechaInicio.disabled = false; 
        fechaFin.disabled = false;
        document.getElementById('filtroMaterial').selectedIndex = 0;
        document.getElementById('filtroCantera').selectedIndex = 0;
        document.getElementById('filtroProyecto').selectedIndex = 0;
        document.getElementById('filtroChofer').selectedIndex = 0;
        
        // Cargar Reportes y Análisis sin filtros
        cargarRegistros([]);
        cargarResumenAnalitico([]);
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
    poblarSelects('materiales', 'selectMaterial', 'Seleccionar Material');
    poblarSelects('canteras', 'selectCantera', 'Seleccionar Cantera');
    poblarSelects('proyectos', 'selectProyecto', 'Seleccionar Proyecto');
    
    // Cargar selects de los filtros de reportes
    poblarSelects('materiales', 'filtroMaterial', '-- Todos --');
    poblarSelects('canteras', 'filtroCantera', '-- Todos --');
    poblarSelects('proyectos', 'filtroProyecto', '-- Todos --');
    // Nota: "filtroChofer" se puebla desde administrarListaSimple('nombresDeChoferes'...)

    // Función helper para poblar selects (usada arriba)
    async function poblarSelects(collectionName, selectId, defaultOptionText) {
        try {
            const selectEl = document.getElementById(selectId);
            // Asegura que solo tiene la opción por defecto antes de cargar
            selectEl.innerHTML = `<option value="">${defaultOptionText}</option>`; 
            const q = query(collection(db, collectionName));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => selectEl.add(new Option(doc.data().nombre, doc.data().nombre)));
        } catch (error) {
            console.error(`Error poblando select ${selectId}:`, error);
        }
    }

    selectPlaca.addEventListener('change', () => {
        const selectedOption = selectPlaca.options[selectPlaca.selectedIndex];
        volumenInput.value = selectedOption ? selectedOption.dataset.volumen || '' : '';
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
        // Bloquear edición/eliminación para observadores
        if (getUserRole(auth.currentUser) === 'observer') {
            alert("Acceso denegado. Los usuarios observadores no pueden modificar datos.");
            return;
        }

        const target = e.target.closest('button');
        if (!target) return;
        const docId = target.dataset.id;
        
        if (target.classList.contains('delete-btn')) {
            if (confirm(`¿Seguro que quieres borrar este viaje?`)) {
                try {
                    await deleteDoc(doc(db, "registros", docId));
                    await cargarRegistros(); // Recargar tabla
                    await cargarKPIs(); // Recargar estadísticas
                    await cargarResumenAnalitico(); // Recargar resumen analítico
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
        
        // Bloquear envío para observadores
        if (getUserRole(auth.currentUser) === 'observer') {
            document.getElementById('formViajeError').textContent = 'Acceso denegado. Los usuarios observadores no pueden ingresar datos.';
            return;
        }

        document.getElementById('formViajeError').textContent = '';
        
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
                document.getElementById('formViajeError').textContent = 'Por favor, complete todos los campos requeridos.';
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
            await cargarResumenAnalitico(); // Recargar resumen analítico
            cancelarEdicion();
            
            // Volver al panel de inicio después de guardar
            document.querySelector('.tab-button[data-tab="tab-inicio"]').click();
            
        } catch (error) {
            console.error("Error al guardar el registro:", error);
            document.getElementById('formViajeError').textContent = 'Hubo un error al guardar el registro.';
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
    await cargarResumenAnalitico();
};