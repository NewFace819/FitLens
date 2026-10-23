# Kịch bản slide: Function List + Use Case (gửi THA)

> **Phụ trách nội dung:** Đức Huy · **Người trình bày:** THA (Hoàng Anh)
> **Hạn gửi THA:** T3 27/10/2026, trước 18:00 (kèm 20 phút giải thích)
> **Nguồn:** [FUNCTION_LIST.md](FUNCTION_LIST.md) · [USE_CASES.md](USE_CASES.md) · [REVIEW_USE_CASES.md](REVIEW_USE_CASES.md)
> **Thời lượng khi trình bày:** ước lượng 4–5 phút cho cả 2 slide; THA chỉnh theo tổng thời lượng buổi trình bày.

---

## SLIDE 1: FITLENS LÀM ĐƯỢC GÌ? (FUNCTION LIST F1–F7)

### Nội dung trên slide
* **Tiêu đề:** FitLens: 7 chức năng chính
* **Bảng 7 dòng** (mỗi dòng: mã, tên, 1 dòng mô tả, nhãn ưu tiên):
  * **P0 (bắt buộc trong MVP):** F1 Hồ sơ · F2 Lịch tập tự điều chỉnh · F3 Buổi tập + camera kiểm tra form · F4 An toàn & chấn thương
  * **P1 (nên có):** F5 Gợi ý dinh dưỡng · F6 Chat với PT ảo · F7 Nhân vật, streak, nhắc lịch
* **Dải chân slide:** "PoC 29/10: F2 (LLM sinh lịch) + F3 (đếm rep từ video)"

### Speaker notes
> *"FitLens làm 7 việc mà một PT ngoài đời làm cho học viên, ở mức 'đủ dùng' cho sinh viên không có tiền thuê PT.*
>
> *Bốn chức năng P0 là xương sống. App hỏi hồ sơ (F1), lên lịch tập theo hồ sơ và tự tăng giảm độ khó theo cảm nhận độ mệt sau mỗi buổi (F2), hướng dẫn từng bài và cho bật camera khi muốn kiểm tra form (F3). F4 là lớp an toàn: nút 'Tôi bị đau' dừng buổi tập ngay, và lịch tập không đề xuất bài dùng tới vùng đang chấn thương.*
>
> *Ba chức năng P1 giúp người dùng quay lại mỗi ngày: gợi ý bữa ăn rẻ, chat hỏi đáp với PT ảo, và một nhân vật mạnh lên theo từng buổi tập. Ngày nghỉ, kể cả nghỉ vì đau, không làm mất chuỗi ngày tập, để không ai phải cố tập khi đang đau.*
>
> *Ở mốc PoC, nhóm chứng minh 2 phần khó nhất về kỹ thuật: LLM sinh lịch tập và đếm rep bằng camera."*

---

## SLIDE 2: AI LÀM GÌ VỚI HỆ THỐNG? (USE CASE DIAGRAM)

### Nội dung trên slide
* **Tiêu đề:** Use Case Diagram: 11 ca sử dụng chính, 4 tác nhân
* **Hình:** sơ đồ PlantUML trong `USE_CASES.md`, render thành ảnh.
  * Trái: `User / Student`
  * Phải: `Device Camera` · `LLM Service (Gemini)` · `Notification Service`
* **3 điểm nhấn (callout trên hình):**
  1. `Check Form with Camera` là **«extend»**: chỉ bật khi người dùng muốn
  2. `Report Pain` mở rộng cả `Perform Workout` và `Chat with Coach`: báo đau ở đâu cũng vào cùng một luồng an toàn
  3. `Apply Health Limitations` dùng chung cho lịch tập, bữa ăn và chat
* **Góc nhỏ "Không làm" (chọn 4 trong 10 non-goals):** không chẩn đoán y tế · không lưu video · không heat map · không mạng xã hội

### Speaker notes
> *"Sơ đồ có một tác nhân chính là người dùng, và ba hệ thống bên ngoài: camera của điện thoại, dịch vụ LLM Gemini và dịch vụ thông báo đẩy.*
>
> *Use case trung tâm là Perform Workout. Ba nhánh mở rộng của nó đều là «extend» vì chỉ xảy ra khi có điều kiện: kiểm tra form bằng camera khi người dùng muốn, báo đau khi người dùng bấm nút, chấm độ mệt sau buổi tập. Nhóm cố ý không để camera là «include», vì bắt người mới bật camera suốt buổi sẽ tạo áp lực và tốn pin.*
>
> *Lịch tập, bữa ăn và chat đều đi qua cùng một bước Apply Health Limitations, nên chấn thương hay dị ứng khai một lần là có hiệu lực ở cả ba chỗ.*
>
> *So với bản nháp cũ, nhóm đã bỏ heat map, chuyển sang mobile app và thêm nhân vật đồng hành. Nhóm cũng ghi rõ 10 việc không làm trong MVP, quan trọng nhất là không chẩn đoán y tế và không lưu video."*

---

## Kế hoạch 20 phút giải thích cho THA

| Phút | Nội dung |
|---|---|
| 0–5 | Đi qua F1–F7, nhấn vào 4 chức năng P0 và lý do |
| 5–12 | Đi qua sơ đồ: tác nhân, 3 «extend» của Perform Workout, «include» dùng chung |
| 12–17 | Luyện bảng câu hỏi bên dưới: THA trả lời thử, Đức Huy sửa |
| 17–20 | Chốt câu nào THA tự trả lời, câu nào chuyển cho Đức Huy |

## Câu hỏi có thể bị hỏi (để Đức Huy trả lời phần chuyên sâu)

| Câu hỏi | Gợi ý trả lời |
|---|---|
| Vì sao camera là «extend» chứ không phải «include»? | Vì người dùng có thể tập trọn buổi mà không bật camera. «include» nghĩa là lần nào cũng xảy ra. |
| Sao không còn actor AI Engine hay Medical RAG Database? | Actor phải nằm ngoài hệ thống. Lõi xử lý và kho kiến thức là của chính FitLens; chỉ Gemini là dịch vụ bên ngoài nên là actor. |
| Sao camera là actor mà loa thì không? | Camera cung cấp dữ liệu đầu vào (hình ảnh để nhận dạng tư thế). Âm thanh và rung chỉ là đầu ra của chính Check Form with Camera. |
| Vì sao 11 use case mà không nhiều hơn? | Mỗi use case là một mục tiêu người dùng muốn đạt. Kiểm tra khoảng cách đứng hay lưu buổi tập chỉ là bước bên trong, không phải use case riêng. |
| Camera kiểm tra được những bài nào? | Chỉ các bài nhóm đã viết luật góc khớp. Hải chốt danh sách theo kết quả test đếm rep. |
| LLM bịa bài tập nguy hiểm thì sao? | Hiện PoC chỉ chặn bằng prompt. Đề xuất: LLM chỉ chọn bài trong danh mục có nhãn và code kiểm tra lại. *(Chờ nhóm chốt câu hỏi 2.)* |
| Người dùng báo đau thì app làm gì? | Dừng buổi ngay, không cần mạng, và khuyên đi khám nếu đau kéo dài. Các buổi sau thế nào: *chờ nhóm chốt câu hỏi 1.* |
| Sao không có bù calo như đề xuất ban đầu? | Nhóm đã bỏ (chốt 23/10): bắt tập thêm để bù bữa ăn giống "trả nợ calo", dễ tạo áp lực ăn uống cho người trẻ. |
| Nghỉ vì đau có mất streak không? | Không. Nếu mất streak, người dùng sẽ có lý do cố tập khi đang đau. |
| Gửi dữ liệu sức khoẻ cho Gemini có an toàn không? | Chỉ gửi dữ liệu đã bỏ tên, email, ID, vì prompt ở tầng miễn phí có thể được Google dùng để cải thiện sản phẩm. |
