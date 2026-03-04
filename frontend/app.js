const BASE_URL = "http://localhost:8080/api/animales";

// ─── Helpers de UI ────────────────────────────────────────────────────────────

const ANIMAL_META = {
  LEON:     { emoji: "🦁", sonido: "Rugido" },
  ELEFANTE: { emoji: "🐘", sonido: "Barrito" },
  MONO:     { emoji: "🐒", sonido: "Chillido" },
};

const HABITAT_META = {
  SABANA:  { label: "Habita en la sabana", icon: "🌾" },
  SELVA:   { label: "Habita en la selva",  icon: "🌿" },
  ACUARIO: { label: "Habita en el acuario", icon: "🌊" },
};

// ─── Chain of Responsibility: visualización en cliente ───────────────────────
//
// Refleja la misma cadena que corre en el servidor:
//   ValidarNombre → ValidarEdad → ValidarTipo → ValidarHabitat
// Así el usuario VE la cadena trabajando antes de enviar la petición.

const STEPS = ["v-nombre", "v-edad", "v-tipo", "v-habitat"];

function resetChain() {
  STEPS.forEach(id => {
    const el = document.getElementById(id);
    el.className = "chain__step";
  });
  setChainStatus("", "");
}

function runChainAnimation(nombre, edad, tipo, habitat) {
  resetChain();
  const status = document.getElementById("chainStatus");

  const validations = [
    {
      id: "v-nombre",
      check: () => nombre.trim().length > 0,
      msg: "✗ Nombre inválido — ValidarNombre bloqueó la cadena",
      field: "nombre",
    },
    {
      id: "v-edad",
      check: () => parseInt(edad) > 0 && !isNaN(parseInt(edad)),
      msg: "✗ Edad inválida — ValidarEdad bloqueó la cadena",
      field: "edad",
    },
    {
      id: "v-tipo",
      check: () => ["LEON", "ELEFANTE", "MONO"].includes(tipo),
      msg: "✗ Tipo inválido — ValidarTipo bloqueó la cadena",
      field: "tipo",
    },
    {
      id: "v-habitat",
      check: () => ["SABANA", "SELVA", "ACUARIO"].includes(habitat),
      msg: "✗ Hábitat inválido — ValidarHabitat bloqueó la cadena",
      field: "habitat",
    },
  ];

  return new Promise((resolve) => {
    let i = 0;

    function nextStep() {
      if (i >= validations.length) {
        setChainStatus("✓ Todas las validaciones pasaron — registrando…", "ok");
        resolve(true);
        return;
      }

      const v = validations[i];
      const el = document.getElementById(v.id);
      el.classList.add("pending");

      setTimeout(() => {
        if (v.check()) {
          el.classList.remove("pending");
          el.classList.add("valid");
          i++;
          setTimeout(nextStep, 200);
        } else {
          el.classList.remove("pending");
          el.classList.add("invalid");
          // Marcar el input correspondiente
          const input = document.getElementById(v.field);
          if (input) {
            input.classList.add("error");
            input.addEventListener("input", () => input.classList.remove("error"), { once: true });
          }
          setChainStatus(v.msg, "err");
          resolve(false);
        }
      }, 350);
    }

    nextStep();
  });
}

function setChainStatus(msg, cls) {
  const el = document.getElementById("chainStatus");
  el.textContent = msg;
  el.className = "chain-status " + cls;
}

// ─── Registrar animal ─────────────────────────────────────────────────────────

document.getElementById("btnRegistrar").addEventListener("click", async () => {
  const nombre  = document.getElementById("nombre").value;
  const edad    = document.getElementById("edad").value;
  const tipo    = document.getElementById("tipo").value;
  const habitat = document.getElementById("habitat").value;

  // Primero se visualiza la Chain of Responsibility en el cliente
  const ok = await runChainAnimation(nombre, edad, tipo, habitat);
  if (!ok) return;

  // Si pasa, se envía al servidor (donde la cadena también corre en Java)
  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, edad: parseInt(edad), tipo, habitat }),
    });

    if (response.ok) {
      // Limpiar form
      document.getElementById("nombre").value = "";
      document.getElementById("edad").value = "";
      resetChain();
      await listar();
    } else {
      const msg = await response.text();
      setChainStatus("✗ Error del servidor: " + msg, "err");
    }
  } catch (err) {
    setChainStatus("✗ No se pudo conectar al servidor", "err");
  }
});

// ─── Listar / Ordenar ─────────────────────────────────────────────────────────

document.getElementById("btnListar").addEventListener("click", () => listar());
document.getElementById("btnOrdenarEdad").addEventListener("click", () => listar("edad"));
document.getElementById("btnOrdenarNombre").addEventListener("click", () => listar("nombre"));
document.getElementById("btnLimpiar").addEventListener("click", () => {
  document.getElementById("animalGrid").innerHTML = `
    <div class="empty-state"><span>🦒</span><p>Registra tu primer animal</p></div>`;
});

async function listar(criterio) {
  const url = criterio
    ? `${BASE_URL}/ordenar?criterio=${criterio}`
    : BASE_URL;

  try {
    const response = await fetch(url);
    if (!response.ok) return;

    const animales = await response.json();
    renderAnimales(animales);
  } catch {
    document.getElementById("animalGrid").innerHTML =
      `<div class="empty-state"><span>⚠️</span><p>No se pudo conectar al servidor</p></div>`;
  }
}

// ─── Render: aquí se muestra el resultado del Bridge y del Factory ────────────
//
// Bridge: el servidor devuelve habitat.describir() → lo mostramos con su badge
// Factory: el servidor devuelve el tipo (getClass().getSimpleName()) → emoji + sonido

function renderAnimales(animales) {
  const grid = document.getElementById("animalGrid");

  if (!animales.length) {
    grid.innerHTML = `<div class="empty-state"><span>🦒</span><p>No hay animales registrados</p></div>`;
    return;
  }

  grid.innerHTML = "";

  animales.forEach((animal) => {
    // tipo viene como "LEON", "ELEFANTE", "MONO" (del getTipo() en Animal.java)
    const tipoKey = animal.tipo?.toUpperCase() || "";
    const meta    = ANIMAL_META[tipoKey] || { emoji: "🐾", sonido: "?" };

    // habitat viene de habitat.describir() (Bridge en acción)
    // El servidor devuelve strings como "Habita en la sabana"
    const habitatLabel = animal.habitat || "";

    const card = document.createElement("div");
    card.className = "animal-card";
    card.innerHTML = `
      <div class="animal-card__emoji">${meta.emoji}</div>
      <div class="animal-card__info">
        <div class="animal-card__name">${animal.nombre}</div>
        <div class="animal-card__meta">
          <span>🗓 ${animal.edad} año${animal.edad !== 1 ? "s" : ""}</span>
          <span class="habitat-bridge" title="Bridge: Habitat.describir()">
            ${habitatLabel}
          </span>
        </div>
      </div>
      <div class="animal-card__sound">
        <span class="sound-label">hacerSonido()</span>
        <span class="sound-value">${meta.sonido}</span>
      </div>
    `;
    grid.appendChild(card);
  });
}