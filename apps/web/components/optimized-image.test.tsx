import { fireEvent, render, screen } from '@testing-library/react'
import { OptimizedImage } from './optimized-image'

const photo = 'https://boxrec.com/images/thumb/a/a6/photo.jpg/200px-photo.jpg'

describe('OptimizedImage', () => {
  it('shows the photo while it loads', () => {
    render(<OptimizedImage src={photo} alt="Matthew Bowling" width={128} height={128} />)

    const image = screen.getByRole('img', { name: 'Matthew Bowling' })
    expect(image.tagName).toBe('IMG')
    expect(image).toHaveAttribute('src', photo)
  })

  it('falls back to a placeholder of the same size when the photo fails to load', () => {
    render(<OptimizedImage src={photo} alt="Matthew Bowling" width={128} height={128} />)

    fireEvent.error(screen.getByRole('img', { name: 'Matthew Bowling' }))

    const placeholder = screen.getByRole('img', { name: 'Matthew Bowling' })
    expect(placeholder.tagName).toBe('DIV')
    expect(placeholder).toHaveStyle({ width: '128px', height: '128px' })
  })

  it('falls back when the photo failed before hydration, when onError was not yet attached', () => {
    const complete = jest.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true)
    const naturalWidth = jest
      .spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get')
      .mockReturnValue(0)

    try {
      render(<OptimizedImage src={photo} alt="Matthew Bowling" width={64} height={64} />)

      expect(screen.getByRole('img', { name: 'Matthew Bowling' }).tagName).toBe('DIV')
    } finally {
      complete.mockRestore()
      naturalWidth.mockRestore()
    }
  })
})
