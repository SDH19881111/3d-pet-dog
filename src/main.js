import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gameState, SHOP_ITEMS } from './state.js';
import { ChibiDog } from './pet.js';
import { createItemMesh, createPoopMesh } from './items.js';

// --- 전역 변수 및 게임 환경 설정 ---
let scene, camera, renderer, controls;
let dog;
let clock;

// 3D 오브젝트 컬렉션
const placed3DItems = {}; // { placedId: groupMesh }
const poops3D = {};       // { poopId: groupMesh }

// 레이캐스팅 및 그리드 배치용 변수
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let groundPlane;
let gridHelper;
let placementIndicator; // 배치 시 마우스 따라다니는 투명한 미리보기
let currentSelectedItem = null; // { id, category }

// UI 요소 캐시
const petNameEl = document.getElementById('pet-name');
const statusTextEl = document.getElementById('pet-status-text');
const affinityLevelEl = document.getElementById('affinity-level');
const affinityPctEl = document.getElementById('affinity-pct');
const affinityBarFill = document.getElementById('affinity-bar-fill');
const hungerFill = document.querySelector('.hunger-fill');
const thirstFill = document.querySelector('.thirst-fill');
const cleanlinessFill = document.querySelector('.cleanliness-fill');
const shopPanel = document.getElementById('shop-panel');
const shopItemsList = document.getElementById('shop-items-list');
const notificationEl = document.getElementById('game-notification');
const btnEditMode = document.getElementById('btn-edit-mode');

// 배치 상태 모드
let isEditMode = false;

// --- 초기화 과정 ---
function init() {
    clock = new THREE.Clock();

    // 1. Scene 설정
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdceefb); // 부드러운 하늘색 파스텔톤
    scene.fog = new THREE.FogExp2(0xdceefb, 0.08);

    // 2. Camera 설정
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 6, 8);

    // 3. Renderer 설정
    const container = document.getElementById('canvas-container');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Controls 설정
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1; // 땅 밑으로 카메라가 들어가지 않도록 제한
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.target.set(0, 0.5, 0);

    // 5. 조명 설정 (Soft Lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 3);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 6;
    dirLight.shadow.camera.bottom = -6;
    dirLight.shadow.camera.left = -6;
    dirLight.shadow.camera.right = 6;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // 6. 마당(땅) 구현
    buildEnvironment();

    // 7. 강아지 소환
    dog = new ChibiDog(scene);

    // 8. 그리드 헬퍼 및 배치 가이드라인 (에디터 모드 전용)
    gridHelper = new THREE.GridHelper(10, 10, 0xbdc3c7, 0xe2e8f0);
    gridHelper.position.y = 0.01;
    gridHelper.visible = false;
    scene.add(gridHelper);

    // 배치할 때 미리보기로 보일 임시 링
    const indicatorGeo = new THREE.RingGeometry(0.3, 0.35, 32);
    const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x4fd1c5, side: THREE.DoubleSide });
    placementIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
    placementIndicator.rotation.x = Math.PI / 2;
    placementIndicator.position.y = 0.02;
    placementIndicator.visible = false;
    scene.add(placementIndicator);

    // 9. 로드된 상태 데이터 3D 적용
    syncStateTo3D();

    // 10. 이벤트 및 루프 바인딩
    setupEventListeners();
    animate();
}

// 3D 마당 및 배경 오브젝트 빌드
function buildEnvironment() {
    // 잔디밭 (둥근 녹색 땅)
    const groundGeo = new THREE.CylinderGeometry(6, 6, 0.2, 32);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x82e0aa }); // 산뜻한 녹색
    groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.position.y = -0.1;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // 마당 울타리 (Fences - 단순 상자들로 원형 배치)
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0xf5f7fa });
    const fenceGeo = new THREE.BoxGeometry(0.1, 0.35, 0.6);
    const radius = 5.6;
    for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const fence = new THREE.Mesh(fenceGeo, fenceMat);
        fence.position.set(x, 0.15, z);
        fence.rotation.y = -angle + Math.PI / 2;
        fence.castShadow = true;
        scene.add(fence);
    }

    // 마당 구석의 귀여운 3D 저폴리 나무들
    createLowPolyTree(-4.2, 0, -3.2);
    createLowPolyTree(4.2, 0, -3.8);
    createLowPolyTree(-4.5, 0, 2.5);
}

// 저폴리 나무 데코레이션 생성기
function createLowPolyTree(x, y, z) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);

    // 나무 기둥
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 0.8, 6),
        new THREE.MeshLambertMaterial({ color: 0x873a5c })
    );
    trunk.position.y = 0.4;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // 나뭇잎 (구형 겹치기)
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x27ae60 });
    const leaf1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55), leavesMat);
    leaf1.position.y = 1.0;
    leaf1.castShadow = true;
    treeGroup.add(leaf1);

    const leaf2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), leavesMat);
    leaf2.position.set(0.2, 1.3, -0.1);
    leaf2.castShadow = true;
    treeGroup.add(leaf2);

    const leaf3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35), leavesMat);
    leaf3.position.set(-0.2, 1.2, 0.2);
    leaf3.castShadow = true;
    treeGroup.add(leaf3);

    scene.add(treeGroup);
}

// --- 게임 상태와 3D 화면 동기화 ---
function syncStateTo3D() {
    const state = gameState.state;

    // 1. 이름 설정
    petNameEl.textContent = state.petName;

    // 2. 강아지 의상 동기화
    dog.setClothes(state.equippedClothes);

    // 3. 배치된 아이템 3D 로드
    // 기존 배치된 모든 3D 아이템 제거
    Object.keys(placed3DItems).forEach(id => {
        scene.remove(placed3DItems[id]);
        delete placed3DItems[id];
    });
    // 상태 파일 기준으로 3D 재설치
    state.placedItems.forEach(item => {
        addItemToScene(item);
    });

    // 4. 똥 3D 로드
    Object.keys(poops3D).forEach(id => {
        scene.remove(poops3D[id]);
        delete poops3D[id];
    });
    state.poops.forEach(poop => {
        addPoopToScene(poop);
    });

    // 5. 게이지 바 업데이트
    updateUIBars();
}

// UI 게이지 갱신
function updateUIBars() {
    const state = gameState.state;

    // 호감도 바
    affinityLevelEl.textContent = state.affinityLevel;
    const xpPercent = Math.floor(state.affinityXP);
    affinityPctEl.textContent = `${xpPercent}%`;
    affinityBarFill.style.width = `${xpPercent}%`;

    // 욕구 바들
    hungerFill.style.width = `${state.hunger}%`;
    thirstFill.style.width = `${state.thirst}%`;
    cleanlinessFill.style.width = `${state.cleanliness}%`;

    // 강아지 상태 설명 변경
    const minStat = Math.min(state.hunger, state.thirst, state.cleanliness);
    if (state.poops.length > 2) {
        statusTextEl.textContent = "똥 때문에 화가 남 💢";
        statusTextEl.style.color = "#c53030";
    } else if (state.cleanliness < 30) {
        statusTextEl.textContent = "몸이 찝찝함 🧼";
        statusTextEl.style.color = "#d69e2e";
    } else if (state.hunger < 30) {
        statusTextEl.textContent = "배가 고픔 🍖";
        statusTextEl.style.color = "#e53e3e";
    } else if (state.thirst < 30) {
        statusTextEl.textContent = "목이 마름 💧";
        statusTextEl.style.color = "#3182ce";
    } else if (dog.state === 'sleep') {
        statusTextEl.textContent = "쿨쿨 자는 중 💤";
        statusTextEl.style.color = "#718096";
    } else {
        statusTextEl.textContent = "기분이 매우 행복함 🥰";
        statusTextEl.style.color = "#2b6cb0";
    }
}

// 3D 씬에 아이템 추가
function addItemToScene(itemData) {
    const itemMesh = createItemMesh(itemData.itemId);
    itemMesh.position.set(itemData.position.x, itemData.position.y, itemData.position.z);
    itemMesh.rotation.y = itemData.rotation;
    
    // 레이캐스팅 구분을 위한 태그 달기
    itemMesh.userData = {
        placedId: itemData.id,
        itemId: itemData.itemId,
        category: itemData.category,
        isPlacedItem: true
    };
    
    scene.add(itemMesh);
    placed3DItems[itemData.id] = itemMesh;
}

// 3D 씬에 똥 추가
function addPoopToScene(poopData) {
    const poopMesh = createPoopMesh();
    poopMesh.position.set(poopData.position.x, poopData.position.y, poopData.position.z);
    
    poopMesh.userData = {
        poopId: poopData.id,
        isPoop: true
    };

    scene.add(poopMesh);
    poops3D[poopData.id] = poopMesh;
}

// --- 이벤트 바인딩 및 핸들링 ---
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);

    // 마우스 클릭 레이캐스팅
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    // 1. 기본 액션 버튼 이벤트
    document.getElementById('btn-pet').addEventListener('click', () => {
        if (dog.state === 'sleep') {
            gameState.emit("notification", "💤 강아지가 자고 있습니다. 쓰다듬으면 깰 수 있어요!");
            dog.changeState('idle');
            return;
        }
        gameState.pet();
    });

    document.getElementById('btn-feed').addEventListener('click', () => {
        if (dog.state === 'sleep') {
            gameState.emit("notification", "💤 자는 강아지에게 밥을 줄 수 없습니다.");
            return;
        }
        // 밥그릇이 배치되어 있는지 확인
        const bowls = gameState.state.placedItems.filter(i => i.category === 'bowl');
        if (bowls.length === 0) {
            gameState.emit("notification", "⚠️ 마당에 밥그릇이 없습니다! 배치 모드에서 밥그릇을 먼저 설치해 주세요.");
            return;
        }
        
        // 가장 가까운 밥그릇 찾기
        const bowlData = bowls[0];
        const bowl3D = placed3DItems[bowlData.id];

        // 밥 먹으러 이동하는 애니메이션 트리거
        dog.changeState('walk', new THREE.Vector3(bowlData.position.x, 0.4, bowlData.position.z + 0.5));
        
        // 밥그릇 도달 즈음에 밥먹기 행동 연계
        setTimeout(() => {
            dog.changeState('eat');
            gameState.feed();
            
            // 밥그릇 채우기 비주얼 활성화
            if (bowl3D && bowl3D.foodVisual) {
                bowl3D.foodVisual.visible = true;
                // 먹고 나면 서서히 사라지도록
                setTimeout(() => { bowl3D.foodVisual.visible = false; }, 3500);
            }
        }, 1500);
    });

    document.getElementById('btn-water').addEventListener('click', () => {
        if (dog.state === 'sleep') {
            gameState.emit("notification", "💤 자는 강아지에게 물을 줄 수 없습니다.");
            return;
        }
        // 밥그릇(물그릇)이 배치되어 있는지 확인
        const bowls = gameState.state.placedItems.filter(i => i.category === 'bowl');
        if (bowls.length === 0) {
            gameState.emit("notification", "⚠️ 마당에 식기가 없습니다! 배치 모드에서 식기(밥그릇)를 먼저 설치해 주세요.");
            return;
        }
        
        const bowlData = bowls[0];
        // 밥 먹으러 이동하는 애니메이션 트리거 (식기에 밥과 물이 같이 표현됨)
        dog.changeState('walk', new THREE.Vector3(bowlData.position.x, 0.4, bowlData.position.z + 0.5));
        
        setTimeout(() => {
            dog.changeState('eat');
            gameState.water();
        }, 1500);
    });

    document.getElementById('btn-clean').addEventListener('click', () => {
        gameState.cleanPoop();
    });

    // 2. 배치 모드 토글
    btnEditMode.addEventListener('click', toggleEditMode);
    document.getElementById('btn-exit-edit').addEventListener('click', () => toggleEditMode(false));

    // 3. 상점 카테고리 탭 클릭
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            renderShopItems(e.target.dataset.category);
        });
    });

    // 4. 게임 상태 변경 이벤트 리스너 연동
    gameState.subscribe('statsChanged', updateUIBars);
    
    gameState.subscribe('affinityChanged', () => {
        updateUIBars();
        // 레벨업이나 해금 발생 시 상점 UI 리렌더링
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) renderShopItems(activeTab.dataset.category);
    });

    gameState.subscribe('levelUp', (newLevel) => {
        showCelebrationEffect();
    });

    gameState.subscribe('petAction', () => {
        dog.changeState('pet');
        // 강아지 머리 부근 2D 하트 뿜뿜 효과
        createHeartsOnDog();
    });

    gameState.subscribe('notification', (msg) => {
        showNotification(msg);
    });

    gameState.subscribe('poopSpawned', (poopData) => {
        addPoopToScene(poopData);
    });

    gameState.subscribe('poopCleaned', (poopId) => {
        if (poops3D[poopId]) {
            scene.remove(poops3D[poopId]);
            delete poops3D[poopId];
        }
    });

    gameState.subscribe('itemPlaced', (itemData) => {
        addItemToScene(itemData);
    });

    gameState.subscribe('itemRemoved', (placedId) => {
        if (placed3DItems[placedId]) {
            scene.remove(placed3DItems[placedId]);
            delete placed3DItems[placedId];
        }
    });

    gameState.subscribe('clothesEquipped', (itemId) => {
        dog.setClothes(itemId);
    });

    gameState.subscribe('stateReset', () => {
        syncStateTo3D();
        dog.changeState('idle');
    });

    // 5. 치트 키 버튼 리스너
    document.getElementById('cheat-toggle').addEventListener('click', () => {
        document.getElementById('cheat-content').classList.remove('hidden');
        document.getElementById('cheat-toggle').classList.add('hidden');
    });
    document.getElementById('cheat-close').addEventListener('click', () => {
        document.getElementById('cheat-content').classList.add('hidden');
        document.getElementById('cheat-toggle').classList.remove('hidden');
    });

    document.getElementById('cheat-poop').addEventListener('click', () => {
        gameState.spawnPoop();
    });
    document.getElementById('cheat-thirsty').addEventListener('click', () => {
        gameState.state.thirst = 5;
        gameState.decayStats();
    });
    document.getElementById('cheat-hungry').addEventListener('click', () => {
        gameState.state.hunger = 5;
        gameState.decayStats();
    });
    document.getElementById('cheat-love').addEventListener('click', () => {
        gameState.cheatAddXP(20);
    });
    document.getElementById('cheat-reset').addEventListener('click', () => {
        if (confirm("정말 강아지 키우기 데이터를 초기화 하시겠습니까?")) {
            gameState.resetState();
        }
    });

    // 6. 강아지 랜덤 자율 주행 및 수면 타이머 설정
    setInterval(handleDogAutonomy, 6000);
}

// 윈도우 리사이즈
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 상점 아이템 렌더링
function renderShopItems(category) {
    shopItemsList.innerHTML = '';
    const items = SHOP_ITEMS[category];
    const userLevel = gameState.state.affinityLevel;

    items.forEach(item => {
        const isLocked = item.level > userLevel;
        const isEquippedClothes = category === 'clothes' && gameState.state.equippedClothes === item.id;
        
        // 밥그릇/집의 경우 이미 설치되어 있는지 확인
        let isPlaced = false;
        if (category === 'house' || category === 'bowl') {
            isPlaced = gameState.state.placedItems.some(i => i.itemId === item.id);
        }

        const card = document.createElement('div');
        card.className = `shop-item-card ${isLocked ? 'locked' : ''} ${isEquippedClothes || isPlaced ? 'active' : ''}`;
        
        card.innerHTML = `
            <div class="item-visual">${item.emoji}</div>
            <div class="item-details">
                <span class="item-name">${item.name}</span>
                <span class="item-desc">${item.desc}</span>
            </div>
            <div class="item-unlock-badge">
                ${isLocked ? `Lv.${item.level} 해금` : (isEquippedClothes ? '착용됨' : (isPlaced ? '설치됨' : '선택'))}
            </div>
        `;

        if (!isLocked) {
            card.addEventListener('click', () => {
                if (category === 'clothes') {
                    // 옷은 클릭 즉시 착용
                    gameState.equipClothes(item.id);
                    renderShopItems(category);
                } else {
                    // 다른 가구 아이템은 설치 대기 상태로 변경
                    document.querySelectorAll('.shop-item-card').forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    currentSelectedItem = { id: item.id, category: category };
                    showNotification(`💡 마당을 클릭하여 [${item.name}]을 설치하세요.`);
                }
            });
        } else {
            card.addEventListener('click', () => {
                showNotification(`🔒 이 아이템을 얻으려면 호감도 레벨 ${item.level}을 달성해야 합니다!`);
            });
        }

        shopItemsList.appendChild(card);
    });
}

// 배치 모드 켜기/끄기
function toggleEditMode(forceState = null) {
    isEditMode = (forceState !== null) ? forceState : !isEditMode;

    if (isEditMode) {
        btnEditMode.classList.add('active');
        shopPanel.classList.remove('hidden');
        gridHelper.visible = true;
        
        // 기본으로 첫 번째 탭 열기
        document.querySelector('.tab-btn[data-category="house"]').click();
        
        // 카메라 시점 조정 (위에서 내려다보기)
        controls.minPolarAngle = 0.2;
        gsapToCameraTarget(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 7, 7));
    } else {
        btnEditMode.classList.remove('active');
        shopPanel.classList.add('hidden');
        gridHelper.visible = false;
        placementIndicator.visible = false;
        currentSelectedItem = null;
        
        // 카메라 시점 복원
        controls.minPolarAngle = 0;
        gsapToCameraTarget(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0, 6, 8));
    }
}

// 부드러운 카메라 조정을 위한 헬퍼 (Tween 느낌의 딜레이)
function gsapToCameraTarget(targetPos, camPos) {
    let t = 0;
    const steps = 30;
    const startCam = camera.position.clone();
    const startTar = controls.target.clone();

    function step() {
        t += 1 / steps;
        camera.position.lerpVectors(startCam, camPos, t);
        controls.target.lerpVectors(startTar, targetPos, t);
        controls.update();
        if (t < 1) requestAnimationFrame(step);
    }
    step();
}

// --- 마우스 입력 & 레이캐스팅 액션 ---

// 1. 마우스 이동시 미리보기 링 위치 추적 (배치 모드용)
function onPointerMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (isEditMode && currentSelectedItem) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(groundPlane);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            
            // 그리드 격자 스냅 피팅 (1단위 스냅)
            const snapX = Math.round(point.x);
            const snapZ = Math.round(point.z);

            // 마당 바깥으로 못 나가게 범위 제한
            if (snapX * snapX + snapZ * snapZ < 5.2 * 5.2) {
                placementIndicator.position.set(snapX, 0.05, snapZ);
                placementIndicator.visible = true;
            } else {
                placementIndicator.visible = false;
            }
        } else {
            placementIndicator.visible = false;
        }
    }
}

// 2. 마우스 클릭 (강아지 클릭, 똥 치우기, 아이템 배치 등)
function onPointerDown(event) {
    // UI 위를 클릭한 경우는 예외
    if (event.target.closest('#ui-container')) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (isEditMode) {
        // --- 배치 모드에서의 클릭 ---
        if (currentSelectedItem && placementIndicator.visible) {
            // 아이템 건설/배치 실행
            const success = gameState.placeItem(
                currentSelectedItem.id,
                currentSelectedItem.category,
                { ...placementIndicator.position }
            );
            if (success) {
                // 배치 성공시 리렌더링
                renderShopItems(currentSelectedItem.category);
            }
        } else {
            // 배치 아이템 철거 기능 (배치된 아이템을 직접 클릭)
            const intersects = raycaster.intersectObjects(scene.children, true);
            const targetPlaced = intersects.find(i => {
                let p = i.object;
                while (p && p !== scene) {
                    if (p.userData && p.userData.isPlacedItem) return true;
                    p = p.parent;
                }
                return false;
            });

            if (targetPlaced) {
                let p = targetPlaced.object;
                while (p && !p.userData.isPlacedItem) p = p.parent;
                
                if (confirm(`🧹 [${SHOP_ITEMS[p.userData.category].find(i=>i.id===p.userData.itemId).name}]을 철거하시겠습니까?`)) {
                    gameState.removePlacedItem(p.userData.placedId);
                    // 설치 해제되었으니 상점 업데이트
                    renderShopItems(p.userData.category);
                }
            }
        }
    } else {
        // --- 일반 모드에서의 클릭 ---
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        // 1. 강아지 터치 확인
        const hitDog = intersects.some(i => {
            let p = i.object;
            while (p) {
                if (p === dog.group) return true;
                p = p.parent;
            }
            return false;
        });

        if (hitDog) {
            if (dog.state === 'sleep') {
                gameState.emit("notification", "💤 웅크려 자던 강아지가 눈을 번쩍 떴습니다!");
                dog.changeState('idle');
            } else {
                gameState.pet();
            }
            return;
        }

        // 2. 똥 클릭 확인 (치우기)
        const hitPoop = intersects.find(i => {
            let p = i.object;
            while (p && p !== scene) {
                if (p.userData && p.userData.isPoop) return true;
                p = p.parent;
            }
            return false;
        });

        if (hitPoop) {
            let poopObj = hitPoop.object;
            while (poopObj && !poopObj.userData.isPoop) poopObj = poopObj.parent;
            gameState.cleanPoop(poopObj.userData.poopId);
            return;
        }

        // 3. 빈 땅 클릭 시 강아지가 해당 위치로 걸어가게 함
        const hitGround = raycaster.intersectObject(groundPlane);
        if (hitGround.length > 0 && dog.state !== 'sleep') {
            const point = hitGround[0].point;
            // 너무 가장자리가 아닌 마당 안쪽으로만 걷기
            if (point.x * point.x + point.z * point.z < 5.0 * 5.0) {
                dog.changeState('walk', new THREE.Vector3(point.x, 0.4, point.z));
            }
        }
    }
}

// --- 자율 인공지능/스케줄 로직 ---
function handleDogAutonomy() {
    if (dog.state !== 'idle') return; // 걷기, 잠자기, 먹는 중에는 개입 안 함

    const state = gameState.state;
    const rand = Math.random();

    // 1. 욕구 바가 극단적으로 낮으면 눕거나 졸기 확률 증가
    if (state.hunger < 25 || state.thirst < 25) {
        if (rand < 0.4) {
            dog.changeState('sleep');
            return;
        }
    }

    // 2. 평상시 확률에 따른 자율 행동
    if (rand < 0.3) {
        // 랜덤 위치로 순찰 걷기
        const targetX = (Math.random() - 0.5) * 6;
        const targetZ = (Math.random() - 0.5) * 6;
        dog.changeState('walk', new THREE.Vector3(targetX, 0.4, targetZ));
    } 
    else if (rand < 0.42) {
        // 낮잠 자기
        dog.changeState('sleep');
    }
    
    // 3. 자율적 똥 싸기 (일일 확률 시뮬레이션: 타이머 주기 6초 중 0.5% 확률로 응아)
    // 실제 게임 밸런스상 플레이 중 가끔 싸야 똥 치우기 놀이가 가능하므로 약 10~15분 주기가 되도록 설정
    if (rand > 0.992 && state.poops.length < 3) {
        gameState.spawnPoop();
    }
}

// --- 이펙트 및 알림 효과 ---

// 1. 알림 메시지 노출 헬퍼
let notificationTimeout;
function showNotification(msg) {
    clearTimeout(notificationTimeout);
    notificationEl.textContent = msg;
    notificationEl.classList.remove('hidden');

    notificationTimeout = setTimeout(() => {
        notificationEl.classList.add('hidden');
    }, 3000);
}

// 2. 강아지 머리 위에 하트 2D 이펙트 뿜기
function createHeartsOnDog() {
    // 3D 위치를 2D 화면 좌표로 투영
    const dogPos = new THREE.Vector3();
    dog.group.getWorldPosition(dogPos);
    dogPos.y += 0.8; // 머리 위 공중

    const tempV = dogPos.clone().project(camera);
    const x = (tempV.x *  .5 + .5) * window.innerWidth;
    const y = (tempV.y * -.5 + .5) * window.innerHeight;

    // 하트 파티클 생성
    const particleContainer = document.getElementById('particle-container');
    
    for (let i = 0; i < 5; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart-particle';
        heart.textContent = '❤️';
        heart.style.left = `${x + (Math.random() - 0.5) * 60}px`;
        heart.style.top = `${y + (Math.random() - 0.5) * 40}px`;
        
        // 랜덤한 좌우 확산 방향 설정
        heart.style.setProperty('--tx', `${(Math.random() - 0.5) * 80}px`);
        
        particleContainer.appendChild(heart);

        // 1초 후 제거
        setTimeout(() => heart.remove(), 1000);
    }
}

// 3. 레벨업 폭죽/축하 효과 (2D 이펙트 폭탄)
function showCelebrationEffect() {
    const container = document.getElementById('particle-container');
    const emojis = ['🎉', '✨', '❤️', '🦴', '🌟', '🐾'];
    
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = 'heart-particle';
        p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        p.style.left = `${Math.random() * window.innerWidth}px`;
        p.style.top = `${Math.random() * window.innerHeight}px`;
        p.style.fontSize = `${1.2 + Math.random() * 1.5}rem`;
        p.style.setProperty('--tx', `${(Math.random() - 0.5) * 200}px`);
        
        container.appendChild(p);
        setTimeout(() => p.remove(), 1200);
    }
}

// --- 메인 게임 루프 ---
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    const time = clock.getElapsedTime();

    // 1. 강아지 상태 및 애니메이션 업데이트
    if (dog) {
        dog.update(deltaTime, time);
    }

    // 2. 궤도 카메라 업데이트
    if (controls) {
        controls.update();
    }

    // 3. 렌더링
    renderer.render(scene, camera);
}

// 시작 실행
init();
