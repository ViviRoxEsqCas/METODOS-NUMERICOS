// ====================================
// VISUALIZACIÓN 3D Y 2D MEJORADA
// ====================================

let scene3D, camera3D, renderer3D;
let currentSolucion = null;
let currentMatrizA = null;
let currentAnalysis = null;
let currentVectorB = null;
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
    if (!currentMatrizA || !currentSolucion || !currentVectorB) {
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
    if (currentMatrizA && currentSolucion && currentVectorB) {
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
    if (!currentMatrizA || !currentSolucion || !currentVectorB) return;

    const A = currentMatrizA;
    const bVec = currentVectorB;
    const sol = currentSolucion;

    const rango = 10;
    const paso = 1.5;

    for (let eqIdx = 0; eqIdx < A.length; eqIdx++) {
        const fila = A[eqIdx];

        // índices que NO están en el plano
        const restantes = [0,1,2,3,4].filter(i =>
            i !== selectedAxisX &&
            i !== selectedAxisY &&
            i !== selectedAxisZ
        );

        const divisor = fila[selectedAxisZ];

        if (Math.abs(divisor) < 1e-10) continue;

        const vertices = [];
        const indices = [];
        let index = 0;

        const size = Math.floor((2 * rango) / paso) + 1;

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {

                const x = -rango + i * paso;
                const y = -rango + j * paso;

                let z = (
                    bVec[eqIdx]
                    - fila[selectedAxisX] * x
                    - fila[selectedAxisY] * y
                    - fila[restantes[0]] * sol[restantes[0]]
                    - fila[restantes[1]] * sol[restantes[1]]
                ) / divisor;

                if (!isFinite(z)) z = 0;

                vertices.push(x, y, z);

                if (i < size - 1 && j < size - 1) {
                    const a = index;
                    const b = index + 1;
                    const c = index + size;
                    const d = index + size + 1;

                    indices.push(a, b, c);
                    indices.push(b, d, c);
                }

                index++;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array(vertices), 3)
        );
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        // Color tipo GeoGebra (suave + transparente)
        const colorBase = coloresEcuaciones[eqIdx % coloresEcuaciones.length].color;

        const material = new THREE.MeshPhongMaterial({
            color: colorBase,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene3D.add(mesh);

        // Bordes tipo GeoGebra
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({
                color: colorBase,
                transparent: true,
                opacity: 0.5
            })
        );
        scene3D.add(line);
    }
}

function dibujarPuntoSolucion3D() {
    if (!currentSolucion) return;

    const geometry = new THREE.SphereGeometry(0.8, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: 0x00cc66,
        emissive: 0x00ffcc,
        shininess: 120
    });

    const punto = new THREE.Mesh(geometry, material);

    punto.position.set(
        currentSolucion[selectedAxisX],
        currentSolucion[selectedAxisY],
        currentSolucion[selectedAxisZ]
    );

    scene3D.add(punto);

    // efecto tipo "halo"
    const halo = new THREE.SphereGeometry(1.5, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.15
    });

    const glow = new THREE.Mesh(halo, haloMat);
    glow.position.copy(punto.position);
    scene3D.add(glow);
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
    if (!canvas || !currentMatrizA || !currentVectorB) return;

    try {
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.parentElement.clientWidth;
        const height = canvas.height = 450;

        ctx.fillStyle = '#fafbfc';
        ctx.fillRect(0, 0, width, height);

        const margin = 70;
        const plotWidth = width - 2 * margin;
        const plotHeight = height - 2 * margin;

        const A = currentMatrizA;
        const bVec = currentVectorB;
        const sol = currentSolucion;

        document.getElementById("canvas-2d-title").textContent =
            `Proyección 2D: ${axisNames[selectedAxisX]} vs ${axisNames[selectedAxisY]}`;

        // Ejes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(margin, height - margin);
        ctx.lineTo(margin, margin);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(margin, height - margin);
        ctx.lineTo(width - margin, height - margin);
        ctx.stroke();

        // Escala fija (mejor estabilidad visual)
        const escala = 10;

        function toCanvasX(x) {
            return margin + (x / escala) * plotWidth / 2 + plotWidth / 2;
        }

        function toCanvasY(y) {
            return height - margin - (y / escala) * plotHeight / 2 - plotHeight / 2;
        }

        // =========================
        // DIBUJAR ECUACIONES (RECTAS)
        // =========================
        for (let i = 0; i < A.length; i++) {

            const a = A[i][selectedAxisX];
            const b = A[i][selectedAxisY];

            // variables que NO están en el plano
            const restantes = [0,1,2,3,4].filter(idx =>
                idx !== selectedAxisX &&
                idx !== selectedAxisY
            );

            // sustituimos con solución SOLO para reducir dimensión
            let c = bVec[i];

            if (sol) {
                c -= A[i][restantes[0]] * sol[restantes[0]];
                c -= A[i][restantes[1]] * sol[restantes[1]];
                c -= A[i][restantes[2]] * sol[restantes[2]];
            }

            // evitar división por cero
            if (Math.abs(b) < 1e-10) continue;

            // forma: y = (c - a*x)/b
            ctx.beginPath();

            const colorHex = '#' + coloresEcuaciones[i].color.toString(16).padStart(6, '0');
            ctx.strokeStyle = colorHex;
            ctx.lineWidth = 2;

            let firstPoint = true;

            for (let x = -escala; x <= escala; x += 0.5) {
                const y = (c - a * x) / b;

                if (!isFinite(y)) continue;

                const px = toCanvasX(x);
                const py = toCanvasY(y);

                if (firstPoint) {
                    ctx.moveTo(px, py);
                    firstPoint = false;
                } else {
                    ctx.lineTo(px, py);
                }
            }

            ctx.stroke();
        }

        // =========================
        // PUNTO SOLUCIÓN
        // =========================
        if (sol) {
            const x = sol[selectedAxisX];
            const y = sol[selectedAxisY];

            if (isFinite(x) && isFinite(y)) {
                const px = toCanvasX(x);
                const py = toCanvasY(y);

                ctx.fillStyle = '#27ae60';
                ctx.beginPath();
                ctx.arc(px, py, 6, 0, 2 * Math.PI);
                ctx.fill();
            }
        }

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
function actualizarVisualizacion(matrizA, solucion, analysis, vectorB) {
    if (matrizA) currentMatrizA = matrizA;
    if (solucion && solucion.length > 0) currentSolucion = solucion;
    if (analysis) currentAnalysis = analysis;
    if (vectorB) currentVectorB = vectorB;
}
