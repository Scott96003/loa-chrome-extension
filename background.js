// ====== Configuration and State ======
var messageQueue = [];
var processingMessage = false;
// 設定是否為debug模式
const debug = false;

// 優化：使用函數來判斷是否啟用 console.log
if (!debug) {
  // 覆蓋 console.log，使其不執行任何操作
  console.log = function () {}; 
}
console.log("background.js 啟動");


// ====== Chrome API Callbacks ======

// 監聽來自 Content Script 的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // Content Script 的廣播訊息將在此處收到
  console.log("Received message from content script:", message);
  
  // 將訊息加入到訊息佇列中
  messageQueue.push(message);

  // 如果沒有正在處理訊息，則開始處理佇列中的訊息
  if (!processingMessage) {
    processNextMessage();
  }
});

/**
 * 發送訊息給指定 Tab，並在完成後處理佇列中的下一個訊息。
 * @param {number} tabId - 目標分頁 ID。
 * @param {object} data - 要傳送的訊息資料。
 */
function chromeSendMessage(tab, data) {
  // 這裡使用單次訊息傳遞，如果資料量大建議改為 Port
  chrome.tabs.sendMessage(tab.id, data, function(response) {
    if (chrome.runtime.lastError) {
      console.error("background.js 發送訊息到 ", tab.url, " 失敗,", chrome.runtime.lastError, "Data:", data);
    } else {
      console.log("background.js 發送訊息到 ", tab.url, " 成功，回應:", response);
      // 處理收到的回應
    }
    
    // 處理完畢後，釋放鎖並處理下一個訊息 (無論成功或失敗)
    processingMessage = false;
    processNextMessage();
  });
}


/**
 * 處理訊息佇列中的下一個訊息。
 */
function processNextMessage() {
  // 如果佇列中還有訊息，則取出下一個訊息進行處理
  if (messageQueue.length > 0) {
    // 只有當 lock 未啟動時才設定 true，避免遞迴鎖定
    if (!processingMessage) {
        processingMessage = true;
    }
    // **修正：在查詢 Tab 之前就取出訊息，避免在 createBossTimePage 流程中遺失**
    const message = messageQueue.shift(); 

    // 檢查是否已經存在 "bossTime.html" 頁面
    chrome.tabs.query({}, function(tabs) {
      const searchPath = "bosstime/bosstime.html"; // 搜尋路徑的標準形式（通常使用小寫）

      let bossTimeTab = tabs.find(tab => 
        tab.url && tab.url.toLowerCase().includes(searchPath.toLowerCase())
      );
      
      if (bossTimeTab) {
        if (message == "回到LOA-BossTime") {
          chrome.tabs.update(bossTimeTab.id, { active: true });
        }
        // 如果頁面已經存在，則向其發送資料
        chromeSendMessage(bossTimeTab, message);
      } else {
        // **修正 1：移除 setTimeout 及其遞迴。**
        // **修正 2：將 message 傳遞給 createBossTimePage。**
        console.log("目標頁面不存在，創建新頁面並傳遞訊息。");
        createBossTimePage(message);
        
        // 注意：這裡不調用 processNextMessage()。
        // 下一個訊息會等到新分頁創建流程完全結束後，在 chromeSendMessage 內部被調用。
      }
    });
  
  } else {
    // 佇列為空時，釋放鎖
    processingMessage = false;
  }
}



/**
 * 創建 BossTime 頁面並在載入完成後發送訊息。
 * @param {object} message - 要在頁面載入完成後發送的訊息。
 */
// **修正 3：確保函數接收 message 參數**
function createBossTimePage(message) {
  chrome.tabs.create({
      url: "bossTime/bossTime.html",
      active: true,
  }, function(tab) {
    console.log("New tab created with ID:", tab.id);

    // 定義監聽器函數
    const listener = function(tabId, changeInfo) {
        
        // **修正 4：正確檢查狀態，避免過早移除監聽器**
        if (tabId === tab.id && changeInfo.status === 'complete') {
          
          // 處理完成後，才移除監聽器
          chrome.tabs.onUpdated.removeListener(listener);
          
          // 創建新頁面後立即處理訊息
          // 傳遞給新頁面的第一個訊息
          chromeSendMessage(tab, message); 
        }
        // 如果狀態不是 'complete'，則不做任何事，等待下一次觸發。
    };
    
    // 啟動監聽器
    chrome.tabs.onUpdated.addListener(listener); 
  });
}