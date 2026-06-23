import * as THREE from 'three';

// 똥 (Poop) 3D 모델 생성 함수 (부드러운 클레이 스타일)
export function createPoopMesh() {
    const group = new THREE.Group();
    // 무광 클레이 브라운 질감
    const poopMaterial = new THREE.MeshStandardMaterial({ color: 0x815345, roughness: 0.95, metalness: 0.0 });

    // 동글동글한 구체 3단을 얹어 부드러운 똥 표현
    const layer1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), poopMaterial);
    layer1.position.y = 0.08;
    layer1.scale.y = 0.6; // 넙적하게 누름
    layer1.castShadow = true;
    group.add(layer1);

    const layer2 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), poopMaterial);
    layer2.position.y = 0.17;
    layer2.scale.y = 0.6;
    layer2.castShadow = true;
    group.add(layer2);

    const layer3 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.1, 8), poopMaterial);
    layer3.position.y = 0.23;
    layer3.castShadow = true;
    group.add(layer3);

    return group;
}

// 상점 아이템 3D 모델 생성기 (5단계 해금 아이템 포함, 솜사탕/점토 테마)
export function createItemMesh(itemId) {
    const group = new THREE.Group();
    
    // 매트한 솜사탕 컬러 팔레트 정의
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xc18c5d, roughness: 0.95 }); // 부드러운 브라운
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf5b7b1, roughness: 0.95 }); // 딸기 솜사탕 핑크
    const fabricMat = new THREE.MeshStandardMaterial({ color: 0xaed6f1, roughness: 0.95 }); // 소다색
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf9e79f, roughness: 0.95 }); // 바나나 옐로우
    const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xfdfefe, roughness: 0.8 }); // 뽀얀 우유빛
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.98 }); // 자갈 회색
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.5, metalness: 0.7 }); // 로열 골드

    // 1. 강아지 집 카테고리 (house)
    if (itemId === "house_basic") {
        // 종이 박스 집 (박스 조각 조립)
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xe5c290, roughness: 0.98 });
        
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 1.0), boxMat);
        base.position.y = 0.02;
        group.add(base);

        const wL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.9), boxMat);
        wL.position.set(-0.47, 0.35, 0);
        wL.castShadow = true;
        group.add(wL);

        const wR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.9), boxMat);
        wR.position.set(0.47, 0.35, 0);
        wR.castShadow = true;
        group.add(wR);

        const wB = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.05), boxMat);
        wB.position.set(0, 0.35, -0.47);
        wB.castShadow = true;
        group.add(wB);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.04, 1.04), boxMat);
        roof.position.set(0, 0.7, 0);
        roof.castShadow = true;
        group.add(roof);
    } 
    else if (itemId === "house_wooden") {
        // 클래식 원목 개집 (모서리가 부드러운 지붕 적용)
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 1.1), woodMat);
        base.position.y = 0.03;
        group.add(base);

        // 부드러운 벽면 조립
        const wL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.9), woodMat);
        wL.position.set(-0.45, 0.38, 0);
        wL.castShadow = true;
        group.add(wL);

        const wR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.9), woodMat);
        wR.position.set(0.45, 0.38, 0);
        wR.castShadow = true;
        group.add(wR);

        const wB = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.7, 0.06), woodMat);
        wB.position.set(0, 0.38, -0.42);
        wB.castShadow = true;
        group.add(wB);

        // 지붕판 (경사진 둥근 캡슐/상자 조립)
        const roofL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 1.1), roofMat);
        roofL.position.set(-0.3, 0.88, 0);
        roofL.rotation.z = -0.65;
        roofL.castShadow = true;
        group.add(roofL);

        const roofR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 1.1), roofMat);
        roofR.position.set(0.3, 0.88, 0);
        roofR.rotation.z = 0.65;
        roofR.castShadow = true;
        group.add(roofR);
    } 
    else if (itemId === "house_cushion") {
        // [Level 3] 솜사탕 마시멜로 방석
        const cushionMat = new THREE.MeshStandardMaterial({ color: 0xfadbd8, roughness: 0.95 }); // 솜사탕 핑크
        const trimMat = new THREE.MeshStandardMaterial({ color: 0xebdef0, roughness: 0.95 }); // 솜사탕 보라

        // 방석 도넛 테두리 (Torus)
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.12, 12, 24), cushionMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.12;
        ring.castShadow = true;
        group.add(ring);

        // 방석 바닥 쿠션 (납작 구체)
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), trimMat);
        center.scale.y = 0.25;
        center.position.y = 0.08;
        center.castShadow = true;
        group.add(center);
    } 
    else if (itemId === "house_tent") {
        // [Level 4] 인디언 티피 텐트 (동글동글 삼각 꼬깔 모양)
        const clothMat = new THREE.MeshStandardMaterial({ color: 0xfaf9f6, roughness: 0.95 }); // 오프화이트 광택없음
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.9 });
        
        // 텐트 바닥패드
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.06, 12), woodMat);
        pad.position.y = 0.03;
        group.add(pad);

        // 피라미드/원뿔 천막 구조
        const tent = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.9, 5, 1, true), clothMat);
        tent.position.y = 0.48;
        tent.castShadow = true;
        group.add(tent);

        // 꼭대기로 삐져나온 텐트 지지대 뼈대 나무 5개
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 4), poleMat);
            pole.position.set(Math.cos(angle) * 0.12, 0.5, Math.sin(angle) * 0.12);
            pole.rotation.x = -Math.sin(angle) * 0.35;
            pole.rotation.z = Math.cos(angle) * 0.35;
            group.add(pole);
        }
    } 
    else if (itemId === "house_royal") {
        // [Level 5] 럭셔리 멍캐슬 (귀여운 토이 캐슬 형태로 둥글게 가공)
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.3), ceramicMat);
        base.position.y = 0.04;
        group.add(base);

        // 성벽 바디 (모서리가 깎인 실린더 구조물)
        const towerGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.9, 12);
        const towerL = new THREE.Mesh(towerGeo, ceramicMat);
        towerL.position.set(-0.48, 0.49, 0.2);
        towerL.castShadow = true;
        group.add(towerL);

        const towerR = new THREE.Mesh(towerGeo, ceramicMat);
        towerR.position.set(0.48, 0.49, 0.2);
        towerR.castShadow = true;
        group.add(towerR);

        // 뾰족 지붕 (파스텔 블루 콘)
        const coneGeo = new THREE.ConeGeometry(0.24, 0.35, 12);
        const coneL = new THREE.Mesh(coneGeo, fabricMat);
        coneL.position.y = 0.6;
        towerL.add(coneL);

        const coneR = new THREE.Mesh(coneGeo, fabricMat);
        coneR.position.y = 0.6;
        towerR.add(coneR);

        // 중앙 아치 통로 가벽
        const gate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), ceramicMat);
        gate.position.set(0, 0.44, -0.45);
        gate.castShadow = true;
        group.add(gate);

        const topCrest = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), goldMat);
        topCrest.position.set(0, 0.9, -0.45);
        group.add(topCrest);
    }

    // 2. 밥그릇 카테고리 (bowl)
    else if (itemId === "bowl_basic") {
        // 플라스틱 밥그릇
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.1, 16), fabricMat);
        bowl.position.y = 0.05;
        bowl.castShadow = true;
        group.add(bowl);

        // 사료용 작은 갈색 구체들
        const food = new THREE.Group();
        const kibbleMat = new THREE.MeshStandardMaterial({ color: 0x7e5109, roughness: 0.9 });
        for (let i = 0; i < 7; i++) {
            const kibble = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), kibbleMat);
            kibble.position.set(
                (Math.random() - 0.5) * 0.2,
                0.07,
                (Math.random() - 0.5) * 0.2
            );
            food.add(kibble);
        }
        group.add(food);
        group.foodVisual = food;
    } 
    else if (itemId === "bowl_wooden") {
        // 원목 스탠드 식기
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.35), woodMat);
        stand.position.y = 0.07;
        stand.castShadow = true;
        group.add(stand);

        const bowlGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.07, 12);
        const metalMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.3, metalness: 0.6 });
        
        const bowlL = new THREE.Mesh(bowlGeo, metalMat); bowlL.position.set(-0.15, 0.11, 0); group.add(bowlL);
        const bowlR = new THREE.Mesh(bowlGeo, metalMat); bowlR.position.set(0.15, 0.11, 0); group.add(bowlR);

        // 밥 사료 더미
        const food = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshStandardMaterial({ color: 0x5e3504, roughness: 0.9 }));
        food.scale.y = 0.6;
        food.position.set(-0.15, 0.13, 0);
        group.add(food);
        group.foodVisual = food;

        // 물 표면
        const waterMat = new THREE.MeshStandardMaterial({ color: 0x85c1e9, opacity: 0.8, transparent: true, roughness: 0.1 });
        const water = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 10), waterMat);
        water.position.set(0.15, 0.13, 0);
        group.add(water);
    } 
    else if (itemId === "bowl_stone") {
        // [Level 3] 화강암 식기
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.13, 8), stoneMat);
        bowl.position.y = 0.065;
        bowl.castShadow = true;
        group.add(bowl);

        const food = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0x6e3d06, roughness: 0.95 }));
        food.scale.y = 0.5;
        food.position.y = 0.11;
        group.add(food);
        group.foodVisual = food;
    } 
    else if (itemId === "bowl_ceramic") {
        // [Level 4] 도자기 밥그릇
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.21, 0.12, 16), ceramicMat);
        bowl.position.y = 0.06;
        bowl.castShadow = true;
        group.add(bowl);

        // 럭셔리 소시지 조각 3D 구현
        const treat = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.12, 4, 8), new THREE.MeshStandardMaterial({ color: 0xd98880, roughness: 0.8 }));
        treat.rotation.z = Math.PI / 2.5;
        treat.position.set(0, 0.1, 0);
        group.add(treat);
        group.foodVisual = treat;
    } 
    else if (itemId === "bowl_royal") {
        // [Level 5] 골드 크라운 식기
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.15, 12), goldMat);
        bowl.position.y = 0.075;
        bowl.castShadow = true;
        group.add(bowl);

        // 왕관 돌출 데코
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const spike = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.4 }));
            spike.position.set(Math.cos(angle) * 0.25, 0.16, Math.sin(angle) * 0.25);
            group.add(spike);
        }

        // 고기 스테이크 조각
        const meat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), new THREE.MeshStandardMaterial({ color: 0x922b21, roughness: 0.9 }));
        meat.position.set(0, 0.14, 0);
        meat.rotation.y = 0.5;
        group.add(meat);
        group.foodVisual = meat;
    }

    // 3. 장난감 카테고리 (toy)
    else if (itemId === "toy_ball") {
        // 줄무늬 공
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), roofMat);
        ball.position.y = 0.16;
        ball.castShadow = true;
        group.add(ball);

        const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.015, 6, 24), yellowMat);
        stripe.rotation.x = Math.PI / 2;
        ball.add(stripe);
    } 
    else if (itemId === "toy_bone") {
        // 고무 뼈다귀
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xfdfefe, roughness: 0.9 });
        
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8), boneMat);
        shaft.rotation.z = Math.PI / 2;
        shaft.position.y = 0.05;
        shaft.castShadow = true;
        group.add(shaft);

        const ballGeo = new THREE.SphereGeometry(0.065, 8, 8);
        const b1 = new THREE.Mesh(ballGeo, boneMat); b1.position.set(-0.16, 0.05, -0.04); group.add(b1);
        const b2 = new THREE.Mesh(ballGeo, boneMat); b2.position.set(-0.16, 0.05, 0.04); group.add(b2);
        const b3 = new THREE.Mesh(ballGeo, boneMat); b3.position.set(0.16, 0.05, -0.04); group.add(b3);
        const b4 = new THREE.Mesh(ballGeo, boneMat); b4.position.set(0.16, 0.05, 0.04); group.add(b4);
    } 
    else if (itemId === "toy_duck") {
        // [Level 3] 삑삑이 러버덕 (머리/몸통 모두 캡슐로 둥글게 가공)
        const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.9 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), yellowMat);
        body.scale.z = 1.35;
        body.position.y = 0.14;
        body.castShadow = true;
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), yellowMat);
        head.position.set(0, 0.24, 0.08);
        group.add(head);

        const bill = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.04, 4, 8), orangeMat);
        bill.rotation.x = Math.PI / 2;
        bill.position.set(0, 0.23, 0.17);
        group.add(bill);
    } 
    else if (itemId === "toy_disc") {
        // [Level 4] 소프트 프리스비 (둥근 토러스 원반)
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 16), fabricMat);
        disc.position.y = 0.015;
        disc.castShadow = true;
        group.add(disc);

        const centerHole = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 24), yellowMat);
        centerHole.rotation.x = Math.PI / 2;
        centerHole.position.y = 0.015;
        group.add(centerHole);
    } 
    else if (itemId === "toy_bear") {
        // [Level 5] 수제 곰인형
        const bearMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.98 }); // 황토색
        
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), bearMat);
        body.position.y = 0.15;
        body.scale.set(1, 1.2, 1);
        body.castShadow = true;
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), bearMat);
        head.position.set(0, 0.27, 0);
        group.add(head);

        // 동그란 귀 두개
        const earGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const earL = new THREE.Mesh(earGeo, bearMat); earL.position.set(-0.09, 0.34, 0); group.add(earL);
        const earR = new THREE.Mesh(earGeo, bearMat); earR.position.set(0.09, 0.34, 0); group.add(earR);
    }

    // 기본 축 정렬
    group.position.set(0, 0, 0);

    return group;
}
