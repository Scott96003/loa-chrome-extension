// bossListData 原始資料
var bossListData = [];
var messageList = [];
var voiceCount = 50;
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
// 設定重開機時間
var rebootTime = new Date('2024-01-04T12:00:00');
// 過濾後的bossID
var filterBossIDs = "";

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
  newRow.setAttribute("id", "boss_"+ data.id);

  var cell1 = newRow.insertCell(0);
  var cell2 = newRow.insertCell(1);
  var cell3 = newRow.insertCell(2);
  var cell4 = newRow.insertCell(3);
  var cell5 = newRow.insertCell(4);
  var cell6 = newRow.insertCell(5);
  var cell7 = newRow.insertCell(6);
  var cell8 = newRow.insertCell(7);
  var cell9 = newRow.insertCell(8);
  cell1.innerHTML = "<button id='delete_" + bossName + "'>刪除</button>";
  cell2.innerHTML = bossName;
  cell2.setAttribute("contenteditable", "true"); // 可编辑
  cell3.innerHTML = respawnTime; // 只显示数字
  cell3.setAttribute("contenteditable", "false"); // 可编辑
  // 文字水平置中
  cell3.style.textAlign = 'center';

  cell4.innerHTML = deathTime; // 显示日期时间
  cell4.setAttribute("contenteditable", "true"); // 可编辑
  cell5.innerHTML = data.emblem || "未知"; // 显示血盟
  cell6.innerHTML = formatDateTime(getRebirthTime(respawnTime)); // 显示日期时间
  cell6.setAttribute("contenteditable", "false"); // 可编辑
  cell7.innerHTML = ""; // 剩余时间，暂时为空
  // cell8.innerHTML = getTimeGap(data);
  // cell8.style.display = "none";
  cell9.innerHTML = id;
  // cell9.setAttribute("contenteditable", "true"); // 可编辑

  // 當滑鼠移過去時會多一個懸浮的文字欄位顯示我要的資料
  // 當滑鼠離開就消失
  cell4.addEventListener("mouseover", function(event) {
    showTooltip(event, data);
  });
  cell4.addEventListener("mouseout", function() {
    hideTooltip();
  });

  var deleteBtn = document.getElementById("delete_"+bossName);
  deleteBtn.addEventListener("click", function() {
      deleteBoss(this);
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
    rebootTime = now;

    saveToLocalStorage();
    // 重新讀取數據
    loadFromLocalStorage();
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
    getOldData(now);
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
    var id = row.cells[8].innerText;
    var bossName = row.cells[1].innerText;

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
      var row =document.getElementById("boss_"+bossData.id)

      var respawnTimeHours = parseInt(bossData.respawnTime);
      let part1Time = respawnTimeHours * 0.75 * 3600000;
      // 1/2
      var halfTime = respawnTimeHours * 0.5 * 3600000;
      // 2/3
      var quarterTime = respawnTimeHours * 0.25 * 3600000;
      var approachingTime = respawnTimeHours * 0.1 * 3600000;
      
      var deathTime = new Date(bossData.death);

      var respawnDate = getRebirthTime(respawnTimeHours); // 计算预估出生时间
      bossData.DefaultRespawnTime = respawnDate
      var respawnDate2 = new Date(deathTime.getTime() + respawnTimeHours * 3600000 * 2); // 计算预估2出生时间


      var lastRespawnTime = respawnDate - (respawnTimeHours * 60 * 60 * 1000);
      var lastRespawnTime2 = respawnDate - (respawnTimeHours * 2 * 60 * 60 * 1000);
      // 預估出生時間
      var percentage = ((Math.abs(now - respawnDate) / (respawnTimeHours * 3600000)) * 100);

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

      row.cells[3].innerText = bossData.death;
      row.cells[4].innerText = bossData.emblem;

      row.cells[5].innerText = bossData.重生間隔 + "(" +(100-percentage).toFixed(2)+"%)";

      // 可能重生次數
      bossData.respawnCount = bossData.result.rebornCount
      row.cells[6].innerText = bossData.respawnCount;
      // 移除所有的class
      row.className = ''
      if (bossData.respawnCount > 0) {
        // 還沒到重生時間
        if (now >= (bossData.DefaultRespawnTime - approachingTime)) {
            if (!row.classList.contains('approaching')) {
                row.classList.add('approaching');
            }
        } else if (now >= (bossData.DefaultRespawnTime - quarterTime)) {
          if (!row.classList.contains('quarter-time')) {
              // speak(bossData.bossName + "重生已過3/4");
              row.classList.add('quarter-time'); // 淡藍色
          }
        } else if (now >= (bossData.DefaultRespawnTime - halfTime)) {
          if (!row.classList.contains('half-time')) {
            // speak(bossData.bossName + "重生已過2/4");
            row.classList.add('half-time'); // 淡綠色
          }
        } else if (now >= (bossData.DefaultRespawnTime - part1Time)) {
          if (!row.classList.contains('part1-time')) {
            // speak(bossData.bossName + "重生已過1/4");
            row.classList.add('part1-time'); // 淡藍
          }
        }
      }

      // 文字置中
      row.cells[6].style.textAlign = 'center';
      row.cells[6].style.verticalAlign = 'middle';

      // 計算死亡間格
      getTimeDiff(bossData);
      // 用來速算 % 用的 
      const getDeathPer = (obj) => (obj.已死亡 ?? 0) / (obj.respawnTime * 3600 * 1000);

      row.cells[7].innerText = formatTimeDifference(bossData.已死亡) + "(" + getDeathPer(bossData).toFixed(2) +")";
      

      // 計算如果死亡時間超過間隔, 開始閃爍
      if (bossData.已死亡 > 0) {
          let respawnTimeInSeconds = bossData.respawnTime * 3600 * 1000; // 將 respawnTime 轉換為秒
          
          if (bossData.已死亡 > respawnTimeInSeconds) {
              // 加入閃爍效果
              row.cells[7].classList.add('blinking');
          } else {
              // 移除閃爍效果          
              row.cells[7].classList.remove('blinking');
          }
      } else {
          // 處理無效時間格式的情況，例如移除閃爍效果
          row.cells[7].classList.remove('blinking');
      }
  });

  // 如果數量有變動, 就要重新排列
  if (needSortList == true) {
    sortListByRespawnTime();
  }
}

// 找出缺失的時間區段
function findLostBoss(bossData) {
  const bossDurationHour = bossData.respawnTime;
  const deathTime = bossData.deathList;
  const segmentDuration = bossDurationHour * 60 * 60 * 1000; // 每個區段的持續時間(轉為毫秒)

  const startPoint = getSpawnTime(rebootTime, bossDurationHour); // 指定的開始時間

  // 生成區段
  const segments = [];
  let currentSegmentStart = new Date(startPoint);

  // 生成區段直到當前時間
  const currentTime = new Date()

  while (currentSegmentStart < currentTime) {
      const segmentEnd = new Date(currentSegmentStart.getTime() + segmentDuration);
      let segmentTimes = bossData.deathList.filter(dl => new Date(dl.death) >= currentSegmentStart &&  new Date(dl.death) < segmentEnd);
      // 拿取得時段開始時間必須要大於rebootTime
      segments.push({ start: currentSegmentStart, end: segmentEnd, deathList: segmentTimes});
      
      currentSegmentStart = segmentEnd; // 更新為下一個區段的開始時間
  }
  // 取得reboot 之後的死亡次數
  let matchingTimes = bossData.deathList.filter(dl => new Date(dl.death) > rebootTime);



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


  let timeB = bossData.deathList[0].death || rebootTime
  console.log(timeB)
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

function saveToLocalStorage() {
    console.log("將資料放到cookie");
    console.log(bossListData);
    localStorage.setItem("bossList", JSON.stringify(bossListData));
    localStorage.setItem("messageList", JSON.stringify(messageList));
    localStorage.setItem("rebootTime", rebootTime);
}

function loadFromLocalStorage() {
  console.log("loadFromLocalStorage");

  // 音量大小
  voiceCount = localStorage.getItem("voiceCount");
  if (voiceCount == null) {
    voiceCount = 50;
  }
  // 設定音量
  slider = document.getElementById("percentageSlider");
  display = document.getElementById("percentageDisplay");
  slider.value = voiceCount;
  display.textContent = `${voiceCount}%`;

  // 取得boss清單
  bossListData = JSON.parse(localStorage.getItem("bossList"));
  if (bossListData == null){
    bossListData = defaultData;
  }

  messageList = JSON.parse(localStorage.getItem("messageList"));
  if (messageList == null){
    messageList = [];
  } else {
    messageList.forEach(function(item) {
      drawMessage(item);
    });
  }

  // 如果沒有rebootTime 那就拿7天前的時間
  let 取得7天前的時間 = new Date().setDate(new Date().getDate() - 7)
  rebootTime = new Date(localStorage.getItem("rebootTime")) || 取得7天前的時間

  if (取得7天前的時間 > rebootTime) {
    rebootTime = 取得7天前的時間
  }



  var maxDeathTime = bossListData[0].death
  // 找到最後一筆死亡資料
  bossListData.forEach(function(data) {
    if (new Date(maxDeathTime) < new Date(data.death)) {
      maxDeathTime = data.death
    }
  })



  // 重新畫出所有數據
  console.log("重新使用BossListDat加載");
  if (bossListData.length > 0) {
      var bossTable = document.getElementById("bossList").getElementsByTagName("tbody")[0];
      // 清空table
      bossTable.innerHTML = "";
      console.log(bossListData);
      bossListData.forEach(function(boss) {
        // 在新增資料時才計算一次
        boss.result = findLostBoss(boss);
        boss.respawnCount = boss.result.rebornCount;
        // 將數據第一次畫出
        addBossTR(boss);
      })
  }

  // 刷新數據
  refresh();


  // 判斷是否需要重新獲取數據
  console.log("最後死亡時間:", maxDeathTime, new Date())

  let 最後記錄日期與今天相差 = (new Date() - new Date(maxDeathTime))/3600/24/1000
  // 重新獲取資料
  if (最後記錄日期與今天相差 > 7) {
    // 複製一個新的 Date 物件，以免修改到原始的 now 變數
    const sevenDaysAgo = new Date().setDate(new Date().getDate() - 7)
    getOldData(sevenDaysAgo);
  } else {
    getOldData(new Date(maxDeathTime));
  }
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


  msg += "<table>";
  segments.forEach(function(segment) {
    // 只顯示到維修的資料
    if (rebootTime < segment.end) {
      var needReboot = (rebootTime >= segment.start &&  rebootTime < segment.end)


      msg += "<tr>";
      msg += "<td style='vertical-align: top;'>" + segment.start.getDate() + "(" + formatDateTime_Easy(segment.start, segment.end) + ")</td>";
      msg += "<td>";
      segment.deathList.forEach(function(deathTime) {
        if (needReboot == true) {
          if (new Date(deathTime.death) < rebootTime) {
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
        msg += "<div style='color: yellow;'>重新開機" +rebootTime+"</div>";
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
  if (tooltipHeight > (windowHeight/2)) {
    topPos -= (windowHeight/4);// 貼近視窗的頂部
  } 
  console.log(event.clientY,window.scrollY,tooltipHeight,windowHeight)
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
  console.log(bossIDs)
    filterBossIDs = bossIDs;
    var table, tr, td, i, txtValue;
    var bossIdArray = bossIDs.split(',').map(name => name.trim().toLowerCase());
    table = document.getElementById("bossList");
    tr = table.getElementsByTagName("tr");
    for (i = 1; i < tr.length; i++) {
      if (bossIDs === "") {
        tr[i].style.display = "";
      } else {
        
        td = tr[i].getElementsByTagName("td")[8]; // 頭目 id 所在列
        if (td) {
            txtValue = td.textContent || td.innerText;

            if (bossIdArray.some(id => txtValue == id)) {
              tr[i].style.display = "";
            } else {
              tr[i].style.display = "none";
            }
        }
      }

    }
}



function checkBossDataIsNew() {
  chrome.tabs.query({ url: 'https://discord.com/channels/1124664207921655830/1186526426770444329' }, (tabs) => {
    if (tabs.length === 0) {
        console.log("找不到符合條件的標籤頁，開啟一個新分頁並跳轉...");
        chrome.tabs.create({url: 'https://discord.com/channels/1124664207921655830/1186526426770444329', active: true}, function(tab) {
            console.log("新分頁已開啟並跳轉", tab);
        });
    }
  });

  if (bossListData.length <= 0) {
    getOldData();
  }
}

function getOldData(myDayTime) {
  console.log("準備發送取得舊資料的message", "時間:", myDayTime);
  chrome.tabs.query({ url: 'https://discord.com/channels/1124664207921655830/1186526426770444329' }, (tabs) => {
    tabs.forEach((tab) => {
      console.log(`Tab ID: ${tab.id}, URL: ${tab.url}`);
      var dayTime = (function() {
          if (myDayTime) {
              return myDayTime;
          } else {
              // 获取当前日期时间
              let currentDate = new Date();
              // 减去1天
              currentDate.setDate(currentDate.getDate() - 1);

              return currentDate;
          }
      })();

      // 格式化成 YYYY-MM-DD HH:mm 格式
      let dayTimeFormat = dayTime.toISOString().slice(0, 16).replace('T', ' ');

      // 自動跳轉到DC分頁
      chrome.tabs.update(tab.id, { active: true });

      chrome.tabs.sendMessage(tab.id, { action: 'getData', dayTime: dayTime }, (response) => {
        console.log('Response from content script:', response);
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