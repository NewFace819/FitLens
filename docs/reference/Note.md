# FitLens — Sổ Tay Định Hướng & Ghi Chú Dự Án (Project Notes)

## 1. Định Vị Dự Án (Core Concept)
* **Tên đề tài:** FitLens (Project 01, môn CS252 - Computational Thinking).
* **Bản chất:** **PT Ảo Đồng Hành Cá Nhân Hóa (AI Virtual Personal Trainer & Habit Coach)** trên nền tảng **Mobile App (iOS / Android — Flutter / React Native)**.
* **Tư tưởng cốt lõi (Anti-Overengineering & Behavioral UX):**
  * Không biến ứng dụng thành "máy soi camera" áp lực. Mục tiêu tối thượng là **xây dựng thói quen tập luyện bền vững** cho người ít vận động (sinh viên, dân văn phòng).
  * *"Nếu ngày đầu đã quá khó thì sẽ chẳng ai muốn quay lại"* $\rightarrow$ Bài tập và nhịp độ phải tự thích ứng dựa trên phản hồi dữ liệu (Adaptive Progression).
  * **Lý do chọn Mobile App:** Tận dụng thông báo đẩy (Push Notifications) để nhắc nhở duy trì thói quen hàng ngày, phản hồi rung (Haptic feedback) tức thì khi sai tư thế, và tối ưu hóa phần cứng Camera/NPU native mượt mà hơn web.

---

## 2. 4 Trụ Cột Nghiệp Vụ Chính
1. **Lộ trình thích ứng & Tăng tiến cường độ (Progressive Overload & Adaptive Pacing):**
   * Bắt đầu bằng khối lượng nhẹ, bài tập dễ tiếp cận để tạo thói quen và cảm giác thành tựu.
   * Dựa vào dữ liệu phản hồi sau mỗi buổi (số reps hoàn thành, đánh giá mệt RPE: *Dễ / Vừa / Quá sức*), AI tự động tăng dần cường độ một cách mượt mà và an toàn.
2. **Gợi ý bài tập & Thực đơn theo sức khỏe (Health-Aware Workout & Nutrition):**
   * Tự động lọc/loại bỏ bài tập rủi ro dựa trên tình trạng bệnh lý (đau thắt lưng, gù lưng, đau khớp gối do ngồi máy tính nhiều).
   * Gợi ý thực đơn dinh dưỡng cơ bản, cân bằng calo bữa ăn nạp vào.
3. **Camera kiểm tra kỹ thuật khi cần (On-Demand Form Check):**
   * **Không ép buộc bật camera suốt cả buổi tập.**
   * Người dùng tập bình thường theo hướng dẫn; chỉ khi gặp động tác mới hoặc không chắc mình làm đúng, người dùng mới bấm nút *"Kiểm tra form với Camera"*.
   * AI quét vài hiệp để chấm điểm kỹ thuật, phát hiện lỗi sai sinh học (cong lưng, lệch gối) rồi cho phép tắt camera tiếp tục bài tập.
4. **AI Assistant (Hội thoại & Cố vấn 24/7):**
   * Giải đáp thắc mắc về kỹ thuật, giải thích cơ chế giải phẫu, lọc tin giả thể hình (RAG y tế) và nhắc nhở động viên.

---

## 3. Quy Ước Thiết Kế Diagram (Lưu Ý Quan Trọng Để Không Bị Trừ Điểm)
1. **Dùng Use Case Diagram chuẩn UML — Tuyệt đối KHÔNG vẽ Flowchart.**
2. **Quan hệ của Camera:**
   * Việc dùng Camera kiểm tra tư thế là **On-Demand**, do đó Use Case `Check Posture with Camera` là quan hệ **`«extend»`** vào `Perform Workout` (chỉ kích hoạt khi người dùng có nhu cầu), KHÔNG PHẢI `«include»` bắt buộc.
3. **Primary Actor (Bên trái):** `User / Student`.
4. **Secondary Actors (Bên phải):** `Device Camera / Pose Tracker`, `Medical RAG Database`.

---

## 4. Kiến Trúc Dữ Liệu & Bảo Mật (Pragmatic & Lean)
* **Mô hình dữ liệu:** Tinh gọn 5–6 bảng cốt lõi (`User`, `Exercise`, `WorkoutSession`, `DifficultyFeedback`, `MealLog`, `MedicalKnowledge`).
* **Lưu trữ cục bộ:** `SQLite` / `Room` / `Hive` trên Mobile App (Offline-First thực thụ).
* **Bảo mật cơ bản:**
  * **Zero Video Retention:** Toàn bộ xử lý camera chạy on-device trên RAM ứng dụng (Native ML Kit / MediaPipe Mobile SDK), không bao giờ lưu trữ hay upload video/ảnh lên server.
  * **Data Minimization:** Chỉ lưu các chỉ số thống kê (reps, điểm form, đánh giá độ mệt).
  * **Quyền riêng tư (NĐ 13/2023/NĐ-CP):** Hỗ trợ `Delete Personal Data` xóa sạch profile khi người dùng yêu cầu.
  * **Lưu trữ an toàn:** Token JWT lưu trong iOS Keychain / Android Keystore.