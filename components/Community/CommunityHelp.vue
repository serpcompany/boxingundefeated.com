<script setup lang="ts">
/**
 * Community Help Component.
 *
 * Displays a feed of community messages to show recent discussions
 * and help users connect with the community. Shows user avatars,
 * message content, timestamps, and engagement metrics.
 *
 * @component
 * @example
 * ```vue
 * <CommunityHelp />
 * ```
 */

/**
 * Sample community messages data.
 * @type {Array<{
 *   id: number,
 *   user: object,
 *   content: string,
 *   timestamp: string,
 *   likes: number,
 *   replies: number
 * }>}
 */
const messages = [
  {
    id: 1,
    user: {
      name: 'Sarah Chen',
      avatar: '/avatars/sarah.jpg',
      initials: 'SC',
    },
    content: 'Just got my Nuxt app deployed! The AI rules for Vue really helped with component structure.',
    timestamp: '5m ago',
    likes: 12,
    replies: 3,
  },
  {
    id: 2,
    user: {
      name: 'Mike Johnson',
      avatar: '/avatars/mike.jpg',
      initials: 'MJ',
    },
    content: 'Has anyone used the TypeScript rules with Next.js? Looking for best practices.',
    timestamp: '12m ago',
    likes: 8,
    replies: 5,
  },
  {
    id: 3,
    user: {
      name: 'Alex Rivera',
      avatar: '/avatars/alex.jpg',
      initials: 'AR',
    },
    content: 'The prompt engineering guide was incredibly helpful. My AI coding assistant is so much better now!',
    timestamp: '1h ago',
    likes: 24,
    replies: 7,
  },
]
</script>

<template>
  <UCard class="bg-zinc-50 dark:bg-zinc-800">
    <template #header>
      <h3 class="text-lg font-semibold">
        Community Help
      </h3>
    </template>

    <div class="messages-list space-y-4">
      <UserMessage
        v-for="message in messages"
        :key="message.id"
        :user="message.user"
        :content="message.content"
        :timestamp="message.timestamp"
        :likes="message.likes"
        :replies="message.replies"
      />
    </div>

    <template #footer>
      <UButton
        variant="ghost"
        class="view-all-link w-full"
        color="gray"
      >
        View all messages
        <UIcon name="i-heroicons-arrow-right" class="ml-2" />
      </UButton>
    </template>
  </UCard>
</template>
