// 【步驟一： getDisplayWidth 函數 (如上方所示，這裡省略以節省空間)】
function getDisplayWidth(str) {
  // ... (使用上方提供的 getDisplayWidth 函數，確保其正確性)
  if (!str) return 0;
  const text = String(str);
  const fullWidthRegex = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uff5a]/; 
  let width = 0;
  for (const char of text) {
    if (fullWidthRegex.test(char)) {
      width += 2; 
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * 根據最大寬度，為長字串插入換行符 (\n)
 * @param {string} text - 要處理的文字
 * @param {number} maxWidth - 該欄位的最大顯示寬度
 * @returns {string[]} 包含分行後所有子字串的陣列
 */
function wrapText(text, maxWidth) {
    const textStr = String(text);
    if (getDisplayWidth(textStr) <= maxWidth) {
        return [textStr];
    }
    
    const lines = [];
    let currentLine = '';
    let currentWidth = 0;
    
    // 遍歷字串中的每一個字元
    for (const char of textStr) {
        const charWidth = getDisplayWidth(char);
        
        // 檢查加入新字元後是否超過最大寬度
        if (currentWidth + charWidth > maxWidth) {
            // 1. 將已經累積的行推入結果
            lines.push(currentLine);
            
            // 2. 重設行和寬度，並將**當前這個字元**作為新行的開頭
            currentLine = char;
            currentWidth = charWidth;
        } else {
            // 否則繼續將字元加入目前行
            currentLine += char;
            currentWidth += charWidth;
        }
    }
    
    // 將最後一行推入結果
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}


// 【步驟三：修正 formatTableForDiscord 主函數】

const MAX_NAME_WIDTH = 12; // <-- 設定名稱欄位的最大寬度 (例如 7個中文字)

function formatTableForDiscord(data) {
  if (!data || data.length === 0) {
    return '沒有資料可顯示。';
  }

  // 設定每一欄的標題、對應的資料鍵值，以及對齊方式
  const columns = [
    { key: 'count', header: '數量', align: 'left' }, // 數量靠右，並確保標題是空格
    { key: 'spawnTime', header: '區段', align: 'left' },
    { key: 'name', header: '名稱', align: 'left', maxWidth: MAX_NAME_WIDTH}, // <-- 加入最大寬度限制
    { key: 'guild', header: '血盟', align: 'left', maxWidth: MAX_NAME_WIDTH},
    { key: '已死亡', header: '已死亡', align: 'left' }
  ];

  // 1. 預處理資料 (略)
  const processedData = data.map(item => ({
    ...item,
    spawnTime: String(item.spawnTime).replace(/~/g, '-'),
    count: String(item.count),
    name: String(item.name),
    guild: String(item.guild),
    已死亡: "<t:" + new Date(item.death).getTime() / 1000 +":R>"
  }));

  // 2. 計算每一欄的最大**顯示寬度** (Display Width)
  const columnWidths = columns.map(col => getDisplayWidth(String(col.header)));

  processedData.forEach(item => {
    columns.forEach((col, i) => {
      const content = String(item[col.key]);
      let widthToCompare = getDisplayWidth(content);

      columnWidths[i] = Math.max(
        columnWidths[i],
        widthToCompare
      );
      // 如果該欄位有 maxWidth 限制，則用 maxWidth 來計算表格總寬度
      if (col.maxWidth) {
          columnWidths[i] = columnWidths[i] > col.maxWidth ? col.maxWidth : columnWidths[i]
      }
    });
  });


  // 3. 修正後的 padText 函數 (根據顯示寬度填充)
  const padText = (text, targetWidth, align) => {
    const textStr = String(text);
    const currentWidth = getDisplayWidth(textStr); 
    const paddingNeeded = targetWidth - currentWidth;
    
    if (paddingNeeded <= 0) {
        return textStr;
    }

    const padding = ' '.repeat(paddingNeeded);

    if (align === 'right') {
      return padding + textStr;
    }
    return textStr + padding;
  };

  // 4. 格式化表頭
  const formattedHeaders = columns
    .map((col, i) => padText(col.header, columnWidths[i] > MAX_NAME_WIDTH ? 12 : columnWidths[i], col.align))
    .join(' ');

  // 5. 格式化分隔線
  const separator = columnWidths
    .map(width => '='.repeat(width > 8 ? 8 : width))
    .join(' ');


  // 6. 格式化每一筆資料 (重大變動：處理多行)
  const rowLines = [];
  processedData.forEach(item => {
      
      // 取得所有欄位分行後的結果 (Lines)
      const columnLines = columns.map(col => {
          const content = String(item[col.key]);
          if (col.maxWidth) {
              return wrapText(content, col.maxWidth); // 長欄位進行分行
          } else {
              return [content]; // 短欄位維持單行
          }
      });
      
      // 找出該筆資料中，行數最多的是哪一欄
      const maxLines = columnLines.reduce((max, lines) => Math.max(max, lines.length), 1);
      
      // 遍歷每一行 (i = 0 是第一行，i = 1 是第二行...)
      for (let i = 0; i < maxLines; i++) {
          const lineParts = columnLines.map((lines, j) => {
              const col = columns[j];
              
              // 1. 判斷是否是該欄位的後續行
              if (i > 0 && !col.maxWidth) {
                  // 非分行欄位的後續行，內容固定為空字串，讓 padText 填充整個寬度
                  const paddedText = padText('', columnWidths[j] + 4, col.align);
                  return paddedText;
              }
              
              // 2. 獲取內容，如果超出則為空字串
              const cellContent = lines[i] || ''; 
              const paddedText = padText(cellContent, columnWidths[j], col.align);
              
              return paddedText;
          });
          rowLines.push("> " + lineParts.join(' '));
      }
  });


  // 7. 組合最終的字串
  const tableString = `

> ${formattedHeaders}
> ${separator}
${rowLines.join('\n')}

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


const 長老Boss = [45955,45956,45957,45958,45959,45960,45961,45962,45863]
const 陣營Boss = [81082,45685,45674,45625,45753]
const 奧塔Boss = [45513,45547,45606,45650,45652,45653,45654,45618,45672,45673]
const 野外Boss = [45614,45801,46142,46141,99085,99086,99065]
// 合併多個陣列
const allDcCheckBoss = [...長老Boss, ...陣營Boss, ...奧塔Boss, ...野外Boss];

function SendToDC(id, test=false) {

  const fixId = id % 100000;
  const isActive = id > 100000 ? true : false


  var titleMsg = ""
  var msg = ""

  if (allDcCheckBoss.includes(fixId) || (fixId == 0)) {

    if (fixId == 0) {
      titleMsg += "*** 重生輪迴時間刷新 ***\n"
    } else {
      findDeathBoss = bossListData.filter(function(item) {
          return (parseInt(item.id) == fixId);
      });
      titleMsg += "***[" + (isActive == true ? '活動 ' : '') + findDeathBoss[0].bossName + '] 被 ' + findDeathBoss[0].emblem + ' 擊殺 ' + findDeathBoss[0].death + '***\n'
    }

    if (長老Boss.includes(fixId) || (fixId == 0)) {
      let topMsg = "=== 長老Boss ===\n"
      msg = titleMsg + topMsg + makeListMsg(長老Boss)
      // 列出活動長老
      msg += "\n> 活動長老出現次數: " + msgFromActive(長老Boss)
      sendMsg(test,msg)
    }
    if (陣營Boss.includes(fixId) || (fixId == 0)) {
      let topMsg = "=== 陣營Boss ===\n"
      msg = titleMsg + topMsg + makeListMsg(陣營Boss)
      // 列出活動
      msg += "\n> 陣營活動王出現次數: " + msgFromActive(陣營Boss)
      sendMsg(test,msg)
    }
    if (奧塔Boss.includes(fixId) || (fixId == 0)) {
      let topMsg = "=== 奧塔Boss ===\n"
      msg = titleMsg + topMsg + makeListMsg(奧塔Boss)
      // 列出活動
      msg += "\n> 奧塔活動王出現次數: " + msgFromActive(奧塔Boss)
      sendMsg(test,msg)
    }
    if (野外Boss.includes(fixId) || (fixId == 0)) {
      let topMsg = "=== 野外Boss ===\n"
      msg = titleMsg + topMsg + makeListMsg(野外Boss)
      // 列出活動
      msg += "\n> 野外活動王出現次數: " + msgFromActive(野外Boss)
      sendMsg(test,msg)
    }

    // 列出活動王
    function msgFromActive(bossIds) {
      // 列出活動
      var obj = bossListData.filter(function(item) {
          return (bossIds.includes(parseInt(item.id)) == true);
      });
      const sum = obj.reduce((accumulator, currentValue) => {
        return accumulator + currentValue.deathList.length;
      }, 0); // 0 是初始值，確保從 0 開始加總。
      const sumActive = obj.reduce((accumulator, currentValue) => {
        const activeCount = currentValue.deathList.reduce((acc, value) => {
          return acc + (value.isActive == true ? 1 : 0);
        }, 0);
        return accumulator + activeCount;
      }, 0); // 0 是初始值，確保從 0 開始加總。
      return sumActive + "/" + sum + "(" + ((sumActive/sum)*100).toFixed(2) + "%)"
    }

    // 發送訊息
    function sendMsg(test,msg) {
      if (test == false) {
        WEBHOOK_URL.forEach(url => {
          sendTextWebhook(url, msg);
        })
      } else {
        console.log(msg)
      }
    }
  }
}

function makeListMsg(listID) {
  var tableData = []

  var obj = bossListData.filter(function(item) {
      return (listID.includes(parseInt(item.id)) == true);
  });

  obj.forEach(function(item) {
    tableData.push({ count: item.respawnCount, 
      name: item.bossName, 
      spawnTime: item.重生間隔, 
      guild: item.emblem == 'Il一雲門集團一II' ? '雲門' : item.emblem, 
      death: item.death,
      已死亡: formatTimeDifference(item.已死亡)})
  })
  return formatTableForDiscord(tableData)
}

// 紀錄下次需要更新boss輪迴時間的區間
// 給預設時間24 才能夠找到最小的時間
lastRefreshBossTime = 24

// 設定每 30 秒執行一次
setInterval(() => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // 1. 篩選出活躍 Boss 的重生結束「小時」
  // 並且使用 Set 來自動去重，因為多個 Boss 可能在同一小時重生
  const activeBossHoursSet = new Set(
    bossListData
      // 篩選出 ID 在 allDcCheckBoss 列表中的 Boss
      .filter(item => allDcCheckBoss.includes(parseInt(item.id)))
      // 提取重生間隔的結束小時 (例如 '20~21' 變成 '21')
      .map(item => parseInt(item.重生間隔.split('~')[1]))
  );

  // 將 Set 轉為陣列，並排序 (數字排序)
  const allTargetHours = [...activeBossHoursSet].sort((a, b) => a - b);

  // 2. 找到下一個最近的小時
  // 找出「大於或等於當前小時」的 Boss 時間
  const nextHourToday = allTargetHours.find(h => h >= hours);

  // 決定 newRange：
  // 如果今天還有 Boss 沒過期 (nextHourToday 有值)，就選它。
  // 否則，表示所有 Boss 都已經過了，選最早的那個 (即 allTargetHours[0])，這就是明天的第一個 Boss。
  const newRange = nextHourToday !== undefined
    ? nextHourToday
    : allTargetHours[0]; 

  // 輔助訊息輸出 (使用簡化後的變數)
  console.log(`檢查時間: ${hours}:${minutes}，上次更新小時: ${lastRefreshBossTime}`);

  // 3. 判斷是否需要更新
  if (newRange != lastRefreshBossTime) {
      refresh();
      console.log('--- 觸發更新：Boss 輪迴時間已切換為下一個小時 ---');
      SendToDC(0);
      
      // 更新後設定時間
      lastRefreshBossTime = newRange;
  }
  
}, 30 * 1000); // 30秒