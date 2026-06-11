<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')
</script>

<template>
  <UContainer>
    <UPage>
      <template #left>
        <UPageAside>
          <UContentNavigation
            highlight
            :navigation="navigation"
            :defaultOpen="false"
          />
        </UPageAside>
      </template>

      <slot />

      <template #right>
        <div class="lg:block hidden" />
      </template>
    </UPage>
  </UContainer>
</template>
