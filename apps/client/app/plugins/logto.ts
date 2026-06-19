import { createLogto, UserScope } from '@logto/vue';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(createLogto, {
    appId: 'ozbjn96u12uxei899vkwj',
    endpoint: 'https://auth.churrer.dev',
    resources: ['https://tablespoon.churrer.dev'],
    scopes: [UserScope.Email, UserScope.Profile]
  });
});
