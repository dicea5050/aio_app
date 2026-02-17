import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const pdfBase64 = formData.get('pdfData') as string | null;
        const filename = formData.get('filename') as string || 'download.pdf';

        if (!pdfBase64) {
            return NextResponse.json({ error: 'No PDF data uploaded' }, { status: 400 });
        }

        // Base64のヘッダー部分（data:application/pdf;base64,）を取り除く
        const base64Data = pdfBase64.replace(/^data:.*,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
