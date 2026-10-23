# Kiểm tra function list & use case với các câu hỏi mở

> **Người kiểm tra:** Đức Huy (soạn cùng Claude) · **Ngày:** 23/10/2026
> **Tài liệu được kiểm tra:** [FUNCTION_LIST.md](FUNCTION_LIST.md) · [USE_CASES.md](USE_CASES.md) · [SLIDES_FUNCTION_USECASE.md](SLIDES_FUNCTION_USECASE.md)

## 1. Câu hỏi dùng để kiểm tra

| Mã | Câu hỏi | Nguồn |
|---|---|---|
| **CQ1** | Người dùng báo đau cổ tay hoặc chấn thương tương tự: cho nghỉ hẳn (A) hay chỉ đưa bài không ảnh hưởng (B)? | Sheet, nêu 22/10, chưa chốt |
| **CQ2** | Dữ liệu cho lịch tập và bữa ăn lấy từ đâu, để LLM chỉ là cầu nối chứ không quyết mọi thứ? | Sheet, nêu 23/10, chưa chốt |
| **CQ3** | Có giữ "bù calo" (ăn nhiều thì tập thêm hiệp) không? | Mới: có trong đề xuất ban đầu và blueprint, nhưng function list v1 đã bỏ mà không nói |

Ngoài ra còn kiểm tra tiêu chí "Xong khi…" trong sheet và quy ước UML (`docs/reference/Note.md` mục 3, `docs/reference/report.md` mục 2.2).

## 2. Từng use case × câu hỏi mở

| Use case | CQ1: báo đau | CQ2: nguồn dữ liệu | Quy tắc đã thêm |
|---|---|---|---|
| UC01 Manage Profile | Nếu chọn A, khai chấn thương sẽ khoá lịch tập, nên người dùng có lý do giấu chấn thương. Cần cách báo "đã hết đau". | Vùng chấn thương phải chọn từ danh sách thì bộ lọc mới đọc được. PoC đang dùng ô chữ tự do. | Đổi tên từ Set Up Profile; vùng chọn từ danh sách; có nút "đã hết đau" |
| UC02 Get Weekly Plan | A: tạm dừng lịch đến khi hết đau. B: bỏ bài dùng vùng đau. Sơ đồ giống nhau, chỉ khác luồng. | Nếu LLM tự nghĩ bài thì code không kiểm tra được. Test PoC: push-up lọt qua với hồ sơ đau cổ tay. | Include Apply Health Limitations; LLM lỗi thì dùng lịch mẫu |
| UC03 Perform Workout | Nút "Tôi bị đau" có ở cả hai phương án. | Mẹo kỹ thuật nên lấy từ danh mục để khớp với luật camera. | Nút báo đau luôn hiện |
| UC04 Check Form with Camera | Không ảnh hưởng: bài bị loại thì không có trong buổi tập. | Camera chỉ kiểm tra được bài có luật góc khớp do nhóm viết; bài do LLM tự nghĩ thì không. | Chỉ bật ở bài có luật; kiểm tra khoảng cách, ánh sáng trước khi quét |
| UC05 Report Pain | Chính là câu hỏi này. Đề xuất ở mục 3. | Không phụ thuộc: chạy offline, không gọi LLM. | Mở rộng cả Perform Workout và Chat with Coach |
| UC06 Rate Session Difficulty | "Quá sức" khác "đau", nên thang chấm không có lựa chọn "đau". | Luật tăng giảm độ khó nên là bảng luật của nhóm (`Data_Design.md` mục 4.1). | Bỏ qua thì giữ nguyên độ khó |
| UC07 Delete Personal Data | Phải xoá cả thông tin chấn thương (dữ liệu sức khoẻ). | Dữ liệu đã gửi Gemini thì không xoá được. | Lên P0 (MVP có vòng user test với người thật); chỉ gửi dữ liệu ẩn danh |
| UC08 Get Meal Suggestions | Không ảnh hưởng. | Cần danh sách món quen thuộc với sinh viên; USDA FoodData Central chủ yếu là thực phẩm Mỹ. CQ3 nằm ở đây. | Tránh món dị ứng; F1 hỏi thêm chế độ ăn, dị ứng |
| UC09 Chat with Coach | Nhắc tới đau thì chuyển sang Report Pain; không gợi ý bài dùng vùng đau. | Trả lời dựa trên danh mục của nhóm, LLM chỉ diễn giải (đúng ý câu hỏi 23/10). | Lọc tên, số điện thoại trong tin nhắn trước khi gửi Gemini |
| UC10 View Progress & Avatar | Nếu nghỉ vì đau làm mất streak, người dùng sẽ cố tập khi đang đau. | Chỉ số nhân vật tính bằng luật từ dữ liệu buổi tập. | Nghỉ theo lịch hoặc do báo đau không mất streak |
| UC11 Set Workout Reminders | Đang nghỉ vì đau mà vẫn bị nhắc tập là gây áp lực. | Không ảnh hưởng. | Tạm dừng nhắc khi nghỉ do đau; nội dung không chứa thông tin sức khoẻ |
| INC Apply Health Limitations | A = chặn mọi bài; B = bỏ bài dùng vùng đau. Một use case dùng được cho cả hai. | Chỉ kiểm tra được bằng code khi bài và món có nhãn. | Include chung cho UC02, UC08, UC09 |

**Kết luận:**
- **CQ1 không làm đổi sơ đồ.** Cả hai phương án dùng cùng 12 ô và cùng quan hệ, chỉ khác luồng chi tiết của UC02, UC05 và INC. Có thể chốt sơ đồ ngay.
- **CQ2 quyết định cách làm 6 use case** (UC01, UC02, UC04, UC08, UC09, INC), và cả câu trả lời "LLM bịa bài thì sao?" khi thuyết trình. Nên chốt trước CP1 (25/10).
- **CQ3** chỉ ảnh hưởng UC08, nhưng đang mâu thuẫn với blueprint của Gia Huy (Rules Engine có "Bù Calo").

## 3. Đề xuất để nhóm chốt

1. **CQ1, chia 3 mức:**
   - Dấu hiệu nguy hiểm (đau ngực, chóng mặt, khó thở): dừng mọi bài tập, khuyên tìm hỗ trợ y tế ngay.
   - Đau một vùng: dừng buổi tập, ghi vùng đó thành hạn chế tạm thời; các buổi sau bỏ bài dùng vùng đó; khuyên đi khám nếu đau kéo dài.
   - Hết đau: người dùng tự gỡ hạn chế trong hồ sơ.

   Mức 2 tránh được việc "nghỉ hẳn" khiến người dùng bỏ app hoặc giấu chấn thương. Mức 1 giữ an toàn cho trường hợp nặng.
2. **CQ2:** nhóm soạn danh mục 30–40 bài, mỗi bài có mã và nhãn (vùng cơ thể dùng tới, dụng cụ, có luật camera hay không). LLM chỉ được trả về mã bài trong danh mục. Code loại bài không có trong danh mục hoặc dùng tới vùng cần tránh, rồi mới hiển thị. Bữa ăn: 20–30 món quen thuộc với sinh viên, giá trị ước lượng. Nếu dùng bảng thành phần thực phẩm có sẵn thì kiểm tra quyền sử dụng trước.
3. **CQ3:** bỏ bù calo, vì nó gắn ăn uống với việc "trả nợ" bằng tập luyện, không hợp với người trẻ. Nếu nhóm vẫn giữ, không bao giờ diễn đạt kiểu "ăn món này thì phải tập thêm".

## 4. Test PoC sinh lịch tập (offline, 23/10)

Máy này chưa có file `.env` (API key) nên không gọi Gemini thật. Thay vào đó, câu trả lời của Gemini được giả lập để chạy code thật trong `poc/plan_generator/generate_plan.py`.

| Test | Kết quả |
|---|---|
| Kế hoạch hợp lệ được đọc và hiển thị | Đạt |
| Luật cổ tay có trong prompt gửi Gemini | Đạt |
| Hồ sơ đau cổ tay + kế hoạch có Push-ups, Plank, Burpees bị từ chối | **Không đạt:** code chấp nhận, không cảnh báo |
| Hồ sơ 3 buổi/tuần + kế hoạch 5 buổi bị từ chối | **Không đạt:** code chấp nhận |
| Gemini trả về rỗng thì báo lỗi dễ hiểu | **Không đạt:** lỗi `ValidationError` thô, vì `main()` chỉ bắt `APIError` |
| Gemini trả về JSON hỏng thì báo lỗi dễ hiểu | **Không đạt:** như trên |

**Ý nghĩa với CQ1, CQ2:** hiện PoC chỉ bảo vệ chấn thương bằng prompt. Nếu Gemini bỏ qua luật thì kế hoạch nguy hiểm vẫn tới tay người dùng. Đây là lý do mạnh nhất để chọn đề xuất CQ2 (danh mục + code kiểm tra lại).

## 5. Kiểm tra tự động 3 tài liệu

Có một script kiểm tra 43 điều kiện: tiêu chí "Xong khi…" trong sheet, quy ước UML, và tính nhất quán giữa 3 tài liệu.

- **Bản v1 (trước khi sửa): 31/43 đạt.** Các lỗi chính:
  - Sơ đồ có 16 ô, vượt mức 8–12.
  - 4 «include» chỉ là bước con của một use case.
  - Actor `Camera / Pose Tracker` thật ra nằm trong hệ thống.
  - Use case `Receive Workout Reminder` không do actor nào khởi động.
  - UC Delete Personal Data là P1 trong khi F1 là P0.
  - Mô tả F3, F4 dài hơn 2 câu.
  - Câu "PoC đã chạy" chưa được kiểm chứng.
  - Câu "không bao giờ xuất hiện" khẳng định quá mức.
  - Có bản Mermaid trùng (Mermaid chỉ vẽ ra flowchart).
- **Bản v2 (sau khi sửa): 43/43 đạt.**

**Chưa kiểm tra được:**
- Chưa render sơ đồ PlantUML. Mới soát cú pháp bằng mắt.
- Chưa chạy PoC với Gemini thật.
- Giới hạn "1 trang" mới đo gần đúng bằng số chữ (≤ 600).

## 6. Việc cần người khác làm

- **Cả nhóm:** chốt CQ1–CQ3 trước CP1 (25/10). Xác nhận `docs/reference/report.md` là bản use case 13/10, và đồng ý đổi actor so với `Note.md`.
- **Hải:** PoC cần kiểm tra kết quả bằng code (bài cấm theo vùng, số buổi) và bắt `ValidationError`. Khi có key thì chạy thật 2 hồ sơ mẫu. Chốt danh sách bài camera hỗ trợ.
- **Gia Huy:** trong `SLIDES_BLUEPRINT.md`, nhân vật "vạm vỡ" trái với quyết định 22/10. Phần "Bù Calo" của Rules Engine chờ CQ3.
- **Đức Huy:** render sơ đồ, gửi function list cho Thông, Gia Huy, THA, cập nhật sheet trước 22:00.
