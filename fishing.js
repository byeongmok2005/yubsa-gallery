// fishing.js - 심해 낚시터 (어류 도감 가로 정렬 패치판)

let fishingData = { 
    money: 1000, 
    rod_level: 1, 
    fish_records: {}, 
    fish_inventory: {}, 
    unlocked_beasts: [], 
    cursed_target: null,
    curse_remaining_count: 0,
    makara_bonus_chance: 0,
    siren_streak: 0,
    bahamut_auto_active: true
};

let fishingStep = 'ready'; 
let autoFishingInterval = null; 
let biteTimeout = null;
let biteTimer = null; 
let floatingAlertText = ""; 
let playerList = [];
let hasUsedChance = false;

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
    10: { name: '🌟 우주 신들의 낚시대 (최종)', price: 600000000, cost: 100000 }
};

const FISH_DATABASE = [
    { name: '정어리', grade: '일반', minSize: 10, maxSize: 20, basePrice: 12, color: '#64748b' },
    { name: '고등어', grade: '일반', minSize: 20, maxSize: 40, basePrice: 25, color: '#64748b' },
    { name: '오징어', grade: '일반', minSize: 20, maxSize: 50, basePrice: 35, color: '#64748b' },
    { name: '멸치 떼', grade: '일반', minSize: 5, maxSize: 15, basePrice: 10, color: '#64748b' },
    { name: '전갱이', grade: '일반', minSize: 15, maxSize: 30, basePrice: 20, color: '#64748b' },
    { name: '학꽁치', grade: '일반', minSize: 20, maxSize: 35, basePrice: 28, color: '#64748b' },
    { name: '볼락', grade: '일반', minSize: 15, maxSize: 35, basePrice: 30, color: '#64748b' },
    { name: '양미리', grade: '일반', minSize: 10, maxSize: 25, basePrice: 15, color: '#64748b' },

    { name: '광어', grade: '희귀', minSize: 40, maxSize: 80, basePrice: 95, color: '#16a34a' },
    { name: '우럭', grade: '희귀', minSize: 30, maxSize: 60, basePrice: 110, color: '#16a34a' },
    { name: '참돔', grade: '희귀', minSize: 45, maxSize: 90, basePrice: 150, color: '#16a34a' },
    { name: '문어', grade: '희귀', minSize: 50, maxSize: 120, basePrice: 200, color: '#16a34a' },
    { name: '농어', grade: '희귀', minSize: 50, maxSize: 100, basePrice: 130, color: '#16a34a' },
    { name: '돌돔', grade: '희귀', minSize: 35, maxSize: 70, basePrice: 160, color: '#16a34a' },
    { name: '갑오징어', grade: '희귀', minSize: 25, maxSize: 55, basePrice: 120, color: '#16a34a' },
    { name: '감성돔', grade: '희귀', minSize: 40, maxSize: 75, basePrice: 175, color: '#16a34a' },
    { name: '능성어', grade: '희귀', minSize: 45, maxSize: 95, basePrice: 220, color: '#16a34a' },

    { name: '방어', grade: '영웅', minSize: 80, maxSize: 150, basePrice: 450, color: '#2563eb' },
    { name: '참치', grade: '영웅', minSize: 120, maxSize: 250, basePrice: 750, color: '#2563eb' },
    { name: '황새치', grade: '영웅', minSize: 150, maxSize: 300, basePrice: 1100, color: '#2563eb' },
    { name: '청상아리', grade: '영웅', minSize: 200, maxSize: 400, basePrice: 1600, color: '#2563eb' },
    { name: '다금바리', grade: '영웅', minSize: 70, maxSize: 130, basePrice: 850, color: '#2563eb' },
    { name: '대왕문어', grade: '영웅', minSize: 150, maxSize: 350, basePrice: 1300, color: '#2563eb' },
    { name: '흑기흉상어', grade: '영웅', minSize: 180, maxSize: 380, basePrice: 1450, color: '#2563eb' },
    { name: '홍어', grade: '영웅', minSize: 100, maxSize: 220, basePrice: 900, color: '#2563eb' },

    { name: '대왕오징어', grade: '전설', minSize: 350, maxSize: 700, basePrice: 4500, color: '#9333ea' },
    { name: '심해 아귀', grade: '전설', minSize: 400, maxSize: 800, basePrice: 7000, color: '#9333ea' },
    { name: '백상아리', grade: '전설', minSize: 450, maxSize: 900, basePrice: 11000, color: '#9333ea' },
    { name: '범고래', grade: '전설', minSize: 500, maxSize: 1000, basePrice: 15000, color: '#9333ea' },
    { name: '향고래', grade: '전설', minSize: 700, maxSize: 1400, basePrice: 22000, color: '#9333ea' },
    { name: '실러캔스', grade: '전설', minSize: 300, maxSize: 650, basePrice: 13500, color: '#9333ea' },

    { name: '메갈로돈', grade: '신화', minSize: 900, maxSize: 1800, basePrice: 150000, color: '#ea580c' },
    { name: '크라켄', grade: '신화', minSize: 2200, maxSize: 6000, basePrice: 800000, color: '#dc2626' },
    { name: '레비아탄', grade: '신화', minSize: 3000, maxSize: 9000, basePrice: 2000000, color: '#b91c1c' },
    { name: '아스피도켈론', grade: '신화', minSize: 4000, maxSize: 12000, basePrice: 5000000, color: '#7f1d1d' }
];

const MYTHICAL_BEASTS = [
    { name: '등용문 잉어', color: '#eab308', bgGradient: 'linear-gradient(135deg, #fefce8, #fef9c3)', desc: '거센 황하의 용문을 거슬러 오르면 용으로 변한다는 전설의 큰 잉어입니다.', ability: '✨ 보유 효과: 물고기를 판매할 때 등용문 잉어의 가호로 가격이 2배로 증가합니다!' },
    { name: '곤(鯤)', color: '#0284c7', bgGradient: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', desc: '북쪽 바다에 사는 수천 리 크기의 거대한 물고기입니다.', ability: '✨ 보유 효과: 물고기를 잡을 때 0.1% 확률로 거대한 새 "붕"으로 변신하며, 특수 등급(100만 원)으로 판매할 수 있습니다.' },
    { name: '인면어', color: '#be185d', bgGradient: 'linear-gradient(135deg, #fdf2f8, #fce7f3)', desc: '사람의 얼굴을 닮은 기괴한 물고기로, 야담 등에서 재앙을 예고하는 수중 생물입니다.', ability: '😈 특수 능력: 다른 플레이어에게 저주를 보내 10번의 낚시 동안 50% 확률로 쓰레기를 낚게 만듭니다.' },
    { name: '마카라', color: '#059669', bgGradient: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', desc: '코끼리나 악어의 머리에 물고기의 몸통과 꼬리를 지닌 신화 속 신성한 수수(水獸)입니다.', ability: '🌊 고유 영물 능력 (포식): 보관고에 있는 물고기를 삼켜 신화급 획득 확률을 높습니다. (일반 +0.01%, 희귀 +0.02%, 영웅 +0.05%, 전설 +0.1% / 신화 획득 시 초기화)' },
    { name: '마츠야', color: '#d97706', bgGradient: 'linear-gradient(135deg, #fffbeb, #fef3c7)', desc: '인류를 대홍수로부터 구하기 위해 최고신이 변신한 황금빛 뿔이 달린 거대한 물고기입니다.', ability: '🛡️ 고유 영물 (구원의 자비): 인면어의 저주나 시레인 크로인의 약탈 공격으로부터 자동으로 보호막을 쳐서 모든 피해를 완벽히 차단합니다!' },
    { name: '다곤', color: '#78716c', bgGradient: 'linear-gradient(135deg, #fafaf9, #f5f5f4)', desc: '상반신은 인간, 하반신은 물고기 모양을 한 고대 블레셋인들의 풍요와 농경의 신입니다.', ability: '🤝 고유 영물 (풍요와 거래/계약): 현재 보유 중인 물고기와 소지금을 상대방과 1:1로 직접 비교 및 확인 후 교환할 수 있으며, 다곤 계약 파트너와 낚시 시 물고기가 복사됩니다!' },
    { name: '바하무트', color: '#b45309', bgGradient: 'linear-gradient(135deg, #fff7ed, #ffedd5)', desc: '전 세계의 무게를 떠받치고 있다고 전해지는, 끝을 알 수 없을 정도로 거대한 물고기입니다.', ability: '🌍 고유 영물 (대지의 지탱): 낚시 비용이 완전히 0원이 되며, 낚시터를 켜두는 동안 30초마다 자동으로 대어를 낚아 올립니다!' },
    { name: '히포캠포스', color: '#0ea5e9', bgGradient: 'linear-gradient(135deg, #f0f9ff, #bae6fd)', desc: '말의 앞몸에 물고기의 꼬리가 달린 바다의 말입니다. 바다의 신의 전차를 끄는 영물입니다.', ability: '⚡ 고유 영물 (질주): 낚싯대를 던지면 기다릴 필요 없이 5초 안에 자동으로 대어를 잡아옵니다!' },
    { name: '익티오켄타우로스', color: '#7c3aed', bgGradient: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', desc: '상반신은 인간, 앞다리는 말, 뒷몸은 물고기 꼬리를 가진 신비로운 바다의 신들입니다.', ability: '👁️ 고유 영물 (심해의 지혜): 물고기 크기 10% 증가 보정과 함께, 미해금 영물들의 이름과 능력을 도감에서 미리 탐색하여 볼 수 있습니다!' },
    { name: '시레인 크로인', color: '#dc2626', bgGradient: 'linear-gradient(135deg, #fef2f2, #fee2e2)', desc: '평소에는 은빛의 작은 물고기 형태를 하다가, 어부들을 유혹한 뒤 순식간에 고래마저 삼키는 영물입니다.', ability: '🔥 고유 영물 (심해의 약탈): 물고기를 잡았을 때 일정 확률로 남의 최고 등급 물고기를 훔쳐 오며, 성공할 때마다 약탈 확률이 0.5%씩 영구 누적됩니다!' }
];

const GRADE_PRIORITY = { '특수': 7, '영물': 6, '신화': 5, '전설': 4, '영웅': 3, '희귀': 2, '일반': 1 };

async function initFishing() {
    if (!currentUser) return;

    let fetchedPlayers = new Set();

    const { data: usersData } = await supabaseClient
        .from('users')
        .select('nickname');
    if (usersData) {
        usersData.forEach(u => { if (u.nickname) fetchedPlayers.add(u.nickname); });
    }

    const { data: fishingUsersData } = await supabaseClient
        .from('user_fishing_data')
        .select('nickname');
    if (fishingUsersData) {
        fishingUsersData.forEach(u => { if (u.nickname) fetchedPlayers.add(u.nickname); });
    }

    playerList = Array.from(fetchedPlayers).filter(n => n !== currentUser);
    if (playerList.length === 0) {
        playerList = ['실험체', '김철수', '김병수', '장민준', '손승환', '이승욱', '김태용'];
    }

    const { data } = await supabaseClient
        .from('user_fishing_data')
        .select('*')
        .eq('nickname', currentUser)
        .maybeSingle();

    if (data) {
        let savedMoney = (data.money !== undefined && data.money >= 0) ? data.money : 1000;
        let savedRod = (data.rod_level !== undefined && data.rod_level >= 1) ? data.rod_level : 1;
        if (savedRod > 10) savedRod = 10;

        fishingData = {
            money: savedMoney,
            rod_level: savedRod,
            fish_records: data.fish_records || {},
            fish_inventory: data.fish_inventory || {},
            unlocked_beasts: data.unlocked_beasts || [],
            cursed_target: data.cursed_target !== undefined ? data.cursed_target : currentUser,
            curse_remaining_count: data.curse_remaining_count !== undefined ? data.curse_remaining_count : 0,
            makara_bonus_chance: data.makara_bonus_chance !== undefined ? data.makara_bonus_chance : 0,
            siren_streak: data.siren_streak !== undefined ? data.siren_streak : 0,
            bahamut_auto_active: true
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
            siren_streak: 0
        }]);
        fishingData = { money: 1000, rod_level: 1, fish_records: {}, fish_inventory: {}, unlocked_beasts: [], cursed_target: currentUser, curse_remaining_count: 0, makara_bonus_chance: 0, siren_streak: 0, bahamut_auto_active: true };
    }
    hasUsedChance = false;

    startBahamutAutoFishing();
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
        siren_streak: fishingData.siren_streak,
        updated_at: new Date()
    }], { onConflict: 'nickname' });

    if (error) {
        console.error("🚨 Supabase 낚시 데이터 저장 실패:", error.message);
    }
}

function startBahamutAutoFishing() {
    if (autoFishingInterval) clearInterval(autoFishingInterval);
    autoFishingInterval = setInterval(async () => {
        let hasBahamut = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('바하무트');
        if (!hasBahamut || !currentUser || !fishingData.bahamut_auto_active) return;

        executeCatchLogic();
        
        floatingAlertText = `🌍 [바하무트] 자동으로 대어를 낚아 올렸습니다!`;
        if (typeof renderFishingView === 'function' && document.getElementById("contentArea")) {
            renderFishingView(document.getElementById("contentArea"));
        }
        setTimeout(() => { floatingAlertText = ""; if (document.getElementById("contentArea")) renderFishingView(document.getElementById("contentArea")); }, 3000);
    }, 30000);
}

function toggleBahamutAuto() {
    fishingData.bahamut_auto_active = !fishingData.bahamut_auto_active;
    let statusMsg = fishingData.bahamut_auto_active ? "활성화 (30초마다 자동 낚시)" : "비활성화 (정지됨)";
    floatingAlertText = `🌍 바하무트 자동 사냥: ${statusMsg}`;
    
    let modal = document.getElementById('beastModal');
    if (modal) modal.remove();
    showBeastDetail('바하무트');

    renderFishingView(document.getElementById("contentArea"));
    setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 2500);
}

function showBeastDetail(beastName) {
    let beast = MYTHICAL_BEASTS.find(b => b.name === beastName);
    if (!beast) return;

    let isUnlocked = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes(beastName);
    let extraAction = "";

    if (!isUnlocked) {
        extraAction = `
            <div style="margin-top: 14px; background: #f1f5f9; padding: 10px; border-radius: 8px; text-align: center; color: #64748b; font-size: 0.85rem; font-weight: 700;">
                🔒 미해금 영물입니다. 낚시를 통해 해금하세요!
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
            extraAction = `
                <div style="margin-top: 12px; background: #ecfdf5; border: 1px solid #10b981; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #047857; font-weight: 700;">🌊 현재 마카라 포식 부스터 누적치</div>
                    <div style="font-size: 1.1rem; color: #065f46; font-weight: 900; margin-top: 2px;">+${currentBonusStr}% (신화 획득 확률 가산 중)</div>
                </div>
            `;
        } else if (beastName === '다곤') {
            extraAction = `
                <div style="margin-top: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; text-align: center;">
                    <button onclick="openTradeModal()" style="width: 100%; background: #78716c; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: 700; cursor: pointer; margin-bottom: 6px;">🤝 플레이어 물고기/자금 직거래</button>
                    <button onclick="openDagonContractModal()" style="width: 100%; background: #292524; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: 700; cursor: pointer;">📜 다곤 계약 맺기</button>
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
            let isAutoActive = fishingData.bahamut_auto_active;
            let btnBg = isAutoActive ? '#dc2626' : '#16a34a';
            let btnText = isAutoActive ? '⏹️ 바하무트 자동 사냥 끄기' : '▶️ 바하무트 자동 사냥 켜기';
            extraAction = `
                <div style="margin-top: 12px; background: #fff7ed; border: 1px solid #b45309; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #9a3412; font-weight: 700; margin-bottom: 6px;">상태: ${isAutoActive ? '자동 사냥 작동 중 (30초)' : '정지됨'}</div>
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

function openTradeModal() {
    let existingModal = document.getElementById('beastModal');
    if (existingModal) existingModal.remove();

    let myInventoryOptions = "";
    if (fishingData.fish_inventory) {
        for (let [fishName, sizes] of Object.entries(fishingData.fish_inventory)) {
            if (sizes && sizes.length > 0) {
                sizes.forEach((sz, idx) => {
                    myInventoryOptions += `<option value="${fishName}:${sz}">🐟 ${fishName} (${sz}cm)</option>`;
                });
            }
        }
    }
    if (!myInventoryOptions) myInventoryOptions = `<option value="">보관고에 물고기가 없습니다</option>`;

    let playerOptions = playerList.map(p => `<option value="${p}">${p}</option>`).join('');

    let modalHtml = `
        <div id="tradeModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000;">
            <div style="background: white; width: 90%; max-width: 440px; padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: left; border-top: 6px solid #78716c;">
                <h3 style="margin-top: 0; color: #78716c; font-size: 1.2rem; font-weight: 900;">🤝 다곤 양방향 안전 직거래</h3>
                <p style="font-size: 0.85rem; color: #475569; margin-bottom: 14px;">현재 보유 중인 물고기와 소지금을 상대방과 교환합니다. <b>양측 모두 최종 확인을 눌러야만 거래가 체결됩니다.</b></p>
                
                <div style="margin-bottom: 10px;">
                    <label style="font-size: 0.8rem; font-weight: 700; color: #334155;">거래할 상대 플레이어:</label>
                    <select id="tradeTargetPlayer" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 4px;">
                        ${playerOptions}
                    </select>
                </div>

                <div style="margin-bottom: 10px;">
                    <label style="font-size: 0.8rem; font-weight: 700; color: #334155;">내가 건낼 물고기 (보관고 선택):</label>
                    <select id="tradeMyFish" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 4px;">
                        <option value="">(물고기 없음)</option>
                        ${myInventoryOptions}
                    </select>
                </div>

                <div style="margin-bottom: 14px;">
                    <label style="font-size: 0.8rem; font-weight: 700; color: #334155;">내가 건낼 소지금 (원):</label>
                    <input type="number" id="tradeMyMoney" value="0" min="0" max="${fishingData.money}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 4px; box-sizing: border-box;">
                </div>

                <button onclick="requestTrade()" style="width: 100%; background: #0284c7; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; margin-bottom: 8px;">상대방에게 거래 제안 보내기</button>
                <button onclick="document.getElementById('tradeModal').remove()" style="width: 100%; background: #64748b; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">닫기</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function requestTrade() {
    let target = document.getElementById('tradeTargetPlayer').value;
    let fishVal = document.getElementById('tradeMyFish').value;
    let moneyVal = parseInt(document.getElementById('tradeMyMoney').value) || 0;

    if (moneyVal > fishingData.money) {
        alert("소지금이 부족합니다!");
        return;
    }

    document.getElementById('tradeModal').remove();
    showTradeConfirmationPopup(target, fishVal, moneyVal);
}

function showTradeConfirmationPopup(targetPlayer, fishVal, moneyVal) {
    let fishDesc = fishVal ? fishVal.replace(':', ' (') + 'cm)' : '없음';

    let popupHtml = `
        <div id="tradeConfirmModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2500;">
            <div style="background: white; width: 90%; max-width: 400px; padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); text-align: center; border-top: 6px solid #0284c7;">
                <h3 style="margin-top: 0; color: #0284c7; font-size: 1.1rem; font-weight: 900;">🤝 [다곤 직거래 제안 확인]</h3>
                <p style="font-size: 0.9rem; color: #334155; line-height: 1.5; margin: 14px 0;">
                    <b>[${targetPlayer}]</b> 님이 거래를 수락했습니다.<br>
                    - 내가 건내는 항목: <b>${fishDesc} / ${moneyVal.toLocaleString()}원</b><br><br>
                    양측 모두 최종 확인을 누르면 거래가 완료됩니다.
                </p>
                <div style="display: flex; gap: 10px;">
                    <button onclick="executeTrade('${fishVal}', ${moneyVal})" style="flex: 1; background: #16a34a; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">최종 확인 (거래 체결)</button>
                    <button onclick="cancelTrade()" style="flex: 1; background: #dc2626; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">취소 (거절)</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);
}

async function executeTrade(fishVal, moneyVal) {
    document.getElementById('tradeConfirmModal').remove();

    if (moneyVal > 0) {
        fishingData.money -= moneyVal;
    }

    if (fishVal) {
        let [fName, fSzStr] = fishVal.split(':');
        let fSz = parseInt(fSzStr);
        let arr = fishingData.fish_inventory[fName];
        if (arr) {
            let idx = arr.indexOf(fSz);
            if (idx > -1) {
                arr.splice(idx, 1);
                if (arr.length === 0) delete fishingData.fish_inventory[fName];
            }
        }
    }

    await saveFishingData();
    floatingAlertText = "🤝 다곤의 직거래가 안전하게 체결되었습니다!";
    renderFishingView(document.getElementById("contentArea"));
    setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 2500);
}

function cancelTrade() {
    document.getElementById('tradeConfirmModal').remove();
    floatingAlertText = "❌ 거래가 취소되었습니다.";
    renderFishingView(document.getElementById("contentArea"));
    setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 2500);
}

function openDagonContractModal() {
    let existingModal = document.getElementById('beastModal');
    if (existingModal) existingModal.remove();

    let playerOptions = playerList.map(p => `<option value="${p}">${p}</option>`).join('');

    let modalHtml = `
        <div id="dagonContractModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2500;">
            <div style="background: white; width: 90%; max-width: 400px; padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: left; border-top: 6px solid #292524;">
                <h3 style="margin-top: 0; color: #292524; font-size: 1.2rem; font-weight: 900;">📜 다곤 파트너 계약 체결</h3>
                <p style="font-size: 0.85rem; color: #475569; margin-bottom: 14px; line-height: 1.4;">
                    함께 낚시를 진행하며 물고기 복사 파밍 효과를 공유할 상대 플레이어를 선택하세요. (본인도 다곤을 보유해야 합니다)
                </p>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 0.8rem; font-weight: 700; color: #334155;">계약할 상대 플레이어:</label>
                    <select id="dagonPartnerSelect" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 6px; font-size: 0.95rem;">
                        ${playerOptions}
                    </select>
                </div>

                <button onclick="submitDagonContract()" style="width: 100%; background: #292524; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; margin-bottom: 8px;">계약 제안 보내기</button>
                <button onclick="document.getElementById('dagonContractModal').remove()" style="width: 100%; background: #64748b; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">닫기</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function submitDagonContract() {
    let partner = document.getElementById('dagonPartnerSelect').value;
    let modal = document.getElementById('dagonContractModal');
    if (modal) modal.remove();

    floatingAlertText = `📜 [${partner}] 님에게 다곤 파트너 계약 제안을 보냈습니다!`;
    renderFishingView(document.getElementById("contentArea"));
    setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 2500);
}

function openCurseManager() {
    let existingModal = document.getElementById('beastModal');
    if (existingModal) existingModal.remove();

    let targetStatusText = fishingData.cursed_target && fishingData.curse_remaining_count > 0
        ? `<b style="color: #be185d;">현재 저주 대상: [ ${fishingData.cursed_target} ] (남은 횟수: ${fishingData.curse_remaining_count}회)</b>` 
        : `<b style="color: #64748b;">현재 저주 대상: 없음 (자유 상태)</b>`;

    let playerListHtml = playerList.map(player => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; margin-bottom: 8px;">
            <span style="font-weight: 700; color: #1e293b;">👤 ${player}</span>
            <button onclick="sendCurseToPlayer('${player}')" style="background: #be185d; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer;">저주 보내기</button>
        </div>
    `).join('');

    let modalHtml = `
        <div id="curseModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1001;">
            <div style="background: white; width: 90%; max-width: 420px; padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: left; position: relative; border-top: 6px solid #be185d;">
                <h3 style="margin-top: 0; color: #be185d; font-size: 1.2rem; font-weight: 900;">😈 인면어 저주 대상 관리</h3>
                <div style="background: #fdf2f8; border: 1px solid #fbcfe8; padding: 10px; border-radius: 8px; margin-bottom: 14px; text-align: center; font-size: 0.9rem;">
                    ${targetStatusText}
                </div>
                <div style="margin-bottom: 14px;">
                    <button onclick="recallCurse()" style="width: 100%; background: #0284c7; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; margin-bottom: 10px;">🔄 저주 회수하기 (미배치 상태로 변경)</button>
                </div>
                <div style="font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px;">플레이어 목록 (한 번에 1명에게만 저주 가능):</div>
                <div style="max-height: 180px; overflow-y: auto; margin-bottom: 16px;">
                    ${playerListHtml}
                </div>
                <button onclick="document.getElementById('curseModal').remove()" style="width: 100%; background: #64748b; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">닫기</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function sendCurseToPlayer(playerName) {
    fishingData.cursed_target = playerName;
    fishingData.curse_remaining_count = 10;
    await saveFishingData();
    
    floatingAlertText = `[${playerName}]에게 저주 부여 (10회 지속)`;
    renderFishingView(document.getElementById("contentArea"));
    setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 2500);

    document.getElementById('curseModal').remove();
    showBeastDetail('인면어');
}

async function recallCurse() {
    if (!fishingData.cursed_target) return;
    let prevTarget = fishingData.cursed_target;
    fishingData.cursed_target = null;
    fishingData.curse_remaining_count = 0;
    await saveFishingData();

    floatingAlertText = `[${prevTarget}]의 저주 회수 완료`;
    renderFishingView(document.getElementById("contentArea"));
    setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 2500);

    document.getElementById('curseModal').remove();
    showBeastDetail('인면어');
}

async function claimChance() {
    let currentCost = ROD_TIERS[fishingData.rod_level].cost;
    let fishName = '길냥이의 물고기';
    
    if (!fishingData.fish_inventory[fishName]) {
        fishingData.fish_inventory[fishName] = [];
    }
    fishingData.fish_inventory[fishName].push(currentCost);
    
    await saveFishingData();
    
    floatingAlertText = "길냥이의 물고기를 뺏었습니다.";
    renderFishingView(document.getElementById("contentArea"));
    setTimeout(() => {
        floatingAlertText = "";
        renderFishingView(document.getElementById("contentArea"));
    }, 2500);
}

function hasInventoryFish() {
    if (!fishingData.fish_inventory) return false;
    return Object.values(fishingData.fish_inventory).some(arr => arr && arr.length > 0);
}

async function renderFishingView(contentArea) {
    let currentRod = ROD_TIERS[fishingData.rod_level];
    let nextRod = ROD_TIERS[fishingData.rod_level + 1];

    let actionBtnHtml = "";
    let statusText = "";
    let statusColor = "#0369a1";

    let curseWarningBanner = "";
    let hasMatsuya = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마츠야');
    let isCursedOnMe = (fishingData.cursed_target === currentUser && fishingData.curse_remaining_count > 0);

    if (isCursedOnMe) {
        if (hasMatsuya) {
            curseWarningBanner = `
                <div style="background: #fefce8; border: 2px solid #eab308; color: #854d0e; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 0.85rem; font-weight: 700; text-align: center; box-shadow: 0 4px 10px rgba(234, 179, 8, 0.15);">
                    🛡️ [마츠야의 구원 활성] 마츠야가 저주로 인한 모든 피해를 완벽히 차단 중입니다!
                </div>
            `;
        } else {
            curseWarningBanner = `
                <div style="background: #fef2f2; border: 2px solid #ef4444; color: #991b1b; padding: 10px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 0.85rem; font-weight: 700; text-align: center; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.15);">
                    ⚠️ 인면어의 저주를 받아 재앙이 예고되고 있습니다. (남은 저주 횟수: ${fishingData.curse_remaining_count}회)
                </div>
            `;
        }
    }

    let hasBahamut = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('바하무트');
    let effectiveCost = hasBahamut ? 0 : currentRod.cost;

    let isBankrupt = (fishingData.money < effectiveCost && !hasInventoryFish() && fishingStep === 'ready');

    if (isBankrupt) {
        statusText = '소지금이 부족하여 낚시를 할 수 없습니다... 기회를 노려보세요!';
        statusColor = '#d97706';
        actionBtnHtml = `<button class="btn-primary" onclick="claimChance()" style="padding: 16px; font-size: 1.1rem; background: linear-gradient(135deg, #facc15, #eab308); color: #713f12; font-weight: 900; box-shadow: 0 4px 12px rgba(234, 179, 8, 0.3);">기회</button>`;
    } else {
        if (fishingStep === 'ready') {
            if (hasBahamut) {
                statusText = '🌍 [바하무트의 지탱] 낚시 비용 무료 상태!';
                actionBtnHtml = `<button class="btn-primary" onclick="startCast()" style="padding: 16px; font-size: 1.1rem; background: linear-gradient(135deg, #0369a1, #0284c7, #0f172a); color: #f0f9ff; font-weight: 800; border: 1px solid #38bdf8; box-shadow: 0 4px 12px rgba(3, 105, 161, 0.3);">🌟 바하무트의 신성한 낚싯대 던지기 (비용: 0원)</button>`;
            } else {
                statusText = '광활한 심해에서 대어를 노려보세요!';
                actionBtnHtml = `<button class="btn-primary" onclick="startCast()" style="padding: 16px; font-size: 1.1rem; background: linear-gradient(135deg, #0284c7, #0369a1);">🎣 낚싯대 던지기 (비용: ${currentRod.cost.toLocaleString()}원)</button>`;
            }
        } else if (fishingStep === 'waiting') {
            let hasHippocampus = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('히포캠포스');
            statusText = hasHippocampus ? '⚡ [히포캠포스] 파도를 가르며 대어를 낚아채는 중...' : '물고기가 미끼 주변을 서성이는 중...';
            actionBtnHtml = `<button onclick="earlyClickAlert()" style="width: 100%; padding: 16px; background: #64748b; border: none; border-radius: 12px; color: white; font-size: 1.1rem; font-weight: 700; cursor: pointer;">대어 기다리는 중... (누르면 취소)</button>`;
        } else if (fishingStep === 'bite') {
            statusText = '지금이다! 0.75초 안에 잡으세요!!';
            statusColor = '#dc2626';
            actionBtnHtml = `<button onclick="hookFish()" style="width: 100%; padding: 24px; background: linear-gradient(135deg, #ef4444, #b91c1c); border: none; border-radius: 16px; color: white; font-size: 1.6rem; font-weight: 900; cursor: pointer; box-shadow: 0 8px 20px rgba(239, 68, 68, 0.5);">⚡ 지금이니!!! ⚡</button>`;
        }
    }

    let floatingAlertHtml = "";
    if (floatingAlertText) {
        floatingAlertHtml = `
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(15, 23, 42, 0.95); color: white; padding: 14px 24px; border-radius: 12px; font-size: 1.05rem; font-weight: 800; z-index: 10; box-shadow: 0 10px 25px rgba(0,0,0,0.3); pointer-events: none; text-align: center; border: 2px solid #38bdf8;">
                ${floatingAlertText}
            </div>
        `;
    }

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
            
            sizesArr.forEach((size, index) => {
                let calculatedPrice = 0;
                if (fishName === '붕') {
                    calculatedPrice = 1000000;
                } else if (fishName === '길냥이의 물고기') {
                    calculatedPrice = size;
                } else {
                    let baseUnit = baseFish ? baseFish.basePrice : 20;
                    calculatedPrice = Math.floor(baseUnit * (size / 10));
                }
                
                let finalPrice = (hasCarp && fishName !== '붕' && fishName !== '길냥이의 물고기') ? calculatedPrice * 2 : calculatedPrice; 
                let carpBadge = (hasCarp && fishName !== '붕' && fishName !== '길냥이의 물고기') ? `<span style="color: #d97706; font-size: 0.7rem; font-weight: 800; background: #fef3c7; padding: 2px 5px; border-radius: 4px; margin-left: 4px;">✨등용문 2배</span>` : ``;
                
                inventoryHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--border-color); border-left: 5px solid ${color}; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;">
                        <div>
                            <span style="font-weight: 700; font-size: 0.95rem;">${icon} ${fishName} (${size}cm) <span style="font-size: 0.75rem; color: ${color}; font-weight: 800;">[${grade}]</span>${carpBadge}</span>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">판매가: <b style="color: #16a34a;">${finalPrice.toLocaleString()}원</b></div>
                        </div>
                        <div style="display: flex; gap: 6px;">
                            <button class="btn-back" onclick="feedMakara('${fishName}', ${index})" style="font-size: 0.8rem; padding: 6px 10px; background: #ecfdf5; color: #047857; font-weight: 700;">🌊 마카라 주기</button>
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

    // 💡 [수정됨] 어류 도감 리스트 카드형 가로 정렬 및 줄바꿈 방지 적용
    let recordsHtml = "";
    if (sortedRecords.length === 0) {
        recordsHtml = `<p class="empty-msg" style="padding: 10px 0;">아직 등록된 어류 도감이 없습니다.</p>`;
    } else {
        sortedRecords.forEach(([fishName, record]) => {
            let icon = fishName === '붕' ? '🦅' : '🐟';
            let color = fishName === '붕' ? '#d946ef' : (FISH_DATABASE.find(f => f.name === fishName)?.color || '#64748b');
            recordsHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--border-color); border-left: 5px solid ${color}; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; font-size: 0.9rem; white-space: nowrap;">
                    <span style="font-weight: 700; color: #1e293b;">${icon} ${fishName} <span style="color: ${color}; font-weight: 800; margin-left: 4px;">[${record.grade}]</span></span>
                    <span style="color: #475569;">역대 최고 기록: <b style="color: var(--accent);">${record.maxSize}cm</b></span>
                </div>
            `;
        });
    }

    let beastsHtml = "";
    MYTHICAL_BEASTS.forEach(beast => {
        let isUnlocked = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes(beast.name);
        if (isUnlocked) {
            beastsHtml += `
                <div style="background: ${beast.bgGradient}; border: 2px solid ${beast.color}; border-radius: 10px; padding: 12px; margin-bottom: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 900; font-size: 1rem; color: ${beast.color};">✨ [영물 해금완료] ${beast.name}</span>
                        <button onclick="showBeastDetail('${beast.name}')" style="background: ${beast.color}; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">상세 보기</button>
                    </div>
                    <div style="font-size: 0.8rem; color: #334155; line-height: 1.4;">${beast.desc}</div>
                </div>
            `;
        } else {
            beastsHtml += `
                <div style="background: #f1f5f9; border: 2px dashed #94a3b8; border-radius: 10px; padding: 12px; margin-bottom: 10px; opacity: 0.85;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 900; font-size: 1rem; color: #64748b;">👁️ [익티오 시야 탐색] ${beast.name} (미해금)</span>
                        <button onclick="showBeastDetail('${beast.name}')" style="background: #64748b; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">능력 미리보기</button>
                    </div>
                    <div style="font-size: 0.8rem; color: #64748b; line-height: 1.4;">${beast.desc}</div>
                </div>
            `;
        }
    });

    let makaraCurrentBonus = (fishingData.makara_bonus_chance || 0).toFixed(2);

    contentArea.innerHTML = `
        <div class="card">
            <div class="card-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span>🎣 인생 역전 심해 낚시터</span>
                <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
            </div>

            ${curseWarningBanner}

            <div style="display: flex; justify-content: space-around; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; margin-bottom: 16px; text-align: center;">
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">보유 금액</div>
                    <div style="font-size: 1.2rem; font-weight: 800; color: #16a34a;">${fishingData.money.toLocaleString()}원</div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">현재 낚시대 (${fishingData.rod_level}/10단계)</div>
                    <div style="font-size: 1rem; font-weight: 700; color: var(--text-main);">${currentRod.name}</div>
                </div>
            </div>

            <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                <span style="color: #047857; font-weight: 700;">🌊 마카라 신화 확률 부스터:</span>
                <span style="color: #065f46; font-weight: 900; font-size: 1rem;">+${makaraCurrentBonus}% 가산 중</span>
            </div>

            <div style="position: relative; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 16px; min-height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; word-break: keep-all;">
                ${floatingAlertHtml}
                <div id="fishingStatusText" style="font-size: 1rem; font-weight: 700; color: ${statusColor}; margin-bottom: 14px; word-break: keep-all; line-height: 1.4;">
                    ${statusText}
                </div>
                ${actionBtnHtml}
            </div>

            <div style="margin-bottom: 20px;">
                ${nextRod ? `
                <button class="btn-primary" onclick="upgradeRod()" style="width: 100%; background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 12px;">⬆️ 낚시대 업그레이드 (${nextRod.name} - ${nextRod.price.toLocaleString()}원)</button>
                ` : `<div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #7c3aed;">👑 만렙 궁극의 낚시대를 보유하고 있습니다!</div>`}
            </div>

            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">🎒 잡은 물고기 보관고 (판매 가능)</h3>
            <div style="display: flex; flex-direction: column; max-height: 200px; overflow-y: auto; margin-bottom: 16px;">
                ${inventoryHtml}
            </div>

            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">📖 일반 어류 도감</h3>
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
    let currentRod = ROD_TIERS[fishingData.rod_level];
    let hasBahamut = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('바하무트');
    let effectiveCost = hasBahamut ? 0 : currentRod.cost;

    if (fishingData.money < effectiveCost) {
        floatingAlertText = "비용이 부족합니다!";
        renderFishingView(document.getElementById("contentArea"));
        setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 1500);
        return;
    }

    fishingData.money -= effectiveCost;
    await saveFishingData();

    let hasHippocampus = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('히포캠포스');

    if (hasHippocampus) {
        fishingStep = 'waiting';
        floatingAlertText = "";
        statusText = "⚡ [히포캠포스] 파도를 가르며 대어를 낚아채는 중...";
        renderFishingView(document.getElementById("contentArea"));

        setTimeout(() => {
            if (fishingStep === 'waiting') {
                hookFishAutomatically();
            }
        }, 5000);
    } else {
        fishingStep = 'waiting';
        floatingAlertText = "";
        renderFishingView(document.getElementById("contentArea"));

        let waitTime = Math.random() * 2500 + 1500;
        biteTimeout = setTimeout(() => {
            if (fishingStep !== 'waiting') return;
            fishingStep = 'bite';
            renderFishingView(document.getElementById("contentArea"));

            biteTimer = setTimeout(() => {
                if (fishingStep === 'bite') {
                    fishingStep = 'ready';
                    floatingAlertText = "물고기가 도망쳤습니다...";
                    renderFishingView(document.getElementById("contentArea"));
                    setTimeout(() => { 
                        floatingAlertText = ""; 
                        if (fishingStep === 'ready') renderFishingView(document.getElementById("contentArea"));
                    }, 750);
                }
            }, 750);

        }, waitTime);
    }
}

async function hookFishAutomatically() {
    fishingStep = 'bite';
    hookFish();
}

function earlyClickAlert() {
    if (fishingStep === 'waiting') {
        clearTimeout(biteTimeout);
        clearTimeout(biteTimer);
        fishingStep = 'ready';
        floatingAlertText = "물고기가 아직 안 잡혔습니다!";
        renderFishingView(document.getElementById("contentArea"));
        setTimeout(() => { 
            floatingAlertText = ""; 
            if (fishingStep === 'ready') renderFishingView(document.getElementById("contentArea"));
        }, 750);
    }
}

function showTrashPopup(message) {
    let oldPopup = document.getElementById('trashPopupBox');
    if (oldPopup) oldPopup.remove();

    let popupHtml = `
        <div id="trashPopupBox" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; pointer-events: none;">
            <div style="background: #1e293b; color: white; padding: 20px 28px; border-radius: 12px; font-size: 1.05rem; font-weight: 700; box-shadow: 0 10px 25px rgba(0,0,0,0.4); text-align: center; border: 2px solid #ef4444; max-width: 90%;">
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

        if (fishingData.curse_remaining_count <= 0) {
            fishingData.cursed_target = null;
            floatingAlertText = "✨ 인면어의 저주가 완전히 해제되었습니다!";
            setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 2500);
        }

        if (Math.random() < 0.5) {
            let trashRoll = Math.random() * 100;
            let penalty = 0;
            let trashMsg = "";

            if (trashRoll < 80) {
                penalty = 1000;
                trashMsg = `일반 바다 쓰레기 (남은 저주: ${fishingData.curse_remaining_count}회)`;
            } else if (trashRoll < 95) {
                penalty = 10000;
                trashMsg = `큰 바다 쓰레기 (남은 저주: ${fishingData.curse_remaining_count}회)`;
            } else if (trashRoll < 99.9) {
                penalty = 100000;
                trashMsg = `포획금지 물고기 벌금 (남은 저주: ${fishingData.curse_remaining_count}회)`;
            } else {
                penalty = fishingData.money;
                trashMsg = `용왕의 머리카락 - 전재산 소멸! (남은 저주: ${fishingData.curse_remaining_count}회)`;
            }

            fishingData.money = Math.max(0, fishingData.money - penalty);
            fishingStep = 'ready';
            await saveFishingData();

            showTrashPopup(trashMsg);
            renderFishingView(document.getElementById("contentArea"));
            return;
        }
    }

    let hasSiren = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('시레인 크로인');
    let currentSirenChance = 0.01 + (fishingData.siren_streak * 0.005); 

    if (hasSiren && Math.random() < currentSirenChance) {
        fishingStep = 'ready';
        await showSirenChoiceModalForAllPlayers();
        return;
    }

    executeCatchLogic();
    fishingStep = 'ready';
    renderFishingView(document.getElementById("contentArea"));
}

async function showSirenChoiceModalForAllPlayers() {
    let existing = document.getElementById('sirenChoiceModal');
    if (existing) existing.remove();

    const { data: allUsersData } = await supabaseClient
        .from('user_fishing_data')
        .select('nickname, fish_records, unlocked_beasts');

    let playerRecordsMap = {};
    let playerMatsuyaMap = {};

    if (allUsersData) {
        allUsersData.forEach(row => {
            if (row.nickname !== currentUser) {
                let targetBeasts = row.unlocked_beasts || [];
                if (targetBeasts.includes('마츠야')) {
                    playerMatsuyaMap[row.nickname] = true;
                }

                let bestFish = null;
                let highestPrio = -1;
                if (row.fish_records) {
                    for (let [fName, record] of Object.entries(row.fish_records)) {
                        if (record && record.maxSize) {
                            let p = GRADE_PRIORITY[record.grade] || 1;
                            if (p > highestPrio) {
                                highestPrio = p;
                                bestFish = { name: fName, size: record.maxSize, grade: record.grade };
                            }
                        }
                    }
                }
                playerRecordsMap[row.nickname] = bestFish;
            }
        });
    }

    let candidatesListHtml = "";

    playerList.forEach(player => {
        let best = playerRecordsMap[player];
        let targetHasMatsuya = playerMatsuyaMap[player];

        if (best) {
            if (targetHasMatsuya) {
                candidatesListHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #fefce8; border: 1px solid #fde047; padding: 10px 12px; border-radius: 8px; margin-bottom: 8px;">
                        <div style="text-align: left; font-size: 0.85rem; color: #713f12;">
                            <b>[ ${player} ]</b> 님의 도감 최고 대어:<br>
                            <span style="color: #ca8a04; font-weight: 800;">${best.name} (${best.size}cm)</span><br>
                            <span style="font-size: 0.75rem; color: #a16207; font-weight: 700;">🛡️ 마츠야의 보호로 약탈 불가</span>
                        </div>
                        <button onclick="alertToDefenderMatsuya('${player}')" style="background: #ca8a04; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; white-space: nowrap;">약탈 시도</button>
                    </div>
                `;
            } else {
                candidatesListHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #fef2f2; border: 1px solid #fecaca; padding: 10px 12px; border-radius: 8px; margin-bottom: 8px;">
                        <div style="text-align: left; font-size: 0.85rem; color: #1e293b;">
                            <b>[ ${player} ]</b> 님의 도감 최고 대어:<br>
                            <span style="color: #dc2626; font-weight: 800;">${best.name} (${best.size}cm / [${best.grade}])</span>
                        </div>
                        <button onclick="confirmSirenStealFromRecord('${player}', '${best.name}', ${best.size}, '${best.grade}')" style="background: #dc2626; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; white-space: nowrap;">뺏기</button>
                    </div>
                `;
            }
        } else {
            candidatesListHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 8px; margin-bottom: 8px; opacity: 0.7;">
                    <div style="text-align: left; font-size: 0.85rem; color: #64748b;">
                        <b>[ ${player} ]</b>님은 도감에 등록된 물고기가 아직 없습니다.
                    </div>
                </div>
            `;
        }
    });

    let modalHtml = `
        <div id="sirenChoiceModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 3000;">
            <div style="background: white; width: 90%; max-width: 440px; padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); text-align: center; border-top: 6px solid #dc2626;">
                <h3 style="margin-top: 0; color: #dc2626; font-size: 1.2rem; font-weight: 900;">🔥 [시레인 크로인 기회 포착]</h3>
                <p style="font-size: 0.85rem; color: #334155; line-height: 1.4; margin-bottom: 12px;">
                    시레인의 매혹이 발동했습니다! 다른 플레이어의 도감 대어를 선택하여 뺏어올 수 있습니다.
                </p>
                <div style="max-height: 220px; overflow-y: auto; margin-bottom: 16px; padding-right: 4px;">
                    ${candidatesListHtml}
                </div>
                <button onclick="confirmNormalCatch()" style="width: 100%; background: #64748b; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">그냥 내 낚시하기</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function alertToDefenderMatsuya(targetPlayer) {
    let modal = document.getElementById('sirenChoiceModal');
    if (modal) modal.remove();

    let oldPopup = document.getElementById('defenderMatsuyaBox');
    if (oldPopup) oldPopup.remove();

    let popupHtml = `
        <div id="defenderMatsuyaBox" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 3500;">
            <div style="background: #1e293b; color: white; padding: 24px 32px; border-radius: 16px; font-size: 1.05rem; font-weight: 700; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; border: 2px solid #eab308; max-width: 90%;">
                🛡️ [마츠야가 약탈을 방어했습니다]<br>
                <span style="font-size: 0.95rem; color: #fef08a; font-weight: 500; margin-top: 8px; display: inline-block; line-height: 1.4;">
                    [${targetPlayer}] 님이 마츠야의 구원 보호막을 보유하고 있어, 시레인 크로인의 약탈 공격이 차단되었습니다! 물고기를 뺏어오지 못했습니다.
                </span>
                <button onclick="document.getElementById('defenderMatsuyaBox').remove(); executeCatchLogic(); renderFishingView(document.getElementById('contentArea'));" style="width: 100%; margin-top: 16px; background: #d97706; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">확인 (일반 낚시 진행)</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);
}

async function confirmSirenStealFromRecord(targetPlayer, fishName, fishSize, fishGrade) {
    let modal = document.getElementById('sirenChoiceModal');
    if (modal) modal.remove();

    if (!targetPlayer || !fishName) {
        alert("뺏어올 물고기가 없습니다. 일반 낚시를 진행합니다.");
        executeCatchLogic();
        renderFishingView(document.getElementById("contentArea"));
        return;
    }

    const { data: targetData } = await supabaseClient
        .from('user_fishing_data')
        .select('*')
        .eq('nickname', targetPlayer)
        .maybeSingle();

    if (targetData && targetData.fish_records) {
        let targetRecords = targetData.fish_records;
        if (targetRecords[fishName]) {
            delete targetRecords[fishName];
            
            await supabaseClient.from('user_fishing_data').update({
                fish_records: targetRecords,
                updated_at: new Date()
            }).eq('nickname', targetPlayer);
        }
    }

    fishingData.siren_streak = (fishingData.siren_streak || 0) + 1;

    if (!fishingData.fish_inventory[fishName]) {
        fishingData.fish_inventory[fishName] = [];
    }
    fishingData.fish_inventory[fishName].push(fishSize);

    if (!fishingData.fish_records[fishName]) {
        fishingData.fish_records[fishName] = { grade: fishGrade, maxSize: fishSize };
    } else if (fishSize > fishingData.fish_records[fishName].maxSize) {
        fishingData.fish_records[fishName].maxSize = fishSize;
    }

    await saveFishingData();

    showSirenPopup(`🔥 시레인 크로인이 [${targetPlayer}] 님의 도감 대어 [${fishName}](${fishSize}cm)를 완벽하게 강탈하여 내 보관고에 넣었습니다!<br>(상대방 도감에서는 해당 물고기가 소멸했습니다)`);
    renderFishingView(document.getElementById("contentArea"));
}

function confirmNormalCatch() {
    let modal = document.getElementById('sirenChoiceModal');
    if (modal) modal.remove();
    executeCatchLogic();
    renderFishingView(document.getElementById("contentArea"));
}

function executeCatchLogic() {
    let rand = Math.random() * 100;
    let rodLevel = fishingData.rod_level;
    let legendaryChance = 0.025 + (rodLevel - 1) * 1.108; 
    
    let baseMythicChance = (rodLevel >= 6) ? 0.01 * Math.pow(5, rodLevel - 6) : 0; 
    let makaraBonus = fishingData.makara_bonus_chance || 0;
    let mythicChance = baseMythicChance + makaraBonus;

    let heroChance = 3 + (rodLevel * 1.8); 
    let rareChance = 25 + (rodLevel * 0.5); 

    let selectedFish;
    if (rand < mythicChance) {
        let pool = FISH_DATABASE.filter(f => f.grade === '신화');
        selectedFish = pool[Math.floor(Math.random() * pool.length)];
        
        fishingData.makara_bonus_chance = 0;
        floatingAlertText = "🌟 [마카라 포식 대성공!] 신화급 획득으로 부스터가 초기화됩니다!";
        setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 3000);
    } else if (rand < mythicChance + legendaryChance) {
        let pool = FISH_DATABASE.filter(f => f.grade === '전설');
        selectedFish = pool[Math.floor(Math.random() * pool.length)];
    } else if (rand < mythicChance + legendaryChance + heroChance) {
        let pool = FISH_DATABASE.filter(f => f.grade === '영웅');
        selectedFish = pool[Math.floor(Math.random() * pool.length)];
    } else if (rand < mythicChance + legendaryChance + heroChance + rareChance) {
        let pool = FISH_DATABASE.filter(f => f.grade === '희귀');
        selectedFish = pool[Math.floor(Math.random() * pool.length)];
    } else {
        let pool = FISH_DATABASE.filter(f => f.grade === '일반');
        selectedFish = pool[Math.floor(Math.random() * pool.length)];
    }

    let sizeBonus = (rodLevel - 1) * 10;
    let fishSize = Math.floor(Math.random() * (selectedFish.maxSize - selectedFish.minSize + 1)) + selectedFish.minSize + sizeBonus;
    
    let hasIctio = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('익티오켄타우로스');
    if (hasIctio) {
        fishSize = Math.floor(fishSize * 1.1);
    }

    let fishName = selectedFish.name;

    let hasGon = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('곤(鯤)');
    if (hasGon && Math.random() < 0.001) { 
        fishName = '붕';
        fishSize = 5000; 
        floatingAlertText = "✨ ['곤'의 능력 발동!] 거대 새 '붕' 획득!";
        setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 2500);
    }

    if (!fishingData.fish_inventory[fishName]) {
        fishingData.fish_inventory[fishName] = [];
    }
    fishingData.fish_inventory[fishName].push(fishSize);

    let recordGrade = fishName === '붕' ? '특수' : selectedFish.grade;
    let recordSizeMax = fishName === '붕' ? 5000 : fishSize;

    if (!fishingData.fish_records[fishName]) {
        fishingData.fish_records[fishName] = { grade: recordGrade, maxSize: recordSizeMax };
    } else {
        if (recordSizeMax > fishingData.fish_records[fishName].maxSize) {
            fishingData.fish_records[fishName].maxSize = recordSizeMax;
        }
    }

    saveFishingData();

    if (fishName !== '붕' && selectedFish.grade !== '신화' && !floatingAlertText) {
        floatingAlertText = `🎉 [${selectedFish.grade}] ${selectedFish.name} (${fishSize}cm) 획득!`;
        setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 1500);
    }

    return { name: fishName, size: fishSize };
}

function showSirenPopup(message) {
    let oldPopup = document.getElementById('sirenPopupBox');
    if (oldPopup) oldPopup.remove();

    let popupHtml = `
        <div id="sirenPopupBox" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000;">
            <div style="background: #1e293b; color: white; padding: 24px 32px; border-radius: 16px; font-size: 1.05rem; font-weight: 700; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; border: 2px solid #dc2626; max-width: 90%;">
                🔥 [시레인 크로인 약탈 성공]<br>
                <span style="font-size: 0.95rem; color: #fca5a5; font-weight: 500; margin-top: 8px; display: inline-block; line-height: 1.4;">${message}</span>
                <button onclick="document.getElementById('sirenPopupBox').remove()" style="width: 100%; margin-top: 16px; background: #dc2626; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">확인</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);
}

async function feedMakara(fishName, index) {
    let sizesArr = fishingData.fish_inventory[fishName];
    if (!sizesArr || sizesArr[index] === undefined) return;

    let baseFish = FISH_DATABASE.find(f => f.name === fishName);
    let grade = fishName === '붕' ? '특수' : (fishName === '길냥이의 물고기' ? '특수' : (baseFish ? baseFish.grade : '일반'));

    let bonusAdd = 0.01;
    if (grade === '일반') bonusAdd = 0.01;
    else if (grade === '희귀') bonusAdd = 0.02;
    else if (grade === '영웅') bonusAdd = 0.05;
    else if (grade === '전설') bonusAdd = 0.1;
    else bonusAdd = 0.05;

    sizesArr.splice(index, 1);
    if (sizesArr.length === 0) delete fishingData.fish_inventory[fishName];

    if (!fishingData.makara_bonus_chance) fishingData.makara_bonus_chance = 0;
    fishingData.makara_bonus_chance += bonusAdd;

    await saveFishingData();

    floatingAlertText = `🌊 마카라가 [${fishName}]을(를) 삼켰습니다! (신화 확률 +${bonusAdd}%)`;
    renderFishingView(document.getElementById("contentArea"));
    setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 2000);
}

async function sellFish(fishName, index) {
    let sizesArr = fishingData.fish_inventory[fishName];
    if (!sizesArr || sizesArr[index] === undefined) return;

    let targetSize = sizesArr[index]; 
    let baseFish = FISH_DATABASE.find(f => f.name === fishName);
    
    let sellPrice = 0;
    if (fishName === '붕') {
        sellPrice = 1000000; 
    } else if (fishName === '길냥이의 물고기') {
        sellPrice = targetSize;
    } else {
        let baseUnit = baseFish ? baseFish.basePrice : 20;
        let calculatedBase = Math.floor(baseUnit * (targetSize / 10));
        let hasCarp = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('등용문 잉어');
        sellPrice = hasCarp ? calculatedBase * 2 : calculatedBase; 
    }

    let hasSiren = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('시레인 크로인');
    if (hasSiren && (fishName === '레비아탄' || fishName === '크라켄' || fishName === '아스피도켈론')) {
        sellPrice = Math.floor(sellPrice * 1.5);
    }

    sizesArr.splice(index, 1);
    if (sizesArr.length === 0) delete fishingData.fish_inventory[fishName];

    fishingData.money += sellPrice;
    await saveFishingData();
    
    floatingAlertText = `💰 ${fishName} 판매 완료 (${sellPrice.toLocaleString()}원)`;
    renderFishingView(document.getElementById("contentArea"));
    setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 1500);
}

async function upgradeRod() {
    let nextLevel = fishingData.rod_level + 1;
    let nextRod = ROD_TIERS[nextLevel];
    if (!nextRod) return;

    if (fishingData.money < nextRod.price) {
        floatingAlertText = "업그레이드 비용이 부족합니다!";
        renderFishingView(document.getElementById("contentArea"));
        setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 1500);
        return;
    }

    fishingData.money -= nextRod.price;
    fishingData.rod_level = nextLevel;
    await saveFishingData();
    
    floatingAlertText = `🎉 낚시대 업그레이드 완료 (${nextRod.name})`;
    renderFishingView(document.getElementById("contentArea"));
    setTimeout(() => { floatingAlertText = ""; renderFishingView(document.getElementById("contentArea")); }, 2000);
}