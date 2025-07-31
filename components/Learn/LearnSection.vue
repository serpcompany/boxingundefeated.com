<script setup lang="ts">
// Learn section with value proposition cards
</script>

<template>
  <section class="py-16">
    <div class="max-w-6xl mx-auto px-5">
      <SectionHeading text="What's in it for me?" />
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <LearnCard
          strikethrough="Painfully figure out how to code your app"
          headline="Learn to code with AI by coding with AI"
          description="Skip the theory. Skip the tutorials. Jump straight into building real apps
                       with AI tools that write the code for you."
        />
        <LearnCard
          strikethrough="Worry about which tech stack to use"
          headline="Get AI rules for any tech stack"
          description="From Next.js to Django, React to Laravel—we have rules that teach AI
                       how to write better code in any framework."
        />
      </div>
    </div>
  </section>
</template>
