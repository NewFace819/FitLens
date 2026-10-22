# Kịch Bản Báo Cáo Blueprint Kiến Trúc FitLens (THA — 20 Phút)

> **File trình chiếu:** [`docs/FitLens_Blueprint_THA.pptx`](FitLens_Blueprint_THA.pptx) (Đúng chuẩn 3 slide cô đọng)  
> **Người trình bày:** Gia Huy (Phụ trách Blueprint kiến trúc + Repo)  
> **Thời lượng:** ~15–18 phút trình bày + 2–5 phút Q&A

---

## SLIDE 1: TỔNG QUAN KIẾN TRÚC HỆ THỐNG (SYSTEM BLUEPRINT)
*(Thời lượng khuyến nghị: 6–7 phút)*

### Nội dung trên Slide:
* **Tiêu đề:** FITLENS — SYSTEM BLUEPRINT
* **Phụ đề:** Tổng quan kiến trúc: On-Device Vision, Offline-First Mobile & Cloud AI 0đ (Nhóm 01 · CSC10014)
* **4 Khối chức năng chính:**
  1. **Mobile Client (Flutter):** Offline-first với SQLite/Hive; UI tương tác động với nhân vật Growing Avatar tiến hóa theo volume/streak; Haptic & Beep cảnh báo sai form tức thì.
  2. **On-Device Vision (MediaPipe):** Xử lý khung hình 100% trên RAM điện thoại; trích xuất 33 keypoints đếm reps & tính góc ROM; Cam kết *Zero Video Retention* (không upload ảnh/video).
  3. **Backend Core (FastAPI):** API Gateway kiểm soát HTTPS + JWT; Safety Router ngắt tập offline khi báo đau; Rules Engine tính volume; Pseudonymizer lọc sạch PII.
  4. **Free Cloud Services:** Google Gemini 3.8 Flash (Free Tier) sinh JSON kế hoạch; Supabase (PostgreSQL) 500MB có sẵn Auth & RLS; Push Notifications (FCM).

### Speaker Notes (Lời thoại thuyết minh):
> *"Chào anh/thầy THA, em là Gia Huy đại diện Nhóm 01 báo cáo System Blueprint của dự án FitLens. FitLens là ứng dụng di động đóng vai trò Huấn luyện viên cá nhân ảo (AI Virtual Personal Trainer & Habit Coach) hướng đến đối tượng sinh viên và người trẻ.*
>
> *Về mặt kiến trúc, hệ thống gồm 4 trụ cột chính:*
> 1. *Mobile Client: Nhóm chọn Flutter để tối ưu cross-platform (iOS và Android), áp dụng kiến trúc Offline-First với SQLite/Hive để người dùng mở máy lên là tập được ngay. Yếu tố sáng tạo là nhân vật Growing Avatar sẽ vạm vỡ/khỏe khoắn dần theo chuỗi ngày tập để tạo động lực.*
> 2. *On-Device Computer Vision: Điểm khác biệt quan trọng là nhóm dùng MediaPipe Pose chạy thẳng trên phần cứng điện thoại. Toàn bộ khung hình camera chỉ tồn tại vài mili-giây trên RAM để tính tọa độ 33 khớp xương rồi hủy ngay. Nhóm áp dụng nguyên tắc 'Zero Video Retention' — backend không hề có bất kỳ API nào nhận ảnh hay video, xóa tan nỗi sợ lộ hình ảnh cá nhân.*
> 3. *Backend Core: Viết bằng FastAPI gọn nhẹ, đóng vai trò là chốt chặn an toàn (Safety Router) và bộ não tính toán (Rules Engine) trước khi dữ liệu được chuyển tiếp.*
> 4. *Cloud Services 0đ: Nhóm tận dụng Supabase (PostgreSQL) và Google Gemini API tầng miễn phí để đảm bảo 100% chi phí vận hành bằng 0."*

---

## SLIDE 2: HAI LUỒNG DỮ LIỆU & CƠ CHẾ AN TOÀN / FALLBACK
*(Thời lượng khuyến nghị: 7–8 phút)*

### Nội dung trên Slide:
* **Tiêu đề:** HAI LUỒNG DỮ LIỆU & CƠ CHẾ AN TOÀN
* **Phụ đề:** Tập camera On-Demand, Hỏi Coach ẩn danh & Router xử lý chấn thương/lỗi API
* **Cột 1 — Luồng 1: Tập Với Camera (On-Demand):**
  - Không ép bật camera: Chỉ kích hoạt khi muốn kiểm tra form động tác mới/khó (`«extend»` trong Use Case UML).
  - MediaPipe trên RAM trích xuất 33 điểm khớp $\rightarrow$ Tính góc ROM $\rightarrow$ Phát Beep/Rung sửa tư thế.
  - Kết thúc buổi: Chỉ gửi số reps, phút tập và đánh giá RPE (Dễ/Vừa/Mệt). Tuyệt đối không gửi ảnh/video.
  - Nút *"Tôi bị đau"*: Dừng buổi tập ngay lập tức trên máy (offline) và khuyên đi khám bác sĩ.
* **Cột 2 — Luồng 2: Hỏi Coach & Router An Toàn / Fallback:**
  - *The LLM Boundary (Ẩn danh hóa):* Chuyển tuổi $\rightarrow$ `age_band`, cân nặng $\rightarrow$ `bmi_band`, bệnh lý $\rightarrow$ `avoid_tags`. Không gửi tên, email hay chẩn đoán thật sang Gemini.
  - *Safety Router:* Bắt từ khóa chấn thương $\rightarrow$ Trả về kịch bản an toàn chuẩn y khoa.
  - *Fallback khi Gemini 429/Offline:* Cache cục bộ kế hoạch tuần trong máy; tự động chuyển sang kho câu trả lời soạn sẵn (Curated Knowledge) khi mất mạng/quá tải.

### Speaker Notes (Lời thoại thuyết minh):
> *"Sang slide thứ hai, em xin phân tích sâu vào 2 luồng dữ liệu cốt lõi và cách hệ thống xử lý rủi ro:*
>
> *1. Luồng Tập Luyện với Camera:*
> *- Trên phương diện phân tích Use Case, tính năng 'Check Posture with Camera' là quan hệ mở rộng («extend») vào ca sử dụng 'Perform Workout'. Người dùng không bị bắt ép phải soi camera suốt cả buổi tập để tránh gây áp lực tâm lý và hao pin, họ chỉ bấm bật camera khi cần kiểm tra kỹ thuật một bài tập mới.*
> *- Ngay trên màn hình camera luôn có nút 'Tôi bị đau' nổi bật. Nút này được xử lý độc lập ngay ở Client, dù mất mạng vẫn ngắt camera tức thì và đưa ra cảnh báo chuẩn y tế.*
>
> *2. Luồng Hỏi Coach & Cơ Chế Dự Phòng (Fallback):*
> *- Nhóm tuân thủ nguyên tắc: Rules Engine quyết định sự thật, LLM chỉ đóng vai trò diễn ngôn. LLM không bao giờ được tự ý thêm bớt bài tập nguy hiểm.*
> *- Trước khi gửi prompt sang Gemini, module Pseudonymizer sẽ loại bỏ toàn bộ PII (tên, email, ID) và chỉ gửi các nhóm thông số tổng quát.*
> *- Vì dùng Free Tier của Gemini, để giải quyết triệt để lỗi nghẽn 429 Rate Limit, nhóm thiết kế cơ chế 3 tầng: Retry Exponential Backoff 5 lần $\rightarrow$ Nếu vẫn lỗi thì kích hoạt câu trả lời soạn sẵn (Curated Fallback) $\rightarrow$ Đảm bảo người dùng không bao giờ gặp lỗi gián đoạn."*

---

## SLIDE 3: LỰA CHỌN CÔNG NGHỆ & TÍNH KHẢ THI 0 ĐỒNG
*(Thời lượng khuyến nghị: 5–6 phút)*

### Nội dung trên Slide:
* **Tiêu đề:** LỰA CHỌN CÔNG NGHỆ & TÍNH KHẢ THI 0 ĐỒNG
* **Phụ đề:** Minh chứng kiến trúc khả thi, đáp ứng tiêu chí hoàn thiện và sáng tạo của đồ án
* **Bảng công nghệ:**
  | Thành phần | Công nghệ chọn | Lý do & Lợi ích | Chi phí |
  | :--- | :--- | :--- | :---: |
  | **Mobile Client** | Flutter (Dart) | 1 codebase iOS/Android, camera native mượt, offline SQLite/Hive | **0đ** |
  | **Pose Tracking** | MediaPipe Pose (Google) | Chạy 100% on-device trên RAM, 33 keypoints, zero video retention | **0đ** |
  | **Backend API** | FastAPI (Python) | Nhẹ, async, tích hợp trực tiếp SDK Gemini & Pydantic validation | **0đ** |
  | **Cơ sở dữ liệu** | Supabase (PostgreSQL) | Free tier: 500MB (~1.000 user-năm), 50k MAU, tích hợp sẵn Auth & RLS | **0đ** |
  | **AI Coach (LLM)**| Gemini 3.8 Flash | Tốc độ phản hồi cao, structured JSON output, đã verify qua PoC | **0đ** |

### Speaker Notes (Lời thoại thuyết minh):
> *"Slide cuối cùng minh chứng cho tính khả thi và tính bền vững của đồ án:*
>
> *- Tính khả thi về chi phí: Toàn bộ stack được lựa chọn đều có Free Tier dồi dào, không đòi hỏi thẻ tín dụng hay chi phí phát sinh, cam kết 100% chi phí 0đ.*
> *- Tính khả thi về lưu trữ: Một người dùng tập luyện suốt 1 năm chỉ phát sinh khoảng 0.5 MB dữ liệu văn bản (lịch sử hiệp tập, calo bữa ăn). Với gói miễn phí 500 MB của Supabase, hệ thống có thể lưu trữ đến 1.000 năm sử dụng (hoặc 1.000 người dùng trong 1 năm) mà không sợ vượt ngưỡng.*
> *- Tính hoàn thiện & Sáng tạo: Đồ án không chỉ là một con chatbot đơn thuần, mà là sự kết hợp chặt chẽ giữa Computer Vision trên thiết bị, giải thuật thích ứng cường độ mượt mà (Adaptive Pacing) và cơ chế guardrail bảo vệ an toàn sức khỏe.*
>
> *Em xin kết thúc phần trình bày Blueprint và rất mong nhận được câu hỏi cũng như đóng góp ý kiến từ anh/thầy THA."*
