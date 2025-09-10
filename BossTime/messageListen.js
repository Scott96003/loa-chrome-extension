// 監聽來自 Background Script 的消息 (Step1)
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log("Boss死亡資訊:", message);
    // 在這裡處理接收到的消息
    console.log(bossListData);

    var bossData = message;
    bossData.bossName = decodeURIComponent(message.bossName);
    bossData.emblem = decodeURIComponent(message.emblem);
    updateBossData(bossData);
});
// 監聽來自 Background Script 的消息 (Step2)
function updateBossData(bossData) {

  bossListData.forEach(function(item, index) {
    // 活動boss id 增加100000
    let isActive = (parseInt(item.id) + 100000 == parseInt(bossData.id))

    // 找到相符的 id, 或是type = 1 or 2
    if ((item.id == bossData.id) || 
      (isActive && bossData.type == 0)|| 
      ((bossData.type == 1) && (item.id == 1)) ||
      ((bossData.type == 2) && (item.id == 2)) ) {

      // 防呆,避免資料null或為空
      if ((bossListData[index].deathList === 'undefined') || (bossListData[index].deathList == null)) {
        bossListData[index].deathList = []
      }

      // 過濾不符合格式的資料
      bossListData[index].deathList = bossListData[index].deathList.filter(item => {
        if (item.hasOwnProperty('death') && item.hasOwnProperty('emblem')) {
          if (isValidDate(item.death)) {
            return true
          } else {
            console.log(bossListData[index])
            console.log(item)
            console.log('death 無法轉換時間')
          }
        }
        return false
      });
      const newDeathEntry = {
        death: bossData.death,
        bossName: bossData.bossName,
        emblem: bossData.emblem,
        type: bossData.type,
        isActive: isActive // 判斷是不是活動Boss , 活動Boss = ID+100000
      };


      bossListData[index].deathList.push(newDeathEntry)

      
      // 假设要处理的 boss 在 bossListData 数组中的索引是 index
      let boss = bossListData[index];

      // 使用一个辅助对象来记录已经见过的 deathList 条目
      let seenDeaths  = {};



      const bossCount = getBossCount(boss)
      // 過濾不符合格式的資料
      boss.deathList = boss.deathList.filter(item => item.hasOwnProperty('death') && item.hasOwnProperty('emblem'));

      // 过滤并去除重复的 deathList 条目
      boss.deathList = boss.deathList.filter(item => {
          let deathKey = item.death;
          // 如果 seenDeaths 中不存在這個 key，則添加並保留此條目
          if (!seenDeaths.hasOwnProperty(deathKey)) {
              seenDeaths[deathKey] = true;
              return true; // 保留此條目
          }
          return false; // 過濾掉重複的條目
      });

      console.log(bossListData[index].bossName + "死亡時間:");
      console.log(bossListData[index].deathList);
      // 將日期字串轉換為日期物件並進行排序
      bossListData[index].deathList = bossListData[index].deathList.sort(function(a, b) {
        var a_deathTime = new Date(a.death).getTime();
        var b_deathTime = new Date(b.death).getTime();
        return b_deathTime - a_deathTime;
      });
      bossListData[index].deathList = bossListData[index].deathList.slice(0, 30); // 只取前x筆資料 


      // 在這裡進行當前死亡時間跟準備新增的時間做大小比較
      if (item.death < newDeathEntry.death) {
        // 當死亡時間比現在大
        bossListData[index].death = newDeathEntry.death;
        bossListData[index].emblem = newDeathEntry.emblem;
        // bossData.bossName = bossListData[index].bossName
        if (bossData.type == 0) {
          //發出死亡通告
          speak(item.bossName + "已被" + newDeathEntry.emblem + "擊殺");
        }
        // 增加死亡訊息
        addMessage(bossData);
        refresh();
      }
    }
  });
}

function addMessage(bossData) {
    var now = new Date();
    var seconds = now.getSeconds().toString().padStart(2, '0');

    var message = bossData.death+":"+seconds;
    if (bossData.type == 1) {
      message += " 小隱龍 "
    }
    if (bossData.type == 2) {
      message += " 大隱龍 "
    }
    message += "【" + bossData.bossName + "】被 " +bossData.emblem + " 擊殺";
    messageList.push(message);
    drawMessage(message);
    showfloatingMessage(message);

    if (WEBHOOK_URL != "") {
      setTimeout(() => {
          SendToDC(parseInt(bossData.id));
      }, 2000);
    }
}


function formatTableForDiscord(data) {
  if (!data || data.length === 0) {
    return '沒有資料可顯示。';
  }

  // 設定每一欄的標題、對應的資料鍵值，以及對齊方式
  const columns = [
    { key: 'count', header: '數量', align: 'right' },
    { key: 'spawnTime', header: '區段', align: 'center' },
    { key: 'name', header: '名稱', align: 'left' },
    { key: 'guild', header: '血盟', align: 'left' }
  ];

  // 1. 預處理資料，將重生區段的 '~' 替換為 '-'
  const processedData = data.map(item => ({
    ...item,
    spawnTime: String(item.spawnTime).replace(/~/g, '-'),
  }));

  // 2. 計算每一欄的最大寬度 (完全依據內容動態調整)
  const columnWidths = columns.map(col => col.header.length);
  processedData.forEach(item => {
    columns.forEach((col, i) => {
      columnWidths[i] = Math.max(columnWidths[i], String(item[col.key]).length);
    });
  });

  // 3. 依據設定的對齊方式來填充文字
  const padText = (text, width, align) => {
    const textStr = String(text);
    if (align === 'right') {
      return textStr.padStart(width);
    }
    // 預設為靠左對齊 (left)
    return textStr.padEnd(width);
  };

  // 4. 格式化表頭
  const formattedHeaders = columns
    .map((col, i) => padText(col.header, columnWidths[i], col.align))
    .join(' ');

  // 5. 格式化分隔線
  const separator = columnWidths
    .map(width => '═'.repeat(width))
    .join(' ');

  // 6. 格式化每一筆資料
  const formattedData = processedData
    .map(item => {
      return columns
        .map((col, i) => padText(item[col.key], columnWidths[i], col.align))
        .join(' ');
    })
    .join('\n');

  // 7. 組合最終的字串，並加上程式區段的標記
  const tableString = `
\`\`\`
${formattedHeaders}
${separator}
${formattedData}
\`\`\`
  `.trim();

  return tableString;
}

// 發送純文字
async function sendTextWebhook(webhookUrl, textContent) {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: textContent,
                username: 'Boss監控機器人'
            })
        });
        
        if (response.ok) {
            console.log('文字訊息發送成功');
            return true;
        } else {
            console.error('發送失敗:', response.status);
            return false;
        }
    } catch (error) {
        console.error('發送錯誤:', error);
        return false;
    }
}

function SendToDC(id, test=false) {

  const fixId = id % 100000;
  const isActive = id > 100000 ? true : false
  var bossList1 = [45955,45956,45957,45958,45959,45960,45961,45962,45863]
  var bossList2 = [81082,45685,45674,45625,45753]
  var 奧塔Boss = [45672,45673,45618,45653]
  var 野外boss = [45614,45801,46142,46141,99085,99086,99065]
  // 合併多個陣列
  const bossList = [...bossList1, ...bossList2, ...奧塔Boss, ...野外boss];
  var msg = ""
  var data = []

  if (bossList.includes(fixId) || (fixId == 0)) {

    if (fixId == 0) {
      msg += '*** 重生輪迴時間刷新 ***\n'
    } else {
      findDeathBoss = bossListData.filter(function(item) {
          return (parseInt(item.id) == fixId);
      });
      msg += "***[" + (isActive == true ? '活動 ' : '') + findDeathBoss[0].bossName + '] 被 ' + findDeathBoss[0].emblem + ' 擊殺 ' + findDeathBoss[0].death + '***\n'
    }

    tableData = []
    // msg += '>>> 剩餘數量    名稱    重生區段\n'
    obj = bossListData.filter(function(item) {
        return (bossList.includes(parseInt(item.id)) == true);
    });
    bossTimeRanges = [0,23]
    obj.forEach(function(item) {
      // 如果想更新為兩者中較大的值
      const itemHours = item.重生間隔.split('~')
      console.log(itemHours)
      bossTimeRanges[0] = Math.max(bossTimeRanges[0], parseInt(itemHours[0]));
      bossTimeRanges[1] = Math.min(bossTimeRanges[1], parseInt(itemHours[1]));

      tableData.push({ count: item.respawnCount, name: item.bossName, spawnTime: item.重生間隔, guild: item.emblem == 'Il一雲門集團一II' ? '雲門' : item.emblem, death: item.death})
    })
    msg += formatTableForDiscord(tableData)
    if (test == false) {
      sendTextWebhook(WEBHOOK_URL, msg);
    } else {
      console.log(msg)
    }
  }
}

/**
 * 判斷給定的時間（小時）是否在 20:00 到 03:00 的區間內。
 * @param {number} hour - 介於 0 到 23 之間的小時數。
 * @returns {boolean} 如果時間在區間內，則回傳 true；否則回傳 false。
 */
function isWithinTimeRange(hour) {
  return hour >= bossTimeRanges[0] || hour <= bossTimeRanges[1];
}

bossTimeRanges = [0,23]
isTaskRunning = false
// 設定每秒執行一次
setInterval(() => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  console.log('// 每1000毫秒（1秒）檢查一次', hours, minutes, bossTimeRanges)
  // 檢查是否為整點（0 分 0 秒）

  if (isWithinTimeRange(hours) == false) {
    // 檢查是否重複執行，確保只執行一次
    if (!isTaskRunning) {
      isTaskRunning = true;
      console.log('更新時間')
      SendToDC(0);
      // 等待幾秒後重設旗標，防止短時間內重複執行
      setTimeout(() => {
        isTaskRunning = false;
      }, 60 * 1000);
    }
  }
}, 30 * 1000); // 每30秒（1秒）檢查一次