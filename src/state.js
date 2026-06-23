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

    // 하루 산책 카운터
    lastWalkDate: "",
    dailyWalkCount: 0,

    // 하루 씻기기 카운터 (호감도 상승 제한용)
    lastWashDate: "",
    dailyWashCount: 0,

    // 위기/날씨 내부 타이머 (초 단위)
    harshWeatherExposure: 0, // 가혹 날씨 연속 노출 시간
    zeroVitalTimer: 0,       // 포만감/수분 0 지속 시간
    zeroCleanTimer: 0,       // 청결도 0 지속 시간

    // 날씨 상태
    currentWeather: "clear",

    // 신규 추가: 커스터마이징 데이터
    furColor: "#ffcc80",
    earType: "floppy",

    // 신규 추가: 동물 종류
    species: "dog",
    // 신규 추가: 마당 쓰레기 리스트
    trash: [],

    // 계정 정보
    username: null,
    isOnline: false
};

export const SHOP_ITEMS = {
    dog: {
        house: [
            { id: "house_basic", name: "종이 박스 집", desc: "기본적이고 빈티지한 골판지 집", level: 1, emoji: "📦" },
            { id: "house_wooden", name: "클래식 개집", desc: "튼튼하고 아늑한 원목 개집", level: 2, emoji: "🏠" },
            { id: "house_cushion", name: "솜사탕 마시멜로 방석", desc: "구름 위에 누운 듯한 극강의 푹신함", level: 3, emoji: "🛏️" },
            { id: "house_tent", name: "인디언 티피 텐트", desc: "캠핑 감성이 낭만적인 꼬마 텐트", level: 4, emoji: "⛺" },
            { id: "house_royal", name: "럭셔리 멍캐슬", desc: "궁궐 같은 고품격 대리석 성채", level: 5, emoji: "🏰" },
            { id: "house_rocket", name: "우주선 하우스", desc: "은하수로 출발! 강아지 우주 비행선", level: 6, emoji: "🚀" },
            { id: "house_melon", name: "수박 하우스", desc: "시원한 수박 속을 파낸 여름 별장", level: 7, emoji: "🍉" },
            { id: "house_mushroom", name: "버섯 요정 집", desc: "동화 속 빨간 버섯 모양 오두막", level: 8, emoji: "🍄" },
            { id: "house_dino", name: "공룡뼈 동굴", desc: "용맹한 멍멍이를 위한 화석 동굴", level: 9, emoji: "🦴" },
            { id: "house_rainbow", name: "무지개 구름 집", desc: "둥실둥실 무지개 위 솜구름 집", level: 10, emoji: "🌈" }
        ],
        bowl: [
            { id: "bowl_basic", name: "플라스틱 밥그릇", desc: "가볍고 알록달록한 플라스틱 식기", level: 1, emoji: "🥣" },
            { id: "bowl_wooden", name: "원목 스탠드 식기", desc: "관절 건강을 지키는 2구 스탠드 식기", level: 2, emoji: "🪵" },
            { id: "bowl_stone", name: "화강암 식기", desc: "쉽게 밀리지 않는 묵직한 돌그릇", level: 3, emoji: "🪨" },
            { id: "bowl_ceramic", name: "무광 도자기 그릇", desc: "도예가가 직접 빚은 친환경 그릇", level: 4, emoji: "🍽️" },
            { id: "bowl_royal", name: "골드 크라운 식기", desc: "금빛 왕관 모양의 최고급 황금 그릇", level: 5, emoji: "👑" },
            { id: "bowl_robot", name: "자동 급식 로봇", desc: "시간 맞춰 사료를 주는 똑똑한 로봇", level: 6, emoji: "🤖" },
            { id: "bowl_icecream", name: "아이스크림 그릇", desc: "콘 모양의 시원한 디저트 식기", level: 7, emoji: "🍦" },
            { id: "bowl_ufo", name: "UFO 식기", desc: "둥둥 떠다니는 외계 비행접시 그릇", level: 8, emoji: "🛸" },
            { id: "bowl_taco", name: "타코 그릇", desc: "바삭한 타코 모양의 재미난 식기", level: 9, emoji: "🌮" },
            { id: "bowl_vending", name: "간식 자판기", desc: "버튼 누르면 간식이 나오는 자판기", level: 10, emoji: "🎰" }
        ],
        toy: [
            { id: "toy_ball", name: "줄무늬 공", desc: "굴리며 놀기 딱 좋은 말랑말랑한 공", level: 1, emoji: "🎾" },
            { id: "toy_bone", name: "고무 뼈다귀", desc: "치석 제거에 도움을 주는 질긴 장난감", level: 2, emoji: "🦴" },
            { id: "toy_duck", name: "삑삑이 러버덕", desc: "누르면 삑삑 소리가 나는 노란 오리 인형", level: 3, emoji: "🐤" },
            { id: "toy_disc", name: "소프트 원반(프리스비)", desc: "바람을 타고 날아가는 가벼운 원반", level: 4, emoji: "🥏" },
            { id: "toy_bear", name: "핸드메이드 곰인형", desc: "포근하고 정교한 오가닉 코튼 인형", level: 5, emoji: "🧸" },
            { id: "toy_skate", name: "강아지 스케이트보드", desc: "네 발로 타는 묘기용 보드", level: 6, emoji: "🛹" },
            { id: "toy_kite", name: "강아지 연", desc: "바람 타고 하늘로! 알록달록 연", level: 7, emoji: "🪁" },
            { id: "toy_puzzle", name: "노즈워크 퍼즐", desc: "코로 풀어 간식을 찾는 두뇌 퍼즐", level: 8, emoji: "🧩" },
            { id: "toy_gamepad", name: "게임패드 인형", desc: "삑삑 소리나는 말랑 게임기 장난감", level: 9, emoji: "🎮" },
            { id: "toy_yoyo", name: "요요", desc: "위아래로 또르르 신기한 요요", level: 10, emoji: "🪀" }
        ],
        clothes: [
            { id: "clothes_collar", name: "빨간 스카프", desc: "목에 둘러 멋을 내는 패셔너블 스카프", level: 1, emoji: "🧣" },
            { id: "clothes_hat", name: "생일 파티 고깔모자", desc: "생일 기분을 낼 수 있는 귀여운 모자", level: 2, emoji: "🎉" },
            { id: "clothes_shirt", name: "초록 스트라이프 티셔츠", desc: "피부가 예민한 강아지용 면 티셔츠", level: 3, emoji: "👕" },
            { id: "clothes_glasses", name: "선글라스", desc: "눈이 부실 때 쓰는 힙스터용 선글라스", level: 4, emoji: "🕶️" },
            { id: "clothes_wizard", name: "별빛 마법사 모자", desc: "신비롭고 몽환적인 꼬깔모자", level: 5, emoji: "🧙" },
            { id: "clothes_crown", name: "황금 왕관", desc: "이 구역의 왕! 반짝이는 황금 왕관", level: 6, emoji: "👑" },
            { id: "clothes_headphone", name: "헤드폰", desc: "음악을 즐기는 멋쟁이 강아지용", level: 7, emoji: "🎧" },
            { id: "clothes_wings", name: "요정 날개", desc: "팔랑팔랑 등에 다는 반짝 날개", level: 8, emoji: "🦋" },
            { id: "clothes_collar_winter", name: "겨울 목도리", desc: "포근하고 도톰한 니트 목도리", level: 9, emoji: "🧣" },
            { id: "clothes_hat_magic", name: "마술사 모자", desc: "토끼가 나올 것 같은 검은 실크해트", level: 10, emoji: "🎩" }
        ]
    },
    cat: {
        house: [
            { id: "house_basic", name: "종이 박스 집", desc: "고양이가 제일 좋아하는 종이 박스", level: 1, emoji: "📦" },
            { id: "house_cushion", name: "마약 쿠션", desc: "한번 누우면 일어날 수 없는 푹신함", level: 2, emoji: "🛏️" },
            { id: "house_tower", name: "미니 캣타워", desc: "오르락 내리락 즐거운 캣타워", level: 3, emoji: "🗼" },
            { id: "house_tent", name: "인디언 티피 텐트", desc: "숨기 좋아하는 고양이를 위한 텐트", level: 4, emoji: "⛺" },
            { id: "house_royal", name: "대형 프리미엄 캣타워", desc: "창밖 구경하기 좋은 대리석 캣타워", level: 5, emoji: "🏰" },
            { id: "house_rocket", name: "우주 캡슐 캣하우스", desc: "동그란 창으로 우주를 보는 캡슐", level: 6, emoji: "🚀" },
            { id: "house_giftbox", name: "선물상자 숨숨집", desc: "리본 묶인 상자 속 비밀 아지트", level: 7, emoji: "🎁" },
            { id: "house_cake", name: "케이크 타워", desc: "달콤한 3단 케이크 모양 놀이집", level: 8, emoji: "🍰" },
            { id: "house_igloo", name: "이글루", desc: "시원한 얼음집에서 쿨하게 낮잠", level: 9, emoji: "🛖" },
            { id: "house_moon", name: "달 위의 집", desc: "초승달에 걸터앉은 몽환적인 집", level: 10, emoji: "🌙" }
        ],
        bowl: [
            { id: "bowl_basic", name: "플라스틱 밥그릇", desc: "가볍고 알록달록한 플라스틱 식기", level: 1, emoji: "🥣" },
            { id: "bowl_water", name: "분수형 물그릇", desc: "흐르는 물을 좋아하는 고양이를 위해", level: 2, emoji: "⛲" },
            { id: "bowl_glass", name: "투명 유리 식기", desc: "수염이 닿지 않는 넓은 유리 그릇", level: 3, emoji: "🥃" },
            { id: "bowl_ceramic", name: "무광 도자기 그릇", desc: "턱드름 방지를 위한 친환경 그릇", level: 4, emoji: "🍽️" },
            { id: "bowl_royal", name: "골드 크라운 식기", desc: "금빛 왕관 모양의 최고급 황금 그릇", level: 5, emoji: "👑" },
            { id: "bowl_fish", name: "물고기 모양 그릇", desc: "고양이가 사랑하는 생선 모양 식기", level: 6, emoji: "🐟" },
            { id: "bowl_sushi", name: "초밥 접시", desc: "회전초밥처럼 즐기는 고급 식기", level: 7, emoji: "🍣" },
            { id: "bowl_ufo", name: "UFO 식기", desc: "둥둥 떠다니는 외계 비행접시 그릇", level: 8, emoji: "🛸" },
            { id: "bowl_milk", name: "우유 바", desc: "신선한 우유가 콸콸 나오는 바", level: 9, emoji: "🥛" },
            { id: "bowl_vending", name: "간식 자판기", desc: "버튼 누르면 간식이 나오는 자판기", level: 10, emoji: "🎰" }
        ],
        toy: [
            { id: "toy_ball", name: "털실 뭉치", desc: "데굴데굴 굴리기 좋은 털실", level: 1, emoji: "🧶" },
            { id: "toy_mouse", name: "생쥐 장난감", desc: "사냥 본능을 깨우는 태엽 쥐", level: 2, emoji: "🐭" },
            { id: "toy_feather", name: "깃털 낚시대", desc: "팔랑팔랑 시선을 사로잡는 깃털", level: 3, emoji: "🪶" },
            { id: "toy_laser", name: "레이저 포인터", desc: "벽을 타고 날아다니는 붉은 점", level: 4, emoji: "🔦" },
            { id: "toy_box", name: "캣닢 인형", desc: "안고 뒷발팡팡하기 좋은 마약 인형", level: 5, emoji: "🐟" },
            { id: "toy_featherbot", name: "자동 깃털 로봇", desc: "스스로 팔랑이며 약 올리는 깃털", level: 6, emoji: "🪶" },
            { id: "toy_snake", name: "꿈틀 뱀 인형", desc: "사르르 움직여 사냥 본능 자극", level: 7, emoji: "🐍" },
            { id: "toy_yarnbig", name: "거대 털실 공", desc: "몸통만 한 초대형 털실 뭉치", level: 8, emoji: "🧶" },
            { id: "toy_carp", name: "잉어 깃발", desc: "바람에 펄럭이는 큼직한 잉어", level: 9, emoji: "🎏" },
            { id: "toy_lasermaze", name: "레이저 미로", desc: "벽을 누비는 붉은 점들의 미로", level: 10, emoji: "🕹️" }
        ],
        clothes: [
            { id: "clothes_collar", name: "방울 목걸이", desc: "딸랑딸랑 귀여운 리본 방울", level: 1, emoji: "🎀" },
            { id: "clothes_hat", name: "생일 파티 고깔모자", desc: "생일 기분을 낼 수 있는 모자", level: 2, emoji: "🎉" },
            { id: "clothes_cape", name: "슈퍼 영웅 망토", desc: "날렵한 고양이를 위한 멋진 망토", level: 3, emoji: "🦸" },
            { id: "clothes_glasses", name: "선글라스", desc: "눈이 부실 때 쓰는 힙스터용 선글라스", level: 4, emoji: "🕶️" },
            { id: "clothes_wizard", name: "별빛 마법사 모자", desc: "신비롭고 몽환적인 꼬깔모자", level: 5, emoji: "🧙" },
            { id: "clothes_crown", name: "공주 왕관", desc: "기품 넘치는 보석 박힌 왕관", level: 6, emoji: "👑" },
            { id: "clothes_headphone", name: "헤드폰", desc: "도도하게 음악 감상하는 헤드폰", level: 7, emoji: "🎧" },
            { id: "clothes_wings", name: "나비 날개", desc: "우아하게 팔랑이는 나비 날개", level: 8, emoji: "🦋" },
            { id: "clothes_ribbon_big", name: "큰 리본", desc: "머리에 다는 화려한 대형 리본", level: 9, emoji: "🎀" },
            { id: "clothes_wizard_robe", name: "마법사 로브", desc: "별이 수놓인 신비한 마법 망토", level: 10, emoji: "🧙" }
        ]
    },
    hamster: {
        house: [
            { id: "house_basic", name: "종이 베딩 집", desc: "따뜻하게 파고들 수 있는 베딩", level: 1, emoji: "📦" },
            { id: "house_coconut", name: "코코넛 은신처", desc: "아늑한 자연 친화적 코코넛 통", level: 2, emoji: "🥥" },
            { id: "house_wood", name: "원목 미로 집", desc: "탐험하기 좋은 복잡한 나무 집", level: 3, emoji: "🪵" },
            { id: "house_ceramic", name: "도자기 이글루", desc: "여름엔 시원하고 겨울엔 따뜻한 이글루", level: 4, emoji: "❄️" },
            { id: "house_royal", name: "해바라기 캐슬", desc: "거대한 2층짜리 햄스터 저택", level: 5, emoji: "🏰" },
            { id: "house_acorn", name: "도토리 저택", desc: "통통한 도토리 속을 파낸 아늑한 집", level: 6, emoji: "🌰" },
            { id: "house_cheese", name: "치즈 하우스", desc: "구멍 송송 노란 치즈 모양 집", level: 7, emoji: "🧀" },
            { id: "house_train", name: "기차 하우스", desc: "칙칙폭폭 달리는 꼬마 기차 집", level: 8, emoji: "🚂" },
            { id: "house_donut", name: "도넛 튜브 집", desc: "데굴데굴 달콤한 도넛 터널", level: 9, emoji: "🍩" },
            { id: "house_sunpalace", name: "해바라기 왕궁", desc: "해바라기씨로 지은 황금빛 궁전", level: 10, emoji: "🌻" }
        ],
        bowl: [
            { id: "bowl_basic", name: "작은 플라스틱 그릇", desc: "앙증맞은 미니 식기", level: 1, emoji: "🥣" },
            { id: "bowl_water", name: "급수기", desc: "구슬을 핥으면 물이 나오는 급수기", level: 2, emoji: "💧" },
            { id: "bowl_wood", name: "나무 그릇", desc: "갉아도 안전한 자연 나무 그릇", level: 3, emoji: "🪵" },
            { id: "bowl_ceramic", name: "도자기 조개 그릇", desc: "뒤집히지 않는 묵직한 도자기", level: 4, emoji: "🐚" },
            { id: "bowl_royal", name: "해바라기씨 금잔", desc: "해바라기씨가 가득 담긴 금잔", level: 5, emoji: "🌻" },
            { id: "bowl_acorn", name: "도토리 그릇", desc: "도토리 깍지로 만든 앙증맞은 그릇", level: 6, emoji: "🌰" },
            { id: "bowl_berry", name: "딸기 접시", desc: "새콤달콤 딸기 모양 미니 접시", level: 7, emoji: "🍓" },
            { id: "bowl_peanut", name: "땅콩 그릇", desc: "고소한 땅콩 껍질 모양 식기", level: 8, emoji: "🥜" },
            { id: "bowl_cheese", name: "치즈 조각 그릇", desc: "삼각 치즈 모양의 노란 그릇", level: 9, emoji: "🧀" },
            { id: "bowl_seedvend", name: "씨앗 자판기", desc: "버튼 누르면 씨앗이 쏟아지는 기계", level: 10, emoji: "🎰" }
        ],
        toy: [
            { id: "toy_tube", name: "휴지심", desc: "들어갔다 나왔다 재밌는 터널", level: 1, emoji: "🧻" },
            { id: "toy_wheel", name: "플라스틱 쳇바퀴", desc: "밤새도록 달릴 수 있는 무소음 쳇바퀴", level: 2, emoji: "🎡" },
            { id: "toy_wood", name: "사과나무 가지", desc: "이갈이에 완벽한 사과나무 막대기", level: 3, emoji: "🪵" },
            { id: "toy_ball", name: "투명 볼", desc: "안에 들어가서 거실을 굴러다니는 공", level: 4, emoji: "🔮" },
            { id: "toy_park", name: "미니 정글짐", desc: "오르락내리락 햄스터 전용 놀이터", level: 5, emoji: "🎢" },
            { id: "toy_ferris", name: "대관람차 쳇바퀴", desc: "빙글빙글 신나는 관람차형 쳇바퀴", level: 6, emoji: "🎡" },
            { id: "toy_car", name: "햄스터 자동차", desc: "굴려서 부릉부릉 타는 꼬마 자동차", level: 7, emoji: "🚗" },
            { id: "toy_ladder", name: "사다리 정글짐", desc: "타고 오르는 나무 사다리 놀이대", level: 8, emoji: "🪜" },
            { id: "toy_roller", name: "롤러스케이트", desc: "또르르 미끄러지는 미니 스케이트", level: 9, emoji: "🛼" },
            { id: "toy_coaster", name: "미니 롤러코스터", desc: "오르락내리락 스릴 만점 코스터", level: 10, emoji: "🎢" }
        ],
        clothes: [
            { id: "clothes_ribbon", name: "미니 리본 핀", desc: "귀 옆에 꽂는 앙증맞은 리본", level: 1, emoji: "🎀" },
            { id: "clothes_hat", name: "도토리 모자", desc: "도토리 뚜껑으로 만든 자연 모자", level: 2, emoji: "🌰" },
            { id: "clothes_cape", name: "망토", desc: "작은 영웅을 위한 미니 망토", level: 3, emoji: "🦸" },
            { id: "clothes_glasses", name: "미니 안경", desc: "똑똑해 보이는 동그란 안경", level: 4, emoji: "👓" },
            { id: "clothes_flower", name: "꽃 화관", desc: "봄맞이 예쁜 꽃으로 엮은 화관", level: 5, emoji: "🌸" },
            { id: "clothes_crown", name: "미니 왕관", desc: "꼬마 임금님을 위한 반짝 왕관", level: 6, emoji: "👑" },
            { id: "clothes_headphone", name: "미니 헤드폰", desc: "쪼꼬미 귀에 쏙 들어가는 헤드폰", level: 7, emoji: "🎧" },
            { id: "clothes_wings", name: "꼬마 날개", desc: "포동포동 등에 단 깜찍 날개", level: 8, emoji: "🦋" },
            { id: "clothes_hat_sun", name: "해바라기 모자", desc: "햇살처럼 활짝 핀 해바라기 모자", level: 9, emoji: "🌻" },
            { id: "clothes_hat_berry", name: "딸기 모자", desc: "새빨간 딸기 꼭지 모양 모자", level: 10, emoji: "🍓" }
        ]
    }
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
            const response = await fetch("/api/save", {
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
        const isNeglected = this.state.hunger < 50 || this.state.thirst < 50 || this.state.cleanliness < 50;
        
        // 날씨에 따른 수치 급감 로직 (집에서 쉬는 중이면 면역)
        if (!this.state.isResting) {
            if (this.state.currentWeather === "heatwave") {
                this.state.thirst = Math.max(0, this.state.thirst - 0.2);
            } else if (this.state.currentWeather === "wind") {
                this.state.hunger = Math.max(0, this.state.hunger - 0.2);
            } else if (this.state.currentWeather === "rain") {
                this.state.cleanliness = Math.max(0, this.state.cleanliness - 0.3);
            }
        }

        if (!isNeglected) {
            this.gainAffinityXP(0.015);
        } else {
            this.gainAffinityXP(-0.1); // 방치 상태면 지속 하락
        }

        // === [4] 가혹 날씨(비/폭염/강풍)에 계속 노출되면 호감도가 가속하며 하락 ===
        //  - 기본 하락 0.1%/초, 노출 10초마다 하락 속도 +5% 가속 (1.0→1.05→1.10…)
        //  - 맑음으로 바뀌거나 집에서 쉬면 가속도 초기화
        const isHarshWeather = this.state.currentWeather !== "clear";
        if (isHarshWeather && !this.state.isResting) {
            this.state.harshWeatherExposure = (this.state.harshWeatherExposure || 0) + 1;
            const accelSteps = Math.floor(this.state.harshWeatherExposure / 10);
            const multiplier = 1 + 0.05 * accelSteps;
            this.gainAffinityXP(-0.1 * multiplier);
        } else {
            this.state.harshWeatherExposure = 0;
        }

        // === [5] 능력치 0 위기 이벤트 ===
        // 포만감 또는 수분이 0인 채 10초가 지나면 전체 초기화(처음부터 다시)
        if (this.state.hunger <= 0 || this.state.thirst <= 0) {
            this.state.zeroVitalTimer = (this.state.zeroVitalTimer || 0) + 1;
            if (this.state.zeroVitalTimer >= 10) {
                this.emit("notification", "💀 너무 오래 굶주리고 목말라 펫이 쓰러졌습니다... 처음부터 다시 키웁니다.");
                this.hardResetProgress();
                return; // 초기화 후 이번 tick 종료
            } else {
                this.emit("criticalWarning", {
                    type: "vital",
                    remain: 10 - this.state.zeroVitalTimer,
                    message: (this.state.hunger <= 0 ? "포만감" : "수분") + "이 0입니다! 밥과 물을 주세요"
                });
            }
        } else if (this.state.zeroVitalTimer > 0) {
            this.state.zeroVitalTimer = 0;
            this.emit("criticalWarningClear", { type: "vital" });
        }

        // 청결도가 0인 채 10초가 지날 때마다 호감도 진행도 -30%p (반복). 배치 물건은 유지되나 레벨이 내려가 해금이 다시 잠김
        if (this.state.cleanliness <= 0) {
            this.state.zeroCleanTimer = (this.state.zeroCleanTimer || 0) + 1;
            if (this.state.zeroCleanTimer >= 10) {
                this.state.zeroCleanTimer = 0; // 다시 10초 카운트 → 10초마다 반복 적용
                this.gainAffinityXP(-30);
                this.emit("notification", "🦠 너무 더러워 펫이 아파합니다! 호감도가 크게 떨어졌어요. 씻기고 청소해주세요!");
                this.emit("criticalWarningClear", { type: "clean" });
            } else {
                this.emit("criticalWarning", {
                    type: "clean",
                    remain: 10 - this.state.zeroCleanTimer,
                    message: "청결도가 0입니다! 씻기고 청소하세요"
                });
            }
        } else if (this.state.zeroCleanTimer > 0) {
            this.state.zeroCleanTimer = 0;
            this.emit("criticalWarningClear", { type: "clean" });
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
            if (this.state.affinityLevel < 10) {
                this.state.affinityLevel += 1;
                this.state.affinityXP = 0;
                this.emit("levelUp", this.state.affinityLevel);
                this.emit("notification", `🎉 축하합니다! 호감도 레벨 ${this.state.affinityLevel} 달성!`);
                if (this.state.isOnline) this.saveToCloud();
            } else {
                this.state.affinityXP = 100;
            }
        } else if (this.state.affinityXP < 0) {
            if (this.state.affinityLevel > 1) {
                this.state.affinityLevel -= 1;
                this.state.affinityXP = 80; // 레벨 다운 시 XP 일부 복구
                this.emit("levelDown", this.state.affinityLevel);
                this.emit("notification", `💔 펫이 힘들어합니다. 호감도 레벨이 ${this.state.affinityLevel}로 떨어졌습니다.`);
                if (this.state.isOnline) this.saveToCloud();
            } else {
                this.state.affinityXP = 0;
            }
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
        const today = new Date().toISOString().split('T')[0];
        
        if (this.state.lastWalkDate !== today) {
            this.state.lastWalkDate = today;
            this.state.dailyWalkCount = 0;
        }

        if (this.state.dailyWalkCount >= 3) {
            this.emit("notification", "🦮 오늘은 이미 충분히 산책했습니다. 내일 다시 산책해주세요! (하루 3회 제한)");
            return false;
        }

        const isExhausted = this.state.hunger < 15 || this.state.thirst < 20;
        if (isExhausted) {
            this.emit("notification", "⚠️ 피곤해합니다. 밥과 물을 먼저 챙겨주세요!");
            return false;
        }

        this.state.hunger = Math.max(0, this.state.hunger - 15);
        this.state.thirst = Math.max(0, this.state.thirst - 20);
        this.state.dailyWalkCount += 1;
        this.gainAffinityXP(15); 

        this.emit("walkAction", null);
        this.emit("notification", `🦮 마당을 한바퀴 산책하며 뛰어놀았습니다! (${this.state.dailyWalkCount}/3)`);
        this.saveState();
        if (this.state.isOnline) this.saveToCloud();
        return true;
    }

    // 씻기기 (청결도 100 회복은 항상, 호감도 상승은 하루 3회 제한)
    wash() {
        const today = new Date().toISOString().split('T')[0];

        if (this.state.lastWashDate !== today) {
            this.state.lastWashDate = today;
            this.state.dailyWashCount = 0;
        }

        // 청결도는 씻기면 항상 회복
        this.state.cleanliness = 100;

        let gainedXP = false;
        if (this.state.dailyWashCount < 3) {
            this.state.dailyWashCount += 1;
            this.gainAffinityXP(2.0);
            gainedXP = true;
            this.emit("notification", `🧼 뽀득뽀득! 깨끗하게 씻겼습니다. 호감도가 올라요! (${this.state.dailyWashCount}/3)`);
        } else {
            this.emit("notification", "🧼 깨끗하게 씻겼습니다! (오늘 씻기기 호감도는 이미 다 채웠어요, 최대 3회)");
        }

        this.emit("statsChanged", this.state);
        this.saveState();
        if (this.state.isOnline) this.saveToCloud();
        return gainedXP;
    }

    // 위기 상황(굶주림/탈수)으로 인한 전체 초기화: 펫 정체성(종족/이름/외형/계정)은 유지하고 진행 상황만 처음 가입 상태로
    hardResetProgress() {
        const keep = {
            species: this.state.species,
            petName: this.state.petName,
            furColor: this.state.furColor,
            earType: this.state.earType,
            username: this.state.username,
            isOnline: this.state.isOnline,
            currentWeather: this.state.currentWeather
        };
        this.state = {
            ...DEFAULT_STATE,
            ...keep,
            lastSaved: Date.now()
        };
        this.emit("hardReset", this.state);
        this.emit("statsChanged", this.state);
        this.emit("affinityChanged", { xp: this.state.affinityXP, level: this.state.affinityLevel });
        this.saveState();
        if (this.state.isOnline) this.saveToCloud();
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
        const speciesObj = SHOP_ITEMS[this.state.species] || SHOP_ITEMS.dog;
        const itemsList = speciesObj[itemCategory];
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
        const speciesObj = SHOP_ITEMS[this.state.species] || SHOP_ITEMS.dog;
        const itemInfo = speciesObj.clothes.find(i => i.id === itemId);
        if (!itemInfo || itemInfo.level > this.state.affinityLevel) {
            this.emit("notification", "🔒 해금 조건이 충족되지 않았습니다!");
            return false;
        }

        if (!Array.isArray(this.state.equippedClothes)) {
            this.state.equippedClothes = [];
        }

        const index = this.state.equippedClothes.indexOf(itemId);
        if (index !== -1) {
            this.state.equippedClothes.splice(index, 1);
            this.emit("clothesEquipped", this.state.equippedClothes);
            this.emit("notification", `👔 [${itemInfo.name}]을(를) 벗었습니다.`);
        } else {
            this.state.equippedClothes.push(itemId);
            this.emit("clothesEquipped", this.state.equippedClothes);
            this.emit("notification", `👔 [${itemInfo.name}]을(를) 착용했습니다!`);
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
