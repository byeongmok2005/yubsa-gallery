// fishing.js - 심해 낚시터 (직거래 승인 후 잔류 팝업 완벽 해결 최종 완성본)

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
    dagon_partner: null,
    trade_request: null
};

let fishingStep = 'ready'; 
let autoFishingInterval = null; 
let tradePollingInterval = null; 
let biteTimeout = null;
let biteTimer = null; 
let floatingAlertText = ""; 
let playerList = ['실험체', '박병목', '김철수', '장민준', '손승환', '이승욱', '김병수', '김태용']; 
let hasUsedChance = false;
let bahamutAutoActive = true; 

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
    { name: '시레인 크로인', color: '#dc2626', bgGradient: 'linear-gradient(135deg, #fef2f2, #fee2e2)', desc: '평소에는 은빛의 작은 물고기 형태를 하다가, 어부들을 유혹한 뒤 순식간에 고래마저 삼키는 영물입니다.', ability: '🔥 고유 영물 (심해의 약탈): 물고기를 잡을 때 일정 확률로 남의 최고 등급 물고기를 훔쳐 오며, 성공할 때마다 약탈 확률이 0.5%씩 영구 누적됩니다!' }
];

const GRADE_PRIORITY = { '특수': 7, '영물': 6, '신화': 5, '전설': 4, '영웅': 3, '희귀': 2, '일반': 1 };

async function initFishing() {
    if (!currentUser) return;

    const allowedTesters = ['박병목', '실험체'];
    if (!allowedTesters.includes(currentUser)) {
        alert("⚠️ 현재 낚시 시스템은 시험 운영 중입니다. 허용된 계정만 접근할 수 있습니다!");
        if (typeof navigateTo === 'function') {
            navigateTo('home');
        }
        return;
    }

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
            dagon_partner: data.dagon_partner || null,
            trade_request: data.trade_request || null
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
            siren_streak: 0,
            dagon_partner: null,
            trade_request: null
        }]);
        fishingData = { money: 1000, rod_level: 1, fish_records: {}, fish_inventory: {}, unlocked_beasts: [], cursed_target: currentUser, curse_remaining_count: 0, makara_bonus_chance: 0, siren_streak: 0, dagon_partner: null, trade_request: null };
    }
    hasUsedChance = false;

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
        siren_streak: fishingData.siren_streak,
        dagon_partner: fishingData.dagon_partner,
        trade_request: fishingData.trade_request,
        updated_at: new Date()
    }], { onConflict: 'nickname' });

    if (error) {
        console.error("🚨 Supabase 낚시 데이터 저장 실패:", error.message);
    }
}

// 실시간 폴링 (오직 'waiting' 상태일 때만 신규 팝업 자동 오픈)
function startTradePolling() {
    if (tradePollingInterval) clearInterval(tradePollingInterval);
    tradePollingInterval = setInterval(async () => {
        if (!currentUser) return;

        // 1. 나에게 온 제안 중 'waiting' 상태인 것만 자동으로 팝업 오픈
        const { data: myRow } = await supabaseClient
            .from('user_fishing_data')
            .select('trade_request')
            .eq('nickname', currentUser)
            .maybeSingle();

        if (myRow && myRow.trade_request && myRow.trade_request.target === currentUser) {
            let req = myRow.trade_request;
            if (req.status === 'waiting') {
                let currentModal = document.getElementById('dmTradeModal');
                if (!currentModal) {
                    openTradeModal();
                }
            }
        }

        // 2. 내가 보낸 제안의 상태 변화 감지 (완료 또는 거절)
        const { data: allRows } = await supabaseClient.from('user_fishing_data').select('nickname, trade_request');
        if (allRows) {
            for (let row of allRows) {
                if (row.trade_request && row.trade_request.sender === currentUser) {
                    let req = row.trade_request;
                    if (req.status === 'completed') {
                        let tInfo = req;
                        let myGaveFish = tInfo.gotFish ? tInfo.gotFish.replace(':', ' (') + 'cm)' : '물고기 없음';
                        let myGaveMoney = (tInfo.gotMoney || 0).toLocaleString() + '원';
                        let myGotFish = tInfo.gaveFish ? tInfo.gaveFish.replace(':', ' (') + 'cm)' : '물고기 없음';
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

// 화면 중앙에 직거래 결과 팝업 표시
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
            showFloatingAlert(`🌍 [바하무트] 자동으로 대어(${caught.name} ${caught.size}cm)를 낚아 올렸습니다!`);
        }
    }, 30000);
}

function showFloatingAlert(text) {
    floatingAlertText = text;
    let alertBox = document.getElementById('floatingAlertBox');
    if (alertBox) {
        alertBox.innerText = floatingAlertText;
        alertBox.style.display = 'block';
    }
    setTimeout(() => { 
        floatingAlertText = ""; 
        let box = document.getElementById('floatingAlertBox');
        if (box) box.style.display = 'none';
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
    let modals = document.querySelectorAll('#beastModal, #dmTradeModal, #inboxModal, #tradeRoomModal, #dagonContractModal, #curseModal, #sirenChoiceModal, #tradeResultModal');
    modals.forEach(m => m.remove());
}

function showBeastDetail(beastName) {
    closeAllModals();
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
            let partnerDisplay = fishingData.dagon_partner ? `<b style="color: #16a34a;">${fishingData.dagon_partner}</b>` : `<b style="color: #dc2626;">없음 (미체결)</b>`;
            extraAction = `
                <div style="margin-top: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 0.85rem; color: #334155; margin-bottom: 8px;">📜 현재 다곤 계약 파트너: ${partnerDisplay}</div>
                    <button onclick="openTradeModal()" style="width: 100%; background: #78716c; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; margin-bottom: 8px;">💬 직거래 제안 보내기</button>
                    <button onclick="openDagonContractModal()" style="width: 100%; background: #292524; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">📜 다곤 계약 맺기</button>
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

// 다곤 직거래 제안 센터 (상태에 따라 대기중 vs 진행중 분기 처리)
async function openTradeModal() {
    let hasDagon = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('다곤');
    if (!hasDagon) {
        alert("다곤 영물을 보유하고 있어야 직거래를 제안할 수 있습니다!");
        return;
    }

    closeAllModals();

    if (!playerList || playerList.length === 0) {
        playerList = ['실험체', '박병목', '김철수', '장민준', '손승환', '이승욱', '김병수', '김태용'];
    }

    let incomingRequest = null;
    try {
        const { data: myRow } = await supabaseClient
            .from('user_fishing_data')
            .select('trade_request')
            .eq('nickname', currentUser)
            .maybeSingle();
        if (myRow && myRow.trade_request && myRow.trade_request.target === currentUser) {
            incomingRequest = myRow.trade_request;
        }
    } catch (e) {}

    let contentHtml = "";

    if (incomingRequest && incomingRequest.status === 'waiting') {
        let senderName = incomingRequest.sender;
        let fishStr = incomingRequest.fishVal ? incomingRequest.fishVal.replace(':', ' (') + 'cm)' : '물고기 없음';
        let moneyStr = incomingRequest.moneyVal ? incomingRequest.moneyVal.toLocaleString() + '원' : '0원';

        contentHtml = `
            <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 10px; padding: 14px; margin-bottom: 14px;">
                <div style="font-size: 0.85rem; font-weight: 800; color: #be185d; margin-bottom: 8px; text-align: center;">📬 [${senderName}] 님으로부터 제안이 도착했습니다!</div>
                <div style="background: white; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; font-size: 0.8rem; color: #334155; margin-bottom: 4px;">보낸 물고기: <b>${fishStr}</b></div>
                <div style="background: white; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; font-size: 0.8rem; color: #16a34a; font-weight: 700; margin-bottom: 10px;">보낸 소지금: <b>${moneyStr}</b></div>
                <button onclick="openTradeRoom('${senderName}', '${incomingRequest.fishVal || ''}', ${incomingRequest.moneyVal || 0})" style="width: 100%; background: #16a34a; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 900; cursor: pointer; margin-bottom: 6px;">🚪 직거래 방 입장 및 교환 승인</button>
                <button onclick="rejectIncomingTrade()" style="width: 100%; background: #64748b; color: white; border: none; padding: 8px; border-radius: 8px; font-weight: 700; cursor: pointer;">거절하기</button>
            </div>
        `;
    } else if (incomingRequest && incomingRequest.status === 'picking') {
        let senderName = incomingRequest.sender;
        contentHtml = `
            <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 10px; padding: 14px; margin-bottom: 14px; text-align: center;">
                <div style="font-size: 0.85rem; font-weight: 800; color: #854d0e; margin-bottom: 8px;">✨ [직거래 진행 중]</div>
                <div style="font-size: 0.8rem; color: #713f12; margin-bottom: 12px;">[${senderName}] 님과 이미 직거래를 수락하여 교환이 진행 중입니다.</div>
                <button onclick="openTradeRoom('${senderName}', '${incomingRequest.fishVal || ''}', ${incomingRequest.moneyVal || 0})" style="width: 100%; background: #eab308; color: #713f12; border: none; padding: 10px; border-radius: 8px; font-weight: 900; cursor: pointer;">🚪 교환소 방으로 돌아가기</button>
            </div>
        `;
    } else {
        let myInventoryOptions = `<option value="">(물고기 선택 안 함)</option>`;
        if (fishingData.fish_inventory) {
            for (let [fishName, sizes] of Object.entries(fishingData.fish_inventory)) {
                if (sizes && sizes.length > 0) {
                    sizes.forEach((sz) => {
                        let valStr = `${fishName}:${sz}`;
                        myInventoryOptions += `<option value="${valStr}">🐟 ${fishName} (${sz}cm)</option>`;
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
    }

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

    let tradeDataJson = {
        sender: currentUser,
        target: target,
        fishVal: fishVal,
        moneyVal: moneyVal,
        status: 'waiting'
    };

    fishingData.trade_request = tradeDataJson;
    await saveFishingData();

    await supabaseClient.from('user_fishing_data').update({
        trade_request: tradeDataJson,
        updated_at: new Date()
    }).eq('nickname', target);

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
                await supabaseClient.from('user_fishing_data').update({
                    trade_request: null,
                    updated_at: new Date()
                }).eq('nickname', row.nickname);
            }
        });
    }

    fishingData.trade_request = null;
    await saveFishingData();

    closeAllModals();
    let currentScroll = window.scrollY;
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

async function rejectIncomingTrade() {
    const { data: myRow } = await supabaseClient.from('user_fishing_data').select('trade_request').eq('nickname', currentUser).maybeSingle();
    if (myRow && myRow.trade_request) {
        let senderName = myRow.trade_request.sender;
        await supabaseClient.from('user_fishing_data').update({
            trade_request: { ...myRow.trade_request, status: 'rejected' },
            updated_at: new Date()
        }).eq('nickname', senderName);
    }

    fishingData.trade_request = null;
    await saveFishingData();

    closeAllModals();
    showFloatingAlert("❌ 제안을 거절했습니다.");
    
    let currentScroll = window.scrollY;
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

// 승인 버튼을 누를 때 상대방 행과 내 행 모두 'picking'으로 업데이트하여 중복 팝업 원천 차단
async function openTradeRoom(partnerName, partnerFish, partnerMoney) {
    closeAllModals();

    // 1. 상대방(보낸 사람) 행 상태를 'picking'으로 변경
    const { data: partnerRow } = await supabaseClient
        .from('user_fishing_data')
        .select('trade_request')
        .eq('nickname', partnerName)
        .maybeSingle();

    if (partnerRow && partnerRow.trade_request) {
        partnerRow.trade_request.status = 'picking';
        await supabaseClient.from('user_fishing_data').update({
            trade_request: partnerRow.trade_request,
            updated_at: new Date()
        }).eq('nickname', partnerName);
    }

    // 2. 내 자신(수신자) 행 상태도 'picking'으로 변경하여 대기 팝업이 다시 안 뜨게 처리
    const { data: myRow } = await supabaseClient
        .from('user_fishing_data')
        .select('trade_request')
        .eq('nickname', currentUser)
        .maybeSingle();

    if (myRow && myRow.trade_request) {
        myRow.trade_request.status = 'picking';
        await supabaseClient.from('user_fishing_data').update({
            trade_request: myRow.trade_request,
            updated_at: new Date()
        }).eq('nickname', currentUser);
    }

    let myInventoryOptions = `<option value="">(내 보관고 물고기 선택)</option>`;
    if (fishingData.fish_inventory) {
        for (let [fishName, sizes] of Object.entries(fishingData.fish_inventory)) {
            if (sizes && sizes.length > 0) {
                sizes.forEach((sz) => {
                    let valStr = `${fishName}:${sz}`;
                    myInventoryOptions += `<option value="${valStr}">🐟 ${fishName} (${sz}cm)</option>`;
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
                    <div style="background: white; border: 1px solid #e2e8f0; padding: 6px; border-radius: 6px; font-size: 0.8rem; color: #1e293b; margin-bottom: 2px; text-align: center;">🐟 물고기: <b>${partnerFish ? partnerFish.replace(':', ' (') + 'cm)' : '없음'}</b></div>
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

    const { data: partnerRow } = await supabaseClient
        .from('user_fishing_data')
        .select('*')
        .eq('nickname', partnerName)
        .maybeSingle();

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
        let fSz = parseInt(fSzStr);
        if (fishingData.fish_inventory[fName]) {
            let idx = fishingData.fish_inventory[fName].indexOf(fSz);
            if (idx > -1) {
                fishingData.fish_inventory[fName].splice(idx, 1);
                if (fishingData.fish_inventory[fName].length === 0) delete fishingData.fish_inventory[fName];

                if (!partnerRow.fish_inventory) partnerRow.fish_inventory = {};
                if (!partnerRow.fish_inventory[fName]) partnerRow.fish_inventory[fName] = [];
                partnerRow.fish_inventory[fName].push(fSz);

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
        let fSz = parseInt(fSzStr);
        if (pInv[fName]) {
            let idx = pInv[fName].indexOf(fSz);
            if (idx > -1) {
                pInv[fName].splice(idx, 1);
                if (pInv[fName].length === 0) delete pInv[fName];

                if (!fishingData.fish_inventory[fName]) fishingData.fish_inventory[fName] = [];
                fishingData.fish_inventory[fName].push(fSz);

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

    let gaveFishStr = mySendFish ? mySendFish.replace(':', ' (') + 'cm)' : '물고기 없음';
    let gaveMoneyStr = mySendMoney.toLocaleString() + '원';
    let gotFishStr = partnerFish ? partnerFish.replace(':', ' (') + 'cm)' : '물고기 없음';
    let gotMoneyStr = partnerMoney.toLocaleString() + '원';

    let currentScroll = window.scrollY;
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);

    showTradeResultPopup(gaveFishStr, gaveMoneyStr, gotFishStr, gotMoneyStr);
}

// 낚시터 렌더링 뷰
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

    let dagonContractBanner = "";
    if (fishingData.dagon_partner) {
        dagonContractBanner = `
            <div style="background: #f8fafc; border: 1px solid #78716c; color: #292524; padding: 8px 12px; border-radius: 10px; margin-bottom: 12px; font-size: 0.85rem; font-weight: 700; text-align: center;">
                📜 다곤 계약 파트너: <b style="color: #0284c7;">[ ${fishingData.dagon_partner} ]</b> 님과 파밍 효과 공유 중
            </div>
        `;
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

            ${tradeStatusBanner}
            ${dagonContractBanner}
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
                <div id="floatingAlertBox" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(15, 23, 42, 0.95); color: white; padding: 14px 24px; border-radius: 12px; font-size: 1.05rem; font-weight: 800; z-index: 10; box-shadow: 0 10px 25px rgba(0,0,0,0.3); pointer-events: none; text-align: center; border: 2px solid #38bdf8;"></div>
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

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
                <h3 style="font-size: 1rem; font-weight: 700; margin: 0;">🎒 잡은 물고기 보관고 (판매 가능)</h3>
                <button onclick="sellAllFish()" style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">🚨 전체 판매</button>
            </div>
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
        statusText = "⚡ [히포캠포스] 파도를 가르며 대어를 낚아채는 중...";
        let contentArea = document.getElementById("contentArea");
        if (contentArea) renderFishingView(contentArea);
        window.scrollTo(0, currentScroll);

        setTimeout(() => {
            if (fishingStep === 'waiting') {
                let caught = executeCatchLogic();
                showFloatingAlert(`🎣 [히포캠포스] 대어 낚시 성공! 🐟 ${caught.name} (${caught.size}cm)`);
                fishingStep = 'ready';
                let contentArea = document.getElementById("contentArea");
                if (contentArea) renderFishingView(contentArea);
                window.scrollTo(0, currentScroll);
            }
        }, 5000);
    } else {
        fishingStep = 'waiting';
        let contentArea = document.getElementById("contentArea");
        if (contentArea) renderFishingView(contentArea);
        window.scrollTo(0, currentScroll);

        let waitTime = Math.random() * 2500 + 1500;
        biteTimeout = setTimeout(() => {
            if (fishingStep !== 'waiting') return;
            fishingStep = 'bite';
            let contentArea = document.getElementById("contentArea");
            if (contentArea) renderFishingView(contentArea);
            window.scrollTo(0, currentScroll);

            biteTimer = setTimeout(() => {
                if (fishingStep === 'bite') {
                    fishingStep = 'ready';
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
    let currentScroll = window.scrollY;

    let hasMatsuya = fishingData.unlocked_beasts && fishingData.unlocked_beasts.includes('마츠야');

    if (!hasMatsuya && fishingData.cursed_target === currentUser && fishingData.curse_remaining_count > 0) {
        fishingData.curse_remaining_count -= 1;

        if (fishingData.curse_remaining_count <= 0) {
            fishingData.cursed_target = null;
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
            let contentArea = document.getElementById("contentArea");
            if (contentArea) renderFishingView(contentArea);
            window.scrollTo(0, currentScroll);
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

    let caught = executeCatchLogic();
    showFloatingAlert(`🎣 낚시 성공! 🐟 ${caught.name} (${caught.size}cm)을(를) 낚았습니다!`);
    
    fishingStep = 'ready';
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
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
                <button onclick="let currentScroll=window.scrollY; document.getElementById('defenderMatsuyaBox').remove(); executeCatchLogic(); let contentArea = document.getElementById('contentArea'); if (contentArea) renderFishingView(contentArea); window.scrollTo(0, currentScroll);" style="width: 100%; margin-top: 16px; background: #d97706; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer;">확인 (일반 낚시 진행)</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);
}

async function confirmSirenStealFromRecord(targetPlayer, fishName, fishSize, fishGrade) {
    let currentScroll = window.scrollY;
    let modal = document.getElementById('sirenChoiceModal');
    if (modal) modal.remove();

    if (!targetPlayer || !fishName) {
        alert("뺏어올 물고기가 없습니다. 일반 낚시를 진행합니다.");
        executeCatchLogic();
        let contentArea = document.getElementById("contentArea");
        if (contentArea) renderFishingView(contentArea);
        window.scrollTo(0, currentScroll);
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
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

function confirmNormalCatch() {
    let currentScroll = window.scrollY;
    let modal = document.getElementById('sirenChoiceModal');
    if (modal) modal.remove();
    let caught = executeCatchLogic();
    showFloatingAlert(`🎣 낚시 성공! 🐟 ${caught.name} (${caught.size}cm)`);
    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
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

    if (fishingData.dagon_partner) {
        let partnerName = fishingData.dagon_partner;
        supabaseClient.from('user_fishing_data').select('*').eq('nickname', partnerName).maybeSingle().then(({ data: partnerRow }) => {
            if (partnerRow) {
                let pInv = partnerRow.fish_inventory || {};
                if (!pInv[fishName]) pInv[fishName] = [];
                pInv[fishName].push(fishSize);

                let pRec = partnerRow.fish_records || {};
                if (!pRec[fishName]) {
                    pRec[fishName] = { grade: recordGrade, maxSize: recordSizeMax };
                } else if (recordSizeMax > pRec[fishName].maxSize) {
                    pRec[fishName].maxSize = recordSizeMax;
                }

                supabaseClient.from('user_fishing_data').update({
                    fish_inventory: pInv,
                    fish_records: pRec,
                    updated_at: new Date()
                }).eq('nickname', partnerName);
            }
        });
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
    let currentScroll = window.scrollY;
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

    let contentArea = document.getElementById("contentArea");
    if (contentArea) renderFishingView(contentArea);
    window.scrollTo(0, currentScroll);
}

async function sellFish(fishName, index) {
    let currentScroll = window.scrollY;
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