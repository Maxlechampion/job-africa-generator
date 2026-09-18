# Job Africa — Frontend

Interface web Vue.js 3 de l'agrégateur Job Africa.

## Stack technique

- Vue 3 (Composition API)
- Vite (build ultra-rapide)
- Pinia (state management)
- Vue Router (navigation)
- TailwindCSS (styling)
- Axios (HTTP)

## Prérequis

- Node.js 20 ou supérieur
- npm 10 ou supérieur

## Installation

```bash
npm install
cp .env.example .env
npm run dev
```

Le site est disponible sur http://localhost:5173

## Build production

```bash
npm run build
npm run preview
```

## Variables d'environnement

Créer un fichier `.env` :

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## Structure

```
src/
├── main.js              Point d'entrée
├── App.vue              Composant racine
├── router/              Configuration des routes
├── stores/              Stores Pinia
├── services/            Appels API
├── i18n/                Traductions FR/EN
├── components/          Composants réutilisables
└── views/               Pages
```
