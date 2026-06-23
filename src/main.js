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
let placementIndicator; 
let currentSelectedItem = null; 

// 날씨 관련 3D 이펙트 (비 파티클)
let rainParticles;
const RAIN_COUNT = 800;
let rainPositions = [];

// UI 요소 캐시
const petNameEl = document.getElementById('pet-name');
const statusTextEl = document.getElementById('pet-status-text');
const weatherBadgeEl = document.getElementById('weather-badge');
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

    // 1. Scene 설정 (솜사탕 테마의 기본 부드러운 분홍빛이 살짝 도는 소다 블루)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8f4f8);
    scene.fog = new THREE.FogExp2(0xe8f4f8, 0.08);

    // 2. Camera 설정
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 5.5, 7.5);

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
    controls.maxPolarAngle = Math.PI / 2.1; 
    controls.minDistance = 3;
    controls.maxDistance = 14;
    controls.target.set(0, 0.4, 0);

    // 5. 조명 설정 (소프트 크림 조명)
    const ambientLight = new THREE.AmbientLight(0xfffdf6, 0.85); // 따뜻한 미색
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x555555, 0.45);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbf0, 0.75);
    dirLight.position.set(6, 12, 4);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 5;
    dirLight.shadow.camera.bottom = -5;
    dirLight.shadow.camera.left = -5;
    dirLight.shadow.camera.right = 5;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0006;
    scene.add(dirLight);

    // 6. 마당(땅) 구현
    buildEnvironment();

    // 7. 강아지 소환
    dog = new ChibiDog(scene);

    // 8. 에디터 그리드 및 인디케이터
    gridHelper = new THREE.GridHelper(10, 10, 0xbab2c8, 0xe8e5ee);
    gridHelper.position.y = 0.01;
    gridHelper.visible = false;
    scene.add(gridHelper);

    const indicatorGeo = new THREE.RingGeometry(0.28, 0.33, 32);
    const indicatorMat = new THREE.MeshBasicMaterial({ color: 0xff7b90, side: THREE.DoubleSide });
    placementIndicator = new THREE.Mesh(indicatorGeo, indicatorMat);
    placementIndicator.rotation.x = Math.PI / 2;
    placementIndicator.position.y = 0.02;
    placementIndicator.visible = false;
    scene.add(placementIndicator);

    // 9. 날씨용 3D 비 파티클 시스템 초기 구축
    buildRainSystem();

    // 10. 로드된 상태 데이터 동기화
    syncStateTo3D();

    // 11. 이벤트 바인딩 및 루프
    setupEventListeners();
    animate();

    // 12. 날씨 자동 전이 사이클 가동 (2분마다 변경 체크)
    setInterval(handleWeatherCycle, 120000);
    // 첫 날씨 반영
    updateWeatherVisual(gameState.state.currentWeather);
}

// 마당 및 데코레이션 구축 (부드러운 마시멜로 톤)
function buildEnvironment() {
    // 둥글고 부드러운 그린 톤 잔디
    const groundGeo = new THREE.CylinderGeometry(5.8, 5.8, 0.2, 36);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xabebc6, roughness: 0.95 }); // 연두색 솜사탕 잔디
    groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.position.y = -0.1;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // 둥글둥글한 마시멜로 울타리들
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.9 });
    const fenceGeo = new THREE.CapsuleGeometry(0.04, 0.22, 6, 12);
    const radius = 5.4;
    for (let i = 0; i < 28; i++) {
        const angle = (i / 28) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const fence = new THREE.Mesh(fenceGeo, fenceMat);
        fence.position.set(x, 0.1, z);
        fence.rotation.y = -angle + Math.PI / 2;
        fence.castShadow = true;
        scene.add(fence);
    }

    // 마당 외곽 구름 나무 데코들 (머리를 부드러운 캡슐/구체로 표현)
    createSoftTree(-3.8, 0, -2.8);
    createSoftTree(3.8, 0, -3.2);
    createSoftTree(-4.2, 0, 2.2);
}

// 솜사탕 모양의 소프트 데코 트리
function createSoftTree(x, y, z) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);

    // 나무 기둥 (둥글게 가공)
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.14, 0.75, 8),
        new THREE.MeshStandardMaterial({ color: 0xba8f71, roughness: 0.9 })
    );
    trunk.position.y = 0.35;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // 구름 나뭇잎 (민트/연두 파스텔톤 구체 겹치기)
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x82e0aa, roughness: 0.95 });
    const leafGeo = new THREE.SphereGeometry(0.48, 12, 12);
    
    const leaf1 = new THREE.Mesh(leafGeo, leavesMat);
    leaf1.position.y = 0.9;
    leaf1.castShadow = true;
    treeGroup.add(leaf1);

    const leaf2 = new THREE.Mesh(leafGeo, leavesMat);
    leaf2.position.set(0.18, 1.15, -0.1);
    leaf2.scale.set(0.8, 0.8, 0.8);
    leaf2.castShadow = true;
    treeGroup.add(leaf2);

    const leaf3 = new THREE.Mesh(leafGeo, leavesMat);
    leaf3.position.set(-0.18, 1.05, 0.15);
    leaf3.scale.set(0.85, 0.85, 0.85);
    leaf3.castShadow = true;
    treeGroup.add(leaf3);

    scene.add(treeGroup);
}

// 3D 비 이펙트 파티클 빌드
function buildRainSystem() {
    const rainGeo = new THREE.BufferGeometry();
    rainPositions = [];

    // 800개의 하늘 위 빗방울 위치 임의 생성
    for (let i = 0; i < RAIN_COUNT; i++) {
        rainPositions.push((Math.random() - 0.5) * 12); // x
        rainPositions.push(Math.random() * 8);          // y (공중)
        rainPositions.push((Math.random() - 0.5) * 12); // z
    }

    rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3));

    // 하늘색 투명한 빗방울 머티리얼
    const rainMat = new THREE.PointsMaterial({
        color: 0xaec6cf,
        size: 0.045,
        transparent: true,
        opacity: 0.65
    });

    rainParticles = new THREE.Points(rainGeo, rainMat);
    rainParticles.visible = false;
    scene.add(rainParticles);
}

// --- 게임 상태와 3D 화면 동기화 ---
function syncStateTo3D() {
    const state = gameState.state;

    petNameEl.textContent = state.petName;
    dog.setClothes(state.equippedClothes);

    // 가구 로드
    Object.keys(placed3DItems).forEach(id => {
        scene.remove(placed3DItems[id]);
        delete placed3DItems[id];
    });
    state.placedItems.forEach(item => {
        addItemToScene(item);
    });

    // 똥 로드
    Object.keys(poops3D).forEach(id => {
        scene.remove(poops3D[id]);
        delete poops3D[id];
    });
    state.poops.forEach(poop => {
        addPoopToScene(poop);
    });

    updateUIBars();
}

function updateUIBars() {
    const state = gameState.state;

    affinityLevelEl.textContent = state.affinityLevel;
    const xpPercent = Math.floor(state.affinityXP);
    affinityPctEl.textContent = `${xpPercent}%`;
    affinityBarFill.style.width = `${xpPercent}%`;

    hungerFill.style.width = `${state.hunger}%`;
    thirstFill.style.width = `${state.thirst}%`;
    cleanlinessFill.style.width = `${state.cleanliness}%`;

    // 펫 상태 메시지 연동
    const minStat = Math.min(state.hunger, state.thirst, state.cleanliness);
    if (state.poops.length > 2) {
        statusTextEl.textContent = "마당에 똥이 너무 많음 💩";
        statusTextEl.style.color = "#c53030";
    } else if (state.cleanliness < 35) {
        statusTextEl.textContent = "몸을 씻고 싶음 🧼";
        statusTextEl.style.color = "#d69e2e";
    } else if (state.hunger < 35) {
        statusTextEl.textContent = "배가 아주 고픔 🍖";
        statusTextEl.style.color = "#e53e3e";
    } else if (state.thirst < 35) {
        statusTextEl.textContent = "목이 많이 마름 💧";
        statusTextEl.style.color = "#3182ce";
    } else if (dog.state === 'sleep') {
        statusTextEl.textContent = "새근새근 낮잠 중 💤";
        statusTextEl.style.color = "#718096";
    } else if (dog.state === 'walk_action') {
        statusTextEl.textContent = "신나게 마당 산책 중 🦮";
        statusTextEl.style.color = "#2f855a";
    } else {
        statusTextEl.textContent = "기분이 최고예요 💕";
        statusTextEl.style.color = "#2b6cb0";
    }

    // 날씨 뱃지 클래스 갱신
    weatherBadgeEl.className = `weather-badge ${state.currentWeather}`;
    let weatherEmoji = "☀️";
    let weatherText = "맑음";
    switch (state.currentWeather) {
        case "rain": weatherEmoji = "🌧️"; weatherText = "비"; break;
        case "heatwave": weatherEmoji = "🥵"; weatherText = "폭염"; break;
        case "wind": weatherEmoji = "💨"; weatherText = "강풍"; break;
    }
    weatherBadgeEl.textContent = `${weatherEmoji} ${weatherText}`;
}

// 3D 날씨 비주얼 업데이트 (배경 컬러 보정 & 이펙트 토글)
function updateWeatherVisual(weather) {
    if (!scene) return;

    let targetBgColor = 0xe8f4f8; // 맑음: 연한 소다
    
    switch (weather) {
        case "clear":
            targetBgColor = 0xe8f4f8;
            rainParticles.visible = false;
            break;
        case "rain":
            targetBgColor = 0xaab7b8; // 비: 우중충한 흐린 하늘
            rainParticles.visible = true;
            break;
        case "heatwave":
            targetBgColor = 0xfadbd8; // 폭염: 연분홍빛 도는 더운 파스텔
            rainParticles.visible = false;
            break;
        case "wind":
            targetBgColor = 0xd5dbdb; // 강풍: 탁한 회백색
            rainParticles.visible = false;
            break;
    }

    // 부드럽게 배경 및 Fog 색상 변경
    scene.background.setHex(targetBgColor);
    scene.fog.color.setHex(targetBgColor);
}

function addItemToScene(itemData) {
    const itemMesh = createItemMesh(itemData.itemId);
    itemMesh.position.set(itemData.position.x, itemData.position.y, itemData.position.z);
    itemMesh.rotation.y = itemData.rotation;
    
    itemMesh.userData = {
        placedId: itemData.id,
        itemId: itemData.itemId,
        category: itemData.category,
        isPlacedItem: true
    };
    
    scene.add(itemMesh);
    placed3DItems[itemData.id] = itemMesh;
}

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

// --- 이벤트 등록 ---
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    // 1. 기본 액션 버튼들
    document.getElementById('btn-pet').addEventListener('click', () => {
        if (dog.state === 'sleep') {
            gameState.emit("notification", "💤 쿨쿨 자던 강아지가 일어나며 기지개를 켭니다.");
            dog.changeState('idle');
        }
        gameState.pet();
    });

    document.getElementById('btn-feed').addEventListener('click', () => {
        if (dog.state === 'sleep') {
            gameState.emit("notification", "💤 자고 있는 강아지는 먹을 수 없어요.");
            return;
        }
        const bowls = gameState.state.placedItems.filter(i => i.category === 'bowl');
        if (bowls.length === 0) {
            gameState.emit("notification", "⚠️ 밥을 먹이려면 마당에 [밥그릇]을 먼저 설치해 주셔야 합니다!");
            return;
        }
        
        const bowlData = bowls[0];
        const bowl3D = placed3DItems[bowlData.id];

        // 밥 먹으러 걷기
        dog.changeState('walk', new THREE.Vector3(bowlData.position.x, 0.4, bowlData.position.z + 0.45));
        
        setTimeout(() => {
            dog.changeState('eat');
            gameState.feed();
            if (bowl3D && bowl3D.foodVisual) {
                bowl3D.foodVisual.visible = true;
                setTimeout(() => { bowl3D.foodVisual.visible = false; }, 3600);
            }
        }, 1500);
    });

    document.getElementById('btn-water').addEventListener('click', () => {
        if (dog.state === 'sleep') {
            gameState.emit("notification", "💤 자고 있는 강아지에게 물을 먹일 수 없어요.");
            return;
        }
        const bowls = gameState.state.placedItems.filter(i => i.category === 'bowl');
        if (bowls.length === 0) {
            gameState.emit("notification", "⚠️ 물을 마시게 하려면 마당에 [식기(밥그릇)]를 설치해 주세요!");
            return;
        }
        
        const bowlData = bowls[0];
        dog.changeState('walk', new THREE.Vector3(bowlData.position.x, 0.4, bowlData.position.z + 0.45));
        
        setTimeout(() => {
            dog.changeState('eat');
            gameState.water();
        }, 1500);
    });

    // 산책하기 버튼 액션
    document.getElementById('btn-walk').addEventListener('click', () => {
        if (dog.state === 'sleep') {
            gameState.emit("notification", "💤 먼저 강아지를 깨워주세요!");
            return;
        }
        if (dog.state === 'walk_action') return; // 이미 산책 중

        const walkSuccess = gameState.walk();
        if (walkSuccess) {
            // 산책 전용 고속 뺑뺑이 모드로 강아지 상태 전환
            dog.changeState('walk_action', new THREE.Vector3(2.5, 0.4, 0));
        }
    });

    document.getElementById('btn-clean').addEventListener('click', () => {
        gameState.cleanPoop();
    });

    // 2. 배치 편집모드
    btnEditMode.addEventListener('click', toggleEditMode);
    document.getElementById('btn-exit-edit').addEventListener('click', () => toggleEditMode(false));

    // 3. 상점 카테고리 탭
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            renderShopItems(e.target.dataset.category);
        });
    });

    // 4. 상태 연동 리스너
    gameState.subscribe('statsChanged', updateUIBars);
    gameState.subscribe('affinityChanged', () => {
        updateUIBars();
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) renderShopItems(activeTab.dataset.category);
    });
    gameState.subscribe('weatherChanged', (newWeather) => {
        updateWeatherVisual(newWeather);
    });
    gameState.subscribe('levelUp', (newLevel) => {
        showCelebrationEffect();
    });
    gameState.subscribe('petAction', (info) => {
        dog.changeState('pet');
        createHeartsOnDog(info && info.gainedXP);
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

    // 강아지 인공지능 루프 가동 (자율 배회)
    setInterval(handleDogAutonomy, 6500);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function renderShopItems(category) {
    shopItemsList.innerHTML = '';
    const items = SHOP_ITEMS[category];
    const userLevel = gameState.state.affinityLevel;

    items.forEach(item => {
        const isLocked = item.level > userLevel;
        const isEquippedClothes = category === 'clothes' && gameState.state.equippedClothes === item.id;
        
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
                    gameState.equipClothes(item.id);
                    renderShopItems(category);
                } else {
                    document.querySelectorAll('.shop-item-card').forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    currentSelectedItem = { id: item.id, category: category };
                    showNotification(`💡 마당 잔디밭을 터치해서 [${item.name}]을 배치하세요.`);
                }
            });
        } else {
            card.addEventListener('click', () => {
                showNotification(`🔒 호감도 레벨 ${item.level} 달성 시 이 아이템을 사용할 수 있습니다.`);
            });
        }

        shopItemsList.appendChild(card);
    });
}

function toggleEditMode(forceState = null) {
    isEditMode = (forceState !== null) ? forceState : !isEditMode;

    if (isEditMode) {
        btnEditMode.classList.add('active');
        shopPanel.classList.remove('hidden');
        gridHelper.visible = true;
        document.querySelector('.tab-btn[data-category="house"]').click();
        controls.minPolarAngle = 0.2;
        gsapToCameraTarget(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 7, 7));
    } else {
        btnEditMode.classList.remove('active');
        shopPanel.classList.add('hidden');
        gridHelper.visible = false;
        placementIndicator.visible = false;
        currentSelectedItem = null;
        controls.minPolarAngle = 0;
        gsapToCameraTarget(new THREE.Vector3(0, 0.4, 0), new THREE.Vector3(0, 5.5, 7.5));
    }
}

function gsapToCameraTarget(targetPos, camPos) {
    let t = 0;
    const steps = 25;
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

// --- 마우스 이동 & 클릭 (레이캐스터) ---
function onPointerMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (isEditMode && currentSelectedItem) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(groundPlane);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            const snapX = Math.round(point.x);
            const snapZ = Math.round(point.z);

            if (snapX * snapX + snapZ * snapZ < 5.0 * 5.0) {
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

function onPointerDown(event) {
    if (event.target.closest('#ui-container')) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (isEditMode) {
        // --- 배치 모드 클릭 ---
        if (currentSelectedItem && placementIndicator.visible) {
            const success = gameState.placeItem(
                currentSelectedItem.id,
                currentSelectedItem.category,
                { ...placementIndicator.position }
            );
            if (success) {
                renderShopItems(currentSelectedItem.category);
            }
        } else {
            // 설치 제거 클릭
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
                
                if (confirm(`🧹 [${SHOP_ITEMS[p.userData.category].find(i=>i.id===p.userData.itemId).name}]을 마당에서 철거합니까?`)) {
                    gameState.removePlacedItem(p.userData.placedId);
                    renderShopItems(p.userData.category);
                }
            }
        }
    } else {
        // --- 일반 모드 클릭 ---
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        // 1. 강아지
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
                gameState.emit("notification", "💤 새근새근 졸던 강아지가 잠에서 깨어났습니다.");
                dog.changeState('idle');
            } else {
                gameState.pet();
            }
            return;
        }

        // 2. 똥 치우기
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

        // 3. 땅 클릭 (배회 이동)
        const hitGround = raycaster.intersectObject(groundPlane);
        if (hitGround.length > 0 && dog.state !== 'sleep' && dog.state !== 'walk_action') {
            const point = hitGround[0].point;
            if (point.x * point.x + point.z * point.z < 4.8 * 4.8) {
                dog.changeState('walk', new THREE.Vector3(point.x, 0.4, point.z));
            }
        }
    }
}

// --- 자율 이동 및 똥싸기 루프 ---
function handleDogAutonomy() {
    if (dog.state !== 'idle') return;

    const state = gameState.state;
    const rand = Math.random();

    // 1. 기력 저하 시 강제 수면유도
    if (state.hunger < 20 || state.thirst < 20) {
        if (rand < 0.45) {
            dog.changeState('sleep');
            return;
        }
    }

    // 2. 배회
    if (rand < 0.28) {
        const targetX = (Math.random() - 0.5) * 5.2;
        const targetZ = (Math.random() - 0.5) * 5.2;
        dog.changeState('walk', new THREE.Vector3(targetX, 0.4, targetZ));
    } 
    else if (rand < 0.38) {
        dog.changeState('sleep');
    }
    
    // 3. 플레이 중 가끔 똥 배출
    if (rand > 0.98 && state.poops.length < 3) {
        gameState.spawnPoop();
    }
}

// --- 날씨 사이클 제어 ---
function handleWeatherCycle() {
    const weathers = ["clear", "clear", "rain", "heatwave", "wind"]; // 맑음 빈도를 조금 더 높게 세팅
    const select = weathers[Math.floor(Math.random() * weathers.length)];
    gameState.setWeather(select);
}

// --- UI 및 특수 이펙트 노출 ---
let notificationTimeout;
function showNotification(msg) {
    clearTimeout(notificationTimeout);
    notificationEl.textContent = msg;
    notificationEl.classList.remove('hidden');

    notificationTimeout = setTimeout(() => {
        notificationEl.classList.add('hidden');
    }, 3200);
}

function createHeartsOnDog(gainedXP = true) {
    const dogPos = new THREE.Vector3();
    dog.group.getWorldPosition(dogPos);
    dogPos.y += 0.7;

    const tempV = dogPos.clone().project(camera);
    const x = (tempV.x *  .5 + .5) * window.innerWidth;
    const y = (tempV.y * -.5 + .5) * window.innerHeight;

    const particleContainer = document.getElementById('particle-container');
    const particleCount = gainedXP ? 5 : 2;
    const emoji = gainedXP ? '❤️' : '💤';

    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        p.className = 'heart-particle';
        p.textContent = emoji;
        p.style.left = `${x + (Math.random() - 0.5) * 50}px`;
        p.style.top = `${y + (Math.random() - 0.5) * 30}px`;
        p.style.setProperty('--tx', `${(Math.random() - 0.5) * 60}px`);
        
        particleContainer.appendChild(p);
        setTimeout(() => p.remove(), 1000);
    }
}

function showCelebrationEffect() {
    const container = document.getElementById('particle-container');
    const emojis = ['🌟', '✨', '🐾', '🎈', '❤️', '🍖'];
    
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

// --- 메인 드로우 루프 ---
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    const time = clock.getElapsedTime();

    // 1. 강아지 업데이트
    if (dog) {
        dog.update(deltaTime, time);
    }

    // 2. 비 내리는 파티클 모션 계산
    if (rainParticles && rainParticles.visible) {
        const positions = rainParticles.geometry.attributes.position.array;
        
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= deltaTime * 4.5; // 아래로 하강
            
            // 바닥에 닿으면 하늘로 다시 리셋
            if (positions[i] < 0.05) {
                positions[i] = 8.0;
            }
        }
        
        rainParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 3. 카메라 컨트롤러 업데이트
    if (controls) {
        controls.update();
    }

    renderer.render(scene, camera);
}

init();
