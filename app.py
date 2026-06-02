import os
import math
from flask import Flask, render_template, request, jsonify
import numpy as np

app = Flask(__name__)

# ==============================================================================
# 1. OPERACIONES MATRICIALES PURAS (EXIGENCIA DE RIGOR MATEMÁTICO)
# ==============================================================================

def mat_vec_mul(A, x):
    """Multiplicación pura de Matriz (n x n) por Vector (n)"""
    n = len(A)
    res = [0.0] * n
    for i in range(n):
        res[i] = sum(A[i][j] * x[j] for j in range(n))
    return res

def dot_product(v1, v2):
    """Producto escalar puro entre dos vectores"""
    return sum(v1[i] * v2[i] for i in range(len(v1)))

def norm_inf_diff(v1, v2):
    """Norma infinito de la diferencia (para criterios de parada iterativos)"""
    return max(abs(v1[i] - v2[i]) for i in range(len(v1)))

def es_simetrica_pura(A, tol=1e-7):
    """Verifica la simetría analítica requerida para el Gradiente Conjugado"""
    n = len(A)
    for i in range(n):
        for j in range(i + 1, n):
            if abs(A[i][j] - A[j][i]) > tol:
                return False
    return True

# ==============================================================================
# 2. MODELADO CLÍNICO DE VARIABLES Y ESCENARIOS (5x5)
# ==============================================================================

def construir_sistema_medico(paciente_data, escenario="ideal"):
    """
    Construye de forma determinista la matriz A y el vector b de un sistema 5x5.
    Garantiza una estructura original Simétrica y Definida Positiva (SPD)
    para que los métodos avanzados (GCP) converjan matemáticamente.
    """
    edad = float(paciente_data.get("edad", 50)) / 50.0
    peso = float(paciente_data.get("peso", 70)) / 70.0
    severidad = float(paciente_data.get("severidad", 5)) / 10.0
    actividad = float(paciente_data.get("actividad", 5)) / 10.0

    # Base Matricial 5x5 SPD (Interacciones farmacológicas cruzadas equilibradas)
    A = [
        [32.0 + 4.0*edad,  1.5,              0.8,              0.5,              0.2],
        [1.5,              28.0 + 3.0*peso,  2.0,              0.6,              0.3],
        [0.8,              2.0,              25.0 + 5.0*actividad, 1.0,          0.4],
        [0.5,              0.6,              1.0,              22.0 + 2.0*severidad, 0.7],
        [0.2,              0.3,              0.4,              0.7,              18.0]
    ]

    # Vector de demandas biológicas b (mg/día)
    b = [
        250.0 + 30.0 * severidad,
        180.0 + 20.0 * peso,
        150.0 + 40.0 * actividad,
        100.0 + 50.0 * severidad,
        60.0  + 10.0 * edad
    ]

    n = len(A)
    
    # MODIFICACIONES GEOMÉTRICAS DE ACUERDO AL ESCENARIO
    if escenario == "estres":
        for i in range(n):
            b[i] *= 2.8  
            for j in range(n):
                if i != j:
                    A[i][j] *= 3.8  
                else:
                    A[i][i] *= 0.75 

    elif escenario == "mal_condicionado":
        alpha = 0.9996
        for j in range(n):
            A[1][j] = A[0][j] * alpha
        A[1][1] += 0.0008
        b[1] = b[0] * alpha

    return A, b

# ==============================================================================
# 3. MÉTODOS NUMÉRICOS PUROS CON CAPTURA DE HISTORIAL COMPLETO
# ==============================================================================

def factorizacion_lu_con_detalle(A, b):
    """
    Factorización LU con Pivoteo Parcial (PA = LU) que genera el desglose
    paso a paso de las sustituciones para el informe biológico.
    """
    try:
        n = len(A)
        A_piv = [fila[:] for fila in A]
        b_piv = list(b)
        
        L = [[0.0] * n for _ in range(n)]
        U = [[0.0] * n for _ in range(n)]
        P = list(range(n))  # Vector de permutación
        
        # 1. DESCOMPOSICIÓN PA = LU
        for i in range(n):
            max_row = i
            max_val = abs(A_piv[i][i])
            for r in range(i + 1, n):
                if abs(A_piv[r][i]) > max_val:
                    max_val = abs(A_piv[r][i])
                    max_row = r
            
            if max_row != i:
                A_piv[i], A_piv[max_row] = A_piv[max_row], A_piv[i]
                b_piv[i], b_piv[max_row] = b_piv[max_row], b_piv[i]
                P[i], P[max_row] = P[max_row], P[i]
            
            if abs(A_piv[i][i]) < 1e-14:
                return [0.0]*n, False, L, U, [0.0]*n, [], []
                
            L[i][i] = 1.0
            for k in range(i, n):
                s = sum(L[i][j] * U[j][k] for j in range(i))
                U[i][k] = A_piv[i][k] - s
            for k in range(i + 1, n):
                s = sum(L[k][j] * U[j][i] for j in range(i))
                L[k][i] = (A_piv[k][i] - s) / U[i][i]
        
        # 2. SUSTITUCIÓN PROGRESIVA (Ly = Pb)
        y = [0.0] * n
        pasos_y = []
        for i in range(n):
            s = sum(L[i][j] * y[j] for j in range(i))
            y[i] = b_piv[i] - s
            
            # Construir la cadena del paso matemático
            terminos_resta = "".join([f" - ({L[i][j]:.2f} · {y[j]:.2f})" for j in range(i)])
            pasos_y.append(f"y_{i+1} = {b_piv[i]:.2f}{terminos_resta} = <b>{y[i]:.4f}</b>")
            
        # 3. SUSTITUCIÓN REGRESIVA (Ux = y)
        x = [0.0] * n
        pasos_x = []
        # Nombres biológicos de las variables solicitadas en el PDF
        nombres = ["x₁ (Proteínas)", "x₂ (Lípidos)", "x₃ (Carbohidratos)", "x₄ (Intensidad T.D.)", "x₅ (Ajuste Adap.)"]
        
        for i in range(n - 1, -1, -1):
            s = sum(U[i][j] * x[j] for j in range(i + 1, n))
            x[i] = (y[i] - s) / U[i][i]
            
            terminos_resta = "".join([f" - ({U[i][j]:.2f} · {x[j]:.2f})" for j in range(i + 1, n)])
            pasos_x.insert(0, f"{nombres[i]}: ({y[i]:.2f}{terminos_resta}) / {U[i][i]:.2f} = <b style='color:#2b6cb0;'>{x[i]:.4f} mg/día</b>")
            
        # Retornar el orden de filas final en formato de texto para el reporte
        orden_filas = [f"Fila {p+1}" for p in P]
        
        return x, True, L, U, y, pasos_y, pasos_x, orden_filas
    except Exception as e:
        print(f"Error en LU: {e}")
        return [0.0]*5, False, [[0.0]*5], [[0.0]*5], [0.0]*5, [], [], []

def jacobi_con_historial(A, b, tol, max_iter):
    n = len(b)
    x = [0.0] * n
    historial = []
    
    for k in range(max_iter):
        x_new = [0.0] * n
        for i in range(n):
            if abs(A[i][i]) < 1e-12:
                return x, k, False, historial
            s = sum(A[i][j] * x[j] for j in range(n) if j != i)
            x_new[i] = (b[i] - s) / A[i][i]
        
        err = norm_inf_diff(x_new, x)
        historial.append({"k": k + 1, "x": list(x_new), "error": err})
        
        if err < tol:
            return x_new, k + 1, True, historial
        x = x_new
        if err > 1e10:
            break
            
    return x, max_iter, False, historial


def gauss_seidel_con_historial(A, b, tol, max_iter):
    n = len(b)
    x = [0.0] * n
    historial = []
    
    for k in range(max_iter):
        x_old = list(x)
        for i in range(n):
            if abs(A[i][i]) < 1e-12:
                return x, k, False, historial
            s1 = sum(A[i][j] * x[j] for j in range(i))
            s2 = sum(A[i][j] * x_old[j] for j in range(i + 1, n))
            x[i] = (b[i] - s1 - s2) / A[i][i]
            
        err = norm_inf_diff(x, x_old)
        historial.append({"k": k + 1, "x": list(x), "error": err})
        
        if err < tol:
            return x, k + 1, True, historial
        if err > 1e10:
            break
            
    return x, max_iter, False, historial


def sor_con_historial(A, b, tol, max_iter, w):
    n = len(b)
    x = [0.0] * n
    historial = []
    
    for k in range(max_iter):
        x_old = list(x)
        for i in range(n):
            if abs(A[i][i]) < 1e-12:
                return x, k, False, historial
            s1 = sum(A[i][j] * x[j] for j in range(i))
            s2 = sum(A[i][j] * x_old[j] for j in range(i + 1, n))
            x_gs = (b[i] - s1 - s2) / A[i][i]
            x[i] = (1.0 - w) * x_old[i] + w * x_gs
            
        err = norm_inf_diff(x, x_old)
        historial.append({"k": k + 1, "x": list(x), "error": err})
        
        if err < tol:
            return x, k + 1, True, historial
        if err > 1e10:
            break
            
    return x, max_iter, False, historial


def gradiente_conjugado_precond_con_historial(A, b, tol, max_iter):
    n = len(b)
    x = [0.0] * n
    historial = []
    
    Ax = mat_vec_mul(A, x)
    r = [b[i] - Ax[i] for i in range(n)]
    
    M_inv = []
    for i in range(n):
        if abs(A[i][i]) < 1e-12:
            return x, 0, False, historial
        M_inv.append(1.0 / A[i][i])
        
    y_vec = [M_inv[i] * r[i] for i in range(n)]
    p = list(y_vec)
    ry_old = dot_product(r, y_vec)

    for k in range(max_iter):
        Ap = mat_vec_mul(A, p)
        denom = dot_product(p, Ap)

        if abs(denom) < 1e-14:
            return x, k, False, historial

        alpha = ry_old / denom
        x = [x[i] + alpha * p[i] for i in range(n)]
        r = [r[i] - alpha * Ap[i] for i in range(n)]

        err = math.sqrt(dot_product(r, r))
        historial.append({"k": k + 1, "x": list(x), "error": err})

        if err < tol:
            return x, k + 1, True, historial

        y_vec = [M_inv[i] * r[i] for i in range(n)]
        ry_new = dot_product(r, y_vec)

        beta = ry_new / ry_old
        p = [y_vec[i] + beta * p[i] for i in range(n)]
        ry_old = ry_new
        
        if err > 1e10:
            break

    return x, max_iter, False, historial

# ==============================================================================
# 4. EXTRACCIÓN REDUCIDA PARA INNOVACIÓN GEOMÉTRICA (3x3)
# ==============================================================================

def generar_datos_planos_3d(A, b):
    A_33 = [fila[:3] for fila in A[:3]]
    b_33 = b[:3]
    return {"matrix_33": A_33, "vector_33": b_33}

# ==============================================================================
# 5. RUTAS CONTROLADORAS (API FLASK)
# ==============================================================================

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/resolver", methods=["POST"])
def resolver():
    try:
        data = request.json
        escenario = data.get("escenario", "ideal")

        tol = 1e-6
        max_iter = 250
        w = 1.3  

        # Construcción real del sistema determinista de acuerdo al escenario clínico
        A, b = construir_sistema_medico(data, escenario)
        
        condicion = float(np.linalg.cond(A))
        simetrica = es_simetrica_pura(A)

        if condicion < 35:
            clasif = "ideal"
            msg = "Sistema Estable (Óptimo): Baja sensibilidad clínica."
        elif condicion < 1000:
            clasif = "estres"
            msg = "Sistema bajo Estrés Crítico: Monitorear oscilaciones dinámicas."
        else:
            clasif = "mal_condicionado"
            msg = "Sistema Mal Condicionado: Peligro de divergencia por colinealidad."

        # ==============================================================================
        # EJECUCIÓN DE LOS ALGORITMOS NUMÉRICOS (ACTUALIZADO A 8 VARIABLES)
        # ==============================================================================
        # Aquí expandimos el desempaque para recibir los pasos de texto y la permutación
        sol_lu, ok_lu, mat_L, mat_U, vec_y, pasos_y, pasos_x, orden_filas = factorizacion_lu_con_detalle(A, b)
        
        # Los métodos iterativos se quedan exactamente igual
        sol_j, iter_j, ok_j, hist_j = jacobi_con_historial(A, b, tol, max_iter)
        sol_gs, iter_gs, ok_gs, hist_gs = gauss_seidel_con_historial(A, b, tol, max_iter)
        sol_sor, iter_sor, ok_sor, hist_sor = sor_con_historial(A, b, tol, max_iter, w)
        sol_gcp, iter_gcp, ok_gcp, hist_gcp = gradiente_conjugado_precond_con_historial(A, b, tol, max_iter)

        datos_geometria_3d = generar_datos_planos_3d(A, b)

        # ==============================================================================
        # CONSTRUCCIÓN DE LA RESPUESTA JSON
        # ==============================================================================
        return jsonify({
            "analisis": {
                "escenario": escenario,
                "numero_condicion": condicion,
                "clasificacion": clasif,
                "es_simetrica": simetrica,
                "mensaje_clinico": msg
            },
            "sistema_original": {
                "matriz_a": A,
                "vector_b": b
            },
            "solucion_principal": {
                "valores": sol_lu if ok_lu else [0.0]*5,
                "metodo_base": "Factorización LU"
            },
            "cuadro_comparativo": {
                "jacobi": {"iteraciones": iter_j, "convergencia": "S" if ok_j else "N"},
                "gauss_seidel": {"iteraciones": iter_gs, "convergencia": "S" if ok_gs else "N"},
                "sor": {"iteraciones": iter_sor, "convergencia": "S" if ok_sor else "N"},
                "gradiente_conjugado_precond": {"iteraciones": iter_gcp, "convergencia": "S" if ok_gcp else "N"},
                "lu": {"iteraciones": 1, "convergencia": "S" if ok_lu else "N"}
            },
            "historial_pasos": {
                "jacobi": hist_j,
                "gauss_seidel": hist_gs,
                "sor": hist_sor,
                "gradiente_conjugado_precond": hist_gcp
            },
            "detalle_lu": {
                "matriz_l": mat_L,
                "matriz_u": mat_U,
                "vector_y": vec_y,
                "pasos_forward": pasos_y,     # <-- Enviado al JS para la sustitución hacia adelante
                "pasos_backward": pasos_x,    # <-- Enviado al JS para la sustitución hacia atrás
                "permutacion": orden_filas    # <-- Enviado al JS para ver el pivoteo de filas
            },
            "visualizacion_planos_3d": datos_geometria_3d
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)