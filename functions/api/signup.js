// Cloudflare Pages Serverless API: 회원가입 (Signup)

export async function onRequestPost(context) {
    const { env, request } = context;
    
    try {
        const { username, password, petCustomization } = await request.json();
        
        if (!username || !password) {
            return new Response(JSON.stringify({ error: "아이디와 비밀번호를 입력해주세요." }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 로컬/배포 상태에서 KV 데이터베이스가 설정되지 않았을 때의 안전한 폴백(Mock DB)
        if (!env.PUPPY_DB) {
            console.warn("PUPPY_DB KV namespace가 바인딩되지 않았습니다. 임시 메모리 모드로 진행합니다.");
            return new Response(JSON.stringify({ 
                success: true, 
                message: "가입 완료 (임시 메모리 저장 모드 - 대시보드에서 KV 바인딩이 필요합니다!)",
                username,
                petState: {
                    petName: petCustomization.name || "바둑이",
                    affinityLevel: 1,
                    affinityXP: 0,
                    hunger: 100,
                    thirst: 100,
                    cleanliness: 100,
                    placedItems: [],
                    poops: [],
                    equippedClothes: null,
                    furColor: petCustomization.furColor || "#ffcc80",
                    earType: petCustomization.earType || "floppy",
                    trash: []
                }
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 기존 유저가 존재하지 않는지 조회
        const existingUser = await env.PUPPY_DB.get("user:" + username);
        if (existingUser) {
            return new Response(JSON.stringify({ error: "이미 존재하는 아이디입니다." }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 초기 강아지 상태 생성
        const initialPetState = {
            petName: petCustomization.name || "바둑이",
            affinityLevel: 1,
            affinityXP: 0,
            hunger: 100,
            thirst: 100,
            cleanliness: 100,
            placedItems: [],
            poops: [],
            equippedClothes: null,
            furColor: petCustomization.furColor || "#ffcc80",
            earType: petCustomization.earType || "floppy",
            trash: [],
            lastSaved: Date.now()
        };

        const userData = {
            password: password, // 데모용 단순 텍스트 저장 (필요 시 복잡한 해싱 적용 가능)
            petState: initialPetState
        };

        // KV 저장소에 저장
        await env.PUPPY_DB.put("user:" + username, JSON.stringify(userData));

        return new Response(JSON.stringify({ 
            success: true, 
            message: "성공적으로 회원가입 되었습니다!",
            username,
            petState: initialPetState
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: "서버 오류: " + err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
