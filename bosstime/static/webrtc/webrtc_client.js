startClient('spoke');

function webRTC_handleMessage(peerId, received) {
    try {
        
        console.log("[WEBRTC] 收到WEBRTC訊息", received)
        const type = received.type;

        switch (type) {
            case 'Sync_Boss_Data':
                // 處理資料同步邏輯
                console.log('[WEBRTC] 正在處理 Sync_Boss_Data 數據同步...');
                bossListData = received.bossListData;
                config.messageList = received.config.messageList;
                config.rebootTime = new Date(received.config.rebootTime);
                tracker.gateOpenTime = new Date(received.gateOpenTime);
                tracker.gateCloseTime = new Date(received.gateCloseTime);
                reDrawBossList();
                reDrawMessage();
                refresh();
                tracker.processDeathArray(抓取所有龍的死亡時間()); 
                console.log('[WEBRTC] 正在處理 Sync_Boss_Data 數據同步...', "完成");
                break;
            case 'Boss_Death': // 正確: 處理聊天訊息\
                // 處理聊天訊息邏輯
                console.log('[WEBRTC] 正在處理Boss_Death訊息...', received.deathInfo);                
                updateBossData(received.deathInfo);
                break;
            case 'Ack_Sync':
                break;
            default:
                console.log('[WEBRTC] 收到未知訊息類型:', type);
                break;
        }
    } catch (e) {
        console.error("[WEBRTC] 接收數據錯誤:", e, event);
    }
}

for (const [key, value] of Object.entries(WEBHook_URL)) {
    WEBHook_URL[key] = ""
}