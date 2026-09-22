<template>
  <footer class="bg-slate-900 text-slate-300 mt-16">
    <div class="container-page py-10 grid md:grid-cols-3 gap-8">
      <div>
        <h3 class="text-white font-semibold mb-3">Job Africa</h3>
        <p class="text-sm text-slate-400">
          Agregateur intelligent d'offres d'emploi en Afrique de l'Ouest.
        </p>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Navigation</h4>
        <ul class="space-y-2 text-sm">
          <li><RouterLink to="/" class="hover:text-white">Accueil</RouterLink></li>
          <li><RouterLink to="/jobs" class="hover:text-white">Offres</RouterLink></li>
          <li><RouterLink to="/stats" class="hover:text-white">Statistiques</RouterLink></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Sources</h4>
        <p class="text-sm text-slate-400">
          Collecte automatique depuis plusieurs plateformes africaines et internationales.
        </p>
      </div>
    </div>
    <div class="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
      © {{ new Date().getFullYear() }} Job Africa — Tous droits reserves.
    </div>
  </footer>
</template>
