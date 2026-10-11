import { describe, expect, it } from 'vitest'
import {
  boxerPhoto,
  isPhotoKey,
  isPhotoSourceUrl,
  isPlaceholderAvatar,
  PHOTO_CONTENT_TYPES,
  photoContentType,
  photoKey,
  photoKeyFromPath,
  photoPath,
  sniffPhotoType
} from './photos'

const SHA = 'ab'.repeat(32)

describe('photo keys', () => {
  it('names the content: photos/<sha256>.<ext>', () => {
    expect(photoKey(SHA, 'jpg')).toBe(`photos/${SHA}.jpg`)
    expect(isPhotoKey(`photos/${SHA}.webp`)).toBe(true)
  })

  it('refuses anything but 64 lowercase hex digits and a known extension', () => {
    expect(() => photoKey('AB'.repeat(32), 'jpg')).toThrow('Not a photo key')
    expect(() => photoKey(SHA.slice(1), 'jpg')).toThrow('Not a photo key')
    expect(() => photoKey(SHA, 'svg' as never)).toThrow('Not a photo key')
    for (const key of [
      `photos/${SHA}.jpeg`,
      `photos/${SHA}.JPG`,
      `photos/${SHA}.jpg/`,
      `photos/x/${SHA}.jpg`,
      `/photos/${SHA}.jpg`,
      `boxers/${SHA}.json`,
      ''
    ]) {
      expect([key, isPhotoKey(key)]).toEqual([key, false])
    }
  })

  it('maps each extension to its content type', () => {
    for (const [extension, type] of Object.entries(PHOTO_CONTENT_TYPES)) {
      expect(photoContentType(`photos/${SHA}.${extension}`)).toBe(type)
    }
    expect(photoContentType(`photos/${SHA}.svg`)).toBeNull()
  })
})

describe('photo URLs', () => {
  it('serves a key at the same path under the site root', () => {
    const key = photoKey(SHA, 'png')
    expect(photoPath(key)).toBe(`/photos/${SHA}.png`)
    expect(photoKeyFromPath(photoPath(key)!)).toBe(key)
  })

  it('has no URL without a well-formed key, so the page shows the placeholder', () => {
    expect(photoPath(null)).toBeNull()
    expect(photoPath(undefined)).toBeNull()
    expect(photoPath('https://boxrec.com/images/thumb/8/83/1.jpeg/200px-1.jpeg')).toBeNull()
    expect(photoPath(`photos/${SHA}.svg`)).toBeNull()
  })

  it('reads a key only from exactly a photo path', () => {
    for (const path of [
      `/photos/${SHA}.jpg/`,
      `/photos/${SHA}.JPG`,
      `/photos/${SHA}`,
      '/photos/',
      '/photos',
      `/photos/../boxers/${SHA}.jpg`,
      `/x/photos/${SHA}.jpg`,
      `/photos//${SHA}.jpg`
    ]) {
      expect([path, photoKeyFromPath(path)]).toEqual([path, null])
    }
  })
})

describe('photo sources', () => {
  const PHOTO = 'https://boxrec.com/images/thumb/8/83/1.jpeg/200px-1.jpeg'
  const PLACEHOLDER = 'https://boxrec.com/build/images/main/v6-avatar.svg'

  it('copies, or links while not copied, only https URLs on boxrec.com', () => {
    expect(isPhotoSourceUrl(PHOTO)).toBe(true)
    expect(isPhotoSourceUrl('https://www.boxrec.com/images/a.jpg')).toBe(true)
    for (const url of [
      'http://boxrec.com/images/a.jpg',
      'https://boxrec.com:8443/images/a.jpg',
      'https://boxrec.com.evil.test/a.jpg',
      'https://evilboxrec.com/a.jpg',
      'https://169.254.169.254/latest',
      'javascript:alert(1)',
      'file:///etc/passwd',
      'not a url'
    ]) {
      expect([url, isPhotoSourceUrl(url)]).toEqual([url, false])
    }
  })

  it("knows BoxRec's placeholder", () => {
    expect(isPlaceholderAvatar(PLACEHOLDER)).toBe(true)
    for (const url of [PHOTO, null, undefined, '']) expect(isPlaceholderAvatar(url)).toBe(false)
  })

  it('shows the copy when there is one, else the boxrec.com source, else the placeholder', () => {
    const key = photoKey(SHA, 'jpg')
    // Copied: this site's copy, whatever the source.
    expect(boxerPhoto(key, PHOTO)).toBe(`/photos/${SHA}.jpg`)
    // Not copied yet, or the copy failed: the source, as before the copy existed.
    expect(boxerPhoto(null, PHOTO)).toBe(PHOTO)
    expect(boxerPhoto(undefined, 'https://www.boxrec.com/images/a.jpg')).toBe(
      'https://www.boxrec.com/images/a.jpg'
    )
    // A malformed key is no copy.
    expect(boxerPhoto(`photos/${SHA}.svg`, PHOTO)).toBe(PHOTO)
    // BoxRec's placeholder, no photo, or a URL anywhere else: the site's placeholder.
    for (const avatar of [
      PLACEHOLDER,
      null,
      undefined,
      '',
      'http://boxrec.com/images/a.jpg',
      'https://example.com/a.jpg',
      'javascript:alert(1)'
    ]) {
      expect([avatar, boxerPhoto(null, avatar)]).toEqual([avatar, null])
    }
  })
})

describe('sniffPhotoType', () => {
  const bytes = (...values: number[]) => new Uint8Array(values)
  const text = (value: string) => new TextEncoder().encode(value)

  it('knows JPEG, PNG, GIF and WebP by their first bytes', () => {
    expect(sniffPhotoType(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toBe('jpg')
    expect(sniffPhotoType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe('png')
    expect(sniffPhotoType(text('GIF89a...'))).toBe('gif')
    expect(sniffPhotoType(text('GIF87a...'))).toBe('gif')
    expect(sniffPhotoType(text('RIFF\u0000\u0000\u0000\u0000WEBPVP8 '))).toBe('webp')
  })

  it('refuses anything else, such as an error page or an SVG', () => {
    expect(sniffPhotoType(text('<!DOCTYPE html><html>'))).toBeNull()
    expect(sniffPhotoType(text('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull()
    expect(sniffPhotoType(text('RIFF\u0000\u0000\u0000\u0000WAVEfmt '))).toBeNull()
    expect(sniffPhotoType(text('GIF88a'))).toBeNull()
    expect(sniffPhotoType(bytes(0xff, 0xd8))).toBeNull()
    expect(sniffPhotoType(new Uint8Array())).toBeNull()
  })
})
