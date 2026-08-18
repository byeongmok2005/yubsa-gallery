const SUPABASE_URL = 'https://jtjxhyxyxwdwyayrdxpm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0anhoeXh5eHdkd3lheXJkeHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MzUwMTUsImV4cCI6MjEwMjUxMTAxNX0._-BAMI-cT7awy3sPsH5LC7i_RYdvxNGlyBPcItqG6SM';
const INVITE_CODE = '2026'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = "";
let photos = [];
let commentsMap = {}; 
let repliesMap = {};
let members = [];
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

async function initApp() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session && session.user) {
        const userMeta = session.user.user_metadata;
        currentUser = userMeta && userMeta.nickname ? userMeta.nickname : session.user.email.split('@')[0];
        localStorage.setItem('yubsa_user', currentUser);
    } else {
        currentUser = localStorage.getItem('yubsa_user') || "";
    }

    await fetchMembers();
    renderAuthArea();
    renderSidebarMenu(); // 💡 관리자 메뉴 노출 갱신
    if (!currentUser) {
        renderAuthScreen();
    } else {
        renderMainContent();
        fetchPhotos();
        setupRealtimeSubscriptions();
    }
}

// 💡 사이드바 메뉴 동적 렌더링 (박병목 계정일 때만 관리자 페이지 표시)
function renderSidebarMenu() {
    const menuList = document.getElementById("sidebarMenuList");
    if (!menuList) return;

    let adminMenuHtml = "";
    if (currentUser === '박병목') {
        adminMenuHtml = `<li class="sidebar-menu-item" onclick="navigateTo('admin')">👑 관리자 페이지 (제안/문의)</li>`;
    }

    menuList.innerHTML = `
        <li class="sidebar-menu-item" onclick="navigateTo('home')">🏠 홈 / 갤러리</li>
        <li class="sidebar-menu-item" onclick="navigateTo('myProfile')">👤 내 프로필</li>
        <li class="sidebar-menu-item" onclick="navigateTo('friends')">👥 친구 관리</li>
        <li class="sidebar-menu-item" onclick="navigateTo('dm')">💬 DM</li>
        <li class="sidebar-menu-item" onclick="navigateTo('featureRequest')">💡 기능 제안</li>
        <li class="sidebar-menu-item" onclick="navigateTo('inquiry')">📞 문의 하기</li>
        ${adminMenuHtml}
        <li class="sidebar-menu-item" onclick="navigateTo('settings')">⚙️ 설정</li>
    `;
}

function setupRealtimeSubscriptions() {
    supabaseClient
        .channel('public-db-changes')
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

function getUploaderTotalLikes(userName) {
    let total = 0;
    photos.forEach(p => {
        if (p.uploader && p.uploader.toLowerCase() === userName.toLowerCase()) {
            total += (p.likes || 0);
        }
    });
    return total;
}

function getTierInfo(likes) {
    if (likes === 0) return { name: 'Iron', class: 'tier-iron', hex: '#475569', min: 0, max: 0 };
    if (likes <= 10) return { name: 'Bronze', class: 'tier-bronze', hex: '#b45309', min: 1, max: 10 };
    if (likes <= 20) return { name: 'Silver', class: 'tier-silver', hex: '#64748b', min: 11, max: 20 };
    if (likes <= 30) return { name: 'Gold', class: 'tier-gold', hex: '#eab308', min: 21, max: 30 };
    if (likes <= 40) return { name: 'Platinum', class: 'tier-platinum', hex: '#06b6d4', min: 31, max: 40 };
    if (likes <= 50) return { name: 'Diamond', class: 'tier-diamond', hex: '#3b82f6', min: 41, max: 50 };
    if (likes <= 60) return { name: 'Master', class: 'tier-master', hex: '#a855f7', min: 51, max: 60 };
    return { name: 'Challenger', class: 'tier-challenger', hex: '#ef4444', min: 61, max: 61 };
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
        <div class="card">
            <h2 class="card-title">${isSignUpMode ? '회원가입' : '로그인'}</h2>
            ${isSignUpMode ? `
            <div class="form-group">
                <label>사용할 닉네임</label>
                <input type="text" id="authNickname" placeholder="예: 홍길동">
            </div>
            <div class="form-group">
                <label>초대 코드</label>
                <input type="password" id="inviteCode" placeholder="관리자에게 받은 코드 입력">
            </div>` : ''}
            <div class="form-group">
                <label>아이디 (이메일 형태)</label>
                <input type="text" id="authEmail" placeholder="id@friend.com">
            </div>
            <div class="form-group">
                <label>비밀번호</label>
                <input type="password" id="authPassword" placeholder="비밀번호 입력">
            </div>
            <button class="btn-primary" onclick="handleAuth()">${isSignUpMode ? '가입하기' : '로그인하기'}</button>
            
            <div class="auth-toggle-text">
                ${isSignUpMode ? '이미 계정이 있으신가요? <span onclick="toggleAuthMode()">로그인하기</span>' : '계정이 없으신가요? <span onclick="toggleAuthMode()">회원가입하기</span>'}
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
        if (!cleanN) { alert("올바른 닉네임을 입력해주세요!"); return; }
        if (code !== INVITE_CODE) { alert("초대 코드가 올바르지 않습니다!"); return; }

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

// 💡 관리자 전용 제안/문의 조회 화면 렌더링 함수
async function renderAdminView(contentArea) {
    if (currentUser !== '박병목') {
        contentArea.innerHTML = `<div class="card"><p style="text-align:center; color:var(--danger); font-weight:700;">접근 권한이 없습니다.</p></div>`;
        return;
    }

    const { data, error } = await supabaseClient
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

    let listHtml = "";
    if (error || !data || data.length === 0) {
        listHtml = `<p class="empty-msg">접수된 제안이나 문의가 없습니다.</p>`;
    } else {
        data.forEach(item => {
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
        <div class="card">
            <div class="card-title">
                <span>👑 관리자 페이지 (제안 & 문의)</span>
                <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
            </div>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 15px;">박병목 관리자만 볼 수 있는 접수 내역입니다.</p>
            <div style="display: flex; flex-direction: column; max-height: 500px; overflow-y: auto;">
                ${listHtml}
            </div>
        </div>
    `;
}

function renderMyProfileView(contentArea) {
    const profileName = currentUser;
    const myUploadedPhotos = photos.filter(p => p.uploader && p.uploader.toLowerCase() === profileName.toLowerCase());
    const uploadedLikes = getUploaderTotalLikes(profileName);
    const tier = getTierInfo(uploadedLikes);

    let progressPercent = 100;
    let remainingLikes = 0;
    if (tier.name === 'Challenger') {
        progressPercent = 100;
        remainingLikes = 0;
    } else if (tier.name === 'Iron') {
        progressPercent = uploadedLikes > 0 ? 100 : 0;
        remainingLikes = Math.max(0, 1 - uploadedLikes);
    } else {
        let rangeSpan = (tier.max - tier.min) + 1;
        let currentProgressInTier = (uploadedLikes - tier.min) + 1;
        progressPercent = Math.min(100, Math.max(0, (currentProgressInTier / rangeSpan) * 100));
        remainingLikes = Math.max(0, tier.max - uploadedLikes);
    }

    contentArea.innerHTML = `
        <div class="card">
            <div class="card-title">
                <span>프로필</span>
                <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
            </div>
            
            <div class="instagram-profile">
                <div class="profile-avatar">${profileName.charAt(0)}</div>
                <div class="profile-info">
                    <div class="profile-username">👤 ${profileName}</div>
                    <div class="profile-tier-row">
                        <span class="profile-tier ${tier.class}">🏆 ${tier.name}</span>
                    </div>
                    
                    <div class="tier-progress-container">
                        <div class="tier-progress-info">
                            <span>${tier.name === 'Challenger' ? '최고 등급 달성!' : `다음 티어까지 남은 좋아요`}</span>
                            <span><b>${remainingLikes}개</b></span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${progressPercent}%; background-color: ${tier.hex};"></div>
                        </div>
                    </div>

                    <div class="profile-stats">
                        <span>게시물 <b>${myUploadedPhotos.length}개</b></span>
                        <span>받은 좋아요 <b>${uploadedLikes}개</b></span>
                    </div>
                </div>
            </div>

            <div class="instagram-grid" id="profileGrid"></div>
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
    const tier = getTierInfo(uploadedLikes);

    contentArea.innerHTML = `
        <div class="card">
            <div class="card-title">
                <span>인물 피드 (${profileName})</span>
                <button class="btn-back" onclick="navigateTo('home')">메인으로</button>
            </div>
            
            <div class="instagram-profile">
                <div class="profile-avatar">${profileName.charAt(0)}</div>
                <div class="profile-info">
                    <div class="profile-username">🎯 ${profileName}</div>
                    <div class="profile-tier-row">
                        <span class="profile-tier ${tier.class}">🏆 ${tier.name}</span>
                    </div>
                    <div class="profile-stats">
                        <span>주인공으로 태그된 사진 <b>${targetPhotos.length}개</b></span>
                        <span>태그된 피드 총 좋아요 <b>${totalLikes}개</b></span>
                    </div>
                </div>
            </div>

            <div class="instagram-grid" id="profileGrid"></div>
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
        let tier = getTierInfo(uploadedLikes);
        membersListHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 10px;">
                <span style="font-weight: 700;">🎯 ${m}</span>
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

async function addComment(photoId) {
    const input = document.getElementById(`commentInput_${photoId}`);
    const content = input.value.trim();
    if (!content) return;

    const { error } = await supabaseClient.from('comments').insert([{ photo_id: photoId, author: currentUser, content: content, likes: 0, liked_users: [] }]);
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

    const { error } = await supabaseClient.from('replies').insert([{ comment_id: commentId, author: currentUser, content: content }]);
    if (error) { alert("답글 작성 실패: " + error.message); return; }
    activeReplyCommentId = null;
    await fetchReplies();
    renderGalleryList();
}

async function deleteComment(commentId) {
    if (confirm("댓글을 삭제하시겠습니까?")) {
        await supabaseClient.from('replies').delete().eq('comment_id', commentId);
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

    const { error: storageError } = await supabaseClient.storage.from('yubsa-bucket').upload(fileName, file);
    if (storageError) { 
        alert("업로드 실패: " + storageError.message); 
        return; 
    }

    const { data: publicUrlData } = supabaseClient.storage.from('yubsa-bucket').getPublicUrl(fileName);
    const imageUrl = publicUrlData.publicUrl;

    const { error: dbError } = await supabaseClient.from('photos').insert([
        { title: photoTitle, url: imageUrl, target: selectedTargets, uploader: currentUser, likes: 0, liked_users: [] }
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

            let authorUploadedLikes = getUploaderTotalLikes(c.author);
            let authorTier = getTierInfo(authorUploadedLikes);

            let commentReplies = repliesMap[c.id] || [];
            let repliesHtml = "";
            commentReplies.forEach(r => {
                let canDeleteReply = (r.author === currentUser);
                repliesHtml += `
                    <div class="reply-item">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight:700; color:var(--text-main);">${r.author}</span>
                            ${canDeleteReply ? `<span style="cursor:pointer; color:var(--danger); font-size:0.7rem;" onclick="deleteReply(${r.id})">삭제</span>` : ''}
                        </div>
                        <div style="margin-top:2px;">${r.content}</div>
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
                            ${canModifyComment ? `<span style="cursor:pointer; color:var(--danger);" onclick="deleteComment(${c.id})">삭제</span>` : ''}
                        </div>
                    </div>
                    <div style="margin-top:2px;">${c.content}</div>
                    
                    ${repliesHtml}

                    ${activeReplyCommentId === c.id ? `
                    <div class="comment-form" style="margin-top: 6px; margin-left: 16px;">
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
                    
                    ${canDelete ? `
                    <div class="action-buttons">
                        <button class="action-btn btn-delete" onclick="deletePhoto(${photo.id}, '${photo.url}')">
                            🗑️ 삭제
                        </button>
                    </div>` : ''}

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

    let likedUsers = Array.isArray(photo.liked_users) ? [...photo.liked_users] : [];
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