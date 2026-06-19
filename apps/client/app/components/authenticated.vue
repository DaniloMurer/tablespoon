<script setup lang="ts">
import { useLogto } from '@logto/vue';

const { signIn, signOut, isAuthenticated, getAccessToken } = useLogto();

const callApi = async () => {
  const token = await getAccessToken('https://tablespoon.churrer.dev');

  const result = await fetch('http://localhost:4000/protected', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  result.text().then(console.log);
}
</script>

<template>
  <div v-if="isAuthenticated">
    <UButton
      color="primary"
      @click="signOut('http://localhost:3000/')"
    >
      Log out
    </UButton>
    <UButton
      color="secondary"
      @click="callApi()"
    >
      Call Authenticated
    </UButton>
  </div>

  <div v-else>
    <UButton
      color="secondary"
      @click="signIn('http://localhost:3000/callback')"
    >
      Log in
    </UButton>
    <UButton
      color="secondary"
      @click="callApi()"
    >
      Call Authenticated
    </UButton>
  </div>
</template>

<style scoped></style>
