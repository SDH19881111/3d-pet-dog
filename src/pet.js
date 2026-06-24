import * as THREE from 'three';
// 캐시 무력화 버전 전파: state.js를 main.js와 동일한 ?v= URL로 import → 모듈/싱글톤 중복 방지
const __v = new URL(import.meta.url).search;
const { gameState } = await import(`./state.js${__v}`);

export class ChibiPet {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.species = gameState.state.species || "dog";

        // 상태 설정
        this.state = 'idle'; // 'idle', 'walk', 'eat', 'pet', 'sleep', 'walk_action'
        this.stateTimer = 0;
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3();
        this.walkSpeed = 1.8;
        this.equippedClothesMeshes = [];

        // 3D 모델 빌드
        this.buildModel();

        // 커스터마이징 적용
        this.updateCustomization();

        // 기본 위치 조정
        this.group.position.set(0, 0.35, 0);
        this.group.castShadow = true;
        this.group.receiveShadow = true;
    }

    // ===== 공용 머티리얼 + 종족별 빌더 디스패치 =====
    buildModel() {
        // 커스터마이징으로 실시간 변경되는 털 머티리얼 (인스턴스 보관)
        this.furMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.9, metalness: 0.0 });
        // 배/주둥이/볼/발바닥 등 밝은 대조색
        this.bellyMaterial = new THREE.MeshStandardMaterial({ color: 0xfff9e6, roughness: 0.95, metalness: 0.0 });
        // 귀끝/꼬리 등 어두운 강조색
        this.accentMaterial = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.9, metalness: 0.0 });
        this.eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.3, metalness: 0.1 }); // 초코칩 눈
        this.shineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // 눈 하이라이트(반짝)
        this.noseMaterial = new THREE.MeshStandardMaterial({ color: 0x1a252f, roughness: 0.6, metalness: 0.1 });
        this.pinkMaterial = new THREE.MeshStandardMaterial({ color: 0xff9aa8, roughness: 0.8, metalness: 0.0 }); // 코/귀 안쪽 핑크
        this.tongueMaterial = new THREE.MeshStandardMaterial({ color: 0xff8a9e, roughness: 0.8, metalness: 0.0 });

        // 모든 신체 파트를 담는 컨테이너(애니메이션이 this.body 기준으로 동작)
        this.body = new THREE.Group();
        this.group.add(this.body);

        if (this.species === 'cat') this._buildCat();
        else if (this.species === 'hamster') this._buildHamster();
        else this._buildDog();
    }

    // ===== 공용 헬퍼들 =====

    // 눈(뜬 눈 + 하이라이트 + 감은 눈) 생성
    _addEyes(p) {
        const eyeGeo = new THREE.SphereGeometry(p.size, 12, 12);
        const shineGeo = new THREE.SphereGeometry(p.size * 0.35, 8, 8);
        const mk = (sign) => {
            const eye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
            eye.position.set(sign * p.x, p.y, p.z);
            eye.scale.set(p.sx || 1, p.sy || 1, p.sz || 0.6);
            const shine = new THREE.Mesh(shineGeo, this.shineMaterial);
            shine.position.set(-sign * p.size * 0.3, p.size * 0.4, p.size * 0.95);
            eye.add(shine);
            this.head.add(eye);
            return eye;
        };
        this.leftEye = mk(-1);
        this.rightEye = mk(1);

        const closedGeo = new THREE.TorusGeometry(p.size, p.size * 0.2, 4, 8, Math.PI);
        const mkc = (sign) => {
            const c = new THREE.Mesh(closedGeo, this.accentMaterial);
            c.position.set(sign * p.x, p.y, p.z);
            c.rotation.x = Math.PI;
            c.visible = false;
            this.head.add(c);
            return c;
        };
        this.leftClosedEye = mkc(-1);
        this.rightClosedEye = mkc(1);
    }

    // 처진 귀(Floppy) 피벗 생성 -> leftEarPivot / rightEarPivot
    _addFloppyEars(p) {
        const geo = new THREE.CapsuleGeometry(p.r, p.len, 6, 12);
        const mk = (sign) => {
            const pivot = new THREE.Group();
            pivot.position.set(sign * p.x, p.y, p.z);
            this.head.add(pivot);
            const ear = new THREE.Mesh(geo, this.accentMaterial);
            ear.position.set(0, -p.len / 2, 0);
            ear.scale.set(p.sx, p.sy, p.sz);
            ear.castShadow = true;
            pivot.add(ear);
            return pivot;
        };
        this.leftEarPivot = mk(-1);
        this.rightEarPivot = mk(1);
    }

    // 쫑긋 선 귀(Pointy) 피벗 생성 -> leftPointyPivot / rightPointyPivot
    _addPointyEars(p) {
        const geo = new THREE.ConeGeometry(p.r, p.len, p.seg || 7);
        const mk = (sign) => {
            const pivot = new THREE.Group();
            pivot.position.set(sign * p.x, p.y, p.z);
            this.head.add(pivot);
            const ear = new THREE.Mesh(geo, this.accentMaterial);
            ear.position.set(0, p.len * 0.35, 0);
            ear.rotation.z = sign * (p.tilt || 0);
            ear.scale.set(p.sx || 1, p.sy || 1, p.sz || 0.6);
            ear.castShadow = true;
            pivot.add(ear);
            if (p.inner) {
                const inner = new THREE.Mesh(new THREE.ConeGeometry(p.r * 0.5, p.len * 0.65, p.seg || 7), this.pinkMaterial);
                inner.position.set(0, -p.len * 0.04, p.r * 0.55);
                ear.add(inner);
            }
            return pivot;
        };
        this.leftPointyPivot = mk(-1);
        this.rightPointyPivot = mk(1);
    }

    // 다리 4개 + 발바닥
    _addLegs(p) {
        const geo = new THREE.CapsuleGeometry(p.r, p.len, 6, 10);
        const mk = (sx, sz) => {
            const pivot = new THREE.Group();
            pivot.position.set(sx * p.x, p.y, sz * p.z);
            this.body.add(pivot);
            const mesh = new THREE.Mesh(geo, this.furMaterial);
            mesh.position.set(0, -p.len / 2, 0);
            mesh.castShadow = true;
            pivot.add(mesh);
            if (p.paw) {
                const paw = new THREE.Mesh(new THREE.SphereGeometry(p.r * 1.05, 8, 8), this.bellyMaterial);
                paw.position.set(0, -p.len - p.r * 0.3, p.r * 0.2);
                paw.scale.set(1, 0.7, 1.25);
                pivot.add(paw);
            }
            return pivot;
        };
        this.legFL = mk(-1, 1);
        this.legFR = mk(1, 1);
        this.legBL = mk(-1, -1);
        this.legBR = mk(1, -1);
    }

    _addTongue(p) {
        this.tongue = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.1), this.tongueMaterial);
        this.tongue.position.set(p.x || 0, p.y, p.z);
        this.tongue.rotation.x = 0.2;
        this.tongue.visible = false;
        this.head.add(this.tongue);
    }

    // 고양이 수염
    _addWhiskers() {
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
        const geo = new THREE.CylinderGeometry(0.004, 0.004, 0.2, 4);
        geo.rotateZ(Math.PI / 2);
        const rows = [0.025, 0.0, -0.025];
        [-1, 1].forEach((sign) => {
            rows.forEach((dy) => {
                const w = new THREE.Mesh(geo, mat);
                w.position.set(sign * 0.16, -0.03 + dy, 0.18);
                w.rotation.y = sign * 0.35;
                w.rotation.z = dy * 4;
                this.head.add(w);
            });
        });
    }

    // ===== 🐶 강아지 =====
    _buildDog() {
        const bodyGeo = new THREE.CapsuleGeometry(0.25, 0.34, 8, 16);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMesh = new THREE.Mesh(bodyGeo, this.furMaterial);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        this.body.add(bodyMesh);

        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), this.bellyMaterial);
        belly.scale.set(0.82, 0.6, 1.0);
        belly.position.set(0, -0.1, 0.05);
        this.body.add(belly);

        // 머리
        this.headPivot = new THREE.Group();
        this.headPivot.position.set(0, 0.18, 0.24);
        this.body.add(this.headPivot);

        this.head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 16), this.furMaterial);
        this.head.position.set(0, 0.12, 0.04);
        this.head.castShadow = true;
        this.headPivot.add(this.head);

        // 긴 주둥이 + 코
        const snoutGeo = new THREE.CapsuleGeometry(0.1, 0.08, 6, 10);
        snoutGeo.rotateX(Math.PI / 2);
        this.snout = new THREE.Mesh(snoutGeo, this.bellyMaterial);
        this.snout.position.set(0, -0.05, 0.21);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), this.noseMaterial);
        nose.position.set(0, 0.05, 0.09);
        this.snout.add(nose);
        this.head.add(this.snout);

        this._addEyes({ x: 0.13, y: 0.08, z: 0.21, size: 0.045, sz: 0.6 });
        // 강아지: 처진 귀 / 쫑긋 귀 둘 다 어울림
        this._addFloppyEars({ x: 0.22, y: 0.06, z: 0.02, r: 0.075, len: 0.18, sx: 0.8, sy: 1, sz: 1.3 });
        this._addPointyEars({ x: 0.16, y: 0.2, z: 0.02, r: 0.1, len: 0.22, tilt: 0.25, sx: 1, sy: 1, sz: 0.55 });
        this._addTongue({ y: -0.13, z: 0.18 });
        this._addLegs({ x: 0.15, y: -0.12, z: 0.16, r: 0.075, len: 0.16, paw: true });

        // 흔드는 꼬리
        this.tailPivot = new THREE.Group();
        this.tailPivot.position.set(0, 0.1, -0.28);
        this.body.add(this.tailPivot);
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.16, 4, 8), this.accentMaterial);
        tail.position.set(0, 0.1, -0.04);
        tail.rotation.x = Math.PI / 4;
        tail.castShadow = true;
        this.tailPivot.add(tail);
    }

    // ===== 🐱 고양이 =====
    _buildCat() {
        const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.34, 8, 16);
        bodyGeo.rotateX(Math.PI / 2);
        const bodyMesh = new THREE.Mesh(bodyGeo, this.furMaterial);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        this.body.add(bodyMesh);

        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), this.bellyMaterial);
        belly.scale.set(0.8, 0.6, 1.0);
        belly.position.set(0, -0.08, 0.05);
        this.body.add(belly);

        // 머리(약간 납작한 둥근 얼굴)
        this.headPivot = new THREE.Group();
        this.headPivot.position.set(0, 0.2, 0.22);
        this.body.add(this.headPivot);

        this.head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), this.furMaterial);
        this.head.scale.set(1.05, 0.95, 1.0);
        this.head.position.set(0, 0.1, 0.02);
        this.head.castShadow = true;
        this.headPivot.add(this.head);

        // 작은 주둥이 + 핑크 코
        this.snout = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), this.bellyMaterial);
        this.snout.scale.set(1.1, 0.8, 0.85);
        this.snout.position.set(0, -0.07, 0.2);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), this.pinkMaterial);
        nose.position.set(0, 0.03, 0.07);
        this.snout.add(nose);
        this.head.add(this.snout);

        // 고양이 눈: 세로로 살짝 긴 아몬드형
        this._addEyes({ x: 0.11, y: 0.06, z: 0.19, size: 0.05, sy: 1.2, sz: 0.5 });
        // 고양이: 쫑긋 귀(핑크 안쪽) 강조, 처진 귀는 작게 fallback
        this._addPointyEars({ x: 0.13, y: 0.19, z: 0.0, r: 0.1, len: 0.24, tilt: 0.18, sx: 1, sy: 1, sz: 0.5, inner: true });
        this._addFloppyEars({ x: 0.18, y: 0.12, z: 0.0, r: 0.06, len: 0.12, sx: 0.9, sy: 1, sz: 1.2 });
        this._addWhiskers();
        this._addTongue({ y: -0.12, z: 0.16 });
        // 날렵한 다리
        this._addLegs({ x: 0.12, y: -0.1, z: 0.14, r: 0.06, len: 0.18, paw: true });

        // 아래로 늘어지며 부드럽게 이어지는 통통한 꼬리 (TubeGeometry로 끊김 없이)
        this.tailPivot = new THREE.Group();
        this.tailPivot.position.set(0, 0.06, -0.3);
        this.body.add(this.tailPivot);

        const tailCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.06, 0.0),    // 엉덩이에서 시작
            new THREE.Vector3(0, -0.02, -0.08), // 살짝 뒤로
            new THREE.Vector3(0, -0.16, -0.10), // 아래로 늘어짐
            new THREE.Vector3(0, -0.28, -0.04), // 더 아래로
            new THREE.Vector3(0, -0.34, 0.06)   // 끝이 앞으로 살짝 말림
        ]);
        const tailGeo = new THREE.TubeGeometry(tailCurve, 28, 0.052, 10, false);
        const tail = new THREE.Mesh(tailGeo, this.accentMaterial);
        tail.castShadow = true;
        this.tailPivot.add(tail);

        // 통통하고 밝은 꼬리 끝
        const tipPos = tailCurve.getPoint(1);
        const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), this.bellyMaterial);
        tailTip.position.copy(tipPos);
        tailTip.castShadow = true;
        this.tailPivot.add(tailTip);
    }

    // ===== 🐹 햄스터 =====
    _buildHamster() {
        // 동글동글 큰 몸 (지면에 닿도록 살짝 내려 배치)
        const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.33, 18, 18), this.furMaterial);
        bodyMesh.scale.set(1.0, 0.95, 1.05);
        bodyMesh.position.set(0, -0.02, 0);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        this.body.add(bodyMesh);

        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 14), this.bellyMaterial);
        belly.scale.set(0.7, 0.85, 0.55);
        belly.position.set(0, -0.05, 0.2);
        this.body.add(belly);

        // 몸에 거의 붙은 머리
        this.headPivot = new THREE.Group();
        this.headPivot.position.set(0, 0.16, 0.16);
        this.body.add(this.headPivot);

        this.head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), this.furMaterial);
        this.head.scale.set(1.1, 0.95, 1.0);
        this.head.position.set(0, 0.02, 0.06);
        this.head.castShadow = true;
        this.headPivot.add(this.head);

        // 통통한 볼주머니
        const cheekGeo = new THREE.SphereGeometry(0.13, 12, 12);
        const cheekL = new THREE.Mesh(cheekGeo, this.bellyMaterial);
        cheekL.position.set(-0.15, -0.08, 0.1);
        cheekL.scale.set(1.0, 0.95, 0.95);
        const cheekR = new THREE.Mesh(cheekGeo, this.bellyMaterial);
        cheekR.position.set(0.15, -0.08, 0.1);
        cheekR.scale.set(1.0, 0.95, 0.95);
        this.head.add(cheekL, cheekR);

        // 작은 핑크 코 + 앞니
        this.snout = new THREE.Group(); // 의미상 유지(애니메이션은 미사용)
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), this.pinkMaterial);
        nose.position.set(0, -0.03, 0.21);
        this.head.add(nose);
        const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.01), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
        teeth.position.set(0, -0.08, 0.2);
        this.head.add(teeth);

        // 가깝게 붙은 까만 눈
        this._addEyes({ x: 0.09, y: 0.02, z: 0.18, size: 0.04, sz: 0.7 });
        // 작고 동그란 귀 (처진=작은 둥근, 쫑긋=짧은 라운드)
        this._addFloppyEars({ x: 0.13, y: 0.16, z: -0.02, r: 0.06, len: 0.02, sx: 1, sy: 1, sz: 1 });
        this._addPointyEars({ x: 0.12, y: 0.17, z: -0.02, r: 0.07, len: 0.09, tilt: 0.1, sx: 1, sy: 0.8, sz: 0.8 });
        this._addTongue({ y: -0.1, z: 0.16 });
        // 아주 짧은 다리(둥근 몸 아래로 살짝)
        this._addLegs({ x: 0.13, y: -0.18, z: 0.1, r: 0.05, len: 0.05, paw: true });

        // 앞발(작은 손)
        const handGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const handL = new THREE.Mesh(handGeo, this.bellyMaterial);
        handL.position.set(-0.1, -0.12, 0.26);
        const handR = new THREE.Mesh(handGeo, this.bellyMaterial);
        handR.position.set(0.1, -0.12, 0.26);
        this.body.add(handL, handR);

        // 꼬리는 없지만 애니메이션 안전을 위해 피벗 유지(작은 뭉툭 꼬리)
        this.tailPivot = new THREE.Group();
        this.tailPivot.position.set(0, 0.05, -0.3);
        this.body.add(this.tailPivot);
        const nub = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), this.bellyMaterial);
        this.tailPivot.add(nub);
    }

    // 커스터마이징 정보 동기화 (색상 및 귀 타입)
    updateCustomization() {
        const state = gameState.state;

        // 털 색상 갱신
        if (state.furColor) {
            this.furMaterial.color.set(state.furColor);
        }

        // 귀 형태 노출 조절
        const isFloppy = state.earType === "floppy";

        this.leftEarPivot.visible = isFloppy;
        this.rightEarPivot.visible = isFloppy;

        this.leftPointyPivot.visible = !isFloppy;
        this.rightPointyPivot.visible = !isFloppy;
    }

    setClothes() {
        // Remove existing (GPU 누수 방지를 위해 지오메트리/머티리얼도 정리)
        this.equippedClothesMeshes.forEach(mesh => {
            if (mesh.parent) mesh.parent.remove(mesh);
            mesh.traverse((child) => {
                if (child.geometry && child.geometry.dispose) child.geometry.dispose();
                const m = child.material;
                if (Array.isArray(m)) m.forEach(mm => mm && mm.dispose && mm.dispose());
                else if (m && m.dispose) m.dispose();
            });
        });
        this.equippedClothesMeshes = [];

        const clothesList = Array.isArray(gameState.state.equippedClothes) ? gameState.state.equippedClothes : [];
        if (clothesList.length === 0) return;

        const clothesMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });

        clothesList.forEach(clothesId => {
            if (clothesId.includes("collar") || clothesId.includes("ribbon")) {
                const mat = clothesMat.clone();
                mat.color.setHex(0xe74c3c);
                const scarfGeo = new THREE.TorusGeometry(0.24, 0.04, 8, 16);
                const scarf = new THREE.Mesh(scarfGeo, mat);
                scarf.position.set(0, 0.08, 0.16);
                scarf.rotation.x = Math.PI / 3;
                if(this.species === 'hamster') { scarf.scale.set(1.2, 1.2, 1.2); scarf.position.y = 0.0; }
                scarf.castShadow = true;
                this.body.add(scarf);
                this.equippedClothesMeshes.push(scarf);
            }
            else if (clothesId.includes("hat")) {
                const mat = clothesMat.clone();
                mat.color.setHex(0x9b59b6);
                const hatGroup = new THREE.Group();
                const hat = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 12), mat);
                hat.position.set(0, 0.35, 0.0);
                hat.rotation.x = 0.05;
                if(this.species === 'hamster') { hat.position.y = 0.25; }
                hat.castShadow = true;
                hatGroup.add(hat);
                const pom = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.9 }));
                pom.position.set(0, 0.13, 0);
                hat.add(pom);
                this.head.add(hatGroup);
                this.equippedClothesMeshes.push(hatGroup);
            }
            else if (clothesId.includes("shirt") || clothesId.includes("cape")) {
                const mat = clothesMat.clone();
                mat.color.setHex(0x2ecc71);
                const shirtGeo = new THREE.CapsuleGeometry(0.262, 0.24, 8, 16);
                shirtGeo.rotateX(Math.PI / 2);
                const shirt = new THREE.Mesh(shirtGeo, mat);
                shirt.position.set(0, 0.01, 0);
                if(this.species === 'hamster') { shirt.scale.set(1.1, 1.1, 1.1); }
                shirt.castShadow = true;
                this.body.add(shirt);
                this.equippedClothesMeshes.push(shirt);
            }
            else if (clothesId.includes("glasses")) {
                const mat = clothesMat.clone();
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
                glassesGroup.add(frameL); glassesGroup.add(lensL);
                const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.04), frameMat);
                frameR.position.set(0.14, 0.08, 0.22);
                const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.05), lensMat);
                lensR.position.set(0.14, 0.08, 0.22);
                glassesGroup.add(frameR); glassesGroup.add(lensR);
                if(this.species === 'hamster') { glassesGroup.scale.set(0.8, 0.8, 0.8); glassesGroup.position.y = -0.05; }
                this.head.add(glassesGroup);
                this.equippedClothesMeshes.push(glassesGroup);
            }
            else if (clothesId.includes("crown")) {
                const mat = clothesMat.clone();
                mat.color.setHex(0xf1c40f);
                mat.metalness = 0.4;
                mat.roughness = 0.4;
                const crownGroup = new THREE.Group();
                const band = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 14, 1, true), mat);
                band.position.set(0, 0.34, 0);
                band.castShadow = true;
                crownGroup.add(band);
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2;
                    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 6), mat);
                    spike.position.set(Math.cos(a) * 0.13, 0.4, Math.sin(a) * 0.13);
                    crownGroup.add(spike);
                }
                const gem = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3 }));
                gem.position.set(0, 0.36, 0.13);
                crownGroup.add(gem);
                if (this.species === 'hamster') { crownGroup.scale.set(0.8, 0.8, 0.8); crownGroup.position.y = -0.08; }
                this.head.add(crownGroup);
                this.equippedClothesMeshes.push(crownGroup);
            }
            else if (clothesId.includes("headphone")) {
                const mat = clothesMat.clone();
                mat.color.setHex(0x34495e);
                const g = new THREE.Group();
                const band = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.022, 8, 22, Math.PI), mat);
                band.castShadow = true;
                g.add(band);
                const cupGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12);
                const cupMat = clothesMat.clone();
                cupMat.color.setHex(0xe74c3c);
                const cupL = new THREE.Mesh(cupGeo, cupMat); cupL.rotation.z = Math.PI / 2; cupL.position.set(-0.28, 0.0, 0.0); g.add(cupL);
                const cupR = new THREE.Mesh(cupGeo, cupMat); cupR.rotation.z = Math.PI / 2; cupR.position.set(0.28, 0.0, 0.0); g.add(cupR);
                if (this.species === 'hamster') { g.scale.set(0.8, 0.8, 0.8); }
                this.head.add(g);
                this.equippedClothesMeshes.push(g);
            }
            else if (clothesId.includes("wings")) {
                const mat = clothesMat.clone();
                mat.color.setHex(0xa29bfe);
                mat.transparent = true;
                mat.opacity = 0.85;
                mat.side = THREE.DoubleSide;
                const g = new THREE.Group();
                const wingGeo = new THREE.CircleGeometry(0.18, 14, 0, Math.PI);
                const mkWing = (sign) => {
                    const w = new THREE.Mesh(wingGeo, mat);
                    w.position.set(sign * 0.1, 0.06, -0.2);
                    w.rotation.y = sign * 0.6;
                    w.rotation.z = sign * 0.3;
                    w.scale.set(1, 1.4, 1);
                    return w;
                };
                g.add(mkWing(-1));
                g.add(mkWing(1));
                if (this.species === 'hamster') { g.scale.set(0.85, 0.85, 0.85); }
                this.body.add(g);
                this.equippedClothesMeshes.push(g);
            }
            else if (clothesId.includes("wizard") || clothesId.includes("flower")) {
                const mat = clothesMat.clone();
                mat.color.setHex(0x2c3e50);
                const hatGroup = new THREE.Group();
                const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 16), mat);
                brim.position.set(0, 0.32, 0.0);
                brim.rotation.x = 0.05;
                if(this.species === 'hamster') { brim.position.y = 0.22; }
                brim.castShadow = true;
                hatGroup.add(brim);
                const cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 12), mat);
                cone.position.set(0, 0.13, -0.02);
                cone.rotation.x = -0.15;
                brim.add(cone);
                this.head.add(hatGroup);
                this.equippedClothesMeshes.push(hatGroup);
            }
        });
    }

    changeState(newState, targetPos = null) {
        if (this.state === newState && newState !== 'walk' && newState !== 'walk_action') return;

        this.state = newState;
        this.stateTimer = 0;

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

    update(deltaTime, time) {
        this.stateTimer += deltaTime;

        // 1. 이동
        if (this.state === 'walk' || this.state === 'walk_action') {
            const dir = new THREE.Vector3().subVectors(this.targetPosition, this.group.position);
            const dist = dir.length();

            if (dist < 0.25) {
                if (this.state === 'walk_action' && this.stateTimer < 5.0) {
                    const angle = time * 2.0;
                    const r = 5.0;
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

        // 2. 애니메이션
        if (this.state === 'idle') {
            const breathe = Math.sin(time * 3.0) * 0.025;
            this.body.scale.set(1 + breathe, 1 + breathe, 1 + breathe);

            // 꼬리 흔들기
            this.tailPivot.rotation.y = Math.sin(time * 4) * 0.3;

            // 귀 흔들기 (귀 형태에 맞춰 분기 애니메이션)
            const isFloppy = gameState.state.earType === "floppy";
            if (isFloppy) {
                this.leftEarPivot.rotation.z = Math.sin(time * 2.0) * 0.04;
                this.rightEarPivot.rotation.z = -Math.sin(time * 2.0) * 0.04;
            } else {
                // 쫑긋 귀는 가끔 씰룩이는 앙증맞은 트위칭
                this.leftPointyPivot.rotation.z = (Math.sin(time * 0.5) > 0.9) ? Math.sin(time * 25) * 0.08 : 0;
                this.rightPointyPivot.rotation.z = (Math.sin(time * 0.6) > 0.9) ? -Math.sin(time * 25) * 0.08 : 0;
            }
            this.headPivot.rotation.y = Math.sin(time * 0.8) * 0.08;
        }
        else if (this.state === 'walk' || this.state === 'walk_action') {
            const speedFactor = (this.state === 'walk_action') ? 16 : 10;

            const swing = Math.sin(time * speedFactor) * 0.6;
            this.legFL.rotation.x = swing;
            this.legFR.rotation.x = -swing;
            this.legBL.rotation.x = -swing;
            this.legBR.rotation.x = swing;

            this.body.position.y = Math.abs(Math.sin(time * speedFactor)) * 0.07;
            this.tailPivot.rotation.y = Math.sin(time * 20) * 0.5;

            // 귀 펄럭임
            const isFloppy = gameState.state.earType === "floppy";
            if (isFloppy) {
                this.leftEarPivot.rotation.z = 0.15 + Math.abs(Math.sin(time * speedFactor)) * 0.1;
                this.rightEarPivot.rotation.z = -0.15 - Math.abs(Math.sin(time * speedFactor)) * 0.1;
            } else {
                this.leftPointyPivot.rotation.z = -0.05 + Math.sin(time * speedFactor) * 0.03;
                this.rightPointyPivot.rotation.z = 0.05 - Math.sin(time * speedFactor) * 0.03;
            }
        }
        else if (this.state === 'pet') {
            this.body.position.y = Math.abs(Math.sin(time * 16)) * 0.3;
            this.tailPivot.rotation.y = Math.sin(time * 35) * 0.8;

            const isFloppy = gameState.state.earType === "floppy";
            if (isFloppy) {
                this.leftEarPivot.rotation.z = 0.3 + Math.sin(time * 15) * 0.08;
                this.rightEarPivot.rotation.z = -0.3 - Math.sin(time * 15) * 0.08;
            } else {
                this.leftPointyPivot.rotation.z = 0.1 + Math.sin(time * 25) * 0.1;
                this.rightPointyPivot.rotation.z = -0.1 - Math.sin(time * 25) * 0.1;
            }

            if (this.stateTimer > 2.5) {
                this.changeState('idle');
            }
        }
        else if (this.state === 'sleep') {
            this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, 0.15, deltaTime * 5);
            this.body.position.y = 0;

            const foldAngle = Math.PI / 2.3;
            this.legFL.rotation.x = THREE.MathUtils.lerp(this.legFL.rotation.x, -foldAngle, deltaTime * 5);
            this.legFR.rotation.x = THREE.MathUtils.lerp(this.legFR.rotation.x, -foldAngle, deltaTime * 5);
            this.legBL.rotation.x = THREE.MathUtils.lerp(this.legBL.rotation.x, foldAngle, deltaTime * 5);
            this.legBR.rotation.x = THREE.MathUtils.lerp(this.legBR.rotation.x, foldAngle, deltaTime * 5);

            this.headPivot.rotation.x = THREE.MathUtils.lerp(this.headPivot.rotation.x, 0.25, deltaTime * 5);

            // 귀 내려놓기
            const isFloppy = gameState.state.earType === "floppy";
            if (isFloppy) {
                this.leftEarPivot.rotation.z = THREE.MathUtils.lerp(this.leftEarPivot.rotation.z, 0.02, deltaTime * 5);
                this.rightEarPivot.rotation.z = THREE.MathUtils.lerp(this.rightEarPivot.rotation.z, -0.02, deltaTime * 5);
            } else {
                this.leftPointyPivot.rotation.z = THREE.MathUtils.lerp(this.leftPointyPivot.rotation.z, -0.15, deltaTime * 5);
                this.rightPointyPivot.rotation.z = THREE.MathUtils.lerp(this.rightPointyPivot.rotation.z, 0.15, deltaTime * 5);
            }

            this.tailPivot.rotation.x = THREE.MathUtils.lerp(this.tailPivot.rotation.x, -Math.PI / 3, deltaTime * 5);
            this.tailPivot.rotation.y = 0;

            const sleepBreathe = Math.sin(time * 1.5) * 0.015;
            this.body.scale.set(1 + sleepBreathe, 1 + sleepBreathe, 1 + sleepBreathe);
        }
        else if (this.state === 'eat') {
            this.headPivot.rotation.x = 0.4 + Math.sin(time * 16) * 0.15;
            this.tailPivot.rotation.y = Math.sin(time * 12) * 0.4;

            const crouch = Math.PI / 8;
            this.legFL.rotation.x = THREE.MathUtils.lerp(this.legFL.rotation.x, -crouch, deltaTime * 5);
            this.legFR.rotation.x = THREE.MathUtils.lerp(this.legFR.rotation.x, -crouch, deltaTime * 5);

            if (this.stateTimer > 4.0) {
                this.changeState('idle');
            }
        }

        // 수면 상태 외 복구
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
