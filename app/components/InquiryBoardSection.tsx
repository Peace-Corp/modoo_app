import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { InquiryWithDetails, InquiryStatus } from '@/types/types';
import { MessageSquare, ChevronRight } from 'lucide-react';

const STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: '대기중',
  ongoing: '진행중',
  completed: '완료'
};

const STATUS_COLORS: Record<InquiryStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  ongoing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800'
};

export default async function InquiryBoardSection() {
  const supabase = await createClient();

  // Fetch recent inquiries (limit to 5)
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select(`
      *,
      replies:inquiry_replies(id)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else if (diffInHours < 48) {
      return '어제';
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric'
      });
    }
  };

  return (
    <section className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">문의 게시판</h2>
        </div>
        <Link
          href="/inquiries"
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-black transition"
        >
          전체보기
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Inquiries List */}
      {inquiries && inquiries.length > 0 ? (
        <div className="space-y-3">
          {inquiries.map((inquiry: any) => (
            <Link
              key={inquiry.id}
              href={`/inquiries/${inquiry.id}`}
              className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`
                      px-2 py-1 rounded text-xs font-medium
                      ${STATUS_COLORS[inquiry.status as InquiryStatus]}
                    `}>
                      {STATUS_LABELS[inquiry.status as InquiryStatus]}
                    </span>
                    {inquiry.replies && inquiry.replies.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MessageSquare className="w-3 h-3" />
                        <span>{inquiry.replies.length}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium mb-1 line-clamp-1">{inquiry.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                    {inquiry.content}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(inquiry.created_at)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">등록된 문의가 없습니다.</p>
        </div>
      )}
    </section>
  );
}
