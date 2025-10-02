document.addEventListener("DOMContentLoaded", function() {
  // 获取表格元素
  bossTable = document.getElementById("bossList");

  slider = document.getElementById("percentageSlider");
  display = document.getElementById("percentageDisplay");

    // 訊息事件
    messageContainer = document.getElementById('messageContainer');
    toggleMessageContainerBtn = document.getElementById('toggleMessageContainer');

    toggleMessageContainerBtn.addEventListener('click', function() {
      if (messageContainer.style.display === 'none' || messageContainer.style.display === '') {
          messageContainer.style.display = 'block';
      } else {
          messageContainer.style.display = 'none';
      }
    });
   

  // 添加事件监听器
  bossTable.addEventListener("input", function(event) {
      var target = event.target;
      // 检查是否是表格单元格
      if (target.tagName === "TD") {
          // 处理表格单元格内容变化事件
          console.log("表格单元格内容被修改了：", target.innerText);
          // 在这里可以执行您想要的操作，例如更新数据或触发其他事件等
          var row = target.parentNode; // 获取单元格所在的行


          var data = {
            id: row.cells[7].innerText,
            bossName: row.cells[1].innerText,
            respawnTime: row.cells[2].innerText,
            death: row.cells[3].innerText
          }

          bossListData.forEach(function(item, index) {
              if ((item.id == data.id) || (item.bossName == data.bossName)) {
                  console.log("改變data");
                  bossListData[index].id = row.cells[9].innerText;
                  bossListData[index].bossName = row.cells[1].innerText;
                  bossListData[index].respawnTime = row.cells[2].innerText;
                  bossListData[index].death = row.cells[3].innerText;
                  console.log(bossListData[index]);
              }
          });
          console.log(bossListData);
      }
  });

  // 監聽拉條值的變化
  slider.addEventListener("input", () => {
      voiceCount = slider.value;
      display.textContent = `${voiceCount}%`;
      localStorage.setItem("voiceCount", voiceCount);
      // 將數值傳遞給其他地方使用（例如其他 JavaScript 函式）
      // 在這裡您可以執行您想要的操作
      // 例如：將百分比值傳遞給其他函式或存儲在變數中
      // 例如：myFunction(percentage);
  });


  var btn_addToBossList = document.getElementById("btn_addToBossList");
  var btn_refresh = document.getElementById("btn_refresh");
  var btn_clear = document.getElementById("btn_clear");
  var btn_reboot = document.getElementById("btn_reboot");


  btn_addToBossList.addEventListener("click", function() {
      addToBossList(this);
  });
  btn_refresh.addEventListener("click", function() {
      refresh(this);
  });

  btn_resetData.addEventListener("click", function() {
      resetData(this);
  });

  btn_reboot.addEventListener("click", function() {
      createDateTimePicker(this);
  });

  btn_refreshDeathTime.addEventListener("click", function() {
      createDateTimePickerForDeathTime(this);
  });

  document.getElementById('confirmBtn').addEventListener('click', confirmDateTime);
  document.getElementById('cancelBtn').addEventListener('click', cancelDateTime);

  document.getElementById('confirmBtnForDeathTime').addEventListener('click', confirmDateTimeForDeathTime);
  document.getElementById('cancelBtnForDeathTime').addEventListener('click', cancelDateTimeForDeathTime);
});

document.addEventListener("DOMContentLoaded", function() {
    var buttonsContainer = document.getElementById("filterButtons");
    buttonsContainer.addEventListener("click", function(event) {
        if (event.target.tagName === "BUTTON") {
            var filterBossIDs = event.target.getAttribute("data-boss-name");
            filterTable(filterBossIDs);
        }
    });
});

window.onload = function() {
  console.log("window onload");
    loadFromLocalStorage();
    setInterval(updateBossRemainingTime, 60*1000); // 每秒更新剩余时间
};