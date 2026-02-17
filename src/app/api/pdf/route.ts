import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { result } = await request.json();

        if (!result) {
            return NextResponse.json({ error: '診断結果データが必要です' }, { status: 400 });
        }

        // PDFはクライアントサイドでhtml2canvas + jspdfを使って生成するため、
        // このAPIはデータのフォーマットのみ行う
        return NextResponse.json({
            success: true,
            message: 'PDFはクライアントサイドで生成されます',
        });
    } catch (error) {
        console.error('PDF API error:', error);
        return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
    }
}
