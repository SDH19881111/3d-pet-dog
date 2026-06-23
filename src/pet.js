import * as THREE from 'three';

export class ChibiDog {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        // 상태 설정
        this.state = 'idle'; // 'idle', 'walk', 'eat', 'pet', 'sleep', 'walk_action'
        this.stateTimer = 0;
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3();
        this.walkSpeed = 1.8;
        
        // 의상 메시 관리
        this.equippedClothesMesh = null;
        
        // 3D 모델 빌드
        this.buildModel();
        
        // 기본 위치 조정 (마당 높이에 맞춰 발바닥이 닿도록 y 설정)
        this.group.position.set(0, 0.35, 0);
        this.group.castShadow = true;
        this.group.receiveShadow = true;
    }

    // 몽실몽실한 솜사탕/클레이 질감의 3D 캐릭터 빌드
    buildModel() {
        // 클레이 느낌의 고거칠기 매트한 Standard 재질 정의 (roughness: 0.95)
        const furMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.95, metalness: 0.0 }); // 밀크 카라멜 털
        const bellyMaterial = new THREE.MeshStandardMaterial({ color: 0xfff9e6, roughness: 0.95, metalness: 0.0 }); // 크림 아이보리 배털
        const earMaterial = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.95, metalness: 0.0 }); // 밀크 초콜릿 귀/꼬리끝
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.5, metalness: 0.1 }); // 초코칩 눈
        const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x1a252f, roughness: 0.8, metalness: 0.1 });
        const tongueMaterial = new THREE.MeshStandardMaterial({ color: 0xff8a9e, roughness: 0.8, metalness: 0.0 }); // 핑크 혀

        // 1. 몸통 (Body) - 캡슐 지오메트리 자체를 90도 눕혀서 메시 생성 (로컬 회전 꼬임 방지)
        const bodyGeo = new THREE.CapsuleGeometry(0.25, 0.32, 8, 16);
        bodyGeo.rotateX(Math.PI / 2); // 지오메트리 자체를 회전시켜 메시의 로컬 Y가 하늘을 향하게 유지
        
        this.body = new THREE.Mesh(bodyGeo, furMaterial);
        this.body.position.set(0, 0, 0);
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.group.add(this.body);

        // 배 부분의 몽실몽실한 크림색 패널 (앞-아래 부분)
        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), bellyMaterial);
        belly.scale.set(0.9, 0.6, 0.9);
        belly.position.set(0, -0.08, 0.08);
        this.body.add(belly);

        // 2. 머리 피벗 및 머리 (목 부근인 앞-위쪽에 배치)
        this.headPivot = new THREE.Group();
        this.headPivot.position.set(0, 0.15, 0.2); 
        this.body.add(this.headPivot); 

        // 머리 구체
        const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
        this.head = new THREE.Mesh(headGeo, furMaterial);
        this.head.position.set(0, 0.14, 0.08); // 피벗 기준으로 머리 배치
        this.head.castShadow = true;
        this.headPivot.add(this.head);

        // 귀여운 통통한 뺨 패치 (좌우 구체 2개)
        const cheekGeo = new THREE.SphereGeometry(0.1, 10, 10);
        const cheekL = new THREE.Mesh(cheekGeo, bellyMaterial);
        cheekL.position.set(-0.14, -0.06, 0.18);
        cheekL.scale.set(1.2, 0.8, 1);
        const cheekR = new THREE.Mesh(cheekGeo, bellyMaterial);
        cheekR.position.set(0.14, -0.06, 0.18);
        cheekR.scale.set(1.2, 0.8, 1);
        this.head.add(cheekL);
        this.head.add(cheekR);

        // 주둥이 (Snout)
        const snoutGeo = new THREE.CapsuleGeometry(0.1, 0.06, 6, 10);
        snoutGeo.rotateX(Math.PI / 2);
        const snout = new THREE.Mesh(snoutGeo, bellyMaterial);
        snout.position.set(0, -0.04, 0.22);
        snout.castShadow = true;
        this.head.add(snout);

        // 검은 코 (동글동글한 구체)
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), noseMaterial);
        nose.position.set(0, 0.05, 0.06);
        snout.add(nose);

        // 눈 (Left & Right Eyes)
        const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
        this.leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
        this.leftEye.position.set(-0.15, 0.08, 0.22);
        this.leftEye.scale.z = 0.5; 
        
        this.rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
        this.rightEye.position.set(0.15, 0.08, 0.22);
        this.rightEye.scale.z = 0.5;
        
        this.head.add(this.leftEye);
        this.head.add(this.rightEye);

        // 감은 눈 (Sleep 상태 표현용 얇고 둥근 스티치 띠)
        const closedEyeGeo = new THREE.TorusGeometry(0.04, 0.01, 4, 8, Math.PI);
        this.leftClosedEye = new THREE.Mesh(closedEyeGeo, earMaterial);
        this.leftClosedEye.position.set(-0.15, 0.08, 0.22);
        this.leftClosedEye.rotation.x = Math.PI; 
        this.leftClosedEye.visible = false;

        this.rightClosedEye = new THREE.Mesh(closedEyeGeo, earMaterial);
        this.rightClosedEye.position.set(0.15, 0.08, 0.22);
        this.rightClosedEye.rotation.x = Math.PI;
        this.rightClosedEye.visible = false;

        this.head.add(this.leftClosedEye);
        this.head.add(this.rightClosedEye);

        // 귀 피벗 및 귀 (옆머리에 달아 아래로 늘어뜨림)
        const earGeo = new THREE.CapsuleGeometry(0.07, 0.16, 6, 12);
        
        this.leftEarPivot = new THREE.Group();
        this.leftEarPivot.position.set(-0.25, 0.08, 0.0);
        this.head.add(this.leftEarPivot);
        const earL = new THREE.Mesh(earGeo, earMaterial);
        earL.position.set(0, -0.08, 0); 
        earL.scale.set(0.8, 1, 1.3); 
        earL.castShadow = true;
        this.leftEarPivot.add(earL);

        this.rightEarPivot = new THREE.Group();
        this.rightEarPivot.position.set(0.25, 0.08, 0.0);
        this.head.add(this.rightEarPivot);
        const earR = new THREE.Mesh(earGeo, earMaterial);
        earR.position.set(0, -0.08, 0);
        earR.scale.set(0.8, 1, 1.3);
        earR.castShadow = true;
        this.rightEarPivot.add(earR);

        // 혀 (Tongue)
        const tongueGeo = new THREE.BoxGeometry(0.09, 0.02, 0.1);
        this.tongue = new THREE.Mesh(tongueGeo, tongueMaterial);
        this.tongue.position.set(0, -0.12, 0.15);
        this.tongue.rotation.x = 0.2;
        this.tongue.visible = false;
        this.head.add(this.tongue);

        // 3. 다리 4개 피벗 및 다리 (몸통 아래쪽에 배치)
        const legGeo = new THREE.CapsuleGeometry(0.07, 0.14, 6, 10);

        // 앞왼다리
        this.legFL = new THREE.Group();
        this.legFL.position.set(-0.15, -0.15, 0.18);
        this.body.add(this.legFL);
        const meshFL = new THREE.Mesh(legGeo, furMaterial);
        meshFL.position.set(0, -0.07, 0); // 회전 중심(피벗)을 다리 꼭대기로 맞추기
        meshFL.castShadow = true;
        this.legFL.add(meshFL);

        // 앞오른다리
        this.legFR = new THREE.Group();
        this.legFR.position.set(0.15, -0.15, 0.18);
        this.body.add(this.legFR);
        const meshFR = new THREE.Mesh(legGeo, furMaterial);
        meshFR.position.set(0, -0.07, 0);
        meshFR.castShadow = true;
        this.legFR.add(meshFR);

        // 뒤왼다리
        this.legBL = new THREE.Group();
        this.legBL.position.set(-0.15, -0.15, -0.18);
        this.body.add(this.legBL);
        const meshBL = new THREE.Mesh(legGeo, furMaterial);
        meshBL.position.set(0, -0.07, 0);
        meshBL.castShadow = true;
        this.legBL.add(meshBL);

        // 뒤오른다리
        this.legBR = new THREE.Group();
        this.legBR.position.set(0.15, -0.15, -0.18);
        this.body.add(this.legBR);
        const meshBR = new THREE.Mesh(legGeo, furMaterial);
        meshBR.position.set(0, -0.07, 0);
        meshBR.castShadow = true;
        this.legBR.add(meshBR);

        // 4. 꼬리 피벗 및 꼬리
        this.tailPivot = new THREE.Group();
        this.tailPivot.position.set(0, 0.1, -0.26); // 엉덩이 위
        this.body.add(this.tailPivot);

        const tailGeo = new THREE.CapsuleGeometry(0.04, 0.14, 4, 8);
        const tail = new THREE.Mesh(tailGeo, earMaterial);
        tail.position.set(0, 0.08, -0.06); 
        tail.rotation.x = Math.PI / 4; // 대각선 위로 들기
        tail.castShadow = true;
        this.tailPivot.add(tail);
    }

    // 옷 착용 비주얼 처리
    setClothes(clothesId) {
        if (this.equippedClothesMesh) {
            this.head.remove(this.equippedClothesMesh);
            this.body.remove(this.equippedClothesMesh);
            this.equippedClothesMesh = null;
        }

        if (!clothesId) return;

        const clothesMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });

        if (clothesId === "clothes_collar") {
            // 빨간 스카프 (목 부분에 부착)
            clothesMat.color.setHex(0xe74c3c);
            const scarfGeo = new THREE.TorusGeometry(0.24, 0.04, 8, 16);
            const scarf = new THREE.Mesh(scarfGeo, clothesMat);
            scarf.position.set(0, 0.08, 0.16); 
            scarf.rotation.x = Math.PI / 3;
            scarf.castShadow = true;
            this.body.add(scarf);
            this.equippedClothesMesh = scarf;
        } 
        else if (clothesId === "clothes_hat") {
            // 파티 모자 (머리 위에 부착)
            clothesMat.color.setHex(0x9b59b6);
            const hatGroup = new THREE.Group();
            const hat = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 12), clothesMat);
            hat.position.set(0, 0.35, 0.0);
            hat.rotation.x = 0.05;
            hat.castShadow = true;
            hatGroup.add(hat);

            const pom = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 6, 6),
                new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.9 })
            );
            pom.position.set(0, 0.13, 0);
            hat.add(pom);

            this.head.add(hatGroup);
            this.equippedClothesMesh = hatGroup;
        } 
        else if (clothesId === "clothes_shirt") {
            // 초록 줄무늬 티셔츠 (몸통 크기에 맞는 지오메트리 캡슐 덮어 씌우기)
            const shirtGeo = new THREE.CapsuleGeometry(0.262, 0.24, 8, 16);
            shirtGeo.rotateX(Math.PI / 2);
            const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.95 }); 
            const shirt = new THREE.Mesh(shirtGeo, shirtMat);
            shirt.position.set(0, 0.01, 0);
            shirt.castShadow = true;
            this.body.add(shirt);
            this.equippedClothesMesh = shirt;
        } 
        else if (clothesId === "clothes_glasses") {
            // 선글라스 (안경 브릿지 + 렌즈들)
            const glassesGroup = new THREE.Group();
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
            const lensMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 });

            const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 0.03), frameMat);
            bridge.position.set(0, 0.08, 0.22);
            glassesGroup.add(bridge);

            const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.04), frameMat);
            frameL.position.set(-0.14, 0.08, 0.22);
            const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.05), lensMat);
            lensL.position.set(-0.14, 0.08, 0.22);
            glassesGroup.add(frameL);
            glassesGroup.add(lensL);

            const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.04), frameMat);
            frameR.position.set(0.14, 0.08, 0.22);
            const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.05), lensMat);
            lensR.position.set(0.14, 0.08, 0.22);
            glassesGroup.add(frameR);
            glassesGroup.add(lensR);

            this.head.add(glassesGroup);
            this.equippedClothesMesh = glassesGroup;
        } 
        else if (clothesId === "clothes_wizard") {
            // 마법사 모자 (머리 위에 부착)
            clothesMat.color.setHex(0x2c3e50);
            const hatGroup = new THREE.Group();
            
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 16), clothesMat);
            brim.position.set(0, 0.32, 0.0);
            brim.rotation.x = 0.05;
            brim.castShadow = true;
            hatGroup.add(brim);

            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 12), clothesMat);
            cone.position.set(0, 0.13, -0.02);
            cone.rotation.x = -0.15;
            brim.add(cone);

            const star = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.035),
                new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.5 })
            );
            star.position.set(0, 0.08, 0.08);
            cone.add(star);

            this.head.add(hatGroup);
            this.equippedClothesMesh = hatGroup;
        }
    }

    // 상태 변경
    changeState(newState, targetPos = null) {
        if (this.state === newState && newState !== 'walk' && newState !== 'walk_action') return;

        this.state = newState;
        this.stateTimer = 0;

        // 비주얼 상태 초기화
        this.leftEye.visible = true;
        this.rightEye.visible = true;
        this.leftClosedEye.visible = false;
        this.rightClosedEye.visible = false;
        this.tongue.visible = false;
        this.headPivot.rotation.set(0, 0, 0);
        this.body.position.y = 0;

        if ((newState === 'walk' || newState === 'walk_action') && targetPos) {
            this.targetPosition.copy(targetPos);
            this.targetPosition.y = this.group.position.y;
            this.walkSpeed = (newState === 'walk_action') ? 2.5 : 1.6;
        } 
        else if (newState === 'sleep') {
            this.leftEye.visible = false;
            this.rightEye.visible = false;
            this.leftClosedEye.visible = true;
            this.rightClosedEye.visible = true;
        } 
        else if (newState === 'pet') {
            this.tongue.visible = true;
        }
    }

    // 매 프레임 업데이트
    update(deltaTime, time) {
        this.stateTimer += deltaTime;

        // 1. 이동
        if (this.state === 'walk' || this.state === 'walk_action') {
            const dir = new THREE.Vector3().subVectors(this.targetPosition, this.group.position);
            const dist = dir.length();

            if (dist < 0.25) {
                if (this.state === 'walk_action' && this.stateTimer < 5.0) {
                    const angle = time * 2.0;
                    const r = 3.0;
                    this.targetPosition.set(Math.cos(angle) * r, this.group.position.y, Math.sin(angle) * r);
                } else {
                    this.changeState('idle');
                    this.velocity.set(0, 0, 0);
                }
            } else {
                dir.normalize();
                this.velocity.copy(dir).multiplyScalar(this.walkSpeed);
                this.group.position.addScaledVector(this.velocity, deltaTime);

                const targetAngle = Math.atan2(dir.x, dir.z);
                let diff = targetAngle - this.group.rotation.y;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.group.rotation.y += diff * 0.15;
            }
        }

        // 2. 애니메이션 (다리가 땅을 향한 바른 회전 상태 유지)
        if (this.state === 'idle') {
            // 호흡
            const breathe = Math.sin(time * 3.0) * 0.025;
            this.body.scale.set(1 + breathe, 1 + breathe, 1 + breathe);
            
            // 꼬리 흔들기
            this.tailPivot.rotation.y = Math.sin(time * 4) * 0.3;
            
            // 귀 흔들기
            this.leftEarPivot.rotation.z = Math.sin(time * 2.0) * 0.04;
            this.rightEarPivot.rotation.z = -Math.sin(time * 2.0) * 0.04;
            this.headPivot.rotation.y = Math.sin(time * 0.8) * 0.08;
        } 
        else if (this.state === 'walk' || this.state === 'walk_action') {
            const speedFactor = (this.state === 'walk_action') ? 16 : 10;
            
            // 다리 흔들기 (X축 회전)
            const swing = Math.sin(time * speedFactor) * 0.6;
            this.legFL.rotation.x = swing;
            this.legFR.rotation.x = -swing;
            this.legBL.rotation.x = -swing;
            this.legBR.rotation.x = swing;

            // 몸통 위아래 통통 튀기
            this.body.position.y = Math.abs(Math.sin(time * speedFactor)) * 0.07;
            this.tailPivot.rotation.y = Math.sin(time * 20) * 0.5;

            // 귀 펄럭임
            this.leftEarPivot.rotation.z = 0.15 + Math.abs(Math.sin(time * speedFactor)) * 0.1;
            this.rightEarPivot.rotation.z = -0.15 - Math.abs(Math.sin(time * speedFactor)) * 0.1;
        } 
        else if (this.state === 'pet') {
            // 뛰면서 회전하는 환호
            this.body.position.y = Math.abs(Math.sin(time * 16)) * 0.3;
            this.tailPivot.rotation.y = Math.sin(time * 35) * 0.8;
            
            this.leftEarPivot.rotation.z = 0.3 + Math.sin(time * 15) * 0.08;
            this.rightEarPivot.rotation.z = -0.3 - Math.sin(time * 15) * 0.08;

            if (this.stateTimer > 2.5) {
                this.changeState('idle');
            }
        } 
        else if (this.state === 'sleep') {
            // 완전히 바닥 밀착
            this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0.15, deltaTime * 5);
            this.body.position.y = 0;
            
            // 다리를 몸 아래/옆으로 부드럽게 접기
            const foldAngle = Math.PI / 2.3;
            this.legFL.rotation.x = THREE.MathUtils.lerp(this.legFL.rotation.x, -foldAngle, deltaTime * 5);
            this.legFR.rotation.x = THREE.MathUtils.lerp(this.legFR.rotation.x, -foldAngle, deltaTime * 5);
            this.legBL.rotation.x = THREE.MathUtils.lerp(this.legBL.rotation.x, foldAngle, deltaTime * 5);
            this.legBR.rotation.x = THREE.MathUtils.lerp(this.legBR.rotation.x, foldAngle, deltaTime * 5);

            // 고개 바닥으로 숙이기
            this.headPivot.rotation.x = THREE.MathUtils.lerp(this.headPivot.rotation.x, 0.25, deltaTime * 5);
            this.leftEarPivot.rotation.z = THREE.MathUtils.lerp(this.leftEarPivot.rotation.z, 0.02, deltaTime * 5);
            this.rightEarPivot.rotation.z = THREE.MathUtils.lerp(this.rightEarPivot.rotation.z, -0.02, deltaTime * 5);

            this.tailPivot.rotation.x = THREE.MathUtils.lerp(this.tailPivot.rotation.x, -Math.PI / 3, deltaTime * 5);
            this.tailPivot.rotation.y = 0;

            const sleepBreathe = Math.sin(time * 1.5) * 0.015;
            this.body.scale.set(1 + sleepBreathe, 1 + sleepBreathe, 1 + sleepBreathe);
        } 
        else if (this.state === 'eat') {
            // 고개 숙이고 밥 먹기
            this.headPivot.rotation.x = 0.4 + Math.sin(time * 16) * 0.15;
            this.tailPivot.rotation.y = Math.sin(time * 12) * 0.4;

            const crouch = Math.PI / 8;
            this.legFL.rotation.x = THREE.MathUtils.lerp(this.legFL.rotation.x, -crouch, deltaTime * 5);
            this.legFR.rotation.x = THREE.MathUtils.lerp(this.legFR.rotation.x, -crouch, deltaTime * 5);

            if (this.stateTimer > 4.0) {
                this.changeState('idle');
            }
        }

        // 수면 이외 상태 복구
        if (this.state !== 'sleep') {
            this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0.35, deltaTime * 5);
            
            if (this.state !== 'walk' && this.state !== 'walk_action' && this.state !== 'eat') {
                this.legFL.rotation.x = THREE.MathUtils.lerp(this.legFL.rotation.x, 0, deltaTime * 5);
                this.legFR.rotation.x = THREE.MathUtils.lerp(this.legFR.rotation.x, 0, deltaTime * 5);
                this.legBL.rotation.x = THREE.MathUtils.lerp(this.legBL.rotation.x, 0, deltaTime * 5);
                this.legBR.rotation.x = THREE.MathUtils.lerp(this.legBR.rotation.x, 0, deltaTime * 5);
            }
        }
    }
}
