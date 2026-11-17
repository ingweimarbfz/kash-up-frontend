# QuontUp360 · Frontend

App web responsive (PC y celular) de QuontUp360: cobros, préstamos y crédito de productos.
React 18 + Vite + React Router + Recharts. Diseño propio en negro y grises con acento esmeralda (`src/styles`).

## Arranque local
```bash
cp .env.example .env    # VITE_API_URL apunta al backend (por defecto http://localhost:4000)
npm install
npm run dev             # http://localhost:3000
```

## Estructura
```
src/
  App.jsx               rutas y protección por rol
  api/client.js         axios con token y cierre de sesión al expirar
  context/              sesión (AuthContext) y datos del negocio (SettingsContext)
  layout/AppLayout.jsx  menú lateral negro, barra superior y miga de pan
  components/           ui (tarjetas, KPI, modal, toast), logo, login y gráficas
  pages/                dashboard por rol, usuarios, configuración, perfil y auditoría
  utils/nav.js          menú de cada rol (administrador, prestamista, cliente)
  utils/brand.js        nombre, lema y colores de las gráficas
  styles/               tokens de marca y sistema de diseño
docs/marca/             logotipos, símbolo y guía de identidad
```

## Despliegue
`vercel.json` lista para Vercel. Variable: `VITE_API_URL` con la URL del backend en Render.
