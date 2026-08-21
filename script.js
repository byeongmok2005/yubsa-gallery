const SUPABASE_URL = 'https://jtjxhyxyxwdwyayrdxpm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0anhoeXh5eHdkd3lheXJkeHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MzUwMTUsImV4cCI6MjEwMjUxMTAxNX0._-BAMI-cT7awy3sPsH5LC7i_RYdvxNGlyBPcItqG6SM';
const INVITE_CODE = '2026'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = "";
let photos = [];
let commentsMap = {}; 
let repliesMap = {};
let members = [];
let userProfiles = {};
let isSignUpMode = false;
let currentView = 'home';
let selectedProfile = null;
let activeReplyCommentId = null;
let activeRoomId = null;
let activeRoomName = "";
let customRoomNames = {};
let dmMessages = [];
let myRooms = [];
let isCreatingRoom = false;
let unreadNotifications = [];

// 여행 앨범 관련 상태
let travelRooms = [];
let activeTravelRoomId = null;
let activeTravelRoomTitle = "";
let travelPhotos = [];
let isCreatingTravelRoom = false;

// 🔒 보안 및 관리자 2차 인증 상태 변수
let isAdminSessionVerified = false;

async function hashStringSHA256(str) {
    const utf8 = new TextEncoder().encode(str + "_yubsa_admin_security_salt_2026");
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getVerifiedSessionUser() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session || !session.user) return null;
        const userMeta = session.user.user_metadata;
        let nick = userMeta && userMeta.nickname ? userMeta.nickname : session.user.email.split('@')[0];
        return cleanName(nick);
    } catch (e) {
        return null;
    }
}

async function initApp() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session && session.user) {
        const userMeta = session.user.user_metadata;
        currentUser = cleanName(userMeta && userMeta.nickname ? userMeta.nickname : session.user.email.split('@')[0]);
        localStorage.setItem('yubsa_user', currentUser);
    } else {
        currentUser = "";
        localStorage.removeItem('yubsa_user');
    }

    await fetchMembers();
    await fetchUserProfiles();
    renderAuthArea();
    await renderSidebarMenu();
    if (!currentUser) {
        renderAuthScreen();
    } else {
        renderMainContent();
        fetchPhotos();
        fetchTravelRooms();
        setupRealtimeSubscriptions();
    }
}

async function renderSidebarMenu() {
    const menuList = document.getElementById("sidebarMenuList");
    if (!menuList) return;

    let realUser = await getVerifiedSessionUser();
    let adminMenuHtml = "";
    if (realUser === '박병목') {
        adminMenuHtml = `<li class="sidebar-menu-item" onclick="navigateTo('admin')">👑 관리자 페이지</li>`;
    }

    menuList.innerHTML = `
        <li class="sidebar-menu-item" onclick="navigateTo('home')">🏠 홈 / 갤러리</li>
        <li class="sidebar-menu-item" onclick="navigateTo('travel')">✈️ 여행 앨범</li>
        <li class="sidebar-menu-item" onclick="navigateTo('myProfile')">👤 내 프로필</li>
        <li class="sidebar-menu-item" onclick="navigateTo('friends')">👥 친구 관리</li>
        <li class="sidebar-menu-item" onclick="navigateTo('dm')">💬 DM</li>
        <li class="sidebar-menu-item" onclick="navigateTo('fishing')">🎣 심해 낚시터</li>
        <li class="sidebar-menu-item" onclick="navigateTo('featureRequest')">💡 기능 제안</li>
        <li class="sidebar-menu-item" onclick="navigateTo('inquiry')">📞 문의 하기</li>
        ${adminMenuHtml}
        <li class="sidebar-menu-item" onclick="navigateTo('settings')">⚙️ 설정</li>
    `;
}

function setupRealtimeSubscriptions() {
    const channelName = 'public-db-changes-' + (currentUser || 'guest');
    
    supabaseClient.removeAllChannels();

    supabaseClient
        .channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photos' }, payload => {
            if (payload.new && payload.new.uploader !== currentUser) {
                addNotification(`📸 [${payload.new.uploader}]님이 새로운 엽사를 올렸습니다!`);
            }
            fetchPhotos();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
            if (payload.new && payload.new.author !== currentUser) {
                addNotification(`💬 [${payload.new.author}]님이 댓글을 남겼습니다.`);
            }
            fetchComments();
            renderGalleryList();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'travel_photos' }, payload => {
            if (payload.new && payload.new.uploader !== currentUser) {
                addNotification(`✈️ 여행 앨범에 새로운 사진이 올라왔습니다!`);
            }
            if (activeTravelRoomId && Number(payload.new.room_id) === Number(activeTravelRoomId)) {
                fetchTravelPhotos(activeTravelRoomId);
            }
        })
        .subscribe();
}

function addNotification(text) {
    unreadNotifications.unshift({ text, time: new Date().toLocaleTimeString() });
    updateNotifBadge();
}

function updateNotifBadge() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;
    if (unreadNotifications.length > 0) {
        badge.innerText = unreadNotifications.length;
        badge.style.display = "block";
    } else {
        badge.style.display = "none";
    }
}

function openNotifications() {
    const existingModal = document.getElementById("notifModalOverlay");
    if (existingModal) existingModal.remove();

    let contentHtml = "";
    if (unreadNotifications.length === 0) {
        contentHtml = `<p style="text-align: center; color: var(--text-muted); padding: 20px 0; font-size: 0.9rem;">새로운 알림이 없습니다.</p>`;
    } else {
        contentHtml = unreadNotifications.map(n => `
            <div class="notification-item">
                <div style="font-weight: 700; color: var(--text-main); margin-bottom: 2px;">${n.text}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${n.time}</div>
            </div>
        `).join('');
    }

    const modalOverlay = document.createElement("div");
    modalOverlay.id = "notifModalOverlay";
    modalOverlay.className = "notification-modal-overlay";
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) closeNotificationModal();
    };

    modalOverlay.innerHTML = `
        <div class="notification-modal">
            <div class="notification-modal-title">
                <span>📢 새로운 알림 내역</span>
                <button onclick="closeNotificationModal()" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:var(--text-main);">✕</button>
            </div>
            <div class="notification-list-box">
                ${contentHtml}
            </div>
            <button class="btn-primary" onclick="clearNotifications()" style="margin-top: 0;">알림 모두 읽음 처리</button>
        </div>
    `;

    document.body.appendChild(modalOverlay);
}

function closeNotificationModal() {
    const modalOverlay = document.getElementById("notifModalOverlay");
    if (modalOverlay) modalOverlay.remove();
}

function clearNotifications() {
    unreadNotifications = [];
    updateNotifBadge();
    closeNotificationModal();
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
}

function navigateTo(view) {
    toggleSidebar();
    currentView = view;
    if (view === 'home') {
        selectedProfile = null;
    } else if (view === 'myProfile') {
        selectedProfile = currentUser;
        currentView = 'myProfile';
    } else if (view === 'dm') {
        activeRoomId = null;
        isCreatingRoom = false;
        fetchMyRooms();
    } else if (view === 'travel') {
        activeTravelRoomId = null;
        isCreatingTravelRoom = false;
        fetchTravelRooms();
    } else if (view === 'fishing') {
        currentView = 'fishing';
        initFishing().then(() => {
            if (currentView === 'fishing') {
                renderFishingView(document.getElementById("contentArea"));
            }
        }).catch(err => {
            console.error("낚시터 로딩 오류:", err);
            if (currentView === 'fishing') {
                renderFishingView(document.getElementById("contentArea"));
            }
        });
        return;
    }
    renderMainContent();
}

function cleanName(name) {
    if (!name) return "";
    let cleaned = name.replace(/[\[\]{}""''`]/g, '').trim();
    if (/^[가-힣a-zA-Z0-9]+$/.test(cleaned)) {
        return cleaned;
    }
    return "";
}

async function fetchMembers() {
    let set = new Set();
    ['박병목', '김병수', '김태용', '장민준'].forEach(m => set.add(m));
    if (currentUser) set.add(currentUser);

    const { data: userData } = await supabaseClient.from('users').select('nickname');
    if (userData) {
        userData.forEach(u => {
            let name = cleanName(u.nickname);
            if (name) set.add(name);
        });
    }

    const { data } = await supabaseClient.from('photos').select('target, uploader');
    if (data) {
        data.forEach(p => {
            if (p.target) {
                let targets = [];
                if (Array.isArray(p.target)) targets = p.target;
                else if (typeof p.target === 'string') {
                    try { targets = JSON.parse(p.target); } catch(e) { targets = p.target.split(','); }
                }
                if (Array.isArray(targets)) {
                    targets.forEach(t => {
                        let name = cleanName(t);
                        if (name) set.add(name);
                    });
                }
            }
            if (p.uploader) {
                let name = cleanName(p.uploader);
                if (name) set.add(name);
            }
        });
    }
    members = Array.from(set);
}

async function fetchUserProfiles() {
    const { data } = await supabaseClient.from('users').select('nickname, profile_img');
    if (data) {
        userProfiles = {};
        data.forEach(u => {
            if (u.nickname) {
                userProfiles[u.nickname] = u.profile_img || "";
            }
        });
    }
}

function getUserAvatarHtml(userName, size = '48px') {
    let imgUrl = userProfiles[userName];
    if (imgUrl) {
        return `<div style="width: ${size}; height: ${size}; border-radius: 50%; overflow: hidden; background: #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="프로필"></div>`;
    } else {
        return `
            <div style="width: ${size}; height: ${size}; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #64748b;">
                <svg width="${parseInt(size)*0.6}" height="${parseInt(size)*0.6}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </div>
        `;
    }
}

async function updateProfileImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    const fileName = `profile_${fileHash}_${Date.now()}.${fileExt}`;

    const { error: storageError } = await supabaseClient.storage.from('yubsa-bucket').upload(fileName, file);
    if (storageError) {
        alert("프로필 사진 업로드 실패: " + storageError.message);
        return;
    }

    const { data: publicUrlData } = supabaseClient.storage.from('yubsa-bucket').getPublicUrl(fileName);
    const imageUrl = publicUrlData.publicUrl;

    const { error: dbError } = await supabaseClient
        .from('users')
        .update({ profile_img: imageUrl })
        .eq('nickname', currentUser);

    if (dbError) {
        alert("프로필 저장 실패: " + dbError.message);
        return;
    }

    userProfiles[currentUser] = imageUrl;
    alert("프로필 사진이 변경되었습니다!");
    renderMainContent();
}

function getUploaderTotalLikes(userName) {
    let total = 0;
    photos.forEach(p => {
        if (p.uploader && p.uploader.toLowerCase() === userName.toLowerCase()) {
            total += (p.likes || 0);
        }
    });
    return total;
}

function getUserTotalComments(userName) {
    let total = 0;
    const allComments = Object.values(commentsMap).flat();
    allComments.forEach(c => {
        if (c.author && c.author.toLowerCase() === userName.toLowerCase()) {
            total += 1;
        }
    });
    const allReplies = Object.values(repliesMap).flat();
    allReplies.forEach(r => {
        if (r.author && r.author.toLowerCase() === userName.toLowerCase()) {
            total += 1;
        }
    });
    return total;
}

function getTierInfo(score) {
    if (score === 0) return { name: 'Iron', class: 'tier-iron', hex: '#475569', min: 0, max: 0 };
    if (score <= 10) return { name: 'Bronze', class: 'tier-bronze', hex: '#b45309', min: 1, max: 10 };
    if (score <= 20) return { name: 'Silver', class: 'tier-silver', hex: '#64748b', min: 11, max: 20 };
    if (score <= 30) return { name: 'Gold', class: 'tier-gold', hex: '#eab308', min: 21, max: 30 };
    if (score <= 40) return { name: 'Platinum', class: 'tier-platinum', hex: '#06b6d4', min: 31, max: 40 };
    if (score <= 50) return { name: 'Diamond', class: 'tier-diamond', hex: '#3b82f6', min: 41, max: 50 };
    if (score <= 60) return { name: 'Master', class: 'tier-master', hex: '#a855f7', min: 51, max: 60 };
    return { name: 'Challenger', class: 'tier-challenger', hex: '#ef4444', min: 61, max: 61 };
}

const tierRanks = { 'Iron': 0, 'Bronze': 1, 'Silver': 2, 'Gold': 3, 'Platinum': 4, 'Diamond': 5, 'Master': 6, 'Challenger': 7 };

function getCombinedTier(likes, comments) {
    let likeTier = getTierInfo(likes);
    let commentTier = getTierInfo(comments);
    
    if (tierRanks[likeTier.name] <= tierRanks[commentTier.name]) {
        return likeTier;
    } else {
        return commentTier;
    }
}

function renderAuthArea() {
    const authArea = document.getElementById("authArea");
    if (currentUser) {
        authArea.innerHTML = `
            <div class="user-welcome">
                <span><b>${currentUser}</b>님</span>
                <button class="auth-btn" onclick="logout()" style="width: auto; padding: 6px 12px; font-size: 0.8rem; background-color: #64748b; border:none; border-radius:6px; color:#fff; cursor:pointer;">로그아웃</button>
            </div>
        `;
    } else {
        authArea.innerHTML = `<span style="font-size:0.9rem; color:var(--text-muted); font-weight:600;">로그인 필요</span>`;
    }
}

function renderAuthScreen() {
    const contentArea = document.getElementById("contentArea");
    contentArea.innerHTML = `
        <div class="card" style="box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9; border-radius: 16px;">
            <h2 class="card-title" style="font-size: 1.25rem; font-weight: 700; color: #1e293b; letter-spacing: -0.025em; margin-bottom: 20px;">${isSignUpMode ? '✨ 회원가입' : '👋 로그인'}</h2>
            ${isSignUpMode ? `
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 6px; display: block;">이름</label>
                <input type="text" id="authNickname" placeholder="예: 홍길동" style="padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; transition: all 0.2s;">
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 6px; display: block;">초대 코드</label>
                <input type="password" id="inviteCode" placeholder="관리자에게 받은 코드 입력" style="padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem;">
            </div>` : ''}
            <div class="form-group" style="margin-bottom: 16px;">
                <label style="font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 6px; display: block;">아이디 (이메일 형태)</label>
                <input type="text" id="authEmail" placeholder="id@friend.com" style="padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem;">
            </div>
            <div class="form-group" style="margin-bottom: 24px;">
                <label style="font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 6px; display: block;">비밀번호</label>
                <input type="password" id="authPassword" placeholder="비밀번호 입력" style="padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem;">
            </div>
            <button class="btn-primary" onclick="handleAuth()" style="width: 100%; padding: 14px; border-radius: 10px; font-weight: 600; font-size: 1rem; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border: none; color: #fff; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3); transition: transform 0.1s;">${isSignUpMode ? '가입 완료하기' : '로그인하기'}</button>
            
            <div class="auth-toggle-text" style="text-align: center; margin-top: 20px; font-size: 0.9rem; color: #64748b;">
                ${isSignUpMode ? '이미 계정이 있으신가요? <span onclick="toggleAuthMode()" style="color: #2563eb; font-weight: 600; cursor: pointer; text-decoration: underline; margin-left: 4px;">로그인하기</span>' : '아직 계정이 없으신가요? <span onclick="toggleAuthMode()" style="color: #2563eb; font-weight: 600; cursor: pointer; text-decoration: underline; margin-left: 4px;">회원가입하기</span>'}
            </div>
        </div>
    `;
}

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    renderAuthScreen();
}

async function handleAuth() {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value.trim();

    if (!email || !password) { alert("아이디와 비밀번호를 모두 입력해주세요!"); return; }

    if (isSignUpMode) {
        const nickname = document.getElementById("authNickname").value.trim();
        const code = document.getElementById("inviteCode").value.trim();

        let cleanN = cleanName(nickname);
        if (!cleanN) { alert("올바른 이름을 입력해주세요!"); return; }
        if (code !== INVITE_CODE) { alert("초대 코드가 올바르지 않습니다!"); return; }

        // 🟢 [보완] 회원가입 전 닉네임 중복 여부 확인
        const { data: existingUser, error: checkError } = await supabaseClient
            .from('users')
            .select('nickname')
            .eq('nickname', cleanN)
            .maybeSingle();

        if (existingUser) {
            alert("이미 존재하는 이름(닉네임)입니다. 다른 닉네임을 사용해주세요.");
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email: email, password: password, options: { data: { nickname: cleanN } }
        });

        if (error) { alert("회원가입 실패: " + error.message); return; }

        await supabaseClient.from('users').insert([{ nickname: cleanN }]);
        sessionStorage.setItem('yubsa_welcome_user', cleanN);
        alert("회원가입 완료! 로그인되었습니다.");
        currentUser = cleanN;
    } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
        if (error) { alert("로그인 실패: " + error.message); return; }
        const userMeta = data.user.user_metadata;
        currentUser = cleanName(userMeta && userMeta.nickname ? userMeta.nickname : email.split('@')[0]);
        await supabaseClient.from('users').upsert([{ nickname: currentUser }], { onConflict: 'nickname' });
    }

    localStorage.setItem('yubsa_user', currentUser);
    await fetchUserProfiles();
    initApp();
}

async function logout() {
    await supabaseClient.auth.signOut();
    currentUser = "";
    localStorage.removeItem('yubsa_user');
    sessionStorage.removeItem('yubsa_welcome_user');
    initApp();
}

function photoHasTarget(photoTarget, profileName) {
    if (!photoTarget) return false;
    let targets = [];
    if (Array.isArray(photoTarget)) targets = photoTarget;
    else if (typeof photoTarget === 'string') {
        try { targets = JSON.parse(photoTarget); } catch(e) { targets = photoTarget.split(','); }
    }
    if (!Array.isArray(targets)) return false;
    return targets.some(t => cleanName(t).toLowerCase() === profileName.toLowerCase());
}

function renderMainContent() {
    const contentArea = document.getElementById("contentArea");

    if (currentView === 'myProfile') {
        renderMyProfileView(contentArea);
        return;
    } else if (currentView === 'userProfile') {
        renderTargetProfileView(contentArea);
        return;
    } else if (currentView === 'friends') {
        renderFriendsView(contentArea);
        return;
    } else if (currentView === 'dm') {
        renderDmView(contentArea);
        return;
    } else if (currentView === 'travel') {
        renderTravelView(contentArea);
        return;
    } else if (currentView === 'admin') {
        renderAdminView(contentArea);
        return;
    } else if (currentView === 'settings') {
        renderSettingsView(contentArea);
        return;
    } else if (currentView === 'featureRequest') {
        renderFeatureRequestView(contentArea);
        return;
    } else if (currentView === 'inquiry') {
        renderInquiryView(contentArea);
        return;
    } else if (currentView === 'fishing') {
        renderFishingView(contentArea);
        return;
    }

    let noticeHtml = "";
    const welcomeUser = sessionStorage.getItem('yubsa_welcome_user');
    if (welcomeUser) {
        noticeHtml = `
            <div class="notice-card">
                <div class="notice-title">📢 긴급 공지</div>
                <div class="notice-content">🎉 신규가입자 <b>${welcomeUser}</b> 님 환영합니다~!</div>
            </div>
        `;
    } else {
        noticeHtml = `
            <div class="notice-card">
                <div class="notice-title">📢 공지사항</div>
                <div class="notice-content">본인 엽사가 너무 수치스러워 신고해버릴거 같다~하는 사람은 <b>'박병목에게로'</b></div>
            </div>
        `;
    }

    let checkboxesHtml = "";
    members.forEach(m => {
        checkboxesHtml += `
            <label class="checkbox-label">
                <input type="checkbox" name="targetMember" value="${m}"> ${m}
            </label>
        `;
    });

    contentArea.innerHTML = `
        ${noticeHtml}

        <div class="card">
            <h2 class="card-title">새로운 엽사 올리기</h2>
            <div id="uploadAlert" style="display: none; background-color: #ffeeef; border: 1px solid #fecaca; color: var(--danger); padding: 10px 14px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; margin-bottom: 14px; text-align: center;"></div>
            
            <div class="form-group">
                <label>사진 이름 (제목)</label>
                <input type="text" id="photoTitle" placeholder="예: 레전드 엽사">
            </div>
            <div class="form-group">
                <label>사진 속 주인공 선택 (중복 선택 가능)</label>
                <div class="checkbox-group" id="targetCheckboxes">
                    ${checkboxesHtml}
                </div>
            </div>
            <div class="form-group">
                <label>이미지 파일</label>
                <input type="file" id="imageFile" accept="image/*">
            </div>
            <button class="btn-primary" onclick="uploadPhoto()">업로드하기</button>
        </div>

        <div class="card">
            <h2 class="card-title">전체 갤러리 (올린 순서)</h2>
            <div class="gallery-container" id="galleryContainer">
                <p class="empty-msg">불러오는 중...</p>
            </div>
        </div>
    `;
    renderGalleryList();
    updateNotifBadge();
}

// ================= 여행 사진룸 관련 로직 =================
async function fetchTravelRooms() {
    const { data, error } = await supabaseClient.from('travel_rooms').select('*').order('created_at', { ascending: false });
    if (!error && data) {
        travelRooms = data;
    }
    if (currentView === 'travel' && !activeTravelRoomId && !isCreatingTravelRoom) {
        renderTravelView(document.getElementById("contentArea"));
    }
}

async function fetchTravelPhotos(roomId) {
    const { data, error } = await supabaseClient.from('travel_photos').select('*').eq('room_id', roomId).order('created_at', { ascending: false });
    if (!error && data) {
        travelPhotos = data;
    }
    if (currentView === 'travel' && activeTravelRoomId) {
        renderTravelView(document.getElementById("contentArea"));
    }
}

function renderTravelView(contentArea) {
    if (activeTravelRoomId) {
        let photosHtml = "";
        travelPhotos.forEach(p => {
            let canDelete = (p.uploader === currentUser);
            photosHtml += `
                <div style="background: #fff; border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="width: 100%; aspect-ratio: 1/1; overflow: hidden; background: #f1f5f9;">
                        <img src="${p.url}" style="width: 100%; height: 100%; object-fit: cover;" alt="여행 사진">
                    </div>
                    <div style="padding: 10px; display: flex; flex-direction: column; gap: 4px;">
                        <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">📸 ${p.caption || '제목 없음'}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted);">
                            <span>올린이: <b>${p.uploader}</b></span>
                            ${canDelete ? `<button onclick="deleteTravelPhoto(${p.id}, '${p.url}')" style="background:none; border:none; color:var(--danger); cursor:pointer; font-weight:600;">삭제</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        contentArea.innerHTML = `
            <div class="card">
                <div class="card-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">✈️ ${activeTravelRoomTitle}</span>
                    <button class="btn-back" onclick="activeTravelRoomId = null; navigateTo('travel');">목록으로</button>
                </div>

                <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; margin-bottom: 20px;">
                    <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 10px;">✨ 이 여행방에 사진 올리기</h3>
                    <div class="form-group" style="margin-bottom: 10px;">
                        <input type="text" id="travelPhotoCaption" placeholder="사진 설명 또는 제목 (예: 첫째 날 맛집 앞에서)" style="padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.9rem;">
                    </div>
                    <div class="form-group" style="margin-bottom: 10px;">
                        <input type="file" id="travelPhotoFile" accept="image/*">
                    </div>
                    <button class="btn-primary" onclick="uploadTravelPhoto()" style="margin-top: 0; padding: 10px;">사진 업로드</button>
                </div>

                <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 12px;">🖼️ 여행 사진 갤러리</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                    ${photosHtml || '<p class="empty-msg" style="grid-column: span 2;">아직 업로드된 사진이 없습니다. 첫 사진을 올려보세요!</p>'}
                </div>
            </div>
        `;
    } else if (isCreatingTravelRoom) {
        contentArea.innerHTML = `
            <div class="card">
                <div class="card-title">
                    <span>새로운 여행방 만들기</span>
                    <button class="btn-back" onclick="isCreatingTravelRoom = false; renderMainContent();">취소</button>
                </div>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 15px;">친구들과 함께 공유할 여행 앨범 이름을 입력해주세요.</p>
                <div class="form-group">
                    <label>여행방 이름</label>
                    <input type="text" id="travelRoomTitleInput" placeholder="예: 2026 일본 오사카 여행 🇯🇵">
                </div>
                <button class="btn-primary" onclick="createTravelRoom()">방 만들기</button>
            </div>
        `;
    } else {
        let roomsHtml = "";
        travelRooms.forEach(room => {
            roomsHtml += `
                <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="openTravelRoom(${room.id}, '${room.title}')">
                    <div>
                        <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-main); margin-bottom: 4px;">✈️ ${room.title}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">만든 사람: <b>${room.creator}</b> | ${new Date(room.created_at).toLocaleDateString()}</div>
                    </div>
                    <span style="color: var(--accent); font-weight: 700; font-size: 0.9rem;">입장 →</span>
                </div>
            `;
        });

        contentArea.innerHTML = `
            <div class="card">
                <div class="card-title">
                    <span>✈️ 여행 사진 앨범</span>
                    <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
                </div>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px;">친구들과 다녀온 여행 사진을 모아두는 공간입니다. 자유롭게 방을 만들고 사진을 공유하세요!</p>
                
                <div style="display: flex; flex-direction: column; margin-bottom: 16px;">
                    ${roomsHtml || '<p class="empty-msg">개설된 여행방이 없습니다. 첫 방을 만들어보세요!</p>'}
                </div>

                <button class="btn-primary" onclick="isCreatingTravelRoom = true; renderMainContent();">+ 새로운 여행방 만들기</button>
            </div>
        `;
    }
}

async function createTravelRoom() {
    const input = document.getElementById("travelRoomTitleInput");
    const title = input ? input.value.trim() : "";
    if (!title) {
        alert("여행방 이름을 입력해주세요!");
        return;
    }

    const { data, error } = await supabaseClient.from('travel_rooms').insert([
        { title: title, creator: currentUser }
    ]).select();

    if (error) {
        alert("여행방 생성 실패: " + error.message);
        return;
    }

    alert("여행방이 생성되었습니다!");
    isCreatingTravelRoom = false;
    await fetchTravelRooms();
    if (data && data.length > 0) {
        openTravelRoom(data[0].id, data[0].title);
    }
}

async function openTravelRoom(roomId, roomTitle) {
    activeTravelRoomId = roomId;
    activeTravelRoomTitle = roomTitle;
    await fetchTravelPhotos(roomId);
}

async function uploadTravelPhoto() {
    const captionInput = document.getElementById("travelPhotoCaption");
    const fileInput = document.getElementById("travelPhotoFile");
    const caption = captionInput ? captionInput.value.trim() : "";

    if (!fileInput || fileInput.files.length === 0) {
        alert("업로드할 사진을 선택해주세요!");
        return;
    }

    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    const fileName = `travel_${fileHash}_${Date.now()}.${fileExt}`;

    const { error: storageError } = await supabaseClient.storage.from('yubsa-bucket').upload(fileName, file);
    if (storageError) {
        alert("사진 업로드 실패: " + storageError.message);
        return;
    }

    const { data: publicUrlData } = supabaseClient.storage.from('yubsa-bucket').getPublicUrl(fileName);
    const imageUrl = publicUrlData.publicUrl;

    const { error: dbError } = await supabaseClient.from('travel_photos').insert([
        { room_id: activeTravelRoomId, url: imageUrl, uploader: currentUser, caption: caption }
    ]);

    if (dbError) {
        alert("저장 실패: " + dbError.message);
        return;
    }

    if (captionInput) captionInput.value = "";
    fileInput.value = "";
    alert("여행 사진이 업로드되었습니다!");
    await fetchTravelPhotos(activeTravelRoomId);
}

async function deleteTravelPhoto(photoId, imageUrl) {
    if (!confirm("이 사진을 삭제하시겠습니까?")) return;
    const fileName = imageUrl.split('/').pop();
    await supabaseClient.storage.from('yubsa-bucket').remove([fileName]);
    await supabaseClient.from('travel_photos').delete().eq('id', photoId);
    alert("사진이 삭제되었습니다.");
    await fetchTravelPhotos(activeTravelRoomId);
}
// ========================================================

async function renderAdminView(contentArea) {
    const realUser = await getVerifiedSessionUser();
    if (realUser !== '박병목') {
        contentArea.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 3rem; margin-bottom: 12px;">🚫</div>
                <h2 style="color: var(--danger); font-size: 1.3rem; font-weight: 800; margin-bottom: 8px;">접근 불가 (보안 경고)</h2>
                <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 20px; line-height: 1.5;">
                    관리자(박병목) 계정으로 실제 로그인된 세션이 아닙니다.<br>
                    F12 콘솔 변수 조작 및 비인가 접근이 완벽히 차단되었습니다.
                </p>
                <button class="btn-primary" onclick="navigateTo('home')">홈으로 돌아가기</button>
            </div>
        `;
        return;
    }

    let masterHash = localStorage.getItem('yubsa_admin_master_hash');
    if (!isAdminSessionVerified) {
        openAdminPinModal(masterHash);
        return;
    }

    const [{ data: inquiriesData }, { data: reportsData }] = await Promise.all([
        supabaseClient.from('inquiries').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('reports').select('*')
    ]);

    let userReportDetails = {};
    let userReportCounts = {};

    if (reportsData) {
        reportsData.forEach(r => {
            let targetAuthor = "알 수 없음";
            let descHtml = "";

            if (r.target_type === 'photo') {
                let p = photos.find(item => Number(item.id) === Number(r.target_id));
                if (p) {
                    targetAuthor = p.uploader || "알 수 없음";
                    descHtml = `
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; margin-bottom: 4px;">
                            <div>📸 [사진] "${p.title || '제목 없음'}" (신고한 사람: ${r.reporter})</div>
                            <div style="display: flex; gap: 4px;">
                                <button class="btn-back" onclick="adminDeletePhoto(${p.id}, '${p.url}')" style="font-size:0.7rem; padding: 2px 6px; background:#fee2e2; color:var(--danger);">사진 삭제</button>
                                <button class="btn-back" onclick="cancelReport(${r.id})" style="font-size:0.7rem; padding: 2px 6px; background:#f1f5f9; color:#475569;">신고 취소</button>
                            </div>
                        </div>
                    `;
                } else {
                    targetAuthor = "박병목";
                    descHtml = `
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; margin-bottom: 4px;">
                            <div>📸 [사진] ID: ${r.target_id} (신고한 사람: ${r.reporter})</div>
                            <button class="btn-back" onclick="cancelReport(${r.id})" style="font-size:0.7rem; padding: 2px 6px; background:#f1f5f9; color:#475569;">신고 취소</button>
                        </div>
                    `;
                }
            } else if (r.target_type === 'comment') {
                let allComments = Object.values(commentsMap).flat();
                let c = allComments.find(item => Number(item.id) === Number(r.target_id));
                if (c) {
                    targetAuthor = c.author || "알 수 없음";
                    descHtml = `
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; margin-bottom: 4px;">
                            <div>💬 [댓글] "${c.content}" (신고한 사람: ${r.reporter})</div>
                            <div style="display: flex; gap: 4px;">
                                <button class="btn-back" onclick="adminDeleteComment(${c.id})" style="font-size:0.7rem; padding: 2px 6px; background:#fee2e2; color:var(--danger);">댓글 삭제</button>
                                <button class="btn-back" onclick="cancelReport(${r.id})" style="font-size:0.7rem; padding: 2px 6px; background:#f1f5f9; color:#475569;">신고 취소</button>
                            </div>
                        </div>
                    `;
                } else {
                    targetAuthor = "박병목";
                    descHtml = `
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; margin-bottom: 4px;">
                            <div>💬 [댓글] ID: ${r.target_id} (신고한 사람: ${r.reporter})</div>
                            <button class="btn-back" onclick="cancelReport(${r.id})" style="font-size:0.7rem; padding: 2px 6px; background:#f1f5f9; color:#475569;">신고 취소</button>
                        </div>
                    `;
                }
            }

            if (targetAuthor !== "알 수 없음") {
                if (!userReportDetails[targetAuthor]) userReportDetails[targetAuthor] = [];
                userReportDetails[targetAuthor].push(descHtml);
                userReportCounts[targetAuthor] = (userReportCounts[targetAuthor] || 0) + 1;
            }
        });
    }

    let memberLikesSummary = "";
    members.forEach(m => {
        let totalLikes = getUploaderTotalLikes(m);
        memberLikesSummary += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 14px; margin-bottom: 8px;">
                <span style="font-weight: 700; font-size: 0.9rem;">👤 ${m} (현재 총 좋아요: ${totalLikes}개)</span>
                <button class="btn-back" onclick="adminEditLikes('${m}')" style="font-size:0.8rem; padding: 4px 10px;">좋아요 수정</button>
            </div>
        `;
    });

    let memberReportsSummary = "";
    members.forEach(m => {
        let totalReports = userReportCounts[m] || 0;
        let details = userReportDetails[m] || [];
        memberReportsSummary += `
            <div style="display: flex; flex-direction: column; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; gap: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 700; font-size: 0.9rem; color: var(--danger);">🚨 ${m} (누적 신고 횟수: ${totalReports}회)</span>
                    ${totalReports > 0 ? `<button class="btn-back" onclick="toggleReportDetail('${m}')" style="font-size:0.75rem; padding: 3px 8px; background:#fecaca; color:#991b1b;">신고 상세 보기</button>` : ''}
                </div>
                <div id="reportDetail_${m}" style="display: none; background: #fff; border: 1px solid #fecaca; border-radius: 6px; padding: 10px; font-size: 0.85rem; color: var(--text-main); flex-direction: column; gap: 6px; margin-top: 4px;">
                    ${details.length > 0 ? details.join('') : '<div style="color:var(--text-muted);">신고 내역이 없습니다.</div>'}
                </div>
            </div>
        `;
    });

    let listHtml = "";
    if (!inquiriesData || inquiriesData.length === 0) {
        listHtml = `<p class="empty-msg">접수된 제안이나 문의가 없습니다.</p>`;
    } else {
        inquiriesData.forEach(item => {
            let typeBadge = item.type === 'feature' ? '<span style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:700;">기능제안</span>' : '<span style="background:#fef3c7; color:#b45309; padding:2px 6px; border-radius:4px; font-size:0.75rem; font-weight:700;">문의하기</span>';
            listHtml += `
                <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            ${typeBadge}
                            <span style="font-weight: 700; font-size: 0.9rem;">${item.author}</span>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-main); word-break: break-all; margin-top: 4px;">${item.content}</div>
                </div>
            `;
        });
    }

    contentArea.innerHTML = `
        <div class="card" style="margin-bottom: 20px;">
            <div class="card-title">
                <span>👑 관리자 페이지</span>
                <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
            </div>
            
            <h3 style="font-size: 1rem; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">🏆 사용자별 좋아요 수 관리</h3>
            <div style="display: flex; flex-direction: column; margin-bottom: 20px;">
                ${memberLikesSummary}
            </div>

            <h3 style="font-size: 1rem; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">🚨 사용자별 신고 횟수 현황</h3>
            <div style="display: flex; flex-direction: column; margin-bottom: 20px;">
                ${memberReportsSummary}
            </div>

            <h3 style="font-size: 1rem; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">💡 기능제안 및 문의 접수 내역</h3>
            <div style="display: flex; flex-direction: column; max-height: 350px; overflow-y: auto;">
                ${listHtml}
            </div>
        </div>
    `;
}

async function cancelReport(reportId) {
    if (!confirm("이 신고 내역을 취소하시겠습니까?")) return;
    
    const { error } = await supabaseClient.from('reports').delete().eq('id', Number(reportId));
    if (error) {
        alert("신고 취소 실패: " + error.message);
        return;
    }
    
    alert("신고가 취소되었습니다.");
    await renderAdminView(document.getElementById("contentArea"));
}

async function adminDeletePhoto(id, imageUrl) {
    if (!confirm("관리자 권한으로 이 사진을 정말 삭제하시겠습니까?")) return;
    const fileName = imageUrl.split('/').pop();
    await supabaseClient.storage.from('yubsa-bucket').remove([fileName]);
    await supabaseClient.from('comments').delete().eq('photo_id', id);
    await supabaseClient.from('reports').delete().eq('target_type', 'photo').eq('target_id', id);
    await supabaseClient.from('photos').delete().eq('id', id);
    alert("사진이 삭제되었습니다.");
    await fetchPhotos();
    renderAdminView(document.getElementById("contentArea"));
}

async function adminDeleteComment(commentId) {
    if (!confirm("관리자 권한으로 이 댓글을 정말 삭제하시겠습니까?")) return;
    await supabaseClient.from('replies').delete().eq('comment_id', commentId);
    await supabaseClient.from('reports').delete().eq('target_type', 'comment').eq('target_id', commentId);
    await supabaseClient.from('comments').delete().eq('id', commentId);
    alert("댓글이 삭제되었습니다.");
    await fetchComments();
    await fetchReplies();
    renderAdminView(document.getElementById("contentArea"));
}

function openAdminPinModal(masterHash) {
    const existing = document.getElementById("adminPinModal");
    if (existing) existing.remove();

    let isInitialSetup = !masterHash;
    let titleText = isInitialSetup ? "👑 [최초 설정] 관리자 마스터 PIN 등록" : "👑 [2차 보안] 관리자 마스터 PIN 인증";
    let descText = isInitialSetup 
        ? "관리자 페이지를 철통 보호하기 위해 사용할 마스터 비밀번호(PIN)를 등록해주세요.<br><span style='color:#0284c7; font-size:0.8rem;'>※ 단방향 암호화(SHA-256)로 저장되어 F12로도 절대 열람할 수 없습니다.</span>" 
        : "관리자 페이지에 접근하려면 마스터 비밀번호(PIN)를 입력하세요.";

    let modalHtml = `
        <div id="adminPinModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 99999;">
            <div style="background: white; width: 90%; max-width: 400px; padding: 24px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border-top: 6px solid #eab308; text-align: left;">
                <h3 style="margin-top: 0; color: #1e293b; font-size: 1.15rem; font-weight: 800;">${titleText}</h3>
                <p style="font-size: 0.85rem; color: #64748b; line-height: 1.5; margin: 10px 0 16px 0;">${descText}</p>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 0.8rem; font-weight: 700; color: #334155; display: block; margin-bottom: 6px;">마스터 비밀번호 (PIN)</label>
                    <input type="password" id="adminSecurityPinInput" placeholder="비밀번호 입력..." style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; box-sizing: border-box;">
                </div>

                <div style="display: flex; gap: 8px;">
                    <button onclick="submitAdminPin(${isInitialSetup})" style="flex: 2; background: linear-gradient(135deg, #eab308, #ca8a04); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 800; font-size: 0.95rem; cursor: pointer;">${isInitialSetup ? 'PIN 등록 및 입장' : '인증 및 입장'}</button>
                    <button onclick="closeAdminPinModal()" style="flex: 1; background: #94a3b8; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 0.9rem; cursor: pointer;">취소</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    setTimeout(() => {
        let input = document.getElementById("adminSecurityPinInput");
        if (input) {
            input.focus();
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') submitAdminPin(isInitialSetup);
            });
        }
    }, 100);
}

async function submitAdminPin(isInitialSetup) {
    let input = document.getElementById("adminSecurityPinInput");
    if (!input) return;
    let val = input.value.trim();
    if (!val) {
        alert("비밀번호를 입력해주세요!");
        return;
    }

    let inputHash = await hashStringSHA256(val);

    if (isInitialSetup) {
        localStorage.setItem('yubsa_admin_master_hash', inputHash);
        isAdminSessionVerified = true;
        closeAdminPinModal();
        alert("👑 관리자 마스터 PIN이 성공적으로 등록되었습니다!");
        const contentArea = document.getElementById("contentArea");
        if (contentArea) renderAdminView(contentArea);
    } else {
        let masterHash = localStorage.getItem('yubsa_admin_master_hash');
        if (inputHash === masterHash) {
            isAdminSessionVerified = true;
            closeAdminPinModal();
            const contentArea = document.getElementById("contentArea");
            if (contentArea) renderAdminView(contentArea);
        } else {
            alert("❌ 관리자 마스터 비밀번호가 일치하지 않습니다.");
            input.value = "";
            input.focus();
        }
    }
}

function closeAdminPinModal() {
    let modal = document.getElementById("adminPinModal");
    if (modal) modal.remove();
    if (!isAdminSessionVerified && currentView === 'admin') {
        navigateTo('home');
    }
}

function toggleReportDetail(memberName) {
    const el = document.getElementById(`reportDetail_${memberName}`);
    if (el) {
        if (el.style.display === 'flex') {
            el.style.display = 'none';
        } else {
            el.style.display = 'flex';
        }
    }
}

async function adminEditLikes(targetUser) {
    let currentTotal = getUploaderTotalLikes(targetUser);
    let input = prompt(`[${targetUser}]님의 현재 받은 총 좋아요 수는 ${currentTotal}개입니다.\n변경할 총 좋아요 수를 숫자로 입력하세요:`, currentTotal);
    if (input === null) return;
    let newTargetLikes = parseInt(input, 10);
    if (isNaN(newTargetLikes) || newTargetLikes < 0) {
        alert("올바른 숫자를 입력해주세요!");
        return;
    }

    let userPhotos = photos.filter(p => p.uploader && p.uploader.toLowerCase() === targetUser.toLowerCase());
    if (userPhotos.length === 0) {
        let avatarImg = userProfiles[targetUser] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
        const { error: insertError } = await supabaseClient.from('photos').insert([{
            title: `[프로필] ${targetUser}`,
            url: avatarImg,
            target: [targetUser],
            uploader: targetUser,
            likes: newTargetLikes,
            liked_users: []
        }]);

        if (insertError) {
            alert("좋아요 수정 실패: " + insertError.message);
            return;
        }
    } else {
        const updatePromises = [
            supabaseClient.from('photos').update({ likes: newTargetLikes }).eq('id', userPhotos[0].id)
        ];
        for (let i = 1; i < userPhotos.length; i++) {
            if ((userPhotos[i].likes || 0) > 0) {
                updatePromises.push(supabaseClient.from('photos').update({ likes: 0 }).eq('id', userPhotos[i].id));
            }
        }
        const results = await Promise.all(updatePromises);
        const hasError = results.some(r => r.error);
        if (hasError) {
            alert("수정 중 오류가 발생했습니다.");
            return;
        }
    }

    alert(`[${targetUser}]님의 총 좋아요 수가 ${newTargetLikes}개로 성공적으로 수정되었습니다!`);
    await fetchPhotos();
    const contentArea = document.getElementById("contentArea");
    if (contentArea) {
        await renderAdminView(contentArea);
    }
}

function renderMyProfileView(contentArea) {
    const profileName = currentUser;
    const myUploadedPhotos = photos.filter(p => p.uploader && p.uploader.toLowerCase() === profileName.toLowerCase());
    const uploadedLikes = getUploaderTotalLikes(profileName);
    const userCommentsCount = getUserTotalComments(profileName);

    const combinedTier = getCombinedTier(uploadedLikes, userCommentsCount);

    let likeCalcTier = getTierInfo(uploadedLikes);
    let commentCalcTier = getTierInfo(userCommentsCount);

    if (tierRanks[likeCalcTier.name] > tierRanks[combinedTier.name]) {
        likeCalcTier = combinedTier;
    }
    if (tierRanks[commentCalcTier.name] > tierRanks[combinedTier.name]) {
        commentCalcTier = combinedTier;
    }

    let likeProgressPercent = 100;
    let likeMsg = "";
    let currentTierMax = likeCalcTier.max;
    if (uploadedLikes >= currentTierMax && likeCalcTier.name !== 'Challenger') {
        likeProgressPercent = 100;
        likeMsg = `<span style="color: ${likeCalcTier.hex}; font-weight: 700;">조건을 충족했습니다!</span>`;
    } else if (likeCalcTier.name === 'Challenger' || uploadedLikes >= 61) {
        likeProgressPercent = 100;
        likeMsg = `<span style="color: ${likeCalcTier.hex}; font-weight: 700;">조건을 충족했습니다!</span>`;
    } else {
        let rangeSpan = (likeCalcTier.max - likeCalcTier.min) + 1;
        let currentProgress = (uploadedLikes - likeCalcTier.min) + 1;
        likeProgressPercent = Math.min(100, Math.max(0, (currentProgress / rangeSpan) * 100));
        let remaining = likeCalcTier.max - uploadedLikes;
        likeMsg = `다음 단계까지 남은 좋아요: <b>${remaining}개</b>`;
    }

    let commentProgressPercent = 100;
    let commentMsg = "";
    let commentTierMax = commentCalcTier.max;
    if (userCommentsCount >= commentTierMax && commentCalcTier.name !== 'Challenger') {
        commentProgressPercent = 100;
        commentMsg = `<span style="color: ${commentCalcTier.hex}; font-weight: 700;">조건을 충족했습니다!</span>`;
    } else if (commentCalcTier.name === 'Challenger' || userCommentsCount >= 61) {
        commentProgressPercent = 100;
        commentMsg = `<span style="color: ${commentCalcTier.hex}; font-weight: 700;">조건을 충족했습니다!</span>`;
    } else {
        let rangeSpan = (commentCalcTier.max - commentCalcTier.min) + 1;
        let currentProgress = (userCommentsCount - commentCalcTier.min) + 1;
        commentProgressPercent = Math.min(100, Math.max(0, (currentProgress / rangeSpan) * 100));
        let remaining = commentCalcTier.max - userCommentsCount;
        commentMsg = `다음 단계까지 남은 댓글/답글: <b>${remaining}개</b>`;
    }

    contentArea.innerHTML = `
        <div class="card">
            <div class="card-title">
                <span>프로필</span>
                <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
            </div>
            
            <div class="instagram-profile" style="display: flex; flex-direction: row; align-items: center; gap: 20px;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0;">
                    ${getUserAvatarHtml(profileName, '80px')}
                    <label style="font-size: 0.75rem; background: var(--accent); color: white; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        사진 변경
                        <input type="file" accept="image/*" style="display: none;" onchange="updateProfileImage(event)">
                    </label>
                </div>
                <div class="profile-info" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                    <div class="profile-username" style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px;">👤 ${profileName}</div>
                    
                    <div style="margin: 4px 0 8px 0; font-weight: 700; font-size: 0.95rem; color: var(--text-main);">
                        ⭐ 티어: <span class="profile-tier ${combinedTier.class}">${combinedTier.name}</span>
                    </div>

                    <div style="margin-top: 6px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                            <span style="font-size: 0.8rem; font-weight: 600;">❤️ 좋아요 조건</span>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${likeMsg}</span>
                        </div>
                        <div class="progress-bar-bg" style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div class="progress-bar-fill" style="width: ${likeProgressPercent}%; height: 100%; background-color: ${likeCalcTier.hex}; transition: width 0.4s ease;"></div>
                        </div>
                    </div>

                    <div style="margin-top: 8px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                            <span style="font-size: 0.8rem; font-weight: 600;">💬 댓글/답글 조건</span>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${commentMsg}</span>
                        </div>
                        <div class="progress-bar-bg" style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div class="progress-bar-fill" style="width: ${commentProgressPercent}%; height: 100%; background-color: ${commentCalcTier.hex}; transition: width 0.4s ease;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 16px;">
                <div style="flex: 1; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">게시물</div>
                    <div style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">${myUploadedPhotos.length}</div>
                </div>
                <div style="flex: 1; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">좋아요</div>
                    <div style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">${uploadedLikes}</div>
                </div>
                <div style="flex: 1; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">댓글/답글</div>
                    <div style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">${userCommentsCount}</div>
                </div>
            </div>

            <div class="instagram-grid" id="profileGrid" style="margin-top: 16px;"></div>
        </div>
    `;

    const gridContainer = document.getElementById("profileGrid");
    if (myUploadedPhotos.length === 0) {
        gridContainer.innerHTML = `<p class="empty-msg" style="grid-column: span 3;">아직 업로드한 사진이 없습니다.</p>`;
    } else {
        let gridHtml = "";
        myUploadedPhotos.forEach(photo => {
            gridHtml += `
                <div class="grid-item" data-likes="${photo.likes || 0}">
                    <img src="${photo.url}" alt="내가 올린 사진">
                </div>
            `;
        });
        gridContainer.innerHTML = gridHtml;
    }
}

function renderTargetProfileView(contentArea) {
    const profileName = selectedProfile;
    const targetPhotos = photos.filter(p => photoHasTarget(p.target, profileName));
    const totalLikes = targetPhotos.reduce((sum, p) => sum + (p.likes || 0), 0);
    const uploadedLikes = getUploaderTotalLikes(profileName);
    const userCommentsCount = getUserTotalComments(profileName);

    const combinedTier = getCombinedTier(uploadedLikes, userCommentsCount);

    contentArea.innerHTML = `
        <div class="card">
            <div class="card-title">
                <span>인물 피드 (${profileName})</span>
                <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
            </div>
            
            <div class="instagram-profile" style="display: flex; flex-direction: row; align-items: center; gap: 20px;">
                <div style="flex-shrink: 0;">
                    ${getUserAvatarHtml(profileName, '80px')}
                </div>
                <div class="profile-info" style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                    <div class="profile-username" style="font-size: 1.15rem; font-weight: 700; margin-bottom: 6px;">🎯 ${profileName}</div>
                    <div style="margin-top: 4px;">
                        <span class="profile-tier ${combinedTier.class}">⭐ 티어: ${combinedTier.name}</span>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 16px;">
                <div style="flex: 1; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">태그된 사진</div>
                    <div style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">${targetPhotos.length}</div>
                </div>
                <div style="flex: 1; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">총 좋아요</div>
                    <div style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">${totalLikes}</div>
                </div>
                <div style="flex: 1; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">댓글/답글</div>
                    <div style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">${userCommentsCount}</div>
                </div>
            </div>

            <div class="instagram-grid" id="profileGrid" style="margin-top: 16px;"></div>
        </div>
    `;

    const gridContainer = document.getElementById("profileGrid");
    if (targetPhotos.length === 0) {
        gridContainer.innerHTML = `<p class="empty-msg" style="grid-column: span 3;">이 인물이 주인공인 사진이 없습니다.</p>`;
    } else {
        let gridHtml = "";
        targetPhotos.forEach(photo => {
            gridHtml += `
                <div class="grid-item" data-likes="${photo.likes || 0}">
                    <img src="${photo.url}" alt="태그된 사진">
                </div>
            `;
        });
        gridContainer.innerHTML = gridHtml;
    }
}

function renderFriendsView(contentArea) {
    let membersListHtml = "";
    members.forEach(m => {
        let uploadedLikes = getUploaderTotalLikes(m);
        let userCommentsCount = getUserTotalComments(m);
        let tier = getCombinedTier(uploadedLikes, userCommentsCount);
        membersListHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${getUserAvatarHtml(m, '36px')}
                    <span style="font-weight: 700;">${m}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="profile-tier ${tier.class}">${tier.name}</span>
                    <button class="btn-back" onclick="openTargetProfile('${m}')">프로필 보기</button>
                </div>
            </div>
        `;
    });

    contentArea.innerHTML = `
        <div class="card">
            <h2 class="card-title">
                <span>친구 관리</span>
                <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
            </h2>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 15px;">등록된 갤러리 멤버들이다.</p>
            <div style="display: flex; flex-direction: column;">
                ${membersListHtml}
            </div>
            <div style="margin-top: 20px;">
                <button class="btn-link-copy" onclick="copyInviteLink()" style="width: 100%; padding: 14px;">🔗 초대 링크 복사하기</button>
            </div>
        </div>
    `;
}

function openTargetProfile(name) {
    selectedProfile = name;
    currentView = 'userProfile';
    renderMainContent();
}

async function fetchMyRooms() {
    const { data, error } = await supabaseClient
        .from('dms')
        .select('room_id, sender, content, created_at')
        .order('created_at', { ascending: true });

    if (!error && data) {
        let roomMap = new Map();
        customRoomNames = {};

        data.forEach(d => {
            if (d.room_id) {
                let parts = d.room_id.split(':');
                let memberKey = parts[0];
                let membersInRoom = memberKey.split('_');
                let hiddenUsers = parts[1] ? parts[1].split('_') : [];

                if (d.sender === 'System' && d.content && d.content.startsWith('ROOM_NAME:')) {
                    customRoomNames[memberKey] = d.content.replace('ROOM_NAME:', '').trim();
                }

                if (membersInRoom.includes(currentUser) && !hiddenUsers.includes(currentUser)) {
                    roomMap.set(memberKey, d.room_id);
                }
            }
        });
        myRooms = Array.from(roomMap.values());
    }
    if (currentView === 'dm' && !activeRoomId && !isCreatingRoom) renderDmView(contentArea);
}

function renderDmView(contentArea) {
    if (activeRoomId) {
        let messagesHtml = "";
        dmMessages.forEach(msg => {
            if (msg.sender === 'System') {
                if (msg.content && msg.content.startsWith('ROOM_NAME:')) return;

                messagesHtml += `
                    <div style="text-align: center; margin: 8px 0; font-size: 0.75rem; color: var(--text-muted);">
                        ${msg.content}
                    </div>
                `;
            } else {
                let isMe = (msg.sender === currentUser);
                messagesHtml += `
                    <div style="display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'}; margin-bottom: 10px;">
                        <span style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px;">${msg.sender}</span>
                        <div style="background: ${isMe ? 'var(--text-main)' : '#e2e8f0'}; color: ${isMe ? '#fff' : 'var(--text-main)'}; padding: 10px 14px; border-radius: 12px; max-width: 75%; font-size: 0.9rem; word-break: break-all;">
                            ${msg.content}
                        </div>
                    </div>
                `;
            }
        });

        contentArea.innerHTML = `
            <div class="card" style="display: flex; flex-direction: column; height: 500px;">
                <div class="card-title" style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; max-width: 45%;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">💬 ${activeRoomName}</span>
                        <button class="btn-back" onclick="promptChangeRoomName()" style="font-size: 0.75rem; padding: 3px 6px;">✏️ 이름 변경</button>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn-back" onclick="leaveRoom()" style="background-color: #fee2e2; color: var(--danger);">🗑️ 방 나가기</button>
                        <button class="btn-back" onclick="activeRoomId = null; navigateTo('dm');">목록</button>
                    </div>
                </div>
                <div id="dmChatList" style="flex: 1; overflow-y: auto; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 6px;">
                    ${messagesHtml || '<p class="empty-msg">대화 내용이 없습니다. 메시지를 남겨보세요!</p>'}
                </div>
                <div class="comment-form" style="display: flex; gap: 6px;">
                    <input type="text" id="dmInput" class="comment-input" placeholder="메시지를 입력하세요..." onkeypress="if(event.key==='Enter') sendGroupDm()">
                    <button class="comment-submit-btn" onclick="sendGroupDm()">전송</button>
                </div>
            </div>
        `;
        let chatList = document.getElementById("dmChatList");
        if (chatList) chatList.scrollTop = chatList.scrollHeight;

    } else if (isCreatingRoom) {
        let checkboxesHtml = "";
        members.filter(m => m !== currentUser).forEach(m => {
            checkboxesHtml += `
                <label class="checkbox-label">
                    <input type="checkbox" name="dmMember" value="${m}"> ${m}
                </label>
            `;
        });

        contentArea.innerHTML = `
            <div class="card">
                <h2 class="card-title">
                    <span>새 대화방 만들기</span>
                    <button class="btn-back" onclick="isCreatingRoom = false; renderMainContent();">취소</button>
                </h2>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 15px;">대화할 친구들을 선택해주세요.</p>
                <div class="form-group">
                    <label>참여할 친구 선택</label>
                    <div class="checkbox-group">
                        ${checkboxesHtml}
                    </div>
                </div>
                <button class="btn-primary" onclick="createGroupChat()">방 생성 및 입장</button>
            </div>
        `;

    } else {
        let roomsListHtml = "";
        myRooms.forEach(roomId => {
            let parts = roomId.split(':');
            let memberKey = parts[0];
            let memberNames = memberKey.split('_');
            let participants = memberNames.filter(name => name !== currentUser);
            
            let roomTitle = customRoomNames[memberKey] || participants.join(', ');
            if (!customRoomNames[memberKey] && participants.length > 2) {
                roomTitle = participants[0] + ' 외 ' + (participants.length - 1) + '명';
            }

            roomsListHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 10px; cursor: pointer;" onclick="openRoom('${roomId}', '${roomTitle}')">
                    <div>
                        <div style="font-weight: 700; font-size: 1rem; color: var(--text-main);">💬 ${roomTitle}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">터치하여 대화방 입장</div>
                    </div>
                    <span style="color: var(--accent); font-weight: 600; font-size: 0.9rem;">입장 →</span>
                </div>
            `;
        });

        contentArea.innerHTML = `
            <div class="card">
                <div class="card-title">
                    <span>💬 DM</span>
                    <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
                </div>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 15px;">참여 중인 대화방 목록입니다.</p>
                
                <div style="display: flex; flex-direction: column; margin-bottom: 16px;">
                    ${roomsListHtml || '<p class="empty-msg">참여 중인 대화방이 없습니다.</p>'}
                </div>

                <button class="btn-primary" onclick="isCreatingRoom = true; renderMainContent();">+ 새로운 대화방 만들기</button>
            </div>
        `;
    }
}

async function createGroupChat() {
    const checkboxes = document.querySelectorAll('input[name="dmMember"]:checked');
    if (checkboxes.length === 0) {
        alert("대화할 친구를 최소 1명 이상 선택해주세요!");
        return;
    }

    let selected = Array.from(checkboxes).map(cb => cb.value);
    selected.push(currentUser);
    selected.sort();

    let memberKey = selected.join('_');
    
    const { data: existingData } = await supabaseClient
        .from('dms')
        .select('room_id')
        .ilike('room_id', `${memberKey}%`);

    let targetRoomId = `${memberKey}:`;

    if (existingData && existingData.length > 0) {
        let found = existingData.find(d => {
            let parts = d.room_id.split(':');
            return parts[0] === memberKey;
        });
        if (found) {
            targetRoomId = found.room_id;
            let parts = targetRoomId.split(':');
            let hiddenList = parts[1] ? parts[1].split('_').filter(Boolean) : [];
            if (hiddenList.includes(currentUser)) {
                hiddenList = hiddenList.filter(u => u !== currentUser);
                targetRoomId = `${memberKey}:${hiddenList.join('_')}`;
            }
        }
    }

    activeRoomId = targetRoomId;
    activeRoomName = customRoomNames[memberKey] || selected.join(', ');
    isCreatingRoom = false;

    const { data: checkMsg } = await supabaseClient
        .from('dms')
        .select('id')
        .eq('room_id', targetRoomId)
        .limit(1);

    if (!checkMsg || checkMsg.length === 0) {
        await supabaseClient.from('dms').insert([
            { room_id: targetRoomId, sender: 'System', content: `${currentUser}님이 대화방을 개설했습니다.` }
        ]);
    }

    await fetchGroupDmMessages();
}

async function openRoom(roomId, roomTitle) {
    activeRoomId = roomId;
    activeRoomName = roomTitle;
    await fetchGroupDmMessages();
}

async function promptChangeRoomName() {
    let newName = prompt("변경할 대화방 이름을 입력하세요:", activeRoomName);
    if (!newName || !newName.trim()) return;
    newName = newName.trim();

    let parts = activeRoomId.split(':');
    let memberKey = parts[0];

    await supabaseClient.from('dms').insert([
        { room_id: activeRoomId, sender: 'System', content: `ROOM_NAME:${newName}` }
    ]);

    customRoomNames[memberKey] = newName;
    activeRoomName = newName;
    alert(`대화방 이름이 "${newName}"(으)로 변경되었습니다!`);
    fetchGroupDmMessages();
}

async function leaveRoom() {
    if (!confirm("이 대화방에서 나가시겠습니까? 대화방 목록에서 사라집니다.")) return;

    let parts = activeRoomId.split(':');
    let memberKey = parts[0];
    let hiddenList = parts[1] ? parts[1].split('_').filter(Boolean) : [];

    if (!hiddenList.includes(currentUser)) {
        hiddenList.push(currentUser);
    }

    let newRoomId = `${memberKey}:${hiddenList.join('_')}`;

    await supabaseClient
        .from('dms')
        .update({ room_id: newRoomId })
        .eq('room_id', activeRoomId);

    activeRoomId = null;
    navigateTo('dm');
}

async function fetchGroupDmMessages() {
    if (!activeRoomId) return;
    const { data, error } = await supabaseClient
        .from('dms')
        .select('*')
        .eq('room_id', activeRoomId)
        .order('created_at', { ascending: true });

    if (!error && data) {
        dmMessages = data;
        let parts = activeRoomId.split(':');
        let memberKey = parts[0];
        data.forEach(d => {
            if (d.sender === 'System' && d.content && d.content.startsWith('ROOM_NAME:')) {
                activeRoomName = d.content.replace('ROOM_NAME:', '').trim();
                customRoomNames[memberKey] = activeRoomName;
            }
        });
    }
    if (currentView === 'dm') renderMainContent();
}

async function sendGroupDm() {
    const input = document.getElementById("dmInput");
    if (!input) return;
    const text = input.value.trim();
    if (!text || !activeRoomId) return;

    const { error } = await supabaseClient.from('dms').insert([
        { room_id: activeRoomId, sender: currentUser, content: text }
    ]);

    if (error) { alert("전송 실패: " + error.message); return; }
    input.value = "";
    fetchGroupDmMessages();
}

function renderSettingsView(contentArea) {
    contentArea.innerHTML = `
        <div class="card">
            <h2 class="card-title">
                <span>설정</span>
                <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
            </h2>
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h3 style="font-size: 1rem; margin-bottom: 6px;">👤 계정 정보</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 10px;">현재 로그인된 닉네임: <b>${currentUser}</b></p>
                    <button class="auth-btn" onclick="logout()" style="padding: 8px 14px; background-color: #64748b; border:none; border-radius:6px; color:#fff; cursor:pointer; font-weight:600;">로그아웃 하기</button>
                </div>
                <div style="background: #fdf2f2; padding: 16px; border-radius: 8px; border: 1px solid #fecaca;">
                    <h3 style="font-size: 1rem; color: var(--danger); margin-bottom: 6px;">⚠️ 위험 구역</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 10px;">계정을 삭제하면 사용자 목록에서 닉네임이 제거된다.</p>
                    <button class="auth-btn" onclick="deleteAccount()" style="padding: 8px 14px; background-color: var(--danger); border:none; border-radius:6px; color:#fff; cursor:pointer; font-weight:600;">계정 삭제 하기</button>
                </div>
            </div>
        </div>
    `;
}

async function deleteAccount() {
    if (!confirm(`정말 ${currentUser} 계정을 삭제하시겠습니까?`)) return;
    await supabaseClient.from('users').delete().eq('nickname', currentUser);
    await supabaseClient.auth.signOut();
    currentUser = "";
    localStorage.removeItem('yubsa_user');
    alert("계정 정보가 삭제되었습니다.");
    initApp();
}

function copyInviteLink() {
    const inviteUrl = window.location.href.split('?')[0];
    navigator.clipboard.writeText(inviteUrl).then(() => {
        alert("초대 링크가 복사되었습니다! (초대 코드: 2026)");
    });
}

function renderFeatureRequestView(contentArea) {
    contentArea.innerHTML = `
        <div class="card">
            <h2 class="card-title">
                <span>기능 제안</span>
                <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
            </h2>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 15px;">갤러리에 추가하고 싶은 아이디어나 기능을 자유롭게 적어달라.</p>
            <div class="form-group">
                <textarea id="featureText" rows="4" placeholder="예: 익명 대나무숲 기능 만들어주세요"></textarea>
            </div>
            <button class="btn-primary" onclick="submitFeatureRequest()">제안하기</button>
        </div>
    `;
}

async function submitFeatureRequest() {
    const text = document.getElementById("featureText").value.trim();
    if (!text) { alert("내용을 입력해주세요!"); return; }
    const { error } = await supabaseClient.from('inquiries').insert([{ type: 'feature', author: currentUser, content: text }]);
    if (error) { alert("전송 실패: " + error.message); return; }
    alert("기능 제안이 성공적으로 접수되었습니다!");
    navigateTo('home');
}

function renderInquiryView(contentArea) {
    contentArea.innerHTML = `
        <div class="card">
            <h2 class="card-title">
                <span>문의 하기</span>
                <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
            </h2>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 15px;">버그 신고나 관리자에게 문의할 사항을 남겨달라.</p>
            <div class="form-group">
                <textarea id="inquiryText" rows="4" placeholder="예: 사진 업로드가 안 됩니다"></textarea>
            </div>
            <button class="btn-primary" onclick="submitInquiry()">문의 보내기</button>
        </div>
    `;
}

async function submitInquiry() {
    const text = document.getElementById("inquiryText").value.trim();
    if (!text) { alert("내용을 입력해주세요!"); return; }
    const { error } = await supabaseClient.from('inquiries').insert([{ type: 'inquiry', author: currentUser, content: text }]);
    if (error) { alert("전송 실패: " + error.message); return; }
    alert("문의가 성공적으로 접수되었습니다!");
    navigateTo('home');
}

async function fetchPhotos() {
    const { data, error } = await supabaseClient.from('photos').select('*').order('created_at', { ascending: false });
    if (!error) photos = data || [];
    await fetchComments();
    await fetchReplies();
    await fetchMembers();
    if (currentView === 'home') renderGalleryList();
}

async function fetchComments() {
    const { data, error } = await supabaseClient.from('comments').select('*').order('created_at', { ascending: true });
    if (!error && data) {
        commentsMap = {};
        data.forEach(c => {
            if (!commentsMap[c.photo_id]) commentsMap[c.photo_id] = [];
            commentsMap[c.photo_id].push(c);
        });
    }
}

async function fetchReplies() {
    const { data, error } = await supabaseClient.from('replies').select('*').order('created_at', { ascending: true });
    if (!error && data) {
        repliesMap = {};
        data.forEach(r => {
            if (!repliesMap[r.comment_id]) repliesMap[r.comment_id] = [];
            repliesMap[r.comment_id].push(r);
        });
    }
}

async function reportPhoto(photoId) {
    const { data: existing } = await supabaseClient
        .from('reports')
        .select('id')
        .eq('target_type', 'photo')
        .eq('target_id', Number(photoId))
        .eq('reporter', currentUser)
        .maybeSingle();

    if (existing) {
        alert("이미 이 사진을 신고하셨습니다.");
        return;
    }

    if (!confirm("이 사진을 신고하시겠습니까?")) return;
    const { error } = await supabaseClient.from('reports').insert([
        { target_type: 'photo', target_id: Number(photoId), reporter: currentUser }
    ]);
    if (error) { alert("신고 실패: " + error.message); return; }
    alert("사진이 신고되었습니다.");
}

async function reportComment(commentId) {
    const { data: existing } = await supabaseClient
        .from('reports')
        .select('id')
        .eq('target_type', 'comment')
        .eq('target_id', Number(commentId))
        .eq('reporter', currentUser)
        .maybeSingle();

    if (existing) {
        alert("이미 이 댓글을 신고하셨습니다.");
        return;
    }

    if (!confirm("이 댓글을 신고하시겠습니까?")) return;
    const { error } = await supabaseClient.from('reports').insert([
        { target_type: 'comment', target_id: Number(commentId), reporter: currentUser }
    ]);
    if (error) { alert("신고 실패: " + error.message); return; }
    alert("댓글이 신고되었습니다.");
}

async function addComment(photoId) {
    const input = document.getElementById(`commentInput_${photoId}`);
    const content = input.value.trim();
    if (!content) return;

    const { error } = await supabaseClient.from('comments').insert([{ photo_id: Number(photoId), author: currentUser, content: content, likes: 0, liked_users: [] }]);
    if (error) { alert("댓글 작성 실패: " + error.message); return; }
    input.value = "";
    await fetchComments();
    renderGalleryList();
}

async function toggleCommentLike(commentId) {
    const allComments = Object.values(commentsMap).flat();
    const comment = allComments.find(c => c.id === commentId);
    if (!comment) return;

    let likedUsers = Array.isArray(comment.liked_users) ? [...comment.liked_users] : [];
    let newLikes = comment.likes || 0;

    if (likedUsers.includes(currentUser)) {
        likedUsers = likedUsers.filter(u => u !== currentUser);
        newLikes = Math.max(0, newLikes - 1);
    } else {
        likedUsers.push(currentUser);
        newLikes += 1;
    }

    const { error } = await supabaseClient.from('comments').update({ likes: newLikes, liked_users: likedUsers }).eq('id', commentId);
    if (!error) {
        await fetchComments();
        renderGalleryList();
    }
}

function toggleReplyForm(commentId) {
    activeReplyCommentId = (activeReplyCommentId === commentId) ? null : commentId;
    renderGalleryList();
}

async function addReply(commentId) {
    const input = document.getElementById(`replyInput_${commentId}`);
    if (!input) return;
    const content = input.value.trim();
    if (!content) return;

    const { error } = await supabaseClient.from('replies').insert([{ comment_id: Number(commentId), author: currentUser, content: content }]);
    if (error) { alert("답글 작성 실패: " + error.message); return; }
    activeReplyCommentId = null;
    await fetchReplies();
    renderGalleryList();
}

async function deleteComment(commentId) {
    if (confirm("댓글을 삭제하시겠습니까?")) {
        await supabaseClient.from('replies').delete().eq('comment_id', commentId);
        await supabaseClient.from('reports').delete().eq('target_type', 'comment').eq('target_id', commentId);
        await supabaseClient.from('comments').delete().eq('id', commentId);
        await fetchComments();
        await fetchReplies();
        renderGalleryList();
    }
}

async function deleteReply(replyId) {
    if (confirm("답글을 삭제하시겠습니까?")) {
        await supabaseClient.from('replies').delete().eq('id', replyId);
        await fetchReplies();
        renderGalleryList();
    }
}

async function uploadPhoto() {
    const photoTitle = document.getElementById("photoTitle").value.trim();
    const checkboxes = document.querySelectorAll('input[name="targetMember"]:checked');
    const fileInput = document.getElementById("imageFile");
    const alertBox = document.getElementById("uploadAlert");

    if (alertBox) {
        alertBox.style.display = "none";
        alertBox.innerText = "";
    }

    if (!photoTitle) { alert("사진 이름을 입력해주세요."); return; }
    if (checkboxes.length === 0) { alert("사진 속 주인공을 최소 1명 이상 선택해주세요."); return; }
    if (fileInput.files.length === 0) { alert("업로드할 사진을 선택해주세요."); return; }

    let selectedTargets = Array.from(checkboxes).map(cb => cb.value);
    const file = fileInput.files[0];

    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${fileHash}.${fileExt}`;

    const { data: listData } = await supabaseClient.storage
        .from('yubsa-bucket')
        .list('', { search: fileName });

    if (listData && listData.length > 0) {
        if (alertBox) {
            alertBox.innerText = "이미 올라간 사진입니다 ㅠㅠ";
            alertBox.style.display = "block";
        }
        return;
    }

    const realUser = await getVerifiedSessionUser();
    if (!realUser) {
        alert("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
        return;
    }
    currentUser = realUser;

    const { error: storageError } = await supabaseClient.storage.from('yubsa-bucket').upload(fileName, file);
    if (storageError) { 
        alert("업로드 실패: " + storageError.message); 
        return; 
    }

    const { data: publicUrlData } = supabaseClient.storage.from('yubsa-bucket').getPublicUrl(fileName);
    const imageUrl = publicUrlData.publicUrl;

    const { error: dbError } = await supabaseClient.from('photos').insert([
        { title: photoTitle, url: imageUrl, target: selectedTargets, uploader: realUser, likes: 0, liked_users: [] }
    ]);

    if (dbError) { alert("저장 실패: " + dbError.message); return; }

    document.getElementById("photoTitle").value = "";
    fileInput.value = "";
    alert("업로드 완료!");
    fetchPhotos();
}

function renderGalleryList() {
    const container = document.getElementById("galleryContainer");
    if (!container) return;

    if (photos.length === 0) {
        container.innerHTML = `<p class="empty-msg">등록된 사진이 없습니다.</p>`;
        return;
    }

    let html = "";
    photos.forEach(photo => {
        let canDelete = (photo.uploader === currentUser);
        let titleText = photo.title ? photo.title : "제목 없음";
        
        let targets = [];
        if (Array.isArray(photo.target)) targets = photo.target;
        else if (typeof photo.target === 'string') {
            try { targets = JSON.parse(photo.target); } catch(e) { targets = photo.target.split(','); }
        }

        let tagsHtml = "";
        if (Array.isArray(targets)) {
            targets.forEach(t => {
                let name = cleanName(t);
                if (name) {
                    tagsHtml += `<span class="info-tag" onclick="openTargetProfile('${name}')">🎯 ${name}</span>`;
                }
            });
        }

        let likedUsers = Array.isArray(photo.liked_users) ? photo.liked_users : [];
        let hasLiked = likedUsers.includes(currentUser);
        let heartIcon = hasLiked ? '❤️' : '🤍';

        let photoComments = commentsMap[photo.id] || [];
        let commentsHtml = "";
        photoComments.forEach(c => {
            let canModifyComment = (c.author === currentUser);
            let cLikedUsers = Array.isArray(c.liked_users) ? c.liked_users : [];
            let cHasLiked = cLikedUsers.includes(currentUser);
            let cHeartIcon = cHasLiked ? '❤️' : '🤍';
            let cLikesCount = c.likes || 0;

            let authorLikes = getUploaderTotalLikes(c.author);
            let authorComments = getUserTotalComments(c.author);
            let authorTier = getCombinedTier(authorLikes, authorComments);

            let commentReplies = repliesMap[c.id] || [];
            let repliesHtml = "";
            commentReplies.forEach(r => {
                let canDeleteReply = (r.author === currentUser);
                repliesHtml += `
                    <div class="reply-item" style="margin-top: 6px; margin-left: 20px; padding: 8px 10px; background: #f1f5f9; border-radius: 6px; border-left: 3px solid var(--accent);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight:700; color:var(--text-main);">ㄴ ${r.author}</span>
                            ${canDeleteReply ? `<span style="cursor:pointer; color:var(--danger); font-size:0.7rem;" onclick="deleteReply(${r.id})">삭제</span>` : ''}
                        </div>
                        <div style="margin-top:4px; font-size: 0.85rem;">${r.content}</div>
                    </div>
                `;
            });

            commentsHtml += `
                <div class="comment-item">
                    <div class="comment-header-row">
                        <span class="comment-author">
                            ${c.author} 
                            <span class="tier-tag ${authorTier.class}">${authorTier.name}</span>
                        </span>
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem;">
                            <span style="cursor:pointer; color:var(--danger); display:flex; align-items:center; gap:2px;" onclick="toggleCommentLike(${c.id})">
                                ${cHeartIcon} ${cLikesCount}
                            </span>
                            <span style="cursor:pointer; color:var(--accent);" onclick="toggleReplyForm(${c.id})">답글</span>
                            <span style="cursor:pointer; color:#d97706;" onclick="reportComment(${c.id})" title="댓글 신고">🚨 신고</span>
                            ${canModifyComment ? `<span style="cursor:pointer; color:var(--danger);" onclick="deleteComment(${c.id})">삭제</span>` : ''}
                        </div>
                    </div>
                    <div style="margin-top:2px;">${c.content}</div>
                    
                    ${repliesHtml}

                    ${activeReplyCommentId === c.id ? `
                    <div class="comment-form" style="margin-top: 8px; margin-left: 20px;">
                        <input type="text" id="replyInput_${c.id}" class="comment-input" placeholder="답글을 남겨주세요...">
                        <button class="comment-submit-btn" onclick="addReply(${c.id})">등록</button>
                    </div>` : ''}
                </div>
            `;
        });

        html += `
            <div class="gallery-item">
                <div class="gallery-img-wrapper" ondblclick="addLike(${photo.id})" title="더블클릭하여 좋아요 ❤️">
                    <img src="${photo.url}" alt="엽사">
                    <div class="heart-pop" id="heartPop_${photo.id}">❤️</div>
                </div>
                <div class="photo-details">
                    <div class="photo-title-text">📌 ${titleText}</div>
                    <div class="info-row">
                        <div class="target-tags-container">
                            ${tagsHtml}
                        </div>
                        <div class="likes-display" onclick="toggleLikeDirect(${photo.id})" title="클릭하여 좋아요 토글">
                            ${heartIcon} ${photo.likes || 0}
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="action-btn btn-report" onclick="reportPhoto(${photo.id})">🚨 신고</button>
                        ${canDelete ? `
                        <button class="action-btn btn-delete" onclick="deletePhoto(${photo.id}, '${photo.url}')">
                            🗑️ 삭제
                        </button>` : ''}
                    </div>

                    <div class="comments-section">
                        <div class="comments-list">
                            ${photoComments.length > 0 ? commentsHtml : '<p style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding: 4px 0;">작성된 댓글이 없습니다.</p>'}
                        </div>
                        <div class="comment-form">
                            <input type="text" id="commentInput_${photo.id}" class="comment-input" placeholder="댓글을 입력하세요...">
                            <button class="comment-submit-btn" onclick="addComment(${photo.id})">등록</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = `<div class="gallery-scroll-box">${html}</div>`;
}

async function addLike(id) {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;
    let likedUsers = Array.isArray(photo.liked_users) ? [...photo.liked_users] : [];

    const popEl = document.getElementById(`heartPop_${id}`);
    if (popEl) {
        popEl.classList.add('animate');
        setTimeout(() => popEl.classList.remove('animate'), 1000);
    }

    if (likedUsers.includes(currentUser)) return;

    likedUsers.push(currentUser);
    const newLikes = (photo.likes || 0) + 1;

    await supabaseClient.from('photos').update({ likes: newLikes, liked_users: likedUsers }).eq('id', id);
    await fetchPhotos();
}

async function toggleLikeDirect(id) {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;

    let likedUsers = Array.isArray(photo.liked_users) ? photo.liked_users : [];
    let newLikes = photo.likes || 0;

    if (likedUsers.includes(currentUser)) {
        likedUsers = likedUsers.filter(u => u !== currentUser);
        newLikes = Math.max(0, newLikes - 1);
    } else {
        likedUsers.push(currentUser);
        newLikes += 1;
    }

    await supabaseClient.from('photos').update({ likes: newLikes, liked_users: likedUsers }).eq('id', id);
    await fetchPhotos();
}

async function deletePhoto(id, imageUrl) {
    if (confirm("정말 이 사진을 삭제하시겠습니까?")) {
        const fileName = imageUrl.split('/').pop();
        await supabaseClient.storage.from('yubsa-bucket').remove([fileName]);
        await supabaseClient.from('comments').delete().eq('photo_id', id);
        await supabaseClient.from('reports').delete().eq('target_type', 'photo').eq('target_id', id);
        await supabaseClient.from('photos').delete().eq('id', id);
        fetchPhotos();
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

initApp();