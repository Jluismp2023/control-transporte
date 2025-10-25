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

const getTodayDate = () => new Date().toISOString().slice(0, 10);

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        document.body.style.display = 'block';
        inicializarApp();
    }
});

const cargarContenidoHTML = () => {
    
    // --- NUEVO: HTML PARA EL PANEL DE INICIO ---
    document.getElementById('tab-inicio').innerHTML = `
        <div class="card">
            <h2>Panel de Control</h2>
            <p>Bienvenido al sistema de control de transporte de OBRECO.</p>
        </div>
        
        <!-- Contenedor de Estadísticas (KPIs) -->
        <div class="kpi-container">
            <div class="kpi-card">
                <h3>Viajes de Hoy</h3>
                <p id="kpi-viajes-hoy">Cargando...</p>
            </div>
            <div class="kpi-card">
                <h3>Volumen de Hoy (m³)</h3>
                <p id="kpi-volumen-hoy">Cargando...</p>
            </div>
            <div class="kpi-card">
                <h3>Registros Totales</h3>
                <p id="kpi-total-registros">Cargando...</p>
            </div>
        </div>

        <!-- Contenedor de Accesos Directos -->
        <div class="card">
            <h2>Accesos Directos</h2>
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
    
    // --- HTML existente ---
    document.getElementById('tab-registro').innerHTML = `
        <div class="card">
            <h2 id="formViajeTitulo">🚚 Nuevo Registro de Viaje</h2>
            <form id="transporteForm">
                <input type="hidden" id="indiceEdicion">
                <div class="form-grid">
                    <select id="selectNombres" required><option value="">1. Seleccionar Chofer</option></select>
                    <select id="selectPlaca" required disabled><option value="">2. Seleccionar Placa</option></select>
                    <input type="number" id="volumen" placeholder="Volumen (m³)" step="0.01" readonly required>
                    <select id="selectMaterial" required><option value="">3. Seleccionar Material</option></select>
                    <input type="date" id="fecha" required>
                    <input type="number" id="numViajes" placeholder="# de Viajes" value="1" min="1" required>
                    <select id="selectCantera" required class="form-grid-span-2"><option value="">Seleccionar Cantera</option></select>
                    <select id="selectProyecto" required class="form-grid-span-2"><option value="">Seleccionar Proyecto</option></select>
                    <textarea id="observaciones" placeholder="Observaciones (opcional)" rows="3" class="form-grid-span-2"></textarea>
                </div>
                <div class="form-buttons">
                    <button type="submit" id="btnSubmitViaje" class="btn-primary" style="flex-grow: 1;">Agregar Registro</button>
                    <button type="button" id="btnCancelarEdicion" class="btn-secondary" style="flex-grow: 1;">Cancelar</button>
                </div>
                <p id="formViajeError" class="error-message"></p>
            </form>
        </div>`;
    
    document.getElementById('tab-admin').innerHTML = `
        <div class="admin-container">
            <div class="admin-sidebar">
                <button data-section="choferes">👤 Nombres de Choferes</button>
                <button data-section="vehiculos">🚛 Asignar Vehículo</button>
                <button data-section="materiales">💎 Materiales</button>
                <button data-section="canteras">📍 Canteras</button>
                <button data-section="proyectos">🏁 Proyectos</button>
            </div>
            <div id="admin-content" class="admin-content"></div>
        </div>`;
        
    document.getElementById('tab-summary').innerHTML = `
        <div class="card">
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
                <button id="btnFiltrar" class="btn-primary">Filtrar</button>
                <button id="btnMostrarTodo" class="btn-secondary">Mostrar Todo</button>
                <button id="btnPrint" class="btn-primary">🖨️ Imprimir</button>
                <button id="btnExportarExcel" class="btn-success">📄 Exportar a Excel</button>
            </div>
        </div>
        <div class="card">
            <div class="print-only">TRANSPORTE DE MATERIALES PETREOS</div>
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
    document.getElementById('signature-section').innerHTML = `<div class="signature-box"><div class="signature-line"></div><p>Ing. Jose L. Macas P.</p><p>Residente de Obra</p></div>`;
};

let registrosFiltrados = [];

const renderizarRegistros = (registros) => {
    registrosFiltrados = registros; 

    const registrosBody = document.getElementById('registrosBody');
    const registrosTfoot = document.getElementById('registrosTfoot');

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
        fila.innerHTML = `<td>${index + 1}</td><td>${registro.fecha}</td><td>${registro.nombres}</td><td>${registro.placa}</td><td>${registro.material || ''}</td><td>${registro.cantera || ''}</td><td>${registro.proyecto || ''}</td><td>${registro.observaciones || ''}</td><td>${volumen.toFixed(2)}</td><td>${numViajes}</td><td><b>${volumenTotal.toFixed(2)}</b></td><td class="action-cell"><button title="Modificar" class="action-btn edit-btn" data-id="${registro.id}">✏️</button><button title="Borrar" class="action-btn delete-btn" data-id="${registro.id}">🗑️</button></td>`;
        registrosBody.appendChild(fila);
    });
    if (registros.length > 0) {
        const pieDeTabla = document.createElement('tr');
        pieDeTabla.innerHTML = `<td colspan="9" style="text-align: right;"><strong>TOTALES:</strong></td><td><strong>${totalViajes}</strong></td><td><strong>${totalVolumen.toFixed(2)}</strong></td><td class="action-cell"></td>`;
        registrosTfoot.appendChild(pieDeTabla);
    }
};

const administrarListaSimple = async (collectionName, formId, inputId, listaId, selectIds, nombreSingular) => {
    const form = document.getElementById(formId);
    const inputEl = document.getElementById(inputId);
    const listaUl = document.getElementById(listaId);
    const editIdInput = form.querySelector('.edit-id');
    const submitBtn = form.querySelector('button[type="submit"]');
    const resetForm = () => { editIdInput.value = ''; inputEl.value = ''; submitBtn.textContent = 'Agregar'; submitBtn.classList.remove('btn-success');};
    const render = async () => {
        const q = query(collection(db, collectionName));
        const snapshot = await getDocs(q);
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        items.sort((a, b) => a.nombre.localeCompare(b.nombre));
        listaUl.innerHTML = '';
        const selectsToUpdate = Array.from(document.querySelectorAll(selectIds.join(','))).filter(el => el);
        selectsToUpdate.forEach(sel => { 
            const currentValue = sel.value;
            sel.innerHTML = `<option value="">-- Todos --</option>`; 
            items.forEach(item => sel.add(new Option(item.nombre, item.nombre)));
            sel.value = currentValue;
        });
        items.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${item.nombre}</span><div class="actions"><button class="list-action-btn edit-btn" title="Modificar" data-id="${item.id}" data-nombre="${item.nombre}">✏️</button><button class="list-action-btn delete-btn" title="Borrar" data-id="${item.id}">🗑️</button></div>`;
            listaUl.appendChild(li);
        });
    };
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const nuevoValor = inputEl.value.trim();
        const idParaEditar = editIdInput.value;
        if (nuevoValor) {
            if(idParaEditar) { await updateDoc(doc(db, collectionName, idParaEditar), { nombre: nuevoValor }); } 
            else { await addDoc(collection(db, collectionName), { nombre: nuevoValor }); }
            resetForm(); await render();
        }
    });
    listaUl.addEventListener('click', async e => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (target.classList.contains('delete-btn')) {
            if (confirm(`¿Seguro que quieres borrar este ${nombreSingular}?`)) {
                await deleteDoc(doc(db, collectionName, id));
                await render();
            }
        } else if (target.classList.contains('edit-btn')) {
            inputEl.value = target.dataset.nombre;
            editIdInput.value = id;
            submitBtn.textContent = 'Guardar';
            submitBtn.classList.add('btn-success');
            inputEl.focus();
        }
    });
    await render();
};

let choferesVehiculosCache = [];
const administrarChoferesVehiculos = async () => {
    const form = document.getElementById('choferVehiculoForm');
    const listaUl = document.getElementById('choferesVehiculosLista');
    const editIdInput = form.querySelector('.edit-id');
    const submitBtn = form.querySelector('button[type="submit"]');
    const selectNombreEl = document.getElementById('selectNombreAdmin');
    const nuevaPlacaEl = document.getElementById('nuevaPlaca');
    const nuevoVolumenEl = document.getElementById('nuevoVolumen');

    const qNombres = query(collection(db, "nombresDeChoferes"));
    const snapshotNombres = await getDocs(qNombres);
    selectNombreEl.innerHTML = '<option value="">Seleccionar Chofer</option>';
    snapshotNombres.forEach(doc => selectNombreEl.add(new Option(doc.data().nombre, doc.data().nombre)));

    const resetForm = () => { editIdInput.value = ''; form.reset(); submitBtn.textContent = 'Asignar'; submitBtn.classList.remove('btn-success'); };
    const render = async () => {
        const q = query(collection(db, "choferesVehiculos"));
        const snapshot = await getDocs(q);
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        items.sort((a, b) => a.nombre.localeCompare(b.nombre) || a.placa.localeCompare(b.placa));
        listaUl.innerHTML = '';
        choferesVehiculosCache = items;
        items.forEach(chofer => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${chofer.nombre} - ${chofer.placa} (${chofer.volumen} m³)</span><div class="actions"><button class="list-action-btn edit-btn" title="Modificar" data-id="${chofer.id}">✏️</button><button class="list-action-btn delete-btn" title="Borrar" data-id="${chofer.id}">🗑️</button></div>`;
            listaUl.appendChild(li);
        });
    };
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idParaEditar = editIdInput.value;
        const data = { nombre: selectNombreEl.value, placa: nuevaPlacaEl.value.trim().toUpperCase(), volumen: parseFloat(nuevoVolumenEl.value) };
        if (!data.nombre || !data.placa || !data.volumen) return alert('Por favor, complete todos los campos.');
        if(idParaEditar) { await updateDoc(doc(db, "choferesVehiculos", idParaEditar), data); } 
        else { await addDoc(collection(db, "choferesVehiculos"), data); }
        resetForm(); await render();
    });
    listaUl.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (target.classList.contains('delete-btn')) {
            if (confirm(`¿Seguro que quieres borrar esta asignación?`)) {
                await deleteDoc(doc(db, "choferesVehiculos", id));
                await render();
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
    await render();
};

// --- NUEVO: FUNCIÓN PARA CARGAR ESTADÍSTICAS (KPIs) ---
const cargarKPIs = async () => {
    try {
        const kpiViajes = document.getElementById('kpi-viajes-hoy');
        const kpiVolumen = document.getElementById('kpi-volumen-hoy');
        const kpiTotal = document.getElementById('kpi-total-registros');
        
        const hoy = getTodayDate(); // Usamos la función que ya tienes
        
        // 1. Query para los datos de HOY
        const qHoy = query(collection(db, "registros"), where("fecha", "==", hoy));
        const snapshotHoy = await getDocs(qHoy);
        
        let viajesHoy = 0;
        let volumenHoy = 0;
        snapshotHoy.forEach(doc => {
            const registro = doc.data();
            const numViajes = parseInt(registro.numViajes) || 0;
            const volumen = parseFloat(registro.volumen) || 0;
            viajesHoy += numViajes;
            volumenHoy += (volumen * numViajes);
        });

        // 2. Query para el TOTAL
        const snapshotTotal = await getDocs(query(collection(db, "registros")));
        
        // 3. Actualizar el HTML
        kpiViajes.textContent = viajesHoy;
        kpiVolumen.textContent = volumenHoy.toFixed(2);
        kpiTotal.textContent = snapshotTotal.size; // Cantidad total de documentos/registros
        
    } catch (error) {
        console.error("Error al cargar KPIs:", error);
        // Opcional: mostrar error en las tarjetas
        if(kpiViajes) kpiViajes.textContent = "Error";
        if(kpiVolumen) kpiVolumen.textContent = "Error";
        if(kpiTotal) kpiTotal.textContent = "Error";
    }
};

const inicializarApp = async () => {
    cargarContenidoHTML();

    document.getElementById('fecha').value = getTodayDate();

    document.getElementById('btnLogout').addEventListener('click', () => signOut(auth).catch((error) => console.error("Error al cerrar sesión", error)));
    
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

    const adminSections = {
        choferes: {
            html: `<div class="card"><h2>👤 Nombres de Choferes</h2><form id="nombreChoferForm"><input type="hidden" class="edit-id"><input type="text" id="nuevoNombreChofer" placeholder="Nombre y Apellido" required><button type="submit" class="btn-primary">Agregar</button></form><ul id="nombresChoferesLista"></ul></div>`,
            loader: () => administrarListaSimple('nombresDeChoferes', 'nombreChoferForm', 'nuevoNombreChofer', 'nombresChoferesLista', ['#selectNombreAdmin'], 'Nombre de Chofer')
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

    const showAdminSection = (sectionName) => {
        if (!adminSections[sectionName]) return;
        adminSidebarButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.section === sectionName));
        adminContent.innerHTML = adminSections[sectionName].html;
        adminSections[sectionName].loader();
    };

    adminSidebarButtons.forEach(button => button.addEventListener('click', () => showAdminSection(button.dataset.section)));
    showAdminSection('choferes');

    const cargarRegistros = async (filtros = []) => {
        const registrosBody = document.getElementById('registrosBody');
        registrosBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 20px;">Cargando registros...</td></tr>`;
        document.getElementById('registrosTfoot').innerHTML = '';

        let q = query(collection(db, "registros"));
        if (filtros.length > 0) { q = query(collection(db, "registros"), ...filtros); }
        const snapshot = await getDocs(q);
        const registrosData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        renderizarRegistros(registrosData);
    };
    
    document.querySelectorAll('.tab-button').forEach(tab => tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tab.dataset.tab).classList.add('active');
    }));

    document.getElementById('btnPrint').addEventListener('click', () => {
        const fechaInicio = document.getElementById('fechaInicio').value;
        const fechaFin = document.getElementById('fechaFin').value;
        const material = document.getElementById('filtroMaterial').value;
        const cantera = document.getElementById('filtroCantera').value;
        const proyecto = document.getElementById('filtroProyecto').value;
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

        if (material) {
            filtrosUsados.push(`<strong>Material:</strong> ${material}`);
        }
        if (cantera) {
            filtrosUsados.push(`<strong>Cantera:</strong> ${cantera}`);
        }
        if (proyecto) {
            filtrosUsados.push(`<strong>Proyecto:</strong> ${proyecto}`);
        }

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
        hojaDeCalculo['!cols'] = [
            { wch: 5 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, 
            { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
        ];
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
        document.getElementById('fechaInicio').value = primerDia.toISOString().slice(0, 10);
        document.getElementById('fechaFin').value = ultimoDia.toISOString().slice(0, 10);
        document.getElementById('btnFiltrar').click();
    });

    document.getElementById('btnFiltrar').addEventListener('click', () => {
        const fechaInicio = document.getElementById('fechaInicio').value;
        const fechaFin = document.getElementById('fechaFin').value;
        const material = document.getElementById('filtroMaterial').value;
        const cantera = document.getElementById('filtroCantera').value;
        const proyecto = document.getElementById('filtroProyecto').value;
        let filtros = [];
        if (fechaInicio) filtros.push(where("fecha", ">=", fechaInicio));
        if (fechaFin) filtros.push(where("fecha", "<=", fechaFin));
        if (material) filtros.push(where("material", "==", material));
        if (cantera) filtros.push(where("cantera", "==", cantera));
        if (proyecto) filtros.push(where("proyecto", "==", proyecto));
        cargarRegistros(filtros);
    });

    document.getElementById('btnMostrarTodo').addEventListener('click', () => {
        document.getElementById('filtroMes').value = '';
        document.getElementById('fechaInicio').value = '';
        document.getElementById('fechaFin').value = '';
        document.getElementById('filtroMaterial').selectedIndex = 0;
        document.getElementById('filtroCantera').selectedIndex = 0;
        document.getElementById('filtroProyecto').selectedIndex = 0;
        cargarRegistros();
    });

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
    
    const qNombres = query(collection(db, "nombresDeChoferes"));
    const snapshotNombres = await getDocs(qNombres);
    snapshotNombres.forEach(doc => selectNombres.add(new Option(doc.data().nombre, doc.data().nombre)));
    
    const poblarSelects = async (collectionName, selectId) => {
        const selectEl = document.getElementById(selectId);
        const q = query(collection(db, collectionName));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => selectEl.add(new Option(doc.data().nombre, doc.data().nombre)));
    };
    poblarSelects('materiales', 'selectMaterial');
    poblarSelects('canteras', 'selectCantera');
    poblarSelects('proyectos', 'selectProyecto');
    poblarSelects('materiales', 'filtroMaterial');
    poblarSelects('canteras', 'filtroCantera');
    poblarSelects('proyectos', 'filtroProyecto');

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

    document.getElementById('registrosBody').addEventListener('click', async e => {
        const target = e.target.closest('button');
        if (!target) return;
        const docId = target.dataset.id;
        if (target.classList.contains('delete-btn')) {
            if (confirm(`¿Seguro que quieres borrar este viaje?`)) {
                await deleteDoc(doc(db, "registros", docId));
                await cargarRegistros(); // Recargar tabla
                await cargarKPIs(); // Recargar estadísticas
            }
        } else if (target.classList.contains('edit-btn')) {
            const docSnap = await getDoc(doc(db, "registros", docId));
            if (docSnap.exists()) {
                const registroAEditar = docSnap.data();
                
                document.querySelector('.tab-button[data-tab="tab-registro"]').click();
                
                formViajeTitulo.textContent = `✍️ Modificando Viaje`;
                indiceEdicionInput.value = docId;
                selectNombres.value = registroAEditar.nombres;
                selectNombres.dispatchEvent(new Event('change'));
                setTimeout(() => {
                    selectPlaca.value = registroAEditar.placa;
                    selectPlaca.dispatchEvent(new Event('change'));
                    document.getElementById('fecha').value = registroAEditar.fecha;
                    document.getElementById('selectMaterial').value = registroAEditar.material;
                    document.getElementById('selectCantera').value = registroAEditar.cantera;
                    document.getElementById('selectProyecto').value = registroAEditar.proyecto;
                    document.getElementById('numViajes').value = registroAEditar.numViajes;
                    document.getElementById('observaciones').value = registroAEditar.observaciones || '';
                }, 200);
                btnSubmitViaje.textContent = 'Guardar Cambios';
                btnSubmitViaje.classList.replace('btn-primary', 'btn-success');
                document.getElementById('btnCancelarEdicion').style.display = 'block';
                window.scrollTo(0, 0);
            }
        }
    });

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
            
            if (!registro.nombres || !registro.placa || !registro.material || !registro.fecha || !registro.volumen) {
                formViajeError.textContent = 'Por favor, complete todos los campos requeridos.';
                btn.disabled = false;
                btn.textContent = originalText;
                return;
            }
            
            if (idParaEditar) { await updateDoc(doc(db, "registros", idParaEditar), registro); } 
            else { await addDoc(collection(db, "registros"), registro); }
            
            await cargarRegistros(); // Recargar tabla
            await cargarKPIs(); // Recargar estadísticas
            cancelarEdicion();
            
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
    
    // --- NUEVO: LÓGICA PARA ACCESOS DIRECTOS ---
    document.querySelectorAll('.quick-link-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            // Simular clic en la pestaña real
            const tabButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
            if (tabButton) {
                tabButton.click();
            }
        });
    });

    // Cargar los registros de la tabla
    await cargarRegistros();
    
    // Cargar las estadísticas (KPIs)
    await cargarKPIs();
};

