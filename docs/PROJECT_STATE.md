# FitLens — Project State

> Cập nhật: 2026-11-19 (tối). File sống: sửa mỗi khi một module đổi trạng thái. Nếu mâu thuẫn với code, tin code rồi sửa file này.

## 1. Mốc (milestones)

| Mốc | Thời điểm | Trạng thái |
| :-- | :-- | :-- |
| Proposal & PoC | Tuần 5 | _Nhóm điền_ (PoC sinh lịch tập đã có trong `poc/plan_generator/`) |
| MVP | Cuối kỳ | Đang làm: mobile đã có phần Rhythm/Reminders/Check-in trên `main`; backend chưa bắt đầu |

## 2. Trạng thái theo thành phần của repo (trên `main`)

| Thành phần | Thư mục | Trạng thái | Ghi chú |
| :-- | :-- | :-- | :-- |
| Tài liệu kiến trúc, use case, slide | `docs/` | Có | `ARCHITECTURE.md`, `ARCHITECTURE_LITE.md`, `USE_CASE_DIAGRAM.md`, slide THA, `design/RHYTHM_CHECKIN_REMINDER.md`, `design/DATA_CONTRACT.md` |
| Prototype UI (HTML/CSS/JS) | `prototype/` | Có, đã đồng bộ bản mới (PR #5, 14/11) | Đã có `plan.html`, `profile.html`, `streak.html`, `yearly-recap.html`. Vẫn còn `food.*`, `chat.*` cần xóa |
| PoC sinh lịch tập bằng Gemini | `poc/plan_generator/` | Có | Chạy được từ CLI, chưa là API |
| Backend FastAPI | `backend/` | Chưa có code | Chỉ có README |
| Mobile React Native (Android) | `mobile/` | RN 0.88.1 + TypeScript, chỉ Android | Xem mục 3. `tsc` và `jest` chạy qua (5 suite, 23 test, 19/11). Chưa build Android vì máy chưa có Android SDK và JDK 17 |
| Pose estimation (MediaPipe) | — | Chưa có | Chỉ là thiết kế |
| Database (Supabase) | — | Chưa có | Chỉ là thiết kế |

## 3. Mobile: trạng thái theo module

| Module | Chủ | Trên `main` | Đang ở nhánh |
| :-- | :-- | :-- | :-- |
| Shared (storage, dates, ids, routes, seed) | chung | Có | — |
| Rhythm, Reminders, Check-in | Tu | Có (PR #4). Thông báo chỉ preview, chưa chọn thư viện push | — |
| Welcome (màn chào, routing lần đầu) | Thông | Có (PR #6) | — |
| Workouts, Plan (lịch tuần) | Hải | Có (từ `feature/mobile-workout-plan`): chạy trên model của `../prototype` qua cache chung | — |
| Route + màn tạm cho Onboarding, Profile, Insights, Workout, Recap, History, Camera | chủ từng màn | Có: `src/screens/<tên>.tsx` là placeholder, chủ màn thay file của mình | — |
| History, buổi tập đang diễn ra | Đức Huy | Placeholder | `codex/npdwuy-training-foundation` (+2, tụt 12) |
| Home, Mascot, Activity, Camera | Đỗ Huy | Placeholder | `feature/home-mascot-activity-camera-v2` (+2, tụt 8) |
| Profile | Thông | Placeholder | — |

## 4. Prototype UI: kiểm kê chức năng

Nhãn: **Có lưu** = ghi localStorage/sessionStorage và đọc lại; **Mẫu** = bấm được nhưng dữ liệu cố định; **Chưa có** = chưa có xử lý.

| Module | Mức hiện tại |
| :-- | :-- |
| Hồ sơ & thiết lập (mục tiêu, kinh nghiệm, thiết bị, vùng cần tránh) | Có lưu |
| Thư viện workout (tạo/sửa/xóa workout riêng) | Có lưu |
| Lịch tuần (gợi ý, kéo thả, sao chép tuần) | Có lưu; thuật toán gợi ý chạy ở client |
| Buổi tập đang diễn ra (ghi kg/rep, nghỉ, "Use last time") | Có lưu |
| Check-in & an toàn (báo đau, RPE sau buổi) | Dừng buổi và lịch sử có lưu; trường đánh giá sau buổi chưa ghi vào lịch sử |
| Hoạt động khác (đi bộ, chạy, đạp xe, bơi) | Có lưu |
| Chỉ số & hành trình (steps, insights, recap) | Pha trộn dữ liệu thật và dữ liệu mẫu |
| ~~Dinh dưỡng~~, ~~Chat FitLens~~ | **Đã bỏ khỏi phạm vi (14/11/2026)**; file vẫn còn trong `prototype/` |
| Nhịp, streak & nhắc lịch | Có lưu; thông báo chỉ là preview, không có push thật |
| Camera kiểm tra form | Chỉ UI: không mở camera, không đếm rep |
| Mascot / Avatar | Chỉ biểu cảm; chưa có chỉ số/kỹ năng/trang bị |

## 5. Khoảng trống so với định hướng (F1–F7)

1. Vòng tự điều chỉnh: RPE sau buổi → tăng/giảm độ khó tuần sau **chưa nối hoàn chỉnh** (mobile đã có logic điều chỉnh tải trong `checkin/`, chưa nối với Plan).
2. Camera: chưa có pose estimation thật.
3. LLM: mới có PoC sinh lịch; chưa có Safety Router phía backend.
4. Avatar: mới có biểu cảm, chưa "mạnh lên" theo luyện tập.
5. Chưa có backend, DB, đồng bộ, đăng nhập (JWT).
6. Thông báo nhắc lịch chưa gửi thật.

## 6. Quyết định đã chốt

- App language: English. LLM PoC: Gemini free tier (`gemini-3.8-flash`); không gửi dữ liệu cá nhân thật.
- RPE: thang 1–10, hỏi một lần sau buổi tập, tách khỏi chấn thương.
- Mobile: React Native (CLI, TypeScript), chỉ Android (14/11/2026). Không làm iOS.
- Bỏ Dinh dưỡng và Chat khỏi phạm vi sản phẩm (14/11/2026). Gemini chỉ còn dùng để sinh lịch tập.
- Zero video retention: camera xử lý trên thiết bị, backend không nhận ảnh/video.
- Mobile: hàm contract **đồng bộ** trên cache đã hydrate; mỗi key có một chủ ghi; mỗi người một thư mục `mobile/src/modules/<module>`.

## 7. Quyết định còn mở

- Cách chạy MediaPipe Pose trên React Native (module native Android hay plugin frame processor cho camera).
- Thư viện thông báo cho Android (`expo-notifications`, `react-native-notify-kit`, …) — xem `mobile/README.md`.
- Khi nào bắt đầu backend.

## 8. Kế hoạch tuần 1 (19/11 → 25/11)

Mục tiêu: **app chạy được trên Android trước Chủ nhật 22/11** (dù nhiều màn còn là placeholder), và đến 25/11 luồng cơ bản chạy hết một vòng: Welcome → Onboarding → Plan → Màn tập → Check-in → nhắc lịch. Đăng nhập và database (Supabase) để tuần 2.

Quy tắc: mỗi người chỉ sửa thư mục/màn của mình; gọi sang người khác qua hàm contract; mọi route đã đăng ký sẵn nên **không ai sửa `App.tsx` / `routes.ts`** nữa (cần route mới thì báo Hải). PR nhỏ, merge hằng ngày.

| ID | Người | Task | Kết quả | Hạn | Cần |
| :-- | :-- | :-- | :-- | :-- | :-- |
| H1 | Hải | Đưa Workouts/Plan + `DATA_CONTRACT.md` vào `main` | PR merge | 19/11 | — |
| H2 | Hải | Đăng ký sẵn mọi route + màn tạm | Xong (cùng PR với H1) | 19/11 | — |
| H3 | Hải | Cài Android SDK + JDK 17, build APK đầu tiên, ghi hướng dẫn vào `mobile/README.md` | App chạy trên emulator/điện thoại | **22/11** | — |
| H4 | Hải | Nút "Start" trên Plan mở `Workout` với `{session}` | Từ Plan vào được màn tập | 22/11 | — |
| T1 | Thông | Onboarding (thay `screens/onboarding.tsx`): mục tiêu, kinh nghiệm, buổi/tuần, phút, thiết bị, vùng tránh; Welcome dẫn sang lần đầu | Lưu `fitlens.profile` | 23/11 | — |
| T2 | Thông | Profile xem/sửa; thay placeholder `modules/profile`, `getProfile()` đúng contract | Plan dùng profile thật | 24/11 | — |
| T3 | Thông | `getHomeMetrics()` với dữ liệu mẫu | Home có số liệu | 25/11 | — |
| TU1 | Tu | Chốt chữ ký `appendReview()` với Đức Huy, ghi vào `DATA_CONTRACT.md` | — | 20/11 | — |
| TU2 | Tu | Thử và chọn thư viện thông báo trên Android | Quyết định + lý do | 22/11 | H3 |
| TU3 | Tu | Nhắc lịch thật qua `setNotificationScheduler()` | Có thông báo trên máy | 25/11 | TU2 |
| TU4 | Tu | Check-in dùng lịch sử thật | Mở được ngay sau buổi tập | 25/11 | DH2 |
| DH1 | Đức Huy | Rebase lên `main`, chốt `appendReview()` với Tu | — | 20/11 | — |
| DH2 | Đức Huy | Thay placeholder `modules/history`: `getHistory`, `getLastSets`, `appendReview`, lưu buổi tập | `contract.test` vẫn qua | 22/11 | — |
| DH3 | Đức Huy | Màn tập (thay `screens/workout.tsx`): kg/rep từng set, nghỉ, tạm dừng, "Use last time" | Tập được 1 buổi | 24/11 | — |
| DH4 | Đức Huy | Hoàn tất → lưu lịch sử, `markSessionDone()`, sang `CheckIn`; báo đau → dừng | Màn tập nối sang check-in | 25/11 | DH3 |
| DO1 | Đỗ Huy | Xóa `food.*`, `chat.*` khỏi `prototype/` | PR nhỏ | 21/11 | — |
| DO2 | Đỗ Huy | Thử camera: MediaPipe JS trong WebView hay native | Chốt cách làm | 22/11 | H3 |
| DO3 | Đỗ Huy | Màn `Camera` chạy riêng, đếm rep squat (thay `screens/camera.tsx`) | Video demo | 25/11 | DO2 |
| DO4 | Đỗ Huy | Home bản đầu thay dev hub (rebase nhánh home có sẵn) | Home hiện buổi tới + nhịp | 25/11 | — |

Ưu tiên khi trễ: Đỗ Huy làm camera trước Home; H3 của Hải trước mọi việc khác của Hải.

**Tuần 2 (26/11 → 1/12, chốt lại cuối tuần 1):** đăng nhập + database (Supabase Auth; Thông màn đăng nhập, Hải dựng Supabase, mỗi người đồng bộ dữ liệu của mình), camera trong màn tập (Đỗ Huy + Đức Huy), avatar mạnh dần (Đỗ Huy), RPE → lịch tuần sau và backend sinh lịch Gemini (Hải), luật an toàn khi báo đau (Tu). Khóa tính năng 1/12, nộp 3/12.
