import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// 캐시 무력화: 진입 스크립트가 붙인 ?v= 버전을 로컬 하위 모듈에도 동일하게 전파한다.
// (반드시 같은 URL이어야 모듈이 중복 로드되지 않고 gameState 싱글톤이 1개로 유지됨)
const __v = new URL(import.meta.url).search;
const { gameState, SHOP_ITEMS } = await import(`./state.js${__v}`);
const { ChibiPet } = await import(`./pet.js${__v}`);
const { createItemMesh, createPoopMesh, createTrashMesh } = await import(`./items.js${__v}`);

// --- 전역 변수 및 게임 환경 설정 ---
let scene, camera, renderer, controls;
let dog;
let clock;
let groundMaterial, fenceGroup, treesArray;

// 3D 오브젝트 컬렉션
const placed3DItems = {}; 
const poops3D = {};       
const trash3D = {};       

// 날씨 관련 3D 이펙트 데이터
let rainParticles;
let rainPositions = [];
const RAIN_COUNT = 1000;
let splashRipples = []; // { mesh, timer, maxLife }

let windLeaves;
let leafPositions = [];
const LEAF_COUNT = 60;

let heatWaves;
let heatPositions = [];
const HEAT_COUNT = 150;

let cloudsGroup; // 3D 구름 그룹
const cloudMeshes = []; // 구름 인스턴스 배열

// 레이캐스팅 및 그리드 배치용 변수
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let groundPlane;
let gridHelper;
let placementIndicator; 
let currentSelectedItem = null; 

// UI 요소 캐시
const petNameEl = document.getElementById('pet-name');
const statusTextEl = document.getElementById('pet-status-text');
const weatherBadgeEl = document.getElementById('weather-badge');
const syncStatusEl = document.getElementById('sync-status');
const affinityLevelEl = document.getElementById('affinity-level');
const affinityPctEl = document.getElementById('affinity-pct');
const affinityBarFill = document.getElementById('affinity-bar-fill');
const hungerFill = document.querySelector('.hunger-fill');
const thirstFill = document.querySelector('.thirst-fill');
const cleanlinessFill = document.querySelector('.cleanliness-fill');
const shopPanel = document.getElementById('shop-panel');
const shopItemsList = document.getElementById('shop-items-list');
const notificationEl = document.getElementById('game-notification');
const criticalWarningEl = document.getElementById('critical-warning');
const btnEditMode = document.getElementById('btn-edit-mode');
const authOverlay = document.getElementById('auth-overlay');
const uiContainer = document.getElementById('ui-container');

// 배치 상태 모드
let isEditMode = false;
let animateErrorLogged = false; // 렌더 루프 오류 1회만 로깅용

// 이동/선택 모드 (RPG 좌클릭 식): 켜져 있으면 땅 클릭=이동, 물건/오물 클릭=선택·청소
let interactMode = true;
let selectedPlacedId = null;   // 현재 선택된 배치 아이템 id
let selectionIndicator = null; // 선택된 물건/오물 아래 표시되는 링
let camAnimating = false;      // 배치 카메라 전환 중에는 팔로우 캠 일시 정지
let pointerDownInfo = null;    // 탭 vs 드래그 구분용 (모바일 터치 대응)
let selectedDirt = null;       // 선택된 오물 { kind: 'poop'|'trash', id }

// 마당(땅) 크기 설정 — 기존보다 약 2배 확장
const YARD_RADIUS = 11;     // 잔디 반지름
const FENCE_RADIUS = 10.6;  // 울타리 반지름
const MOVE_RADIUS = 10;     // 펫 이동/아이템 배치 가능 반지름

// --- 초기화 과정 ---
function init() {
    clock = new THREE.Clock();

    // 1. Scene 설정
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8f4f8);
    // 마당이 넓어졌으므로 멀리까지 보이도록 안개를 옅게 조정
    scene.fog = new THREE.FogExp2(0xe8f4f8, 0.028);

    // 2. Camera 설정
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 5.5, 7.5);

    // 3. Renderer 설정
    const container = document.getElementById('canvas-container');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    // 픽셀비를 먼저 지정한 뒤 크기를 설정해야 모바일 고해상도에서 화면이 일부만 그려지거나(4등분) 깨지는 현상 방지.
    // 모바일 GPU 메모리 보호를 위해 픽셀비 상한을 2로 제한.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.touchAction = 'none'; // 터치 제스처가 카메라 조작과 충돌하지 않게
    container.appendChild(renderer.domElement);

    // WebGL 컨텍스트 분실 시 자동 복구 (3D 화면이 영구히 사라지는 것 방지)
    renderer.domElement.addEventListener('webglcontextlost', (e) => {
        e.preventDefault(); // 기본 동작을 막아야 복구(restored) 이벤트가 발생함
        showNotification('⚠️ 그래픽이 일시적으로 끊겼어요. 자동으로 복구하는 중...');
    }, false);
    renderer.domElement.addEventListener('webglcontextrestored', () => {
        if (gameState.state.username) syncStateTo3D();
        showNotification('✅ 화면을 다시 복구했어요!');
    }, false);

    // 4. Controls 설정
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    controls.target.set(0, 0.4, 0);

    // 5. 조명 설정
    const ambientLight = new THREE.AmbientLight(0xfffdf6, 0.85); 
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x555555, 0.45);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbf0, 0.75);
    dirLight.position.set(10, 18, 8);
    dirLight.castShadow = true;
    // 넓어진 마당 전체에 그림자가 드리우도록 섀도우 카메라 범위 확장
    dirLight.shadow.camera.top = YARD_RADIUS;
    dirLight.shadow.camera.bottom = -YARD_RADIUS;
    dirLight.shadow.camera.left = -YARD_RADIUS;
    dirLight.shadow.camera.right = YARD_RADIUS;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 45;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0006;
    scene.add(dirLight);

    // 6. 마당(땅) 구현
    buildEnvironment();

    // 7. 강아지 소환
    dog = new ChibiPet(scene);

    // 8. 에디터 그리드 및 인디케이터 (넓어진 마당 전체를 덮도록 확장)
    gridHelper = new THREE.GridHelper(YARD_RADIUS * 2, YARD_RADIUS * 2, 0xbab2c8, 0xe8e5ee);
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

    // 선택된 물건 아래에 표시되는 청록색 선택 링 (이동/선택 모드)
    const selGeo = new THREE.RingGeometry(0.34, 0.42, 32);
    const selMat = new THREE.MeshBasicMaterial({ color: 0x3ad1c8, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    selectionIndicator = new THREE.Mesh(selGeo, selMat);
    selectionIndicator.rotation.x = Math.PI / 2;
    selectionIndicator.position.y = 0.03;
    selectionIndicator.visible = false;
    scene.add(selectionIndicator);

    // 9. 날씨 시스템 요소 구축 (빗방울, 낙엽, 폭염아지랑이, 구름)
    buildCloudsSystem();
    buildRainSystem();
    buildWindSystem();
    buildHeatwaveSystem();

    // 10. 이벤트 등록
    setupEventListeners();
    setupAuthListeners();

    // 이동/선택 모드 기본 ON → 십자선 커서 + 카메라 조작 방식 적용
    renderer.domElement.style.cursor = 'crosshair';
    applyControlMode();

    // 로컬 저장소에서 데이터 로드 (새로고침 시 자동 로그인 지원)
    gameState.loadState();
    if (gameState.state.username) {
        syncStateTo3D();
        showGameUI(false); // 새로고침 자동 로그인: 애니메이션 없이 즉시 표시
    }

    animate();

    // 11. 날씨 변동 스케줄 작동 (90초마다 변경 체크)
    setInterval(handleWeatherCycle, 90000);
    // 실시간 쓰레기 생성 스케줄 가동 (18초마다 확률 검사)
    setInterval(handleTrashSpawnCycle, 18000);

    // 모바일 4등분/깨짐 방지: 레이아웃 안정 후 렌더러 크기 재보정 + 뷰포트 변화 추적
    bindViewportResize();
    refreshRendererSize();
}

// 마당 잔디 및 나무들
function buildEnvironment() {
    const groundGeo = new THREE.CylinderGeometry(YARD_RADIUS, YARD_RADIUS, 0.2, 48);
    // 인스턴스로 바인딩하여 비가 올 때 어둡게 젖도록 처리 지원
    groundMaterial = new THREE.MeshStandardMaterial({ color: 0xabebc6, roughness: 0.95 });
    groundPlane = new THREE.Mesh(groundGeo, groundMaterial);
    groundPlane.position.y = -0.1;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // 울타리 (넓어진 마당 둘레에 맞춰 개수 증가)
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.9 });
    const fenceGeo = new THREE.CapsuleGeometry(0.04, 0.22, 6, 12);
    const radius = FENCE_RADIUS;
    const fenceCount = Math.round(radius * 5); // 둘레 비례 개수
    fenceGroup = new THREE.Group(); // 강풍 시 흔들림을 주도록 그룹화
    for (let i = 0; i < fenceCount; i++) {
        const angle = (i / fenceCount) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const fence = new THREE.Mesh(fenceGeo, fenceMat);
        fence.position.set(x, 0.1, z);
        fence.rotation.y = -angle + Math.PI / 2;
        fence.castShadow = true;
        fenceGroup.add(fence);
    }
    scene.add(fenceGroup);

    // 나무들 (넓어진 마당 외곽에 재배치 + 추가)
    treesArray = [];
    treesArray.push(createSoftTree(-7.5, 0, -5.5));
    treesArray.push(createSoftTree(7.5, 0, -6.2));
    treesArray.push(createSoftTree(-8.2, 0, 4.5));
    treesArray.push(createSoftTree(8.0, 0, 4.0));
    treesArray.push(createSoftTree(0, 0, -8.6));
    treesArray.push(createSoftTree(-2.5, 0, 8.2));
}

function createSoftTree(x, y, z) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.14, 0.75, 8),
        new THREE.MeshStandardMaterial({ color: 0xba8f71, roughness: 0.9 })
    );
    trunk.position.y = 0.35;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x82e0aa, roughness: 0.95 });
    const leafGeo = new THREE.SphereGeometry(0.48, 12, 12);
    
    // 나뭇잎 그룹 (강풍 시 잎 부분만 흔들림을 돋보이게 하기 위해 별도 분리)
    const leaves = new THREE.Group();
    leaves.position.y = 0.9;
    
    const leaf1 = new THREE.Mesh(leafGeo, leavesMat);
    leaf1.castShadow = true;
    leaves.add(leaf1);

    const leaf2 = new THREE.Mesh(leafGeo, leavesMat);
    leaf2.position.set(0.18, 0.25, -0.1);
    leaf2.scale.set(0.8, 0.8, 0.8);
    leaf2.castShadow = true;
    leaves.add(leaf2);

    const leaf3 = new THREE.Mesh(leafGeo, leavesMat);
    leaf3.position.set(-0.18, 0.15, 0.15);
    leaf3.scale.set(0.85, 0.85, 0.85);
    leaf3.castShadow = true;
    leaves.add(leaf3);

    treeGroup.add(leaves);
    treeGroup.userData = { leavesGroup: leaves }; // 애니메이션 참조용
    
    scene.add(treeGroup);
    return treeGroup;
}

// --- 임시 구름 하늘 시스템 구현 ---
function buildCloudsSystem() {
    cloudsGroup = new THREE.Group();
    cloudsGroup.position.y = 4.8;
    scene.add(cloudsGroup);

    const cloudMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        roughness: 0.98,
        metalness: 0.0,
        transparent: true,
        opacity: 0.85 
    });

    // 3D 구름 3개 생성 및 배치
    for (let i = 0; i < 3; i++) {
        const cloud = new THREE.Group();
        
        // 여러 구체를 겹쳐 몽실몽실하게 조립
        const g1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), cloudMat);
        g1.castShadow = true;
        cloud.add(g1);

        const g2 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), cloudMat);
        g2.position.set(-0.45, -0.1, 0);
        cloud.add(g2);

        const g3 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), cloudMat);
        g3.position.set(0.45, -0.1, 0);
        cloud.add(g3);

        const g4 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), cloudMat);
        g4.position.set(0, 0.15, -0.2);
        cloud.add(g4);

        // 랜덤 위치 분포
        cloud.position.set(
            (i - 1) * 3.5 + (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 0.4,
            -3.5 + (Math.random() - 0.5) * 2.0
        );

        cloudsGroup.add(cloud);
        cloudMeshes.push(cloud);
    }
}

// 3D 빗방울 파티클 시스템 (사선 낙하)
function buildRainSystem() {
    const rainGeo = new THREE.BufferGeometry();
    rainPositions = [];

    for (let i = 0; i < RAIN_COUNT; i++) {
        rainPositions.push((Math.random() - 0.5) * 12); 
        rainPositions.push(Math.random() * 8);          
        rainPositions.push((Math.random() - 0.5) * 12); 
    }

    rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3));

    // 물빛 사선 형태 빗방울 묘사
    const rainMat = new THREE.PointsMaterial({
        color: 0xa8c5db,
        size: 0.05,
        transparent: true,
        opacity: 0.7
    });

    rainParticles = new THREE.Points(rainGeo, rainMat);
    rainParticles.visible = false;
    scene.add(rainParticles);
}

// 비가 올 때 바닥에 물결 파문이 생기는 3D Splash 효과 생성기
function spawnRainSplash(x, z) {
    if (splashRipples.length > 25) return; // 렉 방지 상한선

    const rippleGeo = new THREE.RingGeometry(0.01, 0.05, 12);
    const rippleMat = new THREE.MeshBasicMaterial({ 
        color: 0xd4e6f1, 
        transparent: true, 
        opacity: 0.65, 
        side: THREE.DoubleSide 
    });

    const mesh = new THREE.Mesh(rippleGeo, rippleMat);
    mesh.position.set(x, 0.02, z);
    mesh.rotation.x = Math.PI / 2;
    scene.add(mesh);

    splashRipples.push({
        mesh,
        timer: 0,
        maxLife: 0.3 + Math.random() * 0.2 // 수명
    });
}

// 강풍 시 날아다니는 파스텔 초록 나뭇잎 파티클 시스템
function buildWindSystem() {
    const leafGeo = new THREE.BufferGeometry();
    leafPositions = [];

    for (let i = 0; i < LEAF_COUNT; i++) {
        leafPositions.push((Math.random() - 0.5) * 14);
        leafPositions.push(Math.random() * 3.5);
        leafPositions.push((Math.random() - 0.5) * 14);
    }

    leafGeo.setAttribute('position', new THREE.Float32BufferAttribute(leafPositions, 3));

    const leafMat = new THREE.PointsMaterial({
        color: 0x58d68d, // 초록색 낙엽잎
        size: 0.065,
        transparent: true,
        opacity: 0.8
    });

    windLeaves = new THREE.Points(leafGeo, leafMat);
    windLeaves.visible = false;
    scene.add(windLeaves);
}

// 폭염 시 지면에서 올라오는 열기 아지랑이 파티클
function buildHeatwaveSystem() {
    const heatGeo = new THREE.BufferGeometry();
    heatPositions = [];

    for (let i = 0; i < HEAT_COUNT; i++) {
        heatPositions.push((Math.random() - 0.5) * 10);
        heatPositions.push(Math.random() * 2.5); // 낮게 분포
        heatPositions.push((Math.random() - 0.5) * 10);
    }

    heatGeo.setAttribute('position', new THREE.Float32BufferAttribute(heatPositions, 3));

    const heatMat = new THREE.PointsMaterial({
        color: 0xf1c40f, // 이글거리는 노란빛 아지랑이
        size: 0.04,
        transparent: true,
        opacity: 0.55
    });

    heatWaves = new THREE.Points(heatGeo, heatMat);
    heatWaves.visible = false;
    scene.add(heatWaves);
}

// 3D 오브젝트의 지오메트리/머티리얼/텍스처를 정리해 GPU 메모리 누수 방지
// (장시간 플레이 시 누수가 쌓이면 WebGL 컨텍스트가 분실되어 화면이 사라질 수 있음)
function disposeObject3D(obj) {
    if (!obj) return;
    const geos = new Set();
    const mats = new Set();
    obj.traverse((child) => {
        if (child.geometry) geos.add(child.geometry);
        const m = child.material;
        if (Array.isArray(m)) m.forEach(mm => mm && mats.add(mm));
        else if (m) mats.add(m);
    });
    geos.forEach(g => { if (g.dispose) g.dispose(); });
    mats.forEach(m => { if (m.map && m.map.dispose) m.map.dispose(); if (m.dispose) m.dispose(); });
}

// --- 게임 상태와 3D 화면 동기화 ---
function syncStateTo3D() {
    const state = gameState.state;

    petNameEl.textContent = state.petName;
    
    // 펫 3D 모델 재현 (종족이 변경되었을 수 있으므로 다시 생성)
    if (dog && dog.group) {
        scene.remove(dog.group);
        disposeObject3D(dog.group);
    }
    dog = new ChibiPet(scene);
    
    dog.updateCustomization(); // 색상 및 귀 커스텀 즉각 렌더링
    dog.setClothes();

    // 가구 동기화
    Object.keys(placed3DItems).forEach(id => {
        scene.remove(placed3DItems[id]);
        disposeObject3D(placed3DItems[id]);
        delete placed3DItems[id];
    });
    state.placedItems.forEach(item => {
        addItemToScene(item);
    });

    // 똥 동기화
    Object.keys(poops3D).forEach(id => {
        scene.remove(poops3D[id]);
        disposeObject3D(poops3D[id]);
        delete poops3D[id];
    });
    state.poops.forEach(poop => {
        addPoopToScene(poop);
    });

    // 신규 추가: 쓰레기 동기화
    Object.keys(trash3D).forEach(id => {
        scene.remove(trash3D[id]);
        disposeObject3D(trash3D[id]);
        delete trash3D[id];
    });
    state.trash.forEach(trash => {
        addTrashToScene(trash);
    });

    updateUIBars();
}

function updateUIBars() {
    const state = gameState.state;

    // 동기화 상태 배지 업데이트
    if (state.username) {
        syncStatusEl.textContent = `☁️ ${state.username}`;
        syncStatusEl.classList.add('online');
    } else {
        syncStatusEl.textContent = `☁️ 로컬`;
        syncStatusEl.classList.remove('online');
    }

    affinityLevelEl.textContent = state.affinityLevel;
    const xpPercent = Math.floor(state.affinityXP);
    affinityPctEl.textContent = `${xpPercent}%`;
    affinityBarFill.style.width = `${xpPercent}%`;

    hungerFill.style.width = `${state.hunger}%`;
    thirstFill.style.width = `${state.thirst}%`;
    cleanlinessFill.style.width = `${state.cleanliness}%`;

    // 펫 상태 및 날씨 표시 업데이트
    const totalDirty = state.poops.length + state.trash.length;
    if (totalDirty > 3) {
        statusTextEl.textContent = "마당이 엉망진창이에요 🗑️";
        statusTextEl.style.color = "#c53030";
    } else if (state.cleanliness < 35) {
        statusTextEl.textContent = "씻겨주고 청소해줘요 🧼";
        statusTextEl.style.color = "#d69e2e";
    } else if (state.hunger < 35) {
        statusTextEl.textContent = "배가 아주 고픕니다 🍖";
        statusTextEl.style.color = "#e53e3e";
    } else if (state.thirst < 35) {
        statusTextEl.textContent = "갈증이 납니다 물을 줘요 💧";
        statusTextEl.style.color = "#3182ce";
    } else if (dog.state === 'sleep') {
        statusTextEl.textContent = "곤히 잠들어 있는 중 💤";
        statusTextEl.style.color = "#718096";
    } else if (dog.state === 'walk_action') {
        statusTextEl.textContent = "산책을 뛰며 웃는 중 🦮";
        statusTextEl.style.color = "#2f855a";
    } else {
        statusTextEl.textContent = "신나고 기분 좋은 상태 🥰";
        statusTextEl.style.color = "#2b6cb0";
    }

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

// 3D 환경 날씨 효과 시뮬레이션 변경 로직
function updateWeatherVisual(weather) {
    if (!scene) return;

    let targetBgColor = 0xe8f4f8; 
    
    switch (weather) {
        case "clear":
            targetBgColor = 0xe8f4f8;
            rainParticles.visible = false;
            windLeaves.visible = false;
            heatWaves.visible = false;
            // 잔디 원색 복구
            if (groundMaterial) groundMaterial.color.setHex(0xabebc6); 
            // 구름 컬러 하얗게
            changeCloudsColor(0xffffff);
            break;
            
        case "rain":
            targetBgColor = 0x8a9ba8; // 어두운 회청색 먹구름 하늘
            rainParticles.visible = true;
            windLeaves.visible = false;
            heatWaves.visible = false;
            // 빗물에 젖어 어두워진 어두운 초록 잔디 연출
            if (groundMaterial) groundMaterial.color.setHex(0x82c89e); 
            // 어둡고 무거운 회색 빗구름 컬러링
            changeCloudsColor(0x627583);
            break;
            
        case "heatwave":
            targetBgColor = 0xfadbd8; // 파스텔 아지랑이 분홍빛 오렌지 하늘
            rainParticles.visible = false;
            windLeaves.visible = false;
            heatWaves.visible = true;
            if (groundMaterial) groundMaterial.color.setHex(0xbbe7cd); // 약간 건조해진 잔디색
            changeCloudsColor(0xfae5d3); // 피치빛 구름
            break;
            
        case "wind":
            targetBgColor = 0xd5dbdb; // 희뿌연 모래먼지 회백색 하늘
            rainParticles.visible = false;
            windLeaves.visible = true;
            heatWaves.visible = false;
            if (groundMaterial) groundMaterial.color.setHex(0xabebc6);
            changeCloudsColor(0xbdc3c7);
            break;
    }

    // 부드럽게 배경 및 안개 색조 보간
    scene.background.setHex(targetBgColor);
    scene.fog.color.setHex(targetBgColor);
}

// 모든 구름의 컬러 변경 헬퍼
function changeCloudsColor(hexColor) {
    cloudMeshes.forEach(cloud => {
        cloud.children.forEach(mesh => {
            if (mesh.material) {
                mesh.material.color.setHex(hexColor);
            }
        });
    });
}

function getItemEmoji(itemId, category) {
    const species = gameState.state.species || "dog";
    const list = (SHOP_ITEMS[species] && SHOP_ITEMS[species][category]) || [];
    const found = list.find(i => i.id === itemId);
    return found ? found.emoji : "❔";
}

function addItemToScene(itemData) {
    if (!itemData || !itemData.position || !Number.isFinite(itemData.position.x)) return; // 손상 데이터 방어
    const emoji = getItemEmoji(itemData.itemId, itemData.category);
    const itemMesh = createItemMesh(itemData.itemId, emoji);
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
    if (!poopData || !poopData.position || !Number.isFinite(poopData.position.x)) return; // 손상 데이터 방어
    const poopMesh = createPoopMesh();
    poopMesh.position.set(poopData.position.x, poopData.position.y, poopData.position.z);
    
    poopMesh.userData = {
        poopId: poopData.id,
        isPoop: true
    };

    scene.add(poopMesh);
    poops3D[poopData.id] = poopMesh;
}

// 신규 추가: 마당에 쓰레기 3D 추가 및 낙하 애니메이션 세팅
function addTrashToScene(trashData) {
    if (!trashData || !trashData.position || !Number.isFinite(trashData.position.x)) return; // 손상 데이터 방어
    const trashMesh = createTrashMesh(trashData.type);
    
    // y좌표는 낙하 효과를 위해 하늘 위 3.5m로 세팅
    trashMesh.position.set(trashData.position.x, 3.5, trashData.position.z);
    
    trashMesh.userData = {
        trashId: trashData.id,
        isTrash: true,
        targetY: 0.05, // 바닥 높이
        fallSpeed: 5.0 + Math.random() * 3.0,
        bounceState: 0 // 통통 튀는 애니메이션 상태
    };

    scene.add(trashMesh);
    trash3D[trashData.id] = trashMesh;
}

// --- 이벤트 바인딩 ---
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('orientationchange', () => setTimeout(onWindowResize, 250)); // 모바일 회전 대응
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', () => { pointerDownInfo = null; });

    // 선택한 오물(똥/쓰레기) 치우기 버튼
    document.getElementById('btn-clean-selected').addEventListener('click', () => {
        if (!selectedDirt) return;
        if (selectedDirt.kind === 'poop') gameState.cleanPoop(selectedDirt.id);
        else gameState.cleanTrash(selectedDirt.id);
        clearDirtSelection();
    });

    // 탭을 벗어났다 돌아올 때, 백그라운드 동안 누적된 큰 시간차를 버려 첫 프레임 폭주(화면 깨짐) 방지
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && clock) clock.getDelta();
    });

    document.getElementById('btn-pet').addEventListener('click', () => {
        gameState.state.isResting = false;
        if (dog.state === 'sleep') {
            gameState.disturbSleep(); // 잠 깨우기 = 잦은 방해 카운트
            dog.changeState('idle');
        }
        gameState.pet();
    });

    document.getElementById('btn-feed').addEventListener('click', () => {
        if (dog.state === 'sleep') {
            gameState.emit("notification", "💤 자는 중이라 밥을 주지 못합니다.");
            return;
        }
        const bowls = gameState.state.placedItems.filter(i => i.category === 'bowl');
        if (bowls.length === 0) {
            gameState.emit("notification", "⚠️ 밥그릇이 없어요! [배치하기] 메뉴에서 밥그릇을 마당에 먼저 설치하세요.");
            return;
        }
        
        const bowlData = bowls[0];
        const bowl3D = placed3DItems[bowlData.id];

        gameState.state.isResting = false;
        dog.changeState('walk', new THREE.Vector3(bowlData.position.x, 0.4, bowlData.position.z + 0.2));
        
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
            gameState.emit("notification", `💤 ${gameState.speciesName()}가 잠들었을 때는 물을 주지 마세요.`);
            return;
        }
        const bowls = gameState.state.placedItems.filter(i => i.category === 'bowl');
        if (bowls.length === 0) {
            gameState.emit("notification", "⚠️ 마당에 그릇이 없습니다! [배치하기]로 설치해 주세요.");
            return;
        }
        
        const bowlData = bowls[0];
        gameState.state.isResting = false;
        dog.changeState('walk', new THREE.Vector3(bowlData.position.x, 0.4, bowlData.position.z + 0.2));
        
        setTimeout(() => {
            dog.changeState('eat');
            gameState.water();
        }, 1500);
    });

    document.getElementById('btn-walk').addEventListener('click', () => {
        if (dog.state === 'sleep') {
            gameState.emit("notification", `💤 ${gameState.speciesName()}를 먼저 깨우고 산책을 출발합시다!`);
            return;
        }
        if (dog.state === 'walk_action') return; 

        gameState.state.isResting = false;
        const walkSuccess = gameState.walk();
        if (walkSuccess) {
            dog.changeState('walk_action', new THREE.Vector3(5, 0.4, 0));
        }
    });

    // 깨우기 버튼: 자고 있으면 깨우고(잦은 방해 카운트), 깨어 있으면 안내만
    document.getElementById('btn-wake').addEventListener('click', () => {
        if (dog.state === 'sleep') {
            gameState.state.isResting = false;
            gameState.disturbSleep();
            dog.changeState('idle');
        } else {
            gameState.emit("notification", "🐶 펫이 지금 말똥말똥 깨어 있어요!");
        }
    });

    // 이동/선택 모드 토글 (RPG 좌클릭 식)
    document.getElementById('btn-interact').addEventListener('click', () => toggleInteractMode());

    document.getElementById('btn-wash').addEventListener('click', () => {
        if (dog.state === 'sleep') {
            gameState.emit("notification", "💤 자는 중이라 씻길 수 없습니다.");
            return;
        }
        gameState.state.isResting = false;
        const gainedXP = gameState.wash(); // 청결도 회복은 항상, 호감도는 하루 3회 제한
        if (gainedXP) showCelebrationEffect();
    });

    document.getElementById('btn-rest').addEventListener('click', () => {
        const houses = gameState.state.placedItems.filter(i => i.category === 'house');
        if (houses.length === 0) {
            gameState.emit("notification", "⚠️ 쉴 수 있는 집이 없습니다! [배치하기]로 집을 설치해주세요.");
            return;
        }
        const houseData = houses[0];
        
        gameState.state.isResting = true;
        dog.changeState('walk', new THREE.Vector3(houseData.position.x, 0.4, houseData.position.z));
        
        setTimeout(() => {
            dog.changeState('sleep');
            showNotification("💤 펫이 집에서 편안하게 휴식을 취합니다. 날씨 영향을 받지 않습니다.");
        }, 1500);
    });

    // 배치 편집모드
    btnEditMode.addEventListener('click', toggleEditMode);
    document.getElementById('btn-exit-edit').addEventListener('click', () => toggleEditMode(false));

    // 상점 카테고리 탭
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            renderShopItems(e.currentTarget.dataset.category);
        });
    });

    // 로그아웃 버튼 바인딩
    document.getElementById('btn-logout').addEventListener('click', () => {
        if (confirm("로그아웃 하시겠습니까? 세이브 데이터는 연동 계정에 안전하게 저장됩니다.")) {
            gameState.logout();
        }
    });

    // 상태 연동 리스너
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
            disposeObject3D(poops3D[poopId]);
            delete poops3D[poopId];
        }
    });
    // 신규 추가: 쓰레기 스폰 리스너
    gameState.subscribe('trashSpawned', (trashData) => {
        addTrashToScene(trashData);
    });
    gameState.subscribe('trashCleaned', (trashId) => {
        if (trash3D[trashId]) {
            scene.remove(trash3D[trashId]);
            disposeObject3D(trash3D[trashId]);
            delete trash3D[trashId];
        }
    });
    gameState.subscribe('itemPlaced', (itemData) => {
        addItemToScene(itemData);
    });
    gameState.subscribe('itemRemoved', (placedId) => {
        if (placed3DItems[placedId]) {
            scene.remove(placed3DItems[placedId]);
            disposeObject3D(placed3DItems[placedId]);
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

    // 위기 초기화(굶주림/탈수로 처음부터 다시): 3D 전체 재동기화 + 경고 제거
    gameState.subscribe('hardReset', () => {
        syncStateTo3D();
        dog.changeState('idle');
        hideCriticalWarning('vital');
        hideCriticalWarning('clean');
    });

    // 능력치 0 위기 경고 배너
    gameState.subscribe('criticalWarning', (w) => showCriticalWarning(w));
    gameState.subscribe('criticalWarningClear', (w) => hideCriticalWarning(w && w.type));

    // 꼬마 강아지 AI 루틴
    setInterval(handleDogAutonomy, 6500);
}

// 윈도우 리사이즈
function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 모바일에서 초기 렌더가 '레이아웃/픽셀비가 확정되기 전' 크기로 그려져 화면이 4등분/깨지는 현상 방지.
// 레이아웃이 안정될 때까지 여러 시점에 렌더러 크기를 다시 맞춘다(eruda 콘솔이 우연히 해주던 보정을 코드로 보장).
function refreshRendererSize() {
    requestAnimationFrame(onWindowResize);
    [60, 250, 600, 1200].forEach(ms => setTimeout(onWindowResize, ms));
}

// 모바일 주소창 노출/숨김 등 뷰포트 변화도 추적 (한 번만 바인딩)
function bindViewportResize() {
    window.addEventListener('load', onWindowResize);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', onWindowResize);
    }
}

// --- 게임 UI 전환 (인증 → 게임 화면) ---
// animate=true: 로그인/회원가입 시 패널 슬라이드인 애니메이션 재생
// animate=false: 새로고침 자동 로그인 시 애니메이션 없이 즉시 표시
function showGameUI(animate = true) {
    authOverlay.classList.add('hidden');
    uiContainer.classList.remove('hidden');
    updateUIBars();

    if (animate) {
        // 패널 입장 애니메이션 트리거
        const header = document.querySelector('.game-header');
        const statusPanel = document.querySelector('.status-panel');
        const actionPanel = document.querySelector('.action-panel');
        header.classList.add('animate-in');
        statusPanel.classList.add('animate-in');
        actionPanel.classList.add('animate-in');

        // 애니메이션 종료 후 클래스 제거 (재사용 대비)
        setTimeout(() => {
            header.classList.remove('animate-in');
            statusPanel.classList.remove('animate-in');
            actionPanel.classList.remove('animate-in');
        }, 700);
    }

    // 레이아웃이 안정된 후 렌더러 크기 보정 (애니메이션과 충돌 방지)
    const delay = animate ? 100 : 0;
    setTimeout(() => refreshRendererSize(), delay);
}

// --- 사용자 계정 시스템 UI 제어 ---
function setupAuthListeners() {
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');
    const errorMsg = document.getElementById('auth-error-msg');

    // 탭 토글
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        formLogin.classList.remove('hidden');
        formSignup.classList.add('hidden');
        errorMsg.classList.add('hidden');
    });

    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        formSignup.classList.remove('hidden');
        formLogin.classList.add('hidden');
        errorMsg.classList.add('hidden');
    });

    // 가입 폼 꾸미기 옵션들 (색상 선택)
    const colorBtns = document.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            colorBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    const earBtns = document.querySelectorAll('.ear-btn');
    earBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            earBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    // 종족 선택 버튼들 (새로 추가됨)
    const speciesBtns = document.querySelectorAll('.species-btn');
    speciesBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            speciesBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    // 1. 로그인 전송
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.classList.add('hidden');
        
        const username = document.getElementById('login-id').value.trim();
        const password = document.getElementById('login-pw').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (data.success) {
                gameState.setLoginSession(data.username, data.petState);
                syncStateTo3D();
                showGameUI(true);
                showNotification(`👋 환영합니다! ${data.username}님, ${gameState.speciesName()} ${data.petState.petName}와 좋은 시간 보내세요!`);
            } else {
                errorMsg.textContent = data.error || "로그인 실패";
                errorMsg.classList.remove('hidden');
            }
        } catch (err) {
            errorMsg.style.color = "#3182ce"; // 파란색 안내 메시지로 변경
            errorMsg.textContent = "☁️ 로컬 환경: 오프라인 모드로 게임을 시작합니다.";
            errorMsg.classList.remove('hidden');
            
            // 오프라인/로컬 테스트 폴백 강제 시작
            setTimeout(() => {
                gameState.setLoginSession(username, { petName: "임시바둑이", furColor: "#ffcc80", earType: "floppy" }, false);
                syncStateTo3D();
                showGameUI(true);
            }, 1000);
        }
    });

    // 2. 회원가입 및 입양 전송
    formSignup.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.classList.add('hidden');
        
        const username = document.getElementById('signup-id').value.trim();
        const password = document.getElementById('signup-pw').value;
        const petName = document.getElementById('custom-name').value.trim();
        
        const activeColorBtn = document.querySelector('.color-btn.active');
        const furColor = activeColorBtn ? activeColorBtn.dataset.color : "#ffcc80";
        
        const activeEarBtn = document.querySelector('.ear-btn.active');
        const earType = activeEarBtn ? activeEarBtn.dataset.ear : "floppy";

        const activeSpeciesBtn = document.querySelector('.species-btn.active');
        const species = activeSpeciesBtn ? activeSpeciesBtn.dataset.species : "dog";

        try {
            const res = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    password, 
                    petCustomization: { name: petName, furColor, earType, species }
                })
            });
            const data = await res.json();
            
            if (data.success) {
                gameState.setLoginSession(data.username, data.petState);
                syncStateTo3D();
                showGameUI(true);
                showNotification(`🎉 성공적으로 입양되었습니다! 마당에서 ${gameState.speciesName()} ${petName}를 반겨주세요!`);
            } else {
                errorMsg.textContent = data.error || "회원가입 실패";
                errorMsg.classList.remove('hidden');
            }
        } catch (err) {
            errorMsg.style.color = "#3182ce"; // 파란색 안내 메시지로 변경
            errorMsg.textContent = "☁️ 로컬 환경: 오프라인 모드로 게임을 시작합니다.";
            errorMsg.classList.remove('hidden');

            setTimeout(() => {
                const localPetState = { petName, furColor, earType, species };
                gameState.setLoginSession(username, localPetState, false);
                syncStateTo3D();
                showGameUI(true);
            }, 1200);
        }
    });

    // 3. 로그아웃 리스너에 의한 UI 리셋
    gameState.subscribe('logout', () => {
        authOverlay.classList.remove('hidden');
        uiContainer.classList.add('hidden');
        document.getElementById('login-id').value = '';
        document.getElementById('login-pw').value = '';
        syncStateTo3D();
    });
}

function renderShopItems(category) {
    shopItemsList.innerHTML = '';
    const species = gameState.state.species || "dog";
    const items = SHOP_ITEMS[species][category] || [];
    const userLevel = gameState.state.affinityLevel;

    items.forEach(item => {
        const isLocked = item.level > userLevel;
        let isEquippedClothes = false;
        if (category === 'clothes') {
            const clothesArr = Array.isArray(gameState.state.equippedClothes) ? gameState.state.equippedClothes : [];
            isEquippedClothes = clothesArr.includes(item.id);
        }
        
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
                    showNotification(`💡 마당을 터치해서 [${item.name}]을 배치하세요.`);
                    
                    // 자동으로 배치 모드 켜기
                    if (!isEditMode) {
                        isEditMode = true;
                        btnEditMode.classList.add('active'); // toggle-edit-mode -> btnEditMode
                        gridHelper.visible = true;
                    }
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
        // 배치 모드에서는 선택 표시 해제
        selectionIndicator.visible = false;
        selectedPlacedId = null;
        document.querySelector('.tab-btn[data-category="house"]').click();
        controls.minPolarAngle = 0.2;
        // 넓어진 마당 전체가 보이도록 더 높고 멀리서 내려다봄
        gsapToCameraTarget(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 13, 13));
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
    camAnimating = true; // 전환 중에는 팔로우 캠 일시 정지

    function step() {
        t += 1 / steps;
        camera.position.lerpVectors(startCam, camPos, t);
        controls.target.lerpVectors(startTar, targetPos, t);
        controls.update();
        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            camAnimating = false;
        }
    }
    step();
}

// 이동/선택 모드 토글 (RPG 좌클릭 식 상호작용 on/off)
function toggleInteractMode(force = null) {
    interactMode = (force !== null) ? force : !interactMode;
    const btn = document.getElementById('btn-interact');

    if (interactMode) {
        btn.classList.add('active');
        renderer.domElement.style.cursor = 'crosshair';
        showNotification("🖱️ 이동/선택 모드 ON — 땅을 탭하면 이동, 똥·쓰레기·물건을 탭하면 선택돼요. (카메라는 펫을 따라가요)");
    } else {
        btn.classList.remove('active');
        renderer.domElement.style.cursor = 'grab';
        selectionIndicator.visible = false;
        selectedPlacedId = null;
        clearDirtSelection();
        showNotification("🔄 이동/선택 모드 OFF — 화면을 손가락(또는 마우스)으로 끌면 자유롭게 이동돼요.");
    }
    applyControlMode();
}

// 이동/선택 모드에 따라 카메라 조작 방식을 전환
//  ON  : 한 손가락=회전, 팔로우 캠으로 펫을 따라감
//  OFF : 한 손가락=화면 이동(PAN), 팔로우 캠 꺼서 수동 이동 위치 유지 (모바일에서 화면 옮기기 쉬움)
function applyControlMode() {
    if (!controls) return;
    if (interactMode) {
        controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
        controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    } else {
        controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
        controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    }
}

// 배치된 물건을 선택 표시 (이동/선택 모드)
function selectPlacedItem(obj) {
    clearDirtSelection();
    selectionIndicator.position.set(obj.position.x, 0.03, obj.position.z);
    selectionIndicator.visible = true;
    selectedPlacedId = obj.userData.placedId;

    const species = gameState.state.species || "dog";
    const catItems = SHOP_ITEMS[species][obj.userData.category] || [];
    const matched = catItems.find(i => i.id === obj.userData.itemId);
    showNotification(`🔹 [${matched ? matched.name : '아이템'}] 을(를) 선택했어요. (배치하기 모드에서 위치 변경/철거 가능)`);
}

// --- 마우스 레이캐스팅 클릭 & 드래그 ---
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

            if (snapX * snapX + snapZ * snapZ < MOVE_RADIUS * MOVE_RADIUS) {
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
    // UI 위를 누른 것은 예외
    if (event.target.closest('#ui-container') || event.target.closest('#auth-overlay')) return;

    // 탭(짧게 누름) vs 드래그(카메라 이동) 구분을 위해 시작 좌표 기록
    pointerDownInfo = { x: event.clientX, y: event.clientY, edit: isEditMode };

    // 인게임 상호작용은 손을 뗄 때(onPointerUp) '탭'으로만 처리 → 드래그는 카메라 이동/회전에 양보
    if (!isEditMode) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (isEditMode) {
        // --- 배치 모드 ---
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
                
                const species = gameState.state.species || "dog";
                const catItems = SHOP_ITEMS[species][p.userData.category] || [];
                const matchedItem = catItems.find(i => i.id === p.userData.itemId);
                const itemName = matchedItem ? matchedItem.name : "아이템";
                
                if (confirm(`🧹 [${itemName}]을 철거합니까?`)) {
                    gameState.removePlacedItem(p.userData.placedId);
                    renderShopItems(p.userData.category);
                }
            }
        }
    }
}

// 손을 뗄 때 '탭'으로 판정되면 호출되는 인게임 상호작용 (모바일 터치/PC 클릭 공통)
function performGameTap(clientX, clientY) {
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    {
        // 1. 강아지 터치
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
                gameState.state.isResting = false;
                gameState.disturbSleep(); // 클릭으로 깨우기 = 잦은 방해 카운트
                dog.changeState('idle');
            } else {
                gameState.pet();
            }
            return;
        }

        // 2. 똥 터치 (개별 치우기)
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
            selectDirt('poop', poopObj.userData.poopId, poopObj.position);
            return;
        }

        // 3. 쓰레기 터치 (개별 줍기)
        const hitTrash = intersects.find(i => {
            let p = i.object;
            while (p && p !== scene) {
                if (p.userData && p.userData.isTrash) return true;
                p = p.parent;
            }
            return false;
        });

        if (hitTrash) {
            let trashObj = hitTrash.object;
            while (trashObj && !trashObj.userData.isTrash) trashObj = trashObj.parent;
            selectDirt('trash', trashObj.userData.trashId, trashObj.position);
            return;
        }

        // 4. 배치된 물건 터치 (선택)
        const hitItem = intersects.find(i => {
            let p = i.object;
            while (p && p !== scene) {
                if (p.userData && p.userData.isPlacedItem) return true;
                p = p.parent;
            }
            return false;
        });

        if (hitItem) {
            let itemObj = hitItem.object;
            while (itemObj && !(itemObj.userData && itemObj.userData.isPlacedItem)) itemObj = itemObj.parent;
            selectPlacedItem(itemObj);
            return;
        }

        // 5. 마당 빈 땅 터치 (해당 지점으로 이동)
        const hitGround = raycaster.intersectObject(groundPlane);
        if (hitGround.length > 0 && dog.state !== 'sleep' && dog.state !== 'walk_action') {
            const point = hitGround[0].point;
            if (point.x * point.x + point.z * point.z < MOVE_RADIUS * MOVE_RADIUS) {
                selectionIndicator.visible = false; // 이동 시 선택 해제
                selectedPlacedId = null;
                clearDirtSelection();
                dog.changeState('walk', new THREE.Vector3(point.x, 0.4, point.z));
            }
        }
    }
}

// 손가락/마우스를 뗄 때: 거의 안 움직였으면 '탭'으로 보고 게임 상호작용 실행
function onPointerUp(event) {
    const info = pointerDownInfo;
    pointerDownInfo = null;
    if (!info || info.edit) return;   // 배치 모드는 누를 때 이미 처리됨
    if (!interactMode) return;        // 이동/선택 OFF면 상호작용 안 함 (카메라 이동 전용)
    const moved = Math.hypot(event.clientX - info.x, event.clientY - info.y);
    if (moved > 12) return;           // 12px 이상 움직였으면 드래그(카메라 조작)로 간주
    performGameTap(event.clientX, event.clientY);
}

// 오물(똥/쓰레기) 선택: 링 + 치우기 버튼 표시 (모바일에서 정확히 탭하기 어려운 점 보완)
function selectDirt(kind, id, position) {
    selectedDirt = { kind, id };
    selectedPlacedId = null;
    if (position) {
        selectionIndicator.position.set(position.x, 0.03, position.z);
        selectionIndicator.visible = true;
    }
    const btn = document.getElementById('btn-clean-selected');
    if (btn) btn.classList.remove('hidden');
    showNotification(kind === 'poop'
        ? "💩 똥을 선택했어요. 아래 [치우기] 버튼을 누르세요!"
        : "🗑️ 쓰레기를 선택했어요. 아래 [치우기] 버튼을 누르세요!");
}

// 오물 선택 해제 + 치우기 버튼 숨김
function clearDirtSelection() {
    selectedDirt = null;
    const btn = document.getElementById('btn-clean-selected');
    if (btn) btn.classList.add('hidden');
    if (!selectedPlacedId) selectionIndicator.visible = false;
}

function handleDogAutonomy() {
    if (dog.state !== 'idle') return;

    const state = gameState.state;
    const rand = Math.random();

    if (state.hunger < 20 || state.thirst < 20) {
        if (rand < 0.45) {
            dog.changeState('sleep');
            return;
        }
    }

    if (rand < 0.28) {
        const targetX = (Math.random() - 0.5) * (MOVE_RADIUS * 1.6);
        const targetZ = (Math.random() - 0.5) * (MOVE_RADIUS * 1.6);
        dog.changeState('walk', new THREE.Vector3(targetX, 0.4, targetZ));
    }
    else if (rand < 0.38) {
        dog.changeState('sleep');
    }
    
    // 강아지가 자율적으로 똥 배출
    if (rand > 0.98 && state.poops.length < 3 && dog.state !== 'sleep') {
        gameState.spawnPoop();
    }
}

// 쓰레기 자동 날아오기 스케줄러 (강풍/비 날씨에 더 높은 확률로 출현)
function handleTrashSpawnCycle() {
    if (!gameState.state.username) return; // 미로그인 시 제한
    
    const weather = gameState.state.currentWeather;
    const rand = Math.random();
    
    let spawnChance = 0.2; // 맑음 기본 20%
    if (weather === "wind" || weather === "rain") {
        spawnChance = 0.55; // 비바람 시 55% 확률로 증가
    }

    if (rand < spawnChance) {
        gameState.spawnTrash();
    }
}

function handleWeatherCycle() {
    const weathers = ["clear", "clear", "rain", "heatwave", "wind"];
    const select = weathers[Math.floor(Math.random() * weathers.length)];
    gameState.setWeather(select);
}

// --- UI 및 입자 효과 노출 ---
let notificationTimeout;
function showNotification(msg) {
    clearTimeout(notificationTimeout);
    notificationEl.textContent = msg;
    notificationEl.classList.remove('hidden');

    notificationTimeout = setTimeout(() => {
        notificationEl.classList.add('hidden');
    }, 3200);
}

// 능력치 0 위기 경고 배너 (vital / clean 두 종류 동시 표시 가능)
const activeWarnings = {};
function showCriticalWarning(w) {
    if (!w || !criticalWarningEl) return;
    activeWarnings[w.type] = w;
    renderCriticalWarning();
}
function hideCriticalWarning(type) {
    if (!criticalWarningEl) return;
    if (type) delete activeWarnings[type];
    renderCriticalWarning();
}
function renderCriticalWarning() {
    if (!criticalWarningEl) return;
    const keys = Object.keys(activeWarnings);
    if (keys.length === 0) {
        criticalWarningEl.classList.add('hidden');
        criticalWarningEl.innerHTML = '';
        return;
    }
    criticalWarningEl.innerHTML = keys
        .map(k => `⚠️ ${activeWarnings[k].message} — ${activeWarnings[k].remain}초!`)
        .join('<br>');
    criticalWarningEl.classList.remove('hidden');
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

// --- 메인 애니메이션 드로우 루프 ---
function animate() {
    requestAnimationFrame(animate);

    try {
    // 탭 비활성화 시 deltaTime이 너무 커지면 lerp에서 폭주하여 렌더링이 깨지는 현상(화면 사라짐) 방지
    const rawDelta = clock.getDelta();
    const deltaTime = Math.min(rawDelta, 0.05);
    const time = clock.getElapsedTime();

    // 0. 캬버스 크기 자동 보정: 모바일 첫 로드 시 뷰포트가 안정화되기 전에 렌더러가
    // 작은 크기로 설정되는 문제를 매 프레임 감지하여 자동 보정
    const canvas = renderer.domElement;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.clientWidth !== w || canvas.clientHeight !== h) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    // 1. 강아지 업데이트
    if (dog) {
        dog.update(deltaTime, time);
    }

    // 1.5 팔로우 캠: 펫이 이동하면 카메라가 부드럽게 따라감 (배치/전환 중·이동선택 OFF면 정지)
    if (dog && dog.group && !isEditMode && !camAnimating && interactMode && controls) {
        const dogPos = new THREE.Vector3();
        dog.group.getWorldPosition(dogPos);
        const desired = new THREE.Vector3(dogPos.x, 0.4, dogPos.z);
        // 목표(펫)와 현재 타깃의 차이를 일정 비율만큼만 이동 → 부드러운 추적
        const follow = desired.sub(controls.target).multiplyScalar(Math.min(1, deltaTime * 2.2));
        controls.target.add(follow);
        camera.position.add(follow); // 카메라도 같은 양 평행이동 → 시점/거리 유지
    }

    // 2. 구름 유유히 떠다니기 애니메이션 (바람 부는 속도에 비례)
    if (cloudsGroup) {
        let cloudSpeed = 0.08;
        if (gameState.state.currentWeather === "wind") {
            cloudSpeed = 0.35; // 바람 불 때는 4배 이상 빨리 지나감
        }
        
        cloudMeshes.forEach(cloud => {
            cloud.position.x += deltaTime * cloudSpeed;
            // 끝까지 가버리면 왼쪽 바깥에서 다시 재활용
            if (cloud.position.x > 8.0) {
                cloud.position.x = -8.0;
            }
        });
    }

    // 3. 비 사선 낙하 및 바닥 스플래시 연출
    if (rainParticles && rainParticles.visible) {
        const positions = rainParticles.geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] -= deltaTime * 1.5;     // 바람 때문에 왼쪽 사선으로 떨어짐
            positions[i + 1] -= deltaTime * 5.2; // 세로 낙하 속도
            
            if (positions[i + 1] < 0.04) {
                // 빗방울이 바닥에 충돌할 때 낮은 확률로 바닥 물파문 Splash 생성
                if (Math.random() < 0.04) {
                    spawnRainSplash(positions[i], positions[i + 2]);
                }
                // 공중으로 재생성 리셋
                positions[i + 1] = 8.0;
                positions[i] = (Math.random() - 0.5) * 12;
            }
        }
        rainParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 바닥 Splash 물파문 애니메이션 및 제거
    for (let i = splashRipples.length - 1; i >= 0; i--) {
        const rip = splashRipples[i];
        rip.timer += deltaTime;
        
        // 링 스케일 확장
        const scale = 1.0 + (rip.timer / rip.maxLife) * 2.5;
        rip.mesh.scale.set(scale, scale, 1);
        
        // 페이드아웃 투명도
        rip.mesh.material.opacity = Math.max(0, 0.65 * (1.0 - (rip.timer / rip.maxLife)));

        if (rip.timer >= rip.maxLife) {
            scene.remove(rip.mesh);
            rip.mesh.geometry.dispose();
            rip.mesh.material.dispose();
            splashRipples.splice(i, 1);
        }
    }

    // 4. 강풍 시 흔들리는 나무들 및 날아가는 잎사귀
    const weather = gameState.state.currentWeather;
    if (weather === "wind") {
        // 나무 상단 잎 무더기만 바람에 쏠려 씰룩대기
        if (treesArray) {
            treesArray.forEach((tree, idx) => {
                const leaves = tree.userData.leavesGroup;
                if (leaves) {
                    leaves.rotation.z = Math.sin(time * 6.5 + idx) * 0.08;
                    leaves.rotation.x = Math.cos(time * 5.0 + idx) * 0.05;
                }
            });
        }
        
        // 울타리도 삐걱삐걱 가볍게 요동침
        if (fenceGroup) {
            fenceGroup.rotation.y = Math.sin(time * 2.0) * 0.005;
        }

        // 휘날리는 초록 잎사귀 파티클 이동
        if (windLeaves && windLeaves.visible) {
            const positions = windLeaves.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += deltaTime * 3.5;    // 강하게 불어 날아감
                positions[i + 1] -= deltaTime * 0.4; // 중력 낙하
                
                if (positions[i] > 7.0 || positions[i + 1] < 0) {
                    positions[i] = -7.0; // 왼쪽 재진입
                    positions[i + 1] = Math.random() * 3.5;
                    positions[i + 2] = (Math.random() - 0.5) * 12;
                }
            }
            windLeaves.geometry.attributes.position.needsUpdate = true;
        }
    } else {
        // 평상시 나무 흔들림 잔잔히
        if (treesArray) {
            treesArray.forEach((tree, idx) => {
                const leaves = tree.userData.leavesGroup;
                if (leaves) {
                    leaves.rotation.z = THREE.MathUtils.lerp(leaves.rotation.z, 0, deltaTime * 2);
                    leaves.rotation.x = THREE.MathUtils.lerp(leaves.rotation.x, 0, deltaTime * 2);
                }
            });
        }
    }

    // 5. 폭염 아지랑이 파티클 모션 계산 (위로 조용히 아른거리며 기화)
    if (heatWaves && heatWaves.visible) {
        const positions = heatWaves.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] += deltaTime * 0.25; // 천천히 수직 기화
            
            // 공중 2.5m 위로 올라가면 다시 바닥 부근으로 리셋
            if (positions[i] > 2.5) {
                positions[i] = 0.02 + Math.random() * 0.2;
            }
        }
        heatWaves.geometry.attributes.position.needsUpdate = true;
    }

    // 6. 스폰된 쓰레기 공중 낙하 시뮬레이션
    Object.keys(trash3D).forEach(id => {
        const mesh = trash3D[id];
        if (mesh.position.y > mesh.userData.targetY) {
            mesh.position.y -= deltaTime * mesh.userData.fallSpeed;
            // 회전 시켜 뒹굴어 떨어지는 느낌 부여
            mesh.rotation.x += deltaTime * 2.0;
            mesh.rotation.y += deltaTime * 1.5;

            // 바닥에 닿으면 낙하 종료 및 튕김 연출
            if (mesh.position.y <= mesh.userData.targetY) {
                mesh.position.y = mesh.userData.targetY;
                mesh.rotation.set(0, Math.random() * Math.PI, 0); // 눕힘 각도 고정
            }
        }
    });

    // 7. 카메라 NaN/이상값 방어 후 갱신
    if (camera && controls) {
        const cp = camera.position, ct = controls.target;
        if (![cp.x, cp.y, cp.z, ct.x, ct.y, ct.z].every(Number.isFinite)) {
            // 팔로우 캠/보간이 비정상 값이 되면 안전한 기본 시점으로 복구 (화면 사라짐 방지)
            camera.position.set(0, 5.5, 7.5);
            controls.target.set(0, 0.4, 0);
        }
        controls.update();
    }
    } catch (err) {
        // 한 프레임의 오류가 3D 화면을 영구히 죽이지 않도록 흡수 (최초 1회만 기록)
        if (!animateErrorLogged) {
            console.error('[animate] 루프 오류 — 렌더는 계속 진행합니다:', err);
            animateErrorLogged = true;
        }
    }

    // 어떤 상황에서도 마지막엔 반드시 렌더링하여 3D 화면이 사라지지 않게 함
    try {
        if (renderer && scene && camera) renderer.render(scene, camera);
    } catch (e) { /* 컨텍스트 분실 등 일시적 오류는 무시하고 다음 프레임 재시도 */ }
}

// 모바일에서 DOM 파싱은 끝났지만 뷰포트 레이아웃이 아직 확정되지 않은 상태에서
// init()이 실행되면 렌더러 크기가 작게 설정됨. 레이아웃 안정 후 실행 보장.
if (document.readyState === 'complete') {
    init();
} else {
    window.addEventListener('load', init, { once: true });
}
