# 龍虎榜設定

八方探險的龍虎榜存在 **Firebase Realtime Database**（專案 `sinosee-mathsgame`，地區 `asia-southeast1`）。學生只填班別同學號，唔使登入，亦唔好填中文名。未貼上設定、或學校網絡連唔到時，遊戲仍然可以玩，分數會寫入這部機的本機暫存。

客戶端設定同整除掉落挑戰、立體圖形對對碰同一套，見 `firebase-config.js`。資料路徑係 `p4EightDirections`，唔好寫入 `divisibilityDrop` 或 `p1SolidShapes`。

**兩關各有一條龍虎榜。** 第一關完寫第一關，第二關完寫第二關。只玩第二關的同學只會出現喺第二關榜。

## 點樣計分

| | 幾時寫 | 分數 | 星星 |
| --- | --- | --- | --- |
| 第一關 填指南針 | 四幅指南針都填完，去到「指南針填好啦」 | 放對的次數，0–28。四幅 × 每幅 7 個方向。放錯可以再拖，所以完成通常係 **28 分**。 | 放錯次數：3 次或以下 **3** 星，8 次或以下 **2** 星，15 次或以下 **1** 星，再多 **0** 星。 |
| 第二關 八方探險 | 第二關完結 | 每過一站得 1 分（寶藏），0–10。 | 完局時剩低幾多顆心，就有幾多粒星（0–3）。 |

第一關中途返主頁，唔寫分。第二關中途返主頁，唔寫分。老師投影模式唔上榜。

第一關完成的同學分數多數一樣（28）。名次並列，**星星多（放錯少）的排前**。第二關先比寶藏分，分數一樣先睇星星。

畫面上每位同學只顯示**該關最高的一次**。分數一樣就並列同一名、同一個獎牌。並列裡面先排星星多的，再排比較新的。雲端保留每次成績，直到老師刪走其中一筆。

## 資料路徑

```text
/p4EightDirections/teacherPin
/p4EightDirections/levels/1/scores/{pushId}
/p4EightDirections/levels/2/scores/{pushId}
/p4EightDirections/levels/1/deleteTicket
/p4EightDirections/levels/2/deleteTicket
```

`levelId` 只可以是 `1` 或 `2`。`teacherPin` 兩關共用，唔使重設。

舊路徑 `/p4EightDirections/scores` 同 `/p4EightDirections/deleteTicket` **唔再寫入**。發佈新規則之後，客戶端只讀寫上面 `levels` 路徑。舊分數仍然留喺資料庫，唔會自動搬去新榜；老師可以喺主控台自己睇或刪。

每個 `pushId` 只准**新增**，唔准改內容。老師可以**刪除**其中一個 `pushId`。欄位：

| 欄位 | 說明 |
| --- | --- |
| `classId` | 班別，例如 `4A`。英數字，可有 `-`，最長 12。會轉成大階。 |
| `studentNo` | 學號，例如 `12`。同樣只准英數字同 `-`。 |
| `score` | 第一關整數 0–28。第二關整數 0–10。 |
| `stars` | 整數 0–3。分數一樣時唔會拆開名次。 |
| `ts` | 完成時間，毫秒。 |
| `displayName` | 必須等於 `classId` + `studentNo`，例如 `4A12`。 |

`teacherPin` 只可以喺 Firebase 主控台設定。客戶端唔准讀、唔准寫。`deleteTicket` 暫時記下要刪的 `scoreId`、`levelId` 同老師輸入的密碼；規則要求密碼等於 `teacherPin`，而且 `levelId` 對得上，先至准刪該關的分數。

## 保安規則

**老師一定要喺 Firebase 主控台重新發佈規則。** 只更新網頁唔夠。未發佈之前，新路徑寫入會失敗，成績會留喺本機，撳「刪除」亦刪唔到雲端。

同一個 Realtime Database 已經有 `divisibilityDrop` 同 `p1SolidShapes`。請用下面呢段**取代現有的 `p4EightDirections`**（包括舊的 `scores` 同 `deleteTicket`），放進現有 `"rules": { ... }` 裡面，**唔好剷走其他遊戲的規則**。`teacherPin` 的值唔使改。

喺 Realtime Database → Rules，換成呢一段 `p4EightDirections`，然後 **Publish／發佈**：

```json
{
  "p4EightDirections": {
    "teacherPin": {
      ".read": false,
      ".write": false
    },
    "levels": {
      "$levelId": {
        "deleteTicket": {
          ".read": false,
          ".write": "(newData.exists() && root.child('p4EightDirections').child('teacherPin').val() != null && ('' + newData.child('pin').val()) == ('' + root.child('p4EightDirections').child('teacherPin').val()) && newData.child('scoreId').isString() && newData.child('scoreId').val().matches(/^[A-Za-z0-9_-]{1,128}$/) && newData.child('levelId').val() == $levelId) || (!newData.exists() && data.exists() && root.child('p4EightDirections').child('teacherPin').val() != null && ('' + data.child('pin').val()) == ('' + root.child('p4EightDirections').child('teacherPin').val()))",
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
            ".write": "(!data.exists() && newData.exists() && ($levelId == '1' || $levelId == '2')) || (data.exists() && !newData.exists() && root.child('p4EightDirections').child('levels').child($levelId).child('deleteTicket').child('scoreId').val() == $pushId && root.child('p4EightDirections').child('teacherPin').val() != null && ('' + root.child('p4EightDirections').child('levels').child($levelId).child('deleteTicket').child('pin').val()) == ('' + root.child('p4EightDirections').child('teacherPin').val()))",
            ".validate": "newData.hasChildren(['classId', 'studentNo', 'score', 'stars', 'ts', 'displayName'])",
            "classId": {
              ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/)"
            },
            "studentNo": {
              ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/)"
            },
            "score": {
              ".validate": "($levelId == '1' && newData.isNumber() && newData.val() >= 0 && newData.val() <= 28 && newData.val() % 1 == 0) || ($levelId == '2' && newData.isNumber() && newData.val() >= 0 && newData.val() <= 10 && newData.val() % 1 == 0)"
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
```

規則重點：

- 分數公開可讀，投影同 iPad 唔使登入都睇到。
- 分數只准新增，唔可以改內容。只接受關卡 `1` 同 `2`。
- 第一關分數上限 28，第二關上限 10，星星上限 3。
- 刪除要該關 `deleteTicket` 的 `scoreId` 對得上，`levelId` 等於該關，而且 `pin` 等於 `teacherPin`。
- `teacherPin` 同 `deleteTicket` 客戶端都讀唔到。`teacherPin` 只可以喺主控台改。
- 班別學號只准英數字同連字號，拒絕中文。

## 老師刪除

1. 發佈上面的規則（取代舊的 `p4EightDirections`，保留 `divisibilityDrop` 同 `p1SolidShapes`）。
2. `teacherPin` 如果已經喺 `p4EightDirections` 下面，唔使再加。未有的話：Realtime Database → Data，喺 `p4EightDirections` 下面新增 `teacherPin`。型別揀 **string**，值係 4 至 8 位數字。主控台寫入唔受 `.write: false` 限制。唔好用本機密碼 `8800`，亦唔好把呢個密碼寫入 git。
3. 打開 https://sinosee.github.io/p4-eight-directions/ → **查看龍虎榜** → 揀 **第一關** 或 **第二關** → **老師模式：刪除成績** → 輸入同一個密碼 → **解鎖刪除** → 撳該行 **刪除** → 確認。刪除只影響而家睇緊嗰一關。

學生睇到個按鈕，但唔知道 `teacherPin` 就刪唔到雲端成績。密碼唔會出現喺網頁程式裡面。

未接上雲端時，本機暫存的老師密碼係 `8800`（`leaderboard.js` 的 `LOCAL_TEACHER_PIN`）。呢個密碼唔可以刪雲端成績。接上雲端之後，以資料庫的 `teacherPin` 為準。請把雲端密碼設成同 `8800` 唔同的數字。

刪除只清走**呢一筆最高分**。如果呢位同學仲有其他紀錄，榜上會顯示下一筆，可以再刪一次。

## 學生畫面

1. 主頁揀學生模式，撳 **由第一關開始**、第一關或第二關。
2. 閘門要填 **班別**、**學號**。打中文會被拒絕。
3. 第一關四幅都填完，顯示第一關龍虎榜。撳 **進入第二關** 先去尋寶。
4. 第二關完結後顯示第二關龍虎榜。
5. 主頁 **查看龍虎榜** 可以揀第一關或第二關，唔使先玩就睇。
6. 返回主頁會鎖返老師刪除模式。
