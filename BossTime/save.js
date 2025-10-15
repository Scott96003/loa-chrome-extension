// 1. 全域變數：用於儲存計時器 ID
let saveTimer = null; 
// 2. 常數：設定延遲時間 (30 秒 = 30,000 毫秒)
const DEBOUNCE_DELAY = 30000; 
// 3. 新增常數：設定要保留的最大訊息數量
const MAX_MESSAGES = 50; 
/**
 * 實際執行存檔的邏輯 (只會被計時器觸發)
 */
function actualSaveLogic() {
    console.log("✅ 執行延遲存檔：30 秒內無操作，觸發實體存檔。");
    console.log(bossListData);
    
    // 假設 bossListData、messageList、rebootTime 已定義
    saveBossListToDB(bossListData);
    // ----------------------------------------------------
    // 【關鍵優化點】: 截取最新的 50 筆訊息
    // 假設 messageList 是一個 Array，且新訊息是附加在陣列尾部。
    if (config.messageList.length > MAX_MESSAGES) {
        // 使用 slice 截取陣列的最後 MAX_MESSAGES 筆資料
        // 例如：長度 100，slice(-50) 會取出索引 50 到 99 的資料
        config.messageList = config.messageList.slice(-MAX_MESSAGES);
        console.log(`⚠️ messageList 長度超過 ${MAX_MESSAGES} 筆，已截取最新的 ${MAX_MESSAGES} 筆進行存檔。`);
    }
    // ----------------------------------------------------
    localStorage.setItem("messageList", JSON.stringify(config.messageList));
    localStorage.setItem("rebootTime", config.rebootTime.toISOString());
    localStorage.setItem("lastRefreshBossTime", config.lastRefreshBossTime);
    localStorage.setItem("voiceCount", config.voiceCount);


    // 存檔完成後，將計時器設為 null，表示目前沒有存檔正在排程中
    saveTimer = null; 
    console.log("⭐ 存檔完成，等待下一次操作。");
}

/**
 * 用戶調用的函數：負責排程存檔
 */
function saveToLocalStorage() {
    // 步驟 1: 清除前一個計時器 (重設延遲時間)
    if (saveTimer) {
        clearTimeout(saveTimer);
        console.log("⏳ 檢測到新請求，清除上一個計時器，重新開始 30 秒倒數。");
    }

    // 步驟 2: 設置一個新的計時器
    // 這表示：「在 30 秒後執行 actualSaveLogic」
    saveTimer = setTimeout(actualSaveLogic, DEBOUNCE_DELAY);
    
    console.log("🔔 資料更新，已排程存檔。若 30 秒內沒有新的請求，將執行存檔。");
}