// 如果您同時使用 Web Audio (例如播放背景音樂)
let audioContext;
/**
 * TTS 自動播報解鎖模組
 * 確保在行動裝置上，語音合成 (TTS) 功能能夠被用戶互動解鎖。
 */

let isTTSReady = false; // 全局旗標：指示語音是否已解鎖

// ----------------------------------------------------
// 1. 判斷是否為行動裝置
// ----------------------------------------------------

function isMobileDevice() {
    // 簡單檢查 User Agent 字串是否包含常見的行動裝置關鍵字
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|iphone|ipad|ipod|windows phone/i.test(userAgent) && !window.MSStream;
}

// ----------------------------------------------------
// 2. 語音解鎖函式
// ----------------------------------------------------

function unlockTTS() {
    if (isTTSReady) return;

    console.log("嘗試在用戶互動中解鎖 TTS...");

    // 播放一個靜音且極短的語音，以通過瀏覽器的 Autoplay Policy 檢查
    try {
        const unlockUtterance = new SpeechSynthesisUtterance(" ");
        // 設置音量為 0，用戶不會聽到
        unlockUtterance.volume = 0; 
        // 立即呼叫 speak，這是必須在用戶手勢中同步執行的關鍵步驟
        speechSynthesis.speak(unlockUtterance);
        
        // 設置旗標為 true
        isTTSReady = true;
        console.log("✅ TTS 語音引擎已成功解鎖。");

    } catch (e) {
        // 如果瀏覽器不支持語音合成，則禁用功能
        console.error("TTS 語音合成初始化失敗:", e);
        isTTSReady = false;
    }

    // 隱藏疊層
    const overlay = document.getElementById('tts-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }

    // ⭐ 提示：如果您的應用程式有任何需要在 TTS 解鎖後才能執行的自動化流程，
    // 請在這裡呼叫它們！例如：
    // startAutomatedBossTimeChecks(); 
}

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


    settingContainer = document.getElementById('setting_div');
    toggleSettingContainerBtn = document.getElementById('toggleSettingContainer');

    toggleSettingContainerBtn .addEventListener('click', function() {
        if (settingContainer.style.display === 'none' || settingContainer.style.display === '') {
            settingContainer.style.display = 'block';
        } else {
            settingContainer.style.display = 'none';
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
        config.voiceCount = slider.value;
        display.textContent = `${config.voiceCount}%`;
        // 將數值傳遞給其他地方使用（例如其他 JavaScript 函式）
        // 在這裡您可以執行您想要的操作
        // 例如：將百分比值傳遞給其他函式或存儲在變數中
        // 例如：myFunction(percentage);
    });


    var btn_addToBossList = document.getElementById("btn_addToBossList");
    var btn_refresh = document.getElementById("btn_refresh");
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

    document.getElementById('btn_saveToDB').addEventListener('click', actualSaveLogic);


    const overlay = document.getElementById('tts-overlay');
    const unlockButton = document.getElementById('tts-unlock-button');

    // 如果偵測到是行動裝置
    if (isMobileDevice()) {
        console.log("偵測到行動裝置，強制用戶點擊以解鎖 TTS。");
        
        // 顯示疊層
        if (overlay) {
            overlay.style.display = 'block';
        }
        
        // 綁定解鎖事件
        if (unlockButton) {
            // 點擊按鈕後執行解鎖，並確保只執行一次
            unlockButton.addEventListener('click', unlockTTS, { once: true });
        }
    } else {
        // 如果是桌面端，直接嘗試解鎖 (通常桌面瀏覽器比較寬鬆)
        // 或者您也可以選擇在這裡不執行任何操作，直到第一次需要語音時才啟動。
        console.log("偵測到桌面裝置或無法識別，直接嘗試初始化。");
        isTTSReady = true; // 假設桌面端會自動允許
    }
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
    // 1. 載入已儲存的欄位順序
    loadColumnConfig(); 

    // 2. 根據載入的配置繪製表格標頭
    renderTableHeaders(); 
    console.log("window onload");
    loadFromLocalStorage();
    setInterval(updateBossRemainingTime, 60*1000); // 每秒更新剩余时间
    
    setInterval(() => {
        document.getElementById("webrtc_div").innerHTML = getFormattedStatusHtml();
    }, 3000);
    
};