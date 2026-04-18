# HabiPay — Reto técnico HabiCapital 2026-Q2

**Juan Manuel**

---

## Qué construí y por qué

Construí HabiPay: una plataforma de transferencias peer-to-peer que resuelve un problema muy común de las personas — mover plata entre personas con contexto real, no solo líneas sueltas en un extracto.

El sistema tiene un núcleo financiero sólido (cuentas, saldo, transferencias atómicas, historial) y encima de eso construí tres features que me parecieron los más valiosos para los escenarios del enunciado:

- **Gastos grupales con splits automáticos** — el caso de la cena del cumpleaños, el arriendo entre roommates. Creás un grupo, registrás el gasto, el sistema calcula quién le debe a quién y permite saldar con un toque.
- **Pagos recurrentes programados** — los hermanos que cada mes le mandan plata a la mamá. Configurás una transferencia con frecuencia semanal o mensual y el sistema la ejecuta sola. Incluye un botón de "simulate tick" para demo.
- **Links de cobro compartibles** — la profesora que cobra clases, el freelancer que factura trabajos pequeños. Generás un link con monto y descripción, lo compartís por donde quieras, y quien lo recibe paga con un clic sin necesidad de buscarte como usuario.

Las tres features tienen en común que atacan el dolor real del enunciado: los bancos mueven plata pero no entienden contexto. Estas features agregan contexto — a cada movimiento le da un nombre, una razón, una estructura.

---

## Stack y por qué lo elegí

**Backend:** Python 3.11 + FastAPI + PostgreSQL + SQLAlchemy async + Alembic

Elegí este stack porque se alinea directamente con el stack de producción (Python + FastAPI + PostgreSQL). Tenía algo de experiencia previa con FastAPI, lo cual me permitió moverme rápido en la estructura base y dedicar más tiempo a los problemas reales — integridad financiera, diseño de features, conexión front-back.

SQLAlchemy async con asyncpg porque las operaciones de transferencia requieren transacciones atómicas reales y `SELECT FOR UPDATE`, que no se pueden hacer de forma confiable con un ORM síncrono sobre un servidor async.

**Frontend:** React + TypeScript generado con Lovable, adaptado manualmente

Usé Lovable para inicializar el proyecto con la estructura de pantallas y componentes. Después conecté cada servicio del front a la API real reemplazando el localStorage por llamadas HTTP. La arquitectura de service layer (services/transactions.ts, services/groups.ts, etc.) fue una decisión deliberada desde el prompt inicial — así el swap de mock a API real fue casi mecánico.

**Base de datos local:** PostgreSQL + pgAdmin4

---

## Decisiones técnicas clave

**1. transfer_service.execute_transfer() centralizado**

Toda transferencia de dinero en el sistema — manual, liquidación de grupo, pago recurrente automático, pago por link — pasa por la misma función. No hay lógica de transferencia duplicada en ningún router. Esto garantiza que si hay un bug de integridad, está en un solo lugar, y que cualquier fix aplica a todos los flujos.

**2. SELECT FOR UPDATE en todas las transferencias**

Antes de debitar o acreditar cualquier cuenta, el sistema hace `SELECT FOR UPDATE` en ambas filas de usuarios dentro de una transacción de base de datos. Esto previene race conditions en transferencias concurrentes — si dos transferencias intentan usar el mismo saldo simultáneamente, una espera a que la otra termine. Sin esto, dos solicitudes simultáneas podrían leer el mismo saldo, ambas pasar la validación, y ambas debitar — perdiendo plata.

**3. Decimal, nunca float**

Todos los montos en el sistema usan `Numeric(18,2)` en PostgreSQL y `Decimal` en Python. Los floats tienen errores de precisión de punto flotante — `0.1 + 0.2 = 0.30000000000000004` en Python. En un sistema financiero eso no es aceptable. El costo es un poco más de verbosidad en el código; el beneficio es que los montos son exactos.

**4. Historial con perspectiva del usuario**

El backend mapea cada transacción desde la perspectiva de quien hace el request: si sos el sender es `"sent"`, si sos el receiver es `"received"`, si es un top-up es `"topup"`. Esto simplifica enormemente el frontend — solo renderiza lo que recibe, sin lógica de perspectiva en el cliente.

**5. Service layer en el frontend**

Cada operación del front está aislada en un archivo de servicio (`services/transactions.ts`, `services/groups.ts`, etc.). Los componentes no saben si los datos vienen de localStorage o de una API. Cuando conecté el back, solo modifiqué los servicios — ninguna página cambió su lógica.

---

## Qué dejé fuera y por qué

**Pasarela de pago real** — El enunciado lo dice explícitamente: no es necesario. Simulé el topup como una operación directa sobre el saldo.

**Tests automatizados** — Con 72 horas y la complejidad del sistema completo, prioricé funcionalidad y correctness manual sobre cobertura de tests. En producción esto sería inaceptable — hubiera escrito tests de integración para `transfer_service` como mínimo.

**Notificaciones** — Los pagos recurrentes y los links de cobro idealmente notificarían al usuario (push, email). No lo implementé porque requería infraestructura adicional (Celery, Redis, o un servicio de email) que habría consumido tiempo sin agregar valor al demo.

**Autenticación OAuth / social login** — Implementé JWT básico con email/password. OAuth habría sido más production-ready pero el tiempo no lo justificaba.

**Mobile (React Native)** — Solo web. El diseño es mobile-first pero no es una app nativa.

**Multicurrency** — Supuse una sola moneda. El modelo soportaría multicurrency agregando un campo `currency` a usuarios y transacciones, pero no era necesario para el reto.

**Rate limiting y protección contra fraude** — En producción, un endpoint de transferencia necesita rate limiting, detección de patrones anómalos, y posiblemente KYC. No lo implementé.

---

## Qué haría distinto con más tiempo

Agregaría tests de integración para `transfer_service` — específicamente tests de concurrencia que lancen múltiples transferencias simultáneas y verifiquen que el saldo nunca queda inconsistente. Es la parte más crítica del sistema y la que menos cobertura tiene.

Usaría Temporal para los pagos recurrentes en vez del endpoint `/tick` manual. El enunciado menciona Temporal explícitamente en su stack, y es exactamente el tool correcto para workflows recurrentes — maneja reintentos, idempotencia, y estado de ejecución de forma nativa. Lo que construí con `/tick` es una simulación funcional pero no production-ready.

Separaría el frontend en un proyecto Next.js propio en vez de usar Lovable. Lovable fue útil para arrancar rápido, pero el código generado tiene patrones que yo hubiera estructurado diferente — especialmente en el manejo de estado global y la gestión de errores.

Implementaría un sistema de notificaciones básico — al menos emails transaccionales para pagos recurrentes ejecutados y links de cobro pagados.

---

## Qué no sé

**Temporal** — Sé qué es y por qué encaja perfectamente con el problema de pagos recurrentes, pero nunca lo usé en producción. Entiendo el modelo de workflows y activities en teoría, pero no sé cuánto tiempo tomaría aprenderlo bien a nivel práctico.

**Terraform** — No tengo experiencia con infraestructura como código. Sé que existe, sé para qué sirve, no lo usé.

**React Native** — Desarrollé el frontend en web. No conozco bien las diferencias prácticas con React Native a nivel de componentes y navegación.

**Tests de carga** — No hice pruebas de performance. No sé cómo se comporta el `SELECT FOR UPDATE` bajo carga alta real — en teoría protege la integridad pero podría convertirse en un cuello de botella con muchas transferencias concurrentes.

**PostgreSQL en producción a escala** — Sé configurarlo localmente y entiendo los conceptos de índices y transacciones, pero no tengo experiencia con tuning de producción, replicación, o manejo de failover.

---

## Supuestos que hice

- Un peso = una unidad. No hay decimales en la moneda base del negocio para el demo (aunque el sistema soporta hasta 2 decimales).
- Todos los usuarios están en la misma moneda — no hay conversión.
- El "tick" de pagos recurrentes lo dispara manualmente quien hace el demo. En producción sería un cron job o un workflow de Temporal.
- Un link de pago puede ser pagado múltiples veces por diferentes personas (el `pay_count` incrementa). Asumí que ese es el caso de uso correcto para la profesora que cobra a múltiples estudiantes con el mismo link.
- No implementé expiración de links de pago — quedan activos hasta que el creador los cancele manualmente (si existiera esa funcionalidad).
- El split de gastos grupales es siempre equitativo entre todos los miembros. No implementé splits personalizados por porcentaje o monto.

---

## Cómo usé IA

Usé Claude (Anthropic) como herramienta principal durante todo el reto.

**En qué etapas:** Análisis inicial del enunciado, diseño de arquitectura, generación de prompts para Lovable y Replit, debugging de errores específicos, y adaptación del código generado.

**Qué le pedía:** Le pedía que me ayudara a pensar el problema antes de escribir código — qué features construir y por qué, cómo modelar los datos, qué decisiones técnicas eran críticas para la integridad financiera. También le pedía prompts muy específicos para las herramientas de generación (Lovable para el front, Replit para el back), con el nivel de detalle necesario para que el output fuera usable.

**Qué decidía yo:** Las tres features diferenciales fueron una elección mía después de analizar el enunciado. Las decisiones de integridad — `SELECT FOR UPDATE`, `Decimal` en vez de float, `transfer_service` centralizado — las propuse yo con la ayuda de Claude para validarlas. El debugging del error de timezone en los pagos recurrentes lo resolví entendiendo el problema (offset-naive vs offset-aware datetimes) y aplicando el fix con criterio propio.

**La dinámica:** No usé IA como caja negra. La usé como un colaborador técnico — le explicaba el contexto, discutía las opciones, y tomaba decisiones. Cuando Claude proponía algo que no me convencía (como usar Lovable para el core del backend), lo cuestioné y tomé una dirección diferente.

---

## Qué aprendí

**SQLAlchemy async** fue completamente nuevo para mí en la práctica. Sabía que existía pero nunca había trabajado con el patrón async/await en un ORM — especialmente el manejo de sesiones, el `SELECT FOR UPDATE`, y el ciclo de vida de las transacciones. La diferencia entre una sesión síncrona y una async en SQLAlchemy es más sutil de lo que parece.

**El problema de offset-naive vs offset-aware datetimes en Python** — lo había visto mencionado antes pero nunca lo había debuggeado en producción. Entender que PostgreSQL `TIMESTAMP WITHOUT TIME ZONE` no acepta datetimes con tzinfo, y que el fix es normalizar a UTC naive antes de persistir, fue un aprendizaje concreto y aplicable.

**Diseñar para integridad financiera desde el modelo** — antes de este reto, hubiera pensado en "no perder plata" como una validación de negocio. Ahora entiendo que es una propiedad que debe estar garantizada a nivel de base de datos con locks y transacciones atómicas, no solo con checks en el código de aplicación.

**Lo difícil no es el código, es el análisis** — lo que más tiempo me tomó fue leer el enunciado con atención, entender los pain points reales que describe, y decidir qué construir. Una vez que eso estaba claro, el código fue relativamente directo.

---

## Cómo correr el proyecto

### Backend

```bash
cd api/artifacts/api-server/
pip install -r requirements.txt
# Configurar .env con DATABASE_URL y SECRET_KEY
python3 -m venv venv
venv\Scripts\activate
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

Variables de entorno necesarias:
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost/habipay
SECRET_KEY=tu-secret-key
ALGORITHM=HS256
```

La documentación interactiva de la API está disponible en `/docs` una vez que el servidor esté corriendo.

### Frontend

```bash
cd web
npm install
npm run dev -- --port 5173
```

Configurar la URL base de la API en `src/services/api.ts`.

---

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /auth/register | Crear usuario |
| POST | /auth/login | Login, retorna JWT |
| GET | /me | Perfil y saldo |
| POST | /accounts/topup | Cargar saldo |
| POST | /transfers | Transferencia atómica |
| GET | /transfers/history | Historial con contexto |
| GET | /transfers/tags | Tags únicos del usuario |
| POST | /groups | Crear grupo |
| POST | /groups/{id}/expenses | Agregar gasto dividido |
| GET | /groups/{id}/balances | Balances netos del grupo |
| POST | /groups/{id}/settle | Saldar deuda |
| POST | /recurring | Crear pago recurrente |
| POST | /recurring/tick | Ejecutar pagos vencidos |
| POST | /payment-links | Crear link de cobro |
| GET | /payment-links/{token} | Ver link (público) |
| POST | /payment-links/{token}/pay | Pagar link |