<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')

const { header } = useAppConfig()
</script>

<template>
  <UHeader
    :to="header?.to || '/'"
  >
    <template #left>
      <div class="flex items-center gap-4 flex-1">
        <NuxtLink :to="header?.to || '/'">
          <AppLogo class="shrink-0" />
        </NuxtLink>

        <UContentSearchButton
          v-if="header?.search"
          :collapsed="false"
          class="w-full max-w-md hidden lg:flex"
        />
      </div>
    </template>

    <template #right>
      <UContentSearchButton
        v-if="header?.search"
        class="lg:hidden"
      />

      <UColorModeButton v-if="header?.colorMode" />

      <template v-if="header?.links">
        <UButton
          v-for="(link, index) of header.links"
          :key="index"
          v-bind="{ color: 'neutral', variant: 'ghost', ...link }"
        />
      </template>
    </template>

    <template #body>
      <UContentNavigation
        highlight
        :navigation="navigation"
      />
    </template>
  </UHeader>
</template>
