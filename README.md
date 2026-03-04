# patrones-arquitectonicos-y-de-diseno

Aplicación cliente-servidor con **Spring Boot + HTML/CSS/JS (Fetch API)** que implementa los siguientes patrones de diseño y arquitectura:

| Patrón | Rol en el sistema |
|---|---|
| **Cliente–Servidor** | Frontend estático separado del backend Spring Boot |
| **DTO** | `AnimalDTO` transporta datos entre cliente y servidor sin lógica |
| **Factory Method** | `AnimalFactoryImpl` crea la subclase concreta de `Animal` según el tipo |
| **Bridge** | `Animal` y `Habitat` son jerarquías independientes unidas por composición |
| **Chain of Responsibility** | 5 validadores encadenados procesan el DTO antes de registrar |

---

## Arquitectura

```
Frontend (HTML + JS)
  └─ POST /api/animales (AnimalDTO en JSON)
       └─ AnimalController
            └─ AnimalService
                 ├─ Chain: ValidarNombre → ValidarEdad → ValidarTipo → ValidarHabitat → ValidarCompatibilidad
                 ├─ Factory: AnimalFactoryImpl → Leon | Elefante | Mono | Tiburon | Aguila | Cocodrilo
                 ├─ Bridge: Animal ──▶ Habitat (Sabana | Selva | Acuario | Rio | Desierto | Montana)
                 └─ Repositorio en memoria (List<Animal>)
```

---

## Requisitos

- Java 17+
- Maven 3.9+

---

## Ejecutar

**Backend:**
```bash
mvn spring-boot:run
```
Servidor disponible en `http://localhost:8080`

**Frontend:**
Abre `frontend/index.html` directamente en el navegador (o con Live Server en VS Code).

---

## Patrones explicados

### DTO — Data Transfer Object

`AnimalDTO` es un objeto plano sin lógica que viaja en el cuerpo del `POST`. Desacopla la representación de red del modelo de dominio.

```json
{
  "tipo": "LEON",
  "nombre": "Simba",
  "edad": 5,
  "habitat": "SABANA"
}
```

### Factory Method

`AnimalFactory` define el contrato. `AnimalFactoryImpl` decide qué subclase concreta instanciar sin que el `Service` lo sepa.

```
AnimalFactory (abstract)
  └── AnimalFactoryImpl
        ├── crearAnimal("LEON")      → new Leon(...)
        ├── crearAnimal("TIBURON")   → new Tiburon(...)
        └── crearAnimal("COCODRILO") → new Cocodrilo(...)
```

### Bridge

Separa la jerarquía de animales de la jerarquía de hábitats. Sin Bridge harían falta clases como `LeonSabana`, `TiburonRio`, etc. Con Bridge cualquier combinación válida se arma en tiempo de ejecución.

```
Animal (abstract)          Habitat (interface)
  ├── Leon                   ├── Sabana
  ├── Elefante               ├── Selva
  ├── Mono                   ├── Acuario
  ├── Tiburon      ──▶       ├── Rio
  ├── Aguila                 ├── Desierto
  └── Cocodrilo              └── Montana
```

### Chain of Responsibility

Cinco validadores encadenados. Cada uno conoce solo al siguiente. Si un eslabón falla, corta la cadena y lanza `IllegalArgumentException`. El último eslabón contiene la regla de negocio real.

```
ValidarNombre          → nombre no vacío, solo letras, máx 30 caracteres
  → ValidarEdad        → entre 1 y 80 años
    → ValidarTipo      → tipo reconocido por el sistema
      → ValidarHabitat → hábitat disponible en el zoológico
        → ValidarCompatibilidad ★ → ¿puede este animal vivir en este hábitat?
```

#### Tabla de compatibilidad

| Animal | Hábitats válidos |
|---|---|
| 🦁 León | Sabana, Desierto |
| 🐘 Elefante | Sabana, Selva |
| 🐒 Mono | Selva |
| 🦈 Tiburón | Acuario, Río |
| 🦅 Águila | Montaña |
| 🐊 Cocodrilo | Río, Selva |

---

## Estructura del proyecto

```
├── frontend/
│   ├── index.html       # UI con badges explicativos por patrón
│   ├── style.css
│   └── app.js           # Fetch API + animación de la cadena + tooltips
│
└── src/main/java/com/zoo/
    ├── controller/      # AnimalController — API REST (@RestController)
    ├── service/         # AnimalService — orquesta chain, factory y repositorio
    ├── dto/             # AnimalDTO — objeto de transferencia
    ├── model/           # Animal (abstract) + Leon, Elefante, Mono, Tiburon, Aguila, Cocodrilo
    ├── bridge/          # Habitat (interface) + Sabana, Selva, Acuario, Rio, Desierto, Montana
    ├── factory/         # AnimalFactory (abstract) + AnimalFactoryImpl
    └── chain/           # Validador (abstract) + 5 implementaciones
```

---

## Endpoints

Base URL: `http://localhost:8080/api/animales`

### POST `/api/animales` — Registrar animal

```json
{
  "tipo": "TIBURON",
  "nombre": "Bruce",
  "edad": 8,
  "habitat": "ACUARIO"
}
```

Respuesta `200 OK`: `Animal registrado correctamente`  
Respuesta `400 Bad Request`: mensaje del eslabón que falló, ej. `TIBURON no puede vivir en SABANA. Hábitats válidos: ACUARIO, RIO`

### GET `/api/animales` — Listar todos

```json
[
  { "nombre": "Bruce", "edad": 8, "tipo": "TIBURON", "habitat": "Habita en el acuario" }
]
```

### GET `/api/animales/ordenar?criterio=edad` — Ordenar

El parámetro `criterio` acepta `edad` o `nombre`.