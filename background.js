var messageQueue = [];
var processingMessage = false;
// 設定是否為debug模式
const debug = false;
if (!debug) {
  console.log = function () {}; // 覆蓋 console.log，使其不執行任何操作
}
console.log("background.js 啟動");
// 監聽來自 Content Script 的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // 在這裡處理收到的消息
  console.log("Received message from content script:", message);
  
  // 將訊息加入到訊息佇列中
  messageQueue.push(message);

  // 如果沒有正在處理訊息，則開始處理佇列中的訊息
  if (!processingMessage) {
    processNextMessage();
  }


});

function chromeSendMessage(tabId, data) {
  chrome.tabs.sendMessage(tabId, data, function(response) {
    if (chrome.runtime.lastError) {
    
    } else {
      // 處理收到的回應
    }
    // 處理完畢後，處理下一個訊息
    processingMessage = false;
    processNextMessage();
  });
}


function processNextMessage() {
  // 如果佇列中還有訊息，則取出下一個訊息進行處理
  if (messageQueue.length > 0) {
    processingMessage = true;
    var message = messageQueue.shift();


    // 檢查是否已經存在 "bossTime.html" 頁面
    chrome.tabs.query({}, function(tabs) {
      let bossTimeTab = tabs.find(tab => tab.title === "LOA-BossTime");
      if (bossTimeTab) {
        // 如果頁面已經存在，則向其發送資料
        chromeSendMessage(bossTimeTab.id, message);
      } else {
        // 如果頁面不存在且未在創建中，則創建一個新的頁面並向其發送資料
        createBossTimePage();
        setTimeout(function() {
          // 在這裡放置需要延遲處理的程式碼
          processNextMessage();
        }, 10000); // 1000 毫秒 = 1 秒
      }
    });
  
  }
}



function createBossTimePage(message) {
  chrome.windows.getCurrent(function(currentWindow) {
    var screenWidth = currentWindow.width;
    var screenHeight = currentWindow.height;
    var windowLeft = Math.max(0, Math.floor((screenWidth - 800) / 2));
    var windowTop = Math.max(0, Math.floor((screenHeight - 600) / 2));

    chrome.tabs.create({
        url: "bossTime/bossTime.html",
        active: true,
    }, function(tab) {
      // 新分頁創建成功後的回調函數
      console.log("New tab created with ID:", tab.id);
      // 在新分頁中執行其他操作，例如向新分頁發送消息

      // 等待新頁面完全加載後再執行 JavaScript 代碼
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          // 移除監聽器，以免重複執行 JavaScript 代碼
          chrome.tabs.onUpdated.removeListener(listener);
          
          if (tabId === tab.id && changeInfo.status === 'complete') {
            // 創建新頁面後立即處理訊息
            chromeSendMessage(tab.id, message);
          }
      }); 
    });
  });
}