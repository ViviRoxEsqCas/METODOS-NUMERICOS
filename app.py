from flask import Flask, render_template, request, jsonify
import numpy as np

app = Flask(__name__)

# =========================
# CONSTRUCCIÓN AUTOMÁTICA DEL SISTEMA
# =========================

def construir_sistema(paciente_data, escenario="ideal"):

    edad = float(paciente_data.get("edad", 50))
    peso = float(paciente_data.get("peso", 70))
    severidad = float(paciente_data.get("severidad", 5))
    tolerancia = float(paciente_data.get("tolerancia", 5))
    actividad = float(paciente_data.get("actividad", 5))

    edad_f = edad / 50
    peso_f = peso / 70
    sev = severidad / 10
    tol = tolerancia / 10
    act = actividad / 10

    A = np.array([
        [10 + 2*edad_f, 1 + 0.3*sev, 0.5, 0.3, 0.2],
        [0.5, 11 + 2*sev, 1, 0.5, 0.3],
        [0.3, 0.5, 10 + 2*(1-tol), 0.8, 0.4],
        [0.2, 0.3, 0.5, 9 + act, 0.8],
        [0.1, 0.2, 0.3, 0.5, 8 + tol]
    ], dtype=float)

    b = np.array([
        8 + 2*sev + 0.5*edad_f,
        9 + 2.5*sev,
        7 + 2*tol + 0.8*peso_f,
        6 + 1.5*act + tol,
        7.5 + 1.5*sev + 0.5*tol
    ], dtype=float)
    
    return A, b

def aplicar_escenario(A_base, escenario):
    A = A_base.copy()

    n = len(A)

    if escenario == "ideal":
        # FUERTEMENTE diagonal dominante
        for i in range(n):
            A[i][i] = sum(abs(A[i])) + 10

    elif escenario == "estres":
        # Quitar dominancia + ruido
        for i in range(n):
            A[i][i] *= 0.6

        ruido = np.random.normal(0, 0.3, A.shape)
        A += ruido

    elif escenario == "mal_condicionado":
        # Filas casi dependientes → determinante ≈ 0
        A[1] = A[0] * 0.9999
        A[2] = A[0] * 1.0001

        # Reducir diagonales para empeorar condición
        for i in range(n):
            A[i][i] *= 0.3

    return A

# =========================
# MÉTODOS NUMÉRICOS
# =========================

def jacobi(A, b, tol, max_iter):
    try:
        n = len(b)
        x = np.zeros(n)
        D = np.diag(A)
        
        if np.any(np.abs(D) < 1e-10):
            return [0.0]*n, 0, False
            
        R = A - np.diagflat(D)

        for k in range(max_iter):
            x_new = (b - np.dot(R, x)) / D
            
            if not np.all(np.isfinite(x_new)):
                return x.tolist(), k, False
            
            x_new = np.clip(x_new, -1e8, 1e8)

            if np.linalg.norm(x_new - x, np.inf) < tol:
                return x_new.tolist(), k+1, True

            x = x_new

        return x.tolist(), max_iter, False
    except Exception as e:
        print(f"Error en Jacobi: {e}")
        return [0.0]*len(b), 0, False


def gauss_seidel(A, b, tol, max_iter):
    try:
        n = len(b)
        x = np.zeros(n)

        for k in range(max_iter):
            x_old = x.copy()

            for i in range(n):
                if abs(A[i][i]) < 1e-10:
                    return [0.0]*n, k, False
                    
                s1 = sum(A[i][j] * x[j] for j in range(i))
                s2 = sum(A[i][j] * x_old[j] for j in range(i+1, n))
                x[i] = (b[i] - s1 - s2) / A[i][i]
            
            if not np.all(np.isfinite(x)):
                return x_old.tolist(), k, False
                
            x = np.clip(x, -1e8, 1e8)

            if np.linalg.norm(x - x_old, np.inf) < tol:
                return x.tolist(), k+1, True

        return x.tolist(), max_iter, False
    except Exception as e:
        print(f"Error en Gauss-Seidel: {e}")
        return [0.0]*len(b), 0, False


def sor(A, b, tol, max_iter, w):
    try:
        n = len(b)
        x = np.zeros(n)
        w = max(0.1, min(w, 1.9))

        for k in range(max_iter):
            x_old = x.copy()

            for i in range(n):
                if abs(A[i][i]) < 1e-10:
                    return [0.0]*n, k, False
                    
                s1 = sum(A[i][j] * x[j] for j in range(i))
                s2 = sum(A[i][j] * x_old[j] for j in range(i+1, n))
                x[i] = (1 - w) * x_old[i] + (w * (b[i] - s1 - s2) / A[i][i])
            
            if not np.all(np.isfinite(x)):
                return x_old.tolist(), k, False
                
            x = np.clip(x, -1e8, 1e8)

            if np.linalg.norm(x - x_old, np.inf) < tol:
                return x.tolist(), k+1, True

        return x.tolist(), max_iter, False
    except Exception as e:
        print(f"Error en SOR: {e}")
        return [0.0]*len(b), 0, False


def gradiente_conjugado(A, b, tol, max_iter):
    try:
        x = np.zeros_like(b)
        r = b - A @ x
        p = r.copy()
        rs_old = np.dot(r, r)

        for i in range(max_iter):
            Ap = A @ p
            denom = np.dot(p, Ap)

            if abs(denom) < 1e-14:
                return x.tolist(), i, False

            alpha = rs_old / denom
            x = x + alpha * p
            r = r - alpha * Ap

            if not np.all(np.isfinite(x)):
                return np.clip(x, -1e8, 1e8).tolist(), i, False
            
            x = np.clip(x, -1e8, 1e8)

            rs_new = np.dot(r, r)

            if np.sqrt(rs_new) < tol:
                return x.tolist(), i+1, True

            if rs_old == 0:
                return x.tolist(), i, False
                
            p = r + (rs_new / rs_old) * p
            rs_old = rs_new

        return x.tolist(), max_iter, False
    except Exception as e:
        print(f"Error en Gradiente Conjugado: {e}")
        return [0.0]*len(b), 0, False


def gradiente_conjugado_precond(A, b, tol, max_iter):
    """
    Gradiente Conjugado Precondicionado con precondicionador Jacobi.
    """
    n = len(b)
    x = np.zeros(n)
    r = b - A @ x
    
    # Precondicionador Jacobi: M = diag(A)
    M = np.diag(np.diag(A))
    try:
        M_inv = np.linalg.inv(M)
    except:
        return x.tolist(), 0, False
    
    y = M_inv @ r
    p = y.copy()
    ry_old = np.dot(r, y)

    for i in range(max_iter):
        Ap = A @ p
        denom = np.dot(p, Ap)

        if abs(denom) < 1e-14:
            return x.tolist(), i, False

        alpha = ry_old / denom
        x = x + alpha * p
        r = r - alpha * Ap

        y = M_inv @ r
        ry_new = np.dot(r, y)

        if np.sqrt(ry_new) < tol:
            return x.tolist(), i+1, True

        beta = ry_new / ry_old
        p = y + beta * p
        ry_old = ry_new

    return x.tolist(), max_iter, False


def lu(A, b):
    try:
        x = np.linalg.solve(A, b)
        return x.tolist(), 1, True
    except:
        return [0.0]*len(b), 1, False

# =========================
# VALIDACIONES
# =========================

def es_diagonal_dominante(A):
    for i in range(len(A)):
        if abs(A[i][i]) < sum(abs(A[i][j]) for j in range(len(A)) if j != i):
            return False
    return True

def es_simetrica(A):
    return np.allclose(A, A.T)

def condicion_matriz(A):
    try:
        return np.linalg.cond(A)
    except:
        return None

# =========================
# CLASIFICACIÓN DEL ESCENARIO
# =========================

def clasificar_sistema(A):
    cond = condicion_matriz(A)

    if cond is None:
        return "indeterminado", cond

    if cond < 10:
        return "ideal", cond
    elif cond < 1000:
        return "estres", cond
    else:
        return "mal_condicionado", cond

def obtener_recomendacion(clasificacion, condicion):
    """
    Proporciona recomendaciones según el estado del sistema.
    """
    if clasificacion == "ideal":
        return {
            "estado": "✓ SISTEMA ÓPTIMO",
            "color": "success",
            "mensaje": "El sistema está bien condicionado. La solución es estable y confiable.",
            "accion": "Puede aplicarse el tratamiento con confianza."
        }
    elif clasificacion == "estres":
        return {
            "estado": "⚠ SISTEMA BAJO ESTRÉS",
            "color": "warning",
            "mensaje": f"El sistema presenta estrés numérico (número de condición: {condicion:.2f}). Pequeños cambios en parámetros pueden afectar significativamente la solución.",
            "accion": "Se recomienda monitoreo frecuente y posibles ajustes dinámicos del tratamiento."
        }
    elif clasificacion == "mal_condicionado":
        return {
            "estado": "✗ SISTEMA MAL CONDICIONADO",
            "color": "danger",
            "mensaje": f"El sistema está mal condicionado (número de condición: {condicion:.2f}). La solución es muy sensible a variaciones en parámetros.",
            "accion": "Se requiere validación adicional y monitoreo intensivo. Considere revisar los parámetros del paciente."
        }
    else:
        return {
            "estado": "? INDETERMINADO",
            "color": "secondary",
            "mensaje": "No se pudo determinar el estado del sistema.",
            "accion": "Revise los datos del paciente."
        }

# =========================
# RUTAS
# =========================

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/resolver", methods=["POST"])
def resolver():
    try:
        data = request.json
        escenario = data.get("escenario", "ideal")

        tol = 1e-6
        max_iter = 100
        w = 1.5

        A, b = construir_sistema(data, escenario)
        A = aplicar_escenario(A, escenario)
        
        # Validar matriz
        if not np.all(np.isfinite(A)) or not np.all(np.isfinite(b)):
            return jsonify({"error": "Matriz o vector contienen valores invalidos"}), 400
        
        # Limitar valores extremos en la matriz
        A = np.clip(A, -1e6, 1e6)
        b = np.clip(b, -1e6, 1e6)
        
        cond = condicion_matriz(A)

        if cond is None or not np.isfinite(cond):
            cond = 1e12  # forzar mal condicionado

        clasificacion, _ = clasificar_sistema(A)
                
        if clasificacion == "mal_condicionado" and cond and cond > 1e6:
            try:
                solucion = np.linalg.lstsq(A, b, rcond=None)[0]
                res_lu = (solucion.tolist(), 1, True)
            except:
                res_lu = ([0.0]*len(b), 1, False)
        else:
            try:
                res_lu = lu(A, b)
            except:
                solucion = np.linalg.lstsq(A, b, rcond=None)[0]
                res_lu = (solucion.tolist(), 1, True)
        
        if not np.all(np.isfinite(res_lu[0])):
            res_lu = ([0.0]*len(b), 1, False)
        else:
            res_lu = (list(np.clip(res_lu[0], -1e8, 1e8)), res_lu[1], res_lu[2])

        res_j = jacobi(A, b, tol, max_iter)
        res_gs = gauss_seidel(A, b, tol, max_iter)
        res_sor = sor(A, b, tol, max_iter, w)
        res_gc = gradiente_conjugado(A, b, tol, max_iter)
        res_gcp = gradiente_conjugado_precond(A, b, tol, max_iter)

        recomendacion = obtener_recomendacion(clasificacion, cond)
        A = np.nan_to_num(A, nan=0.0, posinf=1e6, neginf=-1e6)
        b = np.nan_to_num(b, nan=0.0, posinf=1e6, neginf=-1e6)
        # Generar y devolver respuesta
        return jsonify({
            "paciente": data,
            "matriz_A": A.tolist(),
            "vector_b": b.tolist(),
            "analisis": {
                "escenario": escenario,
                "condicion": float(cond) if cond else None,
                "clasificacion": clasificacion,
                "diagonal_dominante": es_diagonal_dominante(A),
                "simetrica": es_simetrica(A),
                "recomendacion": recomendacion
            },
            "solucion": {
                "valores": res_lu[0],
                "metodo": "Factorización LU",
                "unidades": ["mg/día"]*5
            },
            "metodos": {
                "jacobi": res_j,
                "gauss_seidel": res_gs,
                "sor": res_sor,
                "gradiente_conjugado": res_gc,
                "gradiente_conjugado_precond": res_gcp,
                "lu": res_lu
            }
        })

    except Exception as e:
        print("ERROR EN /resolver:", str(e))
        return jsonify({"error": str(e)}), 500

# =========================

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)