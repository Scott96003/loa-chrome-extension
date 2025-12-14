#!/bin/bash

# ==============================================================================
# 啟動腳本: 運行 Uvicorn 服務
# 專案根目錄已根據使用者確認的最新路徑進行修正。
# ==============================================================================

# 1. 定義專案根目錄 (使用您確認的最新絕對路徑)
PROJECT_ROOT="/Users/f96003gmail.com/loa-chrome-extension/Loa_Boss_Ws_Server/my_fastapi_project"

# 2. 定義 Uvicorn 二進位文件的絕對路徑 (在虛擬環境內)
UVICORN_BIN="$PROJECT_ROOT/venv/bin/uvicorn"

# 3. 定義 SSL 檔案的絕對路徑
KEY_FILE="$PROJECT_ROOT/key.pem"
CERT_FILE="$PROJECT_ROOT/server.pem"

# 4. 變更到專案目錄 (確保 Uvicorn 能找到 websocket_server:app)
cd "$PROJECT_ROOT" || exit 1

# 5. 使用 exec 執行 Uvicorn 
# 請注意：必須在新的路徑下重建 venv，否則會出現 bad interpreter 錯誤。
exec "$UVICORN_BIN" websocket_server:app \
    --host 0.0.0.0 \
    --port 8443 \
    --ssl-keyfile "$KEY_FILE" \
    --ssl-certfile "$CERT_FILE"

# 如果 Uvicorn 啟動失敗，請檢查 /tmp/com.user.fastapi.stderr.log 檔案獲取錯誤詳情。