// 강아지 키우기 게임 상태 관리 모듈 (커스터마이징, 백엔드 연동, 쓰레기 수거 로직 추가)

const DEFAULT_STATE = {
    petName: "바둑이",
    affinityLevel: 1,
    affinityXP: 0, 
    hunger: 100, 
    thirst: 100, 
    cleanliness: 100, 
    placedItems: [], 
    poops: [], 
    equippedClothes: null,
    lastSaved: Date.now(),
    
    // 하루 쓰다듬기 카운터
    lastPetDate: "", 
    dailyPetCount: 0,
    
    // 날씨 상태
    currentWeather: "clear",

    // 신규 추가: 커스터마이징 데이터
    furColor: "#ffcc80",
    earType: "floppy",

    // 신규 추가: 마당 쓰레기 리스트
    trash: [],

    // 계정 정보
    username: null,
    isOnline: false
};

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

// 쓰레기 타입 리스트 정의
export const TRASH_TYPES = [
    { type: "can", name: "찌그러진 알루미늄 캔", emoji: "🥫" },
    { type: "paper", name: "구겨진 종이 조각", emoji: "📄" },
    { type: "bottle", name: "버려진 페트병", emoji: "🍼" }
];

class GameStateManager {
    constructor() {
        this.state = { ...DEFAULT_STATE };
        this.listeners = {};
        
        // 1초 주기로 자동 감쇠 작동
        this.decayInterval = setInterval(() => this.decayStats(), 1000);
        
        // 20초 주기 자동 클라우드 백업 가동
        this.autoSaveInterval = setInterval(() => {
            if (this.state.isOnline && this.state.username) {
                this.saveToCloud();
            }
        }, 20000);
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

    // 로그인 시 상태 주입
    setLoginSession(username, petState, isOnline = true) {
        this.state = { 
            ...DEFAULT_STATE, 
            ...petState, 
            username, 
            isOnline 
        };
        this.emit("loginSuccess", this.state);
        this.saveState();
    }

    // 로그아웃 처리
    logout() {
        this.state = { ...DEFAULT_STATE };
        localStorage.removeItem("my_little_puppy_save");
        this.emit("logout", null);
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
            console.error("로컬 로드 에러:", e);
            this.state = { ...DEFAULT_STATE };
        }
    }

    saveState() {
        try {
            this.state.lastSaved = Date.now();
            localStorage.setItem("my_little_puppy_save", JSON.stringify(this.state));
        } catch (e) {
            console.error("로컬 저장 에러:", e);
        }
    }

    // 클라우드 백업 API 호출
    async saveToCloud() {
        if (!this.state.username) return;
        
        this.emit("syncing", true);
        try {
            const response = await fetch("/functions/api/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: this.state.username,
                    petState: this.state
                })
            });

            const data = await response.json();
            if (data.success) {
                this.emit("syncComplete", { success: true });
            } else {
                console.error("클라우드 저장 실패:", data.error);
                this.emit("syncComplete", { success: false });
            }
        } catch (err) {
            console.error("네트워크 에러로 저장 실패:", err);
            this.emit("syncComplete", { success: false });
        }
    }

    applyOfflineDecay(seconds) {
        const hungerDecay = Math.min(seconds * 0.03, 85); 
        const thirstDecay = Math.min(seconds * 0.05, 85);
        
        this.state.hunger = Math.max(0, this.state.hunger - hungerDecay);
        this.state.thirst = Math.max(0, this.state.thirst - thirstDecay);

        // 방치 중 똥 및 쓰레기 생성
        if (seconds > 3600) {
            const count = Math.min(3, Math.floor(seconds / 28800));
            // 똥 소환
            for (let i = 0; i < count; i++) {
                this.state.poops.push({
                    id: "poop_" + Math.random().toString(36).substr(2, 9),
                    position: {
                        x: (Math.random() - 0.5) * 4,
                        y: 0.1,
                        z: (Math.random() - 0.5) * 4
                    }
                });
            }
            // 쓰레기 소환
            for (let i = 0; i < count; i++) {
                const trashType = TRASH_TYPES[Math.floor(Math.random() * TRASH_TYPES.length)];
                this.state.trash.push({
                    id: "trash_" + Math.random().toString(36).substr(2, 9),
                    type: trashType.type,
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
        let hungerMultiplier = 1.0;
        let thirstMultiplier = 1.0;
        let cleanlinessMultiplier = 1.0;

        switch (this.state.currentWeather) {
            case 'rain':
                cleanlinessMultiplier = 1.5;
                break;
            case 'heatwave':
                thirstMultiplier = 2.5;
                break;
            case 'wind':
                hungerMultiplier = 1.8;
                break;
        }

        // 실시간 배고픔/목마름 감소
        this.state.hunger = Math.max(0, this.state.hunger - 0.04 * hungerMultiplier);
        this.state.thirst = Math.max(0, this.state.thirst - 0.06 * thirstMultiplier);

        // 똥과 쓰레기 총량에 따라 청결도 급감
        const dirtyFactor = this.state.poops.length + this.state.trash.length;
        if (dirtyFactor > 0) {
            const decay = dirtyFactor * 0.25 * cleanlinessMultiplier;
            this.state.cleanliness = Math.max(0, this.state.cleanliness - decay);
        } else {
            // 깨끗하면 자연 충전
            this.state.cleanliness = Math.min(100, this.state.cleanliness + 0.1);
        }

        // 호감도 정산
        const isNeglected = this.state.hunger < 25 || this.state.thirst < 25 || this.state.cleanliness < 25;
        if (!isNeglected) {
            this.gainAffinityXP(0.015);
        } else {
            this.gainAffinityXP(-0.015);
        }

        this.emit("statsChanged", this.state);
        this.saveState();
    }

    updateCleanliness() {
        const dirtyCount = this.state.poops.length + this.state.trash.length;
        if (dirtyCount > 0) {
            this.state.cleanliness = Math.max(0, 100 - (dirtyCount * 15));
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
                this.emit("notification", `🎉 축하합니다! 호감도 레벨 ${this.state.affinityLevel} 달성!`);
                if (this.state.isOnline) this.saveToCloud();
            } else {
                this.state.affinityXP = 100;
            }
        } else if (this.state.affinityXP < 0) {
            this.state.affinityXP = 0;
        }
        this.emit("affinityChanged", { xp: this.state.affinityXP, level: this.state.affinityLevel });
    }

    setWeather(weather) {
        if (this.state.currentWeather === weather) return;
        this.state.currentWeather = weather;

        let weatherMsg = "";
        switch (weather) {
            case "clear": weatherMsg = "☀️ 하늘이 맑아졌습니다. 마당이 아주 화창합니다!"; break;
            case "rain": weatherMsg = "🌧️ 비바람이 치기 시작합니다! 강아지의 청결도가 빠르게 닳습니다."; break;
            case "heatwave": weatherMsg = "🥵 찌는 폭염이 찾아왔습니다! 강아지가 더워하니 물을 자주 주세요."; break;
            case "wind": weatherMsg = "💨 강풍이 몰아칩니다! 강아지의 포만감이 빠르게 소모됩니다."; break;
        }

        this.emit("weatherChanged", weather);
        this.emit("notification", weatherMsg);
        this.saveState();
        if (this.state.isOnline) this.saveToCloud();
    }

    // 쓰다듬기 (하루 5회 제한)
    pet() {
        const today = new Date().toISOString().split('T')[0];
        
        if (this.state.lastPetDate !== today) {
            this.state.lastPetDate = today;
            this.state.dailyPetCount = 0;
        }

        if (this.state.dailyPetCount >= 5) {
            this.emit("petAction", { gainedXP: false });
            this.emit("notification", "🐶 강아지가 행복해하지만, 오늘 호감도는 충분히 올랐습니다! (최대 5회)");
            return;
        }

        this.state.dailyPetCount += 1;
        this.gainAffinityXP(8);
        this.state.cleanliness = Math.max(0, this.state.cleanliness - 0.5);
        this.emit("petAction", { gainedXP: true });
        this.emit("notification", `👋 강아지를 부드럽게 쓰다듬었습니다! (${this.state.dailyPetCount}/5)`);
        this.saveState();
        if (this.state.isOnline) this.saveToCloud();
    }

    feed() {
        this.state.hunger = Math.min(100, this.state.hunger + 30);
        this.gainAffinityXP(1.5);
        this.emit("feedAction", null);
        this.emit("notification", "🍖 강아지가 밥을 맛있게 먹습니다!");
        this.saveState();
        if (this.state.isOnline) this.saveToCloud();
    }

    water() {
        this.state.thirst = Math.min(100, this.state.thirst + 35);
        this.gainAffinityXP(1.5);
        this.emit("waterAction", null);
        this.emit("notification", "💧 강아지가 물을 시원하게 마십니다!");
        this.saveState();
        if (this.state.isOnline) this.saveToCloud();
    }

    walk() {
        const isExhausted = this.state.hunger < 15 || this.state.thirst < 20;
        if (isExhausted) {
            this.emit("notification", "⚠️ 강아지가 너무 피곤해합니다. 밥과 물을 먼저 챙겨주세요!");
            return false;
        }

        this.state.hunger = Math.max(0, this.state.hunger - 15);
        this.state.thirst = Math.max(0, this.state.thirst - 20);
        this.gainAffinityXP(15); 

        this.emit("walkAction", null);
        this.emit("notification", "🦮 강아지와 마당을 한바퀴 산책하며 뛰어놀았습니다!");
        this.saveState();
        if (this.state.isOnline) this.saveToCloud();
        return true;
    }

    // 똥 소환
    spawnPoop(pos = null) {
        const poopId = "poop_" + Math.random().toString(36).substr(2, 9);
        const position = pos || {
            x: (Math.random() - 0.5) * 4.6,
            y: 0.1,
            z: (Math.random() - 0.5) * 4.6
        };
        const newPoop = { id: poopId, position };
        this.state.poops.push(newPoop);
        this.updateCleanliness();
        this.emit("poopSpawned", newPoop);
        this.emit("notification", "💩 강아지가 마당에 똥을 쌌습니다! 치워주세요.");
        this.saveState();
    }

    // 똥 청소
    cleanPoop(poopId = null) {
        if (this.state.poops.length === 0) return;

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
            this.gainAffinityXP(4); 
            this.emit("poopCleaned", cleaned.id);
            this.emit("notification", "🧹 강아지 똥을 깨끗하게 치워주었습니다!");
            this.saveState();
            if (this.state.isOnline) this.saveToCloud();
        }
    }

    // 신규 추가: 쓰레기 소환
    spawnTrash() {
        if (this.state.trash.length >= 4) return; // 쓰레기가 너무 많아지지 않게 방지

        const trashId = "trash_" + Math.random().toString(36).substr(2, 9);
        const trashType = TRASH_TYPES[Math.floor(Math.random() * TRASH_TYPES.length)];
        
        // 날아가 떨어지게 하기 위해 x, z는 하늘 위에서 떨어질 수 있게 가공 (main.js에서 애니메이션 처리)
        const position = {
            x: (Math.random() - 0.5) * 4.5,
            y: 3.5, // 3.5m 높이 공중에서 떨어짐
            z: (Math.random() - 0.5) * 4.5
        };

        const newTrash = { id: trashId, type: trashType.type, name: trashType.name, position };
        this.state.trash.push(newTrash);
        
        this.updateCleanliness();
        this.emit("trashSpawned", newTrash);
        this.emit("notification", `💨 바람에 날려 [${trashType.name}]가 마당에 떨어졌습니다!`);
        this.saveState();
    }

    // 신규 추가: 쓰레기 청소
    cleanTrash(trashId) {
        const index = this.state.trash.findIndex(t => t.id === trashId);
        if (index !== -1) {
            const removed = this.state.trash.splice(index, 1)[0];
            
            this.updateCleanliness();
            this.gainAffinityXP(4); // 청소 시 호감도 보상
            this.emit("trashCleaned", trashId);
            this.emit("notification", `🧹 [${removed.name}]을 깨끗이 주웠습니다!`);
            this.saveState();
            if (this.state.isOnline) this.saveToCloud();
            return true;
        }
        return false;
    }

    // 전체 마당 청소 (버튼 액션용)
    cleanAllDirt() {
        if (this.state.poops.length === 0 && this.state.trash.length === 0) {
            this.emit("notification", "✨ 이미 마당이 티 없이 깨끗합니다!");
            return;
        }

        // 똥 전부 청소
        while (this.state.poops.length > 0) {
            const p = this.state.poops.pop();
            this.emit("poopCleaned", p.id);
        }

        // 쓰레기 전부 청소
        while (this.state.trash.length > 0) {
            const t = this.state.trash.pop();
            this.emit("trashCleaned", t.id);
        }

        this.updateCleanliness();
        this.gainAffinityXP(6);
        this.emit("notification", "🧹 마당의 똥과 쓰레기를 전부 청소했습니다!");
        this.saveState();
        if (this.state.isOnline) this.saveToCloud();
    }

    placeItem(itemId, itemCategory, position, rotation = 0) {
        const itemsList = SHOP_ITEMS[itemCategory];
        const itemInfo = itemsList.find(i => i.id === itemId);
        
        if (!itemInfo || itemInfo.level > this.state.affinityLevel) {
            this.emit("notification", "🔒 해금 조건이 충족되지 않았습니다!");
            return false;
        }

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
        if (this.state.isOnline) this.saveToCloud();
        return true;
    }

    removePlacedItem(placedId) {
        const index = this.state.placedItems.findIndex(i => i.id === placedId);
        if (index !== -1) {
            const removed = this.state.placedItems.splice(index, 1)[0];
            this.emit("itemRemoved", placedId);
            this.saveState();
            if (this.state.isOnline) this.saveToCloud();
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
        if (this.state.isOnline) this.saveToCloud();
        return true;
    }

    resetState() {
        this.state = { ...DEFAULT_STATE, poops: [], placedItems: [], trash: [] };
        localStorage.removeItem("my_little_puppy_save");
        this.emit("stateReset", this.state);
        this.emit("notification", "🔄 저장 데이터가 초기화되었습니다.");
        this.saveState();
    }
}

export const gameState = new GameStateManager();
