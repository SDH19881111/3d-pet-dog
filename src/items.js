import * as THREE from 'three';

// 똥 (Poop) 3D 모델 생성 함수
export function createPoopMesh() {
    const group = new THREE.Group();
    const poopMaterial = new THREE.MeshLambertMaterial({ color: 0x8d5b4c }); // 갈색 똥색

    // 소프트아이스크림 모양의 3단 똥 구현
    const layer1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.1, 8), poopMaterial);
    layer1.position.y = 0.05;
    layer1.castShadow = true;
    group.add(layer1);

    const layer2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.08, 8), poopMaterial);
    layer2.position.y = 0.12;
    layer2.castShadow = true;
    group.add(layer2);

    const layer3 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.1, 8), poopMaterial);
    layer3.position.y = 0.19;
    layer3.castShadow = true;
    group.add(layer3);

    return group;
}

// 상점 아이템 3D 모델 생성기
export function createItemMesh(itemId) {
    const group = new THREE.Group();

    // 1. 강아지 집 카테고리
    if (itemId === "house_basic") {
        // 종이 박스 집 (크래프트지 브라운 색상 상자 형태)
        const boxMat = new THREE.MeshLambertMaterial({ color: 0xd5a980 }); // 상자색
        const flapMat = new THREE.MeshLambertMaterial({ color: 0xc4976d }); // 날개색 (약간 어두움)

        // 바닥/벽 조립 (구멍 뚫린 상자 느낌)
        const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 1.1), boxMat);
        wallLeft.position.set(-0.55, 0.45, 0);
        wallLeft.castShadow = true;
        group.add(wallLeft);

        const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 1.1), boxMat);
        wallRight.position.set(0.55, 0.45, 0);
        wallRight.castShadow = true;
        group.add(wallRight);

        const wallBack = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.9, 0.05), boxMat);
        wallBack.position.set(0, 0.45, -0.55);
        wallBack.castShadow = true;
        group.add(wallBack);

        // 지붕 (뚜껑 덮개)
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 1.2), boxMat);
        roof.position.set(0, 0.9, 0);
        roof.castShadow = true;
        group.add(roof);

        // 박스 열린 날개들
        const flapL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 1.1), flapMat);
        flapL.position.set(-0.55, 1.0, 0);
        flapL.rotation.z = -0.5;
        group.add(flapL);

        const flapR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 1.1), flapMat);
        flapR.position.set(0.55, 1.0, 0);
        flapR.rotation.z = 0.5;
        group.add(flapR);
    } 
    else if (itemId === "house_wooden") {
        // 클래식 원목 개집
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x8a5a36 }); // 몸체 원목
        const roofMat = new THREE.MeshLambertMaterial({ color: 0xc0392b }); // 붉은 지붕
        const baseMat = new THREE.MeshLambertMaterial({ color: 0x563821 }); // 바닥 받침대

        // 받침판
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.2), baseMat);
        base.position.y = 0.04;
        base.castShadow = true;
        group.add(base);

        // 메인 벽면 (내부가 비어보이도록 박스 조립)
        const wL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 1.0), woodMat);
        wL.position.set(-0.5, 0.44, 0);
        wL.castShadow = true;
        group.add(wL);

        const wR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 1.0), woodMat);
        wR.position.set(0.5, 0.44, 0);
        wR.castShadow = true;
        group.add(wR);

        const wB = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.8, 0.08), woodMat);
        wB.position.set(0, 0.44, -0.46);
        wB.castShadow = true;
        group.add(wB);

        // 삼각형 지붕 앞뒤 판 마감
        const roofTriGeo = new THREE.ConeGeometry(0.65, 0.35, 4);
        const roofTriF = new THREE.Mesh(roofTriGeo, woodMat);
        roofTriF.position.set(0, 0.95, 0.45);
        roofTriF.rotation.y = Math.PI / 4;
        group.add(roofTriF);

        const roofTriB = new THREE.Mesh(roofTriGeo, woodMat);
        roofTriB.position.set(0, 0.95, -0.45);
        roofTriB.rotation.y = Math.PI / 4;
        group.add(roofTriB);

        // 경사 지붕 판자 2장
        const roofPlateL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 1.2), roofMat);
        roofPlateL.position.set(-0.35, 1.0, 0);
        roofPlateL.rotation.z = -0.65;
        roofPlateL.castShadow = true;
        group.add(roofPlateL);

        const roofPlateR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 1.2), roofMat);
        roofPlateR.position.set(0.35, 1.0, 0);
        roofPlateR.rotation.z = 0.65;
        roofPlateR.castShadow = true;
        group.add(roofPlateR);
    } 
    else if (itemId === "house_royal") {
        // 왕실 강아지 성 (Castle)
        const wallMat = new THREE.MeshLambertMaterial({ color: 0xebf5fb }); // 흰 대리석 벽
        const blueMat = new THREE.MeshLambertMaterial({ color: 0x2e86c1 }); // 로열 블루 지붕
        const goldMat = new THREE.MeshLambertMaterial({ color: 0xf1c40f }); // 금빛 장식

        // 메인 성채 바닥
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), wallMat);
        base.position.y = 0.05;
        base.castShadow = true;
        group.add(base);

        // 좌측/우측 성탑 (Cylinder)
        const towerGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.1, 8);
        const towerL = new THREE.Mesh(towerGeo, wallMat);
        towerL.position.set(-0.55, 0.6, 0.2);
        towerL.castShadow = true;
        group.add(towerL);

        const towerR = new THREE.Mesh(towerGeo, wallMat);
        towerR.position.set(0.55, 0.6, 0.2);
        towerR.castShadow = true;
        group.add(towerR);

        // 성탑 뾰족 지붕 (Blue Cones)
        const coneGeo = new THREE.ConeGeometry(0.26, 0.4, 8);
        const coneL = new THREE.Mesh(coneGeo, blueMat);
        coneL.position.y = 0.75;
        towerL.add(coneL);

        const coneR = new THREE.Mesh(coneGeo, blueMat);
        coneR.position.y = 0.75;
        towerR.add(coneR);

        // 성벽 (뒤와 옆 가림막)
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.1), wallMat);
        backWall.position.set(0, 0.55, -0.5);
        backWall.castShadow = true;
        group.add(backWall);

        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.7), wallMat);
        leftWall.position.set(-0.55, 0.55, -0.2);
        leftWall.castShadow = true;
        group.add(leftWall);

        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.7), wallMat);
        rightWall.position.set(0.55, 0.55, -0.2);
        rightWall.castShadow = true;
        group.add(rightWall);

        // 금색 아치 왕관 모양 입구 몰딩
        const gateGold = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.2), goldMat);
        gateGold.position.set(0, 0.9, 0.35);
        gateGold.castShadow = true;
        group.add(gateGold);
    }

    // 2. 밥그릇 카테고리
    else if (itemId === "bowl_basic") {
        // 플라스틱 밥그릇 (납작한 원통 형태)
        const bowlMat = new THREE.MeshLambertMaterial({ color: 0x3498db }); // 하늘색 식기
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.12, 12), bowlMat);
        bowl.position.y = 0.06;
        bowl.castShadow = true;
        group.add(bowl);

        // 음식 내용물 (갈색 알갱이들)
        const foodGroup = new THREE.Group();
        const kibbleMat = new THREE.MeshLambertMaterial({ color: 0x7e5109 });
        for (let i = 0; i < 8; i++) {
            const kibble = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), kibbleMat);
            kibble.position.set(
                (Math.random() - 0.5) * 0.25,
                0.08,
                (Math.random() - 0.5) * 0.25
            );
            foodGroup.add(kibble);
        }
        group.add(foodGroup);
        group.foodVisual = foodGroup;
    } 
    else if (itemId === "bowl_wooden") {
        // 원목 스탠드 식기 (더블 식기 - 밥 + 물)
        const standMat = new THREE.MeshLambertMaterial({ color: 0x935116 }); // 원목 스탠드
        const metalMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.2, metalness: 0.8 }); // 스텐 그릇

        // 나무 거치대 상자
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.4), standMat);
        stand.position.y = 0.08;
        stand.castShadow = true;
        group.add(stand);

        // 식기 그릇 2개 (왼쪽 밥, 오른쪽 물)
        const bowlGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.08, 12);
        const bowlL = new THREE.Mesh(bowlGeo, metalMat);
        bowlL.position.set(-0.16, 0.13, 0);
        group.add(bowlL);

        const bowlR = new THREE.Mesh(bowlGeo, metalMat);
        bowlR.position.set(0.16, 0.13, 0);
        group.add(bowlR);

        // 내용물들
        const foodMat = new THREE.MeshLambertMaterial({ color: 0x5e3504 }); // 밥
        const food = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), foodMat);
        food.scale.y = 0.5;
        food.position.set(-0.16, 0.16, 0);
        group.add(food);
        group.foodVisual = food;

        const waterMat = new THREE.MeshStandardMaterial({ color: 0x5dade2, opacity: 0.8, transparent: true }); // 물
        const water = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 10), waterMat);
        water.position.set(0.16, 0.16, 0);
        group.add(water);
    } 
    else if (itemId === "bowl_royal") {
        // 금빛 왕관 식기
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.1, metalness: 0.9 });
        const rubyMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });

        // 금 그릇
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.16, 12), goldMat);
        bowl.position.y = 0.08;
        bowl.castShadow = true;
        group.add(bowl);

        // 보석 데코레이션
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), rubyMat);
            jewel.position.set(Math.cos(angle) * 0.27, 0.08, Math.sin(angle) * 0.27);
            group.add(jewel);
        }

        // 풍성한 고기 식사
        const meatMat = new THREE.MeshLambertMaterial({ color: 0xba4a00 }); // 마블링 고기색
        const meat = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.2), meatMat);
        meat.position.set(0, 0.18, 0);
        meat.rotation.y = 0.4;
        group.add(meat);
        group.foodVisual = meat;
    }

    // 3. 장난감 카테고리
    else if (itemId === "toy_ball") {
        // 줄무늬 공 (농구공 또는 형형색색 공)
        const ballMat = new THREE.MeshLambertMaterial({ color: 0x1abc9c });
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });

        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), ballMat);
        ball.position.y = 0.18;
        ball.castShadow = true;
        group.add(ball);

        // 링 스트라이프 장식
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.182, 0.015, 6, 24), stripeMat);
        stripe.rotation.x = Math.PI / 2;
        ball.add(stripe);
    } 
    else if (itemId === "toy_bone") {
        // 개뼈다귀
        const boneMat = new THREE.MeshLambertMaterial({ color: 0xeaecee });
        
        // 중간 막대
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), boneMat);
        shaft.rotation.z = Math.PI / 2;
        shaft.position.y = 0.06;
        shaft.castShadow = true;
        group.add(shaft);

        // 양 끝 볼 4개
        const ballGeo = new THREE.SphereGeometry(0.07, 8, 8);
        const b1 = new THREE.Mesh(ballGeo, boneMat); b1.position.set(-0.18, 0.06, -0.05); group.add(b1);
        const b2 = new THREE.Mesh(ballGeo, boneMat); b2.position.set(-0.18, 0.06, 0.05); group.add(b2);
        const b3 = new THREE.Mesh(ballGeo, boneMat); b3.position.set(0.18, 0.06, -0.05); group.add(b3);
        const b4 = new THREE.Mesh(ballGeo, boneMat); b4.position.set(0.18, 0.06, 0.05); group.add(b4);
    } 
    else if (itemId === "toy_bear") {
        // 수제 오리 인형
        const yellowMat = new THREE.MeshLambertMaterial({ color: 0xf4d03f }); // 노란색
        const orangeMat = new THREE.MeshLambertMaterial({ color: 0xe67e22 }); // 오렌지 주둥이
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

        // 몸체
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), yellowMat);
        body.position.y = 0.16;
        body.scale.z = 1.3;
        body.castShadow = true;
        group.add(body);

        // 머리
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), yellowMat);
        head.position.set(0, 0.28, 0.1);
        group.add(head);

        // 입부리
        const beak = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.12), orangeMat);
        beak.position.set(0, -0.02, 0.13);
        head.add(beak);

        // 두 눈
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), eyeMat);
        eyeL.position.set(-0.06, 0.04, 0.09);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.06;
        head.add(eyeL);
        head.add(eyeR);
    }

    // 기본 위치를 바닥에 살짝 밀착
    group.position.set(0, 0, 0);

    return group;
}
