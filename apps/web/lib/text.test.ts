import { describe, expect, it } from 'vitest'
import { decodeHtmlEntities, htmlToPlainText } from './text'

describe('htmlToPlainText', () => {
  it('drops tags and puts each block on its own line', () => {
    expect(htmlToPlainText('<p>First paragraph.</p>\n\n<p>Second paragraph.</p>')).toBe(
      'First paragraph.\nSecond paragraph.'
    )
    expect(htmlToPlainText('<h2>A Title</h2><p>Text</p>')).toBe('A Title\nText')
    expect(htmlToPlainText('<ul><li>One</li><li>Two</li></ul>')).toBe('One\nTwo')
  })

  it('breaks lines at every form of <br>', () => {
    expect(htmlToPlainText('one<br>two<br/>three<BR />four</br>five')).toBe(
      'one\ntwo\nthree\nfour\nfive'
    )
  })

  it('joins inline and nested tags to the words around them', () => {
    expect(
      htmlToPlainText("<p><strong>Ali</strong>'s <em>best <b>fight</b></em>, in <i>1974</i>.</p>")
    ).toBe("Ali's best fight, in 1974.")
    expect(htmlToPlainText('<div><p>Nested <span>block</span></p></div>')).toBe('Nested block')
  })

  it('handles text before the first tag and after a malformed close', () => {
    expect(htmlToPlainText('Name: Tagline\n\n<p>Billy Baker: Maestro<p>\n\nBilly Baker')).toBe(
      'Name: Tagline\nBilly Baker: Maestro\nBilly Baker'
    )
  })

  it("doesn't end a tag at a > inside a quoted attribute value", () => {
    expect(htmlToPlainText('<a title="a > b" href=\'/x>y\'>link</a> text')).toBe('link text')
  })

  it('drops comments, doctypes and the content of script, style and template', () => {
    expect(
      htmlToPlainText(
        '<!DOCTYPE html><!-- <p>hidden</p> -->Shown<script>if (a < b) {}</script>' +
          '<style>p > a {}</style><template><p>later</p></template> text'
      )
    ).toBe('Shown text')
  })

  it('finds a closing tag in any case, and reads many hidden blocks in linear time', () => {
    expect(htmlToPlainText('a<SCRIPT>x < y</Script>b<Style>p {}</STYLE>c')).toBe('abc')

    const pairs = 50_000
    const start = performance.now()
    const text = htmlToPlainText(`${'<script></script>'.repeat(pairs)}after`)
    const elapsed = performance.now() - start

    expect(text).toBe('after')
    // It was 5.8 s while every opening tag lowercased the rest of the input.
    expect(elapsed).toBeLessThan(200)
  })

  it('keeps a < that starts no tag', () => {
    expect(htmlToPlainText('3 < 5 and a <3 and <')).toBe('3 < 5 and a <3 and <')
  })

  it('drops a tag cut off by the end of the input', () => {
    expect(htmlToPlainText('Text <p class="x')).toBe('Text')
  })

  it('drops an unknown tag but keeps the text around it', () => {
    expect(htmlToPlainText('An impressive <number> wins')).toBe('An impressive wins')
  })

  it('decodes entities after the tags go, so escaped markup stays text', () => {
    expect(htmlToPlainText('<p>A &amp; B&#39;s &lt;p&gt; &#x27;Q&#X27;</p>')).toBe(
      "A & B's <p> 'Q'"
    )
  })

  it('collapses whitespace, &nbsp; included, and trims every line', () => {
    expect(htmlToPlainText('<p>  Lots \t of\n\n space&nbsp;&nbsp;here  </p>')).toBe(
      'Lots of space here'
    )
  })

  it('returns an empty string for markup without text', () => {
    expect(htmlToPlainText('')).toBe('')
    expect(htmlToPlainText('<p> </p><br><p>&nbsp;</p>')).toBe('')
  })
})

describe('decodeHtmlEntities', () => {
  it('decodes numeric references, decimal and hex, with or without a semicolon', () => {
    expect(decodeHtmlEntities('&#39;&#x27;&#X2019;&#8212;&#233')).toBe("''\u2019\u2014\u00e9")
  })

  it('replaces a reference to no character with U+FFFD', () => {
    expect(decodeHtmlEntities('&#0;&#xD800;&#x110000;&#99999999999;')).toBe(
      '\ufffd\ufffd\ufffd\ufffd'
    )
  })

  it('decodes the common named references and accented letters', () => {
    expect(
      decodeHtmlEntities('&amp;&lt;&gt;&quot;&apos;&ndash;&mdash;&lsquo;&rsquo;&ldquo;&rdquo;')
    ).toBe('&<>"\'\u2013\u2014\u2018\u2019\u201c\u201d')
    expect(decodeHtmlEntities('&hellip; &nbsp;')).toBe('\u2026 \u00a0')
    expect(
      decodeHtmlEntities('Ch&aacute;vez, Pacqui&atilde;o, &Scaron;ar&ccedil;, M&uuml;ller')
    ).toBe('Chávez, Pacquião, Šarç, Müller')
  })

  it('leaves unknown names, references without a semicolon and a bare & as written', () => {
    expect(decodeHtmlEntities('Q&A, AT&T, &bogus; &qacute; &amp &constructor;')).toBe(
      'Q&A, AT&T, &bogus; &qacute; &amp &constructor;'
    )
  })
})
