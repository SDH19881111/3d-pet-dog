import * as THREE from 'three';

// 똥 (Poop) 3D 모델 생성 함수 (부드러운 클레이 스타일)
export function createPoopMesh() {
    const group = new THREE.Group();
    const poopMaterial = new THREE.MeshStandardMaterial({ color: 0x815345, roughness: 0.95, metalness: 0.0 });

    const layer1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), poopMaterial);
    layer1.position.y = 0.08;
    layer1.scale.y = 0.6; 
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

// 신규 추가: 마당 쓰레기 3D 모델 생성 함수 (점토/클레이 테마)
export function createTrashMesh(trashType) {
    const group = new THREE.Group();

    if (trashType === "paper") {
        // 구겨진 종이 조각 (다각 구체 활용)
        const paperMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.98, metalness: 0.0 });
        const paper = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09), paperMat);
        paper.position.y = 0.09;
        // 구겨진 느낌을 내기 위해 비정형 스케일링
        paper.scale.set(1.2, 0.8, 1.1);
        paper.castShadow = true;
        group.add(paper);
    } 
    else if (trashType === "can") {
        // 찌그러진 알루미늄 캔
        const canMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.4, metalness: 0.6 }); // 유광 레드 캔
        const metalMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.3, metalness: 0.8 }); // 캔 뚜껑/바닥
        
        // 캔 몸통 (약간 찌그러진 상하 실린더)
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.14, 8), canMat);
        body.position.y = 0.07;
        body.rotation.z = Math.PI / 2.3; // 땅에 비스듬히 누운 모습
        body.scale.set(1, 0.7, 1); // 찌그러짐 표현
        body.castShadow = true;
        group.add(body);

        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 8), metalMat);
        cap.position.set(-0.065, 0.095, 0);
        cap.rotation.z = Math.PI / 2.3;
        group.add(cap);
    } 
    else if (trashType === "bottle") {
        // 버려진 페트병
        const plasticMat = new THREE.MeshStandardMaterial({ 
            color: 0xaed6f1, 
            roughness: 0.1, 
            metalness: 0.1, 
            transparent: true, 
            opacity: 0.7 
        });
        const capMat = new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.8 });

        const bottleBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.12, 4, 8), plasticMat);
        bottleBody.position.y = 0.045;
        bottleBody.rotation.z = Math.PI / 2.1; // 땅에 눕혀둠
        bottleBody.castShadow = true;
        group.add(bottleBody);

        // 뚜껑 부분 추가
        const bottleCap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8), capMat);
        bottleCap.position.set(-0.09, 0.045, 0);
        bottleCap.rotation.z = Math.PI / 2.1;
        group.add(bottleCap);
    }

    return group;
}

// 이모지를 3D 빌보드 스프라이트로 만드는 헬퍼 (전용 모델이 없는 아이템 표시용)
function makeEmojiSprite(emoji) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji || '❔', size / 2, size / 2 + 6);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.55, 0.55, 0.55);
    return sprite;
}

// 상점 아이템 3D 모델 생성기 (전용 모델이 없으면 emoji 표지판으로 폴백)
export function createItemMesh(itemId, emoji = '❔') {
    const group = new THREE.Group();
    
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xc18c5d, roughness: 0.95 }); 
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf5b7b1, roughness: 0.95 }); 
    const fabricMat = new THREE.MeshStandardMaterial({ color: 0xaed6f1, roughness: 0.95 }); 
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf9e79f, roughness: 0.95 }); 
    const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xfdfefe, roughness: 0.8 }); 
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.98 }); 
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.5, metalness: 0.7 }); 

    if (itemId === "house_basic") {
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
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 1.1), woodMat);
        base.position.y = 0.03;
        group.add(base);

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
        const cushionMat = new THREE.MeshStandardMaterial({ color: 0xfadbd8, roughness: 0.95 }); 
        const trimMat = new THREE.MeshStandardMaterial({ color: 0xebdef0, roughness: 0.95 }); 

        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.12, 12, 24), cushionMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.12;
        ring.castShadow = true;
        group.add(ring);

        const center = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), trimMat);
        center.scale.y = 0.25;
        center.position.y = 0.08;
        center.castShadow = true;
        group.add(center);
    } 
    else if (itemId === "house_tent") {
        const clothMat = new THREE.MeshStandardMaterial({ color: 0xfaf9f6, roughness: 0.95 }); 
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.9 });
        
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.06, 12), woodMat);
        pad.position.y = 0.03;
        group.add(pad);

        const tent = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.9, 5, 1, true), clothMat);
        tent.position.y = 0.48;
        tent.castShadow = true;
        group.add(tent);

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
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.3), ceramicMat);
        base.position.y = 0.04;
        group.add(base);

        const towerGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.9, 12);
        const towerL = new THREE.Mesh(towerGeo, ceramicMat);
        towerL.position.set(-0.48, 0.49, 0.2);
        towerL.castShadow = true;
        group.add(towerL);

        const towerR = new THREE.Mesh(towerGeo, ceramicMat);
        towerR.position.set(0.48, 0.49, 0.2);
        towerR.castShadow = true;
        group.add(towerR);

        const coneGeo = new THREE.ConeGeometry(0.24, 0.35, 12);
        const coneL = new THREE.Mesh(coneGeo, fabricMat);
        coneL.position.y = 0.6;
        towerL.add(coneL);

        const coneR = new THREE.Mesh(coneGeo, fabricMat);
        coneR.position.y = 0.6;
        towerR.add(coneR);

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
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.1, 16), fabricMat);
        bowl.position.y = 0.05;
        bowl.castShadow = true;
        group.add(bowl);

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
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.35), woodMat);
        stand.position.y = 0.07;
        stand.castShadow = true;
        group.add(stand);

        const bowlGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.07, 12);
        const metalMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.3, metalness: 0.6 });
        
        const bowlL = new THREE.Mesh(bowlGeo, metalMat); bowlL.position.set(-0.15, 0.11, 0); group.add(bowlL);
        const bowlR = new THREE.Mesh(bowlGeo, metalMat); bowlR.position.set(0.15, 0.11, 0); group.add(bowlR);

        const food = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshStandardMaterial({ color: 0x5e3504, roughness: 0.9 }));
        food.scale.y = 0.6;
        food.position.set(-0.15, 0.13, 0);
        group.add(food);
        group.foodVisual = food;

        const waterMat = new THREE.MeshStandardMaterial({ color: 0x85c1e9, opacity: 0.8, transparent: true, roughness: 0.1 });
        const water = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 10), waterMat);
        water.position.set(0.15, 0.13, 0);
        group.add(water);
    } 
    else if (itemId === "bowl_stone") {
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
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.21, 0.12, 16), ceramicMat);
        bowl.position.y = 0.06;
        bowl.castShadow = true;
        group.add(bowl);

        const treat = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.12, 4, 8), new THREE.MeshStandardMaterial({ color: 0xd98880, roughness: 0.8 }));
        treat.rotation.z = Math.PI / 2.5;
        treat.position.set(0, 0.1, 0);
        group.add(treat);
        group.foodVisual = treat;
    } 
    else if (itemId === "bowl_royal") {
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.15, 12), goldMat);
        bowl.position.y = 0.075;
        bowl.castShadow = true;
        group.add(bowl);

        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const spike = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.4 }));
            spike.position.set(Math.cos(angle) * 0.25, 0.16, Math.sin(angle) * 0.25);
            group.add(spike);
        }

        const meat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), new THREE.MeshStandardMaterial({ color: 0x922b21, roughness: 0.9 }));
        meat.position.set(0, 0.14, 0);
        meat.rotation.y = 0.5;
        group.add(meat);
        group.foodVisual = meat;
    }

    // 3. 장난감 카테고리 (toy)
    else if (itemId === "toy_ball") {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), roofMat);
        ball.position.y = 0.16;
        ball.castShadow = true;
        group.add(ball);

        const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.015, 6, 24), yellowMat);
        stripe.rotation.x = Math.PI / 2;
        ball.add(stripe);
    } 
    else if (itemId === "toy_bone") {
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
        const bearMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.98 }); 
        
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), bearMat);
        body.position.y = 0.15;
        body.scale.set(1, 1.2, 1);
        body.castShadow = true;
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), bearMat);
        head.position.set(0, 0.27, 0);
        group.add(head);

        const earGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const earL = new THREE.Mesh(earGeo, bearMat); earL.position.set(-0.09, 0.34, 0); group.add(earL);
        const earR = new THREE.Mesh(earGeo, bearMat); earR.position.set(0.09, 0.34, 0); group.add(earR);
    }

    // 전용 모델이 없는 아이템(고양이/햄스터 전용, 신규 레벨 6~10 등)은 받침대 + 이모지 표지판으로 표시
    if (group.children.length === 0) {
        const pedestalMat = new THREE.MeshStandardMaterial({ color: 0xd9c2a6, roughness: 0.95 });
        const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 16), pedestalMat);
        pedestal.position.y = 0.06;
        pedestal.castShadow = true;
        group.add(pedestal);

        const sprite = makeEmojiSprite(emoji);
        sprite.position.set(0, 0.42, 0);
        group.add(sprite);
    }

    group.position.set(0, 0, 0);

    return group;
}
