// 監聽來自 Background Script 的消息 (Step1)
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
   // 在這裡處理接收到的消息

    var bossData = message;
    bossData.bossName = decodeURIComponent(message.bossName);
    bossData.emblem = decodeURIComponent(message.emblem);
    console.log("Boss死亡資訊:", bossData);
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

      // 將日期字串轉換為日期物件並進行排序
      boss.deathList = boss.deathList.sort(function(a, b) {
        var a_deathTime = new Date(a.death).getTime();
        var b_deathTime = new Date(b.death).getTime();
        return b_deathTime - a_deathTime;
      });
      // 只取維修後的資料
      boss.deathList = boss.deathList.filter(item => {
        return new Date(item.death) > config.rebootTime
      })

      // 在這裡處理 response，更新 bossListData，然後再呼叫 findLostBoss
      boss.result = findLostBoss(boss);
      boss.respawnCount = boss.result.rebornCount;

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

        // 單獨更新數據
        updateBossRemainingTime(parseInt(boss.id));
        // 使用節流方法實現refresh
        throttle(refresh(), 500);
        
        // 檢查是否觸發龍門
        tracker.checkBossData(bossData);
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
    config.messageList.push(message);
    drawMessage(message);
    showfloatingMessage(message);

    if (WEBHOOK_URL.length > 0) {
      setTimeout(() => {
          SendToDC(parseInt(bossData.id));
      }, 2000);
    }
}