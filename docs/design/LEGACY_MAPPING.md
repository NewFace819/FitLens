# Ánh xạ code cũ → hợp đồng (phần Hải)

> Kết quả của task T0. Mục đích: không viết lại những gì code cũ đã làm đúng, và biết chính xác dữ liệu cũ chuyển sang hợp đồng thế nào.
> Nguồn: `prototype/setup-plan-model.js`, `prototype/reminder-model.js`, `prototype/workouts.js`, `prototype/workout-details.js` (nhánh `feature/workout-schedule`).

## 1. Quyết định hòa giải

| # | Quyết định | Lý do |
| :-- | :-- | :-- |
| 1 | Sửa **hợp đồng** cho khớp giá trị code đang dùng: `Experience = new/returning/regular`, `Equipment = dumbbells/bands/mat/bench`, `Place = home/gym` | Onboarding và `FitLensPlan` đã dùng các giá trị này; đổi code là đổi cả phần của Thông |
| 2 | Múi giờ `Asia/Ho_Chi_Minh` là hằng số duy nhất trong `shared/dates.js` | `weekStart` và `today` cũ đã hardcode giá trị này; trước đây ở hai nơi |
| 3 | `Session` do Hải sở hữu. Nhắc lịch (`timing`) vẫn thuộc Tu qua `FitLensReminders`; Hải chỉ đọc/ghi `Session.time` | Tránh hai chủ cho một dữ liệu |
| 4 | Không xóa key cũ khi migrate. Migrate một chiều, chạy nhiều lần không nhân đôi | An toàn; trang cũ (`setup-plan.*`, `reminders.*`) vẫn chạy |
| 5 | Tuần bắt đầu thứ Hai; `days[0]` của `FitLensPlan` là thứ Hai | Đã khớp |

## 2. Ánh xạ dữ liệu

### Workout
| Code cũ | Hợp đồng | Ghi chú |
| :-- | :-- | :-- |
| `routines.upper/lower/full` trong `workout-details.js` (`title`, `minutes`, `muscles`, `equipment`, `items[]` là id bài) | `Workout` template `tpl-upper/lower/full` | `minutes` và `equipment` **bỏ**, tính ra bằng `estimateMinutes`, `equipmentOf` |
| `routines` trong `workouts.js` (`name`, `detail`, `count`, `minutes`) | Cùng các `Workout` trên | Hai bản trước đây khác nhau; sau này một nguồn |
| `FitLensPlan.library[]` (`id`, `title`, `kind`, `equipment`, `regions`, `exercises[]` là tên chuỗi, `goals`) | `Workout` template `tpl-<id>` (thêm 8 template: bodyweight, upper(đổi tên `upper-dumbbell`), lower, core, bands, walk, cardio, full) | `exercises` chuỗi → `items[].exerciseId` qua danh mục bài; `goals` giữ làm trường phụ của template |
| `singles[]` (`FitLensReminders`): `{id,name,items,routine,schedule}` | `Workout` custom `wk-*` (tên, bài) + `Session` (nếu có `schedule`) | `items` cũ là `{id: catalogId, sets, reps, rest, ...}` |

### Exercise
| Code cũ | Hợp đồng |
| :-- | :-- |
| `catalog` (12 bài: bench, pull, row, press, raise, cable, squat, rdl, legpress, curl, calf, biceps) với `name`, `art`, `sets`, `reps`, `rest` | `Exercise` `{id, name, art, regions, equipment, muscles}`; `sets/reps/rest` là **mặc định** của bài, giá trị thật nằm ở `WorkoutItem` |
| Tên bài dạng chuỗi trong `library[].exercises` (24 tên) | `Exercise` mới (ID kebab-case từ tên) |

### Session / lịch
| Code cũ | Hợp đồng |
| :-- | :-- |
| `FitLensPlan` plan `{version, weekStart, form, days[7]}`; `days[i]` = `{id, sessionId, title, timing, duration, sets, ...}` hoặc `null` | `Session[]`: mỗi `days[i]` khác `null` → `{id: sessionId, workoutId: 'tpl-'+id, date: weekStart + i ngày, time: timing?.time ?? null, status: 'planned'}` |
| Lưu ở `sessionStorage['fitlens:weekly-plan']` | Lưu ở `localStorage['fitlens.sessions']`; key cũ giữ nguyên, chỉ đọc khi migrate |
| `singles[].schedule = {date, time, enabled, before}` | `Session {date, time}`; `enabled`, `before` thuộc về nhắc (Tu), **không** vào `Session` |

### Nhắc
| Code cũ | Hợp đồng |
| :-- | :-- |
| `timing = {time, enabled, before ∈ {0,15,30}}` | `Reminder {enabled, minutesBefore}` của Tu; Hải không lưu. Hải đọc `time` để đặt `Session.time` |

## 3. Giá trị enum thực tế
- `goals`: `habit`, `strength`, `muscle`, `endurance`
- `regions`: `knees`, `back`, `wrists`, `shoulders`, `ankles`, `hips`
- `equipment` (form onboarding): `none`, `dumbbells`, `bands`, `mat`, `bench`. Hợp đồng bỏ `none`.
- Nơi tập `gym` được hiểu là có đủ `dumbbells`, `bands`, `mat`, `bench` (theo `build()` cũ).
- Nhắc trước giờ tập: `0`, `15`, `30` phút.

## 4. Việc không làm ở T0
Không sửa code. Test kiểm enum của `FitLensPlan.library` nằm cùng T1/T2.
