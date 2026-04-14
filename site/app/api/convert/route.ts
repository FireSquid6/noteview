import { NextRequest } from 'next/server'
import { convertMarkdownToPdf } from '../../../../src/to-pdf'

export async function POST(request: NextRequest) {
  try {
    let markdown: string
    let title = 'document'

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const mdField = formData.get('markdown')
      if (!mdField || typeof mdField !== 'string') {
        return new Response('Missing markdown field', { status: 400 })
      }
      markdown = mdField
      const titleField = formData.get('title')
      if (titleField && typeof titleField === 'string') {
        title = titleField.replace(/\.pdf$/i, '')
      }
    } else {
      const body = await request.json()
      markdown = body.markdown
      if (!markdown) {
        return new Response('Missing markdown field', { status: 400 })
      }
      if (body.title) {
        title = (body.title as string).replace(/\.pdf$/i, '')
      }
    }

    const pdfBuffer = await convertMarkdownToPdf(markdown, title)

    const filename = `${title}.pdf`
    return new Response(new Blob([pdfBuffer], { type: 'application/pdf' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('PDF conversion error:', err)
    return new Response('Internal server error', { status: 500 })
  }
}
