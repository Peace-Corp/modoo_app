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

export async function sendDiscordNotification(inquiry: ChatbotInquiryNotification): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL is not configured');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🆕 새로운 챗봇 문의',
          color: 0x3B55A5, // Brand color
          fields: [
            { name: '의류 종류', value: inquiry.clothing_type, inline: true },
            { name: '수량', value: String(inquiry.quantity), inline: true },
            { name: '우선순위', value: inquiry.priorities.join(' → '), inline: false },
            { name: '필요 날짜', value: inquiry.needed_date_flexible ? '상관없음 (제작일정에 따름)' : (inquiry.needed_date || '미지정'), inline: true },
            { name: '담당자', value: inquiry.contact_name, inline: true },
            { name: '이메일', value: inquiry.contact_email || '미입력', inline: true },
            { name: '연락처', value: inquiry.contact_phone, inline: true },
          ],
          footer: {
            text: `문의 ID: ${inquiry.id}`
          },
          timestamp: inquiry.created_at,
        }]
      })
    });

    if (!response.ok) {
      console.error('Discord notification failed:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return false;
  }
}
