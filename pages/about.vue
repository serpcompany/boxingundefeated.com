<script setup lang="ts">
import alexEnriquezImg from '~/assets/images/about/alex-enriquez.jpg'
import alexRing1Img from '~/assets/images/about/alexander-the-great-enriquez-boxing-ring-1.jpg'
import alexRing2Img from '~/assets/images/about/alexander-the-great-enriquez-boxing-ring-2.JPG'
import devinAlexImg from '~/assets/images/about/devin-and-alex-post-boxing-match.jpg'
import devinImg from '~/assets/images/about/devin-schumacher-internet-marketer.jpg'

const { site } = useAppConfig()

useSeoMeta({
  title: 'About',
  description: `Learn about ${site.name}, your comprehensive resource for professional boxing information, fighter profiles, and the sweet science.`,
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Breadcrumbs -->
    <div class="bg-white border-b border-gray-100">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <BreadCrumbs 
          :items="[
            { label: 'About' }
          ]"
        />
      </div>
    </div>
    
    <!-- Header -->
    <PageHero 
      title="About Boxing Undefeated"
      subtitle="Your ultimate resource for the sweet science"
    />

    <!-- Main Content -->
    <div class="max-w-5xl mx-auto px-6 lg:px-8 py-12">
      <div class="prose prose-zinc max-w-none">
        <div class="mb-12">
          <p class="text-xl font-medium text-gray-900 mb-4">
            People always say "you don't play boxing".
          </p>
          
          <p class="text-lg leading-relaxed mb-6">
            Yet ironically that's exactly what promotion companies do everyday - play the game of "who can I match my fighter up with to give him the best chance of winning so I can rack up more wins, avoid a loss and climb the ladder easier".
          </p>

          <p class="text-lg font-medium mb-4">
            It's a pure game - but they HAVE to play it the way boxing currently is.
          </p>

          <p class="text-lg mb-2">It's a shame.</p>
          
          <p class="text-lg mb-6">It hurts the industry.</p>

          <p class="text-lg mb-4">
            It hurts the industry because it takes money out of the fighters' pockets.
          </p>

          <p class="text-lg mb-4">
            It takes fights away from the fans.
          </p>

          <p class="text-lg mb-4">
            It turns the sport into a game of who had the best matchmaking and game-playing, rather than who is fighting the most, and fighting the best.
          </p>

          <p class="text-lg mb-4">
            It means less fights for the fighters, which means they are not as active so their performance suffers.
          </p>

          <p class="text-lg mb-4">
            It means less chances to gain valuable experience that can only be gained in the ring, in real fights.
          </p>

          <p class="text-lg mb-6">
            It means less fights for the fans because promotion companies and promoters are constantly having to dodge matchups & find opportunities to game the system, just to avoid getting a loss on their fighters record.
          </p>

          <p class="text-lg font-medium mb-4">
            We stand by "you don't play boxing"; that Boxing is not a game; and it shouldn't be treated like one.
          </p>

          <p class="text-lg mb-6">
            Together, we must de-emphasize the undefeated record as the ultimate indicator of value, and instead emphasize activity and getting more fights for the fighters -- because it's better for everybody.
          </p>

          <p class="text-lg mb-2">It's better for the fighters & their team.</p>
          <p class="text-lg mb-2">It's better for the fans.</p>
          <p class="text-lg mb-6">It's better for the sport of boxing.</p>

          <p class="text-xl font-bold text-gray-900">
            "EVERYBODY's 'O' has got to go!"
          </p>
        </div>

        <h2>Why Boxing Undefeated</h2>
        
        <div class="my-8 -mx-6 lg:-mx-8">
          <img 
            :src="alexRing1Img" 
            alt="Alexander 'The Great' Enriquez in the boxing ring"
            class="w-full h-auto object-cover"
          />
        </div>
        
        <p>
          Our name is Boxing Undefeated because our Founder Alexander "The Great" Enriquez retired from the sport of boxing due to an out-of-ring injury with an undefeated record (you can read his full story here).
        </p>
        
        <p>
          It doesn't mean that we only celebrate boxers with undefeated records, or think that being undefeated means anything of consequence - in fact, the complete opposite.
        </p>

        <p>
          Being undefeated means you haven't faced defeat in the ring (officially).
        </p>

        <p>
          We all know that many fights are robberies.
        </p>

        <p>
          We also know that you can rack up an undefeated record beating bums.
        </p>

        <p>
          Having a loss on your record does not mean you are defeated. It means you faced defeat.
        </p>

        <p>
          Whether you continue is up to you - and this applies to all parts of life, not just boxing.
        </p>

        <p>
          We believe that the best lessons and the biggest gains are made in defeat and failure, and that we shouldn't avoid it, but run towards it with excitement and curiosity.
        </p>

        <div class="my-8 -mx-6 lg:-mx-8">
          <img 
            :src="alexRing2Img" 
            alt="Alexander 'The Great' Enriquez celebrating in the boxing ring"
            class="w-full h-auto object-cover"
          />
        </div>

        <h2>About</h2>
        <p>
          Boxing Undefeated is a website and fitness organization dedicated to all things boxing. We help people learn and train in boxing to get fit, gain confidence, improve their athleticism, or even go professional.
        </p>

        <div class="my-12">
          <h3 class="text-2xl font-bold mb-8">Our Leadership</h3>
          <p>
          Led by undefeated professional boxer Alexander "The Great" Enriquez (11-0-1) & internationally acclaimed entrepreneur Devin Schumacher (also undefeated at 0-0), our team of trainers and coaches provide courses, training, tutorials, videos, and product reviews with the goal of giving the best information and support for reaching fitness goals.
        </p>

        <p>
          Our mission is to inform, support, and inspire readers to become unbeatable in both mind and body through boxing.
        </p>


        <p>
          In addition to helping individuals, we also strive to support the boxing community by promoting and showcasing the talents of up-and-coming boxers and creating additional income streams for them to pursue their dreams.
        </p>

          <div class="grid md:grid-cols-2 gap-8">
            
            <UCard>
              <div class="mb-3">
                <img 
                  :src="alexEnriquezImg" 
                  alt="Alexander 'The Great' Enriquez"
                  class="w-full h-64 object-cover rounded-lg"
                />
              </div>
              <h4 class="text-xl font-semibold mb-2">Alexander "The Great" Enriquez</h4>
              <p class="text-gray-600 mb-2">Founder & Professional Boxer</p>
              <p class="text-sm">Undefeated record: 11-0-1</p>
            </UCard>
            
            <UCard>
              <div class="mb-3">
                <img 
                  :src="devinImg" 
                  alt="Devin Schumacher"
                  class="w-full h-64 object-cover rounded-lg"
                />
              </div>
              <h4 class="text-xl font-semibold mb-2">Devin Schumacher</h4>
              <p class="text-gray-600 mb-2">Co-Founder & Entrepreneur</p>
              <p class="text-sm">Undefeated record: 0-0</p>
            </UCard>
          </div>
          
          <div class="mt-8 max-w-2xl mx-auto">
            <UCard class="overflow-hidden">
              <img 
                :src="devinAlexImg" 
                alt="Devin and Alex after a boxing match"
                class="w-full h-auto object-cover"
              />
              <div class="p-4">
                <p class="text-sm text-gray-600 text-center">Devin and Alex celebrating after a boxing match</p>
              </div>
            </UCard>
          </div>
        </div>

        

        
      </div>
    </div>
  </div>
</template>