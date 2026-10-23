# FitLens — Function List (F1–F7)

> **Phụ trách:** Đức Huy · **Mốc:** CP0 (T6 23/10/2026) · **Bản:** v1.1 (nháp)
> **Dùng cho:** Thông (giao diện) · Gia Huy (blueprint) · THA (brief)

**Ưu tiên:** **P0** = bắt buộc có trong MVP · **P1** = nên có trong MVP

| # | Chức năng | Mô tả ngắn | Ưu tiên |
|---|---|---|---|
| **F1** | **Hồ sơ** | Nhập mục tiêu, trình độ, số buổi và thời lượng, dụng cụ, chế độ ăn hoặc dị ứng, vùng đang chấn thương (chọn từ danh sách). Sửa được hồ sơ và xoá toàn bộ dữ liệu. | P0 |
| **F2** | **Lịch tập tự điều chỉnh** | Sinh lịch tập 1 tuần theo hồ sơ. Sau mỗi buổi người dùng chấm độ mệt (Dễ / Vừa / Quá sức) để tuần sau tăng hoặc giảm độ khó. | P0 |
| **F3** | **Buổi tập có hướng dẫn + camera kiểm tra form** | Hướng dẫn từng bài: hiệp, rep, thời gian nghỉ, mẹo kỹ thuật. Khi muốn, người dùng bật camera để đếm rep và nhắc lỗi tư thế ở các bài có hỗ trợ; video không lưu, không gửi đi. | P0 |
| **F4** | **An toàn & chấn thương** | Nút "Tôi bị đau" luôn hiện khi tập: dừng buổi ngay (không cần mạng) và khuyên đi khám nếu đau kéo dài. Lịch tập và chat không đề xuất bài dùng tới vùng đang chấn thương. | P0 |
| **F5** | **Gợi ý dinh dưỡng** | Gợi ý bữa ăn đơn giản, rẻ, hợp mục tiêu tập và tránh món người dùng dị ứng. Ghi lại bữa đã ăn ở mức ước lượng, không tính calo chính xác. | P1 |
| **F6** | **Chat với PT ảo** | Hỏi đáp về bài tập, kỹ thuật và lịch tập. Chỉ hướng dẫn chung; nhắc tới đau hoặc chấn thương thì chuyển sang luồng an toàn của F4. | P1 |
| **F7** | **Động lực: nhân vật, streak, nhắc lịch** | Nhân vật mạnh lên theo buổi tập bằng chỉ số, kỹ năng, trang bị (không đổi hình dáng cơ thể). Có streak và nhắc lịch; ngày nghỉ theo lịch hoặc do báo đau không làm mất streak. | P1 |

### Phụ thuộc
- **F1 → F2, F4, F5:** lịch tập, bộ lọc chấn thương và gợi ý bữa ăn đều đọc từ hồ sơ.
- **F3 → F2, F7:** kết quả buổi tập (rep, độ mệt) quyết định độ khó tuần sau và làm nhân vật mạnh lên.
- **F4 ưu tiên cao nhất:** báo đau thì buổi tập dừng ngay.

### Ràng buộc chung
- Chỉ hướng dẫn chung, không chẩn đoán, không đưa lời khuyên y tế.
- Dữ liệu gửi LLM phải bỏ tên, email, ID (Pseudonymizer trong blueprint). Thông báo đẩy không chứa thông tin sức khoẻ.

### PoC (mốc 29/10)
- **F2:** test LLM sinh lịch tập (Hải), code ở `poc/plan_generator/`.
- **F3:** test đếm rep trên laptop với video quay sẵn (Hải).
- Giao diện lo-fi (Thông) dựa trên function list này.

### Cần nhóm chốt (chi tiết: [REVIEW_USE_CASES.md](REVIEW_USE_CASES.md))
1. **Báo đau (câu hỏi 22/10):** nghỉ hẳn hay tập bài không ảnh hưởng? *Đề xuất:* dấu hiệu nguy hiểm → dừng mọi bài tập; đau một vùng → dừng buổi, các buổi sau bỏ bài dùng vùng đó; hết đau → người dùng gỡ trong hồ sơ.
2. **Nguồn dữ liệu (câu hỏi 23/10):** *Đề xuất:* danh mục 30–40 bài có nhãn vùng cơ thể; LLM chỉ chọn bài trong danh mục, code kiểm tra lại. Bữa ăn: 20–30 món quen thuộc với sinh viên, giá trị ước lượng.
3. **Bù calo (mới):** đề xuất ban đầu và blueprint có "ăn nhiều thì tập thêm hiệp". *Đề xuất:* bỏ, vì nó gắn ăn uống với "trả nợ" bằng tập luyện.
