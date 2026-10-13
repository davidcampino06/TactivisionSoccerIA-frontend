# TactivisionSoccerIA-frontend

React + TypeScript + Vite. Se comunica **solo con el Backend** (`VITE_API_URL`).

Estado actual (Fase 7 inicial):
- "Check System" del prototipo conservado (ahora también muestra el estado del AI Service reportado por el Backend).
- Registro (COACH/ANALYST), login y logout.
- Crear equipo (coach) o unirse con código (analyst).
- Partidos: listar y crear.
- Videos: subir, iniciar análisis (real o SIMULATION MODE), ver estado/cola y resultados con la
  etiqueta **REAL VIDEO ANALYSIS** o **SIMULATION MODE**, posibles problemas con evidencia y confianza,
  recomendaciones e indicadores.

Pendiente (la API del backend ya existe): jugadores, diseño táctico, comparación, evolución, reportes, panel admin.

```bash
npm install
copy .env.example .env      # VITE_API_URL=http://localhost:8000
npm run dev
```
## Pruebas de las estructuras de datos

Las estructuras propias del frontend (`src/structures/`) tienen pruebas unitarias con Vitest:

```bash
npm test
```

| Estructura | Dónde se usa | Qué comprueban las pruebas |
|---|---|---|
| `Stack` (pila inmutable) | Deshacer/rehacer del editor táctico | Orden LIFO, versiones antiguas intactas, pila vacía, límite de tamaño |
| `UndoHistory` (dos pilas) | Editor táctico | Deshacer y rehacer en orden, un cambio nuevo vacía "rehacer", capacidad máxima |
| `Trie` (árbol de prefijos) | Búsqueda instantánea de jugadores | Tildes y mayúsculas, búsqueda por prefijo, camino roto, varias palabras a la vez |
| `BinarySearchTree` (ABB / AVL) | Ranking de jugadores | Orden descendente, propiedad de búsqueda, altura del AVL frente al ABB simple, rangos que saltan subárboles |
