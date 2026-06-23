// 강아지 키우기 게임 상태 관리 모듈 (Level 1-5 확장 및 날씨, 산책 로직 추가)

const DEFAULT_STATE = {
    petName: "바둑이",
    affinityLevel: 1,
    affinityXP: 0, // 0 to 100
    hunger: 100, // 0 to 100
    thirst: 100, // 0 to 100
    cleanliness: 100, // 0 to 100
    placedItems: [], 
    poops: [], 
    equippedClothes: null,
    lastSaved: Date.now(),
    
    // 하루 쓰다듬기 카운터
    lastPetDate: "", // YYYY-MM-DD
    dailyPetCount: 0,
    
    // 날씨 상태
    currentWeather: "clear" // "clear", "rain", "heatwave", "wind"
};

// 5단계 레벨별 아이템 리스트 확장
export const SHOP_ITEMS = {
    house: [
        { id: "house_basic", name: "종이 박스 집", desc: "기본적이고 빈티지한 골판지 집", level: 1, emoji: "📦" },
        { id: "house_wooden", name: "클래식 개집", desc: "튼튼하고 아늑한 원목 개집", level: 2, emoji: "🏠" },
        { id: "house_cushion", name: "솜사탕 마시멜로 방석", desc: "구름 위에 누운 듯한 극강의 푹신함", level: 3, emoji: "🛏️" },
        { id: "house_tent", name: "인디언 티피 텐트", desc: "캠핑 감성이 낭만적인 꼬마 텐트", level: 4, emoji: "⛺" },
        { id: "house_royal", name: "럭셔리 멍캐슬", desc: "궁궐 같은 고품격 대리석 성채", level: 5, emoji: "🏰" }
    ],
    bowl: [
        { id: "bowl_basic", name: "플라스틱 밥그릇", desc: "가볍고 알록달록한 플라스틱 식기", level: 1, emoji: "🥣" },
        { id: "bowl_wooden", name: "원목 스탠드 식기", desc: "관절 건강을 지키는 2구 스탠드 식기", level: 2, emoji: "🪵" },
        { id: "bowl_stone", name: "화강암 식기", desc: "쉽게 밀리지 않는 묵직한 돌그릇", level: 3, emoji: "🪨" },
        { id: "bowl_ceramic", name: "무광 도자기 그릇", desc: "도예가가 직접 빚은 친환경 그릇", level: 4, emoji: "🍽️" },
        { id: "bowl_royal", name: "골드 크라운 식기", desc: "금빛 왕관 모양의 최고급 황금 그릇", level: 5, emoji: "👑" }
    ],
    toy: [
        { id: "toy_ball", name: "줄무늬 공", desc: "굴리며 놀기 딱 좋은 말랑말랑한 공", level: 1, emoji: "🎾" },
        { id: "toy_bone", name: "고무 뼈다귀", desc: "치석 제거에 도움을 주는 질긴 장난감", level: 2, emoji: "🦴" },
        { id: "toy_duck", name: "삑삑이 러버덕", desc: "누르면 삑삑 소리가 나는 노란 오리 인형", level: 3, emoji: "🐤" },
        { id: "toy_disc", name: "소프트 원반(프리스비)", desc: "바람을 타고 날아가는 가벼운 원반", level: 4, emoji: "🥏" },
        { id: "toy_bear", name: "핸드메이드 곰인형", desc: "포근하고 정교한 오가닉 코튼 인형", level: 5, emoji: "🧸" }
    ],
    clothes: [
        { id: "clothes_collar", name: "빨간 스카프", desc: "목에 둘러 멋을 내는 패셔너블 스카프", level: 1, emoji: "🧣" },
        { id: "clothes_hat", name: "생일 파티 고깔모자", desc: "생일 기분을 낼 수 있는 귀여운 모자", level: 2, emoji: "🎉" },
        { id: "clothes_shirt", name: "초록 스트라이프 티셔츠", desc: "피부가 예민한 강아지용 면 티셔츠", level: 3, emoji: "👕" },
        { id: "clothes_glasses", name: "선글라스", desc: "눈이 부실 때 쓰는 힙스터용 선글라스", level: 4, emoji: "🕶️" },
        { id: "clothes_wizard", name: "별빛 마법사 모자", desc: "신비롭고 몽환적인 꼬깔모자", level: 5, emoji: "🧙" }
    ]
};

class GameStateManager {
    constructor() {
        this.state = { ...DEFAULT_STATE };
        this.listeners = {};
        this.loadState();
        
        // 1초 주기로 상태 업데이트 및 환경 감쇠 진행
        this.decayInterval = setInterval(() => this.decayStats(), 1000);
    }

    subscribe(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    loadState() {
        try {
            const saved = localStorage.getItem("my_little_puppy_save");
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = { ...DEFAULT_STATE, ...parsed };
                
                // 오프라인 방치 감쇠 계산
                const offlineTime = Date.now() - this.state.lastSaved;
                const secondsPassed = Math.floor(offlineTime / 1000);
                if (secondsPassed > 10) {
                    this.applyOfflineDecay(secondsPassed);
                }
            }
        } catch (e) {
            console.error("로드 중 에러 발생, 새 게임 상태로 초기화:", e);
            this.state = { ...DEFAULT_STATE };
        }
    }

    saveState() {
        try {
            this.state.lastSaved = Date.now();
            localStorage.setItem("my_little_puppy_save", JSON.stringify(this.state));
        } catch (e) {
            console.error("세이브 에러:", e);
        }
    }

    applyOfflineDecay(seconds) {
        // 기본 감쇠량
        const hungerDecay = Math.min(seconds * 0.03, 85); 
        const thirstDecay = Math.min(seconds * 0.05, 85);
        
        this.state.hunger = Math.max(0, this.state.hunger - hungerDecay);
        this.state.thirst = Math.max(0, this.state.thirst - thirstDecay);

        // 방치 중 똥 생성 (최대 3개)
        if (seconds > 3600) {
            const currentPoopsCount = this.state.poops.length;
            const newPoops = Math.min(3 - currentPoopsCount, Math.floor(seconds / 28800));
            for (let i = 0; i < newPoops; i++) {
                this.state.poops.push({
                    id: "poop_" + Math.random().toString(36).substr(2, 9),
                    position: {
                        x: (Math.random() - 0.5) * 4,
                        y: 0.1,
                        z: (Math.random() - 0.5) * 4
                    }
                });
            }
        }
        
        this.updateCleanliness();
        this.saveState();
    }

    decayStats() {
        // 날씨 효과에 따라 감쇠 속도 보정
        let hungerMultiplier = 1.0;
        let thirstMultiplier = 1.0;
        let cleanlinessMultiplier = 1.0;

        switch (this.state.currentWeather) {
            case 'rain':
                // 비가 오면 진흙이 묻어 청결도가 빠르게 감소
                cleanlinessMultiplier = 1.5;
                break;
            case 'heatwave':
                // 폭염에는 수분이 극도로 빠르게 감소
                thirstMultiplier = 2.5;
                break;
            case 'wind':
                // 강풍에는 체온 유지를 위해 에너지를 소모하여 포만감이 빠르게 감소
                hungerMultiplier = 1.8;
                break;
        }

        // 능력치 실시간 감소
        this.state.hunger = Math.max(0, this.state.hunger - 0.05 * hungerMultiplier);
        this.state.thirst = Math.max(0, this.state.thirst - 0.08 * thirstMultiplier);

        // 마당에 똥이 있는 경우 청결도가 누적 감소
        if (this.state.poops.length > 0) {
            const poopDecay = this.state.poops.length * 0.25 * cleanlinessMultiplier;
            this.state.cleanliness = Math.max(0, this.state.cleanliness - poopDecay);
        } else {
            // 깨끗한 마당일 경우 청결도 서서히 자연 회복
            this.state.cleanliness = Math.min(100, this.state.cleanliness + 0.08);
        }

        // 호감도 정산 (방치 상태 체크)
        const isNeglected = this.state.hunger < 25 || this.state.thirst < 25 || this.state.cleanliness < 25;
        if (!isNeglected) {
            this.gainAffinityXP(0.015); // 평상시 느린 자동 상승
        } else {
            this.gainAffinityXP(-0.01); // 방치 시 감소
        }

        this.emit("statsChanged", this.state);
        this.saveState();
    }

    updateCleanliness() {
        if (this.state.poops.length > 0) {
            this.state.cleanliness = Math.max(0, 100 - (this.state.poops.length * 20));
        } else {
            this.state.cleanliness = 100;
        }
        this.emit("statsChanged", this.state);
    }

    gainAffinityXP(amount) {
        this.state.affinityXP += amount;
        
        if (this.state.affinityXP >= 100) {
            if (this.state.affinityLevel < 5) {
                this.state.affinityLevel += 1;
                this.state.affinityXP = 0;
                this.emit("levelUp", this.state.affinityLevel);
                this.emit("notification", `🎉 축하합니다! 호감도 레벨 ${this.state.affinityLevel} 달성! 새로운 아이템들이 해금되었습니다!`);
            } else {
                this.state.affinityXP = 100; // 최고 레벨 5 캡
            }
        } else if (this.state.affinityXP < 0) {
            this.state.affinityXP = 0;
        }
        this.emit("affinityChanged", { xp: this.state.affinityXP, level: this.state.affinityLevel });
    }

    // 날씨 설정 및 알림 발생
    setWeather(weather) {
        if (this.state.currentWeather === weather) return;
        this.state.currentWeather = weather;

        let weatherMsg = "";
        switch (weather) {
            case "clear": weatherMsg = "☀️ 날씨가 다시 맑아졌습니다. 마당이 아주 화창합니다!"; break;
            case "rain": weatherMsg = "🌧️ 비가 오기 시작합니다! 강아지의 몸이 젖어 청결도가 빠르게 닳습니다."; break;
            case "heatwave": weatherMsg = "🥵 찌는 듯한 폭염입니다! 강아지가 지치지 않게 시원한 물을 자주 주세요."; break;
            case "wind": weatherMsg = "💨 거센 찬바람이 붑니다! 에너지를 많이 써서 포만감이 빠르게 닳습니다."; break;
        }

        this.emit("weatherChanged", weather);
        this.emit("notification", weatherMsg);
        this.saveState();
    }

    // 쓰다듬기 (하루 5회 제한 장치 탑재)
    pet() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // 날짜가 바뀌었으면 카운터 초기화
        if (this.state.lastPetDate !== today) {
            this.state.lastPetDate = today;
            this.state.dailyPetCount = 0;
        }

        if (this.state.dailyPetCount >= 5) {
            // 제한 도달: 3D 반응은 보여주되, 호감도는 올리지 않음
            this.emit("petAction", { gainedXP: false });
            this.emit("notification", "🐶 강아지가 행복해하지만, 오늘 쓰다듬기 호감도는 이미 꽉 찼습니다! (최대 5회)");
            return;
        }

        // 쓰다듬기 적용
        this.state.dailyPetCount += 1;
        this.gainAffinityXP(8); // 쓰다듬기 1회당 8 XP
        this.state.cleanliness = Math.max(0, this.state.cleanliness - 0.5);
        this.emit("petAction", { gainedXP: true });
        this.emit("notification", `👋 강아지를 쓰다듬어 주었습니다! (오늘의 쓰다듬기: ${this.state.dailyPetCount}/5)`);
        this.saveState();
    }

    feed() {
        this.state.hunger = Math.min(100, this.state.hunger + 30);
        this.gainAffinityXP(1.5); // 먹이주기 소폭 증가
        this.emit("feedAction", null);
        this.emit("notification", "🍖 강아지가 사료를 맛있게 먹습니다!");
        this.saveState();
    }

    water() {
        this.state.thirst = Math.min(100, this.state.thirst + 35);
        this.gainAffinityXP(1.5); // 물주기 소폭 증가
        this.emit("waterAction", null);
        this.emit("notification", "💧 강아지가 물을 시원하게 들이킵니다!");
        this.saveState();
    }

    // 산책하기 액션 (새로운 상호작용 기능)
    walk() {
        const isExhausted = this.state.hunger < 15 || this.state.thirst < 20;
        if (isExhausted) {
            this.emit("notification", "⚠️ 강아지가 배고프거나 지쳐서 산책을 갈 수 없습니다. 밥과 물을 먼저 주세요!");
            return false;
        }

        // 상태 소모 및 호감도 큰 폭 증가
        this.state.hunger = Math.max(0, this.state.hunger - 15);
        this.state.thirst = Math.max(0, this.state.thirst - 20);
        this.gainAffinityXP(15); // 산책은 15 XP 보상 (중요한 호감도 획득 경로)

        this.emit("walkAction", null);
        this.emit("notification", "🦮 강아지와 마당을 신나게 달리며 산책했습니다! 호감도 급상승!");
        this.saveState();
        return true;
    }

    spawnPoop(pos = null) {
        const poopId = "poop_" + Math.random().toString(36).substr(2, 9);
        const position = pos || {
            x: (Math.random() - 0.5) * 5,
            y: 0.1,
            z: (Math.random() - 0.5) * 5
        };
        const newPoop = { id: poopId, position };
        this.state.poops.push(newPoop);
        this.updateCleanliness();
        this.emit("poopSpawned", newPoop);
        this.emit("notification", "💩 강아지가 실례를 했습니다! 마당의 청결을 위해 치워주세요.");
        this.saveState();
    }

    cleanPoop(poopId = null) {
        if (this.state.poops.length === 0) {
            this.emit("notification", "✨ 마당이 이미 청결하고 깨끗합니다!");
            return;
        }

        let cleaned = null;
        if (poopId) {
            const index = this.state.poops.findIndex(p => p.id === poopId);
            if (index !== -1) {
                cleaned = this.state.poops.splice(index, 1)[0];
            }
        } else {
            cleaned = this.state.poops.shift();
        }

        if (cleaned) {
            this.updateCleanliness();
            this.gainAffinityXP(4); // 똥 치워주면 호감도 상승
            this.emit("poopCleaned", cleaned.id);
            this.emit("notification", "🧹 똥을 깨끗하게 청소해 주었습니다! 청결 회복!");
        }
        this.saveState();
    }

    placeItem(itemId, itemCategory, position, rotation = 0) {
        const itemsList = SHOP_ITEMS[itemCategory];
        const itemInfo = itemsList.find(i => i.id === itemId);
        
        if (!itemInfo || itemInfo.level > this.state.affinityLevel) {
            this.emit("notification", "🔒 해금 조건이 충족되지 않았습니다!");
            return false;
        }

        // 단일 설치 카테고리 교체
        if (itemCategory === "house" || itemCategory === "bowl") {
            const existingIndex = this.state.placedItems.findIndex(i => i.category === itemCategory);
            if (existingIndex !== -1) {
                const removed = this.state.placedItems.splice(existingIndex, 1)[0];
                this.emit("itemRemoved", removed.id);
            }
        }

        const placedId = "placed_" + Math.random().toString(36).substr(2, 9);
        const newPlacedItem = {
            id: placedId,
            itemId: itemId,
            category: itemCategory,
            position,
            rotation
        };

        this.state.placedItems.push(newPlacedItem);
        this.emit("itemPlaced", newPlacedItem);
        this.emit("notification", `🎁 [${itemInfo.name}] 설치가 완료되었습니다.`);
        this.saveState();
        return true;
    }

    removePlacedItem(placedId) {
        const index = this.state.placedItems.findIndex(i => i.id === placedId);
        if (index !== -1) {
            const removed = this.state.placedItems.splice(index, 1)[0];
            this.emit("itemRemoved", placedId);
            this.saveState();
            return true;
        }
        return false;
    }

    equipClothes(itemId) {
        const itemInfo = SHOP_ITEMS.clothes.find(i => i.id === itemId);
        if (!itemInfo || itemInfo.level > this.state.affinityLevel) {
            this.emit("notification", "🔒 해금 조건이 충족되지 않았습니다!");
            return false;
        }

        // 이미 입고 있는 옷을 클릭하면 탈의
        if (this.state.equippedClothes === itemId) {
            this.state.equippedClothes = null;
            this.emit("clothesEquipped", null);
            this.emit("notification", "👔 의상을 탈의했습니다.");
        } else {
            this.state.equippedClothes = itemId;
            this.emit("clothesEquipped", itemId);
            this.emit("notification", `👔 [${itemInfo.name}]을 착용했습니다!`);
        }

        this.saveState();
        return true;
    }

    resetState() {
        this.state = { ...DEFAULT_STATE, poops: [], placedItems: [] };
        localStorage.removeItem("my_little_puppy_save");
        this.emit("stateReset", this.state);
        this.emit("notification", "🔄 저장 데이터가 초기화되었습니다.");
        this.saveState();
    }
}

export const gameState = new GameStateManager();
