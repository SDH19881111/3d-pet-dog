import * as THREE from 'three';

export class ChibiDog {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        // 상태 설정
        this.state = 'idle'; // 'idle', 'walk', 'eat', 'pet', 'sleep'
        this.stateTimer = 0;
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3();
        this.walkSpeed = 1.8;
        
        // 의상 메시 저장
        this.equippedClothesMesh = null;
        
        // 3D 모델 빌드
        this.buildModel();
        
        // 기본 위치 조정
        this.group.position.set(0, 0.4, 0);
        this.group.castShadow = true;
        this.group.receiveShadow = true;
    }

    // 귀여운 로우폴리 복셀 스타일 강아지 조립
    buildModel() {
        // 재질 정의 (밝은 주황색/골든 리트리버 톤 + 검은 눈 + 갈색 주둥이)
        const furMaterial = new THREE.MeshLambertMaterial({ color: 0xf5b041 }); // 주황/갈색 털
        const bellyMaterial = new THREE.MeshLambertMaterial({ color: 0xfdfefe }); // 하얀 배/주둥이 털
        const earMaterial = new THREE.MeshLambertMaterial({ color: 0xd35400 }); // 진한 갈색 귀
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x2c3e50 }); // 검은 눈
        const noseMaterial = new THREE.MeshBasicMaterial({ color: 0x1a252f }); // 검은 코
        const tongueMaterial = new THREE.MeshLambertMaterial({ color: 0xff7b90 }); // 핑크 혀

        // 1. 몸통 (Body) - 중심이 되는 상자
        const bodyGeo = new THREE.BoxGeometry(0.5, 0.4, 0.7);
        this.body = new THREE.Mesh(bodyGeo, furMaterial);
        this.body.position.set(0, 0, 0);
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.group.add(this.body);

        // 배 부분의 하얀 털 패치
        const bellyGeo = new THREE.BoxGeometry(0.52, 0.25, 0.5);
        const belly = new THREE.Mesh(bellyGeo, bellyMaterial);
        belly.position.set(0, -0.08, 0.05);
        this.body.add(belly);

        // 2. 머리 피벗 및 머리 (Head Pivot for Rotation)
        this.headPivot = new THREE.Group();
        this.headPivot.position.set(0, 0.2, 0.3); // 목 부근에 피벗 설정
        this.body.add(this.headPivot);

        const headGeo = new THREE.BoxGeometry(0.55, 0.5, 0.5);
        this.head = new THREE.Mesh(headGeo, furMaterial);
        this.head.position.set(0, 0.2, 0.1); // 피벗으로부터 머리 중심 오프셋
        this.head.castShadow = true;
        this.headPivot.add(this.head);

        // 주둥이 (Snout)
        const snoutGeo = new THREE.BoxGeometry(0.3, 0.18, 0.2);
        const snout = new THREE.Mesh(snoutGeo, bellyMaterial);
        snout.position.set(0, -0.08, 0.32);
        snout.castShadow = true;
        this.head.add(snout);

        // 코 (Nose)
        const noseGeo = new THREE.BoxGeometry(0.12, 0.08, 0.08);
        const nose = new THREE.Mesh(noseGeo, noseMaterial);
        nose.position.set(0, 0.06, 0.11);
        snout.add(nose);

        // 눈 (Left & Right Eyes)
        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
        this.leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
        this.leftEye.position.set(-0.16, 0.08, 0.26);
        this.rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
        this.rightEye.position.set(0.16, 0.08, 0.26);
        this.head.add(this.leftEye);
        this.head.add(this.rightEye);

        // 감은 눈 (Sleep 상태 표현용 얇은 회색 플레이트)
        const closedEyeGeo = new THREE.BoxGeometry(0.09, 0.02, 0.045);
        this.leftClosedEye = new THREE.Mesh(closedEyeGeo, earMaterial);
        this.leftClosedEye.position.set(-0.16, 0.07, 0.265);
        this.leftClosedEye.visible = false;
        this.rightClosedEye = new THREE.Mesh(closedEyeGeo, earMaterial);
        this.rightClosedEye.position.set(0.16, 0.07, 0.265);
        this.rightClosedEye.visible = false;
        this.head.add(this.leftClosedEye);
        this.head.add(this.rightClosedEye);

        // 귀 피벗 (Ears - Floppy style)
        this.leftEarPivot = new THREE.Group();
        this.leftEarPivot.position.set(-0.28, 0.18, 0.05);
        this.head.add(this.leftEarPivot);
        const earL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.18), earMaterial);
        earL.position.set(0, -0.12, 0); // 아래로 내려오게 오프셋
        earL.castShadow = true;
        this.leftEarPivot.add(earL);

        this.rightEarPivot = new THREE.Group();
        this.rightEarPivot.position.set(0.28, 0.18, 0.05);
        this.head.add(this.rightEarPivot);
        const earR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.18), earMaterial);
        earR.position.set(0, -0.12, 0);
        earR.castShadow = true;
        this.rightEarPivot.add(earR);

        // 혀 (Tongue)
        const tongueGeo = new THREE.BoxGeometry(0.12, 0.03, 0.15);
        this.tongue = new THREE.Mesh(tongueGeo, tongueMaterial);
        this.tongue.position.set(0, -0.16, 0.2);
        this.tongue.rotation.x = 0.2;
        this.tongue.visible = false;
        this.head.add(this.tongue);

        // 3. 다리 4개 피벗 설정 (Leg Pivots for swing animations)
        const legGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
        const pawGeo = new THREE.BoxGeometry(0.14, 0.08, 0.16); // 발바닥

        // 앞왼다리
        this.legFL = new THREE.Group();
        this.legFL.position.set(-0.18, -0.18, 0.22);
        this.body.add(this.legFL);
        const meshFL = new THREE.Mesh(legGeo, furMaterial);
        meshFL.position.set(0, -0.15, 0);
        meshFL.castShadow = true;
        this.legFL.add(meshFL);
        const pawFL = new THREE.Mesh(pawGeo, bellyMaterial);
        pawFL.position.set(0, -0.3, 0.02);
        this.legFL.add(pawFL);

        // 앞오른다리
        this.legFR = new THREE.Group();
        this.legFR.position.set(0.18, -0.18, 0.22);
        this.body.add(this.legFR);
        const meshFR = new THREE.Mesh(legGeo, furMaterial);
        meshFR.position.set(0, -0.15, 0);
        meshFR.castShadow = true;
        this.legFR.add(meshFR);
        const pawFR = new THREE.Mesh(pawGeo, bellyMaterial);
        pawFR.position.set(0, -0.3, 0.02);
        this.legFR.add(pawFR);

        // 뒤왼다리
        this.legBL = new THREE.Group();
        this.legBL.position.set(-0.18, -0.18, -0.22);
        this.body.add(this.legBL);
        const meshBL = new THREE.Mesh(legGeo, furMaterial);
        meshBL.position.set(0, -0.15, 0);
        meshBL.castShadow = true;
        this.legBL.add(meshBL);
        const pawBL = new THREE.Mesh(pawGeo, bellyMaterial);
        pawBL.position.set(0, -0.3, 0.02);
        this.legBL.add(pawBL);

        // 뒤오른다리
        this.legBR = new THREE.Group();
        this.legBR.position.set(0.18, -0.18, -0.22);
        this.body.add(this.legBR);
        const meshBR = new THREE.Mesh(legGeo, furMaterial);
        meshBR.position.set(0, -0.15, 0);
        meshBR.castShadow = true;
        this.legBR.add(meshBR);
        const pawBR = new THREE.Mesh(pawGeo, bellyMaterial);
        pawBR.position.set(0, -0.3, 0.02);
        this.legBR.add(pawBR);

        // 4. 꼬리 피벗 및 꼬리 (Tail)
        this.tailPivot = new THREE.Group();
        this.tailPivot.position.set(0, 0.15, -0.32);
        this.body.add(this.tailPivot);

        const tailGeo = new THREE.BoxGeometry(0.08, 0.3, 0.08);
        const tail = new THREE.Mesh(tailGeo, earMaterial); // 귀와 같은 진한 색 꼬리 끝
        tail.position.set(0, 0.12, -0.06); // 살짝 비스듬하게 오프셋
        tail.rotation.x = -0.6; // 위로 치켜들기
        tail.castShadow = true;
        this.tailPivot.add(tail);
    }

    // 옷 착용 비주얼 처리
    setClothes(clothesId) {
        // 기존 옷 제거
        if (this.equippedClothesMesh) {
            this.head.remove(this.equippedClothesMesh);
            this.body.remove(this.equippedClothesMesh);
            this.equippedClothesMesh = null;
        }

        if (!clothesId) return;

        if (clothesId === "clothes_collar") {
            // 빨간 스카프 (목에 부착)
            const scarfGeo = new THREE.BoxGeometry(0.56, 0.1, 0.76);
            const scarfMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
            const scarf = new THREE.Mesh(scarfGeo, scarfMat);
            scarf.position.set(0, 0.08, 0.02);
            this.body.add(scarf);
            this.equippedClothesMesh = scarf;
        } 
        else if (clothesId === "clothes_hat") {
            // 파티 고깔모자 (머리 위에 부착)
            const hatGeo = new THREE.ConeGeometry(0.18, 0.4, 4);
            const hatMat = new THREE.MeshLambertMaterial({ color: 0x9b59b6 });
            const hat = new THREE.Mesh(hatGeo, hatMat);
            hat.position.set(0, 0.45, 0.05);
            hat.rotation.y = Math.PI / 4;
            
            // 귀여운 폼폼 방울 추가
            const pomGeo = new THREE.SphereGeometry(0.05, 4, 4);
            const pomMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
            const pom = new THREE.Mesh(pomGeo, pomMat);
            pom.position.set(0, 0.2, 0);
            hat.add(pom);

            this.head.add(hat);
            this.equippedClothesMesh = hat;
        } 
        else if (clothesId === "clothes_wizard") {
            // 마법사 모자 (머리 위에 부착)
            const hatGroup = new THREE.Group();
            
            // 모자 챙
            const brim = new THREE.Mesh(
                new THREE.BoxGeometry(0.65, 0.03, 0.65),
                new THREE.MeshLambertMaterial({ color: 0x2c3e50 })
            );
            brim.position.set(0, 0.28, 0.05);
            hatGroup.add(brim);

            // 모자 콘
            const cone = new THREE.Mesh(
                new THREE.ConeGeometry(0.2, 0.35, 6),
                new THREE.MeshLambertMaterial({ color: 0x2980b9 })
            );
            cone.position.set(0, 0.45, 0.02);
            cone.rotation.x = -0.15; // 뒤로 꺾임
            hatGroup.add(cone);

            // 별 장식
            const starGeo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
            const star = new THREE.Mesh(starGeo, new THREE.MeshBasicMaterial({ color: 0xf1c40f }));
            star.position.set(0, 0.15, 0.11);
            cone.add(star);

            this.head.add(hatGroup);
            this.equippedClothesMesh = hatGroup;
        }
    }

    // 상태 변경
    changeState(newState, targetPos = null) {
        if (this.state === newState && newState !== 'walk') return;

        this.state = newState;
        this.stateTimer = 0;

        // 눈 깜빡임 및 기본 상태 비주얼 초기화
        this.leftEye.visible = true;
        this.rightEye.visible = true;
        this.leftClosedEye.visible = false;
        this.rightClosedEye.visible = false;
        this.tongue.visible = false;
        this.headPivot.rotation.set(0, 0, 0);
        this.body.position.y = 0;

        if (newState === 'walk' && targetPos) {
            this.targetPosition.copy(targetPos);
            // 강아지 Y 좌표 바닥 맞추기
            this.targetPosition.y = this.group.position.y; 
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

    // 프레임 애니메이션 및 물리 업데이트
    update(deltaTime, time) {
        this.stateTimer += deltaTime;

        // 1. 상태별 특수 물리 및 로직 처리
        if (this.state === 'walk') {
            const dir = new THREE.Vector3().subVectors(this.targetPosition, this.group.position);
            const dist = dir.length();

            if (dist < 0.2) {
                // 목표지 도달 -> Idle로 복귀
                this.changeState('idle');
                this.velocity.set(0, 0, 0);
            } else {
                dir.normalize();
                this.velocity.copy(dir).multiplyScalar(this.walkSpeed);
                this.group.position.addScaledVector(this.velocity, deltaTime);

                // 이동 방향 바라보기 (부드럽게 회전)
                const targetAngle = Math.atan2(dir.x, dir.z);
                
                // 각도 간섭 최소화(부드러운 보간)
                let diff = targetAngle - this.group.rotation.y;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.group.rotation.y += diff * 0.15;
            }
        }

        // 2. 상태별 3D 애니메이션 (관절 회전)
        if (this.state === 'idle') {
            // 숨쉬기: 위아래로 살짝 수축
            const breathe = Math.sin(time * 3.5) * 0.02;
            this.body.scale.set(1, 1 + breathe, 1);
            
            // 꼬리 흔들기: 천천히
            this.tailPivot.rotation.y = Math.sin(time * 4) * 0.25;
            this.tailPivot.rotation.x = -0.5 + Math.sin(time * 2) * 0.05;

            // 귀 펄럭임
            this.leftEarPivot.rotation.z = Math.sin(time * 1.5) * 0.03;
            this.rightEarPivot.rotation.z = -Math.sin(time * 1.5) * 0.03;
            this.headPivot.rotation.x = Math.sin(time * 0.8) * 0.04;
        } 
        else if (this.state === 'walk') {
            // 다리 교차 흔들기
            const swing = Math.sin(time * 12) * 0.6;
            this.legFL.rotation.x = swing;
            this.legFR.rotation.x = -swing;
            this.legBL.rotation.x = -swing;
            this.legBR.rotation.x = swing;

            // 걸을 때 엉덩이 실룩대기 및 위아래 바운스
            this.body.position.y = Math.abs(Math.sin(time * 12)) * 0.08;
            this.tailPivot.rotation.y = Math.sin(time * 15) * 0.4;
            this.tailPivot.rotation.x = -0.3;

            // 고개 앞뒤로 끄덕이기
            this.headPivot.rotation.x = Math.sin(time * 12) * 0.08;
            this.leftEarPivot.rotation.z = Math.abs(Math.sin(time * 12)) * 0.08;
            this.rightEarPivot.rotation.z = -Math.abs(Math.sin(time * 12)) * 0.08;
        } 
        else if (this.state === 'pet') {
            // 콩콩 뛰며 기뻐함
            this.body.position.y = Math.abs(Math.sin(time * 14)) * 0.35;
            
            // 꼬리 격렬하게 흔들기
            this.tailPivot.rotation.y = Math.sin(time * 30) * 0.8;
            this.tailPivot.rotation.x = -0.1;
            
            // 고개 뒤로 젖히기
            this.headPivot.rotation.x = -0.15 + Math.sin(time * 10) * 0.05;
            
            // 귀도 신나서 양옆으로 벌어짐
            this.leftEarPivot.rotation.z = 0.2 + Math.sin(time * 15) * 0.1;
            this.rightEarPivot.rotation.z = -0.2 - Math.sin(time * 15) * 0.1;

            // 일정 시간 후 다시 Idle
            if (this.stateTimer > 2.5) {
                this.changeState('idle');
            }
        } 
        else if (this.state === 'sleep') {
            // 바닥에 납작 엎드리기
            this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0.2, deltaTime * 5);
            this.body.position.y = 0;
            
            // 다리는 바닥에 접기
            this.legFL.rotation.x = THREE.MathUtils.lerp(this.legFL.rotation.x, -Math.PI / 2.3, deltaTime * 5);
            this.legFR.rotation.x = THREE.MathUtils.lerp(this.legFR.rotation.x, -Math.PI / 2.3, deltaTime * 5);
            this.legBL.rotation.x = THREE.MathUtils.lerp(this.legBL.rotation.x, Math.PI / 2.3, deltaTime * 5);
            this.legBR.rotation.x = THREE.MathUtils.lerp(this.legBR.rotation.x, Math.PI / 2.3, deltaTime * 5);

            // 고개 바닥으로 젖히기
            this.headPivot.rotation.x = THREE.MathUtils.lerp(this.headPivot.rotation.x, 0.25, deltaTime * 5);
            this.leftEarPivot.rotation.z = THREE.MathUtils.lerp(this.leftEarPivot.rotation.z, 0.02, deltaTime * 5);
            this.rightEarPivot.rotation.z = THREE.MathUtils.lerp(this.rightEarPivot.rotation.z, -0.02, deltaTime * 5);

            // 꼬리 축 늘어뜨리기
            this.tailPivot.rotation.y = 0;
            this.tailPivot.rotation.x = THREE.MathUtils.lerp(this.tailPivot.rotation.x, -1.2, deltaTime * 5);

            // 아주 느린 호흡
            const sleepBreathe = Math.sin(time * 1.5) * 0.01;
            this.body.scale.set(1, 1 + sleepBreathe, 1);
        } 
        else if (this.state === 'eat') {
            // 밥그릇 쪽으로 고개 숙이기
            this.headPivot.rotation.x = 0.5 + Math.sin(time * 15) * 0.15;
            this.tailPivot.rotation.y = Math.sin(time * 10) * 0.3; // 맛있어서 흔드는 꼬리

            // 다리 약간 굽히기
            const crouch = Math.PI / 8;
            this.legFL.rotation.x = THREE.MathUtils.lerp(this.legFL.rotation.x, -crouch, deltaTime * 5);
            this.legFR.rotation.x = THREE.MathUtils.lerp(this.legFR.rotation.x, -crouch, deltaTime * 5);
            
            // 일정 시간 후 식사 완료 -> Idle
            if (this.stateTimer > 4.0) {
                this.changeState('idle');
            }
        }

        // Sleep 상태가 아닐 때는 높이 복구 및 다리 각도 복구
        if (this.state !== 'sleep') {
            this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0.4, deltaTime * 5);
            
            if (this.state !== 'walk' && this.state !== 'eat') {
                this.legFL.rotation.x = THREE.MathUtils.lerp(this.legFL.rotation.x, 0, deltaTime * 5);
                this.legFR.rotation.x = THREE.MathUtils.lerp(this.legFR.rotation.x, 0, deltaTime * 5);
                this.legBL.rotation.x = THREE.MathUtils.lerp(this.legBL.rotation.x, 0, deltaTime * 5);
                this.legBR.rotation.x = THREE.MathUtils.lerp(this.legBR.rotation.x, 0, deltaTime * 5);
            }
        }
    }
}
