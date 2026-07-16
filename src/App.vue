<script setup>
import { RouterView } from 'vue-router';
import BottomNav from '@/components/BottomNav.vue';
import ToastNotification from '@/components/ToastNotification.vue';
</script>

<template>
  <RouterView />
  <BottomNav />
  <ToastNotification />
</template>
