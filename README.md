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