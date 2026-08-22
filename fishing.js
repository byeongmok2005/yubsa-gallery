(() => {
'use strict';

// fishing.js - 심해 낚시터 (7대 낚시터, 170+종 생물 도감, 태초 등급, 11·12단계 조 단위 낚싯대, 은화 무한 상승 및 나침반 24레벨 만렙 적용 버전)

// 🛡️ [Anti-Cheat] 데이터 무결성 검증 및 비정상 변조 데이터 자동 정화 함수
function validateAndSanitizeFishingData(data) {
    if (!data || typeof data !== 'object') {
        return { money: 1000, rod_level: 1, current_spot: '연못', silver_coins: 0, silver_coin_level: 0, compass_fragments: 0, compass_level: 0 };
    }

    // 1. 낚싯대 레벨 검증 (1 ~ 12 정수)
    let rodLevel = Number(data.rod_level);
    if (!Number.isFinite(rodLevel) || rodLevel < 1) rodLevel = 1;
    if (rodLevel > 12) rodLevel = 12;
    data.rod_level = Math.floor(rodLevel);

    // 2. 낚싯대 단계별 합리적 최대 보유 금액 상한선 (F12 콘솔 500경 등 비정상 수치 원천 차단)
    const MAX_MONEY_CAP_BY_ROD = {
        1: 20000000,           // 1단계: 2천만 원
        2: 50000000,           // 2단계: 5천만 원
        3: 100000000,          // 3단계: 1억 원
        4: 300000000,          // 4단계: 3억 원
        5: 1000000000,         // 5단계: 10억 원
        6: 5000000000,         // 6단계: 50억 원
        7: 20000000000,        // 7단계: 200억 원
        8: 100000000000,       // 8단계: 1,000억 원
        9: 500000000000,       // 9단계: 5,000억 원
        10: 2000000000000,     // 10단계: 2조 원
        11: 10000000000000,    // 11단계: 10조 원
        12: 50000000000000     // 12단계: 50조 원
    };

    let maxAllowedMoney = MAX_MONEY_CAP_BY_ROD[data.rod_level] || 20000000;
    let money = Number(data.money);
    if (!Number.isFinite(money) || money < 0) {
        data.money = 1000;
    } else if (money > maxAllowedMoney) {
        console.warn(`🛡️ [Anti-Cheat] 비정상적인 재화 감지 (${money}원). 정상 상한선(${maxAllowedMoney}원)으로 자동 보정되었습니다.`);
        data.money = maxAllowedMoney;
    } else {
        data.money = Math.floor(money);
    }

    // 3. 은화 및 나침반 레벨 상한선 검증
    let sc = Number(data.silver_coins);
    data.silver_coins = (Number.isFinite(sc) && sc >= 0) ? Math.min(1000000, Math.floor(sc)) : 0;

    let scl = Number(data.silver_coin_level);
    data.silver_coin_level = (Number.isFinite(scl) && scl >= 0) ? Math.min(100, Math.floor(scl)) : 0;

    let cf = Number(data.compass_fragments);
    data.compass_fragments = (Number.isFinite(cf) && cf >= 0) ? Math.min(10000, Math.floor(cf)) : 0;

    let cl = Number(data.compass_level);
    data.compass_level = (Number.isFinite(cl) && cl >= 0) ? Math.min(24, Math.floor(cl)) : 0;

    // 4. 마카라 부스터 상한선 검증
    let mkBonus = Number(data.makara_bonus_chance);
    data.makara_bonus_chance = (Number.isFinite(mkBonus) && mkBonus >= 0) ? Math.min(50.0, mkBonus) : 0;

    let mkPrimordial = Number(data.makara_primordial_bonus);
    data.makara_primordial_bonus = (Number.isFinite(mkPrimordial) && mkPrimordial >= 0) ? Math.min(5.0, mkPrimordial) : 0;

    return data;
}

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
let playerList = ['실험체', '박병목', '김철수', '장민준', '손승환', '이승욱', '김병수', '김태용', '유진호']; 
let bahamutAutoActive = true; 
let hippocampusAutoActive = true; 
let recentCaughtFishHistory = []; // 같은 물고기 연속 중복 방지 버퍼
let currentRecordFilter = 'all'; // 어류 도감 등급 필터 상태 ('all', '일반', '희귀', '영웅', '전설', '신화', '태초', 'unobtained')
let currentSpotFilter = 'all';   // 어류 도감 서식지 필터 상태 ('all', '연못', '계곡', '저수지', '갯벌', '바다', '깊은바다', '절대자 김병수의 어항')
let lastCaughtResult = null;     // 방금 낚아올린 어류 (생동감 넘치는 낚시 연출용)

const MAX_COMPASS_LEVEL = 24; // 나침반 최대 레벨 24 (은화는 무한 상승)

function formatMoneyKorean(num) {
    if (!num || num === 0) return '0원';
    if (num >= 1000000000000) { // 조 단위
        let jo = Math.floor(num / 1000000000000);
        let remainder = num % 1000000000000;
        let eok = Math.floor(remainder / 100000000);
        return eok > 0 ? `${jo}조 ${eok.toLocaleString()}억원` : `${jo}조원`;
    }
    if (num >= 100000000) { // 억 단위
        let eok = Math.floor(num / 100000000);
        let remainder = num % 100000000;
        let man = Math.floor(remainder / 10000);
        return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
    }
    if (num >= 10000) { // 만 단위
        let man = Math.floor(num / 10000);
        let remainder = num % 10000;
        return remainder > 0 ? `${man}만 ${remainder.toLocaleString()}원` : `${man}만원`;
    }
    return `${num.toLocaleString()}원`;
}

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

// 🎨 12단계 고유 낚싯대 스킨 그래픽 설정 (티어가 오를수록 화려한 비주얼 & 발광 효과)
const ROD_SKINS = {
    1: {
        name: '🪵 나무 낚시대',
        theme: '클래식 원목',
        gradId: 'rodGrad_1',
        gradDef: `
            <linearGradient id="rodGrad_1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#d97706" />
                <stop offset="50%" stop-color="#92400e" />
                <stop offset="100%" stop-color="#451a03" />
            </linearGradient>
        `,
        glow: 'filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));',
        width: 6,
        lineColor: 'rgba(254, 243, 199, 0.8)',
        lineDash: '3,2',
        guidesColor: '#ca8a04',
        guidesWidth: 1.6,
        reelHtml: `
            <ellipse cx="320" cy="218" rx="13" ry="10" fill="#78350f" stroke="#b45309" stroke-width="2" />
            <rect x="312" y="204" width="16" height="6" rx="2" fill="#ca8a04" />
        `,
        tipAura: `<circle cx="195" cy="45" r="4" fill="#d97706" opacity="0.6" />`
    },
    2: {
        name: '🎣 튼튼한 대나무 낚시대',
        theme: '청명한 대나무',
        gradId: 'rodGrad_2',
        gradDef: `
            <linearGradient id="rodGrad_2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#86efac" />
                <stop offset="35%" stop-color="#22c55e" />
                <stop offset="70%" stop-color="#15803d" />
                <stop offset="100%" stop-color="#14532d" />
            </linearGradient>
        `,
        glow: 'filter: drop-shadow(0 0 5px #22c55e);',
        width: 6.5,
        lineColor: '#86efac',
        lineDash: 'none',
        guidesColor: '#facc15',
        guidesWidth: 2,
        reelHtml: `
            <ellipse cx="320" cy="218" rx="13" ry="10" fill="#15803d" stroke="#86efac" stroke-width="2" />
            <rect x="312" y="204" width="16" height="6" rx="2" fill="#facc15" />
            <line x1="280" y1="165" x2="284" y2="161" stroke="#facc15" stroke-width="3" />
            <line x1="235" y1="100" x2="239" y2="96" stroke="#facc15" stroke-width="2.5" />
        `,
        tipAura: `
            <circle cx="195" cy="45" r="5" fill="#4ade80" opacity="0.8" />
            <text x="180" y="38" font-size="12" style="animation: fpBobberFloat 2s infinite;">🍃</text>
        `
    },
    3: {
        name: '🌊 심해 탐사 퀀텀 낚시대',
        theme: '바이오 심해 퀀텀',
        gradId: 'rodGrad_3',
        gradDef: `
            <linearGradient id="rodGrad_3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#38bdf8" />
                <stop offset="40%" stop-color="#0284c7" />
                <stop offset="80%" stop-color="#0369a1" />
                <stop offset="100%" stop-color="#082f49" />
            </linearGradient>
        `,
        glow: 'filter: drop-shadow(0 0 8px #38bdf8) drop-shadow(0 0 14px #0284c7);',
        width: 6.8,
        lineColor: '#38bdf8',
        lineDash: 'none',
        guidesColor: '#7dd3fc',
        guidesWidth: 2.2,
        reelHtml: `
            <ellipse cx="320" cy="218" rx="14" ry="10" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5" />
            <circle cx="320" cy="218" r="5" fill="#0284c7" />
            <rect x="312" y="204" width="16" height="6" rx="2" fill="#38bdf8" />
        `,
        tipAura: `
            <circle cx="195" cy="45" r="7" fill="#38bdf8" opacity="0.9" />
            <text x="182" y="36" font-size="13" style="animation: fpBobberFloat 2.5s infinite;">🫧</text>
        `
    },
    4: {
        name: '✨ 탄소섬유 프로 낚시대',
        theme: '레이싱 카본 그라파이트',
        gradId: 'rodGrad_4',
        gradDef: `
            <linearGradient id="rodGrad_4" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#f87171" />
                <stop offset="20%" stop-color="#475569" />
                <stop offset="60%" stop-color="#1e293b" />
                <stop offset="100%" stop-color="#090d16" />
            </linearGradient>
        `,
        glow: 'filter: drop-shadow(0 0 6px #ef4444) drop-shadow(0 0 10px rgba(255,255,255,0.4));',
        width: 7,
        lineColor: '#bef264',
        lineDash: 'none',
        guidesColor: '#e2e8f0',
        guidesWidth: 2.2,
        reelHtml: `
            <ellipse cx="320" cy="218" rx="14" ry="10" fill="#0f172a" stroke="#ef4444" stroke-width="2.5" />
            <rect x="312" y="204" width="16" height="6" rx="2" fill="#e2e8f0" />
        `,
        tipAura: `
            <circle cx="195" cy="45" r="6" fill="#ef4444" opacity="0.95" />
            <circle cx="195" cy="45" r="2.5" fill="#ffffff" />
        `
    },
    5: {
        name: '⚡ 마력 충전 티타늄 낚시대',
        theme: '에메랄드 라이트닝 티타늄',
        gradId: 'rodGrad_5',
        gradDef: `
            <linearGradient id="rodGrad_5" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#a7f3d0" />
                <stop offset="30%" stop-color="#10b981" />
                <stop offset="70%" stop-color="#047857" />
                <stop offset="100%" stop-color="#064e3b" />
            </linearGradient>
        `,
        glow: 'filter: drop-shadow(0 0 8px #10b981) drop-shadow(0 0 16px #34d399);',
        width: 7.2,
        lineColor: '#22d3ee',
        lineDash: 'none',
        guidesColor: '#6ee7b7',
        guidesWidth: 2.5,
        reelHtml: `
            <ellipse cx="320" cy="218" rx="14" ry="10" fill="#064e3b" stroke="#34d399" stroke-width="2.5" />
            <polygon points="317,213 323,213 318,223 324,223" fill="#facc15" />
            <rect x="312" y="204" width="16" height="6" rx="2" fill="#a7f3d0" />
        `,
        tipAura: `
            <circle cx="195" cy="45" r="8" fill="#10b981" opacity="0.9" />
            <text x="183" y="38" font-size="14" style="animation: stageShakeAnim 0.2s infinite;">⚡</text>
        `
    },
    6: {
        name: '🔱 포세이돈의 삼지창 낚시대',
        theme: '심해의 신 포세이돈',
        gradId: 'rodGrad_6',
        gradDef: `
            <linearGradient id="rodGrad_6" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fde047" />
                <stop offset="30%" stop-color="#38bdf8" />
                <stop offset="70%" stop-color="#1d4ed8" />
                <stop offset="100%" stop-color="#172554" />
            </linearGradient>
        `,
        glow: 'filter: drop-shadow(0 0 10px #38bdf8) drop-shadow(0 0 20px #eab308);',
        width: 7.5,
        lineColor: '#67e8f9',
        lineDash: 'none',
        guidesColor: '#facc15',
        guidesWidth: 2.8,
        reelHtml: `
            <ellipse cx="320" cy="218" rx="15" ry="11" fill="#1e3a8a" stroke="#facc15" stroke-width="3" />
            <circle cx="320" cy="218" r="5" fill="#38bdf8" />
            <rect x="312" y="204" width="16" height="6" rx="2" fill="#fde047" />
        `,
        tipAura: `
            <circle cx="195" cy="45" r="9" fill="#0284c7" opacity="0.9" />
            <text x="182" y="37" font-size="16" style="filter: drop-shadow(0 0 8px #facc15); animation: fpBobberFloat 2s infinite;">🔱</text>
        `
    },
    7: {
        name: '🔥 용황의 숨결 낚시대',
        theme: '화염의 용황 마그마',
        gradId: 'rodGrad_7',
        gradDef: `
            <linearGradient id="rodGrad_7" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fef08a" />
                <stop offset="25%" stop-color="#f97316" />
                <stop offset="65%" stop-color="#dc2626" />
                <stop offset="100%" stop-color="#450a0a" />
            </linearGradient>
        `,
        glow: 'filter: drop-shadow(0 0 12px #f97316) drop-shadow(0 0 22px #ef4444);',
        width: 7.8,
        lineColor: '#fdba74',
        lineDash: 'none',
        guidesColor: '#f97316',
        guidesWidth: 3,
        reelHtml: `
            <ellipse cx="320" cy="218" rx="15" ry="11" fill="#450a0a" stroke="#ea580c" stroke-width="3" />
            <circle cx="320" cy="218" r="6" fill="#f97316" />
            <rect x="312" y="204" width="16" height="6" rx="2" fill="#fbbf24" />
        `,
        tipAura: `
            <circle cx="195" cy="45" r="10" fill="#ea580c" opacity="0.9" style="animation: pulse 0.8s infinite;" />
            <text x="182" y="37" font-size="17" style="animation: fpSplashTowardsCamera 1s infinite;">🔥</text>
        `
    },
    8: {
        name: '💎 아틀란티스 헤리티지',
        theme: '찬란한 고대 아틀란티스 다이아',
        gradId: 'rodGrad_8',
        gradDef: `
            <linearGradient id="rodGrad_8" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="25%" stop-color="#a5f3fc" />
                <stop offset="50%" stop-color="#38bdf8" />
                <stop offset="75%" stop-color="#818cf8" />
                <stop offset="100%" stop-color="#312e81" />
            </linearGradient>
        `,
        glow: 'filter: drop-shadow(0 0 12px #67e8f9) drop-shadow(0 0 24px #c084fc);',
        width: 8,
        lineColor: '#a5f3fc',
        lineDash: 'none',
        guidesColor: '#c4b5fd',
        guidesWidth: 3,
        reelHtml: `
            <ellipse cx="320" cy="218" rx="15" ry="11" fill="#1e1b4b" stroke="#38bdf8" stroke-width="3" />
            <polygon points="320,211 326,218 320,225 314,218" fill="#e0e7ff" />
            <rect x="312" y="204" width="16" height="6" rx="2" fill="#a5f3fc" />
        `,
        tipAura: `
            <circle cx="195" cy="45" r="10" fill="#a5f3fc" opacity="0.95" />
            <text x="181" y="37" font-size="17" style="filter: drop-shadow(0 0 10px #38bdf8); animation: fpBobberFloat 2s infinite;">💎</text>
        `
    },
    9: {
        name: '👑 코스믹 차원 낚시대',
        theme: '성운의 코스믹 바이올렛',
        gradId: 'rodGrad_9',
        gradDef: `
            <linearGradient id="rodGrad_9" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fdf4ff" />
                <stop offset="30%" stop-color="#e879f9" />
                <stop offset="70%" stop-color="#9333ea" />
                <stop offset="100%" stop-color="#3b0764" />
            </linearGradient>
        `,
        glow: 'filter: drop-shadow(0 0 14px #c084fc) drop-shadow(0 0 26px #ec4899);',
        width: 8.2,
        lineColor: '#f0abfc',
        lineDash: 'none',
        guidesColor: '#e879f9',
        guidesWidth: 3.2,
        reelHtml: `
            <ellipse cx="320" cy="218" rx="16" ry="12" fill="#2e1065" stroke="#e879f9" stroke-width="3" />
            <circle cx="320" cy="218" r="6" fill="#c084fc" />
            <rect x="312" y="204" width="16" height="6" rx="2" fill="#f0abfc" />
        `,
        tipAura: `
            <circle cx="195" cy="45" r="11" fill="#a855f7" opacity="0.9" />
            <text x="180" y="36" font-size="18" style="filter: drop-shadow(0 0 12px #d946ef); animation: cosmicAuraGlow 1.8s infinite;">🌌</text>
        `
    },
    10: {
        name: '🌟 우주 신들의 낚시대',
        theme: '찬란한 신성 천상계 골드',
        gradId: 'rodGrad_10',
        gradDef: `
            <linearGradient id="rodGrad_10" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="25%" stop-color="#fef08a" />
                <stop offset="55%" stop-color="#eab308" />
                <stop offset="85%" stop-color="#b45309" />
                <stop offset="100%" stop-color="#78350f" />
            </linearGradient>
        `,
        glow: 'filter: drop-shadow(0 0 16px #facc15) drop-shadow(0 0 30px #ffffff);',
        width: 8.5,
        lineColor: '#fef08a',
        lineDash: 'none',
        guidesColor: '#fde047',
        guidesWidth: 3.4,
        reelHtml: `
            <ellipse cx="320" cy="218" rx="16" ry="12" fill="#78350f" stroke="#facc15" stroke-width="3.5" />
            <circle cx="320" cy="218" r="7" fill="#ffffff" style="filter: drop-shadow(0 0 8px #fde047);" />
            <rect x="312" y="204" width="16" height="6" rx="2" fill="#ffffff" />
        `,
        tipAura: `
            <circle cx="195" cy="45" r="12" fill="#facc15" opacity="0.95" style="animation: pulse 1s infinite;" />
            <text x="179" y="36" font-size="19" style="filter: drop-shadow(0 0 15px #fde047); animation: fpBobberFloat 1.8s infinite;">🌟</text>
        `
    },
    11: {
        name: '🌌 차원 공허의 시공간 낚시대',
        theme: '시공간 특이점 보이드 왜곡',
        gradId: 'rodGrad_11',
        gradDef: `
            <linearGradient id="rodGrad_11" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#06b6d4" />
                <stop offset="25%" stop-color="#020617" />
                <stop offset="50%" stop-color="#d946ef" />
                <stop offset="75%" stop-color="#020617" />
                <stop offset="100%" stop-color="#06b6d4" />
            </linearGradient>
        `,
        glow: 'filter: drop-shadow(0 0 18px #06b6d4) drop-shadow(0 0 32px #d946ef);',
        width: 8.8,
        lineColor: '#67e8f9',
        lineDash: 'none',
        guidesColor: '#22d3ee',
        guidesWidth: 3.5,
        reelHtml: `
            <ellipse cx="320" cy="218" rx="16" ry="12" fill="#020617" stroke="#06b6d4" stroke-width="3.5" />
            <circle cx="320" cy="218" r="7" fill="#d946ef" style="animation: pulse 0.6s infinite;" />
            <rect x="312" y="204" width="16" height="6" rx="2" fill="#67e8f9" />
        `,
        tipAura: `
            <circle cx="195" cy="45" r="13" fill="#06b6d4" opacity="0.95" style="animation: stageShakeAnim 0.3s infinite;" />
            <text x="178" y="36" font-size="20" style="filter: drop-shadow(0 0 18px #06b6d4); animation: cosmicAuraGlow 1.2s infinite;">🌀</text>
        `
    },
    12: {
        name: '⚛️ 태초의 창조주 오메가 낚시대 (최종)',
        theme: '창조주 오메가 레인보우 슈퍼노바',
        gradId: 'rodGrad_12',
        gradDef: `
            <linearGradient id="rodGrad_12" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ff007f" />
                <stop offset="20%" stop-color="#ffaa00" />
                <stop offset="40%" stop-color="#ffff00" />
                <stop offset="60%" stop-color="#00ffcc" />
                <stop offset="80%" stop-color="#0088ff" />
                <stop offset="100%" stop-color="#9900ff" />
            </linearGradient>
        `,
        glow: 'filter: drop-shadow(0 0 20px #ff007f) drop-shadow(0 0 35px #00ffcc) drop-shadow(0 0 50px #ffaa00);',
        width: 9.2,
        lineColor: '#ffffff',
        lineDash: 'none',
        guidesColor: '#facc15',
        guidesWidth: 3.8,
        reelHtml: `
            <ellipse cx="320" cy="218" rx="17" ry="13" fill="#000000" stroke="url(#rodGrad_12)" stroke-width="4" />
            <circle cx="320" cy="218" r="8" fill="#ffffff" style="animation: cosmicAuraGlow 0.8s infinite;" />
            <rect x="312" y="204" width="16" height="6" rx="2" fill="url(#rodGrad_12)" />
        `,
        tipAura: `
            <circle cx="195" cy="45" r="15" fill="#ffffff" opacity="0.95" style="animation: cosmicAuraGlow 0.8s infinite;" />
            <text x="176" y="36" font-size="22" style="filter: drop-shadow(0 0 25px #ffffff) drop-shadow(0 0 35px #facc15); animation: fpBobberFloat 1.2s infinite;">⚛️</text>
        `
    }
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
    { name: '올챙이', grade: '일반', spots: ['연못'], minSize: 0.1, maxSize: 0.3, basePrice: 450, color: '#64748b' },
    { name: '참개구리', grade: '일반', spots: ['연못'], minSize: 0.3, maxSize: 0.7, basePrice: 580, color: '#64748b' },
    { name: '청개구리', grade: '일반', spots: ['연못'], minSize: 0.2, maxSize: 0.5, basePrice: 550, color: '#64748b' },
    { name: '송사리', grade: '일반', spots: ['연못', '계곡'], minSize: 0.2, maxSize: 0.4, basePrice: 420, color: '#64748b' },
    { name: '논우렁이', grade: '일반', spots: ['연못'], minSize: 0.2, maxSize: 0.5, basePrice: 480, color: '#64748b' },
    { name: '물자라', grade: '일반', spots: ['연못'], minSize: 0.3, maxSize: 0.6, basePrice: 520, color: '#64748b' },
    { name: '소금쟁이', grade: '일반', spots: ['연못', '계곡'], minSize: 0.2, maxSize: 0.4, basePrice: 420, color: '#64748b' },
    { name: '물방개', grade: '일반', spots: ['연못'], minSize: 0.3, maxSize: 0.6, basePrice: 600, color: '#64748b' },
    { name: '연못 피라미', grade: '일반', spots: ['연못'], minSize: 0.4, maxSize: 0.8, basePrice: 540, color: '#64748b' },
    { name: '연못 잔붕어', grade: '일반', spots: ['연못'], minSize: 0.4, maxSize: 0.9, basePrice: 580, color: '#64748b' },
    { name: '황소개구리', grade: '희귀', spots: ['연못'], minSize: 0.8, maxSize: 1.8, basePrice: 3800, color: '#16a34a' },
    { name: '비단잉어', grade: '희귀', spots: ['연못'], minSize: 1.2, maxSize: 2.5, basePrice: 4800, color: '#16a34a' },
    { name: '붉은귀거북', grade: '희귀', spots: ['연못'], minSize: 0.8, maxSize: 1.6, basePrice: 4200, color: '#16a34a' },
    { name: '연못 떡붕어', grade: '희귀', spots: ['연못'], minSize: 1.0, maxSize: 2.2, basePrice: 3800, color: '#16a34a' },
    { name: '오색 금붕어', grade: '희귀', spots: ['연못'], minSize: 0.5, maxSize: 1.2, basePrice: 3500, color: '#16a34a' },
    { name: '토종 말조개', grade: '희귀', spots: ['연못', '저수지'], minSize: 0.6, maxSize: 1.4, basePrice: 3600, color: '#16a34a' },
    { name: '황금 비단잉어', grade: '영웅', spots: ['연못'], minSize: 2.5, maxSize: 5.0, basePrice: 14000, color: '#2563eb' },
    { name: '대왕 황소개구리', grade: '영웅', spots: ['연못'], minSize: 2.0, maxSize: 4.0, basePrice: 11000, color: '#2563eb' },
    { name: '연꽃 자라', grade: '영웅', spots: ['연못'], minSize: 2.0, maxSize: 4.5, basePrice: 15000, color: '#2563eb' },
    { name: '거대 가물치(연못왕)', grade: '영웅', spots: ['연못'], minSize: 2.5, maxSize: 5.5, basePrice: 18000, color: '#2563eb' },
    { name: '천년 묵은 남생이', grade: '전설', spots: ['연못'], minSize: 8.0, maxSize: 18.0, basePrice: 9000000, color: '#9333ea' },
    { name: '연못의 수호룡 이무기', grade: '전설', spots: ['연못'], minSize: 12.0, maxSize: 25.0, basePrice: 12500000, color: '#9333ea' },
    { name: '옥황상제의 연꽃 백련어', grade: '신화', spots: ['연못'], minSize: 30.0, maxSize: 70.0, basePrice: 140000000, color: '#ea580c' },

    // ================= [2. 🏞️ 계곡 (Valley) 서식 생물] =================
    { name: '버들치', grade: '일반', spots: ['계곡'], minSize: 0.3, maxSize: 0.7, basePrice: 560, color: '#64748b' },
    { name: '갈겨니', grade: '일반', spots: ['계곡'], minSize: 0.4, maxSize: 0.8, basePrice: 600, color: '#64748b' },
    { name: '참다슬기', grade: '일반', spots: ['계곡'], minSize: 0.2, maxSize: 0.4, basePrice: 460, color: '#64748b' },
    { name: '돌고기', grade: '일반', spots: ['계곡'], minSize: 0.4, maxSize: 0.9, basePrice: 580, color: '#64748b' },
    { name: '쉬리', grade: '일반', spots: ['계곡'], minSize: 0.4, maxSize: 0.8, basePrice: 750, color: '#64748b' },
    { name: '참갈겨니', grade: '일반', spots: ['계곡'], minSize: 0.4, maxSize: 0.9, basePrice: 650, color: '#64748b' },
    { name: '모래무지', grade: '일반', spots: ['계곡'], minSize: 0.4, maxSize: 0.8, basePrice: 540, color: '#64748b' },
    { name: '밀어', grade: '일반', spots: ['계곡'], minSize: 0.3, maxSize: 0.6, basePrice: 520, color: '#64748b' },
    { name: '도롱뇽', grade: '일반', spots: ['계곡'], minSize: 0.3, maxSize: 0.7, basePrice: 700, color: '#64748b' },
    { name: '강도래 유충', grade: '일반', spots: ['계곡'], minSize: 0.2, maxSize: 0.5, basePrice: 440, color: '#64748b' },
    { name: '토종 참가재', grade: '희귀', spots: ['계곡'], minSize: 0.6, maxSize: 1.3, basePrice: 4200, color: '#16a34a' },
    { name: '꺽지', grade: '희귀', spots: ['계곡'], minSize: 0.8, maxSize: 1.8, basePrice: 5000, color: '#16a34a' },
    { name: '산천어', grade: '희귀', spots: ['계곡'], minSize: 1.0, maxSize: 2.2, basePrice: 5800, color: '#16a34a' },
    { name: '열목어', grade: '희귀', spots: ['계곡'], minSize: 1.2, maxSize: 2.6, basePrice: 6500, color: '#16a34a' },
    { name: '금강모치', grade: '희귀', spots: ['계곡'], minSize: 0.6, maxSize: 1.4, basePrice: 3800, color: '#16a34a' },
    { name: '민물참게', grade: '희귀', spots: ['계곡'], minSize: 0.7, maxSize: 1.5, basePrice: 4600, color: '#16a34a' },
    { name: '뚝지', grade: '희귀', spots: ['계곡'], minSize: 0.6, maxSize: 1.3, basePrice: 4000, color: '#16a34a' },
    { name: '대왕 붉은가재', grade: '영웅', spots: ['계곡'], minSize: 2.0, maxSize: 4.5, basePrice: 12000, color: '#2563eb' },
    { name: '황금 꺽지', grade: '영웅', spots: ['계곡'], minSize: 2.2, maxSize: 4.8, basePrice: 15000, color: '#2563eb' },
    { name: '산골짝 거대 도롱뇽', grade: '영웅', spots: ['계곡'], minSize: 2.5, maxSize: 5.5, basePrice: 16000, color: '#2563eb' },
    { name: '심산유곡 은어 떼', grade: '영웅', spots: ['계곡'], minSize: 2.5, maxSize: 5.0, basePrice: 14000, color: '#2563eb' },
    { name: '영험한 백색 열목어', grade: '전설', spots: ['계곡'], minSize: 10.0, maxSize: 22.0, basePrice: 10000000, color: '#9333ea' },
    { name: '계곡의 지배자 괴물 쏘가리', grade: '전설', spots: ['계곡'], minSize: 12.0, maxSize: 25.0, basePrice: 13000000, color: '#9333ea' },
    { name: '계곡의 정령 청룡어', grade: '신화', spots: ['계곡'], minSize: 40.0, maxSize: 90.0, basePrice: 175000000, color: '#ea580c' },

    // ================= [3. 🌾 저수지 (Reservoir) 서식 생물] =================
    { name: '큰입배스', grade: '일반', spots: ['저수지'], minSize: 0.6, maxSize: 1.3, basePrice: 720, color: '#64748b' },
    { name: '파랑볼우럭(블루길)', grade: '일반', spots: ['저수지'], minSize: 0.4, maxSize: 0.8, basePrice: 540, color: '#64748b' },
    { name: '참미꾸라지', grade: '일반', spots: ['저수지'], minSize: 0.3, maxSize: 0.7, basePrice: 520, color: '#64748b' },
    { name: '토종 참붕어', grade: '일반', spots: ['저수지'], minSize: 0.6, maxSize: 1.2, basePrice: 680, color: '#64748b' },
    { name: '저수지 잉어', grade: '일반', spots: ['저수지'], minSize: 0.8, maxSize: 1.8, basePrice: 820, color: '#64748b' },
    { name: '동자개(빠가사리)', grade: '일반', spots: ['저수지'], minSize: 0.5, maxSize: 1.1, basePrice: 750, color: '#64748b' },
    { name: '민물 메기', grade: '일반', spots: ['저수지'], minSize: 0.7, maxSize: 1.6, basePrice: 900, color: '#64748b' },
    { name: '누치', grade: '일반', spots: ['저수지'], minSize: 0.6, maxSize: 1.4, basePrice: 700, color: '#64748b' },
    { name: '살치', grade: '일반', spots: ['저수지'], minSize: 0.4, maxSize: 0.9, basePrice: 560, color: '#64748b' },
    { name: '각시납줄개', grade: '일반', spots: ['저수지'], minSize: 0.3, maxSize: 0.7, basePrice: 520, color: '#64748b' },
    { name: '황쏘가리', grade: '희귀', spots: ['저수지'], minSize: 1.2, maxSize: 2.6, basePrice: 6800, color: '#16a34a' },
    { name: '토종 가물치', grade: '희귀', spots: ['저수지'], minSize: 1.5, maxSize: 3.2, basePrice: 6400, color: '#16a34a' },
    { name: '풍천 민물장어', grade: '희귀', spots: ['저수지'], minSize: 1.5, maxSize: 3.5, basePrice: 7500, color: '#16a34a' },
    { name: '대형 월척 떡붕어', grade: '희귀', spots: ['저수지'], minSize: 1.2, maxSize: 2.4, basePrice: 4800, color: '#16a34a' },
    { name: '붉은 점박이 메기', grade: '희귀', spots: ['저수지'], minSize: 1.3, maxSize: 2.8, basePrice: 5500, color: '#16a34a' },
    { name: '저수지 자라', grade: '희귀', spots: ['저수지'], minSize: 1.0, maxSize: 2.2, basePrice: 6000, color: '#16a34a' },
    { name: '끄리', grade: '희귀', spots: ['저수지'], minSize: 0.9, maxSize: 2.0, basePrice: 4200, color: '#16a34a' },
    { name: '괴물배스(런커)', grade: '영웅', spots: ['저수지'], minSize: 2.5, maxSize: 5.5, basePrice: 15000, color: '#2563eb' },
    { name: '1미터 거대 가물치', grade: '영웅', spots: ['저수지'], minSize: 3.0, maxSize: 6.5, basePrice: 19000, color: '#2563eb' },
    { name: '백색 민물장어', grade: '영웅', spots: ['저수지'], minSize: 3.0, maxSize: 6.0, basePrice: 22000, color: '#2563eb' },
    { name: '저수지 괴물 메기', grade: '영웅', spots: ['저수지'], minSize: 3.5, maxSize: 7.0, basePrice: 20000, color: '#2563eb' },
    { name: '안개 저수지 괴담어', grade: '전설', spots: ['저수지'], minSize: 12.0, maxSize: 28.0, basePrice: 12000000, color: '#9333ea' },
    { name: '백년 묵은 거대 자라왕', grade: '전설', spots: ['저수지'], minSize: 15.0, maxSize: 32.0, basePrice: 14000000, color: '#9333ea' },
    { name: '안개속 거대 철갑상어', grade: '전설', spots: ['저수지'], minSize: 16.0, maxSize: 35.0, basePrice: 16000000, color: '#9333ea' },
    { name: '안개 저수지의 수룡(水龍)', grade: '신화', spots: ['저수지'], minSize: 50.0, maxSize: 120.0, basePrice: 240000000, color: '#ea580c' },

    // ================= [4. 🦀 갯벌 (Mudflat) 서식 생물] =================
    { name: '짱뚱어', grade: '일반', spots: ['갯벌'], minSize: 0.4, maxSize: 0.9, basePrice: 650, color: '#64748b' },
    { name: '칠게', grade: '일반', spots: ['갯벌'], minSize: 0.3, maxSize: 0.6, basePrice: 480, color: '#64748b' },
    { name: '바지락', grade: '일반', spots: ['갯벌'], minSize: 0.2, maxSize: 0.4, basePrice: 440, color: '#64748b' },
    { name: '대나무 맛조개', grade: '일반', spots: ['갯벌'], minSize: 0.3, maxSize: 0.7, basePrice: 580, color: '#64748b' },
    { name: '바다 갯지렁이', grade: '일반', spots: ['갯벌'], minSize: 0.3, maxSize: 0.8, basePrice: 460, color: '#64748b' },
    { name: '갯가재', grade: '일반', spots: ['갯벌'], minSize: 0.4, maxSize: 0.9, basePrice: 620, color: '#64748b' },
    { name: '갯벌 문절망둑(망둥어)', grade: '일반', spots: ['갯벌'], minSize: 0.4, maxSize: 0.8, basePrice: 540, color: '#64748b' },
    { name: '동죽조개', grade: '일반', spots: ['갯벌'], minSize: 0.2, maxSize: 0.5, basePrice: 460, color: '#64748b' },
    { name: '벌교 참꼬막', grade: '일반', spots: ['갯벌'], minSize: 0.2, maxSize: 0.5, basePrice: 520, color: '#64748b' },
    { name: '갯벌 쏙', grade: '일반', spots: ['갯벌'], minSize: 0.3, maxSize: 0.7, basePrice: 560, color: '#64748b' },
    { name: '붉은발 농게', grade: '희귀', spots: ['갯벌'], minSize: 0.6, maxSize: 1.4, basePrice: 4000, color: '#16a34a' },
    { name: '갯벌 뻘낙지', grade: '희귀', spots: ['갯벌'], minSize: 1.2, maxSize: 2.8, basePrice: 6800, color: '#16a34a' },
    { name: '대형 피조개', grade: '희귀', spots: ['갯벌'], minSize: 0.6, maxSize: 1.3, basePrice: 4500, color: '#16a34a' },
    { name: '백합조개', grade: '희귀', spots: ['갯벌'], minSize: 0.6, maxSize: 1.4, basePrice: 5000, color: '#16a34a' },
    { name: '자연산 참소라', grade: '희귀', spots: ['갯벌'], minSize: 0.7, maxSize: 1.6, basePrice: 5400, color: '#16a34a' },
    { name: '박하지(돌게)', grade: '희귀', spots: ['갯벌'], minSize: 0.7, maxSize: 1.5, basePrice: 4200, color: '#16a34a' },
    { name: '가리맛조개', grade: '희귀', spots: ['갯벌'], minSize: 0.8, maxSize: 1.8, basePrice: 4800, color: '#16a34a' },
    { name: '대왕 뻘낙지', grade: '영웅', spots: ['갯벌'], minSize: 2.5, maxSize: 5.5, basePrice: 16000, color: '#2563eb' },
    { name: '황금 짱뚱어', grade: '영웅', spots: ['갯벌'], minSize: 2.0, maxSize: 4.5, basePrice: 13000, color: '#2563eb' },
    { name: '거대 뻘 붕장어', grade: '영웅', spots: ['갯벌'], minSize: 2.8, maxSize: 6.0, basePrice: 18000, color: '#2563eb' },
    { name: '칠게 군주', grade: '영웅', spots: ['갯벌'], minSize: 2.2, maxSize: 4.8, basePrice: 15000, color: '#2563eb' },
    { name: '갯벌의 지배자 대왕 갯지렁이', grade: '전설', spots: ['갯벌'], minSize: 10.0, maxSize: 25.0, basePrice: 10000000, color: '#9333ea' },
    { name: '천년 묵은 대왕 참소라', grade: '전설', spots: ['갯벌'], minSize: 12.0, maxSize: 26.0, basePrice: 12500000, color: '#9333ea' },
    { name: '조수간만의 군주 뻘크라켄', grade: '신화', spots: ['갯벌'], minSize: 45.0, maxSize: 110.0, basePrice: 210000000, color: '#ea580c' },

    // ================= [5. 🌊 바다 (Sea / Coast) 서식 생물] =================
    { name: '참고등어', grade: '일반', spots: ['바다'], minSize: 0.6, maxSize: 1.2, basePrice: 700, color: '#64748b' },
    { name: '전갱이', grade: '일반', spots: ['바다'], minSize: 0.5, maxSize: 1.0, basePrice: 620, color: '#64748b' },
    { name: '꽁치', grade: '일반', spots: ['바다'], minSize: 0.5, maxSize: 1.0, basePrice: 580, color: '#64748b' },
    { name: '정어리', grade: '일반', spots: ['바다'], minSize: 0.3, maxSize: 0.7, basePrice: 500, color: '#64748b' },
    { name: '살오징어', grade: '일반', spots: ['바다'], minSize: 0.6, maxSize: 1.4, basePrice: 780, color: '#64748b' },
    { name: '서해 꽃게', grade: '일반', spots: ['바다'], minSize: 0.5, maxSize: 1.1, basePrice: 800, color: '#64748b' },
    { name: '삼치', grade: '일반', spots: ['바다'], minSize: 0.8, maxSize: 1.8, basePrice: 880, color: '#64748b' },
    { name: '학꽁치', grade: '일반', spots: ['바다'], minSize: 0.5, maxSize: 1.0, basePrice: 640, color: '#64748b' },
    { name: '우럭볼락', grade: '일반', spots: ['바다'], minSize: 0.4, maxSize: 0.9, basePrice: 720, color: '#64748b' },
    { name: '멸치 떼', grade: '일반', spots: ['바다'], minSize: 0.2, maxSize: 0.5, basePrice: 440, color: '#64748b' },
    { name: '넙치(자연산 광어)', grade: '희귀', spots: ['바다'], minSize: 1.3, maxSize: 2.8, basePrice: 5800, color: '#16a34a' },
    { name: '조피볼락(우럭)', grade: '희귀', spots: ['바다'], minSize: 1.1, maxSize: 2.3, basePrice: 5200, color: '#16a34a' },
    { name: '참돔', grade: '희귀', spots: ['바다'], minSize: 1.4, maxSize: 3.0, basePrice: 6800, color: '#16a34a' },
    { name: '동해 참문어', grade: '희귀', spots: ['바다'], minSize: 1.5, maxSize: 3.2, basePrice: 7200, color: '#16a34a' },
    { name: '바다 농어', grade: '희귀', spots: ['바다'], minSize: 1.4, maxSize: 3.0, basePrice: 5600, color: '#16a34a' },
    { name: '감성돔', grade: '희귀', spots: ['바다'], minSize: 1.2, maxSize: 2.6, basePrice: 6600, color: '#16a34a' },
    { name: '갑오징어', grade: '희귀', spots: ['바다'], minSize: 0.8, maxSize: 1.8, basePrice: 6000, color: '#16a34a' },
    { name: '돌돔', grade: '희귀', spots: ['바다'], minSize: 1.2, maxSize: 2.5, basePrice: 7400, color: '#16a34a' },
    { name: '제주 은갈치', grade: '희귀', spots: ['바다'], minSize: 1.8, maxSize: 4.0, basePrice: 6400, color: '#16a34a' },
    { name: '바닷가재(로브스터)', grade: '희귀', spots: ['바다'], minSize: 1.2, maxSize: 2.6, basePrice: 7800, color: '#16a34a' },
    { name: '겨울 대방어', grade: '영웅', spots: ['바다'], minSize: 3.0, maxSize: 7.0, basePrice: 19000, color: '#2563eb' },
    { name: '태평양 참다랑어', grade: '영웅', spots: ['바다'], minSize: 3.5, maxSize: 7.5, basePrice: 26000, color: '#2563eb' },
    { name: '황새치', grade: '영웅', spots: ['바다'], minSize: 3.5, maxSize: 7.5, basePrice: 24000, color: '#2563eb' },
    { name: '청새치', grade: '영웅', spots: ['바다'], minSize: 3.2, maxSize: 7.0, basePrice: 23000, color: '#2563eb' },
    { name: '제주 다금바리', grade: '영웅', spots: ['바다'], minSize: 2.5, maxSize: 5.5, basePrice: 25000, color: '#2563eb' },
    { name: '흑기흉상어', grade: '영웅', spots: ['바다'], minSize: 3.5, maxSize: 7.5, basePrice: 22000, color: '#2563eb' },
    { name: '귀상어', grade: '영웅', spots: ['바다'], minSize: 4.0, maxSize: 8.5, basePrice: 24500, color: '#2563eb' },
    { name: '달맞이 개복치', grade: '영웅', spots: ['바다'], minSize: 3.0, maxSize: 7.0, basePrice: 20000, color: '#2563eb' },
    { name: '심해 대왕오징어', grade: '전설', spots: ['바다'], minSize: 12.0, maxSize: 26.0, basePrice: 15000000, color: '#9333ea' },
    { name: '거대 백상아리', grade: '전설', spots: ['바다'], minSize: 15.0, maxSize: 32.0, basePrice: 18000000, color: '#9333ea' },
    { name: '바다의 포식자 범고래', grade: '전설', spots: ['바다'], minSize: 16.0, maxSize: 35.0, basePrice: 19500000, color: '#9333ea' },
    { name: '전설의 산갈치', grade: '전설', spots: ['바다'], minSize: 12.0, maxSize: 28.0, basePrice: 15500000, color: '#9333ea' },
    { name: '심해 패왕 메갈로돈', grade: '신화', spots: ['바다'], minSize: 40.0, maxSize: 90.0, basePrice: 300000000, color: '#ea580c' },
    { name: '전설의 바다괴수 크라켄', grade: '신화', spots: ['바다'], minSize: 60.0, maxSize: 140.0, basePrice: 425000000, color: '#dc2626' },

    // ================= [6. 🌌 깊은바다 (Deep Sea) 서식 생물] =================
    { name: '심해 랜턴피시', grade: '일반', spots: ['깊은바다'], minSize: 0.3, maxSize: 0.7, basePrice: 680, color: '#64748b' },
    { name: '투명 유리해파리', grade: '일반', spots: ['깊은바다'], minSize: 0.4, maxSize: 0.8, basePrice: 620, color: '#64748b' },
    { name: '심해 블롭피시', grade: '일반', spots: ['깊은바다'], minSize: 0.4, maxSize: 0.9, basePrice: 780, color: '#64748b' },
    { name: '심해 바티노무스', grade: '일반', spots: ['깊은바다'], minSize: 0.4, maxSize: 0.9, basePrice: 820, color: '#64748b' },
    { name: '심해 도끼고기', grade: '일반', spots: ['깊은바다'], minSize: 0.3, maxSize: 0.6, basePrice: 640, color: '#64748b' },
    { name: '블랙 드래곤피시', grade: '일반', spots: ['깊은바다'], minSize: 0.4, maxSize: 0.9, basePrice: 750, color: '#64748b' },
    { name: '심해 꼼치', grade: '일반', spots: ['깊은바다'], minSize: 0.5, maxSize: 1.2, basePrice: 720, color: '#64748b' },
    { name: '발광 심해 말미잘', grade: '일반', spots: ['깊은바다'], minSize: 0.3, maxSize: 0.7, basePrice: 580, color: '#64748b' },
    { name: '덤보 문어', grade: '희귀', spots: ['깊은바다'], minSize: 0.8, maxSize: 1.8, basePrice: 6400, color: '#16a34a' },
    { name: '심해 아귀', grade: '희귀', spots: ['깊은바다'], minSize: 1.2, maxSize: 2.6, basePrice: 7500, color: '#16a34a' },
    { name: '고대 주름상어', grade: '희귀', spots: ['깊은바다'], minSize: 1.4, maxSize: 3.0, basePrice: 7200, color: '#16a34a' },
    { name: '세발치', grade: '희귀', spots: ['깊은바다'], minSize: 0.9, maxSize: 2.0, basePrice: 5800, color: '#16a34a' },
    { name: '펠리컨장어', grade: '희귀', spots: ['깊은바다'], minSize: 1.3, maxSize: 2.8, basePrice: 7000, color: '#16a34a' },
    { name: '심해 거미게', grade: '희귀', spots: ['깊은바다'], minSize: 1.5, maxSize: 3.5, basePrice: 7800, color: '#16a34a' },
    { name: '마귀상어(고블린 샤크)', grade: '영웅', spots: ['깊은바다'], minSize: 3.2, maxSize: 7.0, basePrice: 23000, color: '#2563eb' },
    { name: '메가마우스 상어', grade: '영웅', spots: ['깊은바다'], minSize: 3.5, maxSize: 7.5, basePrice: 25000, color: '#2563eb' },
    { name: '초거대 바티노무스 킹', grade: '영웅', spots: ['깊은바다'], minSize: 2.5, maxSize: 5.5, basePrice: 20000, color: '#2563eb' },
    { name: '심해 거대 흡혈오징어 킹', grade: '전설', spots: ['깊은바다'], minSize: 10.0, maxSize: 24.0, basePrice: 16000000, color: '#9333ea' },
    { name: '고대어 실러캔스', grade: '전설', spots: ['깊은바다'], minSize: 12.0, maxSize: 26.0, basePrice: 17500000, color: '#9333ea' },
    { name: '심해의 제왕 향고래', grade: '전설', spots: ['깊은바다'], minSize: 20.0, maxSize: 45.0, basePrice: 21500000, color: '#9333ea' },
    { name: '고대 심해 군주 레비아탄', grade: '신화', spots: ['깊은바다'], minSize: 60.0, maxSize: 150.0, basePrice: 450000000, color: '#b91c1c' },
    { name: '심해의 신 요르문간드', grade: '신화', spots: ['깊은바다'], minSize: 80.0, maxSize: 180.0, basePrice: 650000000, color: '#450a0a' },

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

    let savedHippocampus = localStorage.getItem(`hippocampus_auto_${currentUser}`);
    hippocampusAutoActive = savedHippocampus !== null ? JSON.parse(savedHippocampus) : true;

    const { data } = await supabaseClient
        .from('user_fishing_data')
        .select('*')
        .eq('nickname', currentUser)
        .maybeSingle();

    if (data) {
        let sanitized = validateAndSanitizeFishingData(data);
        let wasContaminated = (data.money !== sanitized.money) || (data.silver_coins !== sanitized.silver_coins) || (data.compass_level !== sanitized.compass_level);

        let savedSpot = localStorage.getItem(`yubsa_spot_${currentUser}`) || '연못';
        if (!FISHING_SPOTS[savedSpot]) savedSpot = '연못';
        if (savedSpot === '절대자 김병수의 어항' && sanitized.rod_level < 11) savedSpot = '연못';

        // 🛠️ 구버전 잔여 고스트 어종 기록 자동 정리 (현재 177종 도감 + 특수 어종만 보존)
        let validFishNames = new Set(FISH_DATABASE.map(f => f.name));
        validFishNames.add('붕');
        validFishNames.add('길냥이의 물고기');
        let cleanedRecords = {};
        if (sanitized.fish_records && typeof sanitized.fish_records === 'object') {
            for (let [k, v] of Object.entries(sanitized.fish_records)) {
                if (validFishNames.has(k)) {
                    cleanedRecords[k] = v;
                }
            }
        }

        // 보관고 무결성 검증
        let cleanInventory = {};
        if (sanitized.fish_inventory && typeof sanitized.fish_inventory === 'object') {
            for (let [k, v] of Object.entries(sanitized.fish_inventory)) {
                if (validFishNames.has(k) && Array.isArray(v) && v.length > 0) {
                    cleanInventory[k] = v;
                }
            }
        }

        // 영물 목록 무결성 검증
        let validBeastNames = new Set(MYTHICAL_BEASTS.map(b => b.name));
        let cleanBeasts = Array.isArray(sanitized.unlocked_beasts) ? sanitized.unlocked_beasts.filter(b => validBeastNames.has(b)) : [];

        fishingData = {
            money: sanitized.money,
            rod_level: sanitized.rod_level,
            current_spot: savedSpot,
            fish_records: cleanedRecords,
            fish_inventory: cleanInventory,
            unlocked_beasts: cleanBeasts,
            cursed_target: sanitized.cursed_target !== undefined ? sanitized.cursed_target : currentUser,
            curse_remaining_count: sanitized.curse_remaining_count !== undefined ? sanitized.curse_remaining_count : 0,
            makara_bonus_chance: sanitized.makara_bonus_chance !== undefined ? sanitized.makara_bonus_chance : 0,
            makara_primordial_bonus: sanitized.makara_primordial_bonus !== undefined ? sanitized.makara_primordial_bonus : 0,
            siren_streak: sanitized.siren_streak !== undefined ? sanitized.siren_streak : 0,
            dagon_partner: sanitized.dagon_partner || null,
            is_dagon_mutual: false,
            trade_request: sanitized.trade_request || null,
            silver_coins: sanitized.silver_coins !== undefined ? sanitized.silver_coins : 0,
            silver_coin_level: sanitized.silver_coin_level !== undefined ? sanitized.silver_coin_level : 0,
            compass_fragments: sanitized.compass_fragments !== undefined ? sanitized.compass_fragments : 0,
            compass_level: sanitized.compass_level !== undefined ? sanitized.compass_level : 0
        };

        if (wasContaminated) {
            console.warn("🛡️ [Anti-Cheat] 오염된 변조 데이터를 감지하여 정상치로 복구 후 DB를 자동 정화합니다.");
            await saveFishingData();
        }
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
    
    validateAndSanitizeFishingData(fishingData);

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

async function toggleHippocampusAuto() {
    let currentScroll = window.scrollY;
    hippocampusAutoActive = !hippocampusAutoActive;
    
    localStorage.setItem(`hippocampus_auto_${currentUser}`, JSON.stringify(hippocampusAutoActive));

    let statusMsg = hippocampusAutoActive ? "활성화 (자동 낚아채기)" : "비활성화 (수동 손맛 챔질)";
    showFloatingAlert(`⚡ 히포캠포스 자동 낚시: ${statusMsg}`);
    
    closeAllModals();
    showBeastDetail('히포캠포스');

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
        } else if (beastName === '히포캠포스') {
            let btnBg = hippocampusAutoActive ? '#dc2626' : '#16a34a';
            let btnText = hippocampusAutoActive ? '⏹️ 히포캠포스 자동 낚시 끄기' : '▶️ 히포캠포스 자동 낚시 켜기';
            let statusDesc = hippocampusAutoActive ? '작동 중 🟢 (자동 낚아챔)' : '정지됨 🔴 (수동 손맛 챔질)';
            extraAction = `
                <div style="margin-top: 12px; background: #f0fdf4; border: 1px solid #16a34a; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #15803d; font-weight: 700; margin-bottom: 6px;">자동 낚시 상태: <b>${statusDesc}</b></div>
                    <button onclick="toggleHippocampusAuto()" style="width: 100%; background: ${btnBg}; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: 700; cursor: pointer;">${btnText}</button>
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
        playerList = ['실험체', '박병목', '김철수', '장민준', '손승환', '이승욱', '김병수', '김태용', '유진호'];
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
        playerList = ['실험체', '박병목', '김철수', '장민준', '손승환', '이승욱', '김병수', '김태용', '유진호'];
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

// 🎮 1인칭 시점(First-Person FPS View) 실시간 낚시 시뮬레이션 스테이지 렌더러
function renderAnimatedFishingStage(currentSpot, fishingStep, rodLevel, lastCaught, currentRod, statusText, actionBtnHtml) {
    let spotKey = currentSpot.name;
    
    // 1인칭 낚싯대 12종 고유 스킨 로드 (발광 오라, 색상, 릴, 가이드 링, 초릿대 오라)
    let skin = ROD_SKINS[rodLevel] || ROD_SKINS[1];
    let rodGlowStyle = skin.glow;
    let rodStrokeColor = `url(#${skin.gradId})`;
    let lineStrokeColor = skin.lineColor;
    let rodTipAura = skin.tipAura;

    // 1인칭 원경 환경 데코레이션
    let ambientSceneryHtml = "";
    if (spotKey === '연못') {
        ambientSceneryHtml = `
            <div style="position: absolute; top: 15px; left: 15%; font-size: 1.6rem; opacity: 0.75; animation: fpBobberFloat 4s infinite;">🪷</div>
            <div style="position: absolute; top: 25px; right: 20%; font-size: 1.2rem; opacity: 0.7; animation: fpBobberFloat 3.5s infinite 0.5s;">🍀</div>
            <div style="position: absolute; top: 80px; left: 25%; font-size: 0.9rem; opacity: 0.65;">🐸</div>
        `;
    } else if (spotKey === '계곡') {
        ambientSceneryHtml = `
            <div style="position: absolute; top: 10px; left: 12%; font-size: 1.5rem; opacity: 0.8;">🏔️</div>
            <div style="position: absolute; top: 20px; right: 15%; font-size: 1.3rem; opacity: 0.75; animation: fpBobberFloat 2s infinite;">💦</div>
            <div style="position: absolute; top: 60px; right: 30%; font-size: 1.1rem; opacity: 0.7;">🪨</div>
        `;
    } else if (spotKey === '저수지') {
        ambientSceneryHtml = `
            <div style="position: absolute; top: 20px; left: 10%; width: 80%; height: 35px; background: rgba(255,255,255,0.22); filter: blur(14px); border-radius: 50%;"></div>
            <div style="position: absolute; top: 35px; left: 18%; font-size: 1.4rem; opacity: 0.8; animation: fpBobberFloat 3s infinite;">🌾</div>
            <div style="position: absolute; top: 40px; right: 22%; font-size: 1.3rem; opacity: 0.75; animation: fpBobberFloat 3.5s infinite 0.6s;">🌾</div>
        `;
    } else if (spotKey === '갯벌') {
        ambientSceneryHtml = `
            <div style="position: absolute; top: 15px; left: 50%; transform: translateX(-50%); width: 70px; height: 70px; background: radial-gradient(circle, #f97316 0%, rgba(249,115,22,0) 70%); border-radius: 50%; opacity: 0.85;"></div>
            <div style="position: absolute; top: 75px; left: 20%; font-size: 1.2rem; opacity: 0.85; animation: fpBobberFloat 2.5s infinite;">🦀</div>
            <div style="position: absolute; top: 80px; right: 25%; font-size: 1rem; opacity: 0.75;">🐚</div>
        `;
    } else if (spotKey === '바다') {
        ambientSceneryHtml = `
            <div style="position: absolute; top: 15px; left: 25%; font-size: 1.2rem; opacity: 0.85; animation: fpBobberFloat 4s infinite;">🕊️</div>
            <div style="position: absolute; top: 22px; right: 30%; font-size: 1rem; opacity: 0.75; animation: fpBobberFloat 4.5s infinite 0.8s;">🕊️</div>
            <div style="position: absolute; top: 30px; left: 10%; font-size: 1.4rem; opacity: 0.8;">⛵</div>
        `;
    } else if (spotKey === '깊은바다') {
        ambientSceneryHtml = `
            <div style="position: absolute; top: 25px; left: 20%; font-size: 1.4rem; opacity: 0.8; animation: fpBobberFloat 3s infinite; filter: drop-shadow(0 0 10px #8b5cf6);">🪼</div>
            <div style="position: absolute; top: 35px; right: 22%; font-size: 1.2rem; opacity: 0.75; animation: fpBobberFloat 2.5s infinite 1s; filter: drop-shadow(0 0 8px #06b6d4);">✨</div>
            <div style="position: absolute; top: 65px; left: 35%; font-size: 1.1rem; opacity: 0.7; filter: drop-shadow(0 0 6px #3b82f6);">🫧</div>
        `;
    } else if (spotKey === '절대자 김병수의 어항') {
        ambientSceneryHtml = `
            <div style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); font-size: 1.6rem; opacity: 0.95; animation: cosmicAuraGlow 2s infinite;">👑</div>
            <div style="position: absolute; top: 25px; left: 15%; font-size: 1.3rem; opacity: 0.85; animation: fpBobberFloat 2s infinite; filter: drop-shadow(0 0 12px #eab308);">✨</div>
            <div style="position: absolute; top: 20px; right: 18%; font-size: 1.2rem; opacity: 0.8; animation: fpBobberFloat 3s infinite 0.5s;">🌌</div>
        `;
    }

    // 1인칭 상태별 애니메이션 클래스 & 인터랙티브 씬
    let stageShakeStyle = (fishingStep === 'bite') ? 'animation: stageShakeAnim 0.25s infinite;' : '';
    let rodMotionStyle = "animation: fpBreatheIdle 3s ease-in-out infinite;";
    let rodPathD = "M 330 250 Q 280 160, 195 45"; // 1인칭 낚싯대 곡선 (우측하단 손잡이 -> 중앙 전방 초릿대)
    let linePathD = "M 195 45 Q 197 85, 195 125";  // 낚싯줄 (초릿대 -> 수면 중앙 찌)

    if (fishingStep === 'bite') {
        rodMotionStyle = "animation: fpRodStrainShake 0.12s infinite;";
        rodPathD = "M 330 250 Q 270 190, 195 90"; // 입질 시 아래로 홱 꺾인 낚싯대
        linePathD = "M 195 90 L 195 145";          // 팽팽하게 당겨진 붉은 낚싯줄
    }

    let centerInteractiveHtml = "";

    if (fishingStep === 'ready') {
        let lastCatchPopup = "";
        if (lastCaught) {
            let color = (FISH_DATABASE.find(f => f.name === lastCaught.name) || {}).color || '#38bdf8';
            lastCatchPopup = `
                <div style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 88%; max-width: 270px; box-sizing: border-box; background: rgba(15, 23, 42, 0.96); border: 2px solid ${color}; border-radius: 14px; padding: 8px 12px; text-align: center; box-shadow: 0 8px 25px rgba(0,0,0,0.7); animation: fpFishLeapToCamera 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; z-index: 25;">
                    <div style="font-size: 0.68rem; color: ${color}; font-weight: 900; letter-spacing: -0.2px;">✨ 낚아올린 어종 획득!</div>
                    <div style="font-size: 1.15rem; font-weight: 900; color: #fff; margin: 1px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">🐟 ${lastCaught.name}</div>
                    <div style="font-size: 0.76rem; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">크기: <b style="color: #38bdf8;">${lastCaught.displaySize || lastCaught.size + '자'}</b></div>
                    <div style="font-size: 0.74rem; color: #facc15; font-weight: 800; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">가치: ${lastCaught.displayPrice || ''}</div>
                </div>
            `;
        }

        centerInteractiveHtml = `
            ${lastCatchPopup}
            <!-- 1인칭 찌 (준비 대기) -->
            <div style="position: absolute; top: 118px; left: 50%; transform: translateX(-50%); font-size: 1.35rem; opacity: 0.85; animation: fpBobberFloat 2.5s infinite;">
                🔴
            </div>
            <div style="position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.65); padding: 5px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.25); white-space: nowrap; z-index: 10;">
                🎣 [1인칭 시점] 낚싯대를 던져 손맛을 느껴보세요!
            </div>
        `;
    } else if (fishingStep === 'waiting') {
        centerInteractiveHtml = `
            <!-- 3D 원근 타원형 물결 파문 -->
            <div style="position: absolute; top: 122px; left: 50%; transform: translateX(-50%); width: 28px; height: 12px; border: 2px solid rgba(255,255,255,0.8); border-radius: 50%; animation: fpRipple3D 2s cubic-bezier(0,0.2,0.8,1) infinite;"></div>
            <div style="position: absolute; top: 122px; left: 50%; transform: translateX(-50%); width: 28px; height: 12px; border: 2px solid rgba(56, 189, 248, 0.8); border-radius: 50%; animation: fpRipple3D 2s cubic-bezier(0,0.2,0.8,1) infinite 0.7s;"></div>

            <!-- 수면 정중앙 찌 (Bobber) -->
            <div style="position: absolute; top: 110px; left: 50%; transform: translateX(-50%); font-size: 1.45rem; animation: fpBobberFloat 1.2s ease-in-out infinite; z-index: 6;">
                🔴
            </div>

            <!-- 깊은 물속에서 찌를 향해 스르륵 헤엄쳐 다가오는 1인칭 그림자 물고기 -->
            <div style="position: absolute; top: 135px; left: 45%; font-size: 1.8rem; opacity: 0.75; filter: brightness(0.15) blur(0.5px); animation: fpShadowFishSwim 3.5s ease-in-out infinite; z-index: 4;">
                🐟
            </div>

            <!-- 상태 배지 -->
            <div style="position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); background: rgba(2, 132, 199, 0.9); padding: 5px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 4px 14px rgba(0,0,0,0.4); white-space: nowrap; z-index: 10;">
                👀 찌를 주시하세요... 물고기가 다가오고 있습니다!
            </div>
        `;
    } else if (fishingStep === 'bite') {
        centerInteractiveHtml = `
            <!-- 0.75초 긴박한 카운트다운 타이머 바 -->
            <div style="position: absolute; top: 10px; left: 10%; width: 80%; height: 9px; background: rgba(0,0,0,0.6); border-radius: 10px; overflow: hidden; border: 1px solid #ef4444; z-index: 30;">
                <div style="height: 100%; animation: timerBarShrink 0.75s linear forwards;"></div>
            </div>

            <!-- 화면 정면으로 튀어오르는 거대한 물보라 및 번개 스파크 -->
            <div style="position: absolute; top: 105px; left: 45%; font-size: 2.8rem; animation: fpSplashTowardsCamera 0.55s infinite; z-index: 12;">
                💦
            </div>
            <div style="position: absolute; top: 85px; left: 52%; font-size: 2.2rem; animation: fpSplashTowardsCamera 0.5s infinite 0.15s; z-index: 12;">
                ⚡
            </div>

            <!-- 물속으로 푹 빨려 들어간 찌 -->
            <div style="position: absolute; top: 130px; left: 50%; transform: translateX(-50%); font-size: 1.4rem; animation: fpBiteDunk 0.25s forwards; z-index: 6;">
                🔴
            </div>

            <!-- 1인칭 HIT 알림 배너 -->
            <div style="position: absolute; top: 26px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; padding: 7px 18px; border-radius: 20px; font-size: 0.95rem; font-weight: 900; border: 2px solid #fecaca; box-shadow: 0 0 25px rgba(239,68,68,0.9); z-index: 30; animation: fpHitBannerShake 0.15s infinite; white-space: nowrap;">
                🚨 HIT!! 지금 바로 낚아채세요!! 🚨
            </div>
        `;
    }

    return `
        <!-- 1인칭 시점 낚시 애니메이션 전용 스타일 (iOS/Android 완벽 중앙 정렬 지원) -->
        <style>
            @keyframes fpBreatheIdle { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 50% { transform: translate(-2px, -4px) rotate(-0.5deg); } }
            @keyframes fpBobberFloat { 0%, 100% { transform: translate(-50%, 0px) rotate(0deg); } 50% { transform: translate(-50%, -7px) rotate(6deg); } }
            @keyframes fpRipple3D { 0% { transform: translate(-50%, 0) scale(0.2, 0.1); opacity: 0.9; } 100% { transform: translate(-50%, 0) scale(2.8, 1.4); opacity: 0; } }
            @keyframes fpShadowFishSwim { 0% { transform: translate(60px, 20px) scale(0.5); opacity: 0; } 40% { transform: translate(15px, -5px) scale(0.85); opacity: 0.75; } 70% { transform: translate(-5px, 3px) scale(1); opacity: 0.95; } 100% { transform: translate(-50px, 20px) scale(0.65); opacity: 0.2; } }
            @keyframes fpRodStrainShake { 0%, 100% { transform: translate(0, 8px) rotate(4deg); } 25% { transform: translate(-3px, 12px) rotate(5.5deg); } 50% { transform: translate(3px, 7px) rotate(3.5deg); } 75% { transform: translate(-2px, 11px) rotate(5deg); } }
            @keyframes fpHitBannerShake { 0%, 100% { transform: translate(-50%, 0) rotate(0deg); } 25% { transform: translate(calc(-50% - 3px), 2px) rotate(1deg); } 50% { transform: translate(calc(-50% + 3px), -2px) rotate(-1deg); } 75% { transform: translate(calc(-50% - 2px), 1px) rotate(0.5deg); } }
            @keyframes fpBiteDunk { 0% { transform: translate(-50%, 0) scale(1); } 100% { transform: translate(-50%, 22px) scale(0.8); } }
            @keyframes fpSplashTowardsCamera { 0% { transform: scale(0.2) translateY(0); opacity: 1; } 50% { transform: scale(1.6) translateY(-15px); opacity: 0.95; } 100% { transform: scale(2.6) translateY(-30px); opacity: 0; } }
            @keyframes fpFishLeapToCamera { 0% { transform: translate(-50%, 80px) scale(0.1) rotate(-15deg); opacity: 0; } 50% { transform: translate(-50%, -20px) scale(1.15) rotate(5deg); opacity: 1; } 75% { transform: translate(-50%, -8px) scale(1.05) rotate(-2deg); opacity: 1; } 100% { transform: translate(-50%, 0px) scale(1) rotate(0deg); opacity: 1; } }
            @keyframes fpWaterPerspWave { 0% { transform: translateY(0); } 50% { transform: translateY(-3px); } 100% { transform: translateY(0); } }
            @keyframes cosmicAuraGlow { 0%, 100% { filter: drop-shadow(0 0 8px #f59e0b) drop-shadow(0 0 18px #ec4899); } 50% { filter: drop-shadow(0 0 16px #3b82f6) drop-shadow(0 0 24px #a855f7); } }
            @keyframes timerBarShrink { 0% { width: 100%; background: #22c55e; } 50% { width: 50%; background: #eab308; } 100% { width: 0%; background: #ef4444; } }
        </style>

        <!-- 🎮 1인칭 시점(FPS View) 그래픽 낚시 시뮬레이션 스테이지 -->
        <div style="position: relative; background: ${currentSpot.bgGradient}; border: 2px solid ${currentSpot.themeColor}; border-radius: 16px; overflow: hidden; margin-bottom: 16px; box-shadow: 0 12px 30px rgba(0,0,0,0.28); color: white; ${stageShakeStyle}">
            
            <!-- 상단 낚시터 정보 바 -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.45); padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.15); font-size: 0.78rem; font-weight: 800; z-index: 10; position: relative;">
                <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                    <span style="font-size: 1rem;">${currentSpot.icon}</span>
                    <span>${currentSpot.name}</span>
                    <span style="background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 800;">${skin.theme} 🎣</span>
                </div>
                <div style="opacity: 0.85; font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 45%;">${currentSpot.desc}</div>
            </div>

            <!-- 1인칭 3D 뷰포트 (높이 230px) -->
            <div style="position: relative; height: 230px; width: 100%; overflow: hidden; perspective: 700px;">
                
                <!-- 1. 상단 원경 풍경 & 데코 -->
                ${ambientSceneryHtml}

                <!-- 2. 3D 원근 수면 레이어 (Horizon at Y: 105px) -->
                <div style="position: absolute; top: 105px; left: 0; width: 100%; height: 125px; background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%); pointer-events: none;">
                    <!-- 수면 지평선 잔물결 곡선 -->
                    <svg viewBox="0 0 600 60" style="position: absolute; top: -10px; left: 0; width: 100%; height: 25px; opacity: 0.7; animation: fpWaterPerspWave 4s ease-in-out infinite;" preserveAspectRatio="none">
                        <path d="M0,15 Q150,0 300,15 T600,15 L600,60 L0,60 Z" fill="rgba(255,255,255,0.15)"></path>
                    </svg>
                </div>

                <!-- 3. 1인칭 손 & 낚싯대 SVG 레이어 (우측 하단에서 화면 중앙 전방으로 뻗어나감) -->
                <svg viewBox="0 0 380 240" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 8;">
                    <defs>
                        ${Object.values(ROD_SKINS).map(s => s.gradDef).join('')}
                    </defs>

                    <!-- 1인칭 낚싯줄 (초릿대 -> 수면 찌) -->
                    <path d="${linePathD}" fill="none" stroke="${skin.lineColor}" stroke-width="${fishingStep === 'bite' ? '3' : '1.8'}" stroke-dasharray="${fishingStep === 'bite' ? 'none' : skin.lineDash}" />

                    <!-- 1인칭 낚싯대 몸체 (우측 하단 손잡이 -> 중앙 전방 초릿대) -->
                    <g style="${rodMotionStyle} ${rodGlowStyle}">
                        <!-- 낚싯대 블랭크 (Rod Pole) -->
                        <path d="${rodPathD}" fill="none" stroke="url(#${skin.gradId})" stroke-width="${skin.width}" stroke-linecap="round" />
                        <path d="${rodPathD}" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2" stroke-linecap="round" />

                        <!-- 낚싯대 가이드 링 (Guide Rings) -->
                        <circle cx="280" cy="165" r="4" fill="none" stroke="${skin.guidesColor}" stroke-width="${skin.guidesWidth}" />
                        <circle cx="235" cy="100" r="3" fill="none" stroke="${skin.guidesColor}" stroke-width="${skin.guidesWidth * 0.85}" />
                        <circle cx="202" cy="55" r="2.2" fill="none" stroke="${skin.guidesColor}" stroke-width="${skin.guidesWidth * 0.7}" />

                        <!-- 낚싯대 끝 초릿대 오라 및 파티클 -->
                        ${rodTipAura}

                        <!-- 스피닝 릴 & 낚싯대 손잡이 -->
                        ${skin.reelHtml}
                    </g>
                </svg>

                <!-- 4. 상태별 인터랙티브 씬 (찌, 파문, 그림자 물고기, HIT, 낚아챔) -->
                ${centerInteractiveHtml}
            </div>

            <!-- 하단 조작 액션 버튼 및 상태 텍스트 -->
            <div style="background: rgba(15, 23, 42, 0.85); padding: 12px 14px; border-top: 1px solid rgba(255,255,255,0.15); text-align: center;">
                <div id="fishingStatusText" style="font-size: 0.92rem; font-weight: 800; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.6); margin-bottom: 8px; line-height: 1.35; word-break: keep-all;">
                    ${statusText}
                </div>
                ${actionBtnHtml}
            </div>
        </div>
    `;
}

// 🎣 실시간 낚시 상태 텍스트 및 액션 버튼 반환 함수
function getStageStatusAndButton() {
    let currentRod = ROD_TIERS[fishingData.rod_level] || ROD_TIERS[1];
    let hasBahamut = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('바하무트');
    let hasMatsuya = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마츠야');
    let isCursed = !hasMatsuya && fishingData.cursed_target === currentUser && fishingData.curse_remaining_count > 0;
    let effectiveCost = hasBahamut ? 0 : currentRod.cost;
    let isBankrupt = (fishingData.money < effectiveCost && !hasInventoryFish() && fishingStep === 'ready');

    let statusText = "";
    let actionBtnHtml = "";

    if (isBankrupt) {
        statusText = '소지금이 부족합니다. 길냥이에게 물고기를 뺏어오세요!';
        actionBtnHtml = `<button class="btn-primary" onclick="claimChance()" style="width: 100%; padding: 13px; font-size: 0.95rem; background: linear-gradient(135deg, #facc15, #eab308); color: #713f12; font-weight: 900; border-radius: 12px; word-break: keep-all;">🐱 길냥이에게 낚시 비용 뺏기 (구제 찬스)</button>`;
    } else if (isCursed) {
        statusText = `⚠️ 인면어의 저주로 인해 낚시가 매우 위험합니다! (남은 횟수: ${fishingData.curse_remaining_count}회)`;
        actionBtnHtml = `<button class="btn-primary" onclick="startCast()" style="width: 100%; padding: 14px; font-size: 1rem; background: #dc2626; color: white; font-weight: 800; border-radius: 12px; word-break: keep-all;">⚠️ 저주받은 상태로 낚시 강행 (${formatMoneyKorean(currentRod.cost)})</button>`;
    } else {
        if (fishingStep === 'ready') {
            if (hasBahamut) {
                statusText = '🌍 [바하무트의 지탱] 낚시 비용 무료!';
                actionBtnHtml = `<button class="btn-primary" onclick="startCast()" style="width: 100%; padding: 14px; font-size: 1.05rem; background: linear-gradient(135deg, #0369a1, #0284c7, #0f172a); color: #f0f9ff; font-weight: 900; border: 1px solid #38bdf8; border-radius: 12px; word-break: keep-all; box-shadow: 0 4px 14px rgba(3,105,161,0.4);">🌟 바하무트 낚시 시작 (0원)</button>`;
            } else {
                statusText = '광활한 낚시터에서 대어를 노려보세요!';
                actionBtnHtml = `<button class="btn-primary" onclick="startCast()" style="width: 100%; padding: 14px; font-size: 1.05rem; background: linear-gradient(135deg, #0284c7, #0369a1); color: white; font-weight: 900; border-radius: 12px; word-break: keep-all; box-shadow: 0 4px 14px rgba(2,132,199,0.35);">🎣 낚싯대 던지기 (${formatMoneyKorean(currentRod.cost)})</button>`;
            }
        } else if (fishingStep === 'waiting') {
            let hasHippocampus = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('히포캠포스') && hippocampusAutoActive;
            statusText = hasHippocampus ? '⚡ [히포캠포스] 나침반 가속으로 대어를 낚아채는 중...' : '물고기가 미끼 주변을 서성이는 중...';
            actionBtnHtml = `<button onclick="earlyClickAlert()" style="width: 100%; padding: 13px; background: #64748b; border: none; border-radius: 12px; color: white; font-size: 0.95rem; font-weight: 700; cursor: pointer; word-break: keep-all;">대어 기다리는 중... (누르면 취소)</button>`;
        } else if (fishingStep === 'bite') {
            statusText = '지금이다! 0.75초 안에 낚아채세요!!';
            actionBtnHtml = `<button onclick="hookFish()" style="width: 100%; padding: 18px; background: linear-gradient(135deg, #ef4444, #b91c1c); border: none; border-radius: 14px; color: white; font-size: 1.4rem; font-weight: 900; cursor: pointer; word-break: keep-all; box-shadow: 0 0 20px rgba(239,68,68,0.7); animation: fpRodStrainShake 0.15s infinite;">⚡ 지금 챔질하기!! ⚡</button>`;
        }
    }
    return { statusText, actionBtnHtml };
}

// 🎒 물고기 보관고 HTML 생성 함수
function renderInventoryHtml() {
    let inventoryHtml = "";
    if (!fishingData.fish_inventory || Object.keys(fishingData.fish_inventory).length === 0) {
        return `<p class="empty-msg" style="padding: 10px 0;">보관 중인 물고기가 없습니다. 낚시를 시작해보세요!</p>`;
    }
    let hasCarp = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('등용문 잉어');
    let hasMakara = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마카라');

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
    return inventoryHtml;
}

// 🌊 마카라 신화 부스터 카드 렌더링 함수
function renderMakaraBoosterCardHtml() {
    let hasMakara = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마카라');
    if (!hasMakara) return "";
    let mythicBonusStr = (fishingData.makara_bonus_chance || 0).toFixed(2);
    let primordialBonusStr = (fishingData.makara_primordial_bonus || 0).toFixed(2);
    let primordialText = fishingData.rod_level >= 11 
        ? `<span style="color: #047857; font-weight: 800; font-size: 0.76rem; margin-left: 6px;">(태초 +${primordialBonusStr}%)</span>` 
        : '';
    return `
        <div id="makaraBoosterCard" style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 10px; padding: 8px 10px; text-align: center; grid-column: span 2;">
            <span style="color: #047857; font-weight: 700; font-size: 0.76rem;">🌊 마카라 신화 부스터:</span> 
            <b id="makaraBoosterValue" style="color: #065f46; font-size: 0.9rem; margin-left: 4px;">+${mythicBonusStr}%</b>
            ${primordialText}
        </div>
    `;
}

// 🎯 화면 스크롤 흔들림 없는 부드러운 인플레이스 스테이지 갱신 함수
function updateFishingStageOnly() {
    let stageWrapper = document.getElementById('fishingStageWrapper');
    if (!stageWrapper) {
        let contentArea = document.getElementById("contentArea");
        if (contentArea) renderFishingView(contentArea);
        return;
    }

    let currentSpotKey = fishingData.current_spot || '연못';
    let currentSpot = FISHING_SPOTS[currentSpotKey] || FISHING_SPOTS['연못'];
    let currentRod = ROD_TIERS[fishingData.rod_level] || ROD_TIERS[1];
    let { statusText, actionBtnHtml } = getStageStatusAndButton();

    stageWrapper.innerHTML = renderAnimatedFishingStage(currentSpot, fishingStep, fishingData.rod_level, lastCaughtResult, currentRod, statusText, actionBtnHtml);

    let moneyEl = document.getElementById('fishingUserMoney');
    if (moneyEl) moneyEl.innerText = `${fishingData.money.toLocaleString()}원`;

    let coinsEl = document.getElementById('fishingSilverCoins');
    if (coinsEl) coinsEl.innerText = `${(fishingData.silver_coins || 0).toLocaleString()}개`;

    let compassEl = document.getElementById('fishingCompassFragments');
    if (compassEl) compassEl.innerText = `${(fishingData.compass_fragments || 0).toLocaleString()}개`;

    let makaraSlot = document.getElementById('makaraBoosterSlot');
    if (makaraSlot) {
        let hasMakara = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마카라');
        makaraSlot.style.display = hasMakara ? 'contents' : 'none';
        makaraSlot.innerHTML = renderMakaraBoosterCardHtml();
    }

    let invEl = document.getElementById('fishingInventoryArea');
    if (invEl) invEl.innerHTML = renderInventoryHtml();
}

function openCurseManager() {
    let hasJinmyeon = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('인면어');
    if (!hasJinmyeon) {
        alert("인면어 영물을 보유하고 있어야 저주 대상을 관리할 수 있습니다!");
        return;
    }
    closeAllModals();
    if (!playerList || playerList.length === 0) {
        playerList = ['실험체', '박병목', '김철수', '장민준', '손승환', '이승욱', '김병수', '김태용', '유진호'];
    }
    let currentTarget = fishingData.cursed_target || currentUser;
    let playerOptionsHtml = playerList.map(p => `<option value="${p}" ${p === currentTarget ? 'selected' : ''}>${p}</option>`).join('');
    
    let modalHtml = `
        <div id="curseModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2500;">
            <div style="background: white; width: 95%; max-width: 400px; padding: 22px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left; border-top: 6px solid #be185d;">
                <h3 style="margin-top: 0; color: #be185d; font-size: 1.15rem; font-weight: 900; display: flex; justify-content: space-between; align-items: center;">
                    <span>😈 인면어 저주 대상 관리</span>
                    <button onclick="document.getElementById('curseModal').remove();" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #64748b;">✕</button>
                </h3>
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.8rem; font-weight: 700; color: #334155;">저주를 내릴 대상 플레이어 선택:</label>
                    <select id="curseTargetSelect" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 4px; font-weight: 700;">
                        ${playerOptionsHtml}
                    </select>
                </div>
                <button onclick="applyCurseTarget()" style="width: 100%; background: #be185d; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; margin-bottom: 8px;">저주 대상 지정하기</button>
                <button onclick="document.getElementById('curseModal').remove();" style="width: 100%; background: #64748b; color: white; border: none; padding: 8px; border-radius: 8px; font-weight: 700; cursor: pointer;">닫기</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function applyCurseTarget() {
    let sel = document.getElementById('curseTargetSelect');
    if (!sel) return;
    let target = sel.value;
    fishingData.cursed_target = target;
    fishingData.curse_remaining_count = 3;
    await saveFishingData();
    closeAllModals();
    showFloatingAlert(`😈 [${target}]님에게 인면어의 저주(3회)를 걸었습니다!`);
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
}

async function renderFishingView(contentArea) {
    if (!contentArea) contentArea = document.getElementById("contentArea");
    if (!contentArea) return;

    let currentRod = ROD_TIERS[fishingData.rod_level] || ROD_TIERS[1];
    let nextRod = ROD_TIERS[fishingData.rod_level + 1];

    let { statusText, actionBtnHtml } = getStageStatusAndButton();

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

    // --- 📖 어류 도감 완성도 계산 및 렌더링 ---
    let totalFishCount = FISH_DATABASE.length; // 177종
    let discoveredFishList = FISH_DATABASE.filter(f => fishingData.fish_records && fishingData.fish_records[f.name]);
    let totalDiscoveredCount = discoveredFishList.length;
    let overallProgressPct = totalFishCount > 0 ? ((totalDiscoveredCount / totalFishCount) * 100).toFixed(1) : "0.0";

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

    let hasMakara = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마카라');

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

    let inventoryHtml = renderInventoryHtml();

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
                    <div id="fishingUserMoney" style="font-size: 1.2rem; font-weight: 800; color: #16a34a;">${fishingData.money.toLocaleString()}원</div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">현재 낚시대 (${fishingData.rod_level}/12단계)</div>
                    <div style="font-size: 1rem; font-weight: 700; color: var(--text-main);">${currentRod.name}</div>
                </div>
            </div>

            <!-- 🪙 해적 재화 & 마카라 버프 요약 (모바일 반응형 그리드) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-bottom: 16px;">
                <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 8px 10px; text-align: center;">
                    <div style="color: #92400e; font-weight: 700; font-size: 0.76rem;">🪙 은화 금고 (Lv.${fishingData.silver_coin_level || 0})</div>
                    <div id="fishingSilverCoins" style="color: #b45309; font-weight: 900; font-size: 0.92rem; margin-top: 2px;">${(fishingData.silver_coins || 0).toLocaleString()}개</div>
                </div>
                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 8px 10px; text-align: center;">
                    <div style="color: #166534; font-weight: 700; font-size: 0.76rem;">🧭 나침반 (Lv.${fishingData.compass_level || 0}/${MAX_COMPASS_LEVEL})</div>
                    <div id="fishingCompassFragments" style="color: #15803d; font-weight: 900; font-size: 0.92rem; margin-top: 2px;">${(fishingData.compass_fragments || 0).toLocaleString()}개</div>
                </div>
                <div id="makaraBoosterSlot" style="${hasMakara ? 'display: contents;' : 'display: none;'}">
                    ${renderMakaraBoosterCardHtml()}
                </div>
            </div>

            <!-- 🎮 실시간 그래픽 낚시 시뮬레이션 스테이지 래퍼 -->
            <div id="fishingStageWrapper">
                ${renderAnimatedFishingStage(currentSpot, fishingStep, fishingData.rod_level, lastCaughtResult, currentRod, statusText, actionBtnHtml)}
            </div>

            <!-- 낚싯대 업그레이드 버튼 -->
            <div style="margin-bottom: 20px;">
                ${nextRod ? `
                <button class="btn-primary" onclick="upgradeRod()" style="width: 100%; background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 12px 14px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; box-shadow: 0 4px 14px rgba(124,58,237,0.35);">
                    <div style="font-weight: 900; font-size: 1rem; color: #ffffff;">⬆️ 낚시대 업그레이드</div>
                    <div style="font-size: 0.8rem; color: #e9d5ff; font-weight: 700; word-break: keep-all;">
                        [${fishingData.rod_level + 1}단계] ${nextRod.name} · 비용: ${formatMoneyKorean(nextRod.price)}
                    </div>
                </button>
                ` : `<div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #7c3aed; padding: 10px; background: #f5f3ff; border-radius: 10px; border: 1px solid #ddd6fe;">👑 태초의 창조주 만렙 궁극의 낚시대를 보유하고 있습니다!</div>`}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
                <h3 style="font-size: 1rem; font-weight: 700; margin: 0;">🎒 잡은 물고기 보관고 (판매 가능)</h3>
                <button onclick="sellAllFish()" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">🚨 전체 판매</button>
            </div>
            <div id="fishingInventoryArea" style="display: flex; flex-direction: column; max-height: 220px; overflow-y: auto; margin-bottom: 16px;">
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
    let currentRod = ROD_TIERS[fishingData.rod_level];
    let hasBahamut = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('바하무트');
    let effectiveCost = hasBahamut ? 0 : currentRod.cost;

    if (fishingData.money < effectiveCost) {
        alert("비용이 부족합니다!");
        return;
    }

    lastCaughtResult = null; // 새 캐스팅 시작 시 이전 결과 리셋
    fishingData.money -= effectiveCost;
    await saveFishingData();

    let hasHippocampus = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('히포캠포스') && hippocampusAutoActive;

    if (hasHippocampus) {
        fishingStep = 'waiting';
        updateFishingStageOnly();

        let reduction = (fishingData.compass_level || 0) * 150;
        let hipWait = Math.max(500, 5000 - reduction);

        setTimeout(async () => {
            if (fishingStep === 'waiting') {
                let caught = executeCatchLogic();
                lastCaughtResult = caught;
                let sizeMsg = caught.displaySize || `${caught.size}자`;
                let priceMsg = caught.displayPrice ? ` [💰 ${caught.displayPrice}]` : '';
                showFloatingAlert(`🎣 [히포캠포스] 대어 낚시 성공! 🐟 ${caught.name} (${sizeMsg})${priceMsg}`);
                fishingStep = 'ready';
                await saveFishingData();
                updateFishingStageOnly();
            }
        }, hipWait);
    } else {
        fishingStep = 'waiting';
        updateFishingStageOnly();

        let reduction = (fishingData.compass_level || 0) * 150;
        let baseWait = Math.random() * 2500 + 1500;
        let waitTime = Math.max(500, baseWait - reduction);

        biteTimeout = setTimeout(() => {
            if (fishingStep !== 'waiting') return;
            fishingStep = 'bite';
            updateFishingStageOnly();

            biteTimer = setTimeout(() => {
                if (fishingStep === 'bite') {
                    fishingStep = 'ready';
                    lastCaughtResult = null;
                    showFloatingAlert("❌ 타이밍을 놓쳐 물고기가 도망쳤습니다!");
                    updateFishingStageOnly();
                }
            }, 750);

        }, waitTime);
    }
}

function earlyClickAlert() {
    if (fishingStep === 'waiting') {
        clearTimeout(biteTimeout);
        clearTimeout(biteTimer);
        fishingStep = 'ready';
        lastCaughtResult = null;
        showFloatingAlert("❌ 낚싯대를 일찍 거두어 물고기가 도망쳤습니다.");
        updateFishingStageOnly();
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
            lastCaughtResult = null;
            await saveFishingData();

            showTrashPopup(trashMsg);
            updateFishingStageOnly();
            return;
        }
    }

    let caught = executeCatchLogic();
    lastCaughtResult = caught; // 스테이지에 잡힌 물고기 점프 연출 표시
    let sizeMsg = caught.displaySize || `${caught.size}자`;
    let priceMsg = caught.displayPrice ? ` [💰 ${caught.displayPrice}]` : '';
    showFloatingAlert(`🎣 낚시 성공! 🐟 ${caught.name} (${sizeMsg})${priceMsg}`);
    
    fishingStep = 'ready';
    await saveFishingData();
    updateFishingStageOnly();
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
    // 1. 영물 무작위 랜덤 획득 (단일 롤 & 미해금 영물 중 균등 무작위 선정 - 0.05% 확률)
    let unobtainedBeasts = MYTHICAL_BEASTS.filter(b => !fishingData.unlocked_beasts.includes(b.name));
    if (unobtainedBeasts.length > 0) {
        if (Math.random() * 100 < 0.05) { // 0.05% 확률 (1/2,000)
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

    let primordialAddStr = "";
    if (fishingData.rod_level >= 11) {
        let primordialBonusAdd = mythicBonusAdd * 0.1;
        if (!fishingData.makara_primordial_bonus) fishingData.makara_primordial_bonus = 0;
        fishingData.makara_primordial_bonus += primordialBonusAdd;
        primordialAddStr = ` (태초 +${fishingData.makara_primordial_bonus.toFixed(2)}%)`;
    }

    sizesArr.splice(index, 1);
    if (sizesArr.length === 0) delete fishingData.fish_inventory[fishName];

    await saveFishingData();
    updateFishingStageOnly();

    showFloatingAlert(`🌊 마카라가 [${fishName}]을(를) 삼켰습니다! 신화 확률 +${mythicBonusAdd.toFixed(2)}% (현재 누적: +${fishingData.makara_bonus_chance.toFixed(2)}%${primordialAddStr})`);
}

async function sellFish(fishName, index) {
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
    updateFishingStageOnly();
}

async function sellAllFish() {
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
    updateFishingStageOnly();
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

// 🟢 전역 window 객체에 필요한 디스패처 함수만 엄격히 바인딩
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
window.toggleHippocampusAuto = toggleHippocampusAuto;
window.setRecordFilter = setRecordFilter;
window.setSpotFilter = setSpotFilter;
window.selectFishingSpot = selectFishingSpot;
window.openCurseManager = openCurseManager;
window.applyCurseTarget = applyCurseTarget;

})();