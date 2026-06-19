<script setup lang="ts">
import { useHandleSignInCallback } from '@logto/vue';

const { isLoading } = useHandleSignInCallback(() => {
  // redirect after successful login
  navigateTo('/');
});
</script>

<template>
  <div v-if="isLoading">
    Signing you in...
  </div>
</template>

<style scoped></style>
