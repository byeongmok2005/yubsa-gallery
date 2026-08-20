// fishing.js - 심해 낚시터 (태초 등급, 11·12단계 조 단위 낚싯대, 은화 무한 상승 및 나침반 24레벨 만렙 적용 버전)

let fishingData = { 
    money: 1000, 
    rod_level: 1, 
    fish_records: {}, 
    fish_inventory: {}, 
    unlocked_beasts: [], 
    cursed_target: null,
    curse_remaining_count: 0,
    makara_bonus_chance: 0,
    makara_primordial_bonus: 0,
    siren_streak: 0,
    dagon_partner: null,
    is_dagon_mutual: false,
    trade_request: null,
    silver_coins: 0,
    silver_coin_level: 0,
    compass_fragments: 0,
    compass_level: 0
};

let fishingStep = 'ready'; 
let autoFishingInterval = null; 
let tradePollingInterval = null; 
let biteTimeout = null;
let biteTimer = null; 
let floatingAlertText = ""; 
let playerList = ['실험체', '박병목', '김철수', '장민준', '손승환', '이승욱', '김병수', '김태용']; 
let bahamutAutoActive = true; 

const MAX_COMPASS_LEVEL = 24; // 나침반 최대 레벨 24 (은화는 무한 상승)

const ROD_TIERS = {
    1: { name: '🪵 나무 낚시대', price: 0, cost: 80 },
    2: { name: '🎣 튼튼한 대나무 낚시대', price: 5000, cost: 200 },
    3: { name: '🌊 심해 탐사 퀀텀 낚시대', price: 20000, cost: 400 },
    4: { name: '✨ 탄소섬유 프로 낚시대', price: 70000, cost: 900 },
    5: { name: '⚡ 마력 충전 티타늄 낚시대', price: 250000, cost: 1800 },
    6: { name: '🔱 포세이돈의 삼지창 낚시대', price: 1000000, cost: 3500 },
    7: { name: '🔥 용황의 숨결 낚시대', price: 5000000, cost: 8000 },
    8: { name: '💎 아틀란티스 헤리티지', price: 25000000, cost: 18000 },
    9: { name: '👑 코스믹 차원 낚시대', price: 120000000, cost: 40000 },
    10: { name: '🌟 우주 신들의 낚시대', price: 600000000, cost: 100000 },
    11: { name: '🌌 차원 공허의 시공간 낚시대', price: 5000000000000, cost: 500000 },
    12: { name: '⚛️ 태초의 창조주 오메가 낚시대 (최종)', price: 100000000000000, cost: 2500000 }
};

const FISH_DATABASE = [
    // --- 일반 어류 (Common) ---
    { name: '정어리', grade: '일반', minSize: 0.3, maxSize: 0.7, basePrice: 12, color: '#64748b' },
    { name: '고등어', grade: '일반', minSize: 0.6, maxSize: 1.2, basePrice: 25, color: '#64748b' },
    { name: '오징어', grade: '일반', minSize: 0.6, maxSize: 1.5, basePrice: 35, color: '#64748b' },
    { name: '멸치 떼', grade: '일반', minSize: 0.2, maxSize: 0.5, basePrice: 10, color: '#64748b' },
    { name: '전갱이', grade: '일반', minSize: 0.5, maxSize: 1.0, basePrice: 20, color: '#64748b' },
    { name: '학꽁치', grade: '일반', minSize: 0.6, maxSize: 1.1, basePrice: 28, color: '#64748b' },
    { name: '볼락', grade: '일반', minSize: 0.5, maxSize: 1.1, basePrice: 30, color: '#64748b' },
    { name: '양미리', grade: '일반', minSize: 0.3, maxSize: 0.8, basePrice: 15, color: '#64748b' },
    { name: '청어', grade: '일반', minSize: 0.5, maxSize: 1.0, basePrice: 22, color: '#64748b' },
    { name: '전어', grade: '일반', minSize: 0.4, maxSize: 0.9, basePrice: 18, color: '#64748b' },
    { name: '삼치', grade: '일반', minSize: 1.0, maxSize: 2.2, basePrice: 40, color: '#64748b' },
    { name: '숭어', grade: '일반', minSize: 0.8, maxSize: 1.9, basePrice: 32, color: '#64748b' },
    { name: '망둥어', grade: '일반', minSize: 0.3, maxSize: 0.7, basePrice: 14, color: '#64748b' },
    { name: '복어', grade: '일반', minSize: 0.5, maxSize: 1.0, basePrice: 38, color: '#64748b' },
    { name: '쏨뱅이', grade: '일반', minSize: 0.5, maxSize: 1.1, basePrice: 33, color: '#64748b' },
    { name: '노래미', grade: '일반', minSize: 0.6, maxSize: 1.3, basePrice: 27, color: '#64748b' },
    { name: '황돔', grade: '일반', minSize: 0.6, maxSize: 1.1, basePrice: 36, color: '#64748b' },
    { name: '자리돔', grade: '일반', minSize: 0.3, maxSize: 0.6, basePrice: 16, color: '#64748b' },
    { name: '벤자리', grade: '일반', minSize: 0.6, maxSize: 1.4, basePrice: 39, color: '#64748b' },
    { name: '독가시치', grade: '일반', minSize: 0.5, maxSize: 1.0, basePrice: 24, color: '#64748b' },
    { name: '망상어', grade: '일반', minSize: 0.4, maxSize: 0.8, basePrice: 19, color: '#64748b' },
    { name: '까나리', grade: '일반', minSize: 0.3, maxSize: 0.6, basePrice: 11, color: '#64748b' },
    { name: '꼼치', grade: '일반', minSize: 0.6, maxSize: 1.6, basePrice: 29, color: '#64748b' },
    { name: '도루묵', grade: '일반', minSize: 0.5, maxSize: 0.9, basePrice: 21, color: '#64748b' },
    { name: '양태', grade: '일반', minSize: 0.8, maxSize: 1.8, basePrice: 34, color: '#64748b' },
    { name: '쥐치', grade: '일반', minSize: 0.5, maxSize: 1.1, basePrice: 37, color: '#64748b' },
    { name: '말쥐치', grade: '일반', minSize: 0.6, maxSize: 1.3, basePrice: 42, color: '#64748b' },
    { name: '붕장어(아나고)', grade: '일반', minSize: 1.0, maxSize: 2.2, basePrice: 45, color: '#64748b' },
    { name: '도다리', grade: '일반', minSize: 0.6, maxSize: 1.4, basePrice: 38, color: '#64748b' },
    { name: '성대', grade: '일반', minSize: 0.6, maxSize: 1.2, basePrice: 30, color: '#64748b' },

    // --- 희귀 어류 (Rare) ---
    { name: '광어', grade: '희귀', minSize: 1.3, maxSize: 2.6, basePrice: 95, color: '#16a34a' },
    { name: '우럭', grade: '희귀', minSize: 1.0, maxSize: 2.0, basePrice: 110, color: '#16a34a' },
    { name: '참돔', grade: '희귀', minSize: 1.5, maxSize: 3.0, basePrice: 150, color: '#16a34a' },
    { name: '문어', grade: '희귀', minSize: 1.6, maxSize: 3.5, basePrice: 200, color: '#16a34a' },
    { name: '농어', grade: '희귀', minSize: 1.6, maxSize: 3.3, basePrice: 130, color: '#16a34a' },
    { name: '돌돔', grade: '희귀', minSize: 1.2, maxSize: 2.3, basePrice: 160, color: '#16a34a' },
    { name: '갑오징어', grade: '희귀', minSize: 0.8, maxSize: 1.8, basePrice: 120, color: '#16a34a' },
    { name: '감성돔', grade: '희귀', minSize: 1.3, maxSize: 2.5, basePrice: 175, color: '#16a34a' },
    { name: '능성어', grade: '희귀', minSize: 1.5, maxSize: 3.1, basePrice: 220, color: '#16a34a' },
    { name: '민어', grade: '희귀', minSize: 2.0, maxSize: 4.0, basePrice: 280, color: '#16a34a' },
    { name: '옥돔', grade: '희귀', minSize: 1.0, maxSize: 1.8, basePrice: 140, color: '#16a34a' },
    { name: '붉은옥돔', grade: '희귀', minSize: 1.1, maxSize: 1.9, basePrice: 155, color: '#16a34a' },
    { name: '갈치', grade: '희귀', minSize: 2.0, maxSize: 4.5, basePrice: 165, color: '#16a34a' },
    { name: '하모(갯장어)', grade: '희귀', minSize: 1.6, maxSize: 3.5, basePrice: 190, color: '#16a34a' },
    { name: '군평선이', grade: '희귀', minSize: 0.7, maxSize: 1.3, basePrice: 100, color: '#16a34a' },
    { name: '달고기', grade: '희귀', minSize: 0.8, maxSize: 1.6, basePrice: 125, color: '#16a34a' },
    { name: '놀래기(대형)', grade: '희귀', minSize: 1.0, maxSize: 1.8, basePrice: 115, color: '#16a34a' },
    { name: '자바리', grade: '희귀', minSize: 1.3, maxSize: 2.8, basePrice: 240, color: '#16a34a' },
    { name: '점성어', grade: '희귀', minSize: 1.6, maxSize: 3.3, basePrice: 180, color: '#16a34a' },
    { name: '홍감성돔', grade: '희귀', minSize: 1.3, maxSize: 2.4, basePrice: 185, color: '#16a34a' },
    { name: '벤자리(대형)', grade: '희귀', minSize: 1.2, maxSize: 2.1, basePrice: 145, color: '#16a34a' },
    { name: '참문어', grade: '희귀', minSize: 1.5, maxSize: 3.5, basePrice: 210, color: '#16a34a' },
    { name: '돌문어', grade: '희귀', minSize: 1.3, maxSize: 3.0, basePrice: 195, color: '#16a34a' },
    { name: '꽃게', grade: '희귀', minSize: 0.5, maxSize: 1.0, basePrice: 130, color: '#16a34a' },
    { name: '대왕킹크랩', grade: '희귀', minSize: 1.3, maxSize: 3.0, basePrice: 300, color: '#16a34a' },
    { name: '대게', grade: '희귀', minSize: 1.0, maxSize: 2.3, basePrice: 250, color: '#16a34a' },
    { name: '닭새우', grade: '희귀', minSize: 0.7, maxSize: 1.5, basePrice: 220, color: '#16a34a' },
    { name: '펄딱새우', grade: '희귀', minSize: 0.5, maxSize: 1.2, basePrice: 170, color: '#16a34a' },
    { name: '바닷가재', grade: '희귀', minSize: 1.2, maxSize: 2.5, basePrice: 290, color: '#16a34a' },
    { name: '참가자미', grade: '희귀', minSize: 1.0, maxSize: 2.0, basePrice: 135, color: '#16a34a' },

    // --- 영웅 어류 (Heroic) ---
    { name: '방어', grade: '영웅', minSize: 2.0, maxSize: 4.5, basePrice: 450, color: '#2563eb' },
    { name: '참치', grade: '영웅', minSize: 2.5, maxSize: 5.5, basePrice: 750, color: '#2563eb' },
    { name: '황새치', grade: '영웅', minSize: 3.0, maxSize: 6.5, basePrice: 1100, color: '#2563eb' },
    { name: '청상아리', grade: '영웅', minSize: 3.5, maxSize: 7.5, basePrice: 1600, color: '#2563eb' },
    { name: '다금바리', grade: '영웅', minSize: 2.0, maxSize: 4.5, basePrice: 850, color: '#2563eb' },
    { name: '대왕문어', grade: '영웅', minSize: 3.0, maxSize: 7.0, basePrice: 1300, color: '#2563eb' },
    { name: '흑기흉상어', grade: '영웅', minSize: 3.5, maxSize: 7.5, basePrice: 1450, color: '#2563eb' },
    { name: '홍어', grade: '영웅', minSize: 2.5, maxSize: 5.5, basePrice: 900, color: '#2563eb' },
    { name: '부시리', grade: '영웅', minSize: 2.0, maxSize: 4.5, basePrice: 520, color: '#2563eb' },
    { name: '청새치', grade: '영웅', minSize: 3.0, maxSize: 7.0, basePrice: 1250, color: '#2563eb' },
    { name: '백새치', grade: '영웅', minSize: 3.0, maxSize: 7.0, basePrice: 1350, color: '#2563eb' },
    { name: '만새기', grade: '영웅', minSize: 2.5, maxSize: 5.0, basePrice: 600, color: '#2563eb' },
    { name: '귀상어', grade: '영웅', minSize: 4.0, maxSize: 8.5, basePrice: 1750, color: '#2563eb' },
    { name: '개복치', grade: '영웅', minSize: 3.0, maxSize: 6.5, basePrice: 950, color: '#2563eb' },
    { name: '황가자미(대형)', grade: '영웅', minSize: 2.0, maxSize: 4.5, basePrice: 550, color: '#2563eb' },
    { name: '참다랑어', grade: '영웅', minSize: 3.0, maxSize: 6.5, basePrice: 1400, color: '#2563eb' },
    { name: '눈다랑어', grade: '영웅', minSize: 2.5, maxSize: 5.5, basePrice: 1000, color: '#2563eb' },
    { name: '황다랑어', grade: '영웅', minSize: 2.5, maxSize: 5.5, basePrice: 920, color: '#2563eb' },
    { name: '점박이물범', grade: '영웅', minSize: 3.0, maxSize: 6.0, basePrice: 1650, color: '#2563eb' },
    { name: '바다거북', grade: '영웅', minSize: 2.5, maxSize: 5.0, basePrice: 1150, color: '#2563eb' },
    { name: '대왕가오리', grade: '영웅', minSize: 3.5, maxSize: 7.5, basePrice: 1500, color: '#2563eb' },
    { name: '쥐가오리', grade: '영웅', minSize: 3.5, maxSize: 8.0, basePrice: 1800, color: '#2563eb' },
    { name: '노랑가오리', grade: '영웅', minSize: 2.5, maxSize: 5.0, basePrice: 700, color: '#2563eb' },
    { name: '전기뱀장어(바다형)', grade: '영웅', minSize: 3.0, maxSize: 6.0, basePrice: 1100, color: '#2563eb' },
    { name: '큰돌고래', grade: '영웅', minSize: 4.0, maxSize: 9.0, basePrice: 1900, color: '#2563eb' },
    { name: '범고래상어(새끼)', grade: '영웅', minSize: 4.5, maxSize: 10.0, basePrice: 2200, color: '#2563eb' },

    // --- 전설 어류 (Legendary) ---
    { name: '대왕오징어', grade: '전설', minSize: 11.6, maxSize: 23.3, basePrice: 4500, color: '#9333ea' },
    { name: '심해 아귀', grade: '전설', minSize: 13.3, maxSize: 26.6, basePrice: 7000, color: '#9333ea' },
    { name: '백상아리', grade: '전설', minSize: 15.0, maxSize: 30.0, basePrice: 11000, color: '#9333ea' },
    { name: '범고래', grade: '전설', minSize: 16.6, maxSize: 33.3, basePrice: 15000, color: '#9333ea' },
    { name: '향고래', grade: '전설', minSize: 20.0, maxSize: 40.0, basePrice: 22000, color: '#9333ea' },
    { name: '실러캔스', grade: '전설', minSize: 10.0, maxSize: 21.6, basePrice: 13500, color: '#9333ea' },
    { name: '산갈치', grade: '전설', minSize: 12.0, maxSize: 25.0, basePrice: 9500, color: '#9333ea' },
    { name: '고래상어', grade: '전설', minSize: 20.0, maxSize: 45.0, basePrice: 30000, color: '#9333ea' },
    { name: '메가마우스 상어', grade: '전설', minSize: 15.0, maxSize: 28.3, basePrice: 16000, color: '#9333ea' },
    { name: '남방검치상어', grade: '전설', minSize: 16.6, maxSize: 31.6, basePrice: 18500, color: '#9333ea' },
    { name: '콜로설 칼마르', grade: '전설', minSize: 13.3, maxSize: 30.0, basePrice: 19000, color: '#9333ea' },
    { name: '심해 흡혈오징어', grade: '전설', minSize: 6.6, maxSize: 16.6, basePrice: 6500, color: '#9333ea' },
    { name: '바다악어(거대종)', grade: '전설', minSize: 18.3, maxSize: 36.6, basePrice: 24000, color: '#9333ea' },
    { name: '대왕고래(새끼)', grade: '전설', minSize: 25.0, maxSize: 50.0, basePrice: 35000, color: '#9333ea' },
    { name: '북극고래', grade: '전설', minSize: 25.0, maxSize: 55.0, basePrice: 40000, color: '#9333ea' },
    { name: '혹등고래', grade: '전설', minSize: 25.0, maxSize: 60.0, basePrice: 45000, color: '#9333ea' },
    { name: '귀신고래', grade: '전설', minSize: 25.0, maxSize: 55.0, basePrice: 42000, color: '#9333ea' },
    { name: '뱀파이어 상어', grade: '전설', minSize: 16.0, maxSize: 30.6, basePrice: 20000, color: '#9333ea' },
    { name: '환상속의 심해 거북', grade: '전설', minSize: 20.0, maxSize: 40.0, basePrice: 25000, color: '#9333ea' },
    { name: '심해 랜턴피시 킹', grade: '전설', minSize: 11.6, maxSize: 25.0, basePrice: 12500, color: '#9333ea' },

    // --- 신화 어류 (Mythical) - 10단계 이상 등장 ---
    { name: '메갈로돈', grade: '신화', minSize: 30.0, maxSize: 60.0, basePrice: 150000, color: '#ea580c' },
    { name: '크라켄', grade: '신화', minSize: 50.0, maxSize: 120.0, basePrice: 800000, color: '#dc2626' },
    { name: '레비아탄', grade: '신화', minSize: 60.0, maxSize: 150.0, basePrice: 2000000, color: '#b91c1c' },
    { name: '아스피도켈론', grade: '신화', minSize: 70.0, maxSize: 180.0, basePrice: 5000000, color: '#7f1d1d' },
    { name: '요르문간드(심해분신)', grade: '신화', minSize: 80.0, maxSize: 200.0, basePrice: 8000000, color: '#450a0a' },
    { name: '아스파스(고대 심해 군주)', grade: '신화', minSize: 75.0, maxSize: 170.0, basePrice: 6500000, color: '#581c87' },
    { name: '카이토스(원시 해수)', grade: '신화', minSize: 75.0, maxSize: 180.0, basePrice: 7500000, color: '#3b0764' },
    { name: '세계수의 심해 가디언', grade: '신화', minSize: 90.0, maxSize: 220.0, basePrice: 10000000, color: '#1e1b4b' },

    // --- 태초 어류 (Primordial) - 11단계 이상 등장 ---
    { name: '코스믹 벨루가', grade: '태초', minSize: 400.0, maxSize: 800.0, basePrice: 50000000, color: '#06b6d4' },
    { name: '초신성 아귀', grade: '태초', minSize: 500.0, maxSize: 1000.0, basePrice: 120000000, color: '#f59e0b' },
    { name: '뫼비우스 회전 가오리', grade: '태초', minSize: 700.0, maxSize: 1500.0, basePrice: 300000000, color: '#8b5cf6' },
    { name: '원시의 삼엽충', grade: '태초', minSize: 1000.0, maxSize: 2000.0, basePrice: 800000000, color: '#10b981' },
    { name: '싱귤래리티 문어', grade: '태초', minSize: 1100.0, maxSize: 2200.0, basePrice: 1500000000, color: '#ef4444' },
    { name: '황금빛 우주 붕어', grade: '태초', minSize: 1200.0, maxSize: 2500.0, basePrice: 2500000000, color: '#eab308' },
    { name: '타임리프 틸라피아', grade: '태초', minSize: 1400.0, maxSize: 2800.0, basePrice: 4000000000, color: '#3b82f6' },
    { name: '차원 균열의 주인 오메가', grade: '태초', minSize: 1500.0, maxSize: 3000.0, basePrice: 8000000000, color: '#dc2626' }
];

const MYTHICAL_BEASTS = [
    { name: '등용문 잉어', color: '#eab308', bgGradient: 'linear-gradient(135deg, #fefce8, #fef9c3)', desc: '거센 황하의 용문을 거슬러 오르면 용으로 변한다는 전설의 큰 잉어입니다.', ability: '✨ 보유 효과: 물고기를 판매할 때 등용문 잉어의 가호로 가격이 2배로 증가합니다!' },
    { name: '곤(鯤)', color: '#0284c7', bgGradient: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', desc: '북쪽 바다에 사는 수천 리 크기의 거대한 물고기입니다.', ability: '✨ 보유 효과: 물고기를 잡을 때 0.1% 확률로 거대한 새 "붕"으로 변신하며, 특수 등급(100만 원)으로 판매할 수 있습니다.' },
    { name: '인면어', color: '#be185d', bgGradient: 'linear-gradient(135deg, #fdf2f8, #fce7f3)', desc: '사람의 얼굴을 닮은 기괴한 물고기로, 야담 등에서 재앙을 예고하는 수중 생물입니다.', ability: '😈 특수 능력: 다른 플레이어에게 저주를 보내 10번의 낚시 동안 50% 확률로 쓰레기를 낚게 만듭니다.' },
    { name: '마카라', color: '#059669', bgGradient: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', desc: '코끼리나 악어의 머리에 물고기의 몸통과 꼬리를 지닌 신화 속 신성한 수수(水獸)입니다.', ability: '🌊 고유 영물 능력 (포식): 보관고에 있는 물고기를 삼켜 신화 및 태초(11단계 이상) 획득 확률을 높입니다.' },
    { name: '마츠야', color: '#d97706', bgGradient: 'linear-gradient(135deg, #fffbeb, #fef3c7)', desc: '인류를 대홍수로부터 구하기 위해 최고신이 변신한 황금빛 뿔이 달린 거대한 물고기입니다.', ability: '🛡️ 고유 영물 (구원의 자비): 인면어의 저주나 시레인 크로인의 약탈 공격으로부터 자동으로 보호막을 쳐서 모든 피해를 완벽히 차단합니다!' },
    { name: '다곤', color: '#78716c', bgGradient: 'linear-gradient(135deg, #fafaf9, #f5f5f4)', desc: '상반신은 인간, 하반신은 물고기 모양을 한 고대 블레셋인들의 풍요와 농경의 신입니다.', ability: '🤝 고유 영물 (풍요와 거래/상호 계약): 두 플레이어가 서로를 다곤 파트너로 상호 지목하여 연결되면, 어느 한쪽이 낚시할 때 물고기가 서로에게 실시간 복사됩니다!' },
    { name: '바하무트', color: '#b45309', bgGradient: 'linear-gradient(135deg, #fff7ed, #ffedd5)', desc: '전 세계의 무게를 떠받치고 있다고 전해지는, 끝을 알 수 없을 정도로 거대한 물고기입니다.', ability: '🌍 고유 영물 (대지의 지탱): 낚시 비용이 완전히 0원이 되며, 낚시터를 켜두는 동안 30초마다 자동으로 대어를 낚아 올립니다!' },
    { name: '히포캠포스', color: '#0ea5e9', bgGradient: 'linear-gradient(135deg, #f0f9ff, #bae6fd)', desc: '말의 앞몸에 물고기의 꼬리가 달린 바다의 말입니다. 바다의 신의 전차를 끄는 영물입니다.', ability: '⚡ 고유 영물 (질주): 낚싯대를 던지면 마법 나침반의 가속을 받아 빠르게 대어를 잡아옵니다!' },
    { name: '익티오켄타우로스', color: '#7c3aed', bgGradient: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', desc: '상반신은 인간, 앞다리는 말, 뒷몸은 물고기 꼬리를 가진 신비로운 바다의 신들입니다.', ability: '👁️ 고유 영물 (심해의 지혜): 물고기 크기 10% 증가 보정과 함께, 미해금 영물들의 이름과 능력을 도감에서 미리 탐색하여 볼 수 있습니다!' },
    { name: '시레인 크로인', color: '#dc2626', bgGradient: 'linear-gradient(135deg, #fef2f2, #fee2e2)', desc: '평소에는 은빛의 작은 물고기 형태를 하다가, 어부들을 유혹한 뒤 순식간에 고래마저 삼키는 영물입니다.', ability: '🔥 고유 영물 (심해의 약탈): 물고기를 잡을 때 일정 확률로 남의 최고 등급 물고기마저 훔쳐 오며, 성공할 때마다 약탈 확률이 0.5%씩 영구 누적됩니다!' }
];

const GRADE_PRIORITY = { '태초': 8, '특수': 7, '영물': 6, '신화': 5, '전설': 4, '영웅': 3, '희귀': 2, '일반': 1 };

function getFishBasePrice(fishName, size) {
    if (fishName === '붕') return 1000000;
    if (fishName === '길냥이의 물고기') return size;
    
    let baseFish = FISH_DATABASE.find(f => f.name === fishName);
    let baseUnit = baseFish ? baseFish.basePrice : 20;
    let grade = baseFish ? baseFish.grade : '일반';
    
    let multiplier = 10; 
    if (grade === '영웅') {
        multiplier = 5;  
    } else if (grade === '전설' || grade === '신화' || grade === '태초') {
        multiplier = 3;  
    }
    
    let rawPrice = Math.floor(baseUnit * size * multiplier);
    let coinBonusMultiplier = 1 + ((fishingData.silver_coin_level || 0) * 0.03);
    return Math.floor(rawPrice * coinBonusMultiplier);
}

function getObfuscatedName(name) {
    const pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789가나다라마바사아자차카타파하!@#$%^&*()_+~ㅇㄴfdDㅇ#';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i);
        hash |= 0;
    }
    let result = '';
    for (let i = 0; i < name.length; i++) {
        if (name[i] === ' ' || name[i] === '(' || name[i] === ')') {
            result += name[i];
            continue;
        }
        let charCodeIndex = Math.abs(hash + i * 37) % pool.length;
        result += pool[charCodeIndex];
    }
    return result;
}

function parseFishItem(item) {
    if (typeof item === 'object' && item !== null) {
        return { size: Number(item.size), dagon: !!item.dagon };
    }
    return { size: Number(item), dagon: false };
}

function hasInventoryFish() {
    if (!fishingData.fish_inventory) return false;
    for (let k of Object.keys(fishingData.fish_inventory)) {
        if (Array.isArray(fishingData.fish_inventory[k]) && fishingData.fish_inventory[k].length > 0) {
            return true;
        }
    }
    return false;
}

async function checkDagonMutualStatus() {
    let hasDagon = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('다곤');
    if (!hasDagon || !currentUser || !fishingData.dagon_partner) {
        fishingData.is_dagon_mutual = false;
        if (!hasDagon && fishingData.dagon_partner) {
            fishingData.dagon_partner = null;
            await saveFishingData();
        }
        return;
    }

    try {
        const { data: partnerRow } = await supabaseClient
            .from('user_fishing_data')
            .select('dagon_partner, unlocked_beasts')
            .eq('nickname', fishingData.dagon_partner)
            .maybeSingle();

        let partnerHasDagon = partnerRow && partnerRow.unlocked_beasts && partnerRow.unlocked_beasts.includes('다곤');

        if (partnerHasDagon && partnerRow.dagon_partner === currentUser) {
            fishingData.is_dagon_mutual = true;
        } else {
            fishingData.is_dagon_mutual = false;
        }
    } catch (e) {
        fishingData.is_dagon_mutual = false;
    }
}

async function initFishing() {
    if (!currentUser) return;

    let fetchedPlayers = new Set(playerList);

    try {
        const { data: usersData } = await supabaseClient.from('users').select('nickname');
        if (usersData) usersData.forEach(u => { if (u.nickname) fetchedPlayers.add(u.nickname); });

        const { data: fishingUsersData } = await supabaseClient.from('user_fishing_data').select('nickname');
        if (fishingUsersData) fishingUsersData.forEach(u => { if (u.nickname) fetchedPlayers.add(u.nickname); });
    } catch (e) {
        console.warn("플레이어 목록 로딩 중 기본값 사용:", e);
    }

    playerList = Array.from(fetchedPlayers).filter(n => n !== currentUser);

    let savedBahamut = localStorage.getItem(`bahamut_auto_${currentUser}`);
    bahamutAutoActive = savedBahamut !== null ? JSON.parse(savedBahamut) : true;

    const { data } = await supabaseClient
        .from('user_fishing_data')
        .select('*')
        .eq('nickname', currentUser)
        .maybeSingle();

    if (data) {
        let savedMoney = (data.money !== undefined && data.money >= 0) ? data.money : 1000;
        let savedRod = (data.rod_level !== undefined && data.rod_level >= 1) ? data.rod_level : 1;
        if (savedRod > 12) savedRod = 12;

        fishingData = {
            money: savedMoney,
            rod_level: savedRod,
            fish_records: data.fish_records || {},
            fish_inventory: data.fish_inventory || {},
            unlocked_beasts: data.unlocked_beasts || [],
            cursed_target: data.cursed_target !== undefined ? data.cursed_target : currentUser,
            curse_remaining_count: data.curse_remaining_count !== undefined ? data.curse_remaining_count : 0,
            makara_bonus_chance: data.makara_bonus_chance !== undefined ? data.makara_bonus_chance : 0,
            makara_primordial_bonus: data.makara_primordial_bonus !== undefined ? data.makara_primordial_bonus : 0,
            siren_streak: data.siren_streak !== undefined ? data.siren_streak : 0,
            dagon_partner: data.dagon_partner || null,
            is_dagon_mutual: false,
            trade_request: data.trade_request || null,
            silver_coins: data.silver_coins !== undefined ? data.silver_coins : 0,
            silver_coin_level: data.silver_coin_level !== undefined ? data.silver_coin_level : 0,
            compass_fragments: data.compass_fragments !== undefined ? data.compass_fragments : 0,
            compass_level: data.compass_level !== undefined ? data.compass_level : 0
        };
    } else {
        await supabaseClient.from('user_fishing_data').insert([{
            nickname: currentUser,
            money: 1000,
            rod_level: 1,
            fish_records: {},
            fish_inventory: {},
            unlocked_beasts: [],
            cursed_target: currentUser,
            curse_remaining_count: 0,
            makara_bonus_chance: 0,
            makara_primordial_bonus: 0,
            siren_streak: 0,
            dagon_partner: null,
            trade_request: null,
            silver_coins: 0,
            silver_coin_level: 0,
            compass_fragments: 0,
            compass_level: 0
        }]);
        fishingData = { money: 1000, rod_level: 1, fish_records: {}, fish_inventory: {}, unlocked_beasts: [], cursed_target: currentUser, curse_remaining_count: 0, makara_bonus_chance: 0, makara_primordial_bonus: 0, siren_streak: 0, dagon_partner: null, is_dagon_mutual: false, trade_request: null, silver_coins: 0, silver_coin_level: 0, compass_fragments: 0, compass_level: 0 };
    }

    await checkDagonMutualStatus();

    startBahamutAutoFishing();
    startTradePolling();
}

async function saveFishingData() {
    if (!currentUser) return;
    
    let cleanInventory = {};
    if (fishingData.fish_inventory) {
        for (let [k, v] of Object.entries(fishingData.fish_inventory)) {
            if (Array.isArray(v) && v.length > 0) {
                cleanInventory[k] = v;
            }
        }
    }

    const { error } = await supabaseClient.from('user_fishing_data').upsert([{
        nickname: currentUser,
        money: fishingData.money,
        rod_level: fishingData.rod_level,
        fish_records: fishingData.fish_records || {},
        fish_inventory: cleanInventory,
        unlocked_beasts: fishingData.unlocked_beasts,
        cursed_target: fishingData.cursed_target,
        curse_remaining_count: fishingData.curse_remaining_count,
        makara_bonus_chance: fishingData.makara_bonus_chance,
        makara_primordial_bonus: fishingData.makara_primordial_bonus,
        siren_streak: fishingData.siren_streak,
        dagon_partner: fishingData.dagon_partner,
        trade_request: fishingData.trade_request,
        silver_coins: fishingData.silver_coins,
        silver_coin_level: fishingData.silver_coin_level,
        compass_fragments: fishingData.compass_fragments,
        compass_level: fishingData.compass_level,
        updated_at: new Date()
    }], { onConflict: 'nickname' });

    if (error) {
        console.error("🚨 Supabase 낚시 데이터 저장 실패:", error.message);
    }
}

function startTradePolling() {
    if (tradePollingInterval) clearInterval(tradePollingInterval);
    tradePollingInterval = setInterval(async () => {
        if (!currentUser) return;

        let hasDagon = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('다곤');
        if (hasDagon) {
            let oldMutual = fishingData.is_dagon_mutual;
            await checkDagonMutualStatus();
            if (oldMutual !== fishingData.is_dagon_mutual) {
                let contentArea = document.getElementById("contentArea");
                if (contentArea) renderFishingView(contentArea);
            }
        }

        const { data: myRow } = await supabaseClient
            .from('user_fishing_data')
            .select('fish_inventory, trade_request')
            .eq('nickname', currentUser)
            .maybeSingle();

        if (myRow) {
            if (hasDagon) {
                let remoteInvStr = JSON.stringify(myRow.fish_inventory || {});
                let localInvStr = JSON.stringify(fishingData.fish_inventory || {});
                if (remoteInvStr !== localInvStr) {
                    fishingData.fish_inventory = myRow.fish_inventory || {};
                    let contentArea = document.getElementById("contentArea");
                    if (contentArea) renderFishingView(contentArea);
                    showFloatingAlert("📜 [상호 다곤 계약] 파트너와 물고기가 실시간 공유되었습니다!");
                }
            }

            if (myRow.trade_request && myRow.trade_request.target === currentUser) {
                let req = myRow.trade_request;
                if (req.status === 'waiting') {
                    let currentModal = document.getElementById('dmTradeModal');
                    if (!currentModal) {
                        openTradeModal();
                    }
                }
            }
        }

        const { data: allRows } = await supabaseClient.from('user_fishing_data').select('nickname, trade_request');
        if (allRows) {
            for (let row of allRows) {
                if (row.trade_request && row.trade_request.sender === currentUser) {
                    let req = row.trade_request;
                    if (req.status === 'completed') {
                        let tInfo = req;
                        let myGaveFish = tInfo.gotFish ? tInfo.gotFish.replace(':', ' (') + '자)' : '물고기 없음';
                        let myGaveMoney = (tInfo.gotMoney || 0).toLocaleString() + '원';
                        let myGotFish = tInfo.gaveFish ? tInfo.gaveFish.replace(':', ' (') + '자)' : '물고기 없음';
                        let myGotMoney = (tInfo.gaveMoney || 0).toLocaleString() + '원';

                        await supabaseClient.from('user_fishing_data').update({ trade_request: null }).eq('nickname', row.nickname);
                        fishingData.trade_request = null;
                        await saveFishingData();
                        await initFishing();
                        
                        let contentArea = document.getElementById("contentArea");
                        if (contentArea) renderFishingView(contentArea);

                        showTradeResultPopup(myGaveFish, myGaveMoney, myGotFish, myGotMoney);
                        return;
                    } else if (req.status === 'rejected') {
                        let target = req.target;
                        await supabaseClient.from('user_fishing_data').update({ trade_request: null }).eq('nickname', row.nickname);
                        fishingData.trade_request = null;
                        await saveFishingData();
                        
                        closeAllModals();
                        await initFishing();

                        let contentArea = document.getElementById("contentArea");
                        if (contentArea) renderFishingView(contentArea);

                        showFloatingAlert(`❌ [${target}] 님께서 직거래 제안을 거절했습니다.`);
                        return;
                    }
                }
            }
        }
    }, 2000);
}

function showTradeResultPopup(gaveFish, gaveMoney, gotFish, gotMoney) {
    closeAllModals();
    let popupHtml = `
        <div id="tradeResultModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 4000;">
            <div style="background: white; width: 90%; max-width: 380px; padding: 24px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: center; border-top: 6px solid #16a34a;">
                <h3 style="margin-top: 0; color: #16a34a; font-size: 1.2rem; font-weight: 900;">🎉 직거래 교환 완료!</h3>
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin: 14px 0; text-align: left; font-size: 0.9rem;">
                    <div style="margin-bottom: 8px; color: #dc2626; font-weight: 700;">📤 [내가 준 품목]</div>
                    <div style="color: #334155; margin-bottom: 2px;">- 물고기: <b>${gaveFish}</b></div>
                    <div style="color: #334155; margin-bottom: 12px;">- 소지금: <b>${gaveMoney}</b></div>
                    <div style="margin-bottom: 4px; color: #16a34a; font-weight: 700;">📥 [내가 받은 품목]</div>
                    <div style="color: #334155; margin-bottom: 2px;">- 물고기: <b>${gotFish}</b></div>
                    <div style="color: #334155;">- 소지금: <b>${gotMoney}</b></div>
                </div>
                <button onclick="document.getElementById('tradeResultModal').remove();" style="width: 100%; background: #16a34a; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 900; cursor: pointer;">확인</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);
}

function startBahamutAutoFishing() {
    if (autoFishingInterval) clearInterval(autoFishingInterval);
    autoFishingInterval = setInterval(async () => {
        let hasBahamut = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('바하무트');
        if (!hasBahamut || !currentUser || !bahamutAutoActive) return;

        let caught = executeCatchLogic();
        if (caught) {
            showFloatingAlert(`🌍 [바하무트] 자동으로 대어(${caught.name} ${caught.size}자)를 낚아 올렸습니다!`);
        }
    }, 30000);
}

function showFloatingAlert(text) {
    floatingAlertText = text;
    let box = document.getElementById('floatingAlertBox');
    if (box) {
        box.innerText = text;
        box.style.display = 'block';
    } else {
        let contentArea = document.getElementById("contentArea");
        if (contentArea) renderFishingView(contentArea);
    }

    setTimeout(() => { 
        if (floatingAlertText === text) {
            floatingAlertText = ""; 
            let targetBox = document.getElementById('floatingAlertBox');
            if (targetBox) targetBox.style.display = 'none';
        }
    }, 3500);
}

async function toggleBahamutAuto() {
    let currentScroll = window.scrollY;
    bahamutAutoActive = !bahamutAutoActive;
    
    localStorage.setItem(`bahamut_auto_${currentUser}`, JSON.stringify(bahamutAutoActive));

    let statusMsg = bahamutAutoActive ? "활성화 (30초마다 자동 낚시)" : "비활성화 (정지됨)";
    showFloatingAlert(`🌍 바하무트 자동 사냥: ${statusMsg}`);
    
    closeAllModals();
    showBeastDetail('바하무트');

    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

function closeAllModals() {
    let modals = document.querySelectorAll('#beastModal, #dmTradeModal, #inboxModal, #tradeRoomModal, #dagonContractModal, #curseModal, #sirenChoiceModal, #tradeResultModal, #pirateUpgradeModal');
    modals.forEach(m => m.remove());
}

function showBeastDetail(beastName) {
    closeAllModals();
    let beast = MYTHICAL_BEASTS.find(b => b.name === beastName);
    if (!beast) return;

    let isUnlocked = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes(beastName);
    let hasIchthio = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('익티오켄타우로스');

    if (!isUnlocked && !hasIchthio) {
        alert("익티오켄타우로스 영물을 해금해야 미해금 영물의 정보를 탐색할 수 있습니다!");
        return;
    }

    let extraAction = "";

    if (!isUnlocked) {
        extraAction = `
            <div style="margin-top: 14px; background: #f1f5f9; padding: 10px; border-radius: 8px; text-align: center; color: #64748b; font-size: 0.85rem; font-weight: 700;">
                👁️ 익티오켄타우로스의 시야로 탐색 중인 미해금 영물입니다.
            </div>
        `;
    } else {
        if (beastName === '인면어') {
            extraAction = `
                <div style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                    <button onclick="openCurseManager()" style="width: 100%; background: #be185d; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">😈 인면어 저주 대상 관리</button>
                </div>
            `;
        } else if (beastName === '마카라') {
            let currentBonusStr = (fishingData.makara_bonus_chance || 0).toFixed(2);
            let currentPrimordialStr = (fishingData.makara_primordial_bonus || 0).toFixed(2);
            let primordialInfo = fishingData.rod_level >= 11 ? `<div style="font-size: 0.85rem; color: #047857; font-weight: 700; margin-top: 6px;">🌌 태초 확률 부스터: +${currentPrimordialStr}% 가산 중</div>` : `<div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">🔒 태초 확률 누적 (11단계 낚싯대 해금 후 활성)</div>`;
            extraAction = `
                <div style="margin-top: 12px; background: #ecfdf5; border: 1px solid #10b981; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #047857; font-weight: 700;">🌊 마카라 포식 부스터 누적치</div>
                    <div style="font-size: 1.05rem; color: #065f46; font-weight: 900; margin-top: 2px;">신화 확률: +${currentBonusStr}%</div>
                    ${primordialInfo}
                </div>
            `;
        } else if (beastName === '다곤') {
            let partnerDisplay = fishingData.dagon_partner ? `<b style="color: #78716c;">${fishingData.dagon_partner}</b>` : `<b style="color: #dc2626;">없음 (미체결)</b>`;
            let mutualDisplay = fishingData.is_dagon_mutual ? `<span style="color: #16a34a; font-weight: 900;">(상호 연결됨 🟢)</span>` : `<span style="color: #d97706; font-weight: 700;">(상대방 수락 대기중 ⏳)</span>`;
            if (!fishingData.dagon_partner) mutualDisplay = "";

            extraAction = `
                <div style="margin-top: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #334155; margin-bottom: 8px;">📜 파트너: ${partnerDisplay} ${mutualDisplay}</div>
                    <button onclick="openTradeModal()" style="width: 100%; background: #78716c; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; margin-bottom: 8px;">💬 직거래 제안 보내기</button>
                    <button onclick="openDagonContractModal()" style="width: 100%; background: #292524; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">📜 다곤 상호 계약 관리</button>
                </div>
            `;
        } else if (beastName === '시레인 크로인') {
            let currentSirenChance = (1 + (fishingData.siren_streak * 0.5)).toFixed(1);
            extraAction = `
                <div style="margin-top: 12px; background: #fef2f2; border: 1px solid #ef4444; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #991b1b; font-weight: 700;">🔥 현재 약탈 성공 확률</div>
                    <div style="font-size: 1.1rem; color: #7f1d1d; font-weight: 900; margin-top: 2px;">${currentSirenChance}% (누적 성공 횟수: ${fishingData.siren_streak}회)</div>
                </div>
            `;
        } else if (beastName === '바하무트') {
            let btnBg = bahamutAutoActive ? '#dc2626' : '#16a34a';
            let btnText = bahamutAutoActive ? '⏹️ 바하무트 자동 사냥 끄기' : '▶️ 바하무트 자동 사냥 켜기';
            extraAction = `
                <div style="margin-top: 12px; background: #fff7ed; border: 1px solid #b45309; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #9a3412; font-weight: 700; margin-bottom: 6px;">상태: ${bahamutAutoActive ? '자동 사냥 작동 중 (30초)' : '정지됨'}</div>
                    <button onclick="toggleBahamutAuto()" style="width: 100%; background: ${btnBg}; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: 700; cursor: pointer;">${btnText}</button>
                </div>
            `;
        }
    }

    let modalHtml = `
        <div id="beastModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; width: 90%; max-width: 400px; padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: left; position: relative; border-top: 6px solid ${beast.color};">
                <h3 style="margin-top: 0; color: ${beast.color}; font-size: 1.2rem; font-weight: 900;">🏛️ 영물 상세 정보: ${beast.name}</h3>
                <p style="font-size: 0.9rem; color: #475569; line-height: 1.5; margin: 12px 0;"><b>[신화 설정]</b><br>${beast.desc}</p>
                <p style="font-size: 0.9rem; color: #1e293b; line-height: 1.5; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;"><b>[고유 능력]</b><br>${beast.ability}</p>
                ${extraAction}
                <button onclick="document.getElementById('beastModal').remove()" style="width: 100%; margin-top: 16px; background: #64748b; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">닫기</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openPirateUpgradeModal() {
    closeAllModals();
    let coinLv = fishingData.silver_coin_level || 0;
    let coinCost = (coinLv + 1) * 10;
    let coinBonusPct = coinLv * 3;

    let compLv = fishingData.compass_level || 0;
    let compCost = (compLv + 1) * 10;
    let compSec = (compLv * 0.15).toFixed(2);
    let isCompMax = compLv >= MAX_COMPASS_LEVEL;

    let coinButtonHtml = `<button onclick="upgradeSilverCoinSafe()" style="background: #d97706; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer;">강화하기</button>`;

    let compButtonHtml = isCompMax 
        ? `<button disabled style="background: #94a3b8; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: not-allowed;">MAX 레벨</button>`
        : `<button onclick="upgradeCompass()" style="background: #16a34a; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer;">강화하기</button>`;

    let modalHtml = `
        <div id="pirateUpgradeModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2500;">
            <div style="background: white; width: 95%; max-width: 420px; padding: 22px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left; border-top: 6px solid #d97706;">
                <h3 style="margin-top: 0; color: #b45309; font-size: 1.15rem; font-weight: 900; display: flex; justify-content: space-between; align-items: center;">
                    <span>🏴‍☠️ 해적의 보물 창고 (장비 강화)</span>
                    <button onclick="document.getElementById('pirateUpgradeModal').remove();" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #64748b;">✕</button>
                </h3>
                
                <!-- 은화 금고 강화 (무한 상승) -->
                <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
                    <div style="font-weight: 900; color: #92400e; font-size: 0.95rem; margin-bottom: 2px;">🪙 여덟 조각의 은화 금고 (무한 상승)</div>
                    <div style="font-size: 0.8rem; color: #78350f; margin-bottom: 6px;">효과: 물고기 판매 골드 <b>+${coinBonusPct}% 증폭</b> (현재 Lv.${coinLv})</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                        <span style="color: #b45309; font-weight: 700;">보유 은화: ${fishingData.silver_coins || 0}개 (필요: ${coinCost}개)</span>
                        ${coinButtonHtml}
                    </div>
                </div>

                <!-- 나침반 강화 (최대 Lv.24) -->
                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 12px; margin-bottom: 16px;">
                    <div style="font-weight: 900; color: #166534; font-size: 0.95rem; margin-bottom: 2px;">🧭 잭의 마법 나침반</div>
                    <div style="font-size: 0.8rem; color: #14532d; margin-bottom: 6px;">효과: 낚시 대기 시간 <b>-${compSec}초 단축</b> (현재 Lv.${compLv}/${MAX_COMPASS_LEVEL})</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                        <span style="color: #15803d; font-weight: 700;">보유 나침반: ${fishingData.compass_fragments || 0}개 ${isCompMax ? '(MAX)' : `(필요: ${compCost}개)`}</span>
                        ${compButtonHtml}
                    </div>
                </div>

                <button onclick="document.getElementById('pirateUpgradeModal').remove();" style="width: 100%; background: #64748b; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">닫기</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function upgradeSilverCoinSafe() {
    let coinLv = fishingData.silver_coin_level || 0;
    let cost = (coinLv + 1) * 10;
    if ((fishingData.silver_coins || 0) < cost) {
        alert("여덟 조각의 은화가 부족합니다! 낚시를 통해 더 획득하세요.");
        return;
    }
    fishingData.silver_coins -= cost;
    fishingData.silver_coin_level += 1;
    await saveFishingData();
    showFloatingAlert(`🪙 은화 금고 강화 완료! (현재 Lv.${fishingData.silver_coin_level})`);
    openPirateUpgradeModal();
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
}

async function upgradeCompass() {
    let compLv = fishingData.compass_level || 0;
    if (compLv >= MAX_COMPASS_LEVEL) {
        alert("마법 나침반이 이미 최고 레벨(MAX)에 도달했습니다!");
        return;
    }
    let cost = (compLv + 1) * 10;
    if ((fishingData.compass_fragments || 0) < cost) {
        alert("마법 나침반 파편이 부족합니다! 낚시를 통해 더 획득하세요.");
        return;
    }
    fishingData.compass_fragments -= cost;
    fishingData.compass_level += 1;
    await saveFishingData();
    showFloatingAlert(`🧭 마법 나침반 강화 완료! (현재 Lv.${fishingData.compass_level})`);
    openPirateUpgradeModal();
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
}

function openDagonContractModal() {
    let hasDagon = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('다곤');
    if (!hasDagon) {
        alert("다곤 영물을 보유하고 있어야 다곤 상호 계약을 관리할 수 있습니다!");
        return;
    }

    closeAllModals();

    if (!playerList || playerList.length === 0) {
        playerList = ['실험체', '박병목', '김철수', '장민준', '손승환', '이승욱', '김병수', '김태용'];
    }

    let currentPartner = fishingData.dagon_partner;
    let contentHtml = "";

    if (currentPartner) {
        let statusBadge = fishingData.is_dagon_mutual 
            ? `<div style="color: #16a34a; font-weight: 900; margin-bottom: 12px;">🟢 상호 연결됨 (물고기 상호 공유 활성)</div>` 
            : `<div style="color: #d97706; font-weight: 700; margin-bottom: 12px;">⏳ 상대방의 계약 지정을 기다리는 중...</div>`;

        contentHtml = `
            <div style="background: #f8fafc; border: 1px solid #78716c; border-radius: 10px; padding: 14px; margin-bottom: 14px; text-align: center;">
                <div style="font-size: 0.9rem; font-weight: 800; color: #292524; margin-bottom: 6px;">📜 현재 다곤 계약 대상</div>
                <div style="font-size: 1.05rem; color: #78716c; font-weight: 900; margin-bottom: 4px;">[ ${currentPartner} ]</div>
                ${statusBadge}
                <button onclick="cancelDagonContract()" style="width: 100%; background: #dc2626; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">계약 해제하기</button>
            </div>
        `;
    } else {
        let playerOptionsHtml = playerList.map(p => `<option value="${p}">${p}</option>`).join('');
        contentHtml = `
            <div style="margin-bottom: 12px;">
                <label style="font-size: 0.8rem; font-weight: 700; color: #334155;">상호 계약할 상대 플레이어 선택:</label>
                <select id="dagonTargetSelect" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 4px; font-weight: 700;">
                    ${playerOptionsHtml}
                </select>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 6px; line-height: 1.4;">
                    ※ 상대방도 나를 다곤 파트너로 지정해야 계약이 연결되어 물고기가 공유됩니다.
                </div>
            </div>
            <button onclick="submitDagonContract()" style="width: 100%; background: #78716c; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">다곤 계약 신청</button>
        `;
    }

    let modalHtml = `
        <div id="dagonContractModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2500;">
            <div style="background: white; width: 95%; max-width: 400px; padding: 22px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left; border-top: 6px solid #78716c;">
                <h3 style="margin-top: 0; color: #78716c; font-size: 1.15rem; font-weight: 900; display: flex; justify-content: space-between; align-items: center;">
                    <span>📜 다곤 상호 계약 관리 센터</span>
                    <button onclick="document.getElementById('dagonContractModal').remove();" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #64748b;">✕</button>
                </h3>
                ${contentHtml}
                <button onclick="document.getElementById('dagonContractModal').remove();" style="width: 100%; margin-top: 10px; background: #64748b; color: white; border: none; padding: 8px; border-radius: 8px; font-weight: 700; cursor: pointer;">닫기</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function submitDagonContract() {
    let select = document.getElementById('dagonTargetSelect');
    if (!select) return;
    let target = select.value;
    if (!target) return;

    fishingData.dagon_partner = target;
    await checkDagonMutualStatus();
    await saveFishingData();

    closeAllModals();
    showFloatingAlert(`📜 [${target}] 님에게 다곤 계약을 신청했습니다. (상대방도 나를 지목해야 연결됩니다)`);

    let currentScroll = window.scrollY;
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

async function cancelDagonContract() {
    fishingData.dagon_partner = null;
    fishingData.is_dagon_mutual = false;
    await saveFishingData();

    closeAllModals();
    showFloatingAlert("❌ 다곤 계약이 해제되었습니다.");

    let currentScroll = window.scrollY;
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

function openTradeModal() {
    let hasDagon = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('다곤');
    if (!hasDagon) {
        alert("다곤 영물을 보유하고 있어야 직거래를 제안할 수 있습니다!");
        return;
    }

    closeAllModals();

    if (!playerList || playerList.length === 0) {
        playerList = ['실험체', '박병목', '김철수', '장민준', '손승환', '이승욱', '김병수', '김태용'];
    }

    let contentHtml = "";
    let myInventoryOptions = `<option value="">(물고기 선택 안 함)</option>`;
    if (fishingData.fish_inventory) {
        for (let [fishName, sizes] of Object.entries(fishingData.fish_inventory)) {
            if (sizes && sizes.length > 0) {
                sizes.forEach((item) => {
                    let sz = parseFishItem(item).size;
                    let valStr = `${fishName}:${sz}`;
                    let labelName = fishName === '길냥이의 물고기' ? '길냥이의 물고기 (1회 비용)' : `${fishName} (${sz}자)`;
                    myInventoryOptions += `<option value="${valStr}">🐟 ${labelName}</option>`;
                });
            }
        }
    }
    let playerOptionsHtml = playerList.map(p => `<option value="${p}">${p}</option>`).join('');

    contentHtml = `
        <div style="margin-bottom: 12px;">
            <label style="font-size: 0.8rem; font-weight: 700; color: #334155;">거래 상대 플레이어 선택:</label>
            <select id="dmTarget" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 4px; font-weight: 700;">
                ${playerOptionsHtml}
            </select>
        </div>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <div style="margin-bottom: 8px;">
                <label style="font-size: 0.75rem; color: #475569; font-weight: 700;">보낼 물고기 선택:</label>
                <select id="dmMyFish" style="width: 100%; padding: 6px; font-size: 0.85rem; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 2px;">
                    ${myInventoryOptions}
                </select>
            </div>
            <div>
                <label style="font-size: 0.75rem; color: #475569; font-weight: 700;">보낼 소지금 (원):</label>
                <input type="number" id="dmMyMoney" value="0" min="0" max="${fishingData.money}" style="width: 100%; padding: 6px; font-size: 0.85rem; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 2px; box-sizing: border-box;">
            </div>
        </div>

        <button onclick="sendDmTradeRequest()" style="width: 100%; background: #0284c7; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">제안 전송하기</button>
    `;

    let modalHtml = `
        <div id="dmTradeModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2500;">
            <div style="background: white; width: 95%; max-width: 420px; padding: 22px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left; border-top: 6px solid #78716c;">
                <h3 style="margin-top: 0; color: #78716c; font-size: 1.15rem; font-weight: 900; display: flex; justify-content: space-between; align-items: center;">
                    <span>💬 다곤 직거래 제안 센터</span>
                    <button onclick="document.getElementById('dmTradeModal').remove();" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #64748b;">✕</button>
                </h3>
                ${contentHtml}
                <button onclick="document.getElementById('dmTradeModal').remove();" style="width: 100%; margin-top: 10px; background: #64748b; color: white; border: none; padding: 8px; border-radius: 8px; font-weight: 700; cursor: pointer;">닫기</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function sendDmTradeRequest() {
    let targetSelect = document.getElementById('dmTarget');
    let fishSelect = document.getElementById('dmMyFish');
    let moneyInput = document.getElementById('dmMyMoney');
    if (!targetSelect || !fishSelect || !moneyInput) return;

    let target = targetSelect.value;
    let fishVal = fishSelect.value;
    let moneyVal = parseInt(moneyInput.value) || 0;

    if (moneyVal > fishingData.money) {
        alert("보유 소지금보다 많은 금액을 보낼 수 없습니다!");
        return;
    }

    let tradeDataJson = { sender: currentUser, target: target, fishVal: fishVal, moneyVal: moneyVal, status: 'waiting' };
    fishingData.trade_request = tradeDataJson;
    await saveFishingData();

    await supabaseClient.from('user_fishing_data').update({ trade_request: tradeDataJson, updated_at: new Date() }).eq('nickname', target);
    closeAllModals();

    let currentScroll = window.scrollY;
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

async function cancelMyTradeRequest() {
    const { data: allRows } = await supabaseClient.from('user_fishing_data').select('nickname, trade_request');
    if (allRows) {
        allRows.forEach(async (row) => {
            if (row.trade_request && row.trade_request.sender === currentUser) {
                await supabaseClient.from('user_fishing_data').update({ trade_request: null, updated_at: new Date() }).eq('nickname', row.nickname);
            }
        });
    }
    fishingData.trade_request = null;
    await saveFishingData();
    closeAllModals();
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
}

async function rejectIncomingTrade() {
    const { data: myRow } = await supabaseClient.from('user_fishing_data').select('trade_request').eq('nickname', currentUser).maybeSingle();
    if (myRow && myRow.trade_request) {
        let senderName = myRow.trade_request.sender;
        await supabaseClient.from('user_fishing_data').update({ trade_request: { ...myRow.trade_request, status: 'rejected' }, updated_at: new Date() }).eq('nickname', senderName);
    }
    fishingData.trade_request = null;
    await saveFishingData();
    closeAllModals();
    showFloatingAlert("❌ 제안을 거절했습니다.");
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
}

async function openTradeRoom(partnerName, partnerFish, partnerMoney) {
    closeAllModals();
    const { data: partnerRow } = await supabaseClient.from('user_fishing_data').select('trade_request').eq('nickname', partnerName).maybeSingle();
    if (partnerRow && partnerRow.trade_request) {
        partnerRow.trade_request.status = 'picking';
        await supabaseClient.from('user_fishing_data').update({ trade_request: partnerRow.trade_request, updated_at: new Date() }).eq('nickname', partnerName);
    }
    const { data: myRow } = await supabaseClient.from('user_fishing_data').select('trade_request').eq('nickname', currentUser).maybeSingle();
    if (myRow && myRow.trade_request) {
        myRow.trade_request.status = 'picking';
        await supabaseClient.from('user_fishing_data').update({ trade_request: myRow.trade_request, updated_at: new Date() }).eq('nickname', currentUser);
    }

    let myInventoryOptions = `<option value="">(내 보관고 물고기 선택)</option>`;
    if (fishingData.fish_inventory) {
        for (let [fishName, sizes] of Object.entries(fishingData.fish_inventory)) {
            if (sizes && sizes.length > 0) {
                sizes.forEach((item) => {
                    let sz = parseFishItem(item).size;
                    let valStr = `${fishName}:${sz}`;
                    let labelName = fishName === '길냥이의 물고기' ? '길냥이의 물고기 (1회 비용)' : `${fishName} (${sz}자)`;
                    myInventoryOptions += `<option value="${valStr}">🐟 ${labelName}</option>`;
                });
            }
        }
    }

    let modalHtml = `
        <div id="tradeRoomModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 3000;">
            <div style="background: white; width: 95%; max-width: 420px; padding: 22px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left; border-top: 6px solid #16a34a;">
                <h3 style="margin-top: 0; color: #16a34a; font-size: 1.15rem; font-weight: 900; display: flex; justify-content: space-between; align-items: center;">
                    <span>🚪 다곤 직거래 방 (교환소)</span>
                    <button onclick="document.getElementById('tradeRoomModal').remove();" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #64748b;">✕</button>
                </h3>
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
                    <div style="font-size: 0.75rem; font-weight: 800; color: #64748b; margin-bottom: 4px; text-align: center;">📥 상대방([${partnerName}])이 제안한 품목</div>
                    <div style="background: white; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px; font-size: 0.8rem; color: #1e293b; margin-bottom: 2px; text-align: center;">🐟 물고기: <b>${partnerFish ? partnerFish.replace(':', ' (') + '자)' : '없음'}</b></div>
                    <div style="background: white; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px; font-size: 0.8rem; color: #16a34a; font-weight: 700; text-align: center;">💰 소지금: <b>${partnerMoney.toLocaleString()}원</b></div>
                </div>
                <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                    <div style="font-size: 0.8rem; font-weight: 800; color: #be185d; margin-bottom: 8px; text-align: center;">✨ 내가 교환할 품목 설정</div>
                    <div style="margin-bottom: 8px;">
                        <label style="font-size: 0.75rem; color: #475569;">줄 물고기 선택:</label>
                        <select id="roomMyFish" style="width: 100%; padding: 6px; font-size: 0.85rem; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 2px;">
                            ${myInventoryOptions}
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.75rem; color: #475569;">줄 소지금 (원):</label>
                        <input type="number" id="roomMyMoney" value="0" min="0" max="${fishingData.money}" style="width: 100%; padding: 6px; font-size: 0.85rem; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 2px; box-sizing: border-box;">
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="executeFinalRoomTrade('${partnerName}', '${partnerFish}', ${partnerMoney})" style="flex: 1; background: #16a34a; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 900; cursor: pointer;">최종 교환 승인</button>
                    <button onclick="document.getElementById('tradeRoomModal').remove();" style="flex: 1; background: #dc2626; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 700; cursor: pointer;">취소</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function executeFinalRoomTrade(partnerName, partnerFish, partnerMoney) {
    let fishSelect = document.getElementById('roomMyFish');
    let moneyInput = document.getElementById('roomMyMoney');
    if (!fishSelect || !moneyInput) return;

    let mySendFish = fishSelect.value;
    let mySendMoney = parseInt(moneyInput.value) || 0;

    if (mySendMoney > fishingData.money) {
        alert("보유 소지금보다 많은 금액을 보낼 수 없습니다!");
        return;
    }

    const { data: partnerRow } = await supabaseClient.from('user_fishing_data').select('*').eq('nickname', partnerName).maybeSingle();
    if (!partnerRow) {
        alert("상대방 데이터를 찾을 수 없습니다.");
        return;
    }

    if (partnerMoney > (partnerRow.money || 0)) {
        alert("상대방의 소지금이 부족하여 거래가 취소되었습니다.");
        return;
    }

    if (mySendFish) {
        let [fName, fSzStr] = mySendFish.split(':');
        let fSz = parseFloat(fSzStr);
        let foundIdx = -1;
        let foundItem = null;
        if (fishingData.fish_inventory[fName]) {
            for (let i = 0; i < fishingData.fish_inventory[fName].length; i++) {
                if (parseFishItem(fishingData.fish_inventory[fName][i]).size === fSz) {
                    foundIdx = i;
                    foundItem = fishingData.fish_inventory[fName][i];
                    break;
                }
            }
            if (foundIdx > -1) {
                fishingData.fish_inventory[fName].splice(foundIdx, 1);
                if (fishingData.fish_inventory[fName].length === 0) delete fishingData.fish_inventory[fName];

                if (!partnerRow.fish_inventory) partnerRow.fish_inventory = {};
                if (!partnerRow.fish_inventory[fName]) partnerRow.fish_inventory[fName] = [];
                partnerRow.fish_inventory[fName].push(foundItem);

                let baseF = FISH_DATABASE.find(f => f.name === fName);
                let recordGrade = baseF ? baseF.grade : '일반';
                if (!partnerRow.fish_records) partnerRow.fish_records = {};
                if (!partnerRow.fish_records[fName]) {
                    partnerRow.fish_records[fName] = { grade: recordGrade, maxSize: fSz };
                } else if (fSz > partnerRow.fish_records[fName].maxSize) {
                    partnerRow.fish_records[fName].maxSize = fSz;
                }
            }
        }
    }

    let pInv = partnerRow.fish_inventory || {};
    if (partnerFish) {
        let [fName, fSzStr] = partnerFish.split(':');
        let fSz = parseFloat(fSzStr);
        let foundIdx = -1;
        let foundItem = null;
        if (pInv[fName]) {
            for (let i = 0; i < pInv[fName].length; i++) {
                if (parseFishItem(pInv[fName][i]).size === fSz) {
                    foundIdx = i;
                    foundItem = pInv[fName][i];
                    break;
                }
            }
            if (foundIdx > -1) {
                pInv[fName].splice(foundIdx, 1);
                if (pInv[fName].length === 0) delete pInv[fName];

                if (!fishingData.fish_inventory[fName]) fishingData.fish_inventory[fName] = [];
                fishingData.fish_inventory[fName].push(foundItem);

                let baseF = FISH_DATABASE.find(f => f.name === fName);
                let recordGrade = baseF ? baseF.grade : '일반';
                if (!fishingData.fish_records[fName]) {
                    fishingData.fish_records[fName] = { grade: recordGrade, maxSize: fSz };
                } else if (fSz > fishingData.fish_records[fName].maxSize) {
                    fishingData.fish_records[fName].maxSize = fSz;
                }
            }
        }
    }

    fishingData.money = fishingData.money - mySendMoney + partnerMoney;
    partnerRow.money = (partnerRow.money || 0) - partnerMoney + mySendMoney;

    let completedTradeInfo = {
        status: 'completed',
        sender: partnerName,
        target: currentUser,
        gaveFish: partnerFish,
        gaveMoney: partnerMoney,
        gotFish: mySendFish,
        gotMoney: mySendMoney
    };

    await supabaseClient.from('user_fishing_data').update({
        fish_inventory: pInv,
        fish_records: partnerRow.fish_records,
        money: partnerRow.money,
        trade_request: completedTradeInfo,
        updated_at: new Date()
    }).eq('nickname', partnerName);

    fishingData.trade_request = null;
    await saveFishingData();
    closeAllModals();

    let gaveFishStr = mySendFish ? mySendFish.replace(':', ' (') + '자)' : '물고기 없음';
    let gaveMoneyStr = mySendMoney.toLocaleString() + '원';
    let gotFishStr = partnerFish ? partnerFish.replace(':', ' (') + '자)' : '물고기 없음';
    let gotMoneyStr = partnerMoney.toLocaleString() + '원';

    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    showTradeResultPopup(gaveFishStr, gaveMoneyStr, gotFishStr, gotMoneyStr);
}

async function renderFishingView(contentArea) {
    let currentRod = ROD_TIERS[fishingData.rod_level];
    let nextRod = ROD_TIERS[fishingData.rod_level + 1];

    let actionBtnHtml = "";
    let statusText = "";
    let statusColor = "#0369a1";

    let tradeStatusBanner = "";
    if (fishingData.trade_request && fishingData.trade_request.status) {
        let req = fishingData.trade_request;
        let target = req.target;
        if (req.status === 'picking') {
            tradeStatusBanner = `
                <div style="background: #fefce8; border: 2px solid #eab308; color: #854d0e; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 0.85rem; font-weight: 700; text-align: center;">
                    ✨ [직거래 진행중] 상대방(${target})이 직거래 물품을 고르는 중입니다...
                </div>
            `;
        } else if (req.status === 'waiting') {
            tradeStatusBanner = `
                <div style="background: #eff6ff; border: 2px solid #3b82f6; color: #1d4ed8; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 0.85rem; font-weight: 700; text-align: center; display: flex; justify-content: space-between; align-items: center;">
                    <span>⏳ [${target}]님의 직거래 수락을 기다리는 중...</span>
                    <button onclick="cancelMyTradeRequest()" style="background: #dc2626; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">취소</button>
                </div>
            `;
        }
    }

    let curseWarningBanner = "";
    let hasMatsuya = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마츠야');
    let isCursedOnMe = (fishingData.cursed_target === currentUser && fishingData.curse_remaining_count > 0);

    if (isCursedOnMe) {
        if (hasMatsuya) {
            curseWarningBanner = `
                <div style="background: #fefce8; border: 2px solid #eab308; color: #854d0e; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 0.85rem; font-weight: 700; text-align: center;">
                    🛡️ [마츠야의 구원 활성] 마츠야가 저주로 인한 모든 피해를 완벽히 차단 중입니다!
                </div>
            `;
        } else {
            curseWarningBanner = `
                <div style="background: #fef2f2; border: 2px solid #ef4444; color: #991b1b; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 0.85rem; font-weight: 700; text-align: center;">
                    ⚠️ 인면어의 저주를 받아 재앙이 예고되고 있습니다. (남은 저주 횟수: ${fishingData.curse_remaining_count}회)
                </div>
            `;
        }
    }

    let hasDagon = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('다곤');
    let dagonContractBanner = "";
    if (hasDagon && fishingData.dagon_partner) {
        if (fishingData.is_dagon_mutual) {
            dagonContractBanner = `
                <div style="background: #f8fafc; border: 1px solid #78716c; color: #292524; padding: 8px 12px; border-radius: 10px; margin-bottom: 12px; font-size: 0.85rem; font-weight: 700; text-align: center;">
                    📜 [ ${fishingData.dagon_partner} ] 님과 상호 다곤 계약이 유효합니다. (실시간 물고기 공유 중)
                </div>
            `;
        } else {
            dagonContractBanner = `
                <div style="background: #fffbeb; border: 1px solid #d97706; color: #92400e; padding: 8px 12px; border-radius: 10px; margin-bottom: 12px; font-size: 0.85rem; font-weight: 700; text-align: center;">
                    ⏳ [ ${fishingData.dagon_partner} ] 님에게 계약을 신청함 (상대방도 나를 지목해야 연결됩니다)
                </div>
            `;
        }
    }

    let hasBahamut = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('바하무트');
    let effectiveCost = hasBahamut ? 0 : currentRod.cost;

    let isBankrupt = (fishingData.money < effectiveCost && !hasInventoryFish() && fishingStep === 'ready');

    if (isBankrupt) {
        statusText = '소지금이 부족하여 낚시를 할 수 없습니다... 길냥이에게 물고기를 뺏어오세요!';
        statusColor = '#d97706';
        actionBtnHtml = `<button class="btn-primary" onclick="claimChance()" style="padding: 16px; font-size: 1.1rem; background: linear-gradient(135deg, #facc15, #eab308); color: #713f12; font-weight: 900;">🐱 길냥이에게 낚싯대 1회 비용 뺏기 (기회)</button>`;
    } else {
        if (fishingStep === 'ready') {
            if (hasBahamut) {
                statusText = '🌍 [바하무트의 지탱] 낚시 비용 무료 상태!';
                actionBtnHtml = `<button class="btn-primary" onclick="startCast()" style="padding: 16px; font-size: 1.1rem; background: linear-gradient(135deg, #0369a1, #0284c7, #0f172a); color: #f0f9ff; font-weight: 800; border: 1px solid #38bdf8;">🌟 바하무트의 신성한 낚싯대 던지기 (비용: 0원)</button>`;
            } else {
                statusText = '광활한 심해에서 대어를 노려보세요!';
                actionBtnHtml = `<button class="btn-primary" onclick="startCast()" style="padding: 16px; font-size: 1.1rem; background: linear-gradient(135deg, #0284c7, #0369a1);">🎣 낚싯대 던지기 (비용: ${currentRod.cost.toLocaleString()}원)</button>`;
            }
        } else if (fishingStep === 'waiting') {
            let hasHippocampus = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('히포캠포스');
            statusText = hasHippocampus ? '⚡ [히포캠포스] 나침반의 가속을 받아 대어를 낚아채는 중...' : '물고기가 미끼 주변을 서성이는 중...';
            actionBtnHtml = `<button onclick="earlyClickAlert()" style="width: 100%; padding: 16px; background: #64748b; border: none; border-radius: 12px; color: white; font-size: 1.1rem; font-weight: 700; cursor: pointer;">대어 기다리는 중... (누르면 취소)</button>`;
        } else if (fishingStep === 'bite') {
            statusText = '지금이다! 0.75초 안에 잡으세요!!';
            statusColor = '#dc2626';
            actionBtnHtml = `<button onclick="hookFish()" style="width: 100%; padding: 24px; background: linear-gradient(135deg, #ef4444, #b91c1c); border: none; border-radius: 16px; color: white; font-size: 1.6rem; font-weight: 900; cursor: pointer;">⚡ 지금이니!!! ⚡</button>`;
        }
    }

    let hasMakara = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마카라');

    let inventoryHtml = "";
    if (!fishingData.fish_inventory || Object.keys(fishingData.fish_inventory).length === 0) {
        inventoryHtml = `<p class="empty-msg" style="padding: 10px 0;">보관 중인 물고기가 없습니다. 낚시를 시작해보세요!</p>`;
    } else {
        let hasCarp = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('등용문 잉어');
        for (let [fishName, sizesArr] of Object.entries(fishingData.fish_inventory)) {
            if (!sizesArr || sizesArr.length === 0) continue;
            let baseFish = FISH_DATABASE.find(f => f.name === fishName);
            let grade = fishName === '붕' ? '특수' : (fishName === '길냥이의 물고기' ? '특수' : (baseFish ? baseFish.grade : '일반'));
            let icon = fishName === '붕' ? '🦅' : (fishName === '길냥이의 물고기' ? '🐱' : '🐟');
            let color = fishName === '붕' ? '#d946ef' : (fishName === '길냥이의 물고기' ? '#f59e0b' : (baseFish ? baseFish.color : '#64748b'));
            
            sizesArr.forEach((item, index) => {
                let parsed = parseFishItem(item);
                let size = parsed.size;
                let isDagonItem = parsed.dagon;

                let calculatedPrice = getFishBasePrice(fishName, size);
                let finalPrice = (hasCarp && fishName !== '붕' && fishName !== '길냥이의 물고기') ? calculatedPrice * 2 : calculatedPrice; 
                let carpBadge = (hasCarp && fishName !== '붕' && fishName !== '길냥이의 물고기') ? `<span style="color: #d97706; font-size: 0.7rem; font-weight: 800; background: #fef3c7; padding: 2px 5px; border-radius: 4px; margin-left: 4px; white-space: nowrap;">✨등용문 2배</span>` : ``;
                let dagonBadge = isDagonItem ? `<span style="color: #78716c; font-size: 0.7rem; font-weight: 800; background: #f5f5f4; border: 1px solid #d6d3d1; padding: 2px 5px; border-radius: 4px; margin-left: 4px; white-space: nowrap;">[다곤]</span>` : ``;
                
                let makaraFeedBtn = hasMakara ? `<button class="btn-back" onclick="feedMakara('${fishName}', ${index})" style="font-size: 0.8rem; padding: 6px 10px; background: #ecfdf5; color: #047857; font-weight: 700;">🌊 마카라 주기</button>` : ``;

                let itemDisplayName = fishName === '길냥이의 물고기' ? `길냥이의 물고기 (낚싯대 1회 비용)` : `${fishName} (${size}자)`;

                inventoryHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--border-color); border-left: 5px solid ${color}; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;">
                        <div>
                            <span style="font-weight: 700; font-size: 0.95rem;">${icon} ${itemDisplayName} <span style="font-size: 0.75rem; color: ${color}; font-weight: 800;">[${grade}]</span>${dagonBadge}${carpBadge}</span>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">판매가: <b style="color: #16a34a;">${finalPrice.toLocaleString()}원</b></div>
                        </div>
                        <div style="display: flex; gap: 6px;">
                            ${makaraFeedBtn}
                            <button class="btn-back" onclick="sellFish('${fishName}', ${index})" style="font-size: 0.8rem; padding: 6px 12px; background: #dcfce7; color: #166534;">판매</button>
                        </div>
                    </div>
                `;
            });
        }
    }

    let sortedRecords = [];
    if (fishingData.fish_records) {
        sortedRecords = Object.entries(fishingData.fish_records).sort((a, b) => {
            let pA = GRADE_PRIORITY[a[1].grade] || 0;
            let pB = GRADE_PRIORITY[b[1].grade] || 0;
            return pB - pA;
        });
    }

    let recordsHtml = "";
    if (sortedRecords.length === 0) {
        recordsHtml = `<p class="empty-msg" style="padding: 10px 0;">아직 등록된 어류 도감이 없습니다.</p>`;
    } else {
        sortedRecords.forEach(([fishName, record]) => {
            let icon = fishName === '붕' ? '🦅' : '🐟';
            let color = fishName === '붕' ? '#d946ef' : (FISH_DATABASE.find(f => f.name === fishName)?.color || '#64748b');
            recordsHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--border-color); border-left: 5px solid ${color}; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; font-size: 0.9rem;">
                    <span style="font-weight: 700; color: #1e293b;">${icon} ${fishName} <span style="color: ${color}; font-weight: 800; margin-left: 4px;">[${record.grade}]</span></span>
                    <span style="color: #475569;">역대 최고 기록: <b style="color: var(--accent);">${record.maxSize}자</b></span>
                </div>
            `;
        });
    }

    let hasIchthio = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('익티오켄타우로스');

    let beastsHtml = "";
    MYTHICAL_BEASTS.forEach(beast => {
        let isUnlocked = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes(beast.name);
        if (isUnlocked) {
            beastsHtml += `
                <div style="background: ${beast.bgGradient}; border: 2px solid ${beast.color}; border-radius: 10px; padding: 12px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 900; font-size: 1rem; color: ${beast.color};">✨ [영물 해금완료] ${beast.name}</span>
                        <button onclick="showBeastDetail('${beast.name}')" style="background: ${beast.color}; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">상세 보기</button>
                    </div>
                    <div style="font-size: 0.8rem; color: #334155; line-height: 1.4;">${beast.desc}</div>
                </div>
            `;
        } else if (hasIchthio) {
            beastsHtml += `
                <div style="background: #f1f5f9; border: 2px dashed #94a3b8; border-radius: 10px; padding: 12px; margin-bottom: 10px; opacity: 0.85;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 900; font-size: 1rem; color: #64748b;">👁️ [익티오 시야 탐색] ${beast.name} (미해금)</span>
                        <button onclick="showBeastDetail('${beast.name}')" style="background: #64748b; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">능력 미리보기</button>
                    </div>
                    <div style="font-size: 0.8rem; color: #64748b; line-height: 1.4;">${beast.desc}</div>
                </div>
            `;
        } else {
            let fakeName = getObfuscatedName(beast.name);
            beastsHtml += `
                <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 10px; opacity: 0.7;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 900; font-size: 1rem; color: #94a3b8; font-family: monospace;">🔒 ${fakeName} (잠김)</span>
                    </div>
                    <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.4;">아직 발견되지 않은 미지의 영물입니다.</div>
                </div>
            `;
        }
    });

    let makaraBoosterHtml = "";
    if (hasMakara) {
        let makaraCurrentBonus = (fishingData.makara_bonus_chance || 0).toFixed(2);
        let primordialBoosterStr = fishingData.rod_level >= 11 ? `<div style="color: #065f46; font-weight: 900; font-size: 0.95rem; margin-top: 4px;">태초 확률 부스터: +${(fishingData.makara_primordial_bonus || 0).toFixed(2)}% 가산 중</div>` : ``;
        makaraBoosterHtml = `
            <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; font-size: 0.85rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #047857; font-weight: 700;">🌊 마카라 신화 확률 부스터:</span>
                    <span style="color: #065f46; font-weight: 900; font-size: 1rem;">+${makaraCurrentBonus}% 가산 중</span>
                </div>
                ${primordialBoosterStr}
            </div>
        `;
    }

    let alertBoxDisplay = floatingAlertText ? 'block' : 'none';

    contentArea.innerHTML = `
        <div id="floatingAlertBox" style="display: ${alertBoxDisplay}; position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.95); color: white; padding: 12px 24px; border-radius: 12px; font-size: 0.95rem; font-weight: 800; z-index: 9999; border: 2px solid #38bdf8; box-shadow: 0 6px 20px rgba(0,0,0,0.3); text-align: center; pointer-events: none; max-width: 90%;">${floatingAlertText}</div>

        <div class="card">
            <div class="card-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span>🎣 인생 역전 심해 낚시터</span>
                <div style="display: flex; gap: 6px;">
                    <button class="btn-back" onclick="openPirateUpgradeModal()" style="background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; font-weight: 800;">🏴‍☠️ 해적 창고</button>
                    <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
                </div>
            </div>

            ${tradeStatusBanner}
            ${dagonContractBanner}
            ${curseWarningBanner}

            <div style="display: flex; justify-content: space-around; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; margin-bottom: 16px; text-align: center;">
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">보유 금액</div>
                    <div style="font-size: 1.2rem; font-weight: 800; color: #16a34a;">${fishingData.money.toLocaleString()}원</div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">현재 낚시대 (${fishingData.rod_level}/12단계)</div>
                    <div style="font-size: 1rem; font-weight: 700; color: var(--text-main);">${currentRod.name}</div>
                </div>
            </div>

            <!-- 해적 재화 요약 바 -->
            <div style="display: flex; justify-content: space-around; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 10px; margin-bottom: 16px; font-size: 0.85rem; text-align: center;">
                <div>
                    <span style="color: #92400e; font-weight: 700;">🪙 은화 금고 (Lv.${fishingData.silver_coin_level || 0}):</span> <b style="color: #b45309;">${fishingData.silver_coins || 0}개</b>
                </div>
                <div>
                    <span style="color: #166534; font-weight: 700;">🧭 나침반 (Lv.${fishingData.compass_level || 0}/${MAX_COMPASS_LEVEL}):</span> <b style="color: #15803d;">${fishingData.compass_fragments || 0}개</b>
                </div>
            </div>

            ${makaraBoosterHtml}

            <div style="position: relative; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 16px; min-height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div id="fishingStatusText" style="font-size: 1rem; font-weight: 700; color: ${statusColor}; margin-bottom: 14px; line-height: 1.4;">
                    ${statusText}
                </div>
                ${actionBtnHtml}
            </div>

            <div style="margin-bottom: 20px;">
                ${nextRod ? `
                <button class="btn-primary" onclick="upgradeRod()" style="width: 100%; background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 12px;">⬆️ 낚시대 업그레이드 (${nextRod.name} - ${nextRod.price.toLocaleString()}원)</button>
                ` : `<div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #7c3aed;">👑 태초의 창조주 만렙 궁극의 낚시대를 보유하고 있습니다!</div>`}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
                <h3 style="font-size: 1rem; font-weight: 700; margin: 0;">🎒 잡은 물고기 보관고 (판매 가능)</h3>
                <button onclick="sellAllFish()" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">🚨 전체 판매</button>
            </div>
            <div style="display: flex; flex-direction: column; max-height: 200px; overflow-y: auto; margin-bottom: 16px;">
                ${inventoryHtml}
            </div>

            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">📖 어류 도감</h3>
            <div style="display: flex; flex-direction: column; max-height: 180px; overflow-y: auto; margin-bottom: 16px;">
                ${recordsHtml}
            </div>

            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">🏛️ 신비의 영물 도감</h3>
            <div style="display: flex; flex-direction: column; max-height: 250px; overflow-y: auto;">
                ${beastsHtml}
            </div>
        </div>
    `;
}

async function startCast() {
    let currentScroll = window.scrollY;
    let currentRod = ROD_TIERS[fishingData.rod_level];
    let hasBahamut = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('바하무트');
    let effectiveCost = hasBahamut ? 0 : currentRod.cost;

    if (fishingData.money < effectiveCost) {
        alert("비용이 부족합니다!");
        return;
    }

    fishingData.money -= effectiveCost;
    await saveFishingData();

    let hasHippocampus = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('히포캠포스');

    if (hasHippocampus) {
        fishingStep = 'waiting';
        statusText = "⚡ [히포캠포스] 나침반의 가속을 받아 대어를 낚아채는 중...";
        let contentArea = document.getElementById("contentArea");
        if (contentArea) renderFishingView(contentArea);
        window.scrollTo(0, currentScroll);

        let reduction = (fishingData.compass_level || 0) * 150;
        let hipWait = Math.max(500, 5000 - reduction);

        setTimeout(() => {
            if (fishingStep === 'waiting') {
                let caught = executeCatchLogic();
                showFloatingAlert(`🎣 [히포캠포스] 대어 낚시 성공! 🐟 ${caught.name} (${caught.size}자)`);
                fishingStep = 'ready';
                let contentArea = document.getElementById("contentArea");
                if (contentArea) renderFishingView(contentArea);
                window.scrollTo(0, currentScroll);
            }
        }, hipWait);
    } else {
        fishingStep = 'waiting';
        let contentArea = document.getElementById("contentArea");
        if (contentArea) renderFishingView(contentArea);
        window.scrollTo(0, currentScroll);

        let reduction = (fishingData.compass_level || 0) * 150;
        let baseWait = Math.random() * 2500 + 1500;
        let waitTime = Math.max(500, baseWait - reduction);

        biteTimeout = setTimeout(() => {
            if (fishingStep !== 'waiting') return;
            fishingStep = 'bite';
            let contentArea = document.getElementById("contentArea");
            if (contentArea) renderFishingView(contentArea);
            window.scrollTo(0, currentScroll);

            biteTimer = setTimeout(() => {
                if (fishingStep === 'bite') {
                    fishingStep = 'ready';
                    showFloatingAlert("❌ 타이밍을 놓쳐 물고기가 도망쳤습니다!");
                    let contentArea = document.getElementById("contentArea");
                    if (contentArea) renderFishingView(contentArea);
                    window.scrollTo(0, currentScroll);
                }
            }, 750);

        }, waitTime);
    }
}

function earlyClickAlert() {
    if (fishingStep === 'waiting') {
        let currentScroll = window.scrollY;
        clearTimeout(biteTimeout);
        clearTimeout(biteTimer);
        fishingStep = 'ready';
        showFloatingAlert("❌ 낚싯대를 일찍 거두어 물고기가 도망쳤습니다.");
        let contentArea = document.getElementById("contentArea");
        if (contentArea) renderFishingView(contentArea);
        window.scrollTo(0, currentScroll);
    }
}

function showTrashPopup(message) {
    let oldPopup = document.getElementById('trashPopupBox');
    if (oldPopup) oldPopup.remove();

    let popupHtml = `
        <div id="trashPopupBox" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; pointer-events: none;">
            <div style="background: #1e293b; color: white; padding: 20px 28px; border-radius: 12px; font-size: 1.05rem; font-weight: 700; text-align: center; border: 2px solid #ef4444; max-width: 90%;">
                🗑️ [인면어 저주 발동]<br><span style="font-size: 0.95rem; color: #fca5a5; font-weight: 500; margin-top: 6px; display: inline-block;">${message}</span>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);
    setTimeout(() => {
        let box = document.getElementById('trashPopupBox');
        if (box) box.remove();
    }, 1500);
}

async function hookFish() {
    if (fishingStep !== 'bite') return;
    clearTimeout(biteTimer);
    let currentScroll = window.scrollY;

    let hasMatsuya = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마츠야');

    if (!hasMatsuya && fishingData.cursed_target === currentUser && fishingData.curse_remaining_count > 0) {
        fishingData.curse_remaining_count -= 1;
        if (fishingData.curse_remaining_count <= 0) fishingData.cursed_target = null;

        if (Math.random() < 0.5) {
            let trashRoll = Math.random() * 100;
            let penalty = trashRoll < 80 ? 1000 : (trashRoll < 95 ? 10000 : (trashRoll < 99.9 ? 100000 : fishingData.money));
            let trashMsg = `바다 쓰레기 및 벌금 (남은 저주: ${fishingData.curse_remaining_count}회)`;

            fishingData.money = Math.max(0, fishingData.money - penalty);
            fishingStep = 'ready';
            await saveFishingData();

            showTrashPopup(trashMsg);
            let contentArea = document.getElementById("contentArea");
            if (contentArea) renderFishingView(contentArea);
            window.scrollTo(0, currentScroll);
            return;
        }
    }

    let caught = executeCatchLogic();
    showFloatingAlert(`🎣 낚시 성공! 🐟 ${caught.name} (${caught.size}자)을(를) 낚았습니다!`);
    
    fishingStep = 'ready';
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

function executeCatchLogic() {
    let unobtainedBeasts = MYTHICAL_BEASTS.filter(b => !fishingData.unlocked_beasts.includes(b.name));
    for (let beast of unobtainedBeasts) {
        if (Math.random() * 100 < 0.05) {
            if (!fishingData.unlocked_beasts) fishingData.unlocked_beasts = [];
            fishingData.unlocked_beasts.push(beast.name);
            saveFishingData();
            showFloatingAlert(`✨🏛️ [전설의 영물 발견!] "${beast.name}"을(를) 낚아 올렸습니다!`);
            break; 
        }
    }

    let coinDropCount = Math.random() < 0.35 ? (Math.floor(Math.random() * 2) + 1) : 0;
    let compassDropCount = Math.random() < 0.35 ? (Math.floor(Math.random() * 2) + 1) : 0;
    if (coinDropCount > 0) fishingData.silver_coins = (fishingData.silver_coins || 0) + coinDropCount;
    if (compassDropCount > 0) fishingData.compass_fragments = (fishingData.compass_fragments || 0) + compassDropCount;

    let rand = Math.random() * 100;
    let rodLevel = fishingData.rod_level;
    let legendaryChance = 0.025 + (rodLevel - 1) * 1.108; 
    
    let baseMythicChance = (rodLevel >= 10) ? (0.01 * Math.pow(5, Math.min(rodLevel, 12) - 6)) : 0; 
    let hasMakara = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마카라');
    let makaraBonus = (hasMakara && rodLevel >= 10) ? (fishingData.makara_bonus_chance || 0) : 0;
    let mythicChance = baseMythicChance + makaraBonus;

    let basePrimordialChance = (rodLevel >= 11) ? 0.1 : 0;
    let makaraPrimordialBonus = (hasMakara && rodLevel >= 11) ? (fishingData.makara_primordial_bonus || 0) : 0;
    let primordialChance = basePrimordialChance + makaraPrimordialBonus;

    let heroChance = 3 + (rodLevel * 1.8); 
    let rareChance = 25 + (rodLevel * 0.5); 

    let selectedFish;
    if (rodLevel >= 11 && rand < primordialChance) {
        let pool = FISH_DATABASE.filter(f => f.grade === '태초');
        selectedFish = pool[Math.floor(Math.random() * pool.length)];
        if (hasMakara) fishingData.makara_primordial_bonus = 0;
    } else if (rodLevel >= 10 && rand < primordialChance + mythicChance) {
        let pool = FISH_DATABASE.filter(f => f.grade === '신화');
        selectedFish = pool[Math.floor(Math.random() * pool.length)];
        if (hasMakara) fishingData.makara_bonus_chance = 0;
    } else if (rand < primordialChance + mythicChance + legendaryChance) {
        let pool = FISH_DATABASE.filter(f => f.grade === '전설');
        selectedFish = pool[Math.floor(Math.random() * pool.length)];
    } else if (rand < primordialChance + mythicChance + legendaryChance + heroChance) {
        let pool = FISH_DATABASE.filter(f => f.grade === '영웅');
        selectedFish = pool[Math.floor(Math.random() * pool.length)];
    } else if (rand < primordialChance + mythicChance + legendaryChance + heroChance + rareChance) {
        let pool = FISH_DATABASE.filter(f => f.grade === '희귀');
        selectedFish = pool[Math.floor(Math.random() * pool.length)];
    } else {
        let pool = FISH_DATABASE.filter(f => f.grade === '일반');
        selectedFish = pool[Math.floor(Math.random() * pool.length)];
    }

    let sizeBonus = (rodLevel - 1) * 0.3;
    let fishSizeRaw = Math.random() * (selectedFish.maxSize - selectedFish.minSize) + selectedFish.minSize + sizeBonus;
    let fishSize = parseFloat(fishSizeRaw.toFixed(1));
    let fishName = selectedFish.name;

    if (!fishingData.fish_inventory[fishName]) fishingData.fish_inventory[fishName] = [];
    fishingData.fish_inventory[fishName].push({ size: fishSize, dagon: false });

    let recordGrade = selectedFish.grade;
    if (!fishingData.fish_records[fishName]) {
        fishingData.fish_records[fishName] = { grade: recordGrade, maxSize: fishSize };
    } else if (fishSize > fishingData.fish_records[fishName].maxSize) {
        fishingData.fish_records[fishName].maxSize = fishSize;
    }

    saveFishingData();

    let hasMyDagon = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('다곤');
    if (hasMyDagon && fishingData.dagon_partner && fishingData.is_dagon_mutual) {
        let partnerName = fishingData.dagon_partner;
        supabaseClient.from('user_fishing_data').select('*').eq('nickname', partnerName).maybeSingle().then(async ({ data: partnerRow }) => {
            if (partnerRow && partnerRow.unlocked_beasts && partnerRow.unlocked_beasts.includes('다곤') && partnerRow.dagon_partner === currentUser) {
                let pInv = partnerRow.fish_inventory || {};
                if (!pInv[fishName]) pInv[fishName] = [];
                pInv[fishName].push({ size: fishSize, dagon: true });

                let pRec = partnerRow.fish_records || {};
                if (!pRec[fishName]) {
                    pRec[fishName] = { grade: recordGrade, maxSize: fishSize };
                } else if (fishSize > pRec[fishName].maxSize) {
                    pRec[fishName].maxSize = fishSize;
                }

                await supabaseClient.from('user_fishing_data').update({
                    fish_inventory: pInv,
                    fish_records: pRec,
                    updated_at: new Date()
                }).eq('nickname', partnerName);
            }
        });
    }

    return { name: fishName, size: fishSize };
}

async function feedMakara(fishName, index) {
    let hasMakara = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마카라');
    if (!hasMakara) {
        alert("마카라 영물을 해금해야 물고기를 줄 수 있습니다!");
        return;
    }

    let currentScroll = window.scrollY;
    let sizesArr = fishingData.fish_inventory[fishName];
    if (!sizesArr || sizesArr[index] === undefined) return;

    let baseFish = FISH_DATABASE.find(f => f.name === fishName);
    let grade = baseFish ? baseFish.grade : '일반';
    
    let mythicBonusAdd = grade === '일반' ? 0.01 : (grade === '희귀' ? 0.02 : (grade === '영웅' ? 0.05 : (grade === '전설' ? 0.1 : 0.2)));
    if (!fishingData.makara_bonus_chance) fishingData.makara_bonus_chance = 0;
    fishingData.makara_bonus_chance += mythicBonusAdd;

    if (fishingData.rod_level >= 11) {
        let primordialBonusAdd = mythicBonusAdd * 0.1;
        if (!fishingData.makara_primordial_bonus) fishingData.makara_primordial_bonus = 0;
        fishingData.makara_primordial_bonus += primordialBonusAdd;
    }

    sizesArr.splice(index, 1);
    if (sizesArr.length === 0) delete fishingData.fish_inventory[fishName];

    await saveFishingData();
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

async function sellFish(fishName, index) {
    let currentScroll = window.scrollY;
    let sizesArr = fishingData.fish_inventory[fishName];
    if (!sizesArr || sizesArr[index] === undefined) return;

    let parsed = parseFishItem(sizesArr[index]);
    let targetSize = parsed.size; 
    let sellPrice = 0;
    let hasCarp = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('등용문 잉어');

    if (fishName === '붕') {
        sellPrice = 1000000;
    } else if (fishName === '길냥이의 물고기') {
        sellPrice = targetSize;
    } else {
        let calculatedBase = getFishBasePrice(fishName, targetSize);
        sellPrice = hasCarp ? calculatedBase * 2 : calculatedBase;
    }

    sizesArr.splice(index, 1);
    if (sizesArr.length === 0) delete fishingData.fish_inventory[fishName];

    fishingData.money += sellPrice;
    await saveFishingData();
    
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

async function sellAllFish() {
    let currentScroll = window.scrollY;
    let totalSell = 0;
    let hasCarp = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('등용문 잉어');

    for (let [fishName, sizesArr] of Object.entries(fishingData.fish_inventory)) {
        if (!sizesArr) continue;

        sizesArr.forEach(item => {
            let parsed = parseFishItem(item);
            if (fishName === '붕') {
                totalSell += 1000000;
            } else if (fishName === '길냥이의 물고기') {
                totalSell += parsed.size;
            } else {
                let calculatedBase = getFishBasePrice(fishName, parsed.size);
                totalSell += hasCarp ? calculatedBase * 2 : calculatedBase;
            }
        });
    }

    fishingData.fish_inventory = {};
    fishingData.money += totalSell;
    await saveFishingData();

    showFloatingAlert(`💰 모든 물고기를 일괄 판매하여 ${totalSell.toLocaleString()}원을 획득했습니다!`);
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

async function upgradeRod() {
    let currentScroll = window.scrollY;
    let nextLevel = fishingData.rod_level + 1;
    let nextRod = ROD_TIERS[nextLevel];
    if (!nextRod) return;

    if (fishingData.money < nextRod.price) {
        alert("업그레이드 비용이 부족합니다!");
        return;
    }

    fishingData.money -= nextRod.price;
    fishingData.rod_level = nextLevel;
    await saveFishingData();
    
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

async function claimChance() {
    let currentScroll = window.scrollY;
    let currentRod = ROD_TIERS[fishingData.rod_level];
    let rodCost = currentRod.cost;

    if (!fishingData.fish_inventory['길냥이의 물고기']) {
        fishingData.fish_inventory['길냥이의 물고기'] = [];
    }
    fishingData.fish_inventory['길냥이의 물고기'].push({ size: rodCost, dagon: false });

    await saveFishingData();
    showFloatingAlert(`🐱 길냥이에게 낚싯대 1회 비용(${rodCost.toLocaleString()}원)어치 물고기를 뺏어왔습니다!`);
    
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

// 🟢 전역 window 객체에 함수 바인딩
window.initFishing = initFishing;
window.renderFishingView = renderFishingView;
window.startCast = startCast;
window.hookFish = hookFish;
window.earlyClickAlert = earlyClickAlert;
window.sellFish = sellFish;
window.sellAllFish = sellAllFish;
window.feedMakara = feedMakara;
window.upgradeRod = upgradeRod;
window.claimChance = claimChance;
window.showBeastDetail = showBeastDetail;
window.openPirateUpgradeModal = openPirateUpgradeModal;
window.upgradeSilverCoinSafe = upgradeSilverCoinSafe;
window.upgradeCompass = upgradeCompass;
window.openDagonContractModal = openDagonContractModal;
window.submitDagonContract = submitDagonContract;
window.cancelDagonContract = cancelDagonContract;
window.openTradeModal = openTradeModal;
window.sendDmTradeRequest = sendDmTradeRequest;
window.cancelMyTradeRequest = cancelMyTradeRequest;
window.rejectIncomingTrade = rejectIncomingTrade;
window.openTradeRoom = openTradeRoom;
window.executeFinalRoomTrade = executeFinalRoomTrade;
window.toggleBahamutAuto = toggleBahamutAuto;