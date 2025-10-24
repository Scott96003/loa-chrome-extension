/**
 * 寫入 Cookie
 * @param {string} name - Cookie 名稱
 * @param {string} value - Cookie 值
 * @param {number} days - Cookie 過期天數
 */
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    // 使用 encodeURIComponent 確保值中沒有特殊字元
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
}

/**
 * 從 Cookie 讀取值
 * @param {string} name - Cookie 名稱
 * @returns {string | null} Cookie 值或 null
 */
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

class BossEventTracker {
    constructor() {
        this.gateOpenTime = null;
        this.gateCloseTime = null; // 該變數現在將保留上一次的關閉時間
        this.dragonIDs = [91516,91202,91605];
        // 閒置時間 COOLDOWN_MS 僅作為 GATE_DURATION_MS 存在
        this.GATE_DURATION_MS = 3 * 60 * 60 * 1000; 
    }

    resetGatePeriod() {
        // 僅清除 gateOpenTime，讓 gateCloseTime 保留歷史紀錄
        this.gateOpenTime = null;
        this.gateCloseTime = null;
        this.processDeathArray(抓取所有龍的死亡時間()); 
    }


    // 檢查bossData 是否需要處理
    checkBossData(bossData) {
        if (this.dragonIDs.includes(parseInt(bossData.id))) {
            this.processBossDeath(bossData.death)
        }
    }
    /**
     * 將當前狀態儲存到 Cookie
     */
    saveToCookie() {
        // 將 Date 物件轉換為毫秒時間戳 (Number) 儲存，以確保精確
        const data = {
            open: this.gateOpenTime ? this.gateOpenTime.getTime() : null,
            close: this.gateCloseTime ? this.gateCloseTime.getTime() : null,
        };
        // 將物件轉換為 JSON 字串，並設定 365 天過期
        setCookie('DragonGateStatus', JSON.stringify(data), 365);
    }

    /**
     * 從 Cookie 載入狀態
     */
    loadFromCookie() {
        const cookieData = getCookie('DragonGateStatus');
        if (cookieData) {
            try {
                const data = JSON.parse(cookieData);
                
                // 將時間戳 (Number) 轉換回 Date 物件
                this.gateOpenTime = data.open ? new Date(data.open) : null;
                this.gateCloseTime = data.close ? new Date(data.close) : null;
                
                console.log("[Cookie 載入] 龍門狀態已成功載入。");
            } catch (e) {
                console.error("[Cookie 錯誤] 無法解析龍門狀態 Cookie。", e);
            }
        }
        // 如果沒有上次開門的時間
        if (this.gateCloseTime == null) {
            // 執行分析
            this.processDeathArray(抓取所有龍的死亡時間()); 
        }
    }

    /**
     * 處理新的 Boss 死亡時間 (需在更新數據後呼叫 saveToCookie())
     */
    processBossDeath(newDeathTimeInput) {
        const newDeathTime = new Date(newDeathTimeInput);

        // 1. 週期保護：判斷是否在龍門開啟期間 (忽略這次死亡)
        if (this.gateCloseTime && newDeathTime < this.gateCloseTime) {
            console.log("不在龍門開啟期間 (忽略這次死亡)", newDeathTime)
            return; 
        }
        console.log(`[🚨 週期重啟 🚨] 龍門關閉後接收到擊殺紀錄，立即開啟新的龍門週期。`);
        // 2. 觸發開啟或重啟週期 (包含首次擊殺和龍門關閉後的擊殺)
        // 龍門週期開始：以本次擊殺時間作為開啟時間
        this.gateOpenTime = newDeathTime; 
        this.gateCloseTime = new Date(this.gateOpenTime.getTime() + this.GATE_DURATION_MS);

        

        console.log(`開啟時間: ${this.gateOpenTime.toLocaleString()}，關閉時間: ${this.gateCloseTime.toLocaleString()}`);
        // 邏輯執行結束後，呼叫儲存
        this.saveToCookie();
        // 發送到dc
        sendTextWebhook(WEBHook_URL.龍門, this.displayStatus());
    }

    /**
     * 從 Boss 死亡時間陣列中分析並更新龍門狀態。
     */
    processDeathArray(deathTimesArray) {
        // 定義 3 小時的毫秒數
        const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
        // 定義兩天的毫秒數 (48 小時)
        const FORTY_EIGHT_HOURS_MS = 2 * 24 * 60 * 60 * 1000; 
        // 分析前清空所有狀態
        this.gateOpenTime = null;
        this.gateCloseTime = null;
        
        // 1. 標準化時間字串 (將 '-' 替換為 '/') 並排序
        let sortedTimes = deathTimesArray
            .map(time => new Date(time.replace(/-/g, '/')))
            .filter(date => !isNaN(date.getTime()))
            .sort((a, b) => a.getTime() - b.getTime()); // 由早到晚排序

        // --- 新增篩選步驟 ---

        // 2.【判斷一：只取最後 48 小時的資料】
        
        // 取得最新 (最後一個) 死亡時間的時間戳記
        if (sortedTimes.length > 0) {
            const latestTime = sortedTimes[sortedTimes.length - 1].getTime();
            
            // 篩選出時間戳記在「最新時間 - 48 小時」之後的所有資料
            sortedTimes = sortedTimes.filter(deathTime => {
                return deathTime.getTime() >= latestTime - FORTY_EIGHT_HOURS_MS;
            });
        }

        // 3.【判斷二：如果區間間隔超過 3 小時，只取最後那個區段的資料】

        let lastSegment = [];
        if (sortedTimes.length > 0) {
            // 永遠將最後一個時間點納入最後區段
            lastSegment.push(sortedTimes[sortedTimes.length - 1]);
            
            // 從倒數第二個時間點開始往前遍歷
            for (let i = sortedTimes.length - 2; i >= 0; i--) {
                const currentTime = sortedTimes[i];
                const nextTime = sortedTimes[i + 1]; // 因為是倒著遍歷，所以下一個就是後面的時間

                // 檢查兩個相鄰時間點的間隔是否超過 3 小時
                if (nextTime.getTime() - currentTime.getTime() > THREE_HOURS_MS) {
                    // 如果間隔超過，則代表這是一個新的區段，我們只取 `lastSegment`，並停止往前遍歷
                    break; 
                }
                
                // 如果間隔小於等於 3 小時，則將當前時間點加入最後區段
                lastSegment.unshift(currentTime); // 使用 unshift 保持時間順序
            }
            
            // 將篩選結果替換回 sortedTimes
            sortedTimes = lastSegment;
        }

        // 4. 依序處理每個事件 (使用篩選後的 sortedTimes)
        for (const deathTime of sortedTimes) {
            this.processBossDeath(deathTime); 
        }
    }

/**
     * 顯示目前的龍門狀態，以純文字形式輸出 (24 小時制)
     */
    displayStatus() {
        const currentTime = new Date();
        
        // 統一的時間格式設定
        const timeFormatOptions = {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        };
        const formatTime = (date) => date.toLocaleString('zh-TW', timeFormatOptions);
        
        let statusMessage = "";
        
        // A. 龍門週期開啟中 (檢查當前時間是否在 開啟 和 關閉 之間)
        if (this.gateOpenTime && currentTime < this.gateCloseTime) {
            
            const minutesToClose = Math.ceil((this.gateCloseTime.getTime() - currentTime.getTime()) / 60000);

            statusMessage = `
🚨 龍門開啟中 🚨
開啟時間: ${formatTime(this.gateOpenTime)}
關閉時間: ${formatTime(this.gateCloseTime)}
剩餘時間: 約 ${minutesToClose} 分鐘  <t:${this.gateCloseTime.getTime() / 1000}:R> 
            `.trim();
        
        } else {
            // B. 龍門已關閉
            statusMessage = `⚠️ 龍門已關閉。`;


            // 顯示上次關閉時間
            if (this.gateCloseTime) {
                statusMessage += `\n關閉時間: ${formatTime(this.gateCloseTime)}`;
            }
            if (this.gateOpenTime) {
                // 將開啟時間清除
                this.gateOpenTime = null;
                // 邏輯執行結束後，呼叫儲存
                this.saveToCookie();
                // 發送到dc
                sendTextWebhook(WEBHook_URL.龍門, statusMessage);
                
            }
        }
        
        return statusMessage;
    }
}

function updateDragonGateDisplay() {
    const statusHTML = tracker.displayStatus(); // 假設 tracker 是 BossEventTracker 的實例
    const displayElement = document.getElementById('dragonGateStatusDisplay');
    if (displayElement) {
        // 使用 innerHTML 來渲染表格
        displayElement.innerHTML = statusHTML;
    }
}

function 抓取所有龍的死亡時間() {
    return bossListData.filter(function(item) {
          return (([91516,91202,91605].includes(parseInt(item.id)) == true) );
          }).flatMap(boss => {
        // 確保 deathList 存在且是陣列
        if (boss.deathList && Array.isArray(boss.deathList)) {
            // 提取每個 deathList 元素中的 'death' 屬性
            return boss.deathList.map(item => item.death).sort();
        }
        return []; // 如果沒有 deathList，則返回空陣列
    });
}


const tracker = new BossEventTracker();
// 在應用程式啟動時，第一時間載入狀態
tracker.loadFromCookie(); 

// 記得在應用程式的主循環或事件觸發後呼叫 updateDragonGateDisplay()
setInterval(updateDragonGateDisplay, 1000); 