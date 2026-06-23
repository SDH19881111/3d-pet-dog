// Cloudflare Pages Serverless API: 로그인 (Login)

export async function onRequestPost(context) {
    const { env, request } = context;
    
    try {
        const { username, password } = await request.json();
        
        if (!username || !password) {
            return new Response(JSON.stringify({ error: "아이디와 비밀번호를 모두 입력해주세요." }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // KV 미설정 시의 Mock 로그인 폴백 (로컬에서 테스트 용이성 극대화)
        if (!env.PUPPY_DB) {
            console.warn("PUPPY_DB KV namespace가 바인딩되지 않았습니다. 테스트 모드로 강제 로그인 처리합니다.");
            return new Response(JSON.stringify({ 
                success: true, 
                message: "로그인 완료 (테스트 모드)",
                username,
                petState: {
                    petName: "테스트바둑이",
                    affinityLevel: 1,
                    affinityXP: 10,
                    hunger: 80,
                    thirst: 90,
                    cleanliness: 95,
                    placedItems: [],
                    poops: [],
                    equippedClothes: null,
                    furColor: "#ffcc80",
                    earType: "floppy",
                    trash: []
                }
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 유저 정보 가져오기
        const userRaw = await env.PUPPY_DB.get("user:" + username);
        if (!userRaw) {
            return new Response(JSON.stringify({ error: "존재하지 않는 아이디입니다." }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const userData = JSON.parse(userRaw);
        
        // 비밀번호 대조
        if (userData.password !== password) {
            return new Response(JSON.stringify({ error: "비밀번호가 올바르지 않습니다." }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: "로그인에 성공했습니다!",
            username,
            petState: userData.petState
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
