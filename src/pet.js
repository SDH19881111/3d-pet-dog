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
        
        // 기본 위치 조정
        this.group.position.set(0, 0.4, 0);
        this.group.castShadow = true;
        this.group.receiveShadow = true;
    }

    // 통통하고 부드러운 솜사탕/클레이 질감의 3D 캐릭터 빌드
    buildModel() {
        // 클레이 느낌의 고거칠기 매트한 Standard 재질 정의 (roughness: 0.9 - 빛 번짐 없이 뽀송함)
        const furMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.95, metalness: 0.0 }); // 밀크 카라멜 털
        const bellyMaterial = new THREE.MeshStandardMaterial({ color: 0xfff9e6, roughness: 0.95, metalness: 0.0 }); // 크림 아이보리 배털
        const earMaterial = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.95, metalness: 0.0 }); // 밀크 초콜릿 귀/꼬리끝
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.5, metalness: 0.1 }); // 초코칩 눈
        const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x1a252f, roughness: 0.8, metalness: 0.1 });
        const tongueMaterial = new THREE.MeshStandardMaterial({ color: 0xff8a9e, roughness: 0.8, metalness: 0.0 }); // 핑크 혀

        // 1. 몸통 (Body) - 모서리가 둥근 필 모양의 알약 캡슐 사용 (CapsuleGeometry)
        // CapsuleGeometry(radius, length, capSegments, radialSegments)
        const bodyGeo = new THREE.CapsuleGeometry(0.28, 0.35, 8, 16);
        this.body = new THREE.Mesh(bodyGeo, furMaterial);
        // 기본적으로 누워있으므로 Z축 방향으로 눕히기
        this.body.rotation.x = Math.PI / 2;
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.group.add(this.body);

        // 배 부분의 몽실몽실한 크림색 반원구
        const bellyGeo = new THREE.SphereGeometry(0.29, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const belly = new THREE.Mesh(bellyGeo, bellyMaterial);
        // 배쪽에 위치시키기 (눕힌 캡슐 위에 얹음)
        belly.position.set(0, 0, -0.05); // 로컬 Z축은 회전되어 아래방향을 향함
        belly.rotation.x = Math.PI / 2;
        this.body.add(belly);

        // 2. 머리 피벗 및 머리 (둥근 구체 사용)
        // 캡슐 몸통 위에 피벗을 달아 목 움직임을 구현
        this.headPivot = new THREE.Group();
        this.headPivot.position.set(0, 0.22, 0.15); // 로컬 좌표계 오프셋 보정
        this.body.add(this.headPivot); // 몸통의 자식으로 등록

        // 머리 구체
        const headGeo = new THREE.SphereGeometry(0.33, 16, 16);
        this.head = new THREE.Mesh(headGeo, furMaterial);
        this.head.position.set(0, 0.0, 0.28); // 피벗 기준 앞쪽으로 오프셋
        this.head.rotation.x = -Math.PI / 2; // 캡슐 몸통 회전에 따른 머리 회전 복원
        this.head.castShadow = true;
        this.headPivot.add(this.head);

        // 솜사탕처럼 통통한 뺨 패치 (좌우 구체 2개)
        const cheekGeo = new THREE.SphereGeometry(0.12, 10, 10);
        const cheekL = new THREE.Mesh(cheekGeo, bellyMaterial);
        cheekL.position.set(-0.16, -0.08, 0.2);
        cheekL.scale.set(1.2, 0.8, 1);
        const cheekR = new THREE.Mesh(cheekGeo, bellyMaterial);
        cheekR.position.set(0.16, -0.08, 0.2);
        cheekR.scale.set(1.2, 0.8, 1);
        this.head.add(cheekL);
        this.head.add(cheekR);

        // 주둥이 (Snout) - 동그스름한 알약 형태
        const snoutGeo = new THREE.CapsuleGeometry(0.12, 0.08, 6, 10);
        const snout = new THREE.Mesh(snoutGeo, bellyMaterial);
        snout.position.set(0, -0.05, 0.23);
        snout.rotation.x = Math.PI / 2;
        snout.castShadow = true;
        this.head.add(snout);

        // 검은 코 (동글동글한 구체)
        const noseGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const nose = new THREE.Mesh(noseGeo, noseMaterial);
        nose.position.set(0, 0.08, 0.06);
        snout.add(nose);

        // 눈 (Left & Right Eyes - 둥근 구)
        const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
        this.leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
        this.leftEye.position.set(-0.18, 0.12, 0.22);
        this.leftEye.scale.z = 0.5; // 약간 납작하게 눌린 눈빛
        
        this.rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
        this.rightEye.position.set(0.18, 0.12, 0.22);
        this.rightEye.scale.z = 0.5;
        
        this.head.add(this.leftEye);
        this.head.add(this.rightEye);

        // 감은 눈 (Sleep 상태 표현용 얇고 둥근 스티치 띠)
        const closedEyeGeo = new THREE.TorusGeometry(0.045, 0.012, 4, 8, Math.PI);
        this.leftClosedEye = new THREE.Mesh(closedEyeGeo, earMaterial);
        this.leftClosedEye.position.set(-0.18, 0.12, 0.23);
        this.leftClosedEye.rotation.x = Math.PI; // 아래로 굽은 선 표현
        this.leftClosedEye.visible = false;

        this.rightClosedEye = new THREE.Mesh(closedEyeGeo, earMaterial);
        this.rightClosedEye.position.set(0.18, 0.12, 0.23);
        this.rightClosedEye.rotation.x = Math.PI;
        this.rightClosedEye.visible = false;

        this.head.add(this.leftClosedEye);
        this.head.add(this.rightClosedEye);

        // 귀 피벗 및 귀 (Floppy style 둥글고 납작한 캡슐 사용)
        const earGeo = new THREE.CapsuleGeometry(0.08, 0.18, 6, 12);
        
        this.leftEarPivot = new THREE.Group();
        this.leftEarPivot.position.set(-0.28, 0.12, 0.02);
        this.head.add(this.leftEarPivot);
        const earL = new THREE.Mesh(earGeo, earMaterial);
        earL.position.set(0, -0.1, 0); // 아래로 축 늘어짐
        earL.scale.set(0.8, 1, 1.4); // 납작하게 성형
        earL.castShadow = true;
        this.leftEarPivot.add(earL);

        this.rightEarPivot = new THREE.Group();
        this.rightEarPivot.position.set(0.28, 0.12, 0.02);
        this.head.add(this.rightEarPivot);
        const earR = new THREE.Mesh(earGeo, earMaterial);
        earR.position.set(0, -0.1, 0);
        earR.scale.set(0.8, 1, 1.4);
        earR.castShadow = true;
        this.rightEarPivot.add(earR);

        // 혀 (Tongue)
        const tongueGeo = new THREE.BoxGeometry(0.1, 0.02, 0.12);
        this.tongue = new THREE.Mesh(tongueGeo, tongueMaterial);
        this.tongue.position.set(0, -0.14, 0.16);
        this.tongue.rotation.x = 0.25;
        this.tongue.visible = false;
        this.head.add(this.tongue);

        // 3. 몽실몽실한 다리 피벗 및 다리 4개 (Capsules)
        const legGeo = new THREE.CapsuleGeometry(0.08, 0.15, 6, 12);

        // 앞왼다리
        this.legFL = new THREE.Group();
        this.legFL.position.set(-0.16, 0.15, -0.22); // 몸통의 Z축 눕힘으로 Y/Z축 변환
        this.body.add(this.legFL);
        const meshFL = new THREE.Mesh(legGeo, furMaterial);
        meshFL.rotation.x = -Math.PI / 2; // 똑바로 서도록 회전
        meshFL.position.set(0, -0.1, 0);
        meshFL.castShadow = true;
        this.legFL.add(meshFL);

        // 앞오른다리
        this.legFR = new THREE.Group();
        this.legFR.position.set(0.16, 0.15, -0.22);
        this.body.add(this.legFR);
        const meshFR = new THREE.Mesh(legGeo, furMaterial);
        meshFR.rotation.x = -Math.PI / 2;
        meshFR.position.set(0, -0.1, 0);
        meshFR.castShadow = true;
        this.legFR.add(meshFR);

        // 뒤왼다리
        this.legBL = new THREE.Group();
        this.legBL.position.set(-0.16, -0.15, -0.22);
        this.body.add(this.legBL);
        const meshBL = new THREE.Mesh(legGeo, furMaterial);
        meshBL.rotation.x = -Math.PI / 2;
        meshBL.position.set(0, -0.1, 0);
        meshBL.castShadow = true;
        this.legBL.add(meshBL);

        // 뒤오른다리
        this.legBR = new THREE.Group();
        this.legBR.position.set(0.16, -0.15, -0.22);
        this.body.add(this.legBR);
        const meshBR = new THREE.Mesh(legGeo, furMaterial);
        meshBR.rotation.x = -Math.PI / 2;
        meshBR.position.set(0, -0.1, 0);
        meshBR.castShadow = true;
        this.legBR.add(meshBR);

        // 4. 꼬리 피벗 및 꼬리 (Capsule)
        this.tailPivot = new THREE.Group();
        this.tailPivot.position.set(0, -0.26, 0.1); // 엉덩이 쪽
        this.body.add(this.tailPivot);

        const tailGeo = new THREE.CapsuleGeometry(0.045, 0.16, 4, 8);
        const tail = new THREE.Mesh(tailGeo, earMaterial);
        tail.position.set(0, -0.12, 0); // 바깥쪽 오프셋
        tail.rotation.x = -Math.PI / 3; // 위로 올림
        tail.castShadow = true;
        this.tailPivot.add(tail);
    }

    // 옷 입히기 비주얼 처리
    setClothes(clothesId) {
        if (this.equippedClothesMesh) {
            this.head.remove(this.equippedClothesMesh);
            this.body.remove(this.equippedClothesMesh);
            this.equippedClothesMesh = null;
        }

        if (!clothesId) return;

        const clothesMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });

        if (clothesId === "clothes_collar") {
            // 빨간 스카프
            clothesMat.color.setHex(0xe74c3c);
            const scarfGeo = new THREE.TorusGeometry(0.32, 0.05, 8, 16);
            const scarf = new THREE.Mesh(scarfGeo, clothesMat);
            scarf.position.set(0, 0.1, 0.15); // 목 위치
            scarf.rotation.x = Math.PI / 2.3;
            scarf.castShadow = true;
            this.body.add(scarf);
            this.equippedClothesMesh = scarf;
        } 
        else if (clothesId === "clothes_hat") {
            // 파티 모자
            clothesMat.color.setHex(0x9b59b6);
            const hatGroup = new THREE.Group();
            const hat = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 12), clothesMat);
            hat.position.set(0, 0.38, 0.05);
            hat.rotation.x = 0.1;
            hat.castShadow = true;
            hatGroup.add(hat);

            // 꼭대기 방울
            const pom = new THREE.Mesh(
                new THREE.SphereGeometry(0.045, 6, 6),
                new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.9 })
            );
            pom.position.set(0, 0.15, 0);
            hat.add(pom);

            this.head.add(hatGroup);
            this.equippedClothesMesh = hatGroup;
        } 
        else if (clothesId === "clothes_shirt") {
            // 초록 줄무늬 티셔츠 (몸통 캡슐 위에 씌우는 약간 큰 캡슐 메시)
            const shirtGeo = new THREE.CapsuleGeometry(0.295, 0.26, 8, 16);
            const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.95 }); // 숲속 초록
            const shirt = new THREE.Mesh(shirtGeo, shirtMat);
            
            // 몸체 캡슐 중간에 씌우기
            shirt.position.set(0, 0, 0);
            shirt.castShadow = true;
            this.body.add(shirt);
            this.equippedClothesMesh = shirt;
        } 
        else if (clothesId === "clothes_glasses") {
            // 힙스터 선글라스 (머리 구체 앞에 부착)
            const glassesGroup = new THREE.Group();
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
            const lensMat = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8 });

            // 안경다리/브릿지 프레임
            const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.04), frameMat);
            bridge.position.set(0, 0.12, 0.33);
            glassesGroup.add(bridge);

            // 좌측 렌즈/프레임
            const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.05), frameMat);
            frameL.position.set(-0.16, 0.12, 0.33);
            const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.06), lensMat);
            lensL.position.set(-0.16, 0.12, 0.33);
            glassesGroup.add(frameL);
            glassesGroup.add(lensL);

            // 우측 렌즈/프레임
            const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.05), frameMat);
            frameR.position.set(0.16, 0.12, 0.33);
            const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.06), lensMat);
            lensR.position.set(0.16, 0.12, 0.33);
            glassesGroup.add(frameR);
            glassesGroup.add(lensR);

            this.head.add(glassesGroup);
            this.equippedClothesMesh = glassesGroup;
        } 
        else if (clothesId === "clothes_wizard") {
            // 마법사 모자
            clothesMat.color.setHex(0x2c3e50);
            const hatGroup = new THREE.Group();
            
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 16), clothesMat);
            brim.position.set(0, 0.3, 0.02);
            brim.rotation.x = 0.1;
            brim.castShadow = true;
            hatGroup.add(brim);

            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 12), clothesMat);
            cone.position.set(0, 0.15, -0.02);
            cone.rotation.x = -0.2;
            brim.add(cone);

            // 별장식
            const star = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.04),
                new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.5 })
            );
            star.position.set(0, 0.1, 0.1);
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

        // 비주얼 상태 복원
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
            this.walkSpeed = (newState === 'walk_action') ? 2.5 : 1.6; // 산책 시 더 신나서 빨리 달림
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

    // 매 프레임 위치 및 애니메이션 제어
    update(deltaTime, time) {
        this.stateTimer += deltaTime;

        // 1. 이동 제어
        if (this.state === 'walk' || this.state === 'walk_action') {
            const dir = new THREE.Vector3().subVectors(this.targetPosition, this.group.position);
            const dist = dir.length();

            if (dist < 0.25) {
                // 산책 액션 중에는 뺑뺑 돌기 위해 한 번 더 이동 유도할 수도 있음
                if (this.state === 'walk_action' && this.stateTimer < 5.0) {
                    // 다음 산책 목표 자동 설정 (마당을 돌도록)
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

                // 부드럽게 바라보기
                const targetAngle = Math.atan2(dir.x, dir.z);
                let diff = targetAngle - this.group.rotation.y;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.group.rotation.y += diff * 0.15;
            }
        }

        // 2. 애니메이션 구현 (몽실몽실한 바디 굴림)
        if (this.state === 'idle') {
            // 숨쉬기: 풍선 부풀어 오르듯 둥글둥글 수축 팽창
            const breathe = Math.sin(time * 3.0) * 0.025;
            this.body.scale.set(1 + breathe, 1 + breathe, 1 + breathe);
            
            // 꼬리 흔들기
            this.tailPivot.rotation.y = Math.sin(time * 4) * 0.3;
            
            // 귀 살짝 펄럭임
            this.leftEarPivot.rotation.z = Math.sin(time * 2.0) * 0.04;
            this.rightEarPivot.rotation.z = -Math.sin(time * 2.0) * 0.04;
            this.headPivot.rotation.y = Math.sin(time * 0.8) * 0.08;
        } 
        else if (this.state === 'walk' || this.state === 'walk_action') {
            const speedFactor = (this.state === 'walk_action') ? 16 : 10;
            
            // 솜사탕처럼 통통 튀며 앞뒤로 흔들리는 다리
            const swing = Math.sin(time * speedFactor) * 0.7;
            this.legFL.rotation.x = swing;
            this.legFR.rotation.x = -swing;
            this.legBL.rotation.x = -swing;
            this.legBR.rotation.x = swing;

            // 몸통 통통 튀기 (바운스)
            this.body.position.y = Math.abs(Math.sin(time * speedFactor)) * 0.08;
            
            // 꼬리는 신나게 회전
            this.tailPivot.rotation.y = Math.sin(time * 20) * 0.5;

            // 귀 펄럭임
            this.leftEarPivot.rotation.z = 0.15 + Math.abs(Math.sin(time * speedFactor)) * 0.12;
            this.rightEarPivot.rotation.z = -0.15 - Math.abs(Math.sin(time * speedFactor)) * 0.12;
        } 
        else if (this.state === 'pet') {
            // 신나서 콩콩 뛰기
            this.body.position.y = Math.abs(Math.sin(time * 16)) * 0.35;
            
            // 꼬리 흔들기 모터
            this.tailPivot.rotation.y = Math.sin(time * 35) * 0.9;
            
            // 귀를 쫑긋 펴기
            this.leftEarPivot.rotation.z = 0.35 + Math.sin(time * 15) * 0.08;
            this.rightEarPivot.rotation.z = -0.35 - Math.sin(time * 15) * 0.08;

            if (this.stateTimer > 2.5) {
                this.changeState('idle');
            }
        } 
        else if (this.state === 'sleep') {
            // 완전히 바닥에 밀착
            this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0.12, deltaTime * 5);
            this.body.position.y = 0;
            
            // 다리 접기
            const foldAngle = Math.PI / 2.3;
            this.legFL.rotation.x = THREE.MathUtils.lerp(this.legFL.rotation.x, -foldAngle, deltaTime * 5);
            this.legFR.rotation.x = THREE.MathUtils.lerp(this.legFR.rotation.x, -foldAngle, deltaTime * 5);
            this.legBL.rotation.x = THREE.MathUtils.lerp(this.legBL.rotation.x, foldAngle, deltaTime * 5);
            this.legBR.rotation.x = THREE.MathUtils.lerp(this.legBR.rotation.x, foldAngle, deltaTime * 5);

            // 머리 고개 바닥으로 젖히기
            this.headPivot.rotation.x = THREE.MathUtils.lerp(this.headPivot.rotation.x, 0.3, deltaTime * 5);
            this.leftEarPivot.rotation.z = THREE.MathUtils.lerp(this.leftEarPivot.rotation.z, 0.02, deltaTime * 5);
            this.rightEarPivot.rotation.z = THREE.MathUtils.lerp(this.rightEarPivot.rotation.z, -0.02, deltaTime * 5);

            // 꼬리 처짐
            this.tailPivot.rotation.x = THREE.MathUtils.lerp(this.tailPivot.rotation.x, -Math.PI / 2, deltaTime * 5);
            this.tailPivot.rotation.y = 0;

            // 부드러운 수면 호흡 주기
            const sleepBreathe = Math.sin(time * 1.5) * 0.015;
            this.body.scale.set(1 + sleepBreathe, 1 + sleepBreathe, 1 + sleepBreathe);
        } 
        else if (this.state === 'eat') {
            // 밥그릇 쪽으로 엎드리기
            this.headPivot.rotation.x = 0.5 + Math.sin(time * 16) * 0.18;
            this.tailPivot.rotation.y = Math.sin(time * 12) * 0.4;

            const crouch = Math.PI / 6;
            this.legFL.rotation.x = THREE.MathUtils.lerp(this.legFL.rotation.x, -crouch, deltaTime * 5);
            this.legFR.rotation.x = THREE.MathUtils.lerp(this.legFR.rotation.x, -crouch, deltaTime * 5);

            if (this.stateTimer > 4.0) {
                this.changeState('idle');
            }
        }

        // 수면 이외 상태 복구
        if (this.state !== 'sleep') {
            this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0.4, deltaTime * 5);
            
            if (this.state !== 'walk' && this.state !== 'walk_action' && this.state !== 'eat') {
                this.legFL.rotation.x = THREE.MathUtils.lerp(this.legFL.rotation.x, 0, deltaTime * 5);
                this.legFR.rotation.x = THREE.MathUtils.lerp(this.legFR.rotation.x, 0, deltaTime * 5);
                this.legBL.rotation.x = THREE.MathUtils.lerp(this.legBL.rotation.x, 0, deltaTime * 5);
                this.legBR.rotation.x = THREE.MathUtils.lerp(this.legBR.rotation.x, 0, deltaTime * 5);
            }
        }
    }
}
