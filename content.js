// 清單中的關鍵字
let keywords = ["LoA363 頭目擊殺記錄 Boss Kills"];

let 準備獲取Boss死亡的最早時間 = "";
let 當前資料的最後時間 = new Date()
let bossScrollClass = "scroller__36d07";
let bossCellDivClass = ".gridContainer__623de";
let bossCellNameClass = ".embedFieldName__623de";
let bossCellValueClass = "embedFieldValue__623de";


// 在 content script 中
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log("接收到來自BossTime Message:", message);

    if (message.action == "getData") {
        準備獲取Boss死亡的最早時間 = message.dayTime;
        
        // 使用 IIFE (立即執行函式) 來處理 async 邏輯並回覆
        (async () => {
            await 取得Boss歷史資料();
            // 在 取得Boss歷史資料 流程完全結束後，發送回應
            sendResponse({status: "content.js 接收" + sender.tab + "成功，資料：" + message}); 
        })();

        // **關鍵：返回 true，表示將會異步回覆**
        return true; 
    }
});

// 輔助函式：等待指定時間
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function 取得Boss歷史資料() {
    console.log("接收到來自BossTime Message:", "重新取得資料");
    
    // **檢查 1：bossScroll 是否存在**
    const bossScroll = document.getElementsByClassName(bossScrollClass)[0];
    if (!bossScroll) {
        console.log("錯誤：bossScroll 元素未找到，函數停止。");
        return; // 安全檢查
    } 

    console.log("bossScroll 找到，準備滾動到頂部。");
    bossScroll.scrollTop = 0;
    
    // **檢查 2：while 迴圈是否能啟動**
    console.log(`初始 準備獲取Boss死亡的最早時間: '${準備獲取Boss死亡的最早時間}'`);


    let selectTime = new Date(準備獲取Boss死亡的最早時間);
    let dataTime = new Date(當前資料的最後時間);
    
    // **檢查 3：兩個時間的比較結果**
    console.log(`比較：selectTime (${selectTime}) vs dataTime (${dataTime})`);

    if (selectTime < dataTime) {
        console.log(selectTime, '小於', dataTime, '因此重新取得資料（MutationObserver 應處理滾動）');
        // ... [保持滾動和等待邏輯]
        
        // **關鍵：如果希望繼續滾動，這裡需要加入滾動的程式碼**
        // **例如： bossScroll.scrollTop += 500; 或其他觸發 MutationObserver 的操作**
        await delay(1000);
        取得Boss歷史資料();
        // 注意：如果沒有觸發滾動來讓 MutationObserver 更新資料，
        // 準備獲取Boss死亡的最早時間 不會改變，下次檢查仍會是 dataTime > selectTime，造成無限循環（但這看起來不是您的問題）。

    } else {
        console.log("自動抓取資料已完畢, 自動滾動到最下面");
        // ... [結束邏輯]
        準備獲取Boss死亡的最早時間 = "";
        checkIfDivScrolledToBottom();
        // **檢查 4：確認結束**
        console.log("流程結束 5 秒後回到Boss清單。");

        await delay(5000);
        // 將資料傳送到 Background Script
        chrome.runtime.sendMessage("回到LOA-BossTime");
    }
}


function compareDateTime(dateTime1, dateTime2) {
  // 直接將 YYYY-MM-DD HH:MM 格式的字串轉為 Date 物件
  const date1 = new Date(dateTime1.replace(/-/g, "/"));
  const date2 = new Date(dateTime2.replace(/-/g, "/"));

  // 使用 getTime() 比較毫秒數
  if (date1.getTime() > date2.getTime()) {
    return 1;
  } else if (date1.getTime() < date2.getTime()) {
    return -1;
  } else {
    return 0;
  }
}

// 創建 MutationObserver
var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    mutation.addedNodes.forEach(function(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // 檢查新添加的元素是否包含關鍵字
        checkElementForKeywords(node);
      }
    });
  });
});


const TARGET_CLASS = 'scrollerContent__36d07';

// 1. 創建前導觀察者 (只監聽 body 級別)
const setupObserver = new MutationObserver((mutations, obs) => {
    const bossListContainer = document.getElementsByClassName(TARGET_CLASS)[0];
    
    if (bossListContainer) {
        // 找到了目標容器！
        
        // 停止前導觀察者
        obs.disconnect(); 
        
        // 啟動您的主要觀察者 (假設 observer 已經定義)
        observer.observe(bossListContainer, { 
            childList: true, 
            subtree: true 
        });
        console.log(`✅ 容器找到，MutationObserver 已啟動。`);
    }
});

// 2. 啟動前導觀察者，輕度監聽 body 即可
setupObserver.observe(document.body, { 
    childList: true, // 只監聽 body 的直接子節點
    subtree: true    // 監聽所有子樹 (如果元素深埋其中)
});

// 檢查元素是否包含關鍵字
function checkElementForKeywords(element) {
  // **優化 1：使用 textContent 提高效能和安全性**
  const pageContent = element.textContent;
  
  // 檢查是否包含任何一個關鍵字
  if (!keywords.some(keyword => pageContent.includes(keyword))) {
      return; // 快速跳出
  }

  const divMessages = element.querySelectorAll(bossCellDivClass);

  divMessages.forEach(function(message) {
    // **優化 2：統一使用 const/let**
    let timeText = "";
    let emblem = "未知血盟";
    let localName = "";

    const embedFieldNames = message.querySelectorAll(bossCellNameClass);
    embedFieldNames.forEach(function(embedFieldName) {
      // **優化 3：統一字段處理**
      const fieldName = embedFieldName.innerText.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
      const nextDiv = embedFieldName.nextElementSibling;
      
      if (nextDiv && nextDiv.classList.contains(bossCellValueClass)) {
        let valueText = "";
        const valueSpans = nextDiv.querySelectorAll('span');
        valueSpans.forEach(span => { valueText += span.innerText; });

        switch (fieldName) {
            case "地點 Location":
                localName = valueText;
                break;
            case "時間 End at":
                timeText = valueText;

                // 如果有取得舊資料需求
                if (準備獲取Boss死亡的最早時間 != "") {
                  當前資料的最後時間 = timeText;
                }
                break;
            case "血盟 Pledge":
                emblem = valueText || "未知血盟";
                break;
        }
      }
    });


    // 找到符合條件的連結
    let id = 0;
    let bossName = "";
    const linkElement = message.querySelector('a[href*="/mob/"]');
    if (linkElement) {
      const match = linkElement.href.match(/\/mob\/(\d+)\/(.+)$/);
      if (match && match.length > 2) {
        id = match[1];
        bossName = match[2];
      }
    }

    if (id != 0) {
      let type = 0; // 0:正常 1:小隱龍 2:大隱龍
      if (localName === "Training Place for Death Knight") {
        type = 1;
      } else if (localName === "Dwarven Village") {
        type = 2;
      }

      // **優化 5：將所有跳過邏輯抽取到 shouldSkipBoss 輔助函數**
      if (shouldSkipBoss(localName, id, bossName)) {
        console.log("跳過當前換下一筆boss資料 ", decodeURIComponent(bossName), localName);
        return; // 跳過當前換下一筆boss資料
      }
      
      // 在這裡可以抓取需要的資料
      const data = { id, type, bossName, emblem, death: timeText };

      console.log("將資料送出:",data)
      // 將資料傳送到 Background Script
      chrome.runtime.sendMessage(data);
    }
  });
}


// **建議將這個輔助函數 shouldSkipBoss 放在外面**
// **以便與 checkElementForKeywords 平級，並在全域範圍內定義。**
function shouldSkipBoss(localName, id, bossName) {
    // 轉換 ID 為數字進行可靠比較
    const numId = Number(id);

    // 排除區域清單
    const excludedAreas = [
        "奇怪的村落 Strange Village", 
        "奇岩競技場 Giran Colosseum", 
        "", 
        "從前的說話之島 Memories Island"
    ];
    if (excludedAreas.includes(localName)) {
        return true;
    }

    // 傲慢之塔 (非樓層)：只允許特定 ID
    if ((localName === "傲慢之塔 Tower of Insolence") && ![46220, 146220, 46271].includes(numId)) {
        return true;
    }

    // 百鬼活動樓層檢查：只有在特定樓層且 ID 不符合時才跳過
    const TOI_EXCEPTIONS = {
        "傲慢之塔 10樓 Tower of Insolence 10F": [45513, 145513],
        "傲慢之塔 20樓 Tower of Insolence 20F": [45547, 145547],
        "傲慢之塔 30樓 Tower of Insolence 30F": [45606, 145606],
        "傲慢之塔 40樓 Tower of Insolence 40F": [45650, 145650],
        "傲慢之塔 50樓 Tower of Insolence 50F": [45652, 145652],
        "傲慢之塔 60樓 Tower of Insolence 60F": [45653, 145653],
        "傲慢之塔 70樓 Tower of Insolence 70F": [45654, 145654],
        "傲慢之塔 80樓 Tower of Insolence 80F": [45618, 145618],
        "傲慢之塔 90樓 Tower of Insolence 90F": [45672, 145672],
    };

    if (TOI_EXCEPTIONS[localName] && !TOI_EXCEPTIONS[localName].includes(numId)) {
        // console.log("百鬼活動跳過紀錄 地點",decodeURIComponent(bossName), id, localName);
        return true;
    }

    return false;
}

// 找到【跳到至當前】按鈕
function findScrollToBottomBTN() {
  // 找到所有按鈕元素
  const buttons = document.querySelectorAll('button.button__201d5');

  // 遍歷所有找到的按鈕
  for (const button of buttons) {
      // 檢查按鈕內是否有 div.contents__201d5 且文字內容為「跳到至當前」
      const div = button.querySelector('div.contents__201d5');
      if (div && div.textContent.trim() === '跳到至當前') {
          // 找到目標按鈕，執行點擊
          button.click();
          break; // 如果找到後不需要繼續檢查，可以跳出迴圈
      }
  }
}


function checkIfDivScrolledToBottom() {
  if (準備獲取Boss死亡的最早時間 == "") {
    // 找到【跳到至當前】按鈕
    findScrollToBottomBTN();

    let bossScroll = document.getElementsByClassName(bossScrollClass)[0]
    // 獲取當前滾動位置
    const scrollTop = bossScroll.scrollTop;
    // 獲取div的可視高度
    const divHeight = bossScroll.clientHeight;
    // 獲取div的滾動內容總高度
    const scrollHeight = bossScroll.scrollHeight;

    // 判斷是否滾動到最底部
    if (scrollTop + divHeight >= scrollHeight - 1) {
        console.log('已經滾動到最底部');
    } else {
        console.log('尚未滾動到最底部');
        bossScroll.scrollTo(0, bossScroll.scrollHeight);
        setTimeout(function() {
          checkIfDivScrolledToBottom();
        }, 1000);
    }
  }
}

setInterval(checkIfDivScrolledToBottom, 60000);


/**
 * 尋找 rel="next" 的按鈕，並以指定秒數間隔點擊。
 * @param {number} seconds - 每次點擊之間的間隔秒數 (例如: 3)。
 */
function autoClickNextButton(seconds) {
    // 檢查秒數是否為有效數字
    if (typeof seconds !== 'number' || seconds <= 0) {
        console.error('請提供一個大於 0 的有效秒數。');
        return;
    }

    // 檢查是否已經啟動過定時器，避免重複啟動
    if (window._nextButtonInterval) {
        console.warn('自動點擊已經在運行中。請先運行 stopAutoClick() 停止。');
        return;
    }

    // 將秒數轉換為毫秒
    const delayInMilliseconds = seconds * 1000;

    // 啟動函式：負責尋找並點擊按鈕
    const clickHandler = () => {
        // 選擇器：找到擁有 rel="next" 屬性的 <button> 元素
        const nextButton = document.querySelector('button[rel="next"]');

        if (nextButton) {
            console.log(`正在嘗試點擊 "下一頁" 按鈕... (間隔: ${seconds} 秒)`);
            nextButton.click();
        } else {
            // 如果找不到按鈕，則停止定時器
            stopAutoClick();
            console.log('找不到按鈕，自動點擊停止。');
        }
    };

    // 設定定時器
    window._nextButtonInterval = setInterval(clickHandler, delayInMilliseconds);

    console.log(`✅ 自動點擊已成功啟動，每 ${seconds} 秒點擊一次。`);
    console.log('👉 如需停止，請在控制台運行：stopAutoClick()');
}

/**
 * 停止自動點擊的函數。
 */
function stopAutoClick() {
    if (window._nextButtonInterval) {
        clearInterval(window._nextButtonInterval);
        delete window._nextButtonInterval; // 清除全域變數
        console.log('❌ 自動點擊已停止。');
    } else {
        console.log('自動點擊目前沒有運行。');
    }
}

autoClickNextButton(10)