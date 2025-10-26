// bossListData 原始資料
var bossListData = [];
var speakOpen = false;
// 获取表格元素
var bossTable = document.getElementById("bossList");

var slider = document.getElementById("percentageSlider");
var display = document.getElementById("percentageDisplay");

// 訊息用變數
var messageContainer = document.getElementById('messageContainer');
var toggleMessageContainerBtn = document.getElementById('toggleMessageContainer');
var messageCount = 0;

// 設定基礎時間
const baseTime = '2024-01-04T12:00:00';

// 過濾後的bossID
var filterBossIDs = "";

// 設定檔
let config = {
  // 紀錄下次需要更新boss輪迴時間的區間
  // 給預設時間24 才能夠找到最小的時間
  lastRefreshBossTime: 24,
  // 設定重開機時間
  rebootTime: new Date('2024-01-04T12:00:00'),
  messageList: []
}

if (!debug) {
  console.log = function () {}; // 覆蓋 console.log，使其不執行任何操作
}

const getBossCount = (obj) => {
  let needBossCount = 1; // 假設初始值為1，根據需求設定

  // 例外boss處理
  if (obj.id === "45545") {
    needBossCount = 2;
  } 
  if (obj.id === "45640" || obj.id === "45516") {
    needBossCount = 3;
  }

  if (obj.id === "46220") {
    needBossCount = 4;
  }

  return needBossCount
};


function addToBossList() {
  var bossid = document.getElementById("bossid").value;
  var bossName = document.getElementById("bossName").value;
  var respawnTime = document.getElementById("respawnTime").value;

  var now = new Date();
  now.setHours(now.getHours() - 7);

  data = {
    id: bossid,
    bossName: bossName,
    respawnTime: respawnTime,
    death: formatDateTime(now),
    deathList: []
  }
  if (insertBoss(data)) {
    bossListData.push(data);
    // 在新增資料時才計算一次
    data.result = findLostBoss(data);
    data.respawnCount = data.result.rebornCount;
    sortListByRespawnTime();
    saveToLocalStorage();
  } else {
    alert("已有相同id 或名稱的boss");
  }

  document.getElementById("bossid").value = "";
  document.getElementById("bossName").value = "";
  document.getElementById("respawnTime").value = "";
}

function insertBoss(data) {
  var check = true
  bossListData.forEach(function(item) {
    if (item.id == data.id) {
      check = false;
    }
    if (item.bossName == data.bossName) {
      check = false;
    }
  })
  console.log("新增boss前檢查id  name 都沒有重複")
  return check;
}

// 將數據第一次畫出
function addBossTR(data) {
  bossName = data.bossName;
  respawnTime = parseInt(data.respawnTime);
  deathTime = data.death; // 使用当前时间作为死亡时间
  id = data.id || "請補充";


  var respawnDate = new Date(new Date(deathTime).getTime() + respawnTime * 3600000); // 计算预估出生时间
  var bossList = document.getElementById("bossList").getElementsByTagName("tbody")[0];
  var newRow = bossList.insertRow();
  
  // 設置 id 屬性
  // 設置 id 屬性
  newRow.setAttribute("id", "boss_"+ data.id);

  // 遍歷欄位配置，動態建立儲存格
  columnConfig.forEach((config, index) => {
    var cell = newRow.insertCell(index);
    let cellContent = '';

    // 處理特殊類型和內容
    switch (config.type) {
      case 'data':
        cellContent = data[config.key] || '未知';
        break;
      case 'action':
        cellContent = "<button id='delete_" + data.bossName + "'>刪除</button>";
        break;
      case 'computed':
        // 計算欄位初始設置為空，將由 refresh 函式更新
        cellContent = '';
        break;
    }

    cell.innerHTML = cellContent;
    
    // 設置 cell id 或 class 以便在 updateBossRemainingTime 中快速定位
    if (config.cellId) {
        cell.setAttribute('data-col-id', config.cellId);
    }

    // 設置可編輯性
    cell.setAttribute("contenteditable", config.editable ? "true" : "false"); 

    // 應用樣式
    if (config.style) {
        Object.keys(config.style).forEach(key => {
            cell.style[key] = config.style[key];
        });
    }

    // 應用特殊格式/事件
    if (config.format === 'tooltip' && config.key === 'death') {
        cell.addEventListener("mouseover", function(event) {
          showTooltip(event, data);
        });
        cell.addEventListener("mouseout", function() {
          hideTooltip();
        });
    }

    // 設置刪除按鈕事件
    if (config.type === 'action') {
        var deleteBtn = document.getElementById("delete_"+data.bossName);
        if (deleteBtn) {
            deleteBtn.addEventListener("click", function() {
                deleteBoss(this);
            });
        }
    }
    
    // 將 ID 放入儲存格屬性中，以便於刪除時查找
    if (config.key === 'id') {
        cell.setAttribute('data-boss-id', data.id);
    }
  });

}

// 刷新數據
function refresh() {
  console.log('刷新數據');
  updateBossRemainingTime();
  sortListByRespawnTime();
  filterTable(filterBossIDs);
  saveToLocalStorage();
}


function setDefaultDateTime() {
  var today = new Date();
  var defaultDate = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
  var defaultTime = '12:00';
  document.getElementById('datetime').value = defaultDate + 'T' + defaultTime;
}

function confirmDateTime() {
  var selectedDateTime = document.getElementById('datetime').value;

  // 在這裡加上你想要執行的動作
  document.getElementById('datetimePicker').style.display = 'none'; // 隱藏日期時間選擇器
  var confirmation = confirm("確定維修時間為" + selectedDateTime + "嗎,無法退回喔？");
  if (confirmation) {
    var now = new Date(selectedDateTime); // 获取当前时间
    // 設定重開機時間
    config.rebootTime = now;

    saveToLocalStorage();

    // 更新dc
    SendToDC(0);
  }
}

function confirmDateTimeForDeathTime() {
  var selectedDateTime = document.getElementById('datetimeForDeathTime').value;

  // 在這裡加上你想要執行的動作
  document.getElementById('datetimePickerForDeathTime').style.display = 'none'; // 隱藏日期時間選擇器
  var confirmation = confirm("確定抓取時間為" + selectedDateTime + "到現在的時間嗎？");
  if (confirmation) {
    var now = new Date(selectedDateTime); // 获取選取的時間
    取得Boss歷史資料(now);
  }
}

function cancelDateTime() {
  document.getElementById('datetimePicker').style.display = 'none'; // 隱藏日期時間選擇器
}

function cancelDateTimeForDeathTime() {
  document.getElementById('datetimePickerForDeathTime').style.display = 'none'; // 隱藏日期時間選擇器
}

function createDateTimePicker() {
  document.getElementById('datetimePicker').style.display = 'block'; // 顯示日期時間選擇器
  setDefaultDateTime(); // 設置預設日期時間
}

function createDateTimePickerForDeathTime() {
  document.getElementById('datetimePickerForDeathTime').style.display = 'block'; // 顯示日期時間選擇器
  
  // 取得今天的日期
  var today = new Date();

  // 減去5天
  today.setDate(today.getDate() - 1);

  // 格式化成 YYYY-MM-DD 格式
  var defaultDate = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);

  // 設置預設的時間
  var defaultTime = '12:00';

  // 將日期和時間設置到指定的 input 元素中
  document.getElementById('datetimeForDeathTime').value = defaultDate + 'T' + defaultTime;
}

function sortListByRespawnTime() {
  // var bossTable = document.getElementById("bossList").getElementsByTagName('tbody')[0];
  // bossTable.innerHTML = '';
  // 1. 只對資料陣列進行排序，不要碰 DOM
  // 動態排序條件陣列，按優先順序進行比較
  const sortingCriteria = [
    // {
    //   name: '確認是否本輪有死過',
    //   compare: (a, b) => {
    //     const getNeedBossCount = (obj) => {
    //       let dieCount = obj.result?.segments?.[0]?.deathList?.length ?? getBossCount(obj);
    //       return getBossCount(obj) - dieCount;
    //     };
    //     return getNeedBossCount(b) - getNeedBossCount(a);
    //   }
    // },
    {
      name: '對比重生次數',
      compare: (a, b) => b.respawnCount - a.respawnCount
    },
    {
      name: '對比預估出生時間%',
      compare: (a, b) => {
        // 必須要重生次數不為0才判斷
        if (a.respawnCount > 0 && b.respawnCount > 0) {
          const now = Date.now();
          const getPercentage = (obj) => {
            const defaultRespawnTime = new Date(obj.DefaultRespawnTime).getTime();
            const respawnTimeInMs = parseInt(obj.respawnTime) * 3600000;
            return Math.abs(now - defaultRespawnTime) / respawnTimeInMs * 100;
          };
          return getPercentage(a) - getPercentage(b);
        } else {
          return 0;
        }
      }
    },
    {
      name: '對比死亡時間',
      compare: (a, b) => new Date(a.death) - new Date(b.death)
    }
    // {
    //   name: '與上次死亡的時間差',
    //   compare: (a, b) => {
    //     const getDeathPer = (obj) => (obj.已死亡 ?? 0) / (obj.respawnTime * 3600);
    //     return getDeathPer(b) - getDeathPer(a);
    //   }
    // },

  ];
// sort()會依匿名函式的參數與回傳的值為精確的排序規則：

// 當回傳值為負數時，那麼前面的數放在前面
// 當回傳值為正整數，那麼後面的數在前面
// 當回傳值為零，保持不動。
  // 按動態條件進行排序
  console.log("按動態條件進行排序")
  bossListData.sort((a, b) => {
    for (let criterion of sortingCriteria) {
      const diff = criterion.compare(a, b);
      // console.log(criterion.name, a.bossName, b.bossName, diff);
      // 這邊必須要判斷不等於0才會跑下一個條件
      if (diff != 0) {
        return diff;
      }
    }
    return 0;
  });

  // 2. 更新表格的順序
  const bossTableBody = document.getElementById("bossList").getElementsByTagName("tbody")[0];
  const newOrder = bossListData.map(boss => document.getElementById("boss_" + boss.id));

  // 移除現有所有行，並按新順序重新加入
  while (bossTableBody.firstChild) {
      bossTableBody.removeChild(bossTableBody.firstChild);
  }
  newOrder.forEach(row => {
      if (row) { // 確保元素存在
          bossTableBody.appendChild(row);
      }
  });

  setTimeout(() => {
    speakOpen = true;
  }, 5000);
}


function deleteBoss(button) {
    var row = button.parentNode.parentNode;
    
    // 使用儲存在 ID 儲存格上的屬性來取得 ID
    const idCell = row.querySelector('[data-boss-id]'); 
    var id = idCell ? idCell.getAttribute('data-boss-id') : null;

    // 由於 bossName 是可編輯的，這裡假設它在配置中的第二欄
    const bossNameCellIndex = columnConfig.findIndex(c => c.key === 'bossName');
    var bossName = row.cells[bossNameCellIndex].innerText;


    if (!id || !bossName) {
        alert("無法找到 Boss ID 或名稱，無法刪除。");
        return;
    }
    
    var confirmation = confirm("確定要刪除此 Boss [" + id + "]" + bossName+ " 嗎？");
    if (confirmation) {
        bossListData = bossListData.filter(function(item) {
            return ((item.id !== id) || (item.bossName !== bossName));
        });
        saveToLocalStorage();
        sortListByRespawnTime();
    }
}

// 计算预估出生时间
function getRebirthTime(respawnTime) {

  // 計算下一次 Boss 出生時間
  const nextSpawn = getSpawnTime(new Date(), respawnTime);
  return nextSpawn;
}
function getSpawnTime(currectTime, cycleHours) {
  // 當前時間
  const now = currectTime;
  
  // 將基礎時間轉為 Date 物件
  const baseDate = new Date(baseTime);

  // 計算從基礎時間到當前時間的差距（毫秒）
  const timeDiffMs = now - baseDate;

  // 將差距轉換成小時
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

  // 計算下次預估的時間
  const nextCycle = Math.ceil(timeDiffHours / cycleHours) * cycleHours;

  // 計算下一次出現的時間
  const nextSpawnTime = new Date(baseDate.getTime() + nextCycle * 60 * 60 * 1000);

  return nextSpawnTime;
}

// 取得當前時間的時間區段
function getSpawnRange(currectTime, cycleHours) {
  var time2 = getSpawnTime(currectTime, cycleHours);
  var time1 = time2 - (cycleHours * 60 * 60 * 1000);
  return formatDateTime_Easy(new Date(time1), new Date(time2));
}

function updateBossRemainingTime(bossID = 0) {
  // 判斷是否需要重新排列
  var needSortList = false
  var now = new Date();

  bossListData.forEach(function(bossData) {

    // 如果有指定bossID, 且判斷到id 不相符, 就換下一個
    if (bossID != 0 && bossData.id != bossID) {
      return;
    }

    // 取得row
    var row = document.getElementById("boss_"+bossData.id);
    if (!row) return; // 安全檢查

    // --- 計算邏輯 (不變) ---
    var respawnTimeHours = parseInt(bossData.respawnTime);
    var respawnDate = getRebirthTime(respawnTimeHours); // 计算预估出生时间
    bossData.DefaultRespawnTime = respawnDate
    var percentage = ((Math.abs(now - respawnDate) / (respawnTimeHours * 3600000)) * 100);



    var lastRespawnTime = respawnDate - (respawnTimeHours * 60 * 60 * 1000);

    // 1. 儲存舊的格式化字串
    let oldFormattedInterval = bossData.重生間隔;

    // 2. 計算並取得新的格式化字串
    let newFormattedInterval = formatDateTime_Easy(new Date(lastRespawnTime), new Date(respawnDate));

    // 3. 賦值 (更新 bossData)
    bossData.重生間隔 = newFormattedInterval; 

    // 4. 比較「舊的字串」與「新的字串」
    if (oldFormattedInterval !== newFormattedInterval) {
      needSortList = true;
      // 只有當「格式化字串」確實改變時，才執行後續邏輯
      bossData.result = findLostBoss(bossData);
      bossData.respawnCount = bossData.result.rebornCount;
    }

    // 透過 key 或 data-col-id 找到儲存格並更新
    const emblemCell = row.querySelector('[contenteditable="true"]:nth-child(' + (columnConfig.findIndex(c => c.key === 'emblem') + 1) + ')');
    const deathTimeCell = row.querySelector('[contenteditable="true"]:nth-child(' + (columnConfig.findIndex(c => c.key === 'death') + 1) + ')');

    if (deathTimeCell) deathTimeCell.innerText = bossData.death;
    if (emblemCell) emblemCell.innerText = bossData.emblem;

    // 預估出生時間 (cellId: respawn-range)
    const respawnRangeCell = row.querySelector('[data-col-id="respawn-range"]');
    if (respawnRangeCell) {
        respawnRangeCell.innerText = bossData.重生間隔 + "(" +(100-percentage).toFixed(2)+"%)";
    }

    // 可能重生次數 (cellId: respawn-count)
    bossData.respawnCount = bossData.result.rebornCount
    const respawnCountCell = row.querySelector('[data-col-id="respawn-count"]');
    if (respawnCountCell) {
        respawnCountCell.innerText = bossData.respawnCount;
        respawnCountCell.style.textAlign = 'center';
        respawnCountCell.style.verticalAlign = 'middle';
    }
      
    // 距離上次死亡/機率 (cellId: time-gap)
    getTimeDiff(bossData);
    const getDeathPer = (obj) => (obj.已死亡 ?? 0) / (obj.respawnTime * 3600 * 1000);
    let bossUpPer = getDeathPer(bossData).toFixed(2)
    const timeGapCell = row.querySelector('[data-col-id="time-gap"]');
    if (timeGapCell) {
        timeGapCell.innerText = formatTimeDifference(bossData.已死亡) + "(" + bossUpPer +")";

        // 閃爍效果邏輯
        let respawnTimeInSeconds = bossData.respawnTime * 3600 * 1000;
        if (bossData.已死亡 > respawnTimeInSeconds) {
            timeGapCell.classList.add('blinking');
        } else {
            timeGapCell.classList.remove('blinking');
        }
    }

    // 活動機率 (cellId: active-rate)
    const activeRateCell = row.querySelector('[data-col-id="active-rate"]');
    activeRateCell.innerHTML = msgFromActive([parseInt(bossData.id)]);

    // 判斷Boss 出現的機率
    let bossUprate = Math.abs(100-percentage) + (bossData.respawnCount > getBossCount(bossData) ? 50 : 0)
    // 移除所有的class
    row.className = ''
    if (bossData.respawnCount > 0) {
      // 還沒到重生時間
      if (bossUprate >= 90) {
          if (!row.classList.contains('boss顏色-90')) {
              row.classList.add('boss顏色-90');
          }
      } else if (bossUprate >= 75) {
        if (!row.classList.contains('boss顏色-75')) {
            // speak(bossData.bossName + "重生已過3/4");
            row.classList.add('boss顏色-75'); // 淡藍色
        }
      } else if (bossUprate >= 50) {
        if (!row.classList.contains('boss顏色-50')) {
          // speak(bossData.bossName + "重生已過2/4");
          row.classList.add('boss顏色-50'); // 淡綠色
        }
      } else if (bossUprate >= 25) {
        if (!row.classList.contains('boss顏色-25')) {
          // speak(bossData.bossName + "重生已過1/4");
          row.classList.add('boss顏色-25'); // 淡藍
        }
      }
    }
  });

  // 如果數量有變動, 就要重新排列
  if (needSortList == true) {
    sortListByRespawnTime();
  }
}

// 計算目標活動王數量
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


// 找出缺失的時間區段
function findLostBoss(bossData) {
  const bossDurationHour = bossData.respawnTime;
  const deathTime = bossData.deathList;
  const segmentDuration = bossDurationHour * 60 * 60 * 1000; // 每個區段的持續時間(轉為毫秒)

  const startPoint = getSpawnTime(config.rebootTime, bossDurationHour); // 指定的開始時間

  // 生成區段
  const segments = [];
  let currentSegmentStart = new Date(startPoint);

  // 生成區段直到當前時間
  const currentTime = new Date()

  while (currentSegmentStart < currentTime) {
      const segmentEnd = new Date(currentSegmentStart.getTime() + segmentDuration);
      let segmentTimes = bossData.deathList.filter(dl => new Date(dl.death) >= currentSegmentStart &&  new Date(dl.death) < segmentEnd);
      // 拿取得時段開始時間必須要大於config.rebootTime
      segments.push({ start: currentSegmentStart, end: segmentEnd, deathList: segmentTimes});
      
      currentSegmentStart = segmentEnd; // 更新為下一個區段的開始時間
  }
  // 取得reboot 之後的死亡次數
  let matchingTimes = bossData.deathList.filter(dl => new Date(dl.death) > config.rebootTime);



  segments.sort((a,b) => b.start - a.start);

  // Boss 死亡次數
  var dieCount = matchingTimes.length



  // 取得boss重生次數, 為區段* Boss每輪數量
  var bossCount = getBossCount(bossData)


  var aliveCount = (segments.length * bossCount) - dieCount;

  if (aliveCount > 3) {
    aliveCount = 3;
  }

  return {rebornCount: aliveCount, segments: segments};
}
function isDateInRange(date, startDate, endDate) {
    // 轉換成毫秒進行比較
    const targetDate = new Date(date).getTime();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    // 判斷日期是否在區間內
    return targetDate >= start && targetDate <= end;
}
function formatDateTime(date) {
    return date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0') + " " + date.getHours().toString().padStart(2, '0') + ":" + date.getMinutes().toString().padStart(2, '0') + ":" + date.getSeconds().toString().padStart(2, '0');
}

// 將Date 轉換為 小時~小時 這樣的格式
function formatDateTime_Easy(date, date2) {

    var dateString1 =date.getHours().toString().padStart(2, '0'); // + ":" + date.getMinutes().toString().padStart(2, '0') + ":" + date.getSeconds().toString().padStart(2, '0');
    var dateString2 = date2.getHours().toString().padStart(2, '0'); //+ ":" + date2.getMinutes().toString().padStart(2, '0') + ":" + date2.getSeconds().toString().padStart(2, '0');
    return dateString1 + "~" + dateString2;
}

function formatTimeDifference(timeDiff) {
  // 計算總天數
  var days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  // 計算剩餘的時、分、秒
  var hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  var minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  // var seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
  // 格式化輸出
  var formattedTime = "";

  if (days > 0) {
      formattedTime += days + " 天 ";
  }
  
  formattedTime += hours.toString().padStart(2, '0') + ":" + 
                   minutes.toString().padStart(2, '0');
                   // minutes.toString().padStart(2, '0') + ":" + 
                   // seconds.toString().padStart(2, '0');
  
  return formattedTime;
}

function getTimeGap(bossData) {
  if (bossData.deathList == null) {
    bossData.deathList = []
  }
  bossData.deathList = bossData.deathList.filter(item => item.emblem !== undefined);
  if (bossData.deathList.length > 1) {
    var timeB = bossData.deathList[0].death
    // 計算時間差（以毫秒為單位）
    const timeDifference = new Date() - new Date(timeB);
    var timeDiffFix = Math.abs(timeDifference);
    return new Date(timeDiffFix);
  } else {
    return new Date(0)
  }
}

function getTimeDiff(bossData) {
  if (bossData.deathList == null) {
    bossData.deathList = []
  }
  bossData.deathList = bossData.deathList.filter(item => item.emblem !== undefined);


  let timeB = bossData.deathList[0]?.death || config.rebootTime
  // 現在時間跟最後一次死亡時間相差
  let timeDifference = new Date() - new Date(timeB);
  let timeDiffFix = Math.abs(timeDifference);  // 時間差以毫秒為單位

  // 將毫秒轉換為小時、分鐘、秒，或按你需求格式化
  const diffInSeconds = Math.floor(timeDiffFix / 1000);
  const diffInMinutes = Math.floor(timeDiffFix / (1000 * 60));
  const diffInHours = Math.floor(timeDiffFix / (1000 * 60 * 60));
  // 採用毫秒計算
  bossData.已死亡 = timeDiffFix
}


// 重置所有資料
function resetData(button) {
    var confirmation = confirm("確定重置所有資料使用預設值？");
    if (confirmation) {
        bossListData = defaultData;
        sortListByRespawnTime();
        saveToLocalStorage();
    }
}
function isValidDate(value) {
  const date = new Date(value);
  return date instanceof Date && !isNaN(date);
}



function compareTime(time1, time2, bossCount) {
    // 將時間轉換為 Date 物件
    const date1 = new Date(time1.replace(" ", "T"));
    const date2 = new Date(time2.replace(" ", "T"));

    // 如果 bossCount 等於 1，只比較 HH:mm
    if (bossCount === 1) {
        const hours1 = date1.getHours();
        const minutes1 = date1.getMinutes();
        const hours2 = date2.getHours();
        const minutes2 = date2.getMinutes();

        // 比較小時和分鐘
        if (hours1 > hours2 || (hours1 === hours2 && minutes1 > minutes2)) {
            return 1; // time1 較大
        } else if (hours1 < hours2 || (hours1 === hours2 && minutes1 < minutes2)) {
            return -1; // time2 較大
        } else {
            return 0; // 兩者相等
        }
    } else {
        // bossCount 大於 1，直接比較完整時間
        if (date1 > date2) {
            return 1; // time1 較大
        } else if (date1 < date2) {
            return -1; // time2 較大
        } else {
            return 0; // 兩者相等
        }
    }
}

// 檢查資料的函式
function check_Death(boss, newDeath) {
  const newDeathTime = new Date(newDeath.replace(" ", "T"));
  const currentTime = new Date();

  // 比對 deathList 中是否有重複條件的項目
  const isDuplicate = boss.deathList.some(entry => {
    const existingDeathTime = new Date(entry.death.replace(" ", "T"));

    // 比較 HH 和 mm 是否相同
    const isSameHourMinute = 
      newDeathTime.getHours() === existingDeathTime.getHours() &&
      newDeathTime.getMinutes() === existingDeathTime.getMinutes();


    const bossCount = getBossCount(boss)

    if (isSameHourMinute) {
      if (bossCount === 1) {
        return false
      }

      const timeDifferenceWithCurrent = Math.abs(currentTime - existingDeathTime);
      const timeDifferenceWithNew = Math.abs(newDeathTime - existingDeathTime);

      // 情況 1: 如果 HH:mm 相同且距離當前時間超過 120 秒，則認為是重複
      // 情況 2: 如果 HH:mm 相同且與其他資料時間差小於 5 秒，則認為是重複
      return timeDifferenceWithCurrent > 30 * 1000 || timeDifferenceWithNew < 5 * 1000;
    }
    return false;
  });

  // 若無重複，則通過檢查
  return !isDuplicate;
}


function speak(text) {
  if (!speakOpen) {
    return;
  }
  var slider = document.getElementById("percentageSlider");
  if (text.trim() !== '') {
    var synth = window.speechSynthesis;
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = slider.value / 100; // 設定音量為 50%
    synth.speak(utterance);
  } else {
    console.log("請輸入要說的文字");
  }
}

// 顯示懸浮文字欄位
function showTooltip(event, data) {
  var tooltip = document.createElement("div");
  tooltip.className = "tooltip";

  var msg = "<div>" +data.bossName + "的死亡紀錄:</div>";

  const bossDurationHour = data.respawnTime;
  const segmentDuration = bossDurationHour * 60 * 60 * 1000; // 每個區段的持續時間（5小時，轉換為毫秒）
  if (data.deathList.length == 0) {
    return;
  }
  const startPoint = getSpawnTime(new Date(data.deathList[data.deathList.length - 1].death), bossDurationHour).getTime() - segmentDuration; // 指定的開始時間

  // 生成區段
  const segments = [];
  let currentSegmentStart = new Date(startPoint);

  // 生成區段直到當前時間
  const currentTime = new Date()
  while (currentSegmentStart < currentTime) {
      const segmentEnd = new Date(currentSegmentStart.getTime() + segmentDuration);
      let matchingTimes = data.deathList.filter(dl => new Date(dl.death) >= currentSegmentStart &&  new Date(dl.death) < segmentEnd);
      segments.push({ start: currentSegmentStart, end: segmentEnd, deathList: matchingTimes});

      currentSegmentStart = segmentEnd; // 更新為下一個區段的開始時間
  }

  segments.sort((a,b) => b.start - a.start);

  const 需要顯示的 = segments.splice(0, 20)

  msg += "<table>";
  需要顯示的.forEach(function(segment) {
    // 只顯示到維修的資料
    if (config.rebootTime < segment.end) {
      var needReboot = (config.rebootTime >= segment.start &&  config.rebootTime < segment.end)

      msg += "<tr>";
      msg += "<td style='vertical-align: top;'>" + segment.start.getDate() + "(" + formatDateTime_Easy(segment.start, segment.end) + ")</td>";
      msg += "<td>";
      segment.deathList.forEach(function(deathTime) {
        if (needReboot == true) {
          if (new Date(deathTime.death) < config.rebootTime) {
            msg += "<div style='color: yellow;'>重新開機" +rebootTime+"</div>";
            needReboot = false
          }
        }
        if (deathTime.isActive) {
          msg += "<div style='color: red;'>";
        } else {
          msg += "<div>";
        }
        msg += deathTime.death;

        msg += deathTime.emblem;
        if ([1,2].includes(deathTime.type || 0)) {
          msg += " " + (deathTime.bossName || "null");
        }
        msg += "</div>";  
        
      })
      //如果紀錄都刷完,還沒顯示
      if (needReboot == true) {
        msg += "<div style='color: yellow;'>重新開機" +config.rebootTime+"</div>";
      }
      msg += "</td>";
      msg += "</tr>"
    }
  })
  msg += "</table>";

  tooltip.innerHTML = msg;

  var topPos = event.clientY + window.scrollY + 10;
  var leftPos = event.clientX + window.scrollX + 10;
  tooltip.style.top = topPos + "px";
  tooltip.style.left = leftPos + "px";


  document.body.appendChild(tooltip);
  
  // 懸浮文字的位置
  var topPos = event.clientY + window.scrollY + 10;
  var leftPos = event.clientX + window.scrollX + 10;

  // 取得懸浮框的尺寸
  var tooltipRect = tooltip.getBoundingClientRect();
  var tooltipHeight = tooltipRect.height;
  var tooltipWidth = tooltipRect.width;

  // 取得視窗的尺寸
  var windowHeight = window.innerHeight;
  var windowWidth = window.innerWidth;

  // 如果懸浮框高度超過視窗高度，固定懸浮框的頂部靠近視窗頂部，確保顯示最上面的資料
  if (event.clientY > (windowHeight/2)) {
    topPos -= (windowHeight/4);// 貼近視窗的頂部
  } 
  tooltip.style.top = topPos + "px";
  tooltip.style.left = leftPos + "px";
}

// 隱藏懸浮文字欄位
function hideTooltip() {
  var tooltips = document.querySelectorAll(".tooltip");
  tooltips.forEach(function(tooltip) {
    tooltip.parentNode.removeChild(tooltip);
  });
}


function showfloatingMessage(msg) {
    var message = document.getElementById('floatingMessage');
    message.style.display = 'block';
    message.innerText = msg;
    setTimeout(function() {
        message.style.display = 'none';
    }, 10000); // 3 seconds
}


function drawMessage(message) {
    var p = document.createElement('p');
    p.textContent = message
    messageContainer.appendChild(p);
    messageCount++;
    if (messageCount > 100) {
        messageContainer.removeChild(messageContainer.firstChild);
        messageCount--;
    }
    messageContainer.scrollTop = messageContainer.scrollHeight;
}


function filterTable(bossIDs) {
    filterBossIDs = bossIDs;
    var table, tr, td, i, txtValue;
    var bossIdArray = bossIDs.split(',').map(name => name.trim().toLowerCase());
    table = document.getElementById("bossList");
    tr = table.getElementsByTagName("tr");

    // 1. 取得 ID 欄位的索引位置 (從 columnConfig 獲取)
    // 找出配置陣列中 key 為 'id' 的物件索引
    const idColumnIndex = columnConfig.findIndex(config => config.key === 'id'); 
    
    // 如果找不到 ID 欄位，則無法過濾，直接返回或給予提示
    if (idColumnIndex === -1) {
        console.error("錯誤：columnConfig 中找不到 'id' 欄位配置。無法執行過濾。");
        return; 
    }

    for (i = 1; i < tr.length; i++) {
      if (bossIDs === "") {
        tr[i].style.display = "";
      } else {
        
        // 2. 使用動態索引來取得 ID 欄位的儲存格
        // 注意：HTML DOM 集合也是從 0 開始索引
        td = tr[i].getElementsByTagName("td")[idColumnIndex]; 
        
        if (td) {
            // 從儲存格的文字內容中獲取 ID
            txtValue = td.textContent || td.innerText;
            // 由於 ID 欄位可能包含其他屬性，如果我們像 deleteBoss 一樣將 ID 存在 data-boss-id 屬性中會更穩健
            // 但為了保持簡單並符合您現有的結構，這裡仍使用 textContent
            
            if (bossIdArray.some(id => txtValue.trim() == id)) {
              tr[i].style.display = "";
            } else {
              tr[i].style.display = "none";
            }
        }
      }

    }
}

setInterval(() => {
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    checkDC的Boss頁面是否有開啟();
  }
}, 5000);

function checkDC的Boss頁面是否有開啟() {
  // 檢查 chrome.runtime 是否存在，並且 onMessage 屬性是否可存取
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      // 只有在確認存在時才執行註冊監聽器的操作
    chrome.tabs.query({ url: 'https://discord.com/channels/1124664207921655830/1186526426770444329' }, (tabs) => {
      if (tabs.length === 0) {
          console.log("找不到符合條件的標籤頁，開啟一個新分頁並跳轉...");
          chrome.tabs.create({url: 'https://discord.com/channels/1124664207921655830/1186526426770444329', active: true}, function(tab) {
              console.log("新分頁已開啟並跳轉", tab);
          });
      }
    });
  } else {
      // 這裡可以選擇性地加入一些錯誤記錄，說明 API 不可用
      console.error("錯誤：chrome.tabs.query 在此環境中不可用。");
  }
}

function 取得Boss歷史資料(myDayTime) {
  // 檢查 chrome.runtime 是否存在，並且 onMessage 屬性是否可存取
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      // 只有在確認存在時才執行註冊監聽器的操作
  } else {
      // 這裡可以選擇性地加入一些錯誤記錄，說明 API 不可用
      console.error("錯誤：chrome.tabs.query 在此環境中不可用。");
      return;
  }  
  chrome.tabs.query({ url: 'https://discord.com/channels/1124664207921655830/1186526426770444329' }, (tabs) => {
    tabs.forEach((tab) => {
     
      var dayTime = (function() {
          if (myDayTime) {
              return new Date(myDayTime);
          } else {
              // 获取当前日期时间
              let currentDate = new Date();
              // 减去1天
              currentDate.setDate(currentDate.getDate() - 1);

              return currentDate;
          }
      })();

      // 檢查是否有Boss資訊頁面
      checkDC的Boss頁面是否有開啟();
      // 自動跳轉到DC分頁
      chrome.tabs.update(tab.id, { active: true });

      const sendData = { 
        action: 'getData', 
        dayTime: dayTime 
      }

      console.log("準備發送取得舊資料的message, 時間:", dayTime);
      console.log("對", tab.url, "傳送資料:", sendData);
      chrome.tabs.sendMessage(tab.id, sendData, (response) => {
        if (chrome.runtime.lastError) {
          console.error("bossTimeContentScript.js 發送訊息到 ", tab.url, " 失敗,", chrome.runtime.lastError, "Data:", sendData);
        } else {
          console.log("bossTimeContentScript.js 發送訊息到 ", tab.url, " 成功，回應:", response);
          // 處理收到的回應
        }
      });
    });
  });

}


function throttle(func, delay = 1000) {
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, delay);
    }
  };
}