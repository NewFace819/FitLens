# FitLens — System Architecture Blueprint

> **Phiên bản:** 1.1 (Cập nhật chuẩn hóa CP1)  
> **Tác giả:** Nhóm 01 (CSC10014 — Computational Thinking)  
> **Phụ trách:** Gia Huy (Blueprint Kiến trúc + Repo)

---

> [!NOTE]
> **Minh định về trạng thái triển khai:**
> - **Hiện tại (Interactive UI Prototype & PoC):** Đã hiện thực hóa toàn bộ luồng tương tác của người dùng dưới dạng Web Prototype tương tác (`prototype/`) và PoC kết nối Gemini API (`poc/plan_generator/`) để kiểm chứng tính khả thi của giao diện và gợi ý kế hoạch. Module `setup-plan-model.js` trong thư mục này là mã JavaScript mô phỏng logic lọc bài tập ở client, chưa phải service backend hoàn chỉnh.
> - **Kiến trúc mục tiêu (Target Architecture):** Mô hình MediaPipe Pose chạy on-device native trên Flutter, backend FastAPI, Supabase PostgreSQL, SQLite cache offline-first và bộ quy tắc đối soát tĩnh (curated safety rules) là bản thiết kế hệ thống hoàn thiện cho giai đoạn MVP.

---

## 1. Sơ đồ các khối chính (System Block Diagram)

Hệ thống FitLens được thiết kế theo nguyên tắc **Offline-First**, **On-Device Vision** và **Phân lớp an toàn (4 Trust Zones)**.

```mermaid
flowchart TB
    subgraph CLIENT ["📱 MOBILE CLIENT (Flutter / React Native)"]
        direction TB
        subgraph UI ["Giao Diện & Trải Nghiệm"]
            SCREENS["Screens: Auth · Tập Luyện · Chat Coach · Dinh Dưỡng"]
            AVATAR["Growing Avatar (Tiến hóa theo Volume/Streak)"]
            HAPTIC["Phản hồi Rung (Haptic) & Âm thanh (Beep)"]
        end
        subgraph LOCAL_CORE ["Xử Lý Cục Bộ Trên Thiết Bị (On-Device)"]
            CAM_RAM["Camera Feed (RAM Only - Không lưu trữ)"]
            POSE["MediaPipe Pose Tracker (33 Tọa Độ Khớp)"]
            REP_LOGIC["Rep Counter & Form Analyzer (Tính Góc Khớp)"]
            LOCAL_DB["Local Cache (SQLite / Hive - Offline First)"]
        end
        UI <--> LOCAL_CORE
    end

    subgraph GATEWAY ["🔒 API GATEWAY & SECURITY"]
        HTTPS_JWT["HTTPS / TLS 1.3 + JWT Authentication"]
    end

    subgraph BACKEND ["⚙️ FITLENS BACKEND (FastAPI)"]
        direction TB
        VALIDATE["Validate & Sanitize (Lọc rác & PII)"]
        SAFETY_ROUTER{"Safety Router (Luật An Toàn / Báo Đau)"}
        RULES_ENGINE["Rules Engine (Lên Lịch, Tính Reps, Thích Ứng, Streak)"]
        PSEUDO["Pseudonymizer (Ẩn danh hóa dữ liệu trước khi gửi LLM)"]
        FALLBACK_HANDLER["Fallback Handler (Xử lý khi Gemini 429/Offline)"]
    end

    subgraph STORAGE_SERVICES ["🗄️ STORAGE & THIRD-PARTY SERVICES"]
        direction TB
        DB_AUTH["Auth DB (Users, Password Hash Argon2id)"]
        subgraph SUPABASE_DB ["Supabase PostgreSQL (RLS Protected)"]
            DB_L2["L2 Personal Schema (Workout Logs, Meal Logs, Streaks)"]
            DB_L3["L3 Sensitive Health Schema (Bệnh lý, avoid_tags đã xác nhận)"]
        end
        GEMINI["Google Gemini API (gemini-3.8-flash Free Tier)"]
        PUSH_SVC["Push Notification Service (FCM)"]
    end

    %% Kết nối Client & Gateway
    LOCAL_CORE -->|"Gửi số liệu (Reps, Điểm Form), KHÔNG gửi Video"| GATEWAY
    LOCAL_DB <-->|"Sync lịch sử & Cache kế hoạch tuần (Khi có mạng)"| GATEWAY
    UI -->|"Auth, Chat text, Meal log, Pain reports"| GATEWAY
    
    %% Xử lý Backend
    GATEWAY --> VALIDATE
    VALIDATE -.-> DB_AUTH
    VALIDATE --> SAFETY_ROUTER
    
    SAFETY_ROUTER -->|"Bình thường"| RULES_ENGINE
    SAFETY_ROUTER -->|"Báo đau / Chấn thương cấp"| GATEWAY
    
    RULES_ENGINE -.->|"Ghi log tập, Streak"| DB_L2
    RULES_ENGINE -.->|"Lưu thẻ hạn chế sau khi xác nhận"| DB_L3
    RULES_ENGINE --> PSEUDO
    
    PSEUDO -->|"Prompt ẩn danh (Bands & Tags)"| GEMINI
    GEMINI -->|"JSON Plan hợp lệ"| RULES_ENGINE
    RULES_ENGINE -->|"Kế hoạch hoàn chỉnh"| GATEWAY
    
    GEMINI -.->|"Lỗi API / 429 / Timeout"| FALLBACK_HANDLER
    FALLBACK_HANDLER -.->|"Kế hoạch dự phòng soạn sẵn"| GATEWAY
    
    RULES_ENGINE --> PUSH_SVC
    PUSH_SVC -->|"Generic Notification"| UI
```

---

## 2. Hai luồng dữ liệu chính (Two Core Data Flows)

### Luồng 1: Tập với Camera & Chốt Chặn Báo Đau (On-Demand Tracking & Safety Stop)
Tính năng camera là **On-Demand** (chỉ bật khi người dùng cần kiểm tra kỹ thuật động tác mới/khó), không ép bật liên tục. Nút *"Tôi bị đau"* luôn hiển thị nổi bật để dừng tập offline tức thì.

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant App as Mobile UI & Avatar
    participant Vision as MediaPipe (On-Device RAM)
    participant RepEngine as Rep Counter & Form Evaluator
    participant Backend as FitLens Backend
    participant DB as Database (L2 Personal)

    User->>App: Chọn bài tập & Bấm "Kiểm tra kỹ thuật với Camera"
    App->>Vision: Khởi tạo Camera stream trên RAM
    loop Mỗi khung hình (Frame-by-frame)
        Vision->>Vision: Trích xuất 33 keypoints (x, y, z) & HỦY frame ngay
        Vision->>RepEngine: Tọa độ khớp xương
        RepEngine->>RepEngine: Tính góc ROM (Range of Motion)
        alt Sai tư thế (Cong lưng / Lệch gối)
            RepEngine-->>App: Cảnh báo Rung + Beep ("Giữ thẳng lưng!")
        else Đạt chuẩn 1 rep
            RepEngine-->>App: Tăng đếm Rep +1
        end
    end
    opt Báo đau khẩn cấp khi đang tập
        User->>App: Bấm "Tôi bị đau"
        App-->>User: Ngắt camera, dừng bài tập offline tức thì & khuyên sơ cứu
    end
    User->>App: Hoàn thành buổi tập (Tắt Camera)
    App->>User: Thu thập đánh giá nỗ lực RPE (Thanh trượt 1-10 Borg CR10 sau buổi)
    App->>Backend: Gửi số liệu tổng hợp (Reps, Thời gian, Lỗi form, RPE 1-10)
    Note over App,Backend: ZERO VIDEO RETENTION: Không có ảnh/video nào rời khỏi máy!
    Backend->>DB: Lưu lịch sử buổi tập
    Backend-->>App: Cập nhật Streak & Tăng kinh nghiệm cho Growing Avatar
```

---

### Luồng 2: Hỏi Coach & Sinh Kế Hoạch Tập Luyện (Ask Coach & Plan Generation)
Luồng này thực hiện việc trò chuyện với PT ảo hoặc sinh lịch tập cá nhân hóa. Dinh dưỡng là module gợi ý bữa ăn độc lập theo mục tiêu và dị ứng, hoàn toàn không có cơ chế bù calo.

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant App as Mobile App
    participant Gateway as API Gateway
    participant Safety as Safety Router
    participant Rules as Rules Engine
    participant Pseudo as Pseudonymizer
    participant Gemini as Gemini API (3.8 Flash)
    participant Fallback as Curated Fallback Templates

    User->>App: Gửi câu hỏi hoặc Yêu cầu sinh lịch tập mới
    App->>Gateway: POST /api/coach/chat hoặc /api/plan/generate (kèm JWT)
    Gateway->>Safety: Kiểm tra từ khóa sức khỏe / báo đau
    alt Người dùng báo đau / chấn thương qua chat
        Safety-->>App: KÍCH HOẠT LUẬT AN TOÀN: Dừng tập, khuyên gặp bác sĩ ngay
    else Bình thường
        Safety->>Rules: Truy xuất thông số người dùng & Danh mục bài tập an toàn
        Rules->>Pseudo: Gói dữ liệu ẩn danh (Tuổi -> age_band, Cân nặng -> bmi_band)
        Note over Pseudo: Bỏ hoàn toàn: Tên, Email, SĐT, User ID thật
        Pseudo->>Gemini: Gửi Prompt có System Instruction & Structured Output Schema
        alt Gemini phản hồi thành công (200 OK)
            Gemini-->>Rules: JSON WorkoutPlan / Lời khuyên
            Rules->>Rules: Validate: Đảm bảo không bịa bài tập nguy hiểm
            Rules-->>App: Trả về kết quả hiển thị cho người dùng
        else Gemini bị Rate Limit (429) hoặc Lỗi Mạng (503)
            Rules->>Fallback: Lấy câu tư vấn soạn sẵn / Lịch tập mẫu offline
            Fallback-->>Rules: Dữ liệu fallback an toàn
            Rules-->>App: Trả về kế hoạch dự phòng (Không gián đoạn)
        end
    end
```

---

## 3. Cơ chế Router & Fallback (An Toàn & Khả Dụng)

### 3.1. Safety Router (Bảo vệ tính mạng & an toàn chấn thương)
FitLens là ứng dụng thể hình cho giới trẻ, **tuyệt đối không đưa ra chẩn đoán y tế sai lệch**:
1. **Phát hiện đau tức thì (Offline Pain Stop):**
   - Nút *"Tôi bị đau"* luôn hiển thị nổi bật trên màn hình tập luyện.
   - Khi bấm, app ngắt camera và dừng bài tập **ngay lập tức ở tầng Client** mà không cần kết nối internet.
   - Hiển thị khuyến nghị an toàn chuẩn mực: *"Dừng buổi tập ngay, chườm lạnh/nghỉ ngơi và đi khám chuyên khoa nếu cơn đau kéo dài"*.
2. **Quy trình ghi nhận phản hồi & Quản lý vùng cần tránh:**
   - Khi người dùng báo đau trong buổi tập hoặc chạm chọn vùng khó chịu trên bản đồ cơ thể sau buổi tập, hệ thống ghi nhận khó chịu tạm thời vào nhật ký buổi tập đó.
   - Người dùng có màn hình **chủ động xem xét và xác nhận/sửa các vùng cơ thể cần hạn chế vận động (`avoid_tags`)** cho các tuần sau (ví dụ: `avoid_tags: ["spinal_load", "high_impact"]`).
   - Hệ thống **không tự động biến một lần báo đau tức thời thành bệnh lý vĩnh viễn**. Rules Engine chỉ lọc bỏ bài tập khi người dùng xác nhận tình trạng cần tránh.

### 3.2. Cơ chế Thích Ứng (Adaptive Pacing) & Thống Nhất Thang RPE
Để giải quyết bài toán chống nản ngày đầu và tăng tiến bền vững (Progressive Overload):
1. **Thống nhất Thang Đo Cảm Nhận RPE (1–10 Borg CR10 sau buổi tập):**
   - RPE được thu thập **duy nhất một lần sau khi hoàn thành buổi tập**, không ngắt quãng người dùng sau từng hiệp.
   - Tách biệt rõ ràng: **RPE đo mức độ gắng sức thể lực (Exertion)**, hoàn toàn khác với **tín hiệu chấn thương (Pain Stop)**.
     - *1–3 (Light):* Vận động nhẹ nhàng, chưa mệt $\rightarrow$ Tăng +2 reps hoặc +5s giữ plank, giảm 10s nghỉ giữa hiệp.
     - *4–6 (Moderate):* Nỗ lực vừa sức, kiểm soát tốt $\rightarrow$ Giữ nguyên khối lượng để củng cố kỹ thuật.
     - *7–10 (Hard / All-out):* Nỗ lực rất cao, kiệt sức $\rightarrow$ Giảm 20–30% volume buổi sau để chống quá tải (Overtraining). **Mức 7–10 không tự động coi là chấn thương**.

2. **Dinh Dưỡng Độc Lập (Không Có Cơ Chế "Bù Calo"):**
   - Module dinh dưỡng đưa ra gợi ý bữa ăn sinh viên lành mạnh dựa trên mục tiêu thể trạng và dị ứng thực phẩm, độc lập với kế hoạch tập luyện.
   - Bỏ hoàn toàn cơ chế "ăn thêm thì phạt tập thêm hiệp" để xây dựng mối quan hệ lành mạnh với ăn uống và vận động.

3. **Quyền Riêng Tư & Xóa Dữ Liệu Cá Nhân (Right to be Forgotten):**
   - Tuân thủ Luật Bảo vệ Dữ liệu Cá nhân Việt Nam (NĐ 13/2023/NĐ-CP): Không thu thập GPS, danh bạ; camera chỉ chạy trên RAM (`Zero Video Retention`).
   - Cung cấp tính năng xóa tài khoản (`Delete Personal Data`) với cơ chế `ON DELETE CASCADE` xóa sạch profile và log lịch sử tập luyện khỏi server.

### 3.3. Fallback khi lỗi API (Resilience & Zero-Downtime)
Vì sử dụng tầng miễn phí **Google Gemini API Free Tier**, hiện tượng nghẽn (HTTP 429) hoặc gián đoạn dịch vụ có thể xảy ra:
- **Tầng 1 (Client Cache):** Lịch tập của tuần hiện tại luôn được cache cục bộ trong SQLite/Hive. Mất mạng người dùng vẫn mở app tập bình thường.
- **Tầng 2 (Exponential Backoff):** Adapter gọi Gemini được cấu hình retry tối đa 5 lần với thời gian chờ tăng dần (`initial_delay = 2s`).
- **Tầng 3 (Curated Knowledge Fallback):** Nếu retry thất bại hoặc Gemini quá tải, hệ thống tự động trả về câu trả lời từ bộ quy tắc đối soát tĩnh và mẫu bài tập soạn sẵn (`docs/reference/Note.md`) thay vì báo lỗi crash màn hình.

---

## 4. Công nghệ được chọn & Lý do (Tech Stack Justification)

| Thành phần | Công nghệ chọn | Lý do quyết định | Phương án dự phòng |
| :--- | :--- | :--- | :--- |
| **Mobile App** | **Flutter** (hoặc React Native) | • Viết 1 lần chạy cả iOS và Android.<br>• Hỗ trợ truy cập camera native mượt mà.<br>• Dễ dàng render UI động và nhân vật Growing Avatar. | React Native |
| **Pose Estimation** | **Google MediaPipe Pose** | • Chạy On-Device 100% trên RAM của điện thoại (Zero Video Retention).<br>• Trích xuất chuẩn xác 33 keypoints 3D mà không tốn chi phí server GPU. | ML Kit Pose Detection |
| **Backend API** | **FastAPI (Python)** | • Tốc độ cao, asynchronous native.<br>• Tích hợp mượt mà với SDK Gemini (`google-genai`) và Pydantic validation.<br>• Viết ít code, nhẹ nhàng, triển khai nhanh. | Express.js (Node.js) |
| **Cơ sở dữ liệu** | **Supabase (PostgreSQL)** | • Free tier rộng rãi: 500 MB (chứa ~1.000 user-năm), 50.000 MAU.<br>• Tích hợp sẵn Auth (hash mật khẩu an toàn) và Row-Level Security (RLS). | Turso (LibSQL/SQLite) |
| **Trí tuệ nhân tạo (LLM)** | **Google Gemini 3.8 Flash** | • Miễn phí 100% qua Google AI Studio.<br>• Hỗ trợ Structured JSON Output với độ trễ thấp.<br>• Phù hợp với tiêu chí đồ án 0đ. | Groq / OpenRouter Free |
| **Bộ nhớ cục bộ** | **SQLite / Hive** | • Hỗ trợ Offline-first, mở app lên là tập được ngay cả khi mất mạng. | Shared Preferences |

---

## 5. Kế hoạch hoàn thiện tiếp theo
- [x] Sơ đồ khối tổng quan & Sơ đồ luồng dữ liệu Mermaid.
- [x] Quy định Router an toàn khi đau & Fallback khi API lỗi.
- [x] Bảng công nghệ và cam kết bảo mật Zero Video Retention.
- [x] Chuyển hóa 3 nội dung trọng tâm thành slide báo cáo THA 20 phút.
