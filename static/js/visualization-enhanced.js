// ====================================
// VISUALIZACIÓN 3D Y 2D MEJORADA
// ====================================

let scene3D, camera3D, renderer3D;
let currentSolucion = null;
let currentMatrizA = null;
let currentAnalysis = null;
let controls3D = null;

// Variables de ejes seleccionados
let selectedAxisX = 0, selectedAxisY = 1, selectedAxisZ = 2;

// Nombres de variables
const axisNames = [
    "x₁ (Dosis Fármaco A)",
    "x₂ (Dosis Fármaco B)",
    "x₃ (Dosis Fármaco C)",
    "x₄ (Terapia Digital)",
    "x₅ (Intervención IA)"
];

// Colores para las ecuaciones (paleta minimalista japonesa)
const coloresEcuaciones = [
    { color: 0x2C3E50, nombre: "Ecuación 1" },
    { color: 0xA8C7D8, nombre: "Ecuación 2" },
    { color: 0x34495E, nombre: "Ecuación 3" },
    { color: 0x7F8C8D, nombre: "Ecuación 4" },
    { color: 0x95A5A6, nombre: "Ecuación 5" }
];

// Función para abrir visualización
function toggleVisualizacion3D() {
    const modal = document.getElementById("viz-modal");
    if (modal.style.display === "none") {
        modal.style.display = "flex";
        setTimeout(() => {
            if (currentMatrizA && currentSolucion) {
                // Validar sistema antes de visualizar
                if (validarSistemaParaVisualizacion()) {
                    if (document.getElementById("viz-3d").classList.contains("active")) {
                        inicializar3D();
                    } else {
                        dibujarGrafico2D();
                    }
                }
            }
        }, 100);
    }
}

function closeVisualizacion3D() {
    const modal = document.getElementById("viz-modal");
    modal.style.display = "none";
    if (renderer3D) {
        renderer3D.dispose();
        renderer3D = null;
    }
}

function switchVizTab(tabName) {
    document.querySelectorAll(".viz-tab-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    document.querySelectorAll(".viz-tab-content").forEach(content => {
        content.classList.remove("active");
    });
    
    event.target.classList.add("active");
    document.getElementById(`viz-${tabName}`).classList.add("active");
    
    if (tabName === "3d" && !renderer3D) {
        setTimeout(() => inicializar3D(), 100);
    } else if (tabName === "2d") {
        dibujarGrafico2D();
    }
}

function actualizarEjes() {
    selectedAxisX = parseInt(document.getElementById("viz-axis-x").value);
    selectedAxisY = parseInt(document.getElementById("viz-axis-y").value);
    selectedAxisZ = parseInt(document.getElementById("viz-axis-z").value);
    
    // Validar que no haya ejes duplicados
    const axes = [selectedAxisX, selectedAxisY, selectedAxisZ];
    if (new Set(axes).size !== 3) {
        alert("Por favor selecciona 3 variables diferentes");
        return;
    }
    
    // Re-dibujar si está visible
    const modal = document.getElementById("viz-modal");
    if (modal.style.display !== "none") {
        if (document.getElementById("viz-3d").classList.contains("active")) {
            if (renderer3D) {
                renderer3D.dispose();
                renderer3D = null;
            }
            inicializar3D();
        } else {
            dibujarGrafico2D();
        }
    }
}

// Validación robusta del sistema
function validarSistemaParaVisualizacion() {
    if (!currentMatrizA || !currentSolucion) {
        mostrarWarning("3d", "Sin datos del sistema para visualizar");
        mostrarWarning("2d", "Sin datos del sistema para visualizar");
        return false;
    }
    
    // Verificar que la solución contiene números válidos
    if (!currentSolucion.every(v => isFinite(v))) {
        mostrarWarning("3d", "⚠️ Solución contiene valores inválidos (inf/nan)");
        mostrarWarning("2d", "⚠️ Solución contiene valores inválidos");
        return false;
    }
    
    // Verificar determinante (muy pequeño = problema)
    const det = calcularDeterminante(currentMatrizA);
    
    if (isNaN(det) || !isFinite(det)) {
        mostrarWarning("3d", "⚠️ Sistema singular - La matriz es singular, visualización aproximada");
        mostrarWarning("2d", "⚠️ Sistema singular - Resultados pueden no ser exactos");
        return true; // Permitir pero con advertencia
    }
    
    if (Math.abs(det) < 1e-10) {
        mostrarWarning("3d", "⚠️ Sistema mal condicionado (det ≈ " + det.toExponential(2) + ") - Visualización simplificada");
        mostrarWarning("2d", "⚠️ Matriz casi singular - Visualización aproximada");
        return true; // Permitir pero con advertencia
    }
    
    // Verificar número de condición
    if (currentAnalysis && currentAnalysis.condicion > 1000) {
        mostrarWarning("3d", "⚠️ Matriz mal condicionada (κ ≈ " + currentAnalysis.condicion.toFixed(0) + ") - Resultados pueden ser inexactos");
        mostrarWarning("2d", "⚠️ Matriz mal condicionada - Visualización aproximada");
        return true;
    }
    
    // Limpiar advertencias si todo está bien
    document.getElementById("warning-3d").style.display = "none";
    document.getElementById("warning-2d").style.display = "none";
    
    return true;
}

function mostrarWarning(tab, mensaje) {
    const container = document.getElementById(`warning-${tab}`);
    container.innerHTML = `<div class="warning-box"><p>${mensaje}</p></div>`;
    container.style.display = "block";
}

function calcularDeterminante(matriz) {
    const n = matriz.length;
    if (n === 0) return 0;
    
    // Para matrices pequeñas, usar método simple
    if (n === 1) return matriz[0][0];
    if (n === 2) {
        return matriz[0][0] * matriz[1][1] - matriz[0][1] * matriz[1][0];
    }
    
    // Para 5x5, usar aproximación
    try {
        let det = 1;
        const A = matriz.map(row => [...row]);
        
        for (let i = 0; i < Math.min(n, 3); i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
                    maxRow = k;
                }
            }
            
            if (Math.abs(A[maxRow][i]) < 1e-10) return 0;
            
            if (maxRow !== i) {
                [A[i], A[maxRow]] = [A[maxRow], A[i]];
                det *= -1;
            }
            
            det *= A[i][i];
        }
        
        return det;
    } catch (e) {
        return 0;
    }
}

// Inicializar 3D
function inicializar3D() {
    const canvas = document.getElementById("canvas-3d");
    if (!canvas) return;
    
    const width = canvas.parentElement.clientWidth;
    const height = 450;
    
    scene3D = new THREE.Scene();
    scene3D.background = new THREE.Color(0xfafbfc);
    
    camera3D = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera3D.position.set(20, 15, 20);
    camera3D.lookAt(0, 0, 0);
    
    renderer3D = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer3D.setSize(width, height);
    renderer3D.setPixelRatio(window.devicePixelRatio);
    
    // Luces
    const luz1 = new THREE.DirectionalLight(0xffffff, 0.85);
    luz1.position.set(30, 30, 30);
    scene3D.add(luz1);
    
    const luz2 = new THREE.AmbientLight(0xffffff, 0.45);
    scene3D.add(luz2);
    
    // Grid
    const gridHelper = new THREE.GridHelper(30, 30, 0xe8e8e8, 0xf5f5f5);
    gridHelper.position.y = -12;
    scene3D.add(gridHelper);
    
    // Ejes
    agregarEjes3D();
    
    // Dibujar planos
    if (currentMatrizA && currentSolucion) {
        dibujarEcuaciones3D();
        dibujarPuntoSolucion3D();
    }
    
    implementarControles3D();
    generarLeyenda3D();
    animate3D();
}

function agregarEjes3D() {
    const axes = [
        { pos: [15, 0, 0], color: 0xff6b6b, label: axisNames[selectedAxisX] },
        { pos: [0, 15, 0], color: 0x51cf66, label: axisNames[selectedAxisY] },
        { pos: [0, 0, 15], color: 0x4c6ef5, label: axisNames[selectedAxisZ] }
    ];
    
    axes.forEach((axis, i) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(
            new Float32Array([0, 0, 0, ...axis.pos]), 3
        ));
        const material = new THREE.LineBasicMaterial({ color: axis.color, linewidth: 3 });
        const line = new THREE.Line(geometry, material);
        scene3D.add(line);
        
        // Punta de flecha
        const coneGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        const coneMaterial = new THREE.MeshPhongMaterial({ color: axis.color });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.set(...axis.pos);
        const dir = new THREE.Vector3(...axis.pos).normalize();
        cone.lookAt(dir);
        cone.translateZ(0.75);
        scene3D.add(cone);
    });
}

function dibujarEcuaciones3D() {
    if (!currentMatrizA) return;
    
    const A = currentMatrizA;
    
    // Determinar rango dinámico basado en los valores del sistema
    const maxCoeff = Math.max(...A.flat().map(Math.abs));
    const rango = Math.min(8, Math.max(3, 10 / (1 + maxCoeff / 10)));
    const paso = Math.max(1, rango / 4); // Máximo 16 puntos por eje
    
    for (let eqIdx = 0; eqIdx < Math.min(2, A.length); eqIdx++) { // Solo 2 planos
        const fila = A[eqIdx];
        const colorData = coloresEcuaciones[eqIdx];
        
        // Validar que hay coeficientes significativos
        const coeff = [
            Math.abs(fila[selectedAxisX] || 0),
            Math.abs(fila[selectedAxisY] || 0),
            Math.abs(fila[selectedAxisZ] || 0)
        ];
        
        if (coeff.every(c => c < 1e-10)) continue; // Saltar filas con coeficientes nulos
        
        const vertices = [];
        const indices = [];
        let vertexCount = 0;
        const vertexMap = new Map();
        
        // Limitar cantidad máxima de vértices
        const maxVertices = 100;
        let addedVertices = 0;
        
        // Generar malla simplificada
        for (let u = -rango; u <= rango; u += paso) {
            for (let v = -rango; v <= rango; v += paso) {
                if (addedVertices >= maxVertices) break;
                
                const x = u;
                const y = v;
                
                // Cálculo seguro de z
                let z;
                const divisor = fila[selectedAxisZ] || 1;
                
                if (Math.abs(divisor) < 1e-10) {
                    z = 0; // Plano paralelo
                } else {
                    z = (10 - coeff[0] * x - coeff[1] * y) / divisor;
                    
                    // Clamping para valores extremos
                    z = Math.max(-15, Math.min(15, z));
                    
                    if (!isFinite(z)) z = 0;
                }
                
                vertices.push(x, y, z + eqIdx * 1.5);
                vertexMap.set(`${u},${v}`, vertexCount);
                
                // Crear triángulos solo si hay vértices suficientes
                if (u < rango && v < rango) {
                    const a = vertexMap.get(`${u},${v}`);
                    const b = vertexMap.get(`${u + paso},${v}`);
                    const c = vertexMap.get(`${u},${v + paso}`);
                    const d = vertexMap.get(`${u + paso},${v + paso}`);
                    
                    if (a !== undefined && b !== undefined && c !== undefined) {
                        indices.push(a, b, c);
                    }
                    if (b !== undefined && c !== undefined && d !== undefined) {
                        indices.push(b, d, c);
                    }
                }
                vertexCount++;
                addedVertices++;
            }
            if (addedVertices >= maxVertices) break;
        }
        
        if (vertices.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(
                new Float32Array(vertices), 3
            ));
            if (indices.length > 0) {
                geometry.setIndex(new THREE.BufferAttribute(
                    new Uint32Array(indices), 1
                ));
                geometry.computeVertexNormals();
            }
            
            const material = new THREE.MeshPhongMaterial({
                color: colorData.color,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide,
                flatShading: true, // Mejor rendimiento
                wireframe: false
            });
            
            const malla = new THREE.Mesh(geometry, material);
            scene3D.add(malla);
            
            // Wireframe simplificado (solo bordes)
            if (indices.length > 0) {
                const edges = new THREE.EdgesGeometry(geometry, 20);
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: colorData.color,
                    opacity: 0.4,
                    transparent: true,
                    linewidth: 1
                });
                const wireframe = new THREE.LineSegments(edges, lineMaterial);
                scene3D.add(wireframe);
            }
        }
    }
}

function dibujarPuntoSolucion3D() {
    if (!currentSolucion) return;
    
    const geometry = new THREE.SphereGeometry(0.7, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: 0x27ae60,
        emissive: 0x1abc9c,
        shininess: 100,
        wireframe: false
    });
    
    const punto = new THREE.Mesh(geometry, material);
    punto.position.set(
        currentSolucion[selectedAxisX] || 0,
        currentSolucion[selectedAxisY] || 0,
        currentSolucion[selectedAxisZ] || 0
    );
    
    scene3D.add(punto);
    
    // Órbita de luz
    const orbitGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0x27ae60,
        transparent: true,
        opacity: 0.3
    });
    const orbit = new THREE.LineSegments(
        new THREE.WireframeGeometry(orbitGeometry),
        orbitMaterial
    );
    orbit.position.copy(punto.position);
    scene3D.add(orbit);
}

function implementarControles3D() {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    const canvas = document.getElementById("canvas-3d");
    if (!canvas) return;
    
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging && camera3D) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            
            const rotationSpeed = 0.01;
            
            const theta = Math.atan2(camera3D.position.z, camera3D.position.x);
            const phi = Math.atan2(camera3D.position.y, Math.sqrt(
                camera3D.position.x ** 2 + camera3D.position.z ** 2
            ));
            
            const radius = Math.sqrt(
                camera3D.position.x ** 2 + 
                camera3D.position.y ** 2 + 
                camera3D.position.z ** 2
            );
            
            const newTheta = theta + deltaX * rotationSpeed;
            const newPhi = Math.max(0.1, Math.min(Math.PI - 0.1, phi + deltaY * rotationSpeed));
            
            camera3D.position.x = radius * Math.sin(newPhi) * Math.cos(newTheta);
            camera3D.position.y = radius * Math.cos(newPhi);
            camera3D.position.z = radius * Math.sin(newPhi) * Math.sin(newTheta);
            
            camera3D.lookAt(0, 0, 0);
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 1.1;
        const direction = e.deltaY > 0 ? zoomSpeed : 1 / zoomSpeed;
        camera3D.position.multiplyScalar(direction);
    });
}

function animate3D() {
    if (!renderer3D || !scene3D) return;
    requestAnimationFrame(animate3D);
    renderer3D.render(scene3D, camera3D);
}

function dibujarGrafico2D() {
    const canvas = document.getElementById("canvas-2d");
    if (!canvas || !currentSolucion) return;
    
    try {
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.parentElement.clientWidth;
        const height = canvas.height = 450;
        
        // Fondo
        ctx.fillStyle = '#fafbfc';
        ctx.fillRect(0, 0, width, height);
        
        const margin = 70;
        const plotWidth = width - 2 * margin;
        const plotHeight = height - 2 * margin;
        
        // Títulos de ejes
        document.getElementById("canvas-2d-title").textContent = 
            `Proyección 2D: ${axisNames[selectedAxisX]} vs ${axisNames[selectedAxisY]}`;
        
        // Ejes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(margin, height - margin);
        ctx.lineTo(margin, margin);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(margin, height - margin);
        ctx.lineTo(width - margin, height - margin);
        ctx.stroke();
        
        // Etiquetas
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(axisNames[selectedAxisX], width / 2, height - 15);
        
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(axisNames[selectedAxisY], 0, 0);
        ctx.restore();
        
        // Escala segura
        const val1 = currentSolucion[selectedAxisX] || 0;
        const val2 = currentSolucion[selectedAxisY] || 0;
        
        if (!isFinite(val1) || !isFinite(val2)) {
            ctx.fillStyle = '#e74c3c';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Datos no válidos para proyección 2D', width / 2, height / 2);
            return;
        }
        
        const maxVal = Math.max(Math.abs(val1), Math.abs(val2)) * 1.8 + 1;
        const clampedMaxVal = Math.min(maxVal, 100); // Limitar escala
        
        // Grid y números
        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 1;
        ctx.font = '11px Arial';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'right';
        
        for (let i = 0; i <= 10; i++) {
            const x = margin + (i / 10) * plotWidth;
            const y = height - margin - (i / 10) * plotHeight;
            
            ctx.beginPath();
            ctx.moveTo(x, margin);
            ctx.lineTo(x, height - margin);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(margin, y);
            ctx.lineTo(width - margin, y);
            ctx.stroke();
            
            const val = (i / 10) * clampedMaxVal;
            ctx.fillText(val.toFixed(1), margin - 10, y + 4);
            ctx.textAlign = 'center';
            ctx.fillText(val.toFixed(1), x, height - margin + 20);
        }
        
        // Punto solución
        const px = margin + (val1 / clampedMaxVal) * plotWidth * 0.5 + plotWidth * 0.25;
        const py = height - margin - (val2 / clampedMaxVal) * plotHeight * 0.5 - plotHeight * 0.25;
        
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        generarLeyenda2D();
    } catch (e) {
        console.error('Error en dibujarGrafico2D:', e);
    }
}

function generarLeyenda3D() {
    const container = document.getElementById("legend-3d");
    let html = '';
    
    for (let i = 0; i < 3; i++) {
        const color = coloresEcuaciones[i];
        const hexColor = '#' + color.color.toString(16).padStart(6, '0');
        
        html += `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${hexColor};"></div>
                <div class="legend-label">${color.nombre}</div>
            </div>
        `;
    }
    
    html += `
        <div class="legend-item">
            <div class="legend-color" style="background-color: #27ae60;"></div>
            <div class="legend-label">Punto Solución</div>
        </div>
    `;
    
    container.innerHTML = html;
}

function generarLeyenda2D() {
    const container = document.getElementById("legend-2d");
    let html = '';
    
    for (let i = 0; i < 3; i++) {
        const color = coloresEcuaciones[i];
        const hexColor = '#' + color.color.toString(16).padStart(6, '0');
        
        html += `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${hexColor};"></div>
                <div class="legend-label">${color.nombre}</div>
            </div>
        `;
    }
    
    html += `
        <div class="legend-item">
            <div class="legend-color" style="background-color: #27ae60;"></div>
            <div class="legend-label">Solución</div>
        </div>
    `;
    
    container.innerHTML = html;
}

function rgbFromHex(hex) {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `rgb(${r},${g},${b})`;
}

// Actualizar visualización
function actualizarVisualizacion(matrizA, solucion, analysis) {
    if (matrizA) {
        currentMatrizA = matrizA;
    }
    if (solucion && solucion.length > 0) {
        currentSolucion = solucion;
    }
    if (analysis) {
        currentAnalysis = analysis;
    }
}
