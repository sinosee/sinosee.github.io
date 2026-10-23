# 龍虎榜設定

立體圖形對對碰的龍虎榜存在 **Firebase Realtime Database**（專案 `sinosee-mathsgame`，地區 `asia-southeast1`）。學生只填班別同學號，唔使登入，亦唔好填中文名。未貼上設定、或學校網絡連唔到時，遊戲仍然可以玩，分數會寫入這部機的本機暫存。

客戶端設定同整除掉落挑戰同一套，見 `firebase-config.js`。資料路徑係 `p1SolidShapes`，唔好寫入 `divisibilityDrop`。

## 資料路徑

```text
/p1SolidShapes/scores/{pushId}
/p1SolidShapes/teacherPin
/p1SolidShapes/deleteTicket
```

每個 `pushId` 只准**新增**，唔准改內容。老師可以**刪除**其中一個 `pushId`。欄位：

| 欄位 | 說明 |
| --- | --- |
| `classId` | 班別，例如 `1A`。英數字，可有 `-`，最長 12。會轉成大階。 |
| `studentNo` | 學號，例如 `12`。同樣只准英數字同 `-`。 |
| `score` | 答啱題數，整數 0–10。 |
| `stars` | 整數 0–3。9–10 題三星、7–8 兩星、5–6 一星、0–4 零星。分數一樣時唔會拆開名次。 |
| `ts` | 完成時間，毫秒。 |
| `displayName` | 必須等於 `classId` + `studentNo`，例如 `1A12`。 |

畫面上每位同學只顯示**最高的一次**。分數一樣就並列同一名。

`teacherPin` 只可以喺 Firebase 主控台設定。客戶端唔准讀、唔准寫。`deleteTicket` 暫時記下要刪的 `scoreId` 同老師輸入的密碼；規則要求密碼等於 `teacherPin`，先至准刪對應分數。

## 保安規則

**老師一定要喺 Firebase 主控台發佈規則。** 只更新網頁唔夠。

同一個 Realtime Database 已經有 `divisibilityDrop`。請只**加上** `p1SolidShapes` 呢一段，唔好剷走其他遊戲的規則。

喺 Realtime Database → Rules，把下面的 `p1SolidShapes` 放進現有 `"rules"` 裡面，然後 **Publish／發佈**：

```json
{
  "p1SolidShapes": {
    "teacherPin": {
      ".read": false,
      ".write": false
    },
    "deleteTicket": {
      ".read": false,
      ".write": "(newData.exists() && root.child('p1SolidShapes').child('teacherPin').val() != null && ('' + newData.child('pin').val()) == ('' + root.child('p1SolidShapes').child('teacherPin').val()) && newData.child('scoreId').isString() && newData.child('scoreId').val().matches(/^[A-Za-z0-9_-]{1,128}$/)) || (!newData.exists() && data.exists() && root.child('p1SolidShapes').child('teacherPin').val() != null && ('' + data.child('pin').val()) == ('' + root.child('p1SolidShapes').child('teacherPin').val()))",
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
        ".write": "(!data.exists() && newData.exists()) || (data.exists() && !newData.exists() && root.child('p1SolidShapes').child('deleteTicket').child('scoreId').val() == $pushId && root.child('p1SolidShapes').child('teacherPin').val() != null && ('' + root.child('p1SolidShapes').child('deleteTicket').child('pin').val()) == ('' + root.child('p1SolidShapes').child('teacherPin').val()))",
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

1. 發佈上面的規則。
2. Realtime Database → Data，喺 `p1SolidShapes` 下面新增 `teacherPin`。型別揀 **string**，值係 4 至 8 位數字。唔好用本機密碼 `8800`，亦唔好把呢個密碼寫入 git。
3. 打開 https://sinosee.github.io/p1-solid-shapes/ → **查看龍虎榜** → **老師模式：刪除成績** → 輸入同一個密碼 → 撳該行 **刪除**。

未接上雲端時，本機暫存的老師密碼係 `8800`（`leaderboard.js` 的 `LOCAL_TEACHER_PIN`）。呢個密碼唔可以刪雲端成績。

## 學生畫面

1. 主頁預設 **學生模式**，撳 **開始遊戲**。
2. 學生模式：閘門要填 **班別**、**學號**。打中文會被拒絕。老師模式跳過閘門，直接開始。
3. 學生 10 題完結後顯示呢局龍虎榜，並標示這位同學。老師完局只講唔會上榜，唔會寫入雲端或本機龍虎榜，亦唔會改呢部機的最高分。
4. 主頁 **查看龍虎榜** 可以唔使先玩就睇榜。
5. 返回主頁會鎖返老師刪除模式。龍虎榜畫面的 **老師模式：刪除成績** 仍然可以刪走學生成績。
