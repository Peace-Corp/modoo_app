import Mailjet from 'node-mailjet';

interface ChatbotInquiryNotification {
  id: string;
  clothing_type: string;
  quantity: number;
  priorities: string[];
  needed_date: string | null;
  needed_date_flexible: boolean;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string;
  created_at: string;
}

export async function sendEmailNotification(inquiry: ChatbotInquiryNotification): Promise<boolean> {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  const fromEmail = process.env.MAILJET_FROM_EMAIL;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!apiKey || !secretKey || !fromEmail || !adminEmail) {
    console.warn('Mailjet configuration is incomplete');
    return false;
  }

  try {
    const mailjet = Mailjet.apiConnect(apiKey, secretKey);

    const neededDateDisplay = inquiry.needed_date_flexible
      ? '상관없음 (제작일정에 따름)'
      : (inquiry.needed_date || '미지정');

    const createdAt = new Date(inquiry.created_at).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const result = await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [{
        From: {
          Email: fromEmail,
          Name: '모두의 유니폼'
        },
        To: [{
          Email: adminEmail,
          Name: 'Admin'
        }],
        Subject: `[모두의 유니폼] 새로운 챗봇 문의 - ${inquiry.contact_name}`,
        HTMLPart: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #3B55A5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .field { margin-bottom: 15px; }
              .label { font-weight: bold; color: #3B55A5; }
              .value { margin-top: 5px; }
              .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">🆕 새로운 챗봇 문의</h2>
              </div>
              <div class="content">
                <div class="field">
                  <div class="label">의류 종류</div>
                  <div class="value">${inquiry.clothing_type}</div>
                </div>
                <div class="field">
                  <div class="label">수량</div>
                  <div class="value">${inquiry.quantity}</div>
                </div>
                <div class="field">
                  <div class="label">우선순위</div>
                  <div class="value">${inquiry.priorities.join(' → ')}</div>
                </div>
                <div class="field">
                  <div class="label">필요 날짜</div>
                  <div class="value">${neededDateDisplay}</div>
                </div>
                <div class="field">
                  <div class="label">담당자</div>
                  <div class="value">${inquiry.contact_name}</div>
                </div>
                <div class="field">
                  <div class="label">이메일</div>
                  <div class="value">${inquiry.contact_email || '미입력'}</div>
                </div>
                <div class="field">
                  <div class="label">연락처</div>
                  <div class="value">${inquiry.contact_phone}</div>
                </div>
                <div class="footer">
                  <p>문의 ID: ${inquiry.id}</p>
                  <p>접수 시간: ${createdAt}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        TextPart: `
새로운 챗봇 문의가 접수되었습니다.

의류 종류: ${inquiry.clothing_type}
수량: ${inquiry.quantity}
우선순위: ${inquiry.priorities.join(' → ')}
필요 날짜: ${neededDateDisplay}
담당자: ${inquiry.contact_name}
이메일: ${inquiry.contact_email || '미입력'}
연락처: ${inquiry.contact_phone}

문의 ID: ${inquiry.id}
접수 시간: ${createdAt}
        `
      }]
    });

    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}
