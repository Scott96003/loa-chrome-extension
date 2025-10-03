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




function SendToDC(id, test=false) {

  const fixId = id % 100000;
  const isActive = id > 100000 ? true : false
  const 長老Boss = [45955,45956,45957,45958,45959,45960,45961,45962,45863]
  const 陣營Boss = [81082,45685,45674,45625,45753]
  const 奧塔Boss = [45513,45547,45606,45650,45652,45653,45654,45618,45672,45673]
  const 野外Boss = [45614,45801,46142,46141,99085,99086,99065]
  // 合併多個陣列
  const bossList = [...長老Boss, ...陣營Boss, ...奧塔Boss, ...野外Boss];
  var titleMsg = ""
  var msg = ""
  var data = []

  if (bossList.includes(fixId) || (fixId == 0)) {

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
      sendMsg(test,msg)
    }
    if (陣營Boss.includes(fixId) || (fixId == 0)) {
      let topMsg = "=== 陣營Boss ===\n"
      msg = titleMsg + topMsg + makeListMsg(陣營Boss)
      sendMsg(test,msg)
    }
    if (奧塔Boss.includes(fixId) || (fixId == 0)) {
      let topMsg = "=== 奧塔Boss ===\n"
      msg = titleMsg + topMsg + makeListMsg(奧塔Boss)
      sendMsg(test,msg)
    }
    if (野外Boss.includes(fixId) || (fixId == 0)) {
      let topMsg = "=== 野外Boss ===\n"
      msg = titleMsg + topMsg + makeListMsg(野外Boss)
      sendMsg(test,msg)
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
  bossTimeRanges = [0,23]
  obj.forEach(function(item) {
    // 如果想更新為兩者中較大的值
    const itemHours = item.重生間隔.split('~')
    console.log(itemHours)
    bossTimeRanges[0] = Math.max(bossTimeRanges[0], parseInt(itemHours[0]));
    bossTimeRanges[1] = Math.min(bossTimeRanges[1], parseInt(itemHours[1]));

    tableData.push({ count: item.respawnCount, 
      name: item.bossName, 
      spawnTime: item.重生間隔, 
      guild: item.emblem == 'Il一雲門集團一II' ? '雲門' : item.emblem, 
      death: item.death,
      已死亡: formatTimeDifference(item.已死亡)})
  })
  return formatTableForDiscord(tableData)
}




/**
 * 判斷給定的時間（小時）是否在 20:00 到 03:00 的區間內。
 * @param {number} hour - 介於 0 到 23 之間的小時數。
 * @returns {boolean} 如果時間在區間內，則回傳 true；否則回傳 false。
 */
function isWithinTimeRange(hour) {
  return (hour == bossTimeRanges[1])
}

bossTimeRanges = [0,23]
isTaskRunning = false
// 設定每秒執行一次
setInterval(() => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  console.log('// 每30000毫秒（1秒）檢查一次', hours, minutes, bossTimeRanges)
  // 檢查是否為整點（0 分 0 秒）

  if (hours == bossTimeRanges[1]) {
    // 檢查是否重複執行，確保只執行一次
    if (!isTaskRunning) {
      isTaskRunning = true;
      refresh();
      console.log('更新時間')
      SendToDC(0);
      // 等待幾秒後重設旗標，防止短時間內重複執行
      setTimeout(() => {
        isTaskRunning = false;
      }, 60 * 1000);
    }
  }
}, 30 * 1000); // 每30秒（1秒）檢查一次