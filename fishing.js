// fishing.js - 심해 낚시터 (7대 낚시터, 170+종 생물 도감, 태초 등급, 11·12단계 조 단위 낚싯대, 은화 무한 상승 및 나침반 24레벨 만렙 적용 버전)

let fishingData = { 
    money: 1000, 
    rod_level: 1, 
    current_spot: '연못',
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
let recentCaughtFishHistory = []; // 같은 물고기 연속 중복 방지 버퍼
let currentRecordFilter = 'all'; // 어류 도감 등급 필터 상태 ('all', '일반', '희귀', '영웅', '전설', '신화', '태초', 'unobtained')
let currentSpotFilter = 'all';   // 어류 도감 서식지 필터 상태 ('all', '연못', '계곡', '저수지', '갯벌', '바다', '깊은바다', '절대자 김병수의 어항')

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

// 🗺️ 7대 고유 낚시터 테마 및 설정
const FISHING_SPOTS = {
    '연못': {
        name: '연못',
        icon: '🪷',
        desc: '평화로운 연꽃 향기 사이로 개구리와 민물고기들이 뛰노는 맑은 연못',
        bgGradient: 'linear-gradient(135deg, #064e3b, #047857, #0f766e)',
        textColor: '#ecfdf5',
        themeColor: '#10b981',
        cardBg: '#ecfdf5',
        badge: '🌿 초심자의 쉼터'
    },
    '계곡': {
        name: '계곡',
        icon: '🏞️',
        desc: '울창한 숲속 맑고 시원한 계곡물, 가재와 산천어가 서식하는 청정 구역',
        bgGradient: 'linear-gradient(135deg, #0e7490, #0891b2, #06b6d4)',
        textColor: '#ecfeff',
        themeColor: '#06b6d4',
        cardBg: '#ecfeff',
        badge: '🌊 청정 1급수'
    },
    '저수지': {
        name: '저수지',
        icon: '🌾',
        desc: '깊고 짙은 물속 거대한 메기와 가물치가 숨어있는 안개 자욱한 대형 저수지',
        bgGradient: 'linear-gradient(135deg, #1e3a8a, #1d4ed8, #2563eb)',
        textColor: '#eff6ff',
        themeColor: '#3b82f6',
        cardBg: '#eff6ff',
        badge: '🎣 대물 낚시의 성지'
    },
    '갯벌': {
        name: '갯벌',
        icon: '🦀',
        desc: '조수간만의 차로 드러나는 광활한 갯벌! 낙지, 조개, 짱뚱어의 천국',
        bgGradient: 'linear-gradient(135deg, #78350f, #92400e, #d97706)',
        textColor: '#fffbeb',
        themeColor: '#d97706',
        cardBg: '#fffbeb',
        badge: '🐚 생명의 보물창고'
    },
    '바다': {
        name: '바다',
        icon: '🌊',
        desc: '푸른 파도와 갈매기 소리, 참돔과 방어, 참치가 헤엄치는 탁 트인 연안 바다',
        bgGradient: 'linear-gradient(135deg, #0369a1, #0284c7, #38bdf8)',
        textColor: '#f0f9ff',
        themeColor: '#0284c7',
        cardBg: '#f0f9ff',
        badge: '⚓ 광활한 푸른 바다'
    },
    '깊은바다': {
        name: '깊은바다',
        icon: '🌌',
        desc: '빛조차 닿지 않는 암흑의 심해 심연! 기괴한 발광생물과 전설의 거수들이 사는 곳',
        bgGradient: 'linear-gradient(135deg, #090d16, #1e1b4b, #312e81)',
        textColor: '#faf5ff',
        themeColor: '#8b5cf6',
        cardBg: '#faf5ff',
        badge: '👁️ 심해의 심연'
    },
    '절대자 김병수의 어항': {
        name: '절대자 김병수의 어항',
        icon: '👑',
        desc: '절대자 김병수가 시공간을 초월하여 창조한 태초 생물들의 성역 (11단계 낚싯대 이상 입장 가능)',
        bgGradient: 'linear-gradient(135deg, #18002a, #3b0764, #701a75, #b45309)',
        textColor: '#fefce8',
        themeColor: '#eab308',
        cardBg: '#fefce8',
        badge: '⚛️ 태초 전용 성역',
        minRodLevel: 11
    }
};

const FISH_DATABASE = [
    // ================= [1. 🪷 연못 (Pond) 서식 생물] =================
    { name: '올챙이', grade: '일반', spots: ['연못'], minSize: 0.1, maxSize: 0.3, basePrice: 160, color: '#64748b' },
    { name: '참개구리', grade: '일반', spots: ['연못'], minSize: 0.3, maxSize: 0.7, basePrice: 220, color: '#64748b' },
    { name: '청개구리', grade: '일반', spots: ['연못'], minSize: 0.2, maxSize: 0.5, basePrice: 210, color: '#64748b' },
    { name: '송사리', grade: '일반', spots: ['연못', '계곡'], minSize: 0.2, maxSize: 0.4, basePrice: 150, color: '#64748b' },
    { name: '논우렁이', grade: '일반', spots: ['연못'], minSize: 0.2, maxSize: 0.5, basePrice: 180, color: '#64748b' },
    { name: '물자라', grade: '일반', spots: ['연못'], minSize: 0.3, maxSize: 0.6, basePrice: 190, color: '#64748b' },
    { name: '소금쟁이', grade: '일반', spots: ['연못', '계곡'], minSize: 0.2, maxSize: 0.4, basePrice: 150, color: '#64748b' },
    { name: '물방개', grade: '일반', spots: ['연못'], minSize: 0.3, maxSize: 0.6, basePrice: 230, color: '#64748b' },
    { name: '연못 피라미', grade: '일반', spots: ['연못'], minSize: 0.4, maxSize: 0.8, basePrice: 200, color: '#64748b' },
    { name: '연못 잔붕어', grade: '일반', spots: ['연못'], minSize: 0.4, maxSize: 0.9, basePrice: 220, color: '#64748b' },
    { name: '황소개구리', grade: '희귀', spots: ['연못'], minSize: 0.8, maxSize: 1.8, basePrice: 1400, color: '#16a34a' },
    { name: '비단잉어', grade: '희귀', spots: ['연못'], minSize: 1.2, maxSize: 2.5, basePrice: 1800, color: '#16a34a' },
    { name: '붉은귀거북', grade: '희귀', spots: ['연못'], minSize: 0.8, maxSize: 1.6, basePrice: 1500, color: '#16a34a' },
    { name: '연못 떡붕어', grade: '희귀', spots: ['연못'], minSize: 1.0, maxSize: 2.2, basePrice: 1400, color: '#16a34a' },
    { name: '오색 금붕어', grade: '희귀', spots: ['연못'], minSize: 0.5, maxSize: 1.2, basePrice: 1300, color: '#16a34a' },
    { name: '토종 말조개', grade: '희귀', spots: ['연못', '저수지'], minSize: 0.6, maxSize: 1.4, basePrice: 1350, color: '#16a34a' },
    { name: '황금 비단잉어', grade: '영웅', spots: ['연못'], minSize: 2.5, maxSize: 5.0, basePrice: 14000, color: '#2563eb' },
    { name: '대왕 황소개구리', grade: '영웅', spots: ['연못'], minSize: 2.0, maxSize: 4.0, basePrice: 11000, color: '#2563eb' },
    { name: '연꽃 자라', grade: '영웅', spots: ['연못'], minSize: 2.0, maxSize: 4.5, basePrice: 15000, color: '#2563eb' },
    { name: '거대 가물치(연못왕)', grade: '영웅', spots: ['연못'], minSize: 2.5, maxSize: 5.5, basePrice: 18000, color: '#2563eb' },
    { name: '천년 묵은 남생이', grade: '전설', spots: ['연못'], minSize: 8.0, maxSize: 18.0, basePrice: 180000, color: '#9333ea' },
    { name: '연못의 수호룡 이무기', grade: '전설', spots: ['연못'], minSize: 12.0, maxSize: 25.0, basePrice: 250000, color: '#9333ea' },
    { name: '옥황상제의 연꽃 백련어', grade: '신화', spots: ['연못'], minSize: 30.0, maxSize: 70.0, basePrice: 2800000, color: '#ea580c' },

    // ================= [2. 🏞️ 계곡 (Valley) 서식 생물] =================
    { name: '버들치', grade: '일반', spots: ['계곡'], minSize: 0.3, maxSize: 0.7, basePrice: 210, color: '#64748b' },
    { name: '갈겨니', grade: '일반', spots: ['계곡'], minSize: 0.4, maxSize: 0.8, basePrice: 230, color: '#64748b' },
    { name: '참다슬기', grade: '일반', spots: ['계곡'], minSize: 0.2, maxSize: 0.4, basePrice: 170, color: '#64748b' },
    { name: '돌고기', grade: '일반', spots: ['계곡'], minSize: 0.4, maxSize: 0.9, basePrice: 220, color: '#64748b' },
    { name: '쉬리', grade: '일반', spots: ['계곡'], minSize: 0.4, maxSize: 0.8, basePrice: 280, color: '#64748b' },
    { name: '참갈겨니', grade: '일반', spots: ['계곡'], minSize: 0.4, maxSize: 0.9, basePrice: 240, color: '#64748b' },
    { name: '모래무지', grade: '일반', spots: ['계곡'], minSize: 0.4, maxSize: 0.8, basePrice: 200, color: '#64748b' },
    { name: '밀어', grade: '일반', spots: ['계곡'], minSize: 0.3, maxSize: 0.6, basePrice: 190, color: '#64748b' },
    { name: '도롱뇽', grade: '일반', spots: ['계곡'], minSize: 0.3, maxSize: 0.7, basePrice: 260, color: '#64748b' },
    { name: '강도래 유충', grade: '일반', spots: ['계곡'], minSize: 0.2, maxSize: 0.5, basePrice: 160, color: '#64748b' },
    { name: '토종 참가재', grade: '희귀', spots: ['계곡'], minSize: 0.6, maxSize: 1.3, basePrice: 1600, color: '#16a34a' },
    { name: '꺽지', grade: '희귀', spots: ['계곡'], minSize: 0.8, maxSize: 1.8, basePrice: 1900, color: '#16a34a' },
    { name: '산천어', grade: '희귀', spots: ['계곡'], minSize: 1.0, maxSize: 2.2, basePrice: 2200, color: '#16a34a' },
    { name: '열목어', grade: '희귀', spots: ['계곡'], minSize: 1.2, maxSize: 2.6, basePrice: 2500, color: '#16a34a' },
    { name: '금강모치', grade: '희귀', spots: ['계곡'], minSize: 0.6, maxSize: 1.4, basePrice: 1400, color: '#16a34a' },
    { name: '민물참게', grade: '희귀', spots: ['계곡'], minSize: 0.7, maxSize: 1.5, basePrice: 1750, color: '#16a34a' },
    { name: '뚝지', grade: '희귀', spots: ['계곡'], minSize: 0.6, maxSize: 1.3, basePrice: 1500, color: '#16a34a' },
    { name: '대왕 붉은가재', grade: '영웅', spots: ['계곡'], minSize: 2.0, maxSize: 4.5, basePrice: 12000, color: '#2563eb' },
    { name: '황금 꺽지', grade: '영웅', spots: ['계곡'], minSize: 2.2, maxSize: 4.8, basePrice: 15000, color: '#2563eb' },
    { name: '산골짝 거대 도롱뇽', grade: '영웅', spots: ['계곡'], minSize: 2.5, maxSize: 5.5, basePrice: 16000, color: '#2563eb' },
    { name: '심산유곡 은어 떼', grade: '영웅', spots: ['계곡'], minSize: 2.5, maxSize: 5.0, basePrice: 14000, color: '#2563eb' },
    { name: '영험한 백색 열목어', grade: '전설', spots: ['계곡'], minSize: 10.0, maxSize: 22.0, basePrice: 200000, color: '#9333ea' },
    { name: '계곡의 지배자 괴물 쏘가리', grade: '전설', spots: ['계곡'], minSize: 12.0, maxSize: 25.0, basePrice: 260000, color: '#9333ea' },
    { name: '계곡의 정령 청룡어', grade: '신화', spots: ['계곡'], minSize: 40.0, maxSize: 90.0, basePrice: 3500000, color: '#ea580c' },

    // ================= [3. 🌾 저수지 (Reservoir) 서식 생물] =================
    { name: '큰입배스', grade: '일반', spots: ['저수지'], minSize: 0.6, maxSize: 1.3, basePrice: 270, color: '#64748b' },
    { name: '파랑볼우럭(블루길)', grade: '일반', spots: ['저수지'], minSize: 0.4, maxSize: 0.8, basePrice: 200, color: '#64748b' },
    { name: '참미꾸라지', grade: '일반', spots: ['저수지'], minSize: 0.3, maxSize: 0.7, basePrice: 190, color: '#64748b' },
    { name: '토종 참붕어', grade: '일반', spots: ['저수지'], minSize: 0.6, maxSize: 1.2, basePrice: 250, color: '#64748b' },
    { name: '저수지 잉어', grade: '일반', spots: ['저수지'], minSize: 0.8, maxSize: 1.8, basePrice: 310, color: '#64748b' },
    { name: '동자개(빠가사리)', grade: '일반', spots: ['저수지'], minSize: 0.5, maxSize: 1.1, basePrice: 280, color: '#64748b' },
    { name: '민물 메기', grade: '일반', spots: ['저수지'], minSize: 0.7, maxSize: 1.6, basePrice: 340, color: '#64748b' },
    { name: '누치', grade: '일반', spots: ['저수지'], minSize: 0.6, maxSize: 1.4, basePrice: 260, color: '#64748b' },
    { name: '살치', grade: '일반', spots: ['저수지'], minSize: 0.4, maxSize: 0.9, basePrice: 210, color: '#64748b' },
    { name: '각시납줄개', grade: '일반', spots: ['저수지'], minSize: 0.3, maxSize: 0.7, basePrice: 190, color: '#64748b' },
    { name: '황쏘가리', grade: '희귀', spots: ['저수지'], minSize: 1.2, maxSize: 2.6, basePrice: 2600, color: '#16a34a' },
    { name: '토종 가물치', grade: '희귀', spots: ['저수지'], minSize: 1.5, maxSize: 3.2, basePrice: 2400, color: '#16a34a' },
    { name: '풍천 민물장어', grade: '희귀', spots: ['저수지'], minSize: 1.5, maxSize: 3.5, basePrice: 2800, color: '#16a34a' },
    { name: '대형 월척 떡붕어', grade: '희귀', spots: ['저수지'], minSize: 1.2, maxSize: 2.4, basePrice: 1800, color: '#16a34a' },
    { name: '붉은 점박이 메기', grade: '희귀', spots: ['저수지'], minSize: 1.3, maxSize: 2.8, basePrice: 2100, color: '#16a34a' },
    { name: '저수지 자라', grade: '희귀', spots: ['저수지'], minSize: 1.0, maxSize: 2.2, basePrice: 2300, color: '#16a34a' },
    { name: '끄리', grade: '희귀', spots: ['저수지'], minSize: 0.9, maxSize: 2.0, basePrice: 1600, color: '#16a34a' },
    { name: '괴물배스(런커)', grade: '영웅', spots: ['저수지'], minSize: 2.5, maxSize: 5.5, basePrice: 15000, color: '#2563eb' },
    { name: '1미터 거대 가물치', grade: '영웅', spots: ['저수지'], minSize: 3.0, maxSize: 6.5, basePrice: 19000, color: '#2563eb' },
    { name: '백색 민물장어', grade: '영웅', spots: ['저수지'], minSize: 3.0, maxSize: 6.0, basePrice: 22000, color: '#2563eb' },
    { name: '저수지 괴물 메기', grade: '영웅', spots: ['저수지'], minSize: 3.5, maxSize: 7.0, basePrice: 20000, color: '#2563eb' },
    { name: '안개 저수지 괴담어', grade: '전설', spots: ['저수지'], minSize: 12.0, maxSize: 28.0, basePrice: 240000, color: '#9333ea' },
    { name: '백년 묵은 거대 자라왕', grade: '전설', spots: ['저수지'], minSize: 15.0, maxSize: 32.0, basePrice: 280000, color: '#9333ea' },
    { name: '안개속 거대 철갑상어', grade: '전설', spots: ['저수지'], minSize: 16.0, maxSize: 35.0, basePrice: 320000, color: '#9333ea' },
    { name: '안개 저수지의 수룡(水龍)', grade: '신화', spots: ['저수지'], minSize: 50.0, maxSize: 120.0, basePrice: 4800000, color: '#ea580c' },

    // ================= [4. 🦀 갯벌 (Mudflat) 서식 생물] =================
    { name: '짱뚱어', grade: '일반', spots: ['갯벌'], minSize: 0.4, maxSize: 0.9, basePrice: 240, color: '#64748b' },
    { name: '칠게', grade: '일반', spots: ['갯벌'], minSize: 0.3, maxSize: 0.6, basePrice: 180, color: '#64748b' },
    { name: '바지락', grade: '일반', spots: ['갯벌'], minSize: 0.2, maxSize: 0.4, basePrice: 160, color: '#64748b' },
    { name: '대나무 맛조개', grade: '일반', spots: ['갯벌'], minSize: 0.3, maxSize: 0.7, basePrice: 220, color: '#64748b' },
    { name: '바다 갯지렁이', grade: '일반', spots: ['갯벌'], minSize: 0.3, maxSize: 0.8, basePrice: 170, color: '#64748b' },
    { name: '갯가재', grade: '일반', spots: ['갯벌'], minSize: 0.4, maxSize: 0.9, basePrice: 230, color: '#64748b' },
    { name: '갯벌 문절망둑(망둥어)', grade: '일반', spots: ['갯벌'], minSize: 0.4, maxSize: 0.8, basePrice: 200, color: '#64748b' },
    { name: '동죽조개', grade: '일반', spots: ['갯벌'], minSize: 0.2, maxSize: 0.5, basePrice: 170, color: '#64748b' },
    { name: '벌교 참꼬막', grade: '일반', spots: ['갯벌'], minSize: 0.2, maxSize: 0.5, basePrice: 190, color: '#64748b' },
    { name: '갯벌 쏙', grade: '일반', spots: ['갯벌'], minSize: 0.3, maxSize: 0.7, basePrice: 210, color: '#64748b' },
    { name: '붉은발 농게', grade: '희귀', spots: ['갯벌'], minSize: 0.6, maxSize: 1.4, basePrice: 1500, color: '#16a34a' },
    { name: '갯벌 뻘낙지', grade: '희귀', spots: ['갯벌'], minSize: 1.2, maxSize: 2.8, basePrice: 2500, color: '#16a34a' },
    { name: '대형 피조개', grade: '희귀', spots: ['갯벌'], minSize: 0.6, maxSize: 1.3, basePrice: 1700, color: '#16a34a' },
    { name: '백합조개', grade: '희귀', spots: ['갯벌'], minSize: 0.6, maxSize: 1.4, basePrice: 1900, color: '#16a34a' },
    { name: '자연산 참소라', grade: '희귀', spots: ['갯벌'], minSize: 0.7, maxSize: 1.6, basePrice: 2000, color: '#16a34a' },
    { name: '박하지(돌게)', grade: '희귀', spots: ['갯벌'], minSize: 0.7, maxSize: 1.5, basePrice: 1600, color: '#16a34a' },
    { name: '가리맛조개', grade: '희귀', spots: ['갯벌'], minSize: 0.8, maxSize: 1.8, basePrice: 1800, color: '#16a34a' },
    { name: '대왕 뻘낙지', grade: '영웅', spots: ['갯벌'], minSize: 2.5, maxSize: 5.5, basePrice: 16000, color: '#2563eb' },
    { name: '황금 짱뚱어', grade: '영웅', spots: ['갯벌'], minSize: 2.0, maxSize: 4.5, basePrice: 13000, color: '#2563eb' },
    { name: '거대 뻘 붕장어', grade: '영웅', spots: ['갯벌'], minSize: 2.8, maxSize: 6.0, basePrice: 18000, color: '#2563eb' },
    { name: '칠게 군주', grade: '영웅', spots: ['갯벌'], minSize: 2.2, maxSize: 4.8, basePrice: 15000, color: '#2563eb' },
    { name: '갯벌의 지배자 대왕 갯지렁이', grade: '전설', spots: ['갯벌'], minSize: 10.0, maxSize: 25.0, basePrice: 200000, color: '#9333ea' },
    { name: '천년 묵은 대왕 참소라', grade: '전설', spots: ['갯벌'], minSize: 12.0, maxSize: 26.0, basePrice: 250000, color: '#9333ea' },
    { name: '조수간만의 군주 뻘크라켄', grade: '신화', spots: ['갯벌'], minSize: 45.0, maxSize: 110.0, basePrice: 4200000, color: '#ea580c' },

    // ================= [5. 🌊 바다 (Sea / Coast) 서식 생물] =================
    { name: '참고등어', grade: '일반', spots: ['바다'], minSize: 0.6, maxSize: 1.2, basePrice: 260, color: '#64748b' },
    { name: '전갱이', grade: '일반', spots: ['바다'], minSize: 0.5, maxSize: 1.0, basePrice: 230, color: '#64748b' },
    { name: '꽁치', grade: '일반', spots: ['바다'], minSize: 0.5, maxSize: 1.0, basePrice: 220, color: '#64748b' },
    { name: '정어리', grade: '일반', spots: ['바다'], minSize: 0.3, maxSize: 0.7, basePrice: 180, color: '#64748b' },
    { name: '살오징어', grade: '일반', spots: ['바다'], minSize: 0.6, maxSize: 1.4, basePrice: 290, color: '#64748b' },
    { name: '서해 꽃게', grade: '일반', spots: ['바다'], minSize: 0.5, maxSize: 1.1, basePrice: 300, color: '#64748b' },
    { name: '삼치', grade: '일반', spots: ['바다'], minSize: 0.8, maxSize: 1.8, basePrice: 330, color: '#64748b' },
    { name: '학꽁치', grade: '일반', spots: ['바다'], minSize: 0.5, maxSize: 1.0, basePrice: 240, color: '#64748b' },
    { name: '우럭볼락', grade: '일반', spots: ['바다'], minSize: 0.4, maxSize: 0.9, basePrice: 270, color: '#64748b' },
    { name: '멸치 떼', grade: '일반', spots: ['바다'], minSize: 0.2, maxSize: 0.5, basePrice: 160, color: '#64748b' },
    { name: '넙치(자연산 광어)', grade: '희귀', spots: ['바다'], minSize: 1.3, maxSize: 2.8, basePrice: 2200, color: '#16a34a' },
    { name: '조피볼락(우럭)', grade: '희귀', spots: ['바다'], minSize: 1.1, maxSize: 2.3, basePrice: 2000, color: '#16a34a' },
    { name: '참돔', grade: '희귀', spots: ['바다'], minSize: 1.4, maxSize: 3.0, basePrice: 2600, color: '#16a34a' },
    { name: '동해 참문어', grade: '희귀', spots: ['바다'], minSize: 1.5, maxSize: 3.2, basePrice: 2700, color: '#16a34a' },
    { name: '바다 농어', grade: '희귀', spots: ['바다'], minSize: 1.4, maxSize: 3.0, basePrice: 2100, color: '#16a34a' },
    { name: '감성돔', grade: '희귀', spots: ['바다'], minSize: 1.2, maxSize: 2.6, basePrice: 2500, color: '#16a34a' },
    { name: '갑오징어', grade: '희귀', spots: ['바다'], minSize: 0.8, maxSize: 1.8, basePrice: 2300, color: '#16a34a' },
    { name: '돌돔', grade: '희귀', spots: ['바다'], minSize: 1.2, maxSize: 2.5, basePrice: 2800, color: '#16a34a' },
    { name: '제주 은갈치', grade: '희귀', spots: ['바다'], minSize: 1.8, maxSize: 4.0, basePrice: 2400, color: '#16a34a' },
    { name: '바닷가재(로브스터)', grade: '희귀', spots: ['바다'], minSize: 1.2, maxSize: 2.6, basePrice: 2900, color: '#16a34a' },
    { name: '겨울 대방어', grade: '영웅', spots: ['바다'], minSize: 3.0, maxSize: 7.0, basePrice: 19000, color: '#2563eb' },
    { name: '태평양 참다랑어', grade: '영웅', spots: ['바다'], minSize: 3.5, maxSize: 7.5, basePrice: 26000, color: '#2563eb' },
    { name: '황새치', grade: '영웅', spots: ['바다'], minSize: 3.5, maxSize: 7.5, basePrice: 24000, color: '#2563eb' },
    { name: '청새치', grade: '영웅', spots: ['바다'], minSize: 3.2, maxSize: 7.0, basePrice: 23000, color: '#2563eb' },
    { name: '제주 다금바리', grade: '영웅', spots: ['바다'], minSize: 2.5, maxSize: 5.5, basePrice: 25000, color: '#2563eb' },
    { name: '흑기흉상어', grade: '영웅', spots: ['바다'], minSize: 3.5, maxSize: 7.5, basePrice: 22000, color: '#2563eb' },
    { name: '귀상어', grade: '영웅', spots: ['바다'], minSize: 4.0, maxSize: 8.5, basePrice: 24500, color: '#2563eb' },
    { name: '달맞이 개복치', grade: '영웅', spots: ['바다'], minSize: 3.0, maxSize: 7.0, basePrice: 20000, color: '#2563eb' },
    { name: '심해 대왕오징어', grade: '전설', spots: ['바다'], minSize: 12.0, maxSize: 26.0, basePrice: 300000, color: '#9333ea' },
    { name: '거대 백상아리', grade: '전설', spots: ['바다'], minSize: 15.0, maxSize: 32.0, basePrice: 360000, color: '#9333ea' },
    { name: '바다의 포식자 범고래', grade: '전설', spots: ['바다'], minSize: 16.0, maxSize: 35.0, basePrice: 390000, color: '#9333ea' },
    { name: '전설의 산갈치', grade: '전설', spots: ['바다'], minSize: 12.0, maxSize: 28.0, basePrice: 310000, color: '#9333ea' },
    { name: '심해 패왕 메갈로돈', grade: '신화', spots: ['바다'], minSize: 40.0, maxSize: 90.0, basePrice: 6000000, color: '#ea580c' },
    { name: '전설의 바다괴수 크라켄', grade: '신화', spots: ['바다'], minSize: 60.0, maxSize: 140.0, basePrice: 8500000, color: '#dc2626' },

    // ================= [6. 🌌 깊은바다 (Deep Sea) 서식 생물] =================
    { name: '심해 랜턴피시', grade: '일반', spots: ['깊은바다'], minSize: 0.3, maxSize: 0.7, basePrice: 250, color: '#64748b' },
    { name: '투명 유리해파리', grade: '일반', spots: ['깊은바다'], minSize: 0.4, maxSize: 0.8, basePrice: 230, color: '#64748b' },
    { name: '심해 블롭피시', grade: '일반', spots: ['깊은바다'], minSize: 0.4, maxSize: 0.9, basePrice: 290, color: '#64748b' },
    { name: '심해 바티노무스', grade: '일반', spots: ['깊은바다'], minSize: 0.4, maxSize: 0.9, basePrice: 310, color: '#64748b' },
    { name: '심해 도끼고기', grade: '일반', spots: ['깊은바다'], minSize: 0.3, maxSize: 0.6, basePrice: 240, color: '#64748b' },
    { name: '블랙 드래곤피시', grade: '일반', spots: ['깊은바다'], minSize: 0.4, maxSize: 0.9, basePrice: 280, color: '#64748b' },
    { name: '심해 꼼치', grade: '일반', spots: ['깊은바다'], minSize: 0.5, maxSize: 1.2, basePrice: 270, color: '#64748b' },
    { name: '발광 심해 말미잘', grade: '일반', spots: ['깊은바다'], minSize: 0.3, maxSize: 0.7, basePrice: 220, color: '#64748b' },
    { name: '덤보 문어', grade: '희귀', spots: ['깊은바다'], minSize: 0.8, maxSize: 1.8, basePrice: 2400, color: '#16a34a' },
    { name: '심해 아귀', grade: '희귀', spots: ['깊은바다'], minSize: 1.2, maxSize: 2.6, basePrice: 2800, color: '#16a34a' },
    { name: '고대 주름상어', grade: '희귀', spots: ['깊은바다'], minSize: 1.4, maxSize: 3.0, basePrice: 2700, color: '#16a34a' },
    { name: '세발치', grade: '희귀', spots: ['깊은바다'], minSize: 0.9, maxSize: 2.0, basePrice: 2200, color: '#16a34a' },
    { name: '펠리컨장어', grade: '희귀', spots: ['깊은바다'], minSize: 1.3, maxSize: 2.8, basePrice: 2600, color: '#16a34a' },
    { name: '심해 거미게', grade: '희귀', spots: ['깊은바다'], minSize: 1.5, maxSize: 3.5, basePrice: 2900, color: '#16a34a' },
    { name: '마귀상어(고블린 샤크)', grade: '영웅', spots: ['깊은바다'], minSize: 3.2, maxSize: 7.0, basePrice: 23000, color: '#2563eb' },
    { name: '메가마우스 상어', grade: '영웅', spots: ['깊은바다'], minSize: 3.5, maxSize: 7.5, basePrice: 25000, color: '#2563eb' },
    { name: '초거대 바티노무스 킹', grade: '영웅', spots: ['깊은바다'], minSize: 2.5, maxSize: 5.5, basePrice: 20000, color: '#2563eb' },
    { name: '심해 거대 흡혈오징어 킹', grade: '전설', spots: ['깊은바다'], minSize: 10.0, maxSize: 24.0, basePrice: 320000, color: '#9333ea' },
    { name: '고대어 실러캔스', grade: '전설', spots: ['깊은바다'], minSize: 12.0, maxSize: 26.0, basePrice: 350000, color: '#9333ea' },
    { name: '심해의 제왕 향고래', grade: '전설', spots: ['깊은바다'], minSize: 20.0, maxSize: 45.0, basePrice: 430000, color: '#9333ea' },
    { name: '고대 심해 군주 레비아탄', grade: '신화', spots: ['깊은바다'], minSize: 60.0, maxSize: 150.0, basePrice: 9000000, color: '#b91c1c' },
    { name: '심해의 신 요르문간드', grade: '신화', spots: ['깊은바다'], minSize: 80.0, maxSize: 180.0, basePrice: 13000000, color: '#450a0a' },

    // ================= [7. 👑 절대자 김병수의 어항 (Cosmic Aquarium - 오직 ⚛️ 태초 등급만 서식, 11단계 이상 전용)] =================
    { name: '코스믹 벨루가', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 400.0, maxSize: 800.0, basePrice: 50000000, color: '#06b6d4' },
    { name: '초신성 아귀', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 500.0, maxSize: 1000.0, basePrice: 120000000, color: '#f59e0b' },
    { name: '뫼비우스 회전 가오리', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 700.0, maxSize: 1500.0, basePrice: 300000000, color: '#8b5cf6' },
    { name: '원시의 삼엽충', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 1000.0, maxSize: 2000.0, basePrice: 800000000, color: '#10b981' },
    { name: '싱귤래리티 문어', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 1100.0, maxSize: 2200.0, basePrice: 1500000000, color: '#ef4444' },
    { name: '황금빛 우주 붕어', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 1200.0, maxSize: 2500.0, basePrice: 2500000000, color: '#eab308' },
    { name: '타임리프 틸라피아', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 1400.0, maxSize: 2800.0, basePrice: 4000000000, color: '#3b82f6' },
    { name: '차원 균열의 주인 오메가', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 1500.0, maxSize: 3000.0, basePrice: 8000000000, color: '#dc2626' },
    { name: '절대자 김병수의 애완 심해룡', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 1600.0, maxSize: 3200.0, basePrice: 12000000000, color: '#9333ea' },
    { name: '절대자의 코스믹 아로와나', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 1800.0, maxSize: 3500.0, basePrice: 20000000000, color: '#eab308' },
    { name: '김병수의 혼이 깃든 절대용어', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 2000.0, maxSize: 4000.0, basePrice: 35000000000, color: '#7e22ce' },
    { name: '어항의 창조신 아스피도켈론', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 2500.0, maxSize: 5000.0, basePrice: 50000000000, color: '#b91c1c' },
    { name: '초차원 네온 구피 킹', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 100.0, maxSize: 300.0, basePrice: 30000000, color: '#38bdf8' },
    { name: '양자 도약 디스커스', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 300.0, maxSize: 600.0, basePrice: 40000000, color: '#ec4899' },
    { name: '병수의 은하수 황금가재', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 500.0, maxSize: 1000.0, basePrice: 150000000, color: '#f59e0b' },
    { name: '시공간 왜곡 절대가오리', grade: '태초', spots: ['절대자 김병수의 어항'], minSize: 800.0, maxSize: 1600.0, basePrice: 500000000, color: '#a855f7' }
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

function getFishPriceDetails(fishName, size) {
    if (fishName === '붕') {
        return { rawPrice: 1000000, coinBonus: 0, coinLv: 0, coinPct: 0, subtotal: 1000000, hasCarp: false, finalPrice: 1000000 };
    }
    if (fishName === '길냥이의 물고기') {
        let p = Number(size) || 80;
        return { rawPrice: p, coinBonus: 0, coinLv: 0, coinPct: 0, subtotal: p, hasCarp: false, finalPrice: p };
    }
    
    let baseFish = FISH_DATABASE.find(f => f.name === fishName);
    let basePrice = baseFish ? baseFish.basePrice : 200;
    let minSz = baseFish ? baseFish.minSize : 0.5;
    let maxSz = baseFish ? baseFish.maxSize : 1.5;
    
    // 크기에 따른 완만하고 합리적인 가격 보정 (최소 크기 85% ~ 최대 크기 145%)
    let sizeRange = (maxSz - minSz) || 1;
    let sizeRatio = Math.max(0, Math.min(1.5, (Number(size) - minSz) / sizeRange));
    let sizeFactor = 0.85 + (sizeRatio * 0.4);
    
    let rawPrice = Math.floor(basePrice * sizeFactor);
    let coinLv = fishingData.silver_coin_level || 0;
    let coinPct = coinLv * 3;
    let coinBonus = Math.floor(rawPrice * (coinPct / 100));
    let subtotal = rawPrice + coinBonus;

    let hasCarp = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('등용문 잉어');
    let finalPrice = hasCarp ? subtotal * 2 : subtotal;

    return {
        rawPrice: rawPrice,
        coinBonus: coinBonus,
        coinLv: coinLv,
        coinPct: coinPct,
        subtotal: subtotal,
        hasCarp: hasCarp,
        finalPrice: finalPrice
    };
}

function getFishBasePrice(fishName, size) {
    return getFishPriceDetails(fishName, size).finalPrice;
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
        let sz = Number(item.size);
        let bSz = item.baseSize !== undefined ? Number(item.baseSize) : sz;
        let iBonus = item.ichthioBonus !== undefined ? Number(item.ichthioBonus) : 0;
        return { size: sz, baseSize: bSz, ichthioBonus: iBonus, dagon: !!item.dagon };
    }
    let sz = Number(item);
    return { size: sz, baseSize: sz, ichthioBonus: 0, dagon: false };
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
        let savedSpot = localStorage.getItem(`yubsa_spot_${currentUser}`) || '연못';
        if (!FISHING_SPOTS[savedSpot]) savedSpot = '연못';
        if (savedSpot === '절대자 김병수의 어항' && savedRod < 11) savedSpot = '연못';

        fishingData = {
            money: savedMoney,
            rod_level: savedRod,
            current_spot: savedSpot,
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
        fishingData = { money: 1000, rod_level: 1, current_spot: '연못', fish_records: {}, fish_inventory: {}, unlocked_beasts: [], cursed_target: currentUser, curse_remaining_count: 0, makara_bonus_chance: 0, makara_primordial_bonus: 0, siren_streak: 0, dagon_partner: null, is_dagon_mutual: false, trade_request: null, silver_coins: 0, silver_coin_level: 0, compass_fragments: 0, compass_level: 0 };
    }

    await checkDagonMutualStatus();

    startBahamutAutoFishing();
    startTradePolling();
}

async function saveFishingData() {
    if (!currentUser) return;
    
    localStorage.setItem(`yubsa_spot_${currentUser}`, fishingData.current_spot || '연못');

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

function selectFishingSpot(spotName) {
    if (!FISHING_SPOTS[spotName]) return;
    let spotConfig = FISHING_SPOTS[spotName];
    if (spotConfig.minRodLevel && fishingData.rod_level < spotConfig.minRodLevel) {
        alert(`🔒 [입장 불가] ${spotName}은(는) ${spotConfig.minRodLevel}단계 이상(차원 공허의 시공간 낚시대 이상)의 낚싯대를 보유해야만 입장할 수 있습니다!\n\n(현재 보유 낚싯대: ${fishingData.rod_level}단계)`);
        return;
    }
    let currentScroll = window.scrollY;
    fishingData.current_spot = spotName;
    saveFishingData();
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
    showFloatingAlert(`📍 [${spotConfig.icon} ${spotName}] 낚시터로 이동했습니다!`);
}

function setSpotFilter(spotKey) {
    currentSpotFilter = spotKey;
    let currentScroll = window.scrollY;
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
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
            let sizeMsg = caught.displaySize || `${caught.size}자`;
            let priceMsg = caught.displayPrice ? ` [💰 ${caught.displayPrice}]` : '';
            showFloatingAlert(`🌍 [바하무트] 자동으로 대어(${caught.name} ${sizeMsg})${priceMsg}를 낚아 올렸습니다!`);
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

function setRecordFilter(filter) {
    currentRecordFilter = filter;
    let currentScroll = window.scrollY;
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
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
                statusText = '광활한 낚시터에서 대어를 노려보세요!';
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

                let priceInfo = getFishPriceDetails(fishName, size);
                let finalPrice = priceInfo.finalPrice;

                let carpBadge = (hasCarp && fishName !== '붕' && fishName !== '길냥이의 물고기') ? `<span style="color: #d97706; font-size: 0.7rem; font-weight: 800; background: #fef3c7; padding: 2px 5px; border-radius: 4px; margin-left: 4px; white-space: nowrap;">✨등용문 2배</span>` : ``;
                let dagonBadge = isDagonItem ? `<span style="color: #78716c; font-size: 0.7rem; font-weight: 800; background: #f5f5f4; border: 1px solid #d6d3d1; padding: 2px 5px; border-radius: 4px; margin-left: 4px; white-space: nowrap;">[다곤]</span>` : ``;
                
                let makaraFeedBtn = hasMakara ? `<button class="btn-back" onclick="feedMakara('${fishName}', ${index})" style="font-size: 0.8rem; padding: 6px 10px; background: #ecfdf5; color: #047857; font-weight: 700;">🌊 마카라 주기</button>` : ``;

                // 크기 표시: 기본 + 익티오 능력 보너스 분리 표기
                let sizeDisplayHtml = "";
                if (fishName === '길냥이의 물고기') {
                    sizeDisplayHtml = `길냥이의 물고기 (낚싯대 1회 비용)`;
                } else if (fishName === '붕') {
                    sizeDisplayHtml = `붕 (999.9자)`;
                } else if (parsed.ichthioBonus > 0) {
                    sizeDisplayHtml = `${fishName} <b>${parsed.baseSize}자+${parsed.ichthioBonus}자</b> <span style="font-size: 0.75rem; color: #7c3aed; font-weight: 700;">(익티오 10% / 총 ${parsed.size}자)</span>`;
                } else {
                    sizeDisplayHtml = `${fishName} (${size}자)`;
                }

                // 금액 표시: 기본 + 은화 보너스 분리 표기
                let priceDisplayHtml = "";
                if (fishName === '붕') {
                    priceDisplayHtml = `판매가: <b style="color: #d946ef;">1,000,000원</b>`;
                } else if (fishName === '길냥이의 물고기') {
                    priceDisplayHtml = `판매가: <b style="color: #16a34a;">${finalPrice.toLocaleString()}원</b>`;
                } else {
                    let coinBonusStr = priceInfo.coinBonus > 0 
                        ? `<span style="color: #d97706; font-size: 0.75rem; font-weight: 700;"> + ${priceInfo.coinBonus.toLocaleString()}원(은화 Lv.${priceInfo.coinLv} +${priceInfo.coinPct}%)</span>` 
                        : ``;
                    let totalStr = (priceInfo.coinBonus > 0 || priceInfo.hasCarp)
                        ? ` = <b style="color: #16a34a; font-size: 0.85rem;">${finalPrice.toLocaleString()}원</b>`
                        : ` <b style="color: #16a34a;">${finalPrice.toLocaleString()}원</b>`;
                    priceDisplayHtml = `판매가: <b style="color: #334155;">${priceInfo.rawPrice.toLocaleString()}원</b>${coinBonusStr}${totalStr}`;
                }

                inventoryHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--border-color); border-left: 5px solid ${color}; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;">
                        <div>
                            <span style="font-weight: 700; font-size: 0.95rem;">${icon} ${sizeDisplayHtml} <span style="font-size: 0.75rem; color: ${color}; font-weight: 800;">[${grade}]</span>${dagonBadge}${carpBadge}</span>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${priceDisplayHtml}</div>
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

    // --- 📖 어류 도감 완성도 계산 및 렌더링 ---
    let totalFishCount = FISH_DATABASE.length; // 177종
    let discoveredNames = Object.keys(fishingData.fish_records || {}).filter(k => k !== '길냥이의 물고기' && k !== '붕');
    let totalDiscoveredCount = discoveredNames.length;
    let overallProgressPct = ((totalDiscoveredCount / totalFishCount) * 100).toFixed(1);

    const gradesList = ['일반', '희귀', '영웅', '전설', '신화', '태초'];
    const gradeColors = {
        '일반': '#64748b',
        '희귀': '#16a34a',
        '영웅': '#2563eb',
        '전설': '#9333ea',
        '신화': '#ea580c',
        '태초': '#06b6d4'
    };

    let gradeStats = {};
    gradesList.forEach(g => {
        let totalInGrade = FISH_DATABASE.filter(f => f.grade === g).length;
        let discInGrade = FISH_DATABASE.filter(f => f.grade === g && fishingData.fish_records && fishingData.fish_records[f.name]).length;
        let pct = totalInGrade > 0 ? ((discInGrade / totalInGrade) * 100).toFixed(0) : 0;
        gradeStats[g] = { total: totalInGrade, count: discInGrade, pct: pct };
    });

    let gradeBadgesHtml = gradesList.map(g => {
        let stat = gradeStats[g];
        let color = gradeColors[g];
        let isSelected = currentRecordFilter === g;
        let activeBorder = isSelected ? `border: 2px solid ${color}; background: white; box-shadow: 0 2px 6px rgba(0,0,0,0.08);` : `border: 1px solid #cbd5e1; opacity: 0.9;`;
        return `
            <button onclick="setRecordFilter('${g}')" style="background: #f8fafc; ${activeBorder} border-radius: 8px; padding: 6px 4px; cursor: pointer; text-align: center; flex: 1; min-width: 58px;">
                <div style="font-size: 0.7rem; color: ${color}; font-weight: 800;">${g}</div>
                <div style="font-size: 0.8rem; font-weight: 800; color: #1e293b; margin-top: 1px;">${stat.count}/${stat.total}</div>
                <div style="font-size: 0.65rem; color: #64748b;">${stat.pct}%</div>
            </button>
        `;
    }).join('');

    let filterChipsHtml = `
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 8px;">
            <button onclick="setRecordFilter('all')" style="padding: 5px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.75rem; font-weight: 700; cursor: pointer; background: ${currentRecordFilter === 'all' ? '#0284c7; color: white;' : '#f8fafc; color: #334155;'}">전체 등급</button>
            <button onclick="setRecordFilter('unobtained')" style="padding: 5px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.75rem; font-weight: 700; cursor: pointer; background: ${currentRecordFilter === 'unobtained' ? '#e11d48; color: white;' : '#f8fafc; color: #334155;'}">미발견 어류만</button>
        </div>
    `;

    let spotFilterChipsHtml = `
        <div style="display: flex; gap: 4px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 10px;">
            <button onclick="setSpotFilter('all')" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.72rem; font-weight: 800; cursor: pointer; flex-shrink: 0; background: ${currentSpotFilter === 'all' ? '#0f172a; color: white;' : '#f8fafc; color: #334155;'}">🌐 전체 서식지</button>
            ${Object.keys(FISHING_SPOTS).map(sK => {
                let s = FISHING_SPOTS[sK];
                let isS = currentSpotFilter === sK;
                return `<button onclick="setSpotFilter('${sK}')" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.72rem; font-weight: 800; cursor: pointer; flex-shrink: 0; background: ${isS ? `${s.themeColor}; color: white;` : '#f8fafc; color: #334155;'}">${s.icon} ${s.name}</button>`;
            }).join('')}
        </div>
    `;

    // 어류 도감 필터링 (등급 + 서식지 교차 필터)
    let filteredFishList = FISH_DATABASE;
    if (currentRecordFilter === 'unobtained') {
        filteredFishList = filteredFishList.filter(f => !fishingData.fish_records || !fishingData.fish_records[f.name]);
    } else if (currentRecordFilter !== 'all') {
        filteredFishList = filteredFishList.filter(f => f.grade === currentRecordFilter);
    }

    if (currentSpotFilter !== 'all') {
        filteredFishList = filteredFishList.filter(f => f.spots && f.spots.includes(currentSpotFilter));
    }

    let recordsListHtml = "";
    if (filteredFishList.length === 0) {
        recordsListHtml = `<p class="empty-msg" style="padding: 10px 0;">해당 조건의 어류가 없습니다.</p>`;
    } else {
        filteredFishList.forEach(fish => {
            let record = fishingData.fish_records ? fishingData.fish_records[fish.name] : null;
            let isDiscovered = !!record;
            let color = fish.color || '#64748b';
            let spotBadges = (fish.spots || []).map(sp => {
                let spInfo = FISHING_SPOTS[sp];
                return spInfo ? `${spInfo.icon}${sp}` : sp;
            }).join(', ');

            if (isDiscovered) {
                let maxSz = record.maxSize;
                let bSz = record.baseSize !== undefined ? record.baseSize : maxSz;
                let iBonus = record.ichthioBonus !== undefined ? record.ichthioBonus : 0;
                let sizeDetailStr = iBonus > 0 
                    ? `<b style="color: var(--accent);">${maxSz}자</b> <span style="font-size: 0.7rem; color: #7c3aed; font-weight: 700;">(${bSz}자+${iBonus}자)</span>` 
                    : `<b style="color: var(--accent);">${maxSz}자</b>`;

                recordsListHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; border: 1px solid var(--border-color); border-left: 5px solid ${color}; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; font-size: 0.88rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                        <div>
                            <span style="font-weight: 800; color: #1e293b;">🐟 ${fish.name} <span style="color: ${color}; font-weight: 800; font-size: 0.75rem; margin-left: 4px; background: #f1f5f9; padding: 2px 5px; border-radius: 4px;">[${fish.grade}]</span></span>
                            <div style="font-size: 0.73rem; color: #64748b; margin-top: 3px;">서식지: <b>${spotBadges}</b> · 기본가: ${fish.basePrice.toLocaleString()}원</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.75rem; color: #475569;">최고 기록: ${sizeDetailStr}</div>
                            <span style="display: inline-block; margin-top: 2px; font-size: 0.65rem; color: #16a34a; font-weight: 800; background: #dcfce7; padding: 1px 5px; border-radius: 4px;">✓ 발견 완료</span>
                        </div>
                    </div>
                `;
            } else {
                recordsListHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-left: 5px solid #94a3b8; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; font-size: 0.88rem; opacity: 0.75;">
                        <div>
                            <span style="font-weight: 700; color: #64748b;">❓ ??? (미지의 어류) <span style="color: ${color}; font-weight: 800; font-size: 0.75rem; margin-left: 4px; background: #f1f5f9; padding: 2px 5px; border-radius: 4px;">[${fish.grade}]</span></span>
                            <div style="font-size: 0.73rem; color: #94a3b8; margin-top: 3px;">서식지: ${spotBadges} · 예상 크기: ${fish.minSize} ~ ${fish.maxSize}자</div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">🔒 미발견</span>
                        </div>
                    </div>
                `;
            }
        });
    }

    // 특수 신수 '붕' 기록이 있는 경우 도감 상단에 노출
    if (fishingData.fish_records && fishingData.fish_records['붕'] && (currentRecordFilter === 'all' || currentRecordFilter === '신화' || currentRecordFilter === '태초')) {
        let bRec = fishingData.fish_records['붕'];
        recordsListHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #fdf4ff; border: 1px solid #f0abfc; border-left: 5px solid #d946ef; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; font-size: 0.88rem;">
                <div>
                    <span style="font-weight: 800; color: #86198f;">🦅 붕 <span style="color: #d946ef; font-weight: 800; font-size: 0.75rem; margin-left: 4px; background: #fae8ff; padding: 2px 5px; border-radius: 4px;">[특수 영물 변신]</span></span>
                    <div style="font-size: 0.75rem; color: #a21caf; margin-top: 3px;">곤(鯤)의 변신 신수 · 판매가: 1,000,000원</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.75rem; color: #86198f;">최고 기록: <b style="color: #c026d3;">${bRec.maxSize}자</b></div>
                    <span style="font-size: 0.65rem; color: #86198f; font-weight: 800; background: #f5d0fe; padding: 1px 5px; border-radius: 4px;">✨ 전설의 신수</span>
                </div>
            </div>
        ` + recordsListHtml;
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

    // 현재 낚시터 정보 및 낚시터 선택 카드 목록
    let currentSpotKey = fishingData.current_spot || '연못';
    let currentSpot = FISHING_SPOTS[currentSpotKey] || FISHING_SPOTS['연못'];

    let spotsCardsHtml = Object.keys(FISHING_SPOTS).map(sKey => {
        let s = FISHING_SPOTS[sKey];
        let isCurrent = (sKey === currentSpotKey);
        let isLocked = s.minRodLevel && (fishingData.rod_level < s.minRodLevel);

        let activeBorder = isCurrent 
            ? `border: 2px solid #38bdf8; background: ${s.bgGradient}; color: white; transform: scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.25);` 
            : isLocked
            ? `border: 1px dashed #eab308; background: #fffbeb; color: #78350f; opacity: 0.85;`
            : `border: 1px solid #cbd5e1; background: #ffffff; color: #1e293b; opacity: 0.88;`;

        let badgeStyle = isCurrent 
            ? `background: rgba(255,255,255,0.25); color: #fff; font-weight: 800;` 
            : isLocked
            ? `background: #fef08a; color: #854d0e; font-weight: 800;`
            : `background: #f1f5f9; color: #64748b; font-weight: 700;`;

        let iconDisplay = isLocked ? `🔒 ${s.icon}` : s.icon;
        let badgeDisplay = isCurrent ? '📍 현재 낚시터' : (isLocked ? '🔒 11단계 필요' : s.badge);

        return `
            <div onclick="selectFishingSpot('${sKey}')" style="flex: 0 0 auto; width: 140px; padding: 10px 8px; border-radius: 12px; cursor: pointer; text-align: center; transition: all 0.2s; ${activeBorder}">
                <div style="font-size: 1.5rem; margin-bottom: 2px;">${iconDisplay}</div>
                <div style="font-weight: 900; font-size: 0.82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name}</div>
                <div style="font-size: 0.65rem; padding: 2px 4px; border-radius: 4px; margin-top: 4px; ${badgeStyle}">${badgeDisplay}</div>
            </div>
        `;
    }).join('');

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

            <!-- 🗺️ 7대 낚시터 이동 선택 바 -->
            <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.9rem; font-weight: 900; color: #1e293b;">🗺️ 낚시터 이동 (현재: ${currentSpot.icon} ${currentSpot.name})</span>
                    <span style="font-size: 0.72rem; color: #64748b;">원하는 낚시터를 터치하여 이동</span>
                </div>
                <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;">
                    ${spotsCardsHtml}
                </div>
            </div>

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

            <!-- 🎣 낚시터 테마별 메인 낚시 공간 -->
            <div style="position: relative; background: ${currentSpot.bgGradient}; border: 2px solid ${currentSpot.themeColor}; border-radius: 14px; padding: 22px; text-align: center; margin-bottom: 16px; min-height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; box-shadow: 0 8px 24px rgba(0,0,0,0.18);">
                <div style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.35); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.2);">
                    <span>${currentSpot.icon} ${currentSpot.name}</span>
                    <span style="opacity: 0.7;">|</span>
                    <span style="opacity: 0.95;">${currentSpot.desc}</span>
                </div>
                <div id="fishingStatusText" style="font-size: 1.05rem; font-weight: 800; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.6); margin-bottom: 14px; line-height: 1.4;">
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
            <div style="display: flex; flex-direction: column; max-height: 220px; overflow-y: auto; margin-bottom: 16px;">
                ${inventoryHtml}
            </div>

            <!-- 📖 어류 도감 완성도 섹션 -->
            <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 1rem; font-weight: 900; color: #0f172a;">📖 어류 도감 완성도</span>
                    <span style="font-size: 0.95rem; font-weight: 900; color: #0284c7;">${totalDiscoveredCount} / ${totalFishCount} 종 (${overallProgressPct}%)</span>
                </div>
                
                <!-- 프로그레스 바 -->
                <div style="width: 100%; height: 12px; background: #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 12px;">
                    <div style="width: ${overallProgressPct}%; height: 100%; background: linear-gradient(90deg, #0284c7, #10b981); transition: width 0.4s ease; border-radius: 10px;"></div>
                </div>

                <!-- 등급별 발견 현황 칩 -->
                <div style="display: flex; gap: 4px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 8px;">
                    ${gradeBadgesHtml}
                </div>

                <!-- 등급 필터 버튼 -->
                ${filterChipsHtml}

                <!-- 서식지 필터 버튼 -->
                ${spotFilterChipsHtml}

                <!-- 도감 어류 목록 -->
                <div style="display: flex; flex-direction: column; max-height: 250px; overflow-y: auto; padding-right: 2px;">
                    ${recordsListHtml}
                </div>
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
                let sizeMsg = caught.displaySize || `${caught.size}자`;
                let priceMsg = caught.displayPrice ? ` [💰 ${caught.displayPrice}]` : '';
                showFloatingAlert(`🎣 [히포캠포스] 대어 낚시 성공! 🐟 ${caught.name} (${sizeMsg})${priceMsg}`);
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
    let sizeMsg = caught.displaySize || `${caught.size}자`;
    let priceMsg = caught.displayPrice ? ` [💰 ${caught.displayPrice}]` : '';
    showFloatingAlert(`🎣 낚시 성공! 🐟 ${caught.name} (${sizeMsg})${priceMsg}`);
    
    fishingStep = 'ready';
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

// 🎣 같은 어종 연속 중복 완화 및 균등 등장 선택 함수
function selectFishFromPool(pool) {
    if (!pool || pool.length === 0) return FISH_DATABASE[0];
    if (pool.length <= 2) {
        return pool[Math.floor(Math.random() * pool.length)];
    }
    
    let candidates = pool.filter(f => !recentCaughtFishHistory.includes(f.name));
    if (candidates.length === 0) candidates = pool;
    
    let chosen = candidates[Math.floor(Math.random() * candidates.length)];
    recentCaughtFishHistory.push(chosen.name);
    if (recentCaughtFishHistory.length > 5) {
        recentCaughtFishHistory.shift();
    }
    return chosen;
}

function executeCatchLogic() {
    // 1. 영물 무작위 랜덤 획득 (단일 롤 & 미해금 영물 중 균등 무작위 선정)
    let unobtainedBeasts = MYTHICAL_BEASTS.filter(b => !fishingData.unlocked_beasts.includes(b.name));
    if (unobtainedBeasts.length > 0) {
        if (Math.random() * 100 < 0.1) { // 0.1% 확률
            let randomIndex = Math.floor(Math.random() * unobtainedBeasts.length);
            let beast = unobtainedBeasts[randomIndex];
            if (!fishingData.unlocked_beasts) fishingData.unlocked_beasts = [];
            fishingData.unlocked_beasts.push(beast.name);
            saveFishingData();
            showFloatingAlert(`✨🏛️ [전설의 영물 발견!] "${beast.name}"을(를) 낚아 올렸습니다!`);
        }
    }

    // 2. 해적 재화 드랍 (은화 및 나침반 파편)
    let coinDropCount = Math.random() < 0.35 ? (Math.floor(Math.random() * 2) + 1) : 0;
    let compassDropCount = Math.random() < 0.35 ? (Math.floor(Math.random() * 2) + 1) : 0;
    if (coinDropCount > 0) fishingData.silver_coins = (fishingData.silver_coins || 0) + coinDropCount;
    if (compassDropCount > 0) fishingData.compass_fragments = (fishingData.compass_fragments || 0) + compassDropCount;

    // 3. 곤(鯤) 보유 시 0.1% 확률로 거대한 전설의 새 '붕'으로 변신
    let hasKon = fishingData.unlocked_beasts && (fishingData.unlocked_beasts.includes('곤(鯤)') || fishingData.unlocked_beasts.includes('곤'));
    if (hasKon && Math.random() < 0.001) {
        let birdSize = 999.9;
        if (!fishingData.fish_inventory['붕']) fishingData.fish_inventory['붕'] = [];
        fishingData.fish_inventory['붕'].push({ size: birdSize, baseSize: birdSize, ichthioBonus: 0, dagon: false });
        if (!fishingData.fish_records['붕']) {
            fishingData.fish_records['붕'] = { grade: '특수', maxSize: birdSize, baseSize: birdSize, ichthioBonus: 0 };
        }
        saveFishingData();
        showFloatingAlert(`🦅✨ [곤의 전설적 변신!] 거대한 전설의 새 "붕"으로 변신했습니다! (판매가 1,000,000원)`);
        return { name: '붕', size: birdSize, displaySize: '999.9자', displayPrice: '1,000,000원' };
    }

    // 4. 현재 낚시터에 서식하는 어류 풀 추출 및 등급/어종 결정
    let currentSpotName = fishingData.current_spot || '연못';
    let rodLevel = fishingData.rod_level;
    let selectedFish;

    let hasMakara = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마카라');

    // 👑 [절대자 김병수의 어항]: 11단계 이상 낚싯대 전용이며, 오직 100% '태초' 등급 생물만 낚아 올립니다!
    if (currentSpotName === '절대자 김병수의 어항') {
        let pool = FISH_DATABASE.filter(f => f.grade === '태초');
        selectedFish = selectFishFromPool(pool);
        if (hasMakara) fishingData.makara_primordial_bonus = 0;
    } else {
        // 일반 6대 낚시터 (연못, 계곡, 저수지, 갯벌, 바다, 깊은바다)
        let availableInSpot = FISH_DATABASE.filter(f => f.spots && f.spots.includes(currentSpotName));
        if (availableInSpot.length === 0) availableInSpot = FISH_DATABASE;

        let rand = Math.random() * 100;
        let legendaryChance = 0.025 + (rodLevel - 1) * 1.108; 
        
        let baseMythicChance = (rodLevel >= 10) ? (0.01 * Math.pow(5, Math.min(rodLevel, 12) - 6)) : 0; 
        let makaraBonus = (hasMakara && rodLevel >= 10) ? (fishingData.makara_bonus_chance || 0) : 0;
        let mythicChance = baseMythicChance + makaraBonus;

        let basePrimordialChance = (rodLevel >= 11) ? 0.1 : 0;
        let makaraPrimordialBonus = (hasMakara && rodLevel >= 11) ? (fishingData.makara_primordial_bonus || 0) : 0;
        let primordialChance = basePrimordialChance + makaraPrimordialBonus;

        let heroChance = 3 + (rodLevel * 1.8); 
        let rareChance = 25 + (rodLevel * 0.5); 

        if (rodLevel >= 11 && rand < primordialChance) {
            let pool = FISH_DATABASE.filter(f => f.grade === '태초');
            selectedFish = selectFishFromPool(pool);
            if (hasMakara) fishingData.makara_primordial_bonus = 0;
        } else if (rodLevel >= 10 && rand < primordialChance + mythicChance) {
            let pool = availableInSpot.filter(f => f.grade === '신화');
            if (pool.length === 0) pool = FISH_DATABASE.filter(f => f.grade === '신화');
            selectedFish = selectFishFromPool(pool);
            if (hasMakara) fishingData.makara_bonus_chance = 0;
        } else if (rand < primordialChance + mythicChance + legendaryChance) {
            let pool = availableInSpot.filter(f => f.grade === '전설');
            if (pool.length === 0) pool = FISH_DATABASE.filter(f => f.grade === '전설');
            selectedFish = selectFishFromPool(pool);
        } else if (rand < primordialChance + mythicChance + legendaryChance + heroChance) {
            let pool = availableInSpot.filter(f => f.grade === '영웅');
            if (pool.length === 0) pool = FISH_DATABASE.filter(f => f.grade === '영웅');
            selectedFish = selectFishFromPool(pool);
        } else if (rand < primordialChance + mythicChance + legendaryChance + heroChance + rareChance) {
            let pool = availableInSpot.filter(f => f.grade === '희귀');
            if (pool.length === 0) pool = FISH_DATABASE.filter(f => f.grade === '희귀');
            selectedFish = selectFishFromPool(pool);
        } else {
            let pool = availableInSpot.filter(f => f.grade === '일반');
            if (pool.length === 0) pool = FISH_DATABASE.filter(f => f.grade === '일반');
            selectedFish = selectFishFromPool(pool);
        }
    }

    // 6. 물고기 크기 계산 및 익티오켄타우로스 10% 증가 보너스 적용
    let sizeBonus = (rodLevel - 1) * 0.3;
    let baseFishSizeRaw = Math.random() * (selectedFish.maxSize - selectedFish.minSize) + selectedFish.minSize + sizeBonus;
    let baseSize = parseFloat(baseFishSizeRaw.toFixed(1));

    let hasIchthio = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('익티오켄타우로스');
    let ichthioBonus = hasIchthio ? parseFloat((baseSize * 0.1).toFixed(1)) : 0;
    let totalSize = parseFloat((baseSize + ichthioBonus).toFixed(1));
    let fishName = selectedFish.name;

    // 보관고에 저장
    if (!fishingData.fish_inventory[fishName]) fishingData.fish_inventory[fishName] = [];
    fishingData.fish_inventory[fishName].push({ 
        size: totalSize, 
        baseSize: baseSize, 
        ichthioBonus: ichthioBonus, 
        dagon: false 
    });

    // 어류 도감 최고 기록 갱신
    let recordGrade = selectedFish.grade;
    if (!fishingData.fish_records[fishName]) {
        fishingData.fish_records[fishName] = { 
            grade: recordGrade, 
            maxSize: totalSize, 
            baseSize: baseSize, 
            ichthioBonus: ichthioBonus 
        };
    } else if (totalSize > fishingData.fish_records[fishName].maxSize) {
        fishingData.fish_records[fishName].maxSize = totalSize;
        fishingData.fish_records[fishName].baseSize = baseSize;
        fishingData.fish_records[fishName].ichthioBonus = ichthioBonus;
    }

    saveFishingData();

    // 7. 다곤 상호 계약 동기화
    let hasMyDagon = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('다곤');
    if (hasMyDagon && fishingData.dagon_partner && fishingData.is_dagon_mutual) {
        let partnerName = fishingData.dagon_partner;
        supabaseClient.from('user_fishing_data').select('*').eq('nickname', partnerName).maybeSingle().then(async ({ data: partnerRow }) => {
            if (partnerRow && partnerRow.unlocked_beasts && partnerRow.unlocked_beasts.includes('다곤') && partnerRow.dagon_partner === currentUser) {
                let pInv = partnerRow.fish_inventory || {};
                if (!pInv[fishName]) pInv[fishName] = [];
                pInv[fishName].push({ 
                    size: totalSize, 
                    baseSize: baseSize, 
                    ichthioBonus: ichthioBonus, 
                    dagon: true 
                });

                let pRec = partnerRow.fish_records || {};
                if (!pRec[fishName]) {
                    pRec[fishName] = { grade: recordGrade, maxSize: totalSize, baseSize: baseSize, ichthioBonus: ichthioBonus };
                } else if (totalSize > pRec[fishName].maxSize) {
                    pRec[fishName].maxSize = totalSize;
                    pRec[fishName].baseSize = baseSize;
                    pRec[fishName].ichthioBonus = ichthioBonus;
                }

                await supabaseClient.from('user_fishing_data').update({
                    fish_inventory: pInv,
                    fish_records: pRec,
                    updated_at: new Date()
                }).eq('nickname', partnerName);
            }
        });
    }

    // 상세 금액 계산
    let priceDetails = getFishPriceDetails(fishName, totalSize);
    let displaySize = hasIchthio 
        ? `${baseSize}자+${ichthioBonus}자(익티오 10%)` 
        : `${totalSize}자`;
    let displayPrice = priceDetails.coinBonus > 0 
        ? `${priceDetails.rawPrice.toLocaleString()}+${priceDetails.coinBonus.toLocaleString()}원` 
        : `${priceDetails.finalPrice.toLocaleString()}원`;

    return { 
        name: fishName, 
        size: totalSize, 
        baseSize: baseSize, 
        ichthioBonus: ichthioBonus, 
        displaySize: displaySize, 
        displayPrice: displayPrice,
        priceDetails: priceDetails
    };
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
    let priceInfo = getFishPriceDetails(fishName, targetSize);
    let sellPrice = priceInfo.finalPrice;

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

    for (let [fishName, sizesArr] of Object.entries(fishingData.fish_inventory)) {
        if (!sizesArr) continue;

        sizesArr.forEach(item => {
            let parsed = parseFishItem(item);
            let priceInfo = getFishPriceDetails(fishName, parsed.size);
            totalSell += priceInfo.finalPrice;
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
    fishingData.fish_inventory['길냥이의 물고기'].push({ size: rodCost, baseSize: rodCost, ichthioBonus: 0, dagon: false });

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
window.setRecordFilter = setRecordFilter;
window.setSpotFilter = setSpotFilter;
window.selectFishingSpot = selectFishingSpot;