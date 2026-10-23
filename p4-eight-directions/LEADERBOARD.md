# 龍虎榜設定

八方探險的龍虎榜存在 **Firebase Realtime Database**（專案 `sinosee-mathsgame`，地區 `asia-southeast1`）。學生只填班別同學號，唔使登入，亦唔好填中文名。未貼上設定、或學校網絡連唔到時，遊戲仍然可以玩，分數會寫入這部機的本機暫存。

客戶端設定同整除掉落挑戰、立體圖形對對碰同一套，見 `firebase-config.js`。資料路徑係 `p4EightDirections`，唔好寫入 `divisibilityDrop` 或 `p1SolidShapes`。

## 點樣計分

**一條榜，計整局入面第二關「八方探險」的總成績。** 唔分開兩條榜。

| | 計唔計 | 點計 |
| --- | --- | --- |
| 第一關 填指南針 | 唔計 | 熱身。放錯可以再拖，過到關先去第二關，本身冇分數。 |
| 第二關 八方探險 | 計 | 每過一站得 1 分（寶藏），0–10。完局時剩低幾多顆心，就有幾多粒星（0–3）。 |

由第一關玩到第二關完，或者主頁直接入第二關，都用同一條榜、同一把尺（10 分滿分）。只喺第二關**完結**時寫一次。第一關完、或者中途返主頁，都唔寫分。

畫面上的「老師模式」係投影（可顯示答案），**唔會上榜**。上榜只限學生模式。

畫面上每位同學只顯示**最高的一次**。分數一樣就並列同一名、同一個獎牌。並列裡面先排星星多的，再排比較新的。雲端保留每次成績，直到老師刪走其中一筆。

## 資料路徑

```text
/p4EightDirections/scores/{pushId}
/p4EightDirections/teacherPin
/p4EightDirections/deleteTicket
```

每個 `pushId` 只准**新增**，唔准改內容。老師可以**刪除**其中一個 `pushId`。欄位：

| 欄位 | 說明 |
| --- | --- |
| `classId` | 班別，例如 `4A`。英數字，可有 `-`，最長 12。會轉成大階。 |
| `studentNo` | 學號，例如 `12`。同樣只准英數字同 `-`。 |
| `score` | 第二關寶藏數，整數 0–10。 |
| `stars` | 整數 0–3。等於完局時剩低嘅心。分數一樣時唔會拆開名次。 |
| `ts` | 完成時間，毫秒。 |
| `displayName` | 必須等於 `classId` + `studentNo`，例如 `4A12`。 |

`teacherPin` 只可以喺 Firebase 主控台設定。客戶端唔准讀、唔准寫。`deleteTicket` 暫時記下要刪的 `scoreId` 同老師輸入的密碼；規則要求密碼等於 `teacherPin`，先至准刪對應分數。

## 保安規則

**老師一定要喺 Firebase 主控台發佈規則。** 只更新網頁唔夠。未發佈之前，成績會留喺本機，撳「刪除」亦刪唔到雲端。

同一個 Realtime Database 已經有 `divisibilityDrop` 同 `p1SolidShapes`。請只**加上**下面 `p4EightDirections` 呢一段，放進現有 `"rules": { ... }` 裡面，**唔好剷走其他遊戲的規則**。

喺 Realtime Database → Rules，加呢一段，然後 **Publish／發佈**：

```json
{
  "p4EightDirections": {
    "teacherPin": {
      ".read": false,
      ".write": false
    },
    "deleteTicket": {
      ".read": false,
      ".write": "(newData.exists() && root.child('p4EightDirections').child('teacherPin').val() != null && ('' + newData.child('pin').val()) == ('' + root.child('p4EightDirections').child('teacherPin').val()) && newData.child('scoreId').isString() && newData.child('scoreId').val().matches(/^[A-Za-z0-9_-]{1,128}$/)) || (!newData.exists() && data.exists() && root.child('p4EightDirections').child('teacherPin').val() != null && ('' + data.child('pin').val()) == ('' + root.child('p4EightDirections').child('teacherPin').val()))",
      ".validate": "!newData.exists() || newData.hasChildren(['pin', 'scoreId'])",
      "pin": {
        ".validate": "newData.isString() && newData.val().matches(/^[0-9]{4,8}$/)"
      },
      "scoreId": {
        ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9_-]{1,128}$/)"
      },
      "$other": {
        ".validate": false
      }
    },
    "scores": {
      ".read": true,
      ".indexOn": ["score"],
      "$pushId": {
        ".write": "(!data.exists() && newData.exists()) || (data.exists() && !newData.exists() && root.child('p4EightDirections').child('deleteTicket').child('scoreId').val() == $pushId && root.child('p4EightDirections').child('teacherPin').val() != null && ('' + root.child('p4EightDirections').child('deleteTicket').child('pin').val()) == ('' + root.child('p4EightDirections').child('teacherPin').val()))",
        ".validate": "newData.hasChildren(['classId', 'studentNo', 'score', 'stars', 'ts', 'displayName'])",
        "classId": {
          ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/)"
        },
        "studentNo": {
          ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/)"
        },
        "score": {
          ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 10 && newData.val() % 1 == 0"
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
```

規則重點：

- 分數公開可讀，投影同 iPad 唔使登入都睇到。
- 分數只准新增，唔可以改內容。
- 刪除要 `deleteTicket` 的 `scoreId` 對得上，而且 `pin` 等於 `teacherPin`。
- `teacherPin` 同 `deleteTicket` 客戶端都讀唔到。`teacherPin` 只可以喺主控台改。
- 班別學號只准英數字同連字號，拒絕中文。
- 分數上限 10，星星上限 3。

## 老師刪除

1. 發佈上面的規則（只加 `p4EightDirections`，保留 `divisibilityDrop` 同 `p1SolidShapes`）。
2. Realtime Database → Data，喺 `p4EightDirections` 下面新增 `teacherPin`。型別揀 **string**，值係 4 至 8 位數字。主控台寫入唔受 `.write: false` 限制。唔好用本機密碼 `8800`，亦唔好把呢個密碼寫入 git。
3. 打開 https://sinosee.github.io/p4-eight-directions/ → **查看龍虎榜** → **老師模式：刪除成績** → 輸入同一個密碼 → **解鎖刪除** → 撳該行 **刪除** → 確認。

學生睇到個按鈕，但唔知道 `teacherPin` 就刪唔到雲端成績。密碼唔會出現喺網頁程式裡面。

未接上雲端時，本機暫存的老師密碼係 `8800`（`leaderboard.js` 的 `LOCAL_TEACHER_PIN`）。呢個密碼唔可以刪雲端成績。接上雲端之後，以資料庫的 `teacherPin` 為準。請把雲端密碼設成同 `8800` 唔同的數字。

刪除只清走**呢一筆最高分**。如果呢位同學仲有其他紀錄，榜上會顯示下一筆，可以再刪一次。

## 學生畫面

1. 主頁揀學生模式，撳 **由第一關開始**、第一關或第二關。
2. 閘門要填 **班別**、**學號**。打中文會被拒絕。
3. 第二關完結後顯示呢局龍虎榜，並標示這位同學。
4. 主頁 **查看龍虎榜** 可以唔使先玩就睇榜。
5. 返回主頁會鎖返老師刪除模式。
