# FitLens — Project State

> Cập nhật: 2026-11-14. File sống: sửa mỗi khi một module đổi trạng thái. Nếu mâu thuẫn với code, tin code rồi sửa file này.

## 1. Mốc (milestones)

| Mốc | Thời điểm | Trạng thái |
| :-- | :-- | :-- |
| Proposal & PoC | Tuần 5 | _Nhóm điền_ |
| MVP | Cuối kỳ | Chưa bắt đầu code backend/mobile |

## 2. Trạng thái theo thành phần của repo

| Thành phần | Thư mục | Trạng thái | Ghi chú |
| :-- | :-- | :-- | :-- |
| Tài liệu kiến trúc, use case, slide | `docs/` | Có | `ARCHITECTURE.md`, `ARCHITECTURE_LITE.md`, `USE_CASE_DIAGRAM.md`, slide THA |
| Prototype UI (HTML/CSS/JS) | `prototype/` | Có, bản trong repo cũ hơn bản đang dùng | Xem mục 3 |
| PoC sinh lịch tập bằng Gemini | `poc/plan_generator/` | Có | Chạy được từ CLI, chưa là API |
| Backend FastAPI | `backend/` | Chưa có code | Chỉ có README |
| Mobile React Native (Android) | `mobile/` | Khung trống (RN 0.88 + TypeScript, bỏ iOS) | `tsc` và `jest` chạy qua; chưa build Android vì máy chưa có Android SDK và JDK 17 |
| Pose estimation (MediaPipe) | — | Chưa có | Chỉ là thiết kế |
| Database (Supabase) | — | Chưa có | Chỉ là thiết kế |

## 3. Prototype UI: kiểm kê chức năng

Nguồn: `PROJECT_FEATURE_AND_NAVIGATION_MAP.md` (kiểm kê 04/11/2026, thư mục `D:\UI_Design`). Bản đó có thêm các trang như `plan.html`, `profile.html`, `streak.html`, `yearly-recap.html` mà `prototype/` trong repo chưa có, nên **cần đồng bộ prototype mới nhất vào repo**.

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
| ~~Dinh dưỡng~~, ~~Chat FitLens~~ | **Đã bỏ khỏi phạm vi (14/11/2026)** |
| Nhịp, streak & nhắc lịch | Có lưu; thông báo chỉ là preview, không có push thật |
| Camera kiểm tra form | Chỉ UI: không mở camera, không đếm rep |
| Mascot / Avatar | Chỉ biểu cảm; chưa có chỉ số/kỹ năng/trang bị |

## 4. Khoảng trống so với định hướng (F1–F7)

1. Vòng tự điều chỉnh: RPE sau buổi → tăng/giảm độ khó tuần sau **chưa nối hoàn chỉnh**.
2. Camera: chưa có pose estimation thật.
3. LLM: mới có PoC sinh lịch; chưa có Safety Router phía backend.
4. Avatar: mới có biểu cảm, chưa "mạnh lên" theo luyện tập.
5. Chưa có backend, DB, đồng bộ, đăng nhập (JWT).
6. Thông báo nhắc lịch chưa gửi thật.

## 5. Quyết định đã chốt

- App language: English. LLM PoC: Gemini free tier (`gemini-3.8-flash`); không gửi dữ liệu cá nhân thật.
- RPE: thang 1–10, hỏi một lần sau buổi tập, tách khỏi chấn thương.
- Mobile: React Native (CLI, TypeScript), chỉ Android (14/11/2026). Không làm iOS.
- Bỏ Dinh dưỡng và Chat khỏi phạm vi sản phẩm (14/11/2026). Gemini chỉ còn dùng để sinh lịch tập.
- Zero video retention: camera xử lý trên thiết bị, backend không nhận ảnh/video.

## 6. Quyết định còn mở

- Cách chạy MediaPipe Pose trên React Native (module native Android hay plugin frame processor cho camera).
- Khi nào bắt đầu backend và mobile.
- Có đưa prototype mới nhất từ `D:\UI_Design` vào repo không, theo cách nào.

## 7. Phân công prototype UI (hạn CN 15/11/2026)

| Thành viên | Phần việc | Việc cần xong | Hàm xuất ra cho người khác |
| :-- | :-- | :-- | :-- |
| Thông | Hồ sơ & Insight | Onboarding và chỉnh sửa hồ sơ lưu được, mở lại vẫn còn. Trang Insights, steps, training focus, recap tháng/năm. Chỉ số trên Home | `getProfile()` (có vùng cần tránh), `getHomeMetrics()` (dùng dữ liệu mẫu nếu chưa có lịch sử) |
| Tu | Nhắc lịch & Check-in | Mô hình nhịp: mục tiêu số buổi/tuần, streak, tạm nghỉ, tính từ lịch sử mẫu. Cài giờ nhắc. Màn check-in sau buổi hiển thị đủ trường và lưu kết quả để tuần sau điều chỉnh độ khó | `appendReview()` |
| Hải | Workout & Lịch tuần | Thư viện workout: tạo/sửa/xóa, xem chi tiết. Lịch tuần sinh draft từ `getProfile()`, áp dụng, thêm/đổi/xóa buổi, kéo thả, sao chép tuần. Trang Workouts và Plan. Gỡ nút "Ask FitLens" khỏi Workout details | `getWorkout()`, `updateWorkout()`, `getWeekSchedule()` |
| Đức Huy | Buổi tập đang diễn ra | Tách lịch sử tập ra `training-history.js`. Màn tập ghi kg/rep từng set, nghỉ, tạm dừng/tiếp tục, dùng số liệu lần trước, báo đau, hoàn tất buổi thì lưu vào lịch sử | `getHistory()`, `getLastSets()`, `appendReview()` |
| Đỗ Huy | Home, Hoạt động & Camera | Home và dock điều hướng tới mọi trang chính, giữ danh sách route chung. Mascot, ghi hoạt động khác. Màn chuẩn bị camera (chỉ UI). **Gỡ toàn bộ Dinh dưỡng và Chat khỏi app** | `setMascotMood()`, `renderActivitySection()` |

Lưu ý:
- `appendReview()` xuất hiện ở cả Tu (màn check-in gọi) và Đức Huy (định nghĩa trong `training-history.js`). Hai người cần thống nhất chữ ký hàm.
- Dinh dưỡng và Chat đã bỏ khỏi phạm vi: `ARCHITECTURE.md`, `ARCHITECTURE_LITE.md` và `CLAUDE.md` đã sửa. `USE_CASE_DIAGRAM.md` (UC03, F5, mermaid + PlantUML), `use-case-viewer.html`, `SLIDES_BLUEPRINT.md` và các file PDF/PPTX **chưa sửa**.

## 8. Việc tiếp theo

| Việc | Người phụ trách | Trạng thái |
| :-- | :-- | :-- |
| Đồng bộ prototype mới nhất vào `prototype/` | _điền_ | Chưa |
| Thống nhất chữ ký `appendReview()` giữa Tu và Đức Huy | Tu, Đức Huy | Chưa |
| Sửa use case, viewer, slide blueprint và xuất lại PDF/PPTX sau khi bỏ Dinh dưỡng và Chat | _điền_ | Chưa |
| Xóa `food.*`, `chat.*` khỏi `prototype/` | Đỗ Huy | Chưa |
| Dựng khung backend FastAPI + Safety Router | _điền_ | Chưa |
| Khởi tạo project mobile | _điền_ | Chưa |
| Điền mục "Tech stack" và "Repo layout" trong `CLAUDE.md` | _điền_ | Chưa |
