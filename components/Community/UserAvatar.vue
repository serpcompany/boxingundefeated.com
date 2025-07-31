<script setup lang="ts">
defineProps({
  user: {
    type: Object,
    required: true,
    validator: (user) => {
      return user && typeof user.name === 'string' && typeof user.initials === 'string'
    },
  },
  size: {
    type: String,
    default: 'md',
    validator: size => ['sm', 'md', 'lg', 'xl'].includes(size),
  },
})
</script>

<template>
  <UAvatar
    :src="user.avatar"
    :alt="user.name"
    :text="user.initials"
    :size="size"
  />
</template>
