# FitLens — Project State

> Cập nhật: 2026-11-19. File sống: sửa mỗi khi một module đổi trạng thái. Nếu mâu thuẫn với code, tin code rồi sửa file này.

## 1. Mốc (milestones)

| Mốc | Thời điểm | Trạng thái |
| :-- | :-- | :-- |
| Proposal & PoC | Tuần 5 | _Nhóm điền_ (PoC sinh lịch tập đã có trong `poc/plan_generator/`) |
| MVP | Cuối kỳ | Đang làm: mobile đã có phần Rhythm/Reminders/Check-in trên `main`; backend chưa bắt đầu |

## 2. Trạng thái theo thành phần của repo (trên `main`)

| Thành phần | Thư mục | Trạng thái | Ghi chú |
| :-- | :-- | :-- | :-- |
| Tài liệu kiến trúc, use case, slide | `docs/` | Có | `ARCHITECTURE.md`, `ARCHITECTURE_LITE.md`, `USE_CASE_DIAGRAM.md`, slide THA, `design/RHYTHM_CHECKIN_REMINDER.md`. `DATA_CONTRACT.md` **chưa lên `main`** (đang ở nhánh `feature/workout-schedule` / `feature/mobile-workout-plan`) |
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
| Welcome (màn chào, routing lần đầu) | Thông | Chưa | `feature/welcome-native` — **PR #6 đang mở**, không tụt so với `main` |
| Workouts, Plan (lịch tuần) | Hải | Placeholder | `feature/mobile-workout-plan` (+10 commit, tụt 9; gồm cả `DATA_CONTRACT.md`). Merge `main` vào sẽ conflict 10 file (`App.tsx`, `package*.json`, `theme.ts`, README, prototype workouts/plan) |
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

## 8. Việc tiếp theo

| Việc | Người phụ trách | Trạng thái |
| :-- | :-- | :-- |
| Review & merge PR #6 (Welcome native) | _điền_ (reviewer) | Đang chờ review |
| Đưa `DATA_CONTRACT.md` + Workouts/Plan lên `main`: merge `main` vào `feature/mobile-workout-plan`, gỡ conflict, mở PR | Hải | Chưa |
| Merge `main` vào nhánh training và home/mascot, mở PR | Đức Huy, Đỗ Huy | Chưa |
| Thống nhất chữ ký `appendReview()` giữa Tu và Đức Huy | Tu, Đức Huy | Chưa rõ (nhánh Đức Huy chưa merge) |
| Xóa `food.*`, `chat.*`, `chat-entry.*` khỏi `prototype/` | Đỗ Huy | Chưa |
| Sửa use case, viewer, slide blueprint và xuất lại PDF/PPTX sau khi bỏ Dinh dưỡng và Chat | _điền_ | Chưa |
| Cài Android SDK + JDK 17 và build thử app lên máy thật/emulator | _điền_ | Chưa |
| Dựng khung backend FastAPI + Safety Router | _điền_ | Chưa |
| Xóa các nhánh đã merge (`docs/project-state-rn-android`, `docs/rhythm-checkin-design`, `docs/ui-snapshot-2026-10-28`, `feature/rhythm-checkin`, `feature/update-ui-prototype`) và nhánh cũ `tech-test` | _điền_ | Chưa |
| ~~Đồng bộ prototype mới nhất vào `prototype/`~~ | Thông | Xong (PR #5) |
| ~~Khởi tạo project mobile~~ | Tu | Xong (PR #4) |
| ~~Điền "Tech stack" và "Repo layout" trong `CLAUDE.md`~~ | — | Xong (19/11) |
