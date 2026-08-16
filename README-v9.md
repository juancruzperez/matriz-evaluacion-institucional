# MEI v9 — Situación territorial

Esta iteración agrega:
- gráfico de aro de distribución de criticidad actual;
- mapa territorial con un punto por institución;
- popup contextual sin abandonar el dashboard;
- coordenadas por CUE;
- cálculo de criticidad basado en la situación actual por nivel, no en todo el historial.

## Dependencia

Instalar:

```powershell
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

## Integración

Importar en `app/page.tsx`:

```tsx
import { TerritorialOverview } from "@/components/dashboard/TerritorialOverview"
```

Insertar ` <TerritorialOverview /> ` inmediatamente antes de la sección `TRABAJO EN CURSO`.

Agregar el contenido de `app-globals-additions.css` al final de `app/globals.css`.

Reemplazar `lib/criticality.ts` por el incluido en este paquete.

Copiar:
- `data/institution-coordinates.ts`
- `components/dashboard/*`

## Nota sobre coordenadas

El CSV recibido tiene 49 filas, pero 6 no tienen un CUE numérico utilizable (5 vacíos y uno `1405441XX`). Por seguridad, esta iteración mapea automáticamente 43 instituciones por CUE. No se asignan coordenadas por posición para evitar ubicar una institución incorrectamente. Esos 6 registros deben corregirse con su CUE antes de incorporarlos.
