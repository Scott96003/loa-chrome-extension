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


function refresh() {
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
    //重新整理
    refresh(); 
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
  var bossTable = document.getElementById("bossList").getElementsByTagName('tbody')[0];
  bossTable.innerHTML = '';

  // 動態排序條件陣列，按優先順序進行比較
  const sortingCriteria = [
    {
      name: '與上次死亡的時間差',
      compare: (a, b) => {
        const getDeathPer = (obj) => (obj.bossDeathDiff?.seconds ?? 0) / (obj.respawnTime * 3600);
        return getDeathPer(b) - getDeathPer(a);
      }
    },
    {
      name: '確認是否本輪有死過',
      compare: (a, b) => {
        const getNeedBossCount = (obj) => {
          let dieCount = obj.result?.segments?.[0]?.deathList?.length ?? getBossCount(obj);
          return getBossCount(obj) - dieCount;
        };
        return getNeedBossCount(b) - getNeedBossCount(a);
      }
    },
    {
      name: '計算預估出生時間%',
      compare: (a, b) => {
        const now = Date.now();
        const getPercentage = (obj) => {
          const defaultRespawnTime = new Date(obj.DefaultRespawnTime).getTime();
          const respawnTimeInMs = parseInt(obj.respawnTime) * 3600000;
          return Math.abs(now - defaultRespawnTime) / respawnTimeInMs * 100;
        };
        return getPercentage(a) - getPercentage(b);
      }
    },
    {
      name: '還有多少次重生',
      compare: (a, b) => b.respawnCount - a.respawnCount
    },
    {
      name: '比對死亡時間',
      compare: (a, b) => a.death - b.death
    }
  ];

  // 按動態條件進行排序
  bossListData.sort((a, b) => {
    for (let criterion of sortingCriteria) {
      const diff = criterion.compare(a, b);
      console.log(criterion.name, a.bossName, b.bossName, diff);
      if (diff !== 0) {
        return diff;
      }
    }
    return 0; // 所有條件相同時維持原順序
  });

  console.log("排序後的資料:");
  console.log(bossListData);

  bossListData.forEach(function(item) {
    addBossTR(item);
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
 
function updateBossRemainingTime() {
    var now = new Date();
    bossListData.forEach(function(bossData) {
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

        bossData.重生間隔 = formatDateTime_Easy(new Date(lastRespawnTime),new Date(respawnDate));
        row.cells[5].innerText = bossData.重生間隔 + "(" +(100-percentage).toFixed(2)+"%)";


        // 預計重生次數
        // 找出是否有遺漏重生的boss
        result = findLostBoss(bossData);
        bossData.result = result;

        // 可能重生次數
        bossData.respawnCount = result.rebornCount
        row.cells[6].innerText = bossData.respawnCount;
        row.classList.remove()
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

       
          // 取得每一輪boss應該有的數量
          var bossCount = getBossCount(bossData)


          // 兩次重生沒出
          if ((result.segments[1] != undefined) && ((result.segments[1]?.deathList?.length ?? 0)== 0)) {
            if (!row.classList.contains('double-boss')) {
              row.classList.add('double-boss'); // 深紅色
            }
            // 是否可能重生
            row.cells[6].innerText = bossData.respawnCount + " - 上輪沒出";
            
          }

        }





        // 文字水平置中
        row.cells[6].style.textAlign = 'center';

        // 文字垂直置中
        row.cells[6].style.verticalAlign = 'middle';

        // 死亡間格
        let bossDeathDiff = getTimeDiff(bossData);
        bossData.bossDeathDiff = bossDeathDiff
        const getDeathPer = (obj) => (obj.bossDeathDiff?.seconds ?? 0) / (obj.respawnTime * 3600);

        row.cells[7].innerText = formatTimeDifference(bossDeathDiff.milliseconds) + "(" + getDeathPer(bossData).toFixed(2) +")";
        

        // 計算總秒數
        let totalSeconds = bossDeathDiff.seconds;
        if (totalSeconds > 0) {
            let respawnTimeInSeconds = bossData.respawnTime * 3600; // 將 respawnTime 轉換為秒
            

            if (totalSeconds > respawnTimeInSeconds) {
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
}

// 找出缺失的時間區段
function findLostBoss(bossData) {
  const bossDurationHour = bossData.respawnTime;
  const deathTime = bossData.deathList;
  const segmentDuration = bossDurationHour * 60 * 60 * 1000; // 每個區段的持續時間(轉為毫秒)


  const startPoint = getSpawnTime(rebootTime, bossDurationHour); // 指定的開始時間

  // console.log(bossData.bossName, "StartPoint", startPoint, "segmentDuration", segmentDuration, "durationCount", durationCount)
  // 生成區段
  const segments = [];
  let currentSegmentStart = new Date(startPoint);

  // 生成區段直到當前時間
  const currentTime = new Date()
  while (currentSegmentStart < currentTime) {
      const segmentEnd = new Date(currentSegmentStart.getTime() + segmentDuration);
      let matchingTimes = bossData.deathList.filter(dl => new Date(dl.death) >= currentSegmentStart &&  new Date(dl.death) < segmentEnd);
      // 拿取得時段開始時間必須要大於rebootTime
      if (currentSegmentStart > rebootTime) {
        segments.push({ start: currentSegmentStart, end: segmentEnd, deathList: matchingTimes});
      }
      currentSegmentStart = segmentEnd; // 更新為下一個區段的開始時間
  }

  segments.sort((a,b) => b.start - a.start);
  
  // 找出沒有在時間陣列中的區段
  const missingSegments = segments.filter(segment => { 
      let matchingTimes = deathTime.filter(data => new Date(data.death) >= segment.start && new Date(data.death) < segment.end);
      segment.deathList = matchingTimes
      return (matchingTimes >= 0)
  });

  var dieCount = 0
  segments.forEach(function(segment) {
      dieCount += segment.deathList.length
  })


  // 取得boss重生次數, 為區段* Boss每輪數量
  var bossCount = getBossCount(bossData)


  var aliveCount = 0;
  // 查看每一輪
  for (const segment of segments) {
    aliveCount += bossCount - segment.deathList.length;
  }
  if (aliveCount > 3) {
    aliveCount = 3;
  }
  // 輸出結果
  // console.log(bossData.bossName, bossData.id)
  // console.log("needBossCount:", needBossCount)
  // console.log(startPoint);
  // console.log(segments, dieCount);
  // console.log(aliveCount);

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
    var hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    return hours.toString().padStart(2, '0') + ":" + minutes.toString().padStart(2, '0') + ":" + seconds.toString().padStart(2, '0');
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

  if (bossData.deathList.length > 1) {
    var timeB = bossData.deathList[0].death
    const timeDifference = new Date() - new Date(timeB);
    var timeDiffFix = Math.abs(timeDifference);  // 時間差以毫秒為單位

    // 將毫秒轉換為小時、分鐘、秒，或按你需求格式化
    const diffInSeconds = Math.floor(timeDiffFix / 1000);
    const diffInMinutes = Math.floor(timeDiffFix / (1000 * 60));
    const diffInHours = Math.floor(timeDiffFix / (1000 * 60 * 60));

    return {
        milliseconds: timeDiffFix,
        seconds: diffInSeconds,
        minutes: diffInMinutes,
        hours: diffInHours
    };
  }


  return {
      milliseconds: 0,
      seconds: 0,
      minutes: 0,
      hours: 0
  };

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

  rebootTime = new Date(localStorage.getItem("rebootTime")) || new Date(baseTime)

  var maxDeathTime = bossListData[0].death
  // 找到最後一筆死亡資料
  bossListData.forEach(function(data) {
    if (maxDeathTime < data.death) {
      maxDeathTime = data.death
    }
  })

  // 重新獲取資料
  getOldData(new Date(maxDeathTime));

  loadFromBossListData();
}

function loadFromBossListData() {
    console.log("重新使用BossListDat加載");
    if (bossListData.length > 0) {
        var bossTable = document.getElementById("bossList").getElementsByTagName("tbody")[0];
        // 清空table
        bossTable.innerHTML = "";
        console.log(bossListData);
        bossListData.forEach(function(item) {
          addBossTR(item);
        })
    }
    sortListByRespawnTime();
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
    var needReboot = (rebootTime >= segment.start &&  rebootTime < segment.end)


    msg += "<tr>";
    msg += "<td style='vertical-align: top;'>" + segment.start.getDate() + "(" + formatDateTime_Easy(segment.start, segment.end) + ")</td>";
    msg += "<td>";
    if (needReboot == true) {
      msg += "<div style='color: yellow;'>重新開機" +rebootTime+"</div>";
    }
    segment.deathList.forEach(function(deathTime) {
      if (needReboot == true) {
        if (new Date(deathTime.death) > rebootTime) {
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
    msg += "</td>";
    msg += "</tr>"
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
  if (tooltipHeight > windowHeight) {
    topPos = window.scrollY; // 貼近視窗的頂部
  } else {
    // 調整 top 位置，如果超出視窗下邊界
    if (topPos + tooltipHeight > windowHeight) {
      topPos = windowHeight - tooltipHeight + window.scrollY; // 保證懸浮框完整顯示
    }
  }

  // 調整 left 位置，如果超出視窗右邊界
  if (leftPos + tooltipWidth > windowWidth) {
    leftPos = event.clientX + window.scrollX - tooltipWidth - 10;
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