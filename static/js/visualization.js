// ====================================
// VISUALIZACIÓN 3D Y 2D DEL SISTEMA
// ====================================

let scene3D, camera3D, renderer3D;
let currentSolucion = null;
let currentMatrizA = null;
let controls3D = null;

// Colores para las ecuaciones (inspirado en paleta japonesa minimalista)
const coloresEcuaciones = [
    { color: 0x2C3E50, nombre: "Ec. 1" },  // Gris oscuro
    { color: 0xA8C7D8, nombre: "Ec. 2" },  // Azul claro
    { color: 0x34495E, nombre: "Ec. 3" },  // Azul gris
    { color: 0x7F8C8D, nombre: "Ec. 4" },  // Gris
    { color: 0x95A5A6, nombre: "Ec. 5" }   // Gris claro
];

// Variables globales para el canvas
function toggleVisualizacion3D() {
    const modal = document.getElementById("viz-modal");
    if (modal.style.display === "none") {
        modal.style.display = "flex";
        // Inicializar visualizaciones si no lo están
        setTimeout(() => {
            if (currentMatrizA && currentSolucion) {
                inicializar3D();
                dibujarGrafico2D();
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
    // Remover clase active de todos los tabs
    document.querySelectorAll(".viz-tab-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    document.querySelectorAll(".viz-tab-content").forEach(content => {
        content.classList.remove("active");
    });
    
    // Activar tab seleccionado
    event.target.classList.add("active");
    document.getElementById(`viz-${tabName}`).classList.add("active");
    
    // Si es 3D, inicializar
    if (tabName === "3d" && !renderer3D) {
        setTimeout(() => inicializar3D(), 100);
    }
}

function inicializar3D() {
    const canvas = document.getElementById("canvas-3d");
    if (!canvas) return;
    
    const width = canvas.parentElement.clientWidth;
    const height = 400;
    
    // Crear escena
    scene3D = new THREE.Scene();
    scene3D.background = new THREE.Color(0xf5f5f5);
    
    // Cámara
    camera3D = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera3D.position.set(15, 12, 15);
    camera3D.lookAt(0, 0, 0);
    
    // Renderer
    renderer3D = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer3D.setSize(width, height);
    renderer3D.setPixelRatio(window.devicePixelRatio);
    
    // Controles (rotación con ratón)
    implementarControles3D();
    
    // Luces
    const luz1 = new THREE.DirectionalLight(0xffffff, 0.8);
    luz1.position.set(20, 20, 20);
    scene3D.add(luz1);
    
    const luz2 = new THREE.AmbientLight(0xffffff, 0.4);
    scene3D.add(luz2);
    
    // Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0xdddddd, 0xf0f0f0);
    gridHelper.position.y = -10;
    scene3D.add(gridHelper);
    
    // Ejes
    agregarEjes3D();
    
    // Dibujar planos de las ecuaciones
    if (currentMatrizA && currentSolucion) {
        dibujarEcuaciones3D();
        dibujarPuntoSolucion3D();
    }
    
    // Animar
    animate3D();
}

function agregarEjes3D() {
    // Eje X (rojo)
    const geometryX = new THREE.BufferGeometry();
    geometryX.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([0,0,0, 15,0,0]), 3
    ));
    const materialX = new THREE.LineBasicMaterial({ color: 0xff6b6b });
    const ejeX = new THREE.Line(geometryX, materialX);
    scene3D.add(ejeX);
    
    // Eje Y (verde)
    const geometryY = new THREE.BufferGeometry();
    geometryY.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([0,0,0, 0,15,0]), 3
    ));
    const materialY = new THREE.LineBasicMaterial({ color: 0x51cf66 });
    const ejeY = new THREE.Line(geometryY, materialY);
    scene3D.add(ejeY);
    
    // Eje Z (azul)
    const geometryZ = new THREE.BufferGeometry();
    geometryZ.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([0,0,0, 0,0,15]), 3
    ));
    const materialZ = new THREE.LineBasicMaterial({ color: 0x4c6ef5 });
    const ejeZ = new THREE.Line(geometryZ, materialZ);
    scene3D.add(ejeZ);
    
    // Etiquetas
    agregarEtiquetasEjes();
}

function agregarEtiquetasEjes() {
    // Crear canvas para texto
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 256;
    
    ctx.font = 'Bold 40px Arial';
    ctx.fillStyle = '#333333';
    
    // X
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText('x₁', 20, 40);
    const textureX = new THREE.CanvasTexture(canvas);
    const materialX = new THREE.SpriteMaterial({ map: textureX });
    const spriteX = new THREE.Sprite(materialX);
    spriteX.scale.set(4, 4, 1);
    spriteX.position.set(16, 0, 0);
    scene3D.add(spriteX);
}

function dibujarEcuaciones3D() {
    if (!currentMatrizA) return;
    
    const A = currentMatrizA;
    const paso = 1;
    const rango = 10;
    
    // Dibujar los primeros 3 planos (x1, x2, x3)
    for (let eqIdx = 0; eqIdx < Math.min(3, A.length); eqIdx++) {
        const fila = A[eqIdx];
        const colorData = coloresEcuaciones[eqIdx];
        
        // Crear geometría del plano
        const geometria = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        
        let indiceVertice = 0;
        
        // Generar malla
        for (let x = -rango; x <= rango; x += paso) {
            for (let y = -rango; y <= rango; y += paso) {
                // a*x1 + b*x2 + c*x3 + d*x4 + e*x5 = b_val
                // Usando x1 y x2 como ejes principales
                const z = fila[3] ? (fila[3] * 5 + fila[4] * 3) / 10 : 0;
                
                vertices.push(x, y, z + eqIdx * 2);
                
                if (x < rango && y < rango) {
                    const a = indiceVertice;
                    const b = a + (2 * rango / paso + 1);
                    indices.push(a, b, a + 1);
                    indices.push(b, b + 1, a + 1);
                }
                indiceVertice++;
            }
        }
        
        geometria.setAttribute('position', new THREE.BufferAttribute(
            new Float32Array(vertices), 3
        ));
        geometria.setIndex(new THREE.BufferAttribute(
            new Uint32Array(indices), 1
        ));
        
        const material = new THREE.MeshPhongMaterial({
            color: colorData.color,
            transparent: true,
            opacity: 0.3,
            wireframe: false,
            side: THREE.DoubleSide
        });
        
        const malla = new THREE.Mesh(geometria, material);
        scene3D.add(malla);
        
        // Agregar líneas de contorno
        const lineGeometry = new THREE.WireframeGeometry(geometria);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: colorData.color,
            linewidth: 1,
            opacity: 0.6,
            transparent: true
        });
        const wireframe = new THREE.LineSegments(lineGeometry, lineMaterial);
        scene3D.add(wireframe);
    }
}

function dibujarPuntoSolucion3D() {
    if (!currentSolucion) return;
    
    // Crear punto de solución (en x1, x2, x3)
    const geometria = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: 0x27ae60,
        emissive: 0x1abc9c,
        shininess: 100
    });
    
    const punto = new THREE.Mesh(geometria, material);
    punto.position.set(
        currentSolucion[0] || 0,
        currentSolucion[1] || 0,
        currentSolucion[2] || 0
    );
    
    scene3D.add(punto);
}

function animate3D() {
    if (!renderer3D || !scene3D) return;
    
    requestAnimationFrame(animate3D);
    
    // Rotación suave
    if (scene3D.children.length > 0) {
        // Mantener la rotación del usuario
    }
    
    renderer3D.render(scene3D, camera3D);
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
            
            // Rotación alrededor del objeto
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
    
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });
    
    // Zoom con scroll
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const zoomSpeed = 1.1;
        const direction = e.deltaY > 0 ? zoomSpeed : 1 / zoomSpeed;
        
        camera3D.position.multiplyScalar(direction);
    });
}

function dibujarGrafico2D() {
    const canvas = document.getElementById("canvas-2d");
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth;
    const height = canvas.height = 400;
    
    // Limpiar
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    // Márgenes
    const margin = 60;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;
    
    // Dibujar ejes
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
    
    // Etiquetas de ejes
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('x₁ (Dosis Fármaco A)', width / 2, height - 10);
    
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('x₂ (Dosis Fármaco B)', 0, 0);
    ctx.restore();
    
    // Escala y grid
    const maxVal = currentSolucion ? Math.max(...currentSolucion.slice(0, 2)) * 1.5 : 10;
    const gridSpacing = 20;
    
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 10; i++) {
        const x = margin + (i / 10) * plotWidth;
        const y = height - margin - (i / 10) * plotHeight;
        
        // Grid vertical
        ctx.beginPath();
        ctx.moveTo(x, margin);
        ctx.lineTo(x, height - margin);
        ctx.stroke();
        
        // Grid horizontal
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(width - margin, y);
        ctx.stroke();
        
        // Etiquetas
        const val = (i / 10) * maxVal;
        ctx.fillText(val.toFixed(1), margin - 10, height - margin + (i / 10) * plotHeight + 5);
        ctx.fillText(val.toFixed(1), margin - 10 + (i / 10) * plotWidth, height - margin + 15);
    }
    
    // Dibujar líneas de las ecuaciones (proyección 2D)
    if (currentMatrizA) {
        const A = currentMatrizA;
        
        for (let eqIdx = 0; eqIdx < Math.min(3, A.length); eqIdx++) {
            const fila = A[eqIdx];
            const colorData = coloresEcuaciones[eqIdx];
            
            ctx.strokeStyle = rgbFromHex(colorData.color);
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            
            for (let x = 0; x <= maxVal; x += maxVal / 50) {
                // a*x1 + b*x2 = c (aproximado)
                let y = 0;
                if (fila[1] !== 0) {
                    y = (10 - fila[0] * x) / fila[1];
                }
                
                const screenX = margin + (x / maxVal) * plotWidth;
                const screenY = height - margin - (y / maxVal) * plotHeight;
                
                if (y >= 0 && y <= maxVal) {
                    if (x === 0) {
                        ctx.moveTo(screenX, screenY);
                    } else {
                        ctx.lineTo(screenX, screenY);
                    }
                }
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }
    
    // Dibujar punto de solución
    if (currentSolucion) {
        const x = currentSolucion[0];
        const y = currentSolucion[1];
        
        const screenX = margin + (x / maxVal) * plotWidth;
        const screenY = height - margin - (y / maxVal) * plotHeight;
        
        // Punto
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Halo
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 12, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    
    // Leyenda
    generarLeyenda2D();
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
    
    // Punto de solución
    html += `
        <div class="legend-item">
            <div class="legend-color" style="background-color: #27ae60;"></div>
            <div class="legend-label">Solución</div>
        </div>
    `;
    
    container.innerHTML = html;
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
                <div class="legend-label">${color.nombre} (3D)</div>
            </div>
        `;
    }
    
    html += `
        <div class="legend-item">
            <div class="legend-color" style="background-color: #27ae60;"></div>
            <div class="legend-label">Punto solución</div>
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

// Función para actualizar datos y mostrar visualización
function actualizarVisualizacion(matrizA, solucion) {
    if (matrizA) {
        currentMatrizA = matrizA;
    }
    if (solucion && solucion.length > 0) {
        currentSolucion = solucion;
    }
    
    generarLeyenda3D();
    
    // Si la modal está abierta, re-dibujar
    const modal = document.getElementById("viz-modal");
    if (modal && modal.style.display !== "none") {
        setTimeout(() => {
            if (renderer3D) {
                renderer3D.dispose();
                renderer3D = null;
            }
            inicializar3D();
            dibujarGrafico2D();
        }, 100);
    }
}
