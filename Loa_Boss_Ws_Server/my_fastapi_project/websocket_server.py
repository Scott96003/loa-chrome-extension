import asyncio
import json
import logging
from pathlib import Path
from typing import Dict, List, Set, Optional
from datetime import datetime
from starlette.websockets import WebSocketState

# ----------------------------------------------
# 1. FastAPI 核心導入與網站服務相關導入
# ----------------------------------------------
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from starlette.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates


# 配置日誌記錄，包含時間戳和等級
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ----------------------------------------------
# 2. ConnectionManager 類別 (單例模式)
# ----------------------------------------------

class ConnectionManager:
    """
    以單例模式管理所有活動連線及其共享數據。
    所有對內部數據結構 (set, dicts) 的操作皆為同步。
    """
    
    def __init__(self):
        # 存儲所有活躍的 WebSocket 連線物件
        self.active_connections: Set[WebSocket] = set()
        # 用戶 ID (str) -> WebSocket (obj)
        self.user_to_ws: Dict[str, WebSocket] = {} 
        # WebSocket (obj) -> 用戶 ID (str)
        self.ws_to_user: Dict[WebSocket, str] = {} 

        self.main_json_data: Dict = {
            "status": "Offline",
            "users_online": 0,
            "last_updated": datetime.now().isoformat(),
            "custom_data": {}
        }
        
    async def connect(self, websocket: WebSocket):
        """處理新連線，接受並加入集合。"""
        await websocket.accept()
        self.active_connections.add(websocket)
        self._update_user_count()
        logger.info(f"[CONNECT] 新連線建立。活躍連線數: {len(self.active_connections)}")


    def disconnect(self, websocket: WebSocket):
        """
        處理斷線，移除所有映射和集合中的記錄。此函數為同步。
        """
        # 1. 嘗試從連線集移除
        self.active_connections.discard(websocket)
        
        # 2. 移除用戶 ID 映射 (確保雙向清理)
        # 使用 pop() 確保移除成功並取回 ID
        user_id = self.ws_to_user.pop(websocket, None)
        
        if user_id:
            # 移除 User ID 到 WebSocket 的映射
            self.user_to_ws.pop(user_id, None) 
            logger.info(f"[DISCONNECT] 用戶 ID '{user_id}' 已清理。")
        else:
            logger.debug(f"[DISCONNECT] 未註冊 ID 的連線已移除。")
        
        self._update_user_count()

    def register_user(self, user_id: str, websocket: WebSocket) -> bool:
        """將連線與其唯一的客戶端 ID 關聯，並返回是否成功註冊。"""
        if user_id in self.user_to_ws:
            logger.warning(f"[REGISTER] ID '{user_id}' 已存在，跳過註冊。")
            return False
        
        if websocket not in self.ws_to_user:
            self.user_to_ws[user_id] = websocket
            self.ws_to_user[websocket] = user_id
            logger.info(f"[REGISTER] 用戶 ID '{user_id}' 成功註冊。")

            # 非同步啟動廣播 (不阻塞註冊流程)
            asyncio.create_task(self._broadcast_user_joined(user_id))
            return True
        
        return False # 該 WebSocket 已經註冊過 ID

    async def _broadcast_user_joined(self, new_user_id: str):
        """非同步函式，通知所有在線用戶有新 ID 上線。"""
        message = {
            "type": "user_joined",
            "senderId": "server",
            "newUserId": new_user_id
        }
        json_message = json.dumps(message)
        
        for user_id, ws in self.user_to_ws.items():
            if user_id != new_user_id and ws.client_state == WebSocketState.CONNECTED:
                try:
                    await ws.send_text(json_message)
                except Exception as e:
                    logger.error(f"[BROADCAST_JOIN] 通知 {user_id} 失敗: {e}")
                    # 如果發送失敗，立即排入清理隊列
                    self.disconnect(ws)

    def get_online_users(self) -> List[str]:
        """返回所有在線且已註冊的用戶 ID 列表。"""
        return list(self.user_to_ws.keys())
    
    def _update_user_count(self):
        """內部方法，更新共享數據中的線上用戶數。"""
        self.main_json_data["users_online"] = len(self.active_connections)
        self.main_json_data["last_updated"] = datetime.now().isoformat()

    async def send_personal_message(self, message: str, user_id: str) -> bool:
        """將訊息傳送給特定的客戶端 ID。"""
        client = self.user_to_ws.get(user_id)
        
        # 檢查客戶端是否存在且狀態為連接中
        if client and client.client_state == WebSocketState.CONNECTED:
            try:
                await client.send_text(message)
                return True
            except Exception as e:
                logger.error(f"[SEND_P2P_FAIL] 傳送給 {user_id} 失敗: {e}")
                # 傳輸失敗，主動清理資源
                self.disconnect(client) 
                return False
        
        logger.warning(f"[SEND_P2P_SKIP] ID '{user_id}' 不在線或未註冊，跳過發送。")
        return False

    async def broadcast(self, message: str):
        """將訊息廣播給所有已連線的客戶端。"""
        clients_to_remove: Set[WebSocket] = set() 
        
        # 廣播給所有活躍連線
        for client in self.active_connections:
            if client.client_state == WebSocketState.CONNECTED:
                try:
                    await client.send_text(message) 
                except Exception:
                    clients_to_remove.add(client)
            else:
                 clients_to_remove.add(client) # 狀態不對，也準備移除

        for client in clients_to_remove:
            self.disconnect(client)
        
        if clients_to_remove:
            logger.info(f"[BROADCAST_CLEANUP] 已清理 {len(clients_to_remove)} 個斷線客戶端。")


manager = ConnectionManager()


# ----------------------------------------------
# 3. FastAPI 應用程式實例與 Web/靜態檔案配置
# ----------------------------------------------
app = FastAPI() 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 檔案路徑配置 (保持您的邏輯)
current_file_dir = Path(__file__).parent 
project_root_dir = current_file_dir.parent.parent

template_dir = project_root_dir / "bosstime" / "templates"
templates = Jinja2Templates(directory=template_dir)

static_dir = project_root_dir / "bosstime" / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

logger.info(f"模板目錄: {template_dir}")
logger.info(f"靜態目錄: {static_dir}")

# ----------------------------------------------
# 4. 網站路由
# ----------------------------------------------

@app.get("/", summary="WebRTC Client Home Page")
async def get_homepage(request: Request):
    """渲染 loa_boss_time.html 作為網站的首頁。"""
    return templates.TemplateResponse("loa_boss_time.html", {"request": request})

# ----------------------------------------------
# 5. WebSocket 路由 - 核心處理邏輯
# ----------------------------------------------

P2P_SIGNALING_TYPES = {'offer', 'answer', 'candidate', 'chat_message'}
BROADCAST_MESSAGE_TYPES = {"Sync_Boss_Data", "Boss_Death", "Ack_Sync"}


@app.websocket("/ws") 
async def fastapi_websocket_endpoint(websocket: WebSocket):
    
    try:
        # 1. 連線
        await manager.connect(websocket)
        
        while True:
            # 接收客戶端訊息
            message = await websocket.receive_text()
            
            try:
                data = json.loads(message)
                await handle_websocket_message(websocket, data)
                
            except json.JSONDecodeError:
                logger.warning(f"[WS_ERROR] 收到非 JSON 訊息。")
                continue
            
    except WebSocketDisconnect:
        # 正常或非正常斷線 (網路中斷、瀏覽器關閉等)
        user_id = manager.ws_to_user.get(websocket, '未註冊')
        logger.info(f"[WS_CLOSE] 客戶端 ({user_id}) 關閉連線。")
    except Exception as e:
        logger.error(f"[WS_FATAL] 連線發生嚴重錯誤：{e}")
    finally:
        # 3. 移除連線 (保證執行所有清理工作)
        manager.disconnect(websocket)
        logger.info(f"[WS_CLEAN] 當前活躍連線數: {len(manager.active_connections)}")


async def handle_websocket_message(websocket: WebSocket, data: Dict):
    """將 WebSocket 訊息分發到對應的處理邏輯。"""
    
    message_type: Optional[str] = data.get("type")
    sender_id: Optional[str] = data.get("senderId")
    target_id: Optional[str] = data.get("targetId")

    # 獲取當前 WebSocket 註冊的 ID，用於驗證 senderId
    current_user_id = manager.ws_to_user.get(websocket)

    if message_type == 'client_register':
        if sender_id and not current_user_id:
            manager.register_user(sender_id, websocket)
            
    elif message_type == 'ping': 
        if sender_id:
            pong_message = json.dumps({
                "type": "pong",
                "senderId": "server",
                "targetId": sender_id
            })
            # 由於這是心跳，不需要等待結果，直接非同步發送
            asyncio.create_task(manager.send_personal_message(pong_message, sender_id))
    
    elif message_type in P2P_SIGNALING_TYPES:
        await handle_p2p_signaling(websocket, data, current_user_id, sender_id, target_id)
        
    elif message_type in BROADCAST_MESSAGE_TYPES:
        # 廣播訊息無需等待
        asyncio.create_task(manager.broadcast(json.dumps(data)))
        logger.info(f"[MSG_BCAST] 訊息類型: {message_type} 請求廣播。")
        
    elif message_type == 'request_online_users':
        await handle_online_users_request(sender_id)
            
    else:
        logger.warning(f"[MSG_UNKNOWN] 收到未知訊息類型: {message_type}")


async def handle_p2p_signaling(websocket: WebSocket, data: Dict, current_user_id: Optional[str], sender_id: Optional[str], target_id: Optional[str]):
    """轉發 WebRTC 信令。"""
    
    message_type = data.get("type")
    
    # 驗證 1: 必須註冊 ID
    if not current_user_id:
        logger.warning(f"[SIGNAL_FAIL] 收到 {message_type}，但發送方 ID 未註冊。")
        return
        
    # 驗證 2: senderId 必須與註冊的 ID 匹配
    if current_user_id != sender_id:
        logger.error(f"[SIGNAL_FAIL] ID 不匹配。Registered: {current_user_id}, Sent: {sender_id}")
        return

    if target_id:
        # 點對點轉發 (無需等待)
        await manager.send_personal_message(json.dumps(data), target_id)
        logger.info(f"[SIGNAL_OK] {sender_id} -> {target_id}: {message_type} 轉發請求已發送。")
    else:
        logger.warning(f"[SIGNAL_FAIL] 收到信令 {message_type} 但缺少 targetId。")


async def handle_online_users_request(sender_id: Optional[str]):
    """處理在線用戶列表請求。"""
    
    if sender_id:
        online_users = manager.get_online_users()
        
        response = {
            "type": "online_users_list",
            "users": online_users,
            "senderId": "server"
        }
        
        # 發送列表給請求方 (無需等待)
        await manager.send_personal_message(json.dumps(response), sender_id)
        logger.info(f"📢 [USER_LIST] 已將 {len(online_users)} 個用戶 ID 列表回傳給 {sender_id}")
    else:
        logger.error("🚫 [USER_LIST] 無法回覆在線用戶列表：缺少 senderId。")