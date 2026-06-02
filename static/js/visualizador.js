// ============================================================================
// MODULO METODOS NUMERICOS UMSA: VISUALIZACIÓN MULTIDIMENSIONAL AVANZADA (2D/3D)
// ============================================================================

let scene3D, camera3D, renderer3D;
let animationFrameId = null;
let currentSolucion = null;
let currentMatrizA = null;
let currentAnalysis = null;
let currentVectorB = null;

let selectedAxisX = 0, selectedAxisY = 1, selectedAxisZ = 2;

const axisNames = [
    "x₁ (Dosis Fármaco A)",
    "x₂ (Dosis Fármaco B)",
    "x₃ (Dosis Fármaco C)",
    "x₄ (Terapia Digital)",
    "x₅ (Intervención Adaptativa)"
];

const coloresEcuaciones = [
    { color: 0x2C3E50, nombre: "Ecuación 1 (Metabolismo)" },
    { color: 0x3498DB, nombre: "Ecuación 2 (Efecto Combinado)" },
    { color: 0xE74C3C, nombre: "Ecuación 3 (Límite Toxicidad)" },
    { color: 0xF1C40F, nombre: "Ecuación 4 (Carga Fisiológica)" },
    { color: 0x9B59B6, nombre: "Ecuación 5 (Acoplamiento IA)" }
];

function toggleVisualizacion3D() {
    const modal = document.getElementById("viz-modal");
    if (!modal) return;
    
    if (modal.style.display === "none" || modal.style.display === "") {
        modal.style.display = "flex";
        setTimeout(() => {
            if (validarSistemaParaVisualizacion()) {
                if (document.getElementById("viz-3d")?.classList.contains("active")) {
                    inicializar3D();
                } else {
                    dibujarGrafico2D();
                }
            }
        }, 100);
    }
}

function closeVisualizacion3D() {
    const modal = document.getElementById("viz-modal");
    if (modal) modal.style.display = "none";
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (renderer3D) {
        renderer3D.dispose();
        renderer3D = null;
    }
}

function switchVizTab(event, tabName) {
    document.querySelectorAll(".viz-tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".viz-tab-content").forEach(content => content.classList.remove("active"));
    
    event.currentTarget.classList.add("active");
    document.getElementById(`viz-${tabName}`)?.classList.add("active");
    
    if (tabName === "3d") {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        setTimeout(() => {
            if (validarSistemaParaVisualizacion()) inicializar3D();
        }, 100);
    } else if (tabName === "2d") {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (validarSistemaParaVisualizacion()) dibujarGrafico2D();
    }
}

function actualizarEjes() {
    selectedAxisX = parseInt(document.getElementById("viz-axis-x").value);
    selectedAxisY = parseInt(document.getElementById("viz-axis-y").value);
    selectedAxisZ = parseInt(document.getElementById("viz-axis-z").value);
    
    const axes = [selectedAxisX, selectedAxisY, selectedAxisZ];
    const currentTab = document.getElementById("viz-3d")?.classList.contains("active") ? "3d" : "2d";
    
    // Eliminada la alerta nativa perjudicial. Ahora muestra un mensaje estético dentro del panel.
    if (new Set(axes).size !== 3) {
        mostrarWarning(currentTab, "⚠️ Error de proyección: Seleccione 3 variables fisiológicas diferentes.");
        return;
    }
    
    const modal = document.getElementById("viz-modal");
    if (modal && modal.style.display !== "none") {
        if (validarSistemaParaVisualizacion()) {
            if (currentTab === "3d") {
                inicializar3D();
            } else {
                dibujarGrafico2D();
            }
        }
    }
}

function validarSistemaParaVisualizacion() {
    if (!currentMatrizA || !currentSolucion || !currentVectorB) {
        mostrarWarning("3d", "Sin datos del sistema matricial para visualizar. Genere un cálculo válido.");
        mostrarWarning("2d", "Sin datos del sistema matricial para visualizar. Genere un cálculo válido.");
        return false;
    }
    
    if (!currentSolucion.every(v => isFinite(v))) {
        mostrarWarning("3d", "⚠️ Inestabilidad Numérica: Solución divergente o indeterminada (NaN/Infinito).");
        mostrarWarning("2d", "⚠️ Inestabilidad Numérica: El sistema lineal no converge a un punto real fijo.");
        return false;
    }
    
    const w3D = document.getElementById("warning-3d");
    const w2D = document.getElementById("warning-2d");
    if (w3D) w3D.style.display = "none";
    if (w2D) w2D.style.display = "none";
    return true;
}

function mostrarWarning(tab, mensaje) {
    const container = document.getElementById(`warning-${tab}`);
    if (container) {
        container.innerHTML = `
            <div class="warning-box" style="padding:12px 16px; background:#fff5f5; color:#c53030; margin-bottom:12px; border-left:4px solid #e53e3e; border-radius:4px; font-family:inherit; font-size:13px; font-weight:500;">
                <p style="margin:0; display:flex; align-items:center; gap:8px;"><i class="fas fa-exclamation-circle"></i> ${mensaje}</p>
            </div>`;
        container.style.display = "block";
    }
}

function inicializar3D() {
    const canvas = document.getElementById("canvas-3d");
    if (!canvas) return;
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (renderer3D) renderer3D.dispose();

    const width = canvas.parentElement.clientWidth;
    const height = 460;
    
    scene3D = new THREE.Scene();
    scene3D.background = new THREE.Color(0xfafbfc);
    
    camera3D = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera3D.position.set(16, 12, 16);
    camera3D.lookAt(0, 0, 0);
    
    renderer3D = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer3D.setSize(width, height);
    renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.85);
    luzDireccional.position.set(15, 30, 15);
    scene3D.add(luzDireccional);
    scene3D.add(new THREE.AmbientLight(0xffffff, 0.55));
    
    const gridHelper = new THREE.GridHelper(24, 24, 0xdcdde1, 0xf2f2f2);
    gridHelper.position.y = -4;
    scene3D.add(gridHelper);
    
    agregarEjes3D();
    dibujarEcuaciones3D();
    dibujarPuntoSolucion3D();
    implementarControles3D();
    generarLeyenda3D();
    
    animate3D();
}

function agregarEjes3D() {
    const axes = [
        { pos: [10, 0, 0], color: 0xe53e3e }, // X
        { pos: [0, 10, 0], color: 0x38a169 }, // Y
        { pos: [0, 0, 10], color: 0x3182ce }  // Z
    ];
    
    axes.forEach(axis => {
        const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, ...axis.pos]), 3));
        const material = new THREE.LineBasicMaterial({ color: axis.color, linewidth: 2 });
        scene3D.add(new THREE.Line(geometry, material));
    });
}

function dibujarEcuaciones3D() {
    const rango = 7;
    const paso = 0.8;
    const size = Math.floor((2 * rango) / paso) + 1;

    for (let eqIdx = 0; eqIdx < currentMatrizA.length; eqIdx++) {
        const fila = currentMatrizA[eqIdx];
        const divisor = fila[selectedAxisZ];

        if (Math.abs(divisor) < 1e-6) continue;

        const restantes = [0,1,2,3,4].filter(i => i !== selectedAxisX && i !== selectedAxisY && i !== selectedAxisZ);
        const vertices = [];
        const indices = [];
        let index = 0;

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const x = -rango + i * paso;
                const y = -rango + j * paso;

                let z = (currentVectorB[eqIdx] 
                         - fila[selectedAxisX] * x 
                         - fila[selectedAxisY] * y 
                         - fila[restantes[0]] * currentSolucion[restantes[0]] 
                         - fila[restantes[1]] * currentSolucion[restantes[1]]) / divisor;

                vertices.push(x, y, isFinite(z) ? z : 0);

                if (i < size - 1 && j < size - 1) {
                    indices.push(index, index + 1, index + size);
                    indices.push(index + 1, index + size + 1, index + size);
                }
                index++;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const colorBase = coloresEcuaciones[eqIdx].color;
        const material = new THREE.MeshPhongMaterial({
            color: colorBase, 
            transparent: true, 
            opacity: 0.25, 
            side: THREE.DoubleSide, 
            depthWrite: false
        });

        scene3D.add(new THREE.Mesh(geometry, material));
    }
}

function dibujarPuntoSolucion3D() {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0x38a169, emissive: 0x2f855a });
    const punto = new THREE.Mesh(geometry, material);
    punto.position.set(currentSolucion[selectedAxisX], currentSolucion[selectedAxisY], currentSolucion[selectedAxisZ]);
    scene3D.add(punto);
}

function implementarControles3D() {
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    const canvas = document.getElementById("canvas-3d");
    if (!canvas) return;
    
    canvas.addEventListener('mousedown', (e) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging || !camera3D) return;
        const deltaX = e.clientX - prevMouse.x;
        const deltaY = e.clientY - prevMouse.y;
        
        const theta = Math.atan2(camera3D.position.z, camera3D.position.x) - deltaX * 0.006;
        const radius = Math.sqrt(camera3D.position.x**2 + camera3D.position.y**2 + camera3D.position.z**2);
        
        camera3D.position.x = radius * Math.cos(theta);
        camera3D.position.z = radius * Math.sin(theta);
        camera3D.position.y = Math.max(-2, Math.min(22, camera3D.position.y + deltaY * 0.04));
        camera3D.lookAt(0,0,0);
        
        prevMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => isDragging = false);
}

function animate3D() {
    if (!renderer3D || !scene3D) return;
    animationFrameId = requestAnimationFrame(animate3D);
    renderer3D.render(scene3D, camera3D);
}

function dibujarGrafico2D() {
    const canvas = document.getElementById("canvas-2d");
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth;
    const height = canvas.height = 450;

    ctx.clearRect(0, 0, width, height);
    
    const titleElement = document.getElementById("canvas-2d-title");
    if (titleElement) {
        titleElement.textContent = `Proyección Bidimensional: ${axisNames[selectedAxisX]} vs ${axisNames[selectedAxisY]}`;
    }

    const margin = 60;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;
    const escala = 10;

    const toCanvasX = x => margin + (x / escala) * plotWidth / 2 + plotWidth / 2;
    const toCanvasY = y => height - margin - (y / escala) * plotHeight / 2 - plotHeight / 2;

    // Retícula fina de fondo
    ctx.strokeStyle = '#f1f2f6';
    ctx.lineWidth = 1;
    for(let i = -escala; i <= escala; i += 2) {
        ctx.beginPath(); ctx.moveTo(toCanvasX(i), margin); ctx.lineTo(toCanvasX(i), height-margin); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(margin, toCanvasY(i)); ctx.lineTo(width-margin, toCanvasY(i)); ctx.stroke();
    }

    // Coordenadas cartesianas principales
    ctx.strokeStyle = '#a4b0be';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(toCanvasX(0), margin); ctx.lineTo(toCanvasX(0), height-margin); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(margin, toCanvasY(0)); ctx.lineTo(width-margin, toCanvasY(0)); ctx.stroke();

    // Dibujado exacto de hiperplanos proyectados (Las 5 restricciones clínicas del backend)
    for (let i = 0; i < currentMatrizA.length; i++) {
        const a = currentMatrizA[i][selectedAxisX];
        const b = currentMatrizA[i][selectedAxisY];
        if (Math.abs(b) < 1e-6) continue;

        const restantes = [0,1,2,3,4].filter(idx => idx !== selectedAxisX && idx !== selectedAxisY);
        
        let c = currentVectorB[i] - (
            currentMatrizA[i][restantes[0]] * currentSolucion[restantes[0]] + 
            currentMatrizA[i][restantes[1]] * currentSolucion[restantes[1]] + 
            currentMatrizA[i][restantes[2]] * currentSolucion[restantes[2]]
        );

        ctx.beginPath();
        ctx.strokeStyle = '#' + coloresEcuaciones[i].color.toString(16).padStart(6, '0');
        ctx.lineWidth = 2.5;

        let flag = true;
        for (let x = -escala; x <= escala; x += 0.2) {
            let y = (c - a * x) / b;
            if(isFinite(y)) {
                if (flag) { ctx.moveTo(toCanvasX(x), toCanvasY(y)); flag = false; }
                else { ctx.lineTo(toCanvasX(x), toCanvasY(y)); }
            }
        }
        ctx.stroke();
    }

    // Nodo Solución Calculado (LU / GCP / Iterativos)
    const pX = currentSolucion[selectedAxisX];
    const pY = currentSolucion[selectedAxisY];
    if(isFinite(pX) && isFinite(pY)) {
        ctx.fillStyle = '#38a169';
        ctx.beginPath(); ctx.arc(toCanvasX(pX), toCanvasY(pY), 6.5, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    }

    generarLeyenda2D();
}

function generarLeyenda3D() {
    const container = document.getElementById("legend-3d");
    if (!container) return;
    let html = '';
    for (let i = 0; i < 5; i++) {
        html += `
            <div class="legend-item" style="display:flex; align-items:center; margin-bottom:6px; font-size:12px; font-family:inherit; color:#2d3748;">
                <div class="legend-color" style="width:12px; height:12px; background-color:#${coloresEcuaciones[i].color.toString(16).padStart(6, '0')}; margin-right:8px; border-radius:3px;"></div>
                <div class="legend-label" style="font-weight:500;">${coloresEcuaciones[i].nombre}</div>
            </div>`;
    }
    html += `<div class="legend-item" style="display:flex; align-items:center; font-size:12px; font-family:inherit; margin-top:4px;"><div class="legend-color" style="width:12px; height:12px; background-color:#38a169; margin-right:8px; border-radius:50%;"></div><div style="font-weight:600; color:#2f855a;">Dosificación Óptima</div></div>`;
    container.innerHTML = html;
}

function generarLeyenda2D() {
    const container = document.getElementById("legend-2d");
    if (!container) return;
    let html = '';
    for (let i = 0; i < 5; i++) {
        html += `
            <div class="legend-item" style="display:flex; align-items:center; margin-bottom:6px; font-size:12px; font-family:inherit; color:#2d3748;">
                <div class="legend-color" style="width:12px; height:12px; background-color:#${coloresEcuaciones[i].color.toString(16).padStart(6, '0')}; margin-right:8px; border-radius:3px;"></div>
                <div class="legend-label" style="font-weight:500;">${coloresEcuaciones[i].nombre}</div>
            </div>`;
    }
    html += `<div class="legend-item" style="display:flex; align-items:center; font-size:12px; font-family:inherit; margin-top:4px;"><div class="legend-color" style="width:12px; height:12px; background-color:#38a169; margin-right:8px; border-radius:50%;"></div><div style="font-weight:600; color:#2f855a;">Intersección Solución</div></div>`;
    container.innerHTML = html;
}