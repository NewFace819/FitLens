# Đối chiếu Data Contract với bảng phân công

> Mục đích: kiểm tra `DATA_CONTRACT.md` có phủ hết các đầu việc trong hai bảng phân công (CN 15/11) hay không.
> Cách làm: (A) liệt kê từng đầu việc của từng người, tìm phần hợp đồng đỡ nó; (B) kiểm tra từng cặp "ai ghi, ai đọc" xem có dữ liệu mồ côi (có người đọc mà không ai ghi, hoặc ngược lại); (C) kiểm tra các điểm cắt ngang (an toàn, điều hướng, thời gian).
> Giới hạn: đối chiếu với **bảng phân công và snapshot UI**, không phải với code của các bạn (code chưa có trong repo). Nên đây là kiểm tra "hợp đồng có đỡ được kế hoạch", chưa phải "code đã khớp".

**Kết quả: bản hợp đồng đầu tiên chưa đủ. Tìm ra 13 chỗ thiếu hoặc mơ hồ (G1–G13). Tất cả đã được vá vào `DATA_CONTRACT.md` (mục 1, 3, 6, 9 và 12 đã bổ sung). Sau khi vá, mọi đầu việc đều có chỗ dựa; còn lại là các mục cần chủ sở hữu xác nhận.**

## A. Từng đầu việc → phần hợp đồng đỡ nó

Ký hiệu: ✅ phủ đủ · 🔧 thiếu ở bản đầu, đã vá (mã G) · ⏳ cần chủ sở hữu xác nhận.

### Thông — Hồ sơ & Insight

| Đầu việc | Hợp đồng đỡ | Kết quả |
| :-- | :-- | :-- |
| Onboarding, chỉnh sửa hồ sơ: mục tiêu, kinh nghiệm, tần suất, thời lượng, thiết bị, vùng tránh | `Profile` (`goal`, `experience`, `daysPerWeek`, `minutes`, `equipment`, `avoidRegions`) + enum | ✅ |
| Nơi tập | `Place` (enum) | ✅ ⏳ tên giá trị |
| Xuất `getProfile()` | Mục 6 | ✅ |
| Xuất `getHomeMetrics()` | Mục 6, nhưng **kiểu `HomeMetrics` chưa định nghĩa** | 🔧 G2 |
| Chỉ số trên Home: steps, thời gian tập, năng lượng | Không có nguồn dữ liệu steps nào trong hợp đồng | 🔧 G11 |
| Trang Insights, training focus (nhóm cơ nào được tập) | Cần `muscles` của từng bài, nhưng **không có danh mục bài tập dùng chung** | 🔧 G1 |
| Recap tháng/năm | Cần `getHistory` lọc theo khoảng ngày, **kiểu `filter` chưa định nghĩa** | 🔧 G3 |
| Xác nhận lại `avoidRegions` sau khi người dùng báo khó chịu | Cần đọc `discomfortRegions` từ Review, **không có hàm đọc Review** | 🔧 G3 |

### Tu — Nhắc lịch & Check-in

| Đầu việc | Hợp đồng đỡ | Kết quả |
| :-- | :-- | :-- |
| Mục tiêu số buổi mỗi tuần | `Rhythm.weeklyGoal`, **trùng với `Profile.daysPerWeek`** (hai nguồn cho một ý) | 🔧 G8 |
| Streak, tạm nghỉ | `Rhythm` (`streakWeeks` tính ra, `pausedUntil`); **đơn vị streak chưa rõ** | 🔧 G10 ⏳ |
| Cài giờ nhắc cho buổi tập | `Reminder`, nhưng **không có hàm đặt/đọc nhắc**, và Tu không có cách đổi `Session.time` của Hải | 🔧 G4 |
| Nhắc cho buổi đơn **hoặc cả lịch** (`reminders.html`) | `Reminder.sessionId` bắt buộc, không biểu diễn được "mặc định cho cả lịch" | 🔧 G4 |
| Màn check-in: mức gắng sức, vùng khó chịu, phản hồi từng bài | `Review` (`rpe`, `discomfortRegions`); **giá trị của `exerciseFeedback` chưa định nghĩa** | 🔧 G12 |
| Gọi `appendReview()` | Mục 6, người định nghĩa: Đức Huy | ✅ |
| Lưu kết quả để lịch tuần sau điều chỉnh độ khó | Hải cần đọc RPE tuần trước, **không có hàm đọc Review** | 🔧 G3 |

### Hải — Workout & Lịch tuần

| Đầu việc | Hợp đồng đỡ | Kết quả |
| :-- | :-- | :-- |
| Routine mẫu, tạo/sửa/xóa workout, xem chi tiết | `Workout`, `getWorkout`, `updateWorkout`, quy tắc xóa (mục 5) | ✅ |
| Workout gồm bài tập nào | `WorkoutItem.exerciseId` trỏ tới danh mục bài tập **chưa tồn tại như thực thể dùng chung** | 🔧 G1 |
| Lịch tuần sinh draft từ `getProfile()` | `Profile` + `getWeekSchedule` | ✅ |
| Thêm/đổi/xóa buổi, kéo thả, sao chép tuần | Nội bộ Hải, nhưng Tu cần đổi giờ → thiếu `updateSession` | 🔧 G4 |
| Trang Plan: chọn giờ + xem trước nhắc | Hải phải gọi hàm nhắc của Tu, **chưa có** | 🔧 G4 |
| "Buổi kế tiếp" (Home, Workouts, nhắc cùng cần) | Không có hàm chung, mỗi trang tự tính sẽ lệch nhau | 🔧 G9 |
| Gỡ nút "Ask FitLens" | Không liên quan dữ liệu | ✅ |
| Trang Workouts hiện phần hoạt động | `renderActivitySection(el)` của Đỗ Huy | ✅ |

### Đức Huy — Buổi tập đang diễn ra

| Đầu việc | Hợp đồng đỡ | Kết quả |
| :-- | :-- | :-- |
| Tách `training-history.js`, `getHistory()` | `HistoryEntry`; kiểu `filter` chưa định nghĩa | 🔧 G3 |
| Ghi kg/rep từng set, hoàn tất buổi → lưu lịch sử | `SetRecord`, `HistoryEntry` | ✅ |
| Dùng số liệu lần trước, `getLastSets()` | Mục 6, theo `exerciseId` | ✅ (cần danh mục bài, G1) |
| Nghỉ, tạm dừng/tiếp tục | Trạng thái tạm trong `sessionStorage` (mục 4) | ✅ |
| Báo đau để dừng buổi | `stoppedByPain` **không có trong danh sách trường tối thiểu**; chưa nói `Session.status` thành gì | 🔧 G6, G7 |
| Mở buổi từ routine / workout riêng / lịch | `sessionId` null được phép, nhưng **chưa có quy ước tham số URL** (`?session=`, `?workout=`) | 🔧 G5 |
| Chuyển sang màn check-in | Cần truyền `historyId` qua URL | 🔧 G5 |
| `durationSec` cho "thời gian tập" trên Home | Không có trong trường tối thiểu | 🔧 G7 |

### Đỗ Huy — Home, Hoạt động & Camera

| Đầu việc | Hợp đồng đỡ | Kết quả |
| :-- | :-- | :-- |
| Home đọc dữ liệu từ mọi người | `getHomeMetrics`, `getWeekSchedule`, `getRhythm`, `getHistory` | ✅ sau khi vá G2, G9 |
| Dock và danh sách route chung | `shared/routes.js` (mục 8); thiếu quy ước tham số | 🔧 G5 |
| Mascot, `setMascotMood()` | `Mood` enum | ⏳ Đỗ Huy liệt kê giá trị |
| Ghi hoạt động đi bộ/chạy/đạp xe/bơi, `renderActivitySection()` | `Activity`, `ActivityType` | ✅ |
| Camera (chỉ UI) | Không có dữ liệu | ✅ |
| Gỡ Dinh dưỡng và Chat | Route list không được chứa `food`, `chat`; seed không có món | ✅ (ghi vào mục 8) |

## B. Kiểm tra dữ liệu mồ côi (ai ghi → ai đọc)

| Dữ liệu | Người ghi | Người đọc | Kết quả |
| :-- | :-- | :-- | :-- |
| Profile | Thông | Hải, Đỗ Huy, Tu | ✅ |
| Workout | Hải | Đức Huy, Đỗ Huy | ✅ |
| Exercise (danh mục) | **không ai** | Hải, Đức Huy, Thông | ❌ → G1 |
| Session | Hải | Tu, Đỗ Huy, Thông, Đức Huy | ✅ |
| `Session.time` | Hải **và** Tu | Tu, Đỗ Huy | ❌ hai người ghi → G4 |
| HistoryEntry | Đức Huy | Tu, Thông, Đỗ Huy, Hải | ✅ |
| Review | Đức Huy (qua `appendReview`) | Thông, Hải, Tu | ❌ không ai đọc được → G3 |
| Rhythm | Tu | Đỗ Huy, Thông | ✅ |
| Reminder | Tu | Hải (Plan), Tu | ❌ Hải không gọi được → G4 |
| Activity | Đỗ Huy | Thông (Insights, HomeMetrics) | ⚠️ cần hàm đọc → G13 |
| Steps | **không ai** | Thông, Đỗ Huy | ❌ → G11 |
| MascotMood | Tu, Đức Huy (gọi) | Đỗ Huy | ✅ |

## C. Kiểm tra điểm cắt ngang

| Chủ đề | Kiểm tra | Kết quả |
| :-- | :-- | :-- |
| An toàn: `discomfortRegions` không tự thành `avoidRegions` | Có quy tắc ở mục 9, nhưng Thông cần đọc Review để hiển thị gợi ý xác nhận | 🔧 G3 |
| An toàn: lọc bài theo `avoidRegions` | `Exercise.regions` và `Profile.avoidRegions` cùng enum `Region` | ✅ nhờ G1 |
| Điều hướng giữa trang | Chưa có quy ước tham số URL | 🔧 G5 |
| Tuần, ngày, múi giờ | Mục 2 (thứ Hai, ngày địa phương) | ✅ |
| Ai tạo khung `shared/` | Chưa có chủ | ⏳ G13 |
| Gỡ Dinh dưỡng và Chat khỏi mọi nơi | `routes` không có; docs đã sửa; prototype sẽ do Đỗ Huy xóa | ✅ |

## D. Danh sách các chỗ đã vá

| Mã | Vấn đề | Cách vá |
| :-- | :-- | :-- |
| G1 | Không có danh mục bài tập dùng chung | Thêm thực thể `Exercise` `{id, name, regions, equipment, muscles}`, hằng số trong `shared/exercises.js`, chủ sở hữu Hải. Thêm enum `Muscle` |
| G2 | `HomeMetrics` chưa có kiểu | Định nghĩa `{date, steps, activeMinutes, activeEnergyKcal, isSample}` |
| G3 | Không đọc được Review; `getHistory` thiếu `filter` | Thêm `getReview(historyId)`, `getReviews({from,to})` (Đức Huy). Định nghĩa `filter = {from?, to?, workoutId?, exerciseId?}` |
| G4 | Tu không đổi được giờ buổi; không có hàm nhắc; nhắc theo lịch không biểu diễn được | Thêm `updateSession(id, {date?, time?})` (Hải). Thêm `getReminder`, `setReminder` (Tu). `Reminder.sessionId = null` nghĩa là mặc định cho cả lịch |
| G5 | Không có quy ước tham số URL | Chuẩn hóa: `session`, `workout`, `history`, `week`, `date` |
| G6 | Buổi dừng vì đau thì `Session.status` là gì | Giữ `done`, đánh dấu `stoppedByPain` ở `HistoryEntry` |
| G7 | Trường tối thiểu của `HistoryEntry` thiếu | Thêm `durationSec`, `stoppedByPain` |
| G8 | `weeklyGoal` trùng `daysPerWeek` | `Rhythm.weeklyGoal` có thể `null`, `null` nghĩa là dùng `Profile.daysPerWeek` |
| G9 | "Buổi kế tiếp" mỗi trang tự tính | Thêm `getNextSession(now)` (Hải) |
| G10 | Đơn vị streak chưa rõ | Đề xuất streak tính theo **tuần đạt mục tiêu**, chờ Tu xác nhận |
| G11 | Không có nguồn steps | Thêm `getSteps(date)` (Thông), dữ liệu mẫu trong prototype |
| G12 | Giá trị `exerciseFeedback` chưa định nghĩa | Thêm enum `ExerciseFeedback`: `tooEasy`, `justRight`, `tooHard`, `painful` (**[ĐỀ XUẤT]**, Tu xác nhận) |
| G13 | Activity không có hàm đọc; `shared/` chưa có chủ | Thêm `getActivities({from,to})` (Đỗ Huy). Chủ khung `shared/`: Hải đề xuất làm |

## E. Điều mình **không** chứng minh được

- Chưa thấy code của Thông, Tu, Đức Huy, Đỗ Huy; hợp đồng có thể thiếu những nhu cầu mà màn hình thật của họ phát sinh. Cách duy nhất để kiểm lại là mỗi người đọc phần của mình và đối chiếu.
- Prototype mới nhất (`D:\UI_Design`) không có trên máy, nên mình đối chiếu theo snapshot và bảng phân công, không theo code.
- Mọi tên enum đánh dấu **[ĐỀ XUẤT]** là mình đặt, cần chủ sở hữu xác nhận.
