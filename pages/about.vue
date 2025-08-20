<script setup lang="ts">
  const appConfig = useAppConfig()

  useSeoMeta({
    title: 'About',
    description: `Learn about ${appConfig.site.name}, your comprehensive resource for professional boxing information, fighter profiles, and the sweet science.`,
  })
</script>

<template>
  <div class="relative">
    <UContainer class="py-3">
      <BreadCrumbs :items="[{ label: 'About' }]" />
    </UContainer>

    <USeparator />

    <UPageHero
      title="About Boxing Undefeated"
      description="Your ultimate resource for the sweet science"
      :ui="{ wrapper: 'text-left' }"
    />

    <USeparator />

    <UContainer class="py-12">
      <div class="mx-auto max-w-none text-base text-default">
        <p class="text-xl">People always say "you don't play boxing".</p>
        <div class="mt-6 text-muted">
          <p>
            Yet ironically that's exactly what promotion companies do everyday -
            play the game of "who can I match my fighter up with to give him the
            best chance of winning so I can rack up more wins, avoid a loss and
            climb the ladder easier".
          </p>

          <p class="mt-6 text-default">
            It's a pure game - but they HAVE to play it the way boxing currently
            is.
          </p>

          <p class="mt-6">It's a shame.</p>

          <p class="mt-6">It hurts the industry.</p>

          <p class="mt-6">
            It hurts the industry because it takes money out of the fighters'
            pockets.
          </p>

          <p class="mt-6">It takes fights away from the fans.</p>

          <p class="mt-6">
            It turns the sport into a game of who had the best matchmaking and
            game-playing, rather than who is fighting the most, and fighting the
            best.
          </p>

          <p class="mt-6">
            It means less fights for the fighters, which means they are not as
            active so their performance suffers.
          </p>

          <p class="mt-6">
            It means less chances to gain valuable experience that can only be
            gained in the ring, in real fights.
          </p>

          <p class="mt-6">
            It means less fights for the fans because promotion companies and
            promoters are constantly having to dodge matchups & find
            opportunities to game the system, just to avoid getting a loss on
            their fighters record.
          </p>

          <p class="mt-6 text-default">
            We stand by "you don't play boxing"; that Boxing is not a game; and
            it shouldn't be treated like one.
          </p>

          <p class="mt-6">
            Together, we must de-emphasize the undefeated record as the ultimate
            indicator of value, and instead emphasize activity and getting more
            fights for the fighters -- because it's better for everybody.
          </p>

          <p class="mt-6">It's better for the fighters & their team.</p>
          <p class="mt-6">It's better for the fans.</p>
          <p class="mt-6">It's better for the sport of boxing.</p>

          <p class="mt-6 text-default">"EVERYBODY's 'O' has got to go!"</p>
        </div>

        <div class="mt-16 text-muted">
          <h2
            class="text-3xl font-semibold tracking-tight text-pretty text-highlighted"
          >
            Why Boxing Undefeated
          </h2>

          <SharedFigureImage
            class="mt-8"
            src="/about/alexander-the-great-enriquez-boxing-ring-1.jpg"
            alt="A boxer in the ring with his arm raised by the referee, signaling victory."
            caption="Alexander 'The Great' Enriquez in the boxing ring"
          />

          <p class="mt-6">
            Our name is Boxing Undefeated because our Founder Alexander "The
            Great" Enriquez retired from the sport of boxing due to an
            out-of-ring injury with an undefeated record (you can read his full
            story here).
          </p>

          <p class="mt-6">
            It doesn't mean that we only celebrate boxers with undefeated
            records, or think that being undefeated means anything of
            consequence - in fact, the complete opposite.
          </p>

          <p class="mt-6">
            Being undefeated means you haven't faced defeat in the ring
            (officially).
          </p>

          <p class="mt-6">We all know that many fights are robberies.</p>

          <p class="mt-6">
            We also know that you can rack up an undefeated record beating bums.
          </p>

          <p class="mt-6">
            Having a loss on your record does not mean you are defeated. It
            means you faced defeat.
          </p>

          <p class="mt-6">
            Whether you continue is up to you - and this applies to all parts of
            life, not just boxing.
          </p>

          <p class="mt-6">
            We believe that the best lessons and the biggest gains are made in
            defeat and failure, and that we shouldn't avoid it, but run towards
            it with excitement and curiosity.
          </p>

          <SharedFigureImage
            class="mt-8"
            src="/about/alexander-the-great-enriquez-boxing-ring-2.JPG"
            alt="A boxer stands in the ring with his arm raised by the referee, signaling victory, while others look on and the audience watches from the background."
            caption="Alexander 'The Great' Enriquez in the boxing ring"
          />
        </div>

        <div class="mt-16 text-muted">
          <h2
            class="text-3xl font-semibold tracking-tight text-pretty text-highlighted"
          >
            About
          </h2>
          <p class="mt-6">
            Boxing Undefeated is a website and fitness organization dedicated to
            all things boxing. We help people learn and train in boxing to get
            fit, gain confidence, improve their athleticism, or even go
            professional.
          </p>

          <div class="mt-12 max-w-5xl mx-auto text-muted">
            <h3
              class="text-2xl font-semibold tracking-normal text-pretty text-highlighted"
            >
              Our Leadership
            </h3>
            <p class="mt-6">
              Led by undefeated professional boxer Alexander "The Great"
              Enriquez (11-0-1) & internationally acclaimed entrepreneur Devin
              Schumacher (also undefeated at 0-0), our team of trainers and
              coaches provide courses, training, tutorials, videos, and product
              reviews with the goal of giving the best information and support
              for reaching fitness goals.
            </p>
            <p class="mt-6">
              Our mission is to inform, support, and inspire readers to become
              unbeatable in both mind and body through boxing.
            </p>
            <p class="mt-6">
              In addition to helping individuals, we also strive to support the
              boxing community by promoting and showcasing the talents of
              up-and-coming boxers and creating additional income streams for
              them to pursue their dreams.
            </p>

            <div class="mt-8 grid md:grid-cols-2 gap-12">
              <SharedFigureImage
                src="/about/alex-enriquez.jpg"
                alt="A selfie from a man with beard & winter clothing."
                aspect="square"
              >
                <template #caption>
                  Alexander "The Great" Enriquez – Founder & Professional Boxer
                  <span class="basis-full">Undefeated Record: 11-0-1</span>
                </template>
              </SharedFigureImage>

              <SharedFigureImage
                src="/about/devin-schumacher-internet-marketer.jpg"
                alt="A selfie from a man with beard and showing four wall frames."
                aspect="square"
              >
                <template #caption>
                  Devin Schumacher – Co-Founder & Entrepreneur
                  <span class="basis-full">Undefeated Record: 0-0</span>
                </template>
              </SharedFigureImage>
            </div>

            <SharedFigureImage
              src="/about/devin-and-alex-post-boxing-match.jpg"
              alt="A selfie from two mans smiling"
              caption="Devin and Alex after a boxing match"
              aspect="video"
              class="mt-8"
            />
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>
