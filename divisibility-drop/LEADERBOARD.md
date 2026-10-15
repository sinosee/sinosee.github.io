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

每個 `pushId` 只准**新增**，唔准改內容。老師可以**刪除**其中一個 `pushId`（見下面「老師刪除一筆成績」）。欄位：

| 欄位 field | 說明 |
| --- | --- |
| `classId` | 班別，例如 `4A`。英數字，可有 `-`，最長 12。會轉成大階。 |
| `studentNo` | 學號，例如 `12`。同樣只准英數字同 `-`。 |
| `score` | 整數 0–9999。越高越好。 |
| `stars` | 整數 0–3。分數一樣時唔會拆開名次；星星多的只係喺並列裡面排得前啲。 |
| `ts` | 完成時間，毫秒。分數同星星都一樣時，比較新的排前面，名次仍然一樣。 |
| `displayName` | 必須等於 `classId` + `studentNo`，例如 `4A12`。 |

畫面上每位同學只顯示**最高的一次**。分數一樣就**並列同一名、同一個獎牌**（兩人同分第一都係金牌，下一個較低分係第三、銅牌）。並列裡面先排星星多的，再排比較新的。雲端保留每次成績，直到老師刪走其中一筆。

The screen shows each student's best run. The same score shares one rank and the same medal (two 1sts are both gold; the next lower score is 3rd). Stars, then a newer time, only order students inside that tie. The database keeps every run until a teacher deletes one score node.

老師刪除時會先寫入呢條**老師刪除路徑**（客戶端讀唔到），密碼核對成功先准刪走對應的分數節點：

```text
/divisibilityDrop/teacherPin
/divisibilityDrop/levels/{levelId}/deleteTicket
```

`teacherPin` 只可以喺 Firebase 主控台設定。客戶端唔准讀、唔准寫。`deleteTicket` 暫時記下要刪的 `scoreId` 同老師輸入的密碼；規則要求密碼等於 `teacherPin`，先至准刪 `/scores/{scoreId}`。

## 保安規則 Security rules

**老師一定要喺 Firebase 主控台重新發佈規則。** 只更新網頁唔夠。舊規則係只准新增、唔准刪除，未發佈下面呢份 JSON 之前，撳「刪除」會失敗。

如果同一個 Realtime Database 仲有其他遊戲的規則，只取代 `divisibilityDrop` 呢一段，唔好剷走其他路徑。

喺 Realtime Database → Rules 貼上並 **Publish／發佈**：

```json
{
  "rules": {
    "divisibilityDrop": {
      "teacherPin": {
        ".read": false,
        ".write": false
      },
      "levels": {
        "$levelId": {
          "deleteTicket": {
            ".read": false,
            ".write": "(newData.exists() && root.child('divisibilityDrop').child('teacherPin').val() != null && ('' + newData.child('pin').val()) == ('' + root.child('divisibilityDrop').child('teacherPin').val()) && newData.child('scoreId').isString() && newData.child('scoreId').val().matches(/^[A-Za-z0-9_-]{1,128}$/) && newData.child('levelId').val() == $levelId) || (!newData.exists() && data.exists() && root.child('divisibilityDrop').child('teacherPin').val() != null && ('' + data.child('pin').val()) == ('' + root.child('divisibilityDrop').child('teacherPin').val()))",
            ".validate": "!newData.exists() || newData.hasChildren(['pin', 'scoreId', 'levelId'])",
            "pin": {
              ".validate": "newData.isString() && newData.val().matches(/^[0-9]{4,8}$/)"
            },
            "scoreId": {
              ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9_-]{1,128}$/)"
            },
            "levelId": {
              ".validate": "newData.val() == $levelId"
            },
            "$other": {
              ".validate": false
            }
          },
          "scores": {
            ".read": true,
            ".indexOn": ["score"],
            "$pushId": {
              ".write": "(!data.exists() && newData.exists() && ($levelId == '2' || $levelId == '5' || $levelId == '10' || $levelId == '3' || $levelId == 'mix')) || (data.exists() && !newData.exists() && root.child('divisibilityDrop').child('levels').child($levelId).child('deleteTicket').child('scoreId').val() == $pushId && root.child('divisibilityDrop').child('teacherPin').val() != null && ('' + root.child('divisibilityDrop').child('levels').child($levelId).child('deleteTicket').child('pin').val()) == ('' + root.child('divisibilityDrop').child('teacherPin').val()))",
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
- 分數 `.write` 只准**新**紀錄（`!data.exists()`），唔可以改內容。
- **刪除**一個分數節點，要條 `deleteTicket` 的 `scoreId` 等於該節點，而且 `pin` 等於 `teacherPin`。
- `teacherPin` 同 `deleteTicket` 客戶端都讀唔到。`teacherPin` 客戶端亦寫唔到，只可以喺主控台改。
- 班別學號只准英數字同連字號，拒絕中文。
- 分數同星星有上限。
- `$other` 拒絕多餘欄位。
- 其他路徑預設拒絕。
- `.validate` 喺刪除（寫入 null）時唔會執行，所以刪除唔會被「必須有 classId」擋住。刪除係靠 `.write` 守住。

## 老師刪除一筆成績 Teacher delete

龍虎榜畫面有 **老師模式：刪除成績**。輸入 4 至 8 位數字密碼，解鎖之後每一行出現 **刪除**。再確認一次，就會刪走**呢一筆最高分**（一個 `pushId`）。如果呢位同學仲有較低或相同的其他紀錄，榜上會顯示下一筆，可以再刪一次。

### 雲端（必須做）

1. 發佈上面的新規則（Publish）。未發佈的話，網頁會提示刪除失敗，成績唔會變。
2. Realtime Database → **Data**，喺 `divisibilityDrop` 下面新增 `teacherPin`。型別揀 **string**，值係老師自己定的 4 至 8 位數字。主控台寫入唔受 `.write: false` 限制。唔好用本機密碼 `8800`，亦唔好把呢個密碼寫入 git。
3. 打開 https://sinosee.github.io/divisibility-drop/ → **查看龍虎榜** → **老師模式：刪除成績** → 輸入同一個密碼 → **解鎖刪除** → 撳該行 **刪除** → 確認。

學生睇到個按鈕，但唔知道 `teacherPin` 就刪唔到雲端成績。密碼唔會出現喺網頁程式裡面。

### 未接上雲端

本機暫存的老師密碼係 `8800`（只存在 `leaderboard.js` 的 `LOCAL_TEACHER_PIN`）。呢個密碼**唔可以**刪雲端成績。接上雲端之後，以資料庫的 `teacherPin` 為準。請把雲端密碼設成同 `8800` 唔同的數字。

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
5. 老師要刪一筆成績：龍虎榜 → **老師模式：刪除成績** → 輸入 `teacherPin` → 確認刪除。返回主選單會鎖返。
