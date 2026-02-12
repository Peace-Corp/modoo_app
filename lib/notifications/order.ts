import { sendMailjetEmail } from '@/lib/mailjet';

interface OrderItemSummary {
  product_title: string;
  quantity: number;
  price_per_item: number;
}

interface OrderNotificationParams {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  deliveryFee: number;
  couponDiscount?: number;
  shippingMethod: 'domestic' | 'international' | 'pickup';
  orderCategory: 'regular' | 'cobuy';
  items: OrderItemSummary[];
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

function shippingMethodLabel(method: string): string {
  switch (method) {
    case 'domestic': return '국내 배송';
    case 'international': return '해외 배송';
    case 'pickup': return '직접 수령';
    default: return method;
  }
}

function buildItemsHtml(items: OrderItemSummary[]): string {
  return items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.product_title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.price_per_item)}</td>
        </tr>`
    )
    .join('');
}

function buildCustomerHtml(params: OrderNotificationParams): string {
  const productTotal = params.items.reduce(
    (sum, item) => sum + item.price_per_item * item.quantity,
    0
  );
  const discount = params.couponDiscount || 0;

  return `
    <div style="max-width:600px;margin:0 auto;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#333;">
      <div style="background:#3B55A5;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">주문이 완료되었습니다</h1>
      </div>
      <div style="padding:24px;">
        <p>${params.customerName}님, 주문해 주셔서 감사합니다!</p>
        <p style="color:#666;font-size:14px;">주문번호: <strong>${params.orderId}</strong></p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px 12px;text-align:left;">상품</th>
              <th style="padding:8px 12px;text-align:center;">수량</th>
              <th style="padding:8px 12px;text-align:right;">단가</th>
            </tr>
          </thead>
          <tbody>
            ${buildItemsHtml(params.items)}
          </tbody>
        </table>

        <div style="border-top:2px solid #3B55A5;padding-top:12px;margin-top:8px;">
          <p style="margin:4px 0;">상품 합계: ${formatCurrency(productTotal)}</p>
          ${discount > 0 ? `<p style="margin:4px 0;color:#e74c3c;">쿠폰 할인: -${formatCurrency(discount)}</p>` : ''}
          <p style="margin:4px 0;">배송비: ${formatCurrency(params.deliveryFee)}</p>
          <p style="margin:4px 0;font-size:18px;"><strong>총 결제금액: ${formatCurrency(params.totalAmount)}</strong></p>
        </div>

        <p style="margin-top:16px;color:#666;font-size:13px;">배송 방법: ${shippingMethodLabel(params.shippingMethod)}</p>
        ${params.orderCategory === 'cobuy' ? '<p style="color:#666;font-size:13px;">공동구매 주문</p>' : ''}
        <p style="margin-top:24px;color:#999;font-size:12px;">문의사항이 있으시면 언제든 연락해 주세요.</p>
      </div>
    </div>
  `;
}

function buildAdminHtml(params: OrderNotificationParams): string {
  return `
    <div style="max-width:600px;margin:0 auto;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#333;">
      <div style="background:#e74c3c;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">새 주문이 접수되었습니다</h1>
      </div>
      <div style="padding:24px;">
        <h3 style="margin-top:0;">주문 정보</h3>
        <p>주문번호: <strong>${params.orderId}</strong></p>
        <p>주문 유형: ${params.orderCategory === 'cobuy' ? '공동구매' : '일반 주문'}</p>

        <h3>고객 정보</h3>
        <p>이름: ${params.customerName}</p>
        <p>이메일: ${params.customerEmail}</p>
        <p>전화번호: ${params.customerPhone}</p>
        <p>배송 방법: ${shippingMethodLabel(params.shippingMethod)}</p>

        <h3>주문 상품</h3>
        <table style="width:100%;border-collapse:collapse;margin:8px 0;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px 12px;text-align:left;">상품</th>
              <th style="padding:8px 12px;text-align:center;">수량</th>
              <th style="padding:8px 12px;text-align:right;">단가</th>
            </tr>
          </thead>
          <tbody>
            ${buildItemsHtml(params.items)}
          </tbody>
        </table>

        <div style="border-top:2px solid #333;padding-top:12px;margin-top:8px;">
          ${params.couponDiscount ? `<p style="margin:4px 0;color:#e74c3c;">쿠폰 할인: -${formatCurrency(params.couponDiscount)}</p>` : ''}
          <p style="margin:4px 0;">배송비: ${formatCurrency(params.deliveryFee)}</p>
          <p style="margin:4px 0;font-size:18px;"><strong>총 결제금액: ${formatCurrency(params.totalAmount)}</strong></p>
        </div>
      </div>
    </div>
  `;
}

function buildCustomerText(params: OrderNotificationParams): string {
  const itemLines = params.items
    .map((item) => `- ${item.product_title} x${item.quantity} (${formatCurrency(item.price_per_item)})`)
    .join('\n');

  return [
    `${params.customerName}님, 주문해 주셔서 감사합니다!`,
    `주문번호: ${params.orderId}`,
    '',
    '주문 상품:',
    itemLines,
    '',
    `총 결제금액: ${formatCurrency(params.totalAmount)}`,
    `배송 방법: ${shippingMethodLabel(params.shippingMethod)}`,
  ].join('\n');
}

function buildAdminText(params: OrderNotificationParams): string {
  const itemLines = params.items
    .map((item) => `- ${item.product_title} x${item.quantity} (${formatCurrency(item.price_per_item)})`)
    .join('\n');

  return [
    '새 주문이 접수되었습니다',
    `주문번호: ${params.orderId}`,
    `주문 유형: ${params.orderCategory === 'cobuy' ? '공동구매' : '일반 주문'}`,
    '',
    '고객 정보:',
    `이름: ${params.customerName}`,
    `이메일: ${params.customerEmail}`,
    `전화번호: ${params.customerPhone}`,
    '',
    '주문 상품:',
    itemLines,
    '',
    `총 결제금액: ${formatCurrency(params.totalAmount)}`,
  ].join('\n');
}

export async function sendOrderNotificationEmails(
  params: OrderNotificationParams
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;

  // Send customer confirmation email
  try {
    await sendMailjetEmail({
      to: [{ email: params.customerEmail, name: params.customerName }],
      subject: `[모두의 굿즈] 주문이 완료되었습니다 (${params.orderId})`,
      textPart: buildCustomerText(params),
      htmlPart: buildCustomerHtml(params),
      customId: `order-confirm-${params.orderId}`,
    });
  } catch (error) {
    console.error('Failed to send customer order confirmation email:', error);
  }

  // Send admin notification email
  if (adminEmail) {
    try {
      await sendMailjetEmail({
        to: [{ email: adminEmail }],
        subject: `[새 주문] ${params.customerName} - ${formatCurrency(params.totalAmount)} (${params.orderId})`,
        textPart: buildAdminText(params),
        htmlPart: buildAdminHtml(params),
        customId: `order-admin-${params.orderId}`,
      });
    } catch (error) {
      console.error('Failed to send admin order notification email:', error);
    }
  }
}
