import { resizeHeroImage } from './hero-image'

const images = 'https://imagedelivery.net/vy2bglCGN6hEeWOnSe2c7A'
const hero = `${images}/Vision+Exercise+Bike-1/w=900,h=500,fit=pad,background=black`

describe('resizeHeroImage', () => {
  it("serves a shop hero as a still at its own size, keeping the variant's other options", () => {
    expect(resizeHeroImage(hero)).toEqual({
      src: `${images}/Vision+Exercise+Bike-1/w=900,h=500,fit=pad,background=black,anim=false`,
      srcSet: [
        `${images}/Vision+Exercise+Bike-1/w=360,h=200,fit=pad,background=black,anim=false 360w`,
        `${images}/Vision+Exercise+Bike-1/w=540,h=300,fit=pad,background=black,anim=false 540w`,
        `${images}/Vision+Exercise+Bike-1/w=720,h=400,fit=pad,background=black,anim=false 720w`,
        `${images}/Vision+Exercise+Bike-1/w=900,h=500,fit=pad,background=black,anim=false 900w`
      ].join(', '),
      width: 900,
      height: 500
    })
  })

  it('never offers a width beyond the variant, and keeps its aspect ratio at every width', () => {
    const still = resizeHeroImage(
      `${images}/Kettlebells-1/width=600,height=400,anim=true,format=gif`
    )

    expect(still?.src).toBe(`${images}/Kettlebells-1/w=600,h=400,anim=false`)
    expect(still?.srcSet).toBe(
      [
        `${images}/Kettlebells-1/w=360,h=240,anim=false 360w`,
        `${images}/Kettlebells-1/w=540,h=360,anim=false 540w`,
        `${images}/Kettlebells-1/w=600,h=400,anim=false 600w`
      ].join(', ')
    )
    expect(still).toMatchObject({ width: 600, height: 400 })
  })

  it.each([
    ['a named variant (no size to keep)', `${images}/Vision+Exercise+Bike-1/public`],
    ['a variant without a height', `${images}/Vision+Exercise+Bike-1/w=900,fit=pad`],
    ['a variant with a malformed option', `${images}/Vision+Exercise+Bike-1/w=900,h=500,fit`],
    ['a variant with a size that is not a whole number', `${images}/Hero/w=900.5,h=500`],
    ['an image from another host', 'https://example.com/hero/w=900,h=500'],
    ['a URL with a query', `${hero}?v=2`],
    ['a path that is not hash, id and variant', `${images}/Vision+Exercise+Bike-1`],
    ['a relative path', '/images/hero.gif'],
    ['an empty value', '']
  ])('leaves %s as it is', (_case, url) => {
    expect(resizeHeroImage(url)).toBeNull()
  })
})
