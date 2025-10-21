/**
 * 處理音量載入和設定
 */
function initializeVoiceSettings() {
    // 使用 ||= (空值合併運算子) 簡化預設值設定
    let voiceCount = localStorage.getItem("voiceCount") || 50;
    config.voiceCount = parseInt(voiceCount, 10); // 確保是數字

    const slider = document.getElementById("percentageSlider");
    const display = document.getElementById("percentageDisplay");
    
    // 檢查元素是否存在，避免錯誤
    if (slider && display) {
        slider.value = config.voiceCount;
        display.textContent = `${config.voiceCount}%`;
    }
}

/**
 * 處理訊息列表載入和繪製
 */
function initializeMessageList() {
    const storedMessageList = localStorage.getItem("messageList");
    config.messageList = storedMessageList ? JSON.parse(storedMessageList) : [];
    
    // 使用 for...of 迴圈代替 forEach
    for (const item of config.messageList) {
        drawMessage(item);
    }
}

/**
 * 處理重啟時間 (rebootTime) 的邏輯
 */
function initializeRebootTime() {
    const storedRebootTime = new Date(localStorage.getItem("rebootTime") || baseTime);
    config.rebootTime = storedRebootTime;
}

/**
 * 載入 Boss 資料並初始化表格與數據
 */
async function loadAndInitializeBossData() {
    let bossListData = defaultData; // 預設先使用 defaultData
    let maxDeathTime = null;

    try {
        // 嘗試從 DB 載入持久化資料
        const persistedData = await loadBossListFromDB(); 
        
        if (persistedData && persistedData.length > 0) {
            bossListData = persistedData; // 成功載入則覆蓋預設資料
            console.log("✅ 已成功載入持久化資料。");
        } else {
            console.log("⚠️ 未載入到持久化資料，已使用預設資料。");
        }
    } catch (error) {
        console.error("⛔ 載入 Boss 清單時發生錯誤，使用預設資料。", error);
    }

    // 重新畫出所有數據
    const bossTableBody = document.querySelector("#bossList tbody");
    if (bossTableBody) {
        bossTableBody.innerHTML = ""; // 清空 table
    }
    
    // 使用 map 和 reduce 優化數據處理和最大死亡時間查找
    bossListData = bossListData.map(boss => {
        // 在新增資料時計算並附加結果
        boss.result = findLostBoss(boss);
        boss.respawnCount = boss.result.rebornCount;
        addBossTR(boss); // 繪製表格列

        return boss; // 返回更新後的 Boss 物件
    });
    
    // 找到最後一筆死亡時間 (使用 reduce 簡化邏輯)
    if (bossListData.length > 0) {
        maxDeathTime = bossListData.reduce((max, boss) => {
            const currentDeath = new Date(boss.death);
            return (currentDeath > max) ? currentDeath : max;
        }, new Date(bossListData[0].death)); // 以第一個 death 作為初始值
    }
    
    // 將最終的 bossListData 存儲到全域/外部變數中
    window.bossListData = bossListData; 
    
    return maxDeathTime; // 返回計算出的最大死亡時間
}

/**
 * 主載入函數
 */
async function loadFromLocalStorage() {
    console.log("--- loadFromLocalStorage 啟動 ---");
    
    // 步驟 1: 初始化 UI 設定
    initializeVoiceSettings();
    initializeMessageList();
    initializeRebootTime();

    config.lastRefreshBossTime = localStorage.getItem("lastRefreshBossTime") || 24;
    
    // 步驟 2: 載入並處理核心 Boss 資料
    const maxDeathTime = await loadAndInitializeBossData();
    
    // 步驟 3: 刷新介面
    refresh(); // 執行刷新數據的函數

    // 步驟 4: 判斷是否需要獲取歷史數據
    if (maxDeathTime) {
        console.log("最後死亡時間:", maxDeathTime.toLocaleString());

        const sevenDays = 7 * 24 * 60 * 60 * 1000; // 7 天的毫秒數
        const timeDifference = new Date() - maxDeathTime; // 現在時間與最後記錄時間的差值
        
        if (timeDifference > sevenDays) {
            // 如果超過 7 天，則從 7 天前開始獲取數據
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            console.log(`⏳ 資料超過 7 天，從 ${sevenDaysAgo.toLocaleString()} 開始獲取舊資料。`);
            getOldData(sevenDaysAgo);
        } else {
            // 否則，從最後記錄時間開始獲取數據
            console.log(`⏳ 資料在 7 天內，從最後死亡時間 ${maxDeathTime.toLocaleString()} 開始獲取舊資料。`);
            getOldData(maxDeathTime);
        }
    } else {
        // 如果沒有任何 Boss 資料 (連預設都沒有)，從 7 天前開始獲取
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        console.log("🚫 無任何 Boss 記錄，從 7 天前開始獲取舊資料。");
        getOldData(sevenDaysAgo);
    }
    
    console.log("--- loadFromLocalStorage 完成 ---");
}

function clearBossData(id) {
    bossListData.forEach(function(item) {
        item.death = ""
        item.emblem = ""
        item.deathList = []
    })
}