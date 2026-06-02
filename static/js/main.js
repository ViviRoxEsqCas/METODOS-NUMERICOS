document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado, inicializando...");
    
    const primerBoton = document.querySelector(".sidebar button");
    if (primerBoton) {
        primerBoton.classList.add("active");
    }
    
    console.log("Escenario inicial:", escenarioActual);
    
    // Configurar escuchadores estables para los sliders
    document.getElementById("severidad")?.addEventListener("input", function() {
        const display = document.getElementById("severidad-value");
        if (display) display.textContent = this.value;
    });


    document.getElementById("actividad")?.addEventListener("input", function() {
        const display = document.getElementById("actividad-value");
        if (display) display.textContent = this.value;
    });
});

// Variables de tratamiento médico - Terminología determinista (Umsa)
const variables = [
    { nombre: "x₁", descripcion: "Dosis Fármaco A", unidad: "mg/día" },
    { nombre: "x₂", descripcion: "Dosis Fármaco B", unidad: "mg/día" },
    { nombre: "x₃", descripcion: "Dosis Fármaco C", unidad: "mg/día" },
    { nombre: "x₄", descripcion: "Intensidad Terapia Digital", unidad: "nivel/sesiones" },
    { nombre: "x₅", descripcion: "Ajuste Terapéutico Adaptativo", unidad: "nivel ajuste" }
];
let escenarioActual = "ideal";

// Métodos numéricos evaluados
const metodos = [
    { id: "jacobi", nombre: "Jacobi", desc: "Método iterativo estacionario simple", color: "#3498db" },
    { id: "gauss_seidel", nombre: "Gauss-Seidel", desc: "Sustitución sucesiva acelerada", color: "#2ecc71" },
    { id: "sor", nombre: "SOR", desc: "Sobre-relajación sucesiva (w=1.3)", color: "#f39c12" },
    { id: "gradiente_conjugado_precond", nombre: "GCP (Prof. Suñagua)", desc: "Optimización por precondicionamiento", color: "#e74c3c" },
    { id: "lu", nombre: "Factorización LU", desc: "Descomposición exacta directa", color: "#34495e" }
];

function cambiarEscenario(event, tipo) {
    console.log("Cambiando a escenario:", tipo);
    escenarioActual = tipo;
    
    document.querySelectorAll(".sidebar button").forEach(btn => {
        btn.classList.remove("active");
    });
    
    if (event && event.target) {
        event.target.classList.add("active");
    }
    
    mostrarCambioEscenario(tipo);
    calcularDosificacion();
}

function mostrarCambioEscenario(tipo) {
    const diagnosisContainer = document.getElementById("diagnosis-container");
    const mensajes = {
        "ideal": "🌟 Escenario IDEAL activado - Matriz Estable bien condicionada",
        "estres": "⚡ Escenario ESTRÉS activado - Alta carga por distorsión metabólica", 
        "mal_condicionado": "🔴 Escenario MAL CONDICIONADO - Hiperplanos casi paralelos"
    };
    
    if (diagnosisContainer) {
        diagnosisContainer.innerHTML = `
            <div class="panel diagnosis-panel ok" style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 15px; border-radius: 8px;">
                <h3>${mensajes[tipo] || "Escenario cambiado"}</h3>
                <p>Solicitando datos deterministas al servidor analítico...</p>
            </div>
        `;
    }
}

async function calcularDosificacion() {
    const edad = parseFloat(document.getElementById("edad")?.value || 50);
    const peso = parseFloat(document.getElementById("peso")?.value || 70);
    const severidad = parseInt(document.getElementById("severidad")?.value || 5);
    const actividad = parseInt(document.getElementById("actividad")?.value || 5);

    const diagnosisContainer = document.getElementById("diagnosis-container");
    if (diagnosisContainer) {
        diagnosisContainer.innerHTML = '<div class="loading" style="padding:20px; font-weight:bold; color:#4a5568;"><i class="fas fa-spinner fa-spin"></i> Resolviendo sistemas algebraicos multivariables...</div>';
    }

    try {
        const response = await fetch("/resolver", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ edad, peso, severidad, actividad, escenario: escenarioActual })
        });

        if (!response.ok) throw new Error("Error en la respuesta del servidor");

        const data = await response.json();
        
        // Despachar datos de forma ordenada una vez recibidos de manera segura
        mostrarSistemaEcuaciones(data);
        mostrarDiagnostico(data.analisis);
        mostrarSolucion(data);
        mostrarMetodos(data.cuadro_comparativo); 
        mostrarDesgloseLUYPasos(data);
        mostrarDemostracionCompletaLU(data.detalle_lu); // ¡Invocación añadida!

    } catch (error) {
        console.error("Error operativo:", error);
        if (diagnosisContainer) {
            diagnosisContainer.innerHTML = `<div class="alert alert-danger" style="color:#c53030; background:#fff5f5; padding:15px; border-left:4px solid #e53e3e;">Error Numérico: ${error.message}</div>`;
        }
    }
}

function mostrarSistemaEcuaciones(data) {
    currentMatrizA = data.sistema_original?.matriz_a || data.matriz_A;
    currentVectorB = data.sistema_original?.vector_b || data.vector_b;
    currentSolucion = data.solucion_principal?.valores || (data.solucion ? data.solucion.valores : null);
    currentAnalysis = data.analisis;

    if (!currentMatrizA || !currentVectorB) return;

    const n = currentMatrizA.length; 

    const wrapperMatrizA = document.getElementById("wrapper-matriz-a");
    if (wrapperMatrizA) {
        wrapperMatrizA.innerHTML = '';
        wrapperMatrizA.style.display = "grid";
        wrapperMatrizA.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
        wrapperMatrizA.style.gap = "6px";
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                wrapperMatrizA.innerHTML += `<div class="sol-card" style="font-size:0.85rem; padding:8px; text-align:center; background:#f7fafc; border:1px solid #e2e8f0; border-radius:4px;">${currentMatrizA[i][j].toFixed(2)}</div>`;
            }
        }
    }

    const wrapperVectorB = document.getElementById("wrapper-vector-b");
    if (wrapperVectorB) {
        wrapperVectorB.innerHTML = '';
        for (let i = 0; i < n; i++) {
            wrapperVectorB.innerHTML += `<div class="sol-card" style="font-weight:bold; padding:8px; text-align:center; background:#edf2f7; border:1px solid #cbd5e0; border-radius:4px; margin-bottom:6px;">${currentVectorB[i].toFixed(2)}</div>`;
        }
    }

    const sistemaSection = document.getElementById("sistema-section");
    if (sistemaSection) sistemaSection.style.display = "block";
    
    if (typeof actualizarEjes === "function") {
        actualizarEjes();
    }
}

function mostrarDemostracionCompletaLU(detalleLu) {
    const contenedor = document.getElementById("bloque-demostracion-lu");
    if (!contenedor) return;

    if (!detalleLu || !detalleLu.pasos_forward || !detalleLu.pasos_backward) {
        contenedor.innerHTML = "<p class='error' style='color:#718096; font-style:italic; padding:10px;'>Selecciona un escenario analítico para ver el desglose matemático completo.</p>";
        return;
    }

    let htmlPivoteo = "";
    if (detalleLu.permutacion) {
        htmlPivoteo = `
            <div style="background: #edf2f7; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #4a5568;">
                <strong>🔄 Vector de Permutación Filas (P):</strong> [ ${detalleLu.permutacion.join(" → ")} ]
                <br><small style="color:#718096;">Muestra el reordenamiento dinámico para el control de estabilidad y evitar divisiones por cero.</small>
            </div>
        `;
    }

    let htmlForward = "";
    detalleLu.pasos_forward.forEach(paso => {
        htmlForward += `<div style="font-family:monospace; margin-bottom:6px; padding:6px; background:#f7fafc; border-radius:4px;">🔹 ${paso}</div>`;
    });

    let htmlBackward = "";
    detalleLu.pasos_backward.forEach(paso => {
        htmlBackward += `<div style="font-family:monospace; margin-bottom:6px; padding:6px; background:#f0f4f8; border-radius:4px; border-left: 3px solid #3182ce;">🔸 ${paso}</div>`;
    });

    contenedor.innerHTML = `
        <div class="panel verification-panel" style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); margin-top:20px;">
            <h2 style="color: #2c3e50; font-size: 1.4rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top:0;">
                🧬 Desglose Algorítmico Explicado ($PA = LU$)
            </h2>
            <p style="font-size:0.9rem; color:#4a5568;">
                Demostración matemática del desacoplamiento metabólico del sistema alimentario de la especie avian.
            </p>
            
            ${htmlPivoteo}

            <h3 style="color:#2d3748; font-size:1.05rem; margin-bottom:8px;">1. Sustitución Progresiva ($Ly = Pb$) — Obtención del Vector Intermedio:</h3>
            <div style="margin-bottom:20px;">
                ${htmlForward}
            </div>

            <h3 style="color:#2d3748; font-size:1.05rem; margin-bottom:8px;">2. Sustitución Regresiva ($Ux = y$) — Cálculo de Concentraciones Exactas:</h3>
            <div>
                ${htmlBackward}
            </div>
            
            <div style="margin-top:20px; padding:12px; background:#e6fffa; border: 1px solid #b2f5ea; border-radius:6px; color:#234e52; text-align:center; font-weight:bold; font-size:0.95rem;">
                🎯 ¡Ajuste Homeostático Demostrado! La solución analítica directa coincide exactamente con las demandas biológicas.
            </div>
        </div>
    `;
}

function mostrarDiagnostico(analisis) {
    const container = document.getElementById("diagnosis-container");
    if (!container || !analisis) return;
    
    const cond = analisis.numero_condicion || analisis.condicion || 1.0;
    const clasif = analisis.clasificacion || "ideal";
    
    let colorAlert = "#2b6cb0"; 
    let msgClasif = "SISTEMA ESTABLE";
    if (clasif === "estres") { colorAlert = "#dd6b20"; msgClasif = "SISTEMA BAJO ESTRÉS"; }
    if (clasif === "mal_condicionado") { colorAlert = "#c53030"; msgClasif = "SISTEMA MAL CONDICIONADO"; }

    container.innerHTML = `
        <section class="panel diagnosis-panel" style="border-left: 5px solid ${colorAlert}; background:#fff; padding:15px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <h2 style="color:${colorAlert}; margin-top:0; font-size:1.3rem;">2. Diagnóstico Estructural del Modelo</h2>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-top:10px;">
                <div style="background:#f7fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0;">
                    <strong>Número de Condición $\\kappa(A)$</strong> <br> <span style="font-family:monospace; color:${colorAlert}; font-weight:bold; font-size:1.1rem;">${cond.toExponential(4)}</span>
                </div>
                <div style="background:#f7fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0;">
                    <strong>Clasificación Estructural:</strong> <br> <span style="font-weight:bold; color:${colorAlert}">${msgClasif}</span>
                </div>
                <div style="background:#f7fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0;">
                    <strong>Matriz Simétrica Pura:</strong> <br> <span style="font-weight:bold;">${analisis.es_simetrica || analisis.simetrica ? '✓ Sí' : '✗ No'}</span>
                </div>
            </div>
            <p style="margin-top:12px; font-style:italic; color:#4a5568;"><strong>Análisis del margen numérico:</strong> ${analisis.mensaje_clinico || 'Sistema procesado correctamente.'}</p>
        </section>
    `;
    
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise();
    }
}

function mostrarSolucion(data) {
    const container = document.getElementById("solucion-valores-lista") || document.getElementById("solution-main");
    if (!container) return;
    
    const valores = data.solucion_principal?.valores || (data.solucion ? data.solucion.valores : [0,0,0,0,0]);

    let html = `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; width:100%;">`;
    for (let i = 0; i < variables.length; i++) {
        html += `
            <div class="sol-card" style="border-left: 4px solid #2b6cb0; background:#f7fafc; padding:12px; border-radius:6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size:0.8rem; text-transform:uppercase; color:#718096; font-weight:bold;">${variables[i].nombre}</div>
                <div style="font-weight:500; color:#2d3748; margin:2px 0;">${variables[i].descripcion}</div>
                <div style="font-size:1.2rem; font-weight:bold; color:#2b6cb0;">${valores[i].toFixed(4)} <span style="font-size:0.8rem; color:#4a5568;">${variables[i].unidad}</span></div>
            </div>
        `;
    }
    html += `</div>`;
    container.innerHTML = html;
    
    const resultsSection = document.getElementById("results-section");
    if (resultsSection) resultsSection.style.display = "block";
}

function mostrarMetodos(cuadroComparativo) {
    if (!cuadroComparativo) return;
    
    const metodosId = {
        "jacobi": "row-jacobi",
        "gauss_seidel": "row-gs",
        "sor": "row-sor",
        "gradiente_conjugado_precond": "row-gcp",
        "lu": "row-lu" // <-- ¡Corregido para mapear el método directo!
    };

    Object.keys(metodosId).forEach(key => {
        const fila = document.getElementById(metodosId[key]);
        if (fila && cuadroComparativo[key]) {
            const info = cuadroComparativo[key];
            const iterCelda = fila.querySelector('.iter');
            const convCelda = fila.querySelector('.conv');
            
            if (iterCelda) iterCelda.innerText = info.iteraciones ?? info[1] ?? '--';
            if (convCelda) {
                const convergio = (info.convergencia === "S" || info[2] === true);
                convCelda.innerText = convergio ? "S" : "N";
                convCelda.style.color = convergio ? "#2f855a" : "#c53030";
                convCelda.style.fontWeight = "bold";
            }
        }
    });
}

function mostrarDesgloseLUYPasos(data) {
    const detailSection = document.getElementById("detail-analysis-section");
    if (detailSection) detailSection.style.display = "block";

    const divL = document.getElementById('wrapper-det-l');
    const divU = document.getElementById('wrapper-det-u');
    const divY = document.getElementById('wrapper-det-y');
    
    // 1. Renderizar Matriz Inferior L (Se mantiene intacta según tu diseño)
    if (data.detalle_lu?.matriz_l && divL) {
        divL.innerHTML = ''; 
        divL.style.display = "grid";  
        divL.style.gridTemplateColumns = "repeat(5, 1fr)"; 
        divL.style.gap = "4px";

        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                divL.innerHTML += `<div class="sol-card" style="font-size:0.8rem; padding:6px; text-align:center; background:#f7fafc; border:1px solid #e2e8f0; border-radius:4px;">${data.detalle_lu.matriz_l[i][j].toFixed(2)}</div>`;
            }
        }
    }

    // 2. Renderizar Matriz Superior U (Se mantiene intacta según tu diseño)
    if (data.detalle_lu?.matriz_u && divU) {
        divU.innerHTML = '';
        divU.style.display = "grid";  
        divU.style.gridTemplateColumns = "repeat(5, 1fr)"; 
        divU.style.gap = "4px";

        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                divU.innerHTML += `<div class="sol-card" style="font-size:0.8rem; padding:6px; text-align:center; background:#f7fafc; border:1px solid #e2e8f0; border-radius:4px;">${data.detalle_lu.matriz_u[i][j].toFixed(2)}</div>`;
            }
        }
    }

    // 3. Renderizar Vector Intermedio 'y' e INTEGRAR EL DESPEJE DE LAS 'x'
    if (data.detalle_lu?.vector_y && divY) {
        divY.innerHTML = '';
        
        // Conservar tus cápsulas horizontales actuales de los valores de Y
        let htmlContenido = `<div style="display:flex; gap:8px; flex-wrap:wrap; width:100%; margin-bottom:20px;">`;
        data.detalle_lu.vector_y.forEach((yVal, idx) => {
            htmlContenido += `<div class="sol-card" style="background:#e2e8f0; padding:8px 12px; border-radius:4px; font-weight:bold; font-size:0.9rem;">y<sub>${idx+1}</sub>: ${yVal.toFixed(2)}</div>`;
        });
        htmlContenido += `</div>`;

        // INYECCIÓN DE LA SOLUCIÓN REGRESIVA (Ux = y) PARA CONSEGUIR LAS X
        htmlContenido += `
            <div style="margin-top:20px; width:100%; text-align:left;">
                <h4 style="color:#2b6cb0; margin-bottom:12px; border-bottom:1px solid #cbd5e0; padding-bottom:6px; font-weight:600;">
                    📐 Sustitución Regresiva Resolutiva ($Ux = y$):
                </h4>
                <div style="display:flex; flex-direction:column; gap:8px;">
        `;

        // Verificar si el backend envió las cadenas formateadas con el contexto metabólico
        if (data.detalle_lu.pasos_backward && data.detalle_lu.pasos_backward.length > 0) {
            data.detalle_lu.pasos_backward.forEach(paso => {
                htmlContenido += `
                    <div style="font-family:monospace; font-size:0.85rem; padding:10px; background:#f7fafc; border-left:4px solid #2b6cb0; border-radius:4px; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                        ${paso}
                    </div>`;
            });
        } else {
            // Plan de contingencia matemático local si el servidor experimenta retrasos
            htmlContenido += `<p style="color:#718096; font-style:italic; font-size:0.9rem;">No se recibieron los pasos de sustitución del servidor.</p>`;
        }

        htmlContenido += `
                </div>
            </div>
        `;

        // Reemplazar el contenedor completo con la combinación de Y + el desglose de X
        divY.innerHTML = htmlContenido;
    }

    // 4. Inyectar tablas de pasos iterativos de los otros métodos
    if (data.historial_pasos) {
        inyectarPasosTabla('tbody-steps-jacobi', data.historial_pasos.jacobi);
        inyectarPasosTabla('tbody-steps-gs', data.historial_pasos.gauss_seidel);
        inyectarPasosTabla('tbody-steps-sor', data.historial_pasos.sor);
        inyectarPasosTabla('tbody-steps-gcp', data.historial_pasos.gradiente_conjugado_precond);
    }
}

function inyectarPasosTabla(elementId, pasos) {
    const tbody = document.getElementById(elementId);
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!pasos || pasos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#a0aec0; padding:15px;"><i class="fas fa-times-circle"></i> Divergencia o sin convergencia en este escenario fisiológico.</td></tr>`;
        return;
    }

    pasos.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${p.k}</strong></td>
                <td>${p.x[0].toFixed(4)}</td>
                <td>${p.x[1].toFixed(4)}</td>
                <td>${p.x[2].toFixed(4)}</td>
                <td>${p.x[3].toFixed(4)}</td>
                <td>${p.x[4].toFixed(4)}</td>
                <td style="color:#c53030; font-weight:bold;">${p.error.toExponential(3)}</td>
            </tr>`;
    });
}