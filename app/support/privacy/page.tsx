'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">개인정보 처리방침</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. 개인정보의 수집 및 이용 목적</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="mt-2 ml-4 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증</li>
              <li>재화 또는 서비스 제공: 물품배송, 서비스 제공, 계약서·청구서 발송, 콘텐츠 제공</li>
              <li>마케팅 및 광고에의 활용: 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. 수집하는 개인정보 항목</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              회사는 회원가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.
            </p>
            <ul className="mt-2 ml-4 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>필수항목: 이름, 이메일, 전화번호, 주소</li>
              <li>선택항목: 생년월일, 성별</li>
              <li>서비스 이용 과정에서 자동으로 생성되어 수집될 수 있는 정보: IP주소, 쿠키, 서비스 이용 기록, 방문 기록</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. 개인정보의 보유 및 이용기간</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
            </p>
            <ul className="mt-2 ml-4 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지)</li>
              <li>전자상거래 등에서의 소비자 보호에 관한 법률에 따라 계약 또는 청약철회 등에 관한 기록: 5년</li>
              <li>전자상거래 등에서의 소비자 보호에 관한 법률에 따라 대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. 개인정보의 제3자 제공</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. 개인정보처리의 위탁</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
            </p>
            <ul className="mt-2 ml-4 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>위탁받는 자: 배송업체</li>
              <li>위탁하는 업무의 내용: 제품 배송</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. 정보주체의 권리·의무 및 행사방법</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다. 권리 행사는 회사에 대해 개인정보 보호법 시행령 제41조제1항에 따라 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. 개인정보의 파기</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다. 파기의 절차 및 방법은 다음과 같습니다.
            </p>
            <ul className="mt-2 ml-4 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>파기절차: 불필요한 개인정보 및 개인정보파일은 개인정보책임자의 책임 하에 내부방침 절차에 따라 처리</li>
              <li>파기방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. 개인정보 보호책임자</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="mt-2 ml-4 text-sm text-gray-600 space-y-1">
              <p>개인정보 보호책임자</p>
              <p>이메일: privacy@company.com</p>
              <p>전화: 02-1234-5678</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. 개인정보의 안전성 확보조치</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
            </p>
            <ul className="mt-2 ml-4 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
              <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화</li>
              <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. 개인정보 처리방침의 변경</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              이 개인정보 처리방침은 2026년 1월 4일부터 적용됩니다. 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center">
              최종 수정일: 2026년 1월 4일
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
