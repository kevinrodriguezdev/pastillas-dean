<script setup>
import { RouterLink, useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const active = computed(() => route.path);
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 z-40"
    :style="{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }"
  >
    <div class="max-w-md mx-auto grid grid-cols-2">
      <RouterLink
        to="/"
        class="flex flex-col items-center py-3 transition-colors"
        :class="active === '/' ? 'text-emerald-600' : 'text-gray-500'"
      >
        <span class="text-2xl" aria-hidden="true">🏠</span>
        <span class="text-xs font-medium">Inicio</span>
      </RouterLink>
      <RouterLink
        to="/historial"
        class="flex flex-col items-center py-3 transition-colors"
        :class="active === '/historial' ? 'text-emerald-600' : 'text-gray-500'"
      >
        <span class="text-2xl" aria-hidden="true">📋</span>
        <span class="text-xs font-medium">Historial</span>
      </RouterLink>
    </div>
  </nav>
</template>
