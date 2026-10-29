# 龍虎榜設定

18以內加數的龍虎榜存在 **Firebase Realtime Database**（專案 `sinosee-mathsgame`，地區 `asia-southeast1`）。學生只填班別和學號，不用登入，也不要填中文姓名。尚未貼上設定，或學校網絡暫時連不上時，遊戲仍然可以玩，分數會寫入這部裝置的本機暫存。

客戶端設定與其他課堂遊戲同一套，見 `firebase-config.js`。資料路徑是 `p1AdditionWithin18`。不要寫入 `divisibilityDrop`、`p1SolidShapes` 或 `p4EightDirections`。

## 分數

- 全程 **1 分鐘**。時間到就結束，並提交這一局的分數。
- 每答對一題得 **10 分**。答錯要重做同一題，不得分，也不會跳到下一題。
- 加數是 1 至 17 的整數，兩個數的和不大於 18。沒有 0。
- `score` 是 0 至 2000 的整數，而且是 10 的倍數。
- 星星只供並列時排序，不另計名次：
  - 200 分或以上：3 顆星
  - 100 至 190 分：2 顆星
  - 40 至 90 分：1 顆星
  - 0 至 30 分：0 顆星
- 中途返回主頁不寫分。老師投影模式不用填班別學號，結束時不會讀、不會寫龍虎榜。

畫面上每位同學只顯示**最高的一次**。分數相同就並列同一名。並列時星星較多的排在前面，再排較新的紀錄。

## 資料路徑

```text
/p1AdditionWithin18/scores/{pushId}
/p1AdditionWithin18/teacherPin
/p1AdditionWithin18/deleteTicket
```

每個 `pushId` 只准**新增**，不准改內容。老師可以**刪除**其中一個 `pushId`。欄位：

| 欄位 | 說明 |
| --- | --- |
| `classId` | 班別，例如 `1A`。英數字，可有 `-`，最長 12。會轉成大寫。 |
| `studentNo` | 學號，例如 `12`。同樣只准英數字和 `-`。 |
| `score` | 整數 0–2000，而且是 10 的倍數。 |
| `stars` | 整數 0–3。 |
| `ts` | 完成時間，毫秒。 |
| `displayName` | 必須等於 `classId` + `studentNo`，例如 `1A12`。 |

`teacherPin` 只可以在 Firebase 主控台設定。客戶端不准讀、不准寫。`deleteTicket` 暫時記下要刪的 `scoreId` 和老師輸入的密碼；規則要求密碼等於 `teacherPin`，才准刪對應分數。

## 保安規則

**老師一定要在 Firebase 主控台發佈規則。** 只更新網頁不夠。

同一個 Realtime Database 已經有其他遊戲。請**保留現有的全部規則**，只把下面的 `p1AdditionWithin18` 放進現有 `"rules"` 裡面，不要刪除其他遊戲的路徑。

在 Realtime Database → Rules，加入下面這一段，然後 **Publish／發佈**：

```json
{
  "p1AdditionWithin18": {
    "teacherPin": {
      ".read": false,
      ".write": false
    },
    "deleteTicket": {
      ".read": false,
      ".write": "(newData.exists() && root.child('p1AdditionWithin18').child('teacherPin').val() != null && ('' + newData.child('pin').val()) == ('' + root.child('p1AdditionWithin18').child('teacherPin').val()) && newData.child('scoreId').isString() && newData.child('scoreId').val().matches(/^[A-Za-z0-9_-]{1,128}$/)) || (!newData.exists() && data.exists() && root.child('p1AdditionWithin18').child('teacherPin').val() != null && ('' + data.child('pin').val()) == ('' + root.child('p1AdditionWithin18').child('teacherPin').val()))",
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
        ".write": "(!data.exists() && newData.exists()) || (data.exists() && !newData.exists() && root.child('p1AdditionWithin18').child('deleteTicket').child('scoreId').val() == $pushId && root.child('p1AdditionWithin18').child('teacherPin').val() != null && ('' + root.child('p1AdditionWithin18').child('deleteTicket').child('pin').val()) == ('' + root.child('p1AdditionWithin18').child('teacherPin').val()))",
        ".validate": "newData.hasChildren(['classId', 'studentNo', 'score', 'stars', 'ts', 'displayName'])",
        "classId": {
          ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/)"
        },
        "studentNo": {
          ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/)"
        },
        "score": {
          ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 2000 && newData.val() % 1 == 0 && newData.val() % 10 == 0"
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

- 分數公開可讀，投影和 iPad 不用登入都可以看。
- 分數只准新增，不可以改內容。
- 刪除要 `deleteTicket` 的 `scoreId` 對得上，而且 `pin` 等於 `teacherPin`。
- `teacherPin` 和 `deleteTicket` 客戶端都讀不到。`teacherPin` 只可以在主控台改。
- 班別和學號只准英數字和連字號，拒絕中文。
- 分數上限 2000，而且必須是 10 的倍數。星星上限 3。

## 老師刪除

1. 發佈上面的規則。保留其他遊戲的規則。
2. Realtime Database → Data，在 `p1AdditionWithin18` 下面新增 `teacherPin`。類型選 **string**，值是 4 至 8 位數字。不要用本機密碼 `8800`，也不要把這個密碼寫入 git。
3. 打開 https://sinosee.github.io/p1-addition-within-18/ → **查看龍虎榜** → **老師模式：刪除成績** → 輸入同一個密碼 → 按該行 **刪除**。

未接上雲端時，本機暫存的老師密碼是 `8800`（`leaderboard.js` 的 `LOCAL_TEACHER_PIN`）。這個密碼不可以刪雲端成績。

## 學生畫面

主頁預設是 **學生模式**。

1. 按 **開始挑戰**。
2. 閘門要填 **班別**、**學號**。輸入中文會被拒絕。
3. 1 分鐘結束後顯示這一局龍虎榜，並標示這位同學。
4. 主頁 **查看龍虎榜** 可以不必先玩就看榜。
5. 返回主頁會鎖回老師刪除模式。

## 老師投影

主頁 **老師投影** 是上課投影，不是上面的「老師模式：刪除成績」。

- 不會打開班別／學號閘門。
- 時間結束不會讀、不會寫 `p1AdditionWithin18/scores`。畫面寫「老師投影模式，本局不會上榜。」
- 結束畫面可以按 **查看龍虎榜** 看現有成績，這一局仍然不會上榜。
- 網址加上 `?mode=teacher` 會直接進入老師投影。
