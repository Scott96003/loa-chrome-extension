// 清單中的關鍵字
var keywords = ["LoA363 頭目擊殺記錄 Boss Kills", "關鍵字2", "關鍵字3"];

var oldDayTime = "";
var lastDeathTime = "2024-06-01 00:00";
let bossScrollClass = "scroller__36d07";
let bossCellDivClass = ".gridContainer__623de";
let bossCellNameClass = ".embedFieldName__623de";
let bossCellValueClass = "embedFieldValue__623de";


// 在 content script 中
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log("接收到來自BossTime Message:", message);

    if (message.action == "getData") {
        oldDayTime = message.dayTime;
        
        // 使用 IIFE (立即執行函式) 來處理 async 邏輯並回覆
        (async () => {
            await getOldData();
            // 在 getOldData 流程完全結束後，發送回應
            sendResponse({status: "Data retrieval complete"}); 
        })();

        // **關鍵：返回 true，表示將會異步回覆**
        return true; 
    }
});

// 輔助函式：等待指定時間
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getOldData() {
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
    console.log(`初始 oldDayTime: '${oldDayTime}'`);


    let oldTime = new Date(oldDayTime);
    let checkTime = new Date(lastDeathTime);
    
    // **檢查 3：兩個時間的比較結果**
    console.log(`比較：oldDayTime (${oldDayTime}) vs lastDeathTime (${lastDeathTime})`);

    if (checkTime > oldTime) {
        console.log(oldDayTime, '小於', checkTime, '因此重新取得資料（MutationObserver 應處理滾動）');
        // ... [保持滾動和等待邏輯]
        
        // **關鍵：如果希望繼續滾動，這裡需要加入滾動的程式碼**
        // **例如： bossScroll.scrollTop += 500; 或其他觸發 MutationObserver 的操作**
        await delay(1000);
        getOldData();
        // 注意：如果沒有觸發滾動來讓 MutationObserver 更新資料，
        // oldDayTime 不會改變，下次檢查仍會是 checkTime > oldTime，造成無限循環（但這看起來不是您的問題）。

    } else {
        console.log("自動抓取資料已完畢, 自動滾動到最下面");
        // ... [結束邏輯]
        oldDayTime = "";
        checkIfDivScrolledToBottom();
        // **檢查 4：確認結束**
        console.log("流程結束 (return)。");
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

// 啟動 MutationObserver，監聽 body 元素的變動
observer.observe(document.body, { childList: true, subtree: true });

// 檢查元素是否包含關鍵字
function checkElementForKeywords(element) {
  var pageContent = element.innerHTML;
  keywords.forEach(function(keyword) {
    if (pageContent.includes(keyword)) {

      var divMessages = element.querySelectorAll(bossCellDivClass);

      divMessages.forEach(function(message) {
        // 找到時間的文字
        var timeText = "";
        // 找到血盟的文字
        var emblem = "未知血盟";
        // 死亡地點
        var localName = "";

        var embedFieldNames = message.querySelectorAll(bossCellNameClass);
        embedFieldNames.forEach(function(embedFieldName) {
          // 確認定點
          if (embedFieldName.innerText.trim() === "地點 Location") {
            var nextDiv = embedFieldName.nextElementSibling;
            if (nextDiv && nextDiv.classList.contains(bossCellValueClass)) {
              var emblemNameSpans = nextDiv.querySelectorAll('span');
              emblemNameSpans.forEach(function(span) {
                localName += span.innerText;
              });
            }
          }

          if (embedFieldName.innerText.trim() === "時間 End at") {
            var nextDiv = embedFieldName.nextElementSibling;
            if (nextDiv && nextDiv.classList.contains(bossCellValueClass)) {
              var timeSpans = nextDiv.querySelectorAll('span');
              timeSpans.forEach(function(span) {
                timeText += span.innerText;
              });
              // 將最後收到的死亡時間放入
              lastDeathTime = timeText;
            }
          }
          let cleanedText = embedFieldName.innerText.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
          if (cleanedText === "血盟 Pledge") {          
            console.log("找到擊殺血盟");
            var nextDiv = embedFieldName.nextElementSibling;
            if (nextDiv && nextDiv.classList.contains(bossCellValueClass)) {
              emblem = "";
              var emblemNameSpans = nextDiv.querySelectorAll('span');
              emblemNameSpans.forEach(function(span) {
                emblem += span.innerText;
              });
            }
          }          
        });


        // 找到符合條件的連結
        var id = 0;
        var bossName = "";
        var linkElement = message.querySelector('a[href*="/mob/"]');
        if (linkElement) {
          // 使用正則表達式提取/mob/後面的數字和文字
          var match = linkElement.href.match(/\/mob\/(\d+)\/(.+)$/);
          if (match && match.length > 2) {
            id = match[1];
            bossName = match[2];
          }
        }

        // 在這裡可以抓取需要的資料
        var data = {
          id: id,
          type: 0, // 0:正常 1:小隱龍 2:大隱龍
          bossName: bossName,
          emblem: emblem,
          death: timeText // 將找到的時間文字加入資料中
        };
        if (id != 0) {

          if ("Training Place for Death Knight" == localName) {
            data.type = 1;
          }

          if ("Dwarven Village" == localName) {
            data.type = 2;
          }

          if (["奇怪的村落 Strange Village", "奇岩競技場 Giran Colosseum", "", "從前的說話之島 Memories Island"].includes(localName)) {
            console.log("跳過當前換下一筆boss資料 地點", decodeURIComponent(bossName), localName);
            // 跳過當前換下一筆boss資料
            return;
          }



          if ((localName === "傲慢之塔 Tower of Insolence") && (id != 46220) && (id != 146220) && (id != 46271)) {
            console.log("跳過當前換下一筆boss資料 地點",decodeURIComponent(bossName), id, localName);
            // 跳過當前換下一筆boss資料
            return;
          }

          //           
          if ((localName === "傲慢之塔 10樓 Tower of Insolence 10F") && (id != 45513) && (id != 145513)) {
            console.log("百鬼活動跳過紀錄 地點",decodeURIComponent(bossName), id, localName);
            // 跳過當前換下一筆boss資料
            return;
          }
          if ((localName === "傲慢之塔 20樓 Tower of Insolence 20F") && (id != 45547) && (id != 145547)) {
            console.log("百鬼活動跳過紀錄 地點",decodeURIComponent(bossName), id, localName);
            // 跳過當前換下一筆boss資料
            return;
          }
          if ((localName === "傲慢之塔 30樓 Tower of Insolence 30F") && (id != 45606) && (id != 145606)) {
            console.log("百鬼活動跳過紀錄 地點",decodeURIComponent(bossName), id, localName);
            // 跳過當前換下一筆boss資料
            return;
          }
          if ((localName === "傲慢之塔 40樓 Tower of Insolence 40F") && (id != 45650) && (id != 145650)) {
            console.log("百鬼活動跳過紀錄 地點",decodeURIComponent(bossName), id, localName);
            // 跳過當前換下一筆boss資料
            return;
          }
          if ((localName === "傲慢之塔 50樓 Tower of Insolence 50F") && (id != 45652) && (id != 145652)) {
            console.log("百鬼活動跳過紀錄 地點",decodeURIComponent(bossName), id, localName);
            // 跳過當前換下一筆boss資料
            return;
          }
          if ((localName === "傲慢之塔 60樓 Tower of Insolence 60F") && (id != 45653) && (id != 145653)) {
            console.log("百鬼活動跳過紀錄 地點",decodeURIComponent(bossName), id, localName);
            // 跳過當前換下一筆boss資料
            return;
          }
          if ((localName === "傲慢之塔 70樓 Tower of Insolence 70F") && (id != 45654) && (id != 145654)) {
            console.log("百鬼活動跳過紀錄 地點",decodeURIComponent(bossName), id, localName);
            // 跳過當前換下一筆boss資料
            return;
          }
          if ((localName === "傲慢之塔 80樓 Tower of Insolence 80F") && (id != 45618) && (id != 145618)) {
            console.log("百鬼活動跳過紀錄 地點",decodeURIComponent(bossName), id, localName);
            // 跳過當前換下一筆boss資料
            return;
          }
          if ((localName === "傲慢之塔 90樓 Tower of Insolence 90F") && (id != 45672) && (id != 145672)) {
            console.log("百鬼活動跳過紀錄 地點",decodeURIComponent(bossName), id, localName);
            // 跳過當前換下一筆boss資料
            return;
          }

          // 將資料傳送到 Background Script
          chrome.runtime.sendMessage(data);
        }

      })
    }
  });
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
  if (oldDayTime == "") {
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