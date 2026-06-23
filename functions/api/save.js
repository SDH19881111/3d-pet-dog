// Cloudflare Pages Serverless API: 상태 저장 (Save)

export async function onRequestPost(context) {
    const { env, request } = context;
    
    try {
        const { username, petState } = await request.json();
        
        if (!username || !petState) {
            return new Response(JSON.stringify({ error: "필수 데이터 누락" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // KV 미설정 시의 Mock 저장 폴백
        if (!env.PUPPY_DB) {
            return new Response(JSON.stringify({ success: true, message: "임시 메모리에 저장됨" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 기존 유저 데이터 조회
        const userRaw = await env.PUPPY_DB.get("user:" + username);
        if (!userRaw) {
            return new Response(JSON.stringify({ error: "유저를 찾을 수 없습니다." }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        const userData = JSON.parse(userRaw);
        
        // 펫 상태 업데이트 및 저장
        userData.petState = { ...petState, lastSaved: Date.now() };
        await env.PUPPY_DB.put("user:" + username, JSON.stringify(userData));

        return new Response(JSON.stringify({ 
            success: true, 
            message: "클라우드 저장 성공!" 
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: "저장 실패: " + err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
