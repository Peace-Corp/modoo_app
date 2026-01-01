
import React from 'react';
import Link from 'next/link';

const PoliciesPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/" className="text-blue-600 hover:underline">
          &larr; Home
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-8 text-center">이용약관 및 정책</h1>

      <div className="prose max-w-none">
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">제1조 (목적)</h2>
          <p>
            이 약관은 [회사명] (이하 "회사")가 운영하는 [쇼핑몰명] (이하 "몰")에서 제공하는 인터넷 관련 서비스(이하 "서비스")를 이용함에 있어 사이버 몰과 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">제2조 (개인정보처리방침)</h2>
          <p>
            "회사"는 이용자의 개인정보를 중요시하며, "정보통신망 이용촉진 및 정보보호"에 관한 법률을 준수하고 있습니다. 회사는 개인정보처리방침을 통하여 이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며, 개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
          </p>
          <h3 className="text-xl font-semibold my-2">1. 수집하는 개인정보 항목</h3>
          <p>
            회사는 회원가입, 상담, 서비스 신청 등등을 위해 아래와 같은 개인정보를 수집하고 있습니다.
          </p>
          <ul className="list-disc list-inside">
            <li>수집항목 : 이름, 생년월일, 성별, 로그인ID, 비밀번호, 자택 전화번호, 휴대전화번호, 이메일, 14세미만 아동의 경우 법정대리인 정보</li>
            <li>개인정보 수집방법 : 홈페이지(회원가입), 서면양식</li>
          </ul>
          <h3 className="text-xl font-semibold my-2">2. 개인정보의 수집 및 이용목적</h3>
          <p>
            회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.
          </p>
          <ul className="list-disc list-inside">
            <li>서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산</li>
            <li>회원 관리: 회원제 서비스 이용에 따른 본인확인, 개인 식별, 불량회원의 부정 이용 방지와 비인가 사용 방지</li>
            <li>마케팅 및 광고에 활용: 신규 서비스(제품) 개발 및 특화, 이벤트 등 광고성 정보 전달</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">제3조 (배송 및 환불 정책)</h2>
          <p>
            "몰"은 이용자가 구매한 재화에 대해 배송수단, 수단별 배송비용 부담자, 수단별 배송기간 등을 명시합니다. 일반적으로 결제 완료 후 3영업일 이내에 배송 절차를 시작하며, 배송 기간은 지역에 따라 상이할 수 있습니다.
          </p>
          <h3 className="text-xl font-semibold my-2">2. 교환 및 환불</h3>
          <p>
            "몰"과 재화등의 구매에 관한 계약을 체결한 이용자는 수신확인의 통지를 받은 날부터 7일 이내에는 청약의 철회를 할 수 있습니다. 단, 다음과 같은 경우에는 교환 및 환불이 불가능합니다.
          </p>
          <ul className="list-disc list-inside">
            <li>이용자에게 책임 있는 사유로 재화 등이 멸실 또는 훼손된 경우</li>
            <li>이용자의 사용 또는 일부 소비에 의하여 재화 등의 가치가 현저히 감소한 경우</li>
            <li>시간의 경과에 의하여 재판매가 곤란할 정도로 재화등의 가치가 현저히 감소한 경우</li>
            <li>복제가 가능한 재화등의 포장을 훼손한 경우</li>
          </ul>
          <p className="mt-2">
            기타 사항은 전자상거래 등에서의 소비자보호에 관한 법률 및 소비자분쟁해결기준에 따릅니다.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PoliciesPage;
