document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado, inicializando...");
    
    const primerBoton = document.querySelector(".sidebar button");
    if (primerBoton) {
        primerBoton.classList.add("active");
    }
    
    console.log("Escenario inicial:", escenarioActual);
});

// Variables de tratamiento médico
const variables = [
    { nombre: "x₁", descripcion: "Dosis Fármaco A", unidad: "mg/día" },
    { nombre: "x₂", descripcion: "Dosis Fármaco B", unidad: "mg/día" },
    { nombre: "x₃", descripcion: "Dosis Fármaco C", unidad: "mg/día" },
    { nombre: "x₄", descripcion: "Intensidad Terapia Digital", unidad: "nivel/sesiones" },
    { nombre: "x₅", descripcion: "Intervención IA", unidad: "nivel ajuste" }
];
let escenarioActual = "ideal";

// Métodos numéricos
const metodos = [
    { id: "jacobi", nombre: "Jacobi", desc: "Método iterativo simple", color: "#3498db" },
    { id: "gauss_seidel", nombre: "Gauss-Seidel", desc: "Mejora de Jacobi", color: "#2ecc71" },
    { id: "sor", nombre: "SOR", desc: "Sobre-relajación sucesiva", color: "#f39c12" },
    { id: "gradiente_conjugado", nombre: "Grad. Conj.", desc: "Para matrices simétricas", color: "#9b59b6" },
    { id: "gradiente_conjugado_precond", nombre: "Grad. Conj. Prec.", desc: "Con precondicionador Jacobi", color: "#e74c3c" },
    { id: "lu", nombre: "Factorización LU", desc: "Descomposición directa", color: "#34495e" }
];

// Sincronizar valores de sliders con displays
document.getElementById("severidad").addEventListener("input", function() {
    document.getElementById("severidad-value").textContent = this.value;
});

document.getElementById("tolerancia").addEventListener("input", function() {
    document.getElementById("tolerancia-value").textContent = this.value;
});

document.getElementById("actividad").addEventListener("input", function() {
    document.getElementById("actividad-value").textContent = this.value;
});

// =========================
// CALCULAR DOSIFICACIÓN
// =========================
function cambiarEscenario(event, tipo) {
    console.log("Cambiando a escenario:", tipo); // Para debug
    
    escenarioActual = tipo;
    
    // Remover clase active de todos los botones
    document.querySelectorAll(".sidebar button").forEach(btn => {
        btn.classList.remove("active");
    });
    
    // Agregar clase active al botón clickeado
    event.target.classList.add("active");
    
    // Mostrar indicador visual del cambio
    mostrarCambioEscenario(tipo);
    
    // Recalcular automáticamente
    calcularDosificacion();
}

// Nueva función para mostrar el cambio de escenario
function mostrarCambioEscenario(tipo) {
    const diagnosisContainer = document.getElementById("diagnosis-container");
    const mensajes = {
        "ideal": "🌟 Escenario IDEAL activado - Condiciones óptimas",
        "estres": "⚡ Escenario ESTRÉS activado - Alta carga computacional", 
        "mal_condicionado": "🔴 Escenario MAL CONDICIONADO - Sistema numéricamente inestable"
    };
    
    diagnosisContainer.innerHTML = `
        <div class="panel diagnosis-panel ok" style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white;">
            <h3>${mensajes[tipo] || "Escenario cambiado"}</h3>
            <p>Recalculando sistema con nuevas condiciones...</p>
        </div>
    `;
}

async function calcularDosificacion() {
    const edad = parseFloat(document.getElementById("edad").value);
    const peso = parseFloat(document.getElementById("peso").value);
    const severidad = parseInt(document.getElementById("severidad").value);
    const tolerancia = parseInt(document.getElementById("tolerancia").value);
    const actividad = parseInt(document.getElementById("actividad").value);

    if (!edad || !peso || !severidad || !tolerancia || !actividad) {
        alert("Por favor, complete todos los campos.");
        return;
    }

    const diagnosisContainer = document.getElementById("diagnosis-container");
    diagnosisContainer.innerHTML = '<div class="loading">Calculando dosificación óptima y resolviendo sistema...</div>';

    try {
        const response = await fetch("/resolver", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                edad,
                peso,
                severidad,
                tolerancia,
                actividad,
                escenario: escenarioActual   
            })
        });

        if (!response.ok) throw new Error("Error en la respuesta del servidor");

        const data = await response.json();
        
        mostrarSistemaEcuaciones(data);
        mostrarDiagnostico(data.analisis);
        mostrarSolucion(data);
        mostrarMetodos(data.metodos);
        mostrarDetallesTecnicos(data);

    } catch (error) {
        console.error("Error:", error);
        diagnosisContainer.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

// =========================
// MOSTRAR SISTEMA DE ECUACIONES
// =========================

function mostrarSistemaEcuaciones(data) {
    const matrizA = data.matriz_A;
    const vectorB = data.vector_b;

    // Mostrar matriz A
    let htmlA = '<table class="matriz-tabla">';
    for (let i = 0; i < 5; i++) {
        htmlA += '<tr>';
        for (let j = 0; j < 5; j++) {
            const valor = matrizA[i][j].toFixed(2);
            htmlA += `<td>${valor}</td>`;
        }
        htmlA += '</tr>';
    }
    htmlA += '</table>';
    document.getElementById("matriz-a").innerHTML = htmlA;

    // Mostrar vector x (variables)
    let htmlX = '<table class="vector-tabla">';
    for (let i = 0; i < 5; i++) {
        htmlX += `<tr><td>${variables[i].nombre}</td></tr>`;
    }
    htmlX += '</table>';
    document.getElementById("vector-x").innerHTML = htmlX;

    // Mostrar vector b
    let htmlB = '<table class="vector-tabla">';
    for (let i = 0; i < 5; i++) {
        const valor = vectorB[i].toFixed(2);
        htmlB += `<tr><td>${valor}</td></tr>`;
    }
    htmlB += '</table>';
    document.getElementById("vector-b").innerHTML = htmlB;

    document.getElementById("sistema-section").style.display = "block";
}

// =========================
// MOSTRAR DIAGNÓSTICO DEL SISTEMA
// =========================

function mostrarDiagnostico(analisis) {
    const container = document.getElementById("diagnosis-container");
    const recom = analisis.recomendacion;
    
    let colorClass = "";
    switch(recom.color) {
        case "success": colorClass = "ok"; break;
        case "warning": colorClass = "warn"; break;
        case "danger": colorClass = "bad"; break;
        default: colorClass = "secondary";
    }

    container.innerHTML = `
        <section class="panel diagnosis-panel ${colorClass}">
            <div class="diagnosis-header">
                <h2>${recom.estado}</h2>
                <p class="diagnosis-message">${recom.mensaje}</p>
            </div>
            <div class="diagnosis-action">
                <strong>⚡ Recomendación:</strong> ${recom.accion}
            </div>
            <div class="diagnosis-details">
                <p><strong>Número de condición:</strong> ${analisis.condicion ? analisis.condicion.toFixed(2) : 'N/A'}</p>
                <p><strong>Diagonal dominante:</strong> ${analisis.diagonal_dominante ? '✓ Sí' : '✗ No'}</p>
                <p><strong>Matriz simétrica:</strong> ${analisis.simetrica ? '✓ Sí' : '✗ No'}</p>
            </div>
        </section>
    `;
}

// =========================
// MOSTRAR SOLUCIÓN PRINCIPAL
// =========================

function mostrarSolucion(data) {
    const container = document.getElementById("solution-main");
    const valores = data.solucion.valores;
    const unidades = data.solucion.unidades;

    let html = `<div class="solution-grid">`;

    for (let i = 0; i < variables.length; i++) {
        const valor = valores[i];
        const variable = variables[i];
        const unidad = unidades[i];

        html += `
            <div class="solution-card">
                <div class="solution-variable">${variable.nombre}</div>
                <div class="solution-description">${variable.descripcion}</div>
                <div class="solution-value">${valor.toFixed(2)} <span class="solution-unit">${unidad}</span></div>
            </div>
        `;
    }

    html += `</div>`;
    html += `<div class="solution-method">
        <strong>✓ Método de resolución óptimo:</strong> ${data.solucion.metodo}
    </div>`;

    container.innerHTML = html;
    document.getElementById("results-section").style.display = "block";
}

// =========================
// MOSTRAR COMPARACIÓN DE MÉTODOS
// =========================

function mostrarMetodos(resultados) {
    metodos.forEach(metodo => {
        const resultado = resultados[metodo.id];
        if (!resultado) return;

        const [solucion, iteraciones, convergio] = resultado;
        const container = document.getElementById(`metodo-${metodo.id}`);

        let html = `
            <div class="method-header" style="border-color: ${metodo.color}">
                <h4>${metodo.nombre}</h4>
                <p class="method-desc">${metodo.desc}</p>
            </div>
            <div class="method-body">
                <div class="method-stat">
                    <span class="stat-label">Iteraciones:</span>
                    <span class="stat-value">${iteraciones}</span>
                </div>
                <div class="method-stat">
                    <span class="stat-label">Estado:</span>
                    <span class="stat-value ${convergio ? 'convergio' : 'no-convergio'}">
                        ${convergio ? '✓ Convergió' : '✗ No convergió'}
                    </span>
                </div>
                <div class="method-solution">
                    <p style="margin: 8px 0; font-size: 0.85em; color: #666;"><strong>Solución:</strong></p>
                    <table class="method-table">
        `;

        if (solucion) {
            for (let i = 0; i < variables.length; i++) {
                html += `
                    <tr>
                        <td>${variables[i].nombre}</td>
                        <td>${solucion[i].toFixed(4)}</td>
                    </tr>
                `;
            }
        }

        html += `
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    });
}

// =========================
// MOSTRAR DETALLES TÉCNICOS
// =========================

function mostrarDetallesTecnicos(data) {
    const container = document.getElementById("technical-details");

    const paciente = data.paciente;
    const analisis = data.analisis;

    let html = `
        <div class="technical-grid">
            <div class="technical-item">
                <strong>📋 Parámetros del Paciente</strong>
                <ul>
                    <li>Edad: ${paciente.edad} años</li>
                    <li>Peso: ${paciente.peso} kg</li>
                    <li>Severidad: ${paciente.severidad}/10</li>
                    <li>Tolerancia: ${paciente.tolerancia}/10</li>
                    <li>Actividad: ${paciente.actividad}/10</li>
                </ul>
            </div>
            <div class="technical-item">
                <strong>🔢 Análisis del Sistema</strong>
                <ul>
                    <li>Clasificación: <strong>${analisis.clasificacion.toUpperCase()}</strong></li>
                    <li>Número de condición: ${analisis.condicion ? analisis.condicion.toFixed(4) : 'N/A'}</li>
                    <li>Diagonal dominante: ${analisis.diagonal_dominante ? '✓ Sí' : '✗ No'}</li>
                    <li>Simétrica: ${analisis.simetrica ? '✓ Sí' : '✗ No'}</li>
                </ul>
            </div>
        </div>
    `;

    container.innerHTML = html;
}
