// 강아지 키우기 게임 상태 관리 모듈

const DEFAULT_STATE = {
    petName: "바둑이",
    affinityLevel: 1,
    affinityXP: 0, // 0 to 100
    hunger: 100, // 0 to 100
    thirst: 100, // 0 to 100
    cleanliness: 100, // 0 to 100
    placedItems: [], // { id, type, itemId, position: {x, y, z}, rotation: y }
    poops: [], // { id, position: {x, y, z} }
    lastSaved: Date.now()
};

// 상점 아이템 데이터 정의
export const SHOP_ITEMS = {
    house: [
        { id: "house_basic", name: "종이 박스 집", desc: "가장 기본적이지만 포근한 박스 집", level: 1, emoji: "📦" },
        { id: "house_wooden", name: "클래식 개집", desc: "튼튼하고 따뜻한 원목 개집", level: 2, emoji: "🏠" },
        { id: "house_royal", name: "럭셔리 멍캐슬", desc: "궁궐 같은 왕실 강아지 집", level: 3, emoji: "🏰" }
    ],
    bowl: [
        { id: "bowl_basic", name: "플라스틱 밥그릇", desc: "가볍고 실용적인 식기", level: 1, emoji: "🥣" },
        { id: "bowl_wooden", name: "원목 스탠드 식기", desc: "관절에 좋은 높이 조절 원목 밥그릇", level: 2, emoji: "🪵" },
        { id: "bowl_royal", name: "골드 크라운 식기", desc: "금빛 왕관 모양의 고급 식기", level: 3, emoji: "👑" }
    ],
    toy: [
        { id: "toy_ball", name: "줄무늬 공", desc: "통통 튀는 재미있는 놀이 공", level: 1, emoji: "🎾" },
        { id: "toy_bone", name: "츄잉 고무 뼈다귀", desc: "이갈이에 좋은 고탄성 뼈다귀", level: 2, emoji: "🦴" },
        { id: "toy_bear", name: "수제 오리 인형", desc: "바스락 소리가 나는 귀여운 인형", level: 3, emoji: "🧸" }
    ],
    clothes: [
        { id: "clothes_collar", name: "빨간 스카프", desc: "멋쟁이들의 필수 아이템 스카프", level: 1, emoji: "🧣" },
        { id: "clothes_hat", name: "파티 모자", desc: "기분 내기 좋은 귀여운 고깔모자", level: 2, emoji: "🎉" },
        { id: "clothes_wizard", name: "마법사 모자", desc: "신비로운 분위기를 연출하는 모자", level: 3, emoji: "🧙" }
    ]
};

class GameStateManager {
    constructor() {
        this.state = { ...DEFAULT_STATE };
        this.listeners = {};
        this.loadState();
        
        // 실시간 능력치 감쇠 타이머 (1초 주기)
        this.decayInterval = setInterval(() => this.decayStats(), 1000);
    }

    // 이벤트 리스너 등록
    subscribe(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    // 이벤트 발행
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    // 로컬 스토리지에서 상태 로드
    loadState() {
        try {
            const saved = localStorage.getItem("my_little_puppy_save");
            if (saved) {
                const parsed = JSON.parse(saved);
                // 기존 데이터 구조 업데이트 보장
                this.state = { ...DEFAULT_STATE, ...parsed };
                
                // 오프라인 방치 보상/감쇠 처리
                const offlineTime = Date.now() - this.state.lastSaved;
                const secondsPassed = Math.floor(offlineTime / 1000);
                if (secondsPassed > 10) {
                    this.applyOfflineDecay(secondsPassed);
                }
            }
        } catch (e) {
            console.error("데이터 로드 실패, 초기 상태로 시작합니다:", e);
            this.state = { ...DEFAULT_STATE };
        }
    }

    // 로컬 스토리지에 상태 저장
    saveState() {
        try {
            this.state.lastSaved = Date.now();
            localStorage.setItem("my_little_puppy_save", JSON.stringify(this.state));
        } catch (e) {
            console.error("데이터 저장 실패:", e);
        }
    }

    // 오프라인 시간만큼 감쇠 및 변화 적용
    applyOfflineDecay(seconds) {
        // 배고픔/수분은 최대 80%까지만 방치 시 감쇠
        const hungerDecay = Math.min(seconds * 0.03, 80); 
        const thirstDecay = Math.min(seconds * 0.05, 80);
        
        this.state.hunger = Math.max(0, this.state.hunger - hungerDecay);
        this.state.thirst = Math.max(0, this.state.thirst - thirstDecay);

        // 방치 기간 중 일정 확률로 똥 1개 생성 (최대 3개)
        if (seconds > 3600) { // 1시간 이상 방치
            const currentPoopsCount = this.state.poops.length;
            const newPoops = Math.min(3 - currentPoopsCount, Math.floor(seconds / 28800)); // 8시간당 1개
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

    // 실시간 상태 감쇠 로직
    decayStats() {
        // 기본 1초당 소량 감쇠
        this.state.hunger = Math.max(0, this.state.hunger - 0.05); // 약 33분 완충
        this.state.thirst = Math.max(0, this.state.thirst - 0.08); // 약 20분 완충

        // 똥 개수에 비례하여 청결도 급감
        if (this.state.poops.length > 0) {
            const decay = this.state.poops.length * 0.3;
            this.state.cleanliness = Math.max(0, this.state.cleanliness - decay);
        } else {
            // 똥이 없으면 자연 회복 (씻어주기가 없으므로 똥만 잘 치워도 깨끗함 유지)
            this.state.cleanliness = Math.min(100, this.state.cleanliness + 0.1);
        }

        // 호감도 실시간 정산 (상태가 좋으면 자동 증가, 배고프거나 목마르면 제자리 또는 감소)
        const isNeglected = this.state.hunger < 20 || this.state.thirst < 20 || this.state.cleanliness < 20;
        if (!isNeglected) {
            // 기본 관리 상태 양호시 호감도 상승 (자연 증가율 낮음)
            this.gainAffinityXP(0.02);
        } else {
            // 방치 상태일 경우 호감도 하락
            this.gainAffinityXP(-0.01);
        }

        this.emit("statsChanged", this.state);
        this.saveState();
    }

    // 수치 갱신용 청결도 계산
    updateCleanliness() {
        if (this.state.poops.length > 0) {
            // 방치 시간에 따라 청결도 차감
            this.state.cleanliness = Math.max(0, 100 - (this.state.poops.length * 25));
        } else {
            this.state.cleanliness = 100;
        }
        this.emit("statsChanged", this.state);
    }

    // 호감도 XP 증가 (100 도달 시 레벨업)
    gainAffinityXP(amount) {
        this.state.affinityXP += amount;
        
        if (this.state.affinityXP >= 100) {
            if (this.state.affinityLevel < 3) {
                this.state.affinityLevel += 1;
                this.state.affinityXP = 0;
                this.emit("levelUp", this.state.affinityLevel);
                this.emit("notification", `🎉 축하합니다! 호감도 레벨 ${this.state.affinityLevel} 달성! 새로운 아이템들이 해금되었습니다!`);
            } else {
                this.state.affinityXP = 100; // 최고 레벨 캡
            }
        } else if (this.state.affinityXP < 0) {
            this.state.affinityXP = 0;
        }
        this.emit("affinityChanged", { xp: this.state.affinityXP, level: this.state.affinityLevel });
    }

    // 강아지 상호작용 액션
    pet() {
        this.gainAffinityXP(8); // 쓰다듬기 시 호감도 상승
        this.state.cleanliness = Math.max(0, this.state.cleanliness - 0.5); // 손때 묻음 방지
        this.emit("petAction", null);
        this.emit("notification", "🐶 강아지가 좋아하며 꼬리를 흔듭니다!");
        this.saveState();
    }

    feed() {
        this.state.hunger = Math.min(100, this.state.hunger + 30);
        this.gainAffinityXP(2);
        this.emit("feedAction", null);
        this.emit("notification", "🍖 강아지가 밥을 맛있게 먹습니다!");
        this.saveState();
    }

    water() {
        this.state.thirst = Math.min(100, this.state.thirst + 35);
        this.gainAffinityXP(2);
        this.emit("waterAction", null);
        this.emit("notification", "💧 강아지가 신선한 물을 꿀꺽꿀꺽 마십니다!");
        this.saveState();
    }

    // 똥 생성
    spawnPoop(pos = null) {
        const poopId = "poop_" + Math.random().toString(36).substr(2, 9);
        const position = pos || {
            x: (Math.random() - 0.5) * 5,
            y: 0.15,
            z: (Math.random() - 0.5) * 5
        };
        const newPoop = { id: poopId, position };
        this.state.poops.push(newPoop);
        this.updateCleanliness();
        this.emit("poopSpawned", newPoop);
        this.emit("notification", "💩 강아지가 실례를 했습니다! 똥을 치워주세요.");
        this.saveState();
    }

    // 똥 치우기
    cleanPoop(poopId = null) {
        if (this.state.poops.length === 0) {
            this.emit("notification", "✨ 이미 마당이 깨끗합니다!");
            return;
        }

        let cleaned = null;
        if (poopId) {
            const index = this.state.poops.findIndex(p => p.id === poopId);
            if (index !== -1) {
                cleaned = this.state.poops.splice(index, 1)[0];
            }
        } else {
            // 지정되지 않은 경우 가장 첫 번째 똥 청소
            cleaned = this.state.poops.shift();
        }

        if (cleaned) {
            this.updateCleanliness();
            this.gainAffinityXP(5); // 똥을 잘 치워주면 호감도 크게 상승
            this.emit("poopCleaned", cleaned.id);
            this.emit("notification", "🧹 똥을 깨끗하게 치웠습니다! 청결도 증가!");
        }
        this.saveState();
    }

    // 아이템 배치
    placeItem(itemId, itemCategory, position, rotation = 0) {
        // 아이템 해금 여부 체크
        const itemsList = SHOP_ITEMS[itemCategory];
        const itemInfo = itemsList.find(i => i.id === itemId);
        
        if (!itemInfo || itemInfo.level > this.state.affinityLevel) {
            this.emit("notification", "🔒 아직 해금되지 않은 아이템입니다!");
            return false;
        }

        // 기존 배치된 동일 카테고리 아이템 제거 (집, 밥그릇은 1개씩만 배치 가능하도록 제한)
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
        this.emit("notification", `🎁 ${itemInfo.name} 설치 완료!`);
        this.saveState();
        return true;
    }

    // 배치된 아이템 삭제
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

    // 옷 입히기 기능 (옷 아이템은 강아지에게 바로 착용)
    equipClothes(itemId) {
        const itemInfo = SHOP_ITEMS.clothes.find(i => i.id === itemId);
        if (!itemInfo || itemInfo.level > this.state.affinityLevel) {
            this.emit("notification", "🔒 아직 해금되지 않은 옷입니다!");
            return false;
        }

        this.state.equippedClothes = itemId;
        this.emit("clothesEquipped", itemId);
        this.emit("notification", `👔 ${itemInfo.name} 착용!`);
        this.saveState();
        return true;
    }

    // 치트 코드
    cheatAddXP(amount) {
        this.gainAffinityXP(amount);
        this.saveState();
    }

    resetState() {
        this.state = { ...DEFAULT_STATE, poops: [], placedItems: [] };
        localStorage.removeItem("my_little_puppy_save");
        this.emit("stateReset", this.state);
        this.emit("notification", "🔄 모든 데이터가 성공적으로 초기화되었습니다.");
        this.saveState();
    }
}

export const gameState = new GameStateManager();
