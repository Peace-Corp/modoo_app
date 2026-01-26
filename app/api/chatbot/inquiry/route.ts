import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendDiscordNotification } from '@/lib/notifications/discord';
import { sendEmailNotification } from '@/lib/notifications/mailjet';

interface InquiryRequestBody {
  clothingType: string;
  quantity: string;
  priorities: string[];
  neededDate: string | null;
  neededDateFlexible: boolean;
  contactName: string;
  contactEmail?: string;
  contactPhone: string;
}

// Parse quantity string to number
function parseQuantity(quantityStr: string): number {
  const match = quantityStr.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  // Default to 100 for "100벌 이상"
  if (quantityStr.includes('이상')) {
    return 100;
  }
  return 10; // Default
}

export async function POST(request: NextRequest) {
  try {
    const body: InquiryRequestBody = await request.json();

    // Validate required fields
    if (!body.clothingType || !body.quantity || !body.priorities || body.priorities.length !== 3) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!body.contactName || !body.contactPhone) {
      return NextResponse.json(
        { error: 'Contact information is required' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for insert
    const supabase = createAdminClient();

    // Insert inquiry into database
    const { data: inquiry, error } = await supabase
      .from('chatbot_inquiries')
      .insert({
        clothing_type: body.clothingType,
        quantity: parseQuantity(body.quantity),
        priorities: body.priorities,
        needed_date: body.neededDateFlexible ? null : body.neededDate,
        needed_date_flexible: body.neededDateFlexible,
        contact_name: body.contactName,
        contact_email: body.contactEmail || null,
        contact_phone: body.contactPhone,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting inquiry:', error);
      return NextResponse.json(
        { error: 'Failed to save inquiry' },
        { status: 500 }
      );
    }

    // Send notifications (don't fail the request if notifications fail)
    const notificationData = {
      id: inquiry.id,
      clothing_type: inquiry.clothing_type,
      quantity: inquiry.quantity,
      priorities: inquiry.priorities,
      needed_date: inquiry.needed_date,
      needed_date_flexible: inquiry.needed_date_flexible,
      contact_name: inquiry.contact_name,
      contact_email: inquiry.contact_email,
      contact_phone: inquiry.contact_phone,
      created_at: inquiry.created_at
    };

    // Send notifications in parallel
    await Promise.allSettled([
      sendDiscordNotification(notificationData),
      sendEmailNotification(notificationData)
    ]);

    return NextResponse.json({
      success: true,
      inquiry: {
        id: inquiry.id,
        created_at: inquiry.created_at
      }
    });

  } catch (error) {
    console.error('Error processing inquiry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
