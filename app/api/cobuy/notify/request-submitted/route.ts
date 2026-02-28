import { NextRequest, NextResponse } from 'next/server';
import { sendMailjetEmail } from '@/lib/mailjet';

interface RequestSubmittedBody {
  title: string;
  productName: string;
  receiveByDate: string;
  deliveryAddress: string;
  submitterEmail: string;
  submitterName: string;
  shareToken: string;
}

export async function POST(request: NextRequest) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json({ error: 'ADMIN_EMAIL not configured' }, { status: 500 });
  }

  let body: RequestSubmittedBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, productName, receiveByDate, deliveryAddress, submitterEmail, submitterName, shareToken } = body;

  if (!submitterEmail || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const baseUrl = 'https://modoouniform.com';
  const requestLink = `${baseUrl}/cobuy/request/${shareToken}`;
  const submitterLink = requestLink;
  const formattedDate = receiveByDate ? new Date(receiveByDate).toLocaleDateString('ko-KR') : '-';

  // Email to admin
  const adminHtml = `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #3B55A5; border-bottom: 2px solid #3B55A5; padding-bottom: 10px;">새로운 공동구매 요청</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr><td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold; width: 120px; border: 1px solid #ddd;">요청자</td><td style="padding: 8px 12px; border: 1px solid #ddd;">${submitterName} (${submitterEmail})</td></tr>
        <tr><td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold; border: 1px solid #ddd;">단체명</td><td style="padding: 8px 12px; border: 1px solid #ddd;">${title}</td></tr>
        <tr><td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold; border: 1px solid #ddd;">제품</td><td style="padding: 8px 12px; border: 1px solid #ddd;">${productName}</td></tr>
        <tr><td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold; border: 1px solid #ddd;">수령 희망일</td><td style="padding: 8px 12px; border: 1px solid #ddd;">${formattedDate}</td></tr>
        <tr><td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold; border: 1px solid #ddd;">배송 주소</td><td style="padding: 8px 12px; border: 1px solid #ddd;">${deliveryAddress || '-'}</td></tr>
      </table>
      <p style="margin-top: 16px;"><a href="${requestLink}" style="color: #3B55A5;">요청 상세 보기</a></p>
      <p style="margin-top: 20px; color: #888; font-size: 12px;">이 메일은 모두의 유니폼에서 자동 발송되었습니다.</p>
    </div>
  `;

  const adminText = `새로운 공동구매 요청\n요청자: ${submitterName} (${submitterEmail})\n단체명: ${title}\n제품: ${productName}\n수령 희망일: ${formattedDate}\n배송 주소: ${deliveryAddress || '-'}\n링크: ${requestLink}`;

  // Email to submitter
  const submitterHtml = `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #3B55A5; border-bottom: 2px solid #3B55A5; padding-bottom: 10px;">공동구매 요청이 접수되었습니다</h2>
      <p style="margin-top: 16px; color: #333;">${submitterName}님, 공동구매 요청이 성공적으로 제출되었습니다.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr><td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold; width: 120px; border: 1px solid #ddd;">단체명</td><td style="padding: 8px 12px; border: 1px solid #ddd;">${title}</td></tr>
        <tr><td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold; border: 1px solid #ddd;">제품</td><td style="padding: 8px 12px; border: 1px solid #ddd;">${productName}</td></tr>
        <tr><td style="padding: 8px 12px; background: #f5f5f5; font-weight: bold; border: 1px solid #ddd;">수령 희망일</td><td style="padding: 8px 12px; border: 1px solid #ddd;">${formattedDate}</td></tr>
      </table>
      <p style="margin-top: 16px;">관리자가 디자인을 확인한 후 연락드리겠습니다.</p>
      <p style="margin-top: 8px;"><a href="${submitterLink}" style="color: #3B55A5;">요청 확인하기</a></p>
      <p style="margin-top: 20px; color: #888; font-size: 12px;">이 메일은 모두의 유니폼에서 자동 발송되었습니다.</p>
    </div>
  `;

  const submitterText = `공동구매 요청이 접수되었습니다\n${submitterName}님, 요청이 성공적으로 제출되었습니다.\n단체명: ${title}\n제품: ${productName}\n수령 희망일: ${formattedDate}\n요청 확인: ${submitterLink}`;

  // Send both emails
  const [adminSent, submitterSent] = await Promise.all([
    sendMailjetEmail({
      to: [{ email: adminEmail, name: '관리자' }],
      subject: `[공동구매 요청] ${title}`,
      textPart: adminText,
      htmlPart: adminHtml,
      customId: `cobuy-request-admin-${shareToken}`,
    }),
    sendMailjetEmail({
      to: [{ email: submitterEmail, name: submitterName }],
      subject: `[모두의 유니폼] 공동구매 요청이 접수되었습니다`,
      textPart: submitterText,
      htmlPart: submitterHtml,
      customId: `cobuy-request-submitter-${shareToken}`,
    }),
  ]);

  if (!adminSent && !submitterSent) {
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
  }

  return NextResponse.json({ success: true, adminSent, submitterSent });
}
