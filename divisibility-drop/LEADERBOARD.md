# 龍虎榜設定 Leaderboard setup

整除掉落挑戰的每關龍虎榜存在 **Firebase Realtime Database**。學生只填班別學號，唔使登入。未貼上設定、或學校網絡連唔到時，遊戲仍然可以玩，分數會寫入這部機的 **本機暫存**。

Each level has its own board. Students enter a class and student number. The game keeps working when Firebase is not configured.

## 老師要貼上的設定 What to paste

打開 `divisibility-drop/firebase-config.js`，用 Firebase 網頁應用程式的設定取代每個 `YOUR_*`。欄位名要保持不變：

| 設定鍵 config key | 例子 example |
| --- | --- |
| `apiKey` | Web API key |
| `authDomain` | `your-project-id.firebaseapp.com` |
| `databaseURL` | `https://your-project-id-default-rtdb.firebaseio.com` |
| `projectId` | `your-project-id` |
| `storageBucket` | `your-project-id.appspot.com` |
| `messagingSenderId` | numeric sender id |
| `appId` | `1:…:web:…` |

`firebase-config.example.js` 是空白範本。客戶端 `apiKey` 會出現在網頁裡，唔係密碼；請靠下面的資料庫規則保護成績。

The client `apiKey` is public. Realtime Database rules are what stop strangers from editing scores.

## Firebase 主控台步驟 Console steps

1. 打開 [Firebase console](https://console.firebase.google.com/) → 新增專案（或用現有專案）。
2. 專案設定 Project settings → 一般 General → 你的應用程式 Your apps → 新增網頁應用程式 Add app (`</>`)。
3. 複製 `firebaseConfig` 入 `divisibility-drop/firebase-config.js` 的對應鍵。
4. Build → **Realtime Database** → 建立資料庫 Create Database。先選一個地區（例如 `asia-southeast1`）。可以先用鎖定模式，再貼上下面的規則。
5. 規則 Rules 分頁，貼上「保安規則」，然後發佈 Publish。
6. 確認 `databaseURL` 同主控台資料庫網址一致（`firebaseio.com` 或 `region.firebasedatabase.app` 都可以）。
7. 把更新後的 `firebase-config.js` 推上 GitHub `main`。GitHub Pages 會用 https://sinosee.github.io/divisibility-drop/ 。

唔使開 Authentication。唔使開 Storage。

## 資料路徑 Data path

```text
/divisibilityDrop/levels/{levelId}/scores/{pushId}
```

`levelId` 只可以是：`2`、`5`、`10`、`3`、`mix`（全部關卡）。

每個 `pushId` 只准新增，唔准改、唔准刪。欄位：

| 欄位 field | 說明 |
| --- | --- |
| `classId` | 班別，例如 `4A`。英數字，可有 `-`，最長 12。會轉成大階。 |
| `studentNo` | 學號，例如 `12`。同樣只准英數字同 `-`。 |
| `score` | 整數 0–9999。越高越好。 |
| `stars` | 整數 0–3。同分時星星多的排前。 |
| `ts` | 完成時間，毫秒。分數同星星都一樣時，比較新的排前。 |
| `displayName` | 必須等於 `classId` + `studentNo`，例如 `4A12`。 |

畫面上每位同學只顯示**最高的一次**（先比分數，再比星星，再比時間）。雲端仍然保留每次成績。

The screen shows each student's best run. The database keeps every run (append-only).

## 保安規則 Security rules

喺 Realtime Database → Rules 貼上並發佈：

```json
{
  "rules": {
    "divisibilityDrop": {
      "levels": {
        "$levelId": {
          "scores": {
            ".read": true,
            ".indexOn": ["score"],
            "$pushId": {
              ".write": "!data.exists() && newData.exists() && ($levelId == '2' || $levelId == '5' || $levelId == '10' || $levelId == '3' || $levelId == 'mix')",
              ".validate": "newData.hasChildren(['classId', 'studentNo', 'score', 'stars', 'ts', 'displayName'])",
              "classId": {
                ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/)"
              },
              "studentNo": {
                ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/)"
              },
              "score": {
                ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999 && newData.val() % 1 == 0"
              },
              "stars": {
                ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 3 && newData.val() % 1 == 0"
              },
              "ts": {
                ".validate": "newData.isNumber() && newData.val() > 1600000000000 && newData.val() < now + 86400000"
              },
              "displayName": {
                ".validate": "newData.isString() && newData.val() == newData.parent().child('classId').val() + newData.parent().child('studentNo').val()"
              },
              "$other": {
                ".validate": false
              }
            }
          }
        }
      }
    }
  }
}
```

規則重點：

- `.read` 公開，投影同 iPad 唔使登入都睇到龍虎榜。
- `.write` 只准**新**紀錄（`!data.exists()`），唔可以改人或刪除。
- 班別學號只准英數字同連字號，拒絕中文。
- 分數同星星有上限。
- `$other` 拒絕多餘欄位。
- 其他路徑預設拒絕。

班別學號會顯示喺龍虎榜。請學生唔好打中文全名。

## 未接上雲端 Offline / placeholders

`firebase-config.js` 仍然是 `YOUR_API_KEY` 這類佔位字，或網絡失敗時：

- 畫面上會寫 **龍虎榜未接上雲端** 或 **暫時無法連線**，並標明 **本機暫存**。
- 學生一樣可以玩。分數留喺該瀏覽器的 localStorage，唔會中途寫入。
- 只在一局**結束**時先寫一次。老師模式同樣要填班別學號，同樣只在結束時提交。

## 學生畫面 Student flow

1. 主畫面揀模式同關卡 → **開始遊戲**。
2. 閘門要填 **班別**、**學號**。打中文會被拒絕。兩個都填先入提示同遊戲。
3. 局結束後顯示該關龍虎榜，並標示這位同學。
4. 主畫面 **查看龍虎榜** 可以揀關卡睇，唔使先玩。
