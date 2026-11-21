# Mundo de Cristal

Un archipiélago flotante en 3D para el navegador, hecho con [three.js](https://threejs.org): diez islas, más de cien criaturas animadas, enemigos, misiones, interiores y dragones que se pueden montar.

## Jugar en local

Hace falta un servidor web estático (los módulos ES no cargan desde `file://`):

```bash
python3 -m http.server 8765
```

Abre <http://127.0.0.1:8765/> (o directamente `mundo.html`). Se necesita conexión a internet para cargar three.js y las fuentes desde CDN.

`isla.html` es la primera versión: la Isla de Cristal sola, interactiva.

## Publicar en GitHub Pages

En **Settings → Pages**, elige *Deploy from a branch*, rama `main`, carpeta `/ (root)`. El juego queda en `https://<usuario>.github.io/<repo>/`.

## Controles (modo Explorar)

| Acción | Teclado y ratón | Táctil |
|---|---|---|
| Mirar | Ratón (haz clic para capturarlo, Esc para soltarlo) | Arrastrar a la derecha |
| Moverse / correr | WASD / Shift | Joystick izquierdo |
| Saltar | Espacio | ⤒ |
| Atacar | Clic izquierdo | ⚔️ |
| Habilidad de clase | Clic derecho | 🛡️ |
| Interactuar (hablar, puertas, cofres) | E | 💬 |
| Poción | R | 🧪 |
| Montar / bajar del dragón | F | 🐉 |

Al montar un dragón: el ratón dirige el vuelo, W acelera, S frena, Espacio sube, C baja y el clic escupe fuego.

## Clases

- **Guerrero**: espada y escudo; bloquea con clic derecho.
- **Mago**: orbes arcanos a distancia; Nova de escarcha que congela.
- **Bestia**: hacha a dos manos; Furia que aumenta daño y velocidad.

La partida se guarda sola en el navegador (`localStorage`).

## Estructura

- `mundo.html`: página e interfaz del juego.
- `mundo/`: código del juego.
  - `core.js`: renderizado, cielo, nubes y posprocesado.
  - `terrain.js`: islas, puentes y colisiones.
  - `decor.js`, `decor2.js`: decoración de las islas interiores y exteriores.
  - `interiors.js`: casa, biblioteca y mazmorra.
  - `npc.js`: personajes y su comportamiento.
  - `combat.js`: enemigos y combate.
  - `quests.js`: misiones.
  - `player.js`, `classes.js`, `charselect.js`: el héroe y sus clases.
  - `dragons.js`: dragones montables y la mascota.
  - `shop.js`, `save.js`, `touch.js`: tienda, guardado y controles táctiles.
- `isla.glb`: la Isla de Cristal, modelada con código en Blender.
- `modelos/`: personajes y animales descargados, cada carpeta con su licencia.

## Créditos

- Personajes y esqueletos: **KayKit** de Kay Lousberg ([kaylousberg.com](https://kaylousberg.com)), CC0.
- Animales: **Quaternius** ([quaternius.com](https://quaternius.com)), CC0.
- Texturas, terreno, dragones, ballena, música y efectos de sonido: generados por código en el propio juego.
