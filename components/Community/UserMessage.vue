<script setup>
defineProps({
  user: {
    type: Object,
    required: true,
    validator: (user) => {
      return user && typeof user.name === 'string' && typeof user.initials === 'string'
    },
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: String,
    required: true,
  },
  likes: {
    type: Number,
    default: 0,
  },
  replies: {
    type: Number,
    default: 0,
  },
})
</script>

<template>
  <UCard>
    <div class="flex items-start space-x-3">
      <UserAvatar :user="user" size="sm" />

      <div class="flex-1">
        <div class="flex items-center space-x-2 mb-2">
          <span class="font-medium text-zinc-900 dark:text-white">{{ user.name }}</span>
          <UBadge variant="soft" color="gray" class="timestamp">
            {{ timestamp }}
          </UBadge>
        </div>

        <p class="message-content text-zinc-700 dark:text-zinc-300 mb-3">
          {{ content }}
        </p>

        <div class="interactions flex items-center space-x-4">
          <UButton
            variant="ghost"
            color="gray"
            size="xs"
            class="hover:text-red-500"
          >
            <UIcon name="i-heroicons-heart" class="w-4 h-4 mr-1" />
            {{ likes }}
          </UButton>

          <UButton
            variant="ghost"
            color="gray"
            size="xs"
            class="hover:text-blue-500"
          >
            <UIcon name="i-heroicons-chat-bubble-left" class="w-4 h-4 mr-1" />
            {{ replies }}
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
