import { fireEvent, render, screen } from '@testing-library/react'
import { HeroImage } from './hero-image'

const images = 'https://imagedelivery.net/vy2bglCGN6hEeWOnSe2c7A'
const hero = `${images}/Vision+Exercise+Bike-1/w=900,h=500,fit=pad,background=black`
const still = `${hero},anim=false`
const sizes = '(min-width: 56rem) 54rem, calc(100vw - 2rem)'

describe('HeroImage', () => {
  it('shows the hero as a still at the width its box needs', () => {
    render(<HeroImage src={hero} alt="Vision Exercise Bike" sizes={sizes} />)

    const image = screen.getByRole('img', { name: 'Vision Exercise Bike' })
    expect(image).toHaveAttribute('src', still)
    expect(image.getAttribute('srcset')).toContain(
      `${images}/Vision+Exercise+Bike-1/w=360,h=200,fit=pad,background=black,anim=false 360w`
    )
    expect(image).toHaveAttribute('sizes', sizes)
    expect(image).toHaveAttribute('width', '900')
    expect(image).toHaveAttribute('height', '500')
  })

  it('falls back to the hero as the article links it when the still fails to load', () => {
    render(<HeroImage src={hero} alt="Vision Exercise Bike" sizes={sizes} />)

    fireEvent.error(screen.getByRole('img', { name: 'Vision Exercise Bike' }))

    const image = screen.getByRole('img', { name: 'Vision Exercise Bike' })
    expect(image).toHaveAttribute('src', hero)
    expect(image).not.toHaveAttribute('srcset')
    expect(image).not.toHaveAttribute('sizes')
  })

  it('falls back when the still failed before hydration, when onError was not yet attached', () => {
    const complete = jest.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
    const naturalWidth = jest
      .spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get')
      .mockReturnValue(0)

    try {
      render(<HeroImage src={hero} alt="Vision Exercise Bike" sizes={sizes} />)

      expect(screen.getByRole('img', { name: 'Vision Exercise Bike' })).toHaveAttribute('src', hero)
    } finally {
      complete.mockRestore()
      naturalWidth.mockRestore()
    }
  })

  it('shows an image it cannot resize as it is', () => {
    render(<HeroImage src="/images/hero.png" alt="Hero" sizes={sizes} loading="lazy" />)

    const image = screen.getByRole('img', { name: 'Hero' })
    expect(image).toHaveAttribute('src', '/images/hero.png')
    expect(image).not.toHaveAttribute('srcset')
    expect(image).toHaveAttribute('loading', 'lazy')
  })
})
