'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function PoliciesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">이용약관</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제1조 (목적)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              이 약관은 회사가 운영하는 쇼핑몰에서 제공하는 인터넷 관련 서비스(이하 "서비스")를 이용함에 있어 사이버 몰과 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제2조 (정의)</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="leading-relaxed">
                <span className="font-semibold">"몰"</span>이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 등을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.
              </li>
              <li className="leading-relaxed">
                <span className="font-semibold">"이용자"</span>란 "몰"에 접속하여 이 약관에 따라 "몰"이 제공하는 서비스를 받는 회원 및 비회원을 말합니다.
              </li>
              <li className="leading-relaxed">
                <span className="font-semibold">"회원"</span>이란 "몰"에 개인정보를 제공하여 회원등록을 한 자로서, "몰"의 정보를 지속적으로 제공받으며, "몰"이 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제3조 (약관의 명시와 설명 및 개정)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              "몰"은 이 약관의 내용과 상호 및 대표자 성명, 영업소 소재지 주소(소비자의 불만을 처리할 수 있는 곳의 주소를 포함), 전화번호, 모사전송번호, 전자우편주소, 사업자등록번호, 통신판매업 신고번호, 개인정보보호책임자등을 이용자가 쉽게 알 수 있도록 "몰"의 초기 서비스화면에 게시합니다.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              "몰"은 "약관의규제에관한법률", "전자거래기본법", "전자서명법", "정보통신망이용촉진등에관한법률", "소비자보호법" 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제4조 (서비스의 제공 및 변경)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              "몰"은 다음과 같은 업무를 수행합니다.
            </p>
            <ul className="ml-4 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>재화 또는 용역에 대한 정보 제공 및 구매계약의 체결</li>
              <li>구매계약이 체결된 재화 또는 용역의 배송</li>
              <li>기타 "몰"이 정하는 업무</li>
            </ul>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              "몰"은 재화 또는 용역의 품절 또는 기술적 사양의 변경 등의 경우에는 장차 체결되는 계약에 의해 제공할 재화 또는 용역의 내용을 변경할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제5조 (회원가입)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              이용자는 "몰"이 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              "몰"은 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각호에 해당하지 않는 한 회원으로 등록합니다.
            </p>
            <ul className="ml-4 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
              <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
              <li>기타 회원으로 등록하는 것이 "몰"의 기술상 현저히 지장이 있다고 판단되는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제6조 (회원 탈퇴 및 자격 상실)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              회원은 "몰"에 언제든지 탈퇴를 요청할 수 있으며 "몰"은 즉시 회원탈퇴를 처리합니다.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              회원이 다음 각호의 사유에 해당하는 경우, "몰"은 회원자격을 제한 및 정지시킬 수 있습니다.
            </p>
            <ul className="ml-4 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>가입 신청시에 허위 내용을 등록한 경우</li>
              <li>"몰"을 이용하여 구입한 재화 등의 대금, 기타 "몰"이용에 관련하여 회원이 부담하는 채무를 기일에 지급하지 않는 경우</li>
              <li>다른 사람의 "몰" 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제7조 (배송 및 환불 정책)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              "몰"은 이용자가 구매한 재화에 대해 배송수단, 수단별 배송비용 부담자, 수단별 배송기간 등을 명시합니다. 일반적으로 결제 완료 후 3영업일 이내에 배송 절차를 시작하며, 배송 기간은 지역에 따라 상이할 수 있습니다.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mb-2">교환 및 환불</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              "몰"과 재화등의 구매에 관한 계약을 체결한 이용자는 수신확인의 통지를 받은 날부터 7일 이내에는 청약의 철회를 할 수 있습니다. 단, 다음과 같은 경우에는 교환 및 환불이 불가능합니다.
            </p>
            <ul className="ml-4 text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>이용자에게 책임 있는 사유로 재화 등이 멸실 또는 훼손된 경우</li>
              <li>이용자의 사용 또는 일부 소비에 의하여 재화 등의 가치가 현저히 감소한 경우</li>
              <li>시간의 경과에 의하여 재판매가 곤란할 정도로 재화등의 가치가 현저히 감소한 경우</li>
              <li>복제가 가능한 재화등의 포장을 훼손한 경우</li>
            </ul>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              기타 사항은 전자상거래 등에서의 소비자보호에 관한 법률 및 소비자분쟁해결기준에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제8조 (개인정보보호)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              "몰"은 이용자의 정보수집시 구매계약 이행에 필요한 최소한의 정보를 수집합니다.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              "몰"은 이용자의 개인정보를 수집·이용하는 때에는 당해 이용자에게 그 목적을 고지하고 동의를 받습니다.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              "몰"은 수집된 개인정보를 목적외의 용도로 이용할 수 없으며, 새로운 이용목적이 발생한 경우 또는 제3자에게 제공하는 경우에는 이용·제공단계에서 당해 이용자에게 그 목적을 고지하고 동의를 받습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제9조 (면책조항)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              "몰"은 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              "몰"은 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              "몰"은 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며 그 밖에 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제10조 (분쟁해결)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              "몰"은 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              "몰"은 이용자로부터 제출되는 불만사항 및 의견은 우선적으로 그 사항을 처리합니다. 다만, 신속한 처리가 곤란한 경우에는 이용자에게 그 사유와 처리일정을 즉시 통보해 드립니다.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              "몰"과 이용자간에 발생한 분쟁은 전자거래기본법 제28조 및 동 시행령 제15조에 의하여 설치된 전자거래분쟁조정위원회의 조정에 따를 수 있습니다.
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
