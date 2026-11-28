# FitLens — Project State

> Cập nhật phần Đỗ Huy: 2026-11-28 (camera trên branch `feature/camera-squat-native`, chưa merge). File sống: sửa mỗi khi một module đổi trạng thái. Nếu mâu thuẫn với code, tin code rồi sửa file này.

## 1. Mốc (milestones)

| Mốc | Thời điểm | Trạng thái |
| :-- | :-- | :-- |
| Proposal & PoC | Tuần 5 | _Nhóm điền_ (PoC sinh lịch tập đã có trong `poc/plan_generator/`) |
| MVP | Cuối kỳ | Đang làm: mobile đã có phần Rhythm/Reminders/Check-in trên `main`; backend chưa bắt đầu |

## 2. Trạng thái theo thành phần của repo (trên `main`)

| Thành phần | Thư mục | Trạng thái | Ghi chú |
| :-- | :-- | :-- | :-- |
| Tài liệu kiến trúc, use case, slide | `docs/` | Có | `ARCHITECTURE.md`, `ARCHITECTURE_LITE.md`, `USE_CASE_DIAGRAM.md`, slide THA, `design/RHYTHM_CHECKIN_REMINDER.md`, `design/DATA_CONTRACT.md` |
| Prototype UI (HTML/CSS/JS) | `prototype/` | Có, đã đồng bộ bản mới (PR #5, 14/11) | Đã có `plan.html`, `profile.html`, `streak.html`, `yearly-recap.html`. DO1 đã gỡ 12 file và liên kết trên branch camera; chờ PR merge (#35) |
| PoC sinh lịch tập bằng Gemini | `poc/plan_generator/` | Có | Chạy được từ CLI, chưa là API |
| Backend FastAPI | `backend/` | Chưa có code | Chỉ có README |
| Mobile React Native (Android) | `mobile/` | RN 0.88.1 + TypeScript, chỉ Android | Xem mục 3. `tsc` và `jest` chạy qua (5 suite, 23 test, 19/11). Chưa build Android vì máy chưa có Android SDK và JDK 17 |
| Pose estimation (MediaPipe) | `poc/rep_counter/`, `mobile/src/modules/camera/rep-counter.ts` | PoC Python + bộ đếm TypeScript | PoC đếm squat từ video bằng MediaPipe Pose (đúng 9/9 trên video quay đủ người, xem README của PoC). Bộ đếm và công thức góc gối đã port sang TS thuần, có test khớp PoC. **Branch camera:** CameraX + MediaPipe native đã nhận frame trên emulator, dùng lại bộ đếm PR #15; ARM64 APK build được. Chưa kiểm chứng điện thoại thật (#37) |
| Database (Supabase) | — | Chưa có | Chỉ là thiết kế |

## 3. Mobile: trạng thái theo module

| Module | Chủ | Trên `main` | Đang ở nhánh |
| :-- | :-- | :-- | :-- |
| Shared (storage, dates, ids, routes, seed) | chung | Có | — |
| Rhythm, Reminders, Check-in | Tu | Có (PR #4). Thông báo thật (`react-native-notify-kit`) | `feature/tu-week1` |
| Welcome (màn chào, routing lần đầu) | Thông | Có (PR #6) | — |
| Workouts, Plan (lịch tuần) | Hải | Có (từ `feature/mobile-workout-plan`): chạy trên model của `../prototype` qua cache chung | — |
| Route + màn tạm cho Onboarding, Profile, Insights, Workout, Recap, History, Camera | chủ từng màn | Có: `src/screens/<tên>.tsx` là placeholder, chủ màn thay file của mình | — |
| History, Recap, buổi tập đang diễn ra | Đức Huy | Có (PR #8, 24/11): màn tập lưu bền, resume, set tính giờ, Check-in → Recap → History. Sprint MVP: #18 sửa lỗi, #47 nối camera, #48 History/Recap mới, #49 icon + splash (đang review, 28/11) | `codex/training-regression-fixes`, `feature/npdwuy-camera-sets`, `feature/npdwuy-history-recap`, `feature/npdwuy-app-icon` |
| Home, Mascot, Activity, Camera | Đỗ Huy | Home/Activity/Mascot đã có (PR #10); Camera trên main vẫn chỉ UI | `feature/camera-squat-native`: native CameraX + MediaPipe, DO1 cleanup; đã đồng bộ main 3d9da8d. PR #61 sửa Home đang review |
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
2. Camera: DO2 đã chọn native CameraX + MediaPipe; DO3 chạy preview/inference trên emulator ở branch camera. Cần test độ chính xác trên điện thoại và video demo trước khi chốt go/no-go tối 2/12 (#37).
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
- DO2 (24/11): CameraX 1.4.2 + MediaPipe Pose Landmarker Lite native Android, model đóng gói offline; chọn thay WebView để dùng chung vòng đời camera Android. Chi tiết: `mobile/src/modules/camera/README.md`.
- Mobile: hàm contract **đồng bộ** trên cache đã hydrate; mỗi key có một chủ ghi; mỗi người một thư mục `mobile/src/modules/<module>`.

## 7. Quyết định còn mở

- Độ chính xác camera trên điện thoại thật (#37); nếu no-go tối 2/12 thì triển khai fallback preview + hướng dẫn + đếm thủ công (#38).
- Thư viện thông báo cho Android (`expo-notifications`, `react-native-notify-kit`, …) — xem `mobile/README.md`.
- Khi nào bắt đầu backend.

## 8. Kế hoạch tuần 1

Mục tiêu: **trước tiên app phải chạy được trên Android** (dù nhiều màn còn là placeholder), sau đó luồng cơ bản chạy hết một vòng: Welcome → Onboarding → Plan → Màn tập → Check-in → nhắc lịch. Đăng nhập và database (Supabase) để tuần 2.

Quy tắc: mỗi người chỉ sửa thư mục/màn của mình; gọi sang người khác qua hàm contract; mọi route đã đăng ký sẵn nên **không ai sửa `App.tsx` / `routes.ts`** nữa (cần route mới thì báo Hải). PR nhỏ, merge hằng ngày.

| ID | Người | Task | Kết quả | Cần |
| :-- | :-- | :-- | :-- | :-- |
| H1 | Hải | Đưa Workouts/Plan + `DATA_CONTRACT.md` vào `main` | PR merge | — |
| H2 | Hải | Đăng ký sẵn mọi route + màn tạm | Xong (cùng PR với H1) | — |
| H3 | Hải | Cài Android SDK + JDK 17, build APK đầu tiên, ghi hướng dẫn vào `mobile/README.md` | App chạy trên emulator/điện thoại | — |
| H4 | Hải | Nút "Start" trên Plan mở `Workout` với `{session}` | Từ Plan vào được màn tập | — |
| T1 | Thông | Onboarding (thay `screens/onboarding.tsx`): mục tiêu, kinh nghiệm, buổi/tuần, phút, thiết bị, vùng tránh; Welcome dẫn sang lần đầu | Lưu `fitlens.profile` | — |
| T2 | Thông | Profile xem/sửa; thay placeholder `modules/profile`, `getProfile()` đúng contract | Plan dùng profile thật | — |
| T3 | Thông | `getHomeMetrics()` với dữ liệu mẫu | Home có số liệu | — |
| TU1 | Tu | Chốt chữ ký `appendReview()` với Đức Huy, ghi vào `DATA_CONTRACT.md` | **Xong (20/11)**: đã ghi vào contract mục 6, khớp nhánh của Đức Huy; chờ Huy xác nhận | — |
| TU2 | Tu | Thử và chọn thư viện thông báo trên Android | **Xong (20/11)**: `react-native-notify-kit`, lý do trong `mobile/README.md` (Tu tự build trên máy mình, không cần chờ H3) | — |
| TU3 | Tu | Nhắc lịch thật qua `setNotificationScheduler()` | **Xong (20/11)**: thông báo thật trên emulator; tự đồng bộ khi lịch đổi | — |
| TU4 | Tu | Check-in dùng lịch sử thật | **Phần Tu xong (20/11)**: đọc `getHistory` theo contract, thêm lối vào dự phòng ở màn Rhythm. Mở ngay sau buổi tập là một dòng `navigate('CheckIn', {history})` trong DH4 | DH2, DH4 |
| DH1 | Đức Huy | Rebase lên `main`, chốt `appendReview()` với Tu | **Xong (24/11)**: `appendReviewDurable`, Tu đã ghi vào contract | — |
| DH2 | Đức Huy | Thay placeholder `modules/history`: `getHistory`, `getLastSets`, `appendReview`, lưu buổi tập | **Xong (24/11, PR #8)**: `contract.test` vẫn qua | — |
| DH3 | Đức Huy | Màn tập (thay `screens/workout.tsx`): kg/rep từng set, nghỉ, tạm dừng, "Use last time" | **Xong (24/11, PR #8)**: thêm resume sau khi tắt app, set tính giờ | — |
| DH4 | Đức Huy | Hoàn tất → lưu lịch sử, `markSessionDone()`, sang `CheckIn`; báo đau → dừng | **Xong (24/11, PR #8)**: màn tập nối sang check-in | DH3 |
| DO1 | Đỗ Huy | Xóa `food.*`, `chat.*` khỏi `prototype/` | Đã làm trên branch camera, chờ merge (#35) | — |
| DO2 | Đỗ Huy | Thử camera: MediaPipe JS trong WebView hay native | Đã chọn CameraX + MediaPipe native; ghi quyết định trong mobile/README.md (#36) | H3 |
| DO3 | Đỗ Huy | Màn `Camera` chạy riêng, đếm rep squat (thay `screens/camera.tsx`). Đã có sẵn `SquatCounter` và `kneeAngle()` trong `modules/camera/rep-counter.ts`: chỉ cần đưa 33 landmark vào `kneeAngle()` rồi kết quả vào `update()` | Đã có code native + APK; còn test điện thoại/video và go/no-go tối 2/12 (#37) | DO2 |
| DO4 | Đỗ Huy | Home bản đầu thay dev hub (rebase nhánh home có sẵn) | Đã merge PR #10; PR #61 bổ sung buổi tập đang diễn ra | — |

Ưu tiên khi trễ: Đỗ Huy làm camera trước Home; H3 của Hải trước mọi việc khác của Hải.

**Tuần 2 (chốt lại cuối tuần 1):** đăng nhập + database (Supabase Auth; Thông màn đăng nhập, Hải dựng Supabase, mỗi người đồng bộ dữ liệu của mình), camera trong màn tập (Đỗ Huy + Đức Huy), avatar mạnh dần (Đỗ Huy), RPE → lịch tuần sau và backend sinh lịch Gemini (Hải), luật an toàn khi báo đau (Tu).

## 9. Đỗ Huy: phần còn cần thiết bị thật (28/11)

- #37: emulator đã kiểm tra preview, inference không có người, đổi camera, nhả camera khi app ra nền. Chưa có Android thật; không coi fixture hoặc emulator là bằng chứng đếm squat trên người. Cần video demo và quyết định go/no-go tối 2/12.
- #38: chỉ kích hoạt nếu #37 no-go; không âm thầm thay đếm tự động bằng số giả.
- #39: QA Home, Activity, phản ứng mascot sau check-in và camera trên điện thoại, hạn 5–6/12. Emulator/automated tests chỉ bổ sung, không đóng thay phone QA.
- #33 (Đức Huy): Workout đã nhận cameraReps (PR #47 trên main). Branch camera trả count vào route Workout trước đó; cần kiểm tra chung đường đi tới History/Recap.
