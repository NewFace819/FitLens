# Thiết kế: Nhịp, Check-in & Nhắc lịch (phần của Tu)

> Nhánh: `feature/rhythm-checkin` · Code: `mobile/src/modules/{rhythm,checkin,reminders}` · Theo `DATA_CONTRACT.md` (nhánh `feature/workout-schedule`).
> Đây là "file chi tiết" của Tu mà contract mục 9 yêu cầu.

## 1. Quyết định của Tu (trả lời các mục chờ trong contract)

| Mục | Quyết định |
| :-- | :-- |
| G10 — đơn vị streak | **Tuần đạt mục tiêu.** Tuần Thứ Hai → Chủ nhật. Đủ số buổi thì +1, tập thêm không cộng. Tuần đang diễn ra không làm đứt streak. Tuần tạm nghỉ giữ nguyên streak nhưng không cộng. Tuần kết thúc mà chưa đủ thì streak về 0, lịch sử vẫn giữ. |
| G12 — phản hồi từng bài | **Thang 1–10**: 1 = quá dễ, 5 = vừa sức, 10 = đau. Lưu kèm enum của contract để người khác đọc: 1–3 `tooEasy`, 4–6 `justRight`, 7–9 `tooHard`, 10 `painful`. Điểm 10 là **tín hiệu an toàn**: hiện lời nhắc "đừng tập khi đau" và gợi ý đổi bài, không bao giờ hiểu là "nặng hơn chút". |
| G8 — `weeklyGoal` trùng `daysPerWeek` | Đồng ý: `weeklyGoal = null` nghĩa là dùng `Profile.daysPerWeek`. |
| RPE | 1–10, hỏi một lần cho cả buổi, tách khỏi phần "vùng khó chịu". |

## 2. Review (Đức Huy lưu qua `appendReview`, Tu định nghĩa dạng)

```ts
type Review = {
  id: string;                    // rv-…
  historyId: string;             // → HistoryEntry.id
  rpe: 1..10;
  discomfortRegions: Region[];   // enum chung, KHÔNG tự cập nhật avoidRegions
  exerciseFeedback: { exerciseId: string; feedback: ExerciseFeedback; score: 1..10 }[];
  // phần thêm của Tu (tùy chọn)
  discomfort: { region: Region; sensation: 'tightness'|'soreness'|'pain'|'unsure'|null; exerciseId: string|null }[];
  note: string;                  // ≤ 600 ký tự
  createdAt: string;             // ISO UTC
};
```

- Mỗi `HistoryEntry` có tối đa một review; lưu lại thì review cũ bị thay.
- "Dừng vì đau" đọc từ `HistoryEntry.stoppedByPain`, không lưu trùng trong Review.
- Màn check-in mở bằng `?history=<HistoryEntry.id>` (contract mục 12).

## 3. Rhythm (key `fitlens.rhythm`, `v = 1`)

**Lưu:**

```ts
type RhythmState = {
  goals:  { weeklyGoal: number; fromWeek: DateKey }[];   // lịch sử đổi mục tiêu
  pauses: { fromWeek: DateKey; untilWeek: DateKey|null }[]; // null = đang nghỉ, chưa bấm quay lại
};
```

**`getRhythm(date)` trả về:** các trường của contract `weeklyGoal`, `streakWeeks`, `pausedUntil`, cộng thêm `goal`, `goalSource`, `paused`, `status`, `thisWeek`, `longestStreak`, `completedWeeks`, `sessionsRecorded`, `upcomingGoal`.

**Đề xuất sửa contract:** contract hiện chỉ có **một** `weeklyGoal` và **một** `pausedUntil`. Như vậy:
1. Đổi mục tiêu 3 → 4 làm các tuần cũ bị chấm lại theo 4, streak tụt oan.
2. Mất các lần nghỉ cũ, nên tuần nghỉ trong quá khứ bị tính là tuần hụt.

Vì vậy Tu lưu lịch sử thay đổi. Cách này vẫn đúng nguyên tắc "không lưu thứ tính được", vì streak vẫn được tính ra. Đầu ra của `getRhythm` vẫn có đủ trường của contract, nên người khác không bị ảnh hưởng.

**`pausedUntil`:** `null` khi không nghỉ **hoặc** đang nghỉ chưa hẹn ngày quay lại. Người khác dùng thêm `paused: boolean` để phân biệt hai trường hợp này.

Đổi mục tiêu khi nhịp đã chạy thì áp dụng **từ thứ Hai tới**. Mục tiêu đầu tiên áp dụng ngay tuần này, hoặc từ thứ Hai tới nếu người dùng chọn.

## 4. Reminder (key `fitlens.reminders`, `v = 1`)

```ts
type Reminder = { id: string; sessionId: string|null; enabled: boolean; minutesBefore: 0|15|30 };
```

- `getReminder(sessionId)`: trả nhắc riêng của buổi, nếu không có thì trả nhắc mặc định (`sessionId = null`), nếu vẫn không có thì `{enabled: false, minutesBefore: 15}`.
- `setReminder(sessionId, {enabled, minutesBefore})`: trả `Reminder`.
- **Giờ tập thuộc Hải**: Tu đổi giờ bằng `updateSession(id, {time})`, không bao giờ ghi `Session` trực tiếp.
- Thông báo: chỉ cho buổi `planned`, có `time`, nhắc đang bật và thời điểm nhắc còn ở tương lai. Lên lịch cho tuần này và tuần sau, đồng bộ lại khi mở app và sau mỗi lần sửa.
- **Thiếu trong contract:** không có hàm `getSession(id)`, nên Tu không kiểm tra được reminder nào đang trỏ tới buổi đã bị xóa. Hiện tại reminder "mồ côi" vô hại vì chỉ những buổi trả về từ `getWeekSchedule` mới được nhắc. Đề xuất Hải thêm `getSession(id)`.

## 5. Hàm Tu xuất cho người khác

| Hàm | Dùng bởi |
| :-- | :-- |
| `getRhythm(date)` | Đỗ Huy (Home), Thông (Insights) |
| `getReminder(sessionId)`, `setReminder(sessionId, …)` | Hải (Plan), Tu |
| `getLoadAdjustForWeek(weekStart)` → −0.3…+0.1 | Hải: tham số `loadAdjust` của `generateDraft` |
| `suggestAdjustments(reviews)` → `swap/easier/keep/harder` theo từng bài | Hải |

## 6. Tu gọi của người khác (trong repo hiện là bản tạm, có ghi chú ở đầu file)

`getProfile` (Thông) · `getWorkout`, `getWeekSchedule`, `updateSession` (Hải) · `getHistory`, `appendReview`, `getReview`, `getReviews` (Đức Huy) · `setMascotMood` (Đỗ Huy).
