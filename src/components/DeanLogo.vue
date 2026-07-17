<script setup>
defineProps({
  size: { type: Number, default: 40 },
  rounded: { type: Boolean, default: true }
});
</script>

<template>
  <div
    :class="[
      'inline-flex items-center justify-center bg-dean-500 text-dean-50 shrink-0',
      rounded ? 'rounded-full' : 'rounded-2xl'
    ]"
    :style="{ width: size + 'px', height: size + 'px' }"
    aria-hidden="true"
  >
    <svg
      :width="size * 0.65"
      :height="size * 0.65"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="32" cy="42" rx="12" ry="10" fill="currentColor" />
      <ellipse cx="18" cy="24" rx="5.5" ry="7" fill="currentColor" />
      <ellipse cx="27" cy="16" rx="5" ry="6.5" fill="currentColor" />
      <ellipse cx="37" cy="16" rx="5" ry="6.5" fill="currentColor" />
      <ellipse cx="46" cy="24" rx="5.5" ry="7" fill="currentColor" />
    </svg>
  </div>
</template>
