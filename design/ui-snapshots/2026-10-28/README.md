# FitLens — Snapshot có gắn tag

**260 ảnh màn hình**, chụp ngày 28/10/2026 từ bản trong thư mục gốc D:/UI_Design.

Mở **index.html** bằng Chrome/Edge để xem ảnh, tìm kiếm và lọc tag. Mọi thứ chạy offline; không cần tài khoản hoặc server. Không di chuyển riêng file index.html: giữ nguyên cả thư mục.

- **index.csv**: danh mục dùng trong Excel, Google Sheets hoặc gửi teammate.
- **manifest.json**: toàn bộ metadata, chữ trên màn hình và hash từng ảnh.
- **Mỗi PNG có một JSON cùng tên**: tag, mô tả, route, thời điểm chụp, nguồn dữ liệu, mức kiểm chứng.
- **coverage.md**: bản đồ tính năng → mã ảnh.
- **contact-sheets/**: tờ xem nhanh theo nhóm; **thumbs/**: thumbnail cho gallery.
- **_capture/**: công cụ và log chụp; không phải code giao diện sản phẩm.

## Nhóm ảnh

| Nhóm | Số ảnh |
|---|---:|
| Onboarding | 9 |
| Home | 8 |
| Workout / Session / Review | 53 |
| Lịch tập / Scheduling | 31 |
| Streak / Weekly goal | 16 |
| Đi bộ / Steps / Activity log | 10 |
| Món ăn / Nhật ký ăn | 29 |
| Danh mục 30 món | 30 |
| Insights / Recap / Training focus | 30 |
| Profile / Preferences | 15 |
| Chat / Camera preview | 12 |
| Legacy / Design studies | 2 |
| Mascot / Brand | 9 |
| Kích thước mobile bổ sung | 6 |

## Ý nghĩa tag và mức kiểm chứng

- **ui-observed**: đã mở và nhìn thấy trạng thái UI; không đồng nghĩa toàn bộ backend hoạt động.
- **ui-interaction**: đã thao tác control và chụp trạng thái kết quả trong prototype.
- **preview**: state demo/illustrative có sẵn, camera/chat/recap mô phỏng hoặc màn nghiên cứu.
- **fixture**: đã chuẩn bị dữ liệu thử bằng model để hiện trường hợp khó như lịch tuần trước/xung đột; thao tác mở preview vẫn qua UI.
- **data:synthetic**: dữ liệu trong bộ này là dữ liệu mẫu/thử, không phải tài khoản thật hoặc một buổi tập thể chất thật.
- Tag tính năng ví dụ: copy-week, copy-previous-week, use-last-time, meal-log, undo, weekly-goal. Tag trạng thái ví dụ: empty, preview, before, after, conflict, paused, saved.

## Phạm vi và giới hạn

Chrome headless, chính 390×844; phụ lục 320×700 và 430×932. Đây là ảnh trang HTML cục bộ, không phải ảnh từ app native trên điện thoại. Thao tác và dữ liệu chỉ ở các phiên trình duyệt thử tách biệt. Không thay đổi HTML/CSS/JS sản phẩm. Không cấp quyền sức khỏe, không bật camera thật, không gửi notification và không gọi AI backend.

Steps hiển thị mẫu đến Oct 23; ngày chụp vẫn là Oct 28. Recap năm dùng năm 2025 minh họa. Không thay ngày/số liệu trên UI để làm ảnh có vẻ mới hơn.

activity.html chuyển về Workouts; post-walk.html và post-walk-restored.html chuyển về Steps. Bộ này có Steps và manual activity log, không khẳng định có màn live walking/GPS riêng. Start Set ở Camera là control của UI study; chưa có chức năng ghi hình/phân tích để xác nhận.

Một ảnh tĩnh không chứng minh motion, swipe, persistence qua tài khoản hoặc khả năng dùng trên thiết bị thật. Các lỗi công cụ đã khắc phục được đánh dấu resolved trong manifest; giới hạn chưa giải quyết nằm trong limitations.

Nguồn đổi trong khoảng chụp: không phát hiện thay đổi trong các file HTML/CSS/JS gốc đã fingerprint.

Tag cũng được nhúng trong metadata PNG (`Keywords`), kèm Title, Source và CapturedAt. Ảnh không có nhãn đè lên giao diện.
