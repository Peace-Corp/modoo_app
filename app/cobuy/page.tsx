import Header from "@/app/components/Header";
import CoBuySessionCard from "@/app/components/CoBuySessionCard";
import { createClient } from "@/lib/supabase";
import { CoBuySessionWithDetails } from "@/types/types";
import { cache } from "react";

const getPublicCoBuySessions = cache(async (): Promise<CoBuySessionWithDetails[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cobuy_sessions')
    .select(`
      *,
      saved_design_screenshot:saved_design_screenshots (
        id,
        title,
        preview_url
      )
    `)
    .eq('is_public', true)
    .eq('status', 'gathering')
    .gte('end_date', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching public CoBuy sessions:', error);
    return [];
  }

  return (data ?? []) as CoBuySessionWithDetails[];
});

export default async function CoBuyListPage() {
  const cobuySessions = await getPublicCoBuySessions();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header back backHref="/home" />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">공동구매</h1>
          <p className="mt-2 text-sm lg:text-base text-gray-600">
            진행 중인 공동구매에 참여하세요
          </p>
        </div>

        {/* Sessions Grid */}
        {cobuySessions.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
            {cobuySessions.map((session) => (
              <CoBuySessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 lg:py-24">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              진행 중인 공동구매가 없습니다
            </h2>
            <p className="text-sm text-gray-500">
              새로운 공동구매가 시작되면 여기에 표시됩니다
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
