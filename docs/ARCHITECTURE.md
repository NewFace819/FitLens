# FitLens — System Architecture Blueprint

> **Phiên bản:** 1.0 (Bản nháp CP1)  
> **Tác giả:** Nhóm 01 (CSC10014 — Computational Thinking)  
> **Phụ trách:** Gia Huy (Blueprint Kiến trúc + Repo)

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
        RULES_ENGINE["Rules Engine (Lên Lịch, Tính Reps, Bù Calo, Streak)"]
        PSEUDO["Pseudonymizer (Ẩn danh hóa dữ liệu trước khi gửi LLM)"]
        FALLBACK_HANDLER["Fallback Handler (Xử lý khi Gemini 429/Offline)"]
    end

    subgraph STORAGE_SERVICES ["🗄️ STORAGE & THIRD-PARTY SERVICES"]
        direction TB
        DB_AUTH["Auth DB (Users, Password Hash Argon2id)"]
        subgraph SUPABASE_DB ["Supabase PostgreSQL (RLS Protected)"]
            DB_L2["L2 Personal Schema (Workout Logs, Meal Logs, Streaks)"]
            DB_L3["L3 Sensitive Health Schema (Bệnh lý, Chấn thương, avoid_tags)"]
        end
        GEMINI["Google Gemini API (gemini-3.8-flash Free Tier)"]
        PUSH_SVC["Push Notification Service (FCM)"]
    end

    %% Kết nối Client & Gateway
    LOCAL_CORE -->|"Gửi số liệu (Reps, Điểm Form), KHÔNG gửi Video"| GATEWAY
    LOCAL_DB <-->|"Sync lịch sử & Cache kế hoạch tuần (Khi có mạng)"| GATEWAY
    UI -->|"Auth, Chat text, Meal text, Pain reports"| GATEWAY
    
    %% Xử lý Backend
    GATEWAY --> VALIDATE
    VALIDATE -.-> DB_AUTH
    VALIDATE --> SAFETY_ROUTER
    
    SAFETY_ROUTER -->|"Bình thường"| RULES_ENGINE
    SAFETY_ROUTER -->|"Phát hiện đau / Nguy hiểm"| RULES_ENGINE
    
    RULES_ENGINE -.->|"Ghi log tập, Streak"| DB_L2
    RULES_ENGINE -.->|"Cập nhật bảng sức khỏe / avoid_tags"| DB_L3
    RULES_ENGINE --> PSEUDO
    
    PSEUDO -->|"Prompt ẩn danh (Bands & Tags)"| GEMINI
    GEMINI -.->|"Lỗi API / 429"| FALLBACK_HANDLER
    FALLBACK_HANDLER -.->|"Câu trả lời soạn sẵn"| GATEWAY
    PSEUDO -.->|"JSON Plan hợp lệ"| GATEWAY
    
    RULES_ENGINE --> PUSH_SVC
    PUSH_SVC -->|"Generic Notification"| UI
```

---

## 2. Hai luồng dữ liệu chính (Two Core Data Flows)

### Luồng 1: Tập với Camera (On-Demand Posture Tracking & Rep Counting)
Tính năng camera là **On-Demand** (chỉ bật khi người dùng cần kiểm tra kỹ thuật động tác mới/khó, quan hệ `«extend»` trong Use Case), không ép bật liên tục.

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
    User->>App: Hoàn thành hiệp tập (Tắt Camera)
    App->>User: Hỏi đánh giá cảm nhận RPE (1-Quá dễ / 2-Vừa sức / 3-Quá mệt)
    App->>Backend: Gửi số liệu tổng hợp (Reps, Thời gian, Lỗi form, RPE)
    Note over App,Backend: ZERO VIDEO RETENTION: Không có ảnh/video nào rời khỏi máy!
    Backend->>DB: Lưu lịch sử buổi tập
    Backend-->>App: Cập nhật Streak & Tăng cơ/kinh nghiệm cho Growing Avatar
```

---

### Luồng 2: Hỏi Coach & Sinh Kế Hoạch Tập Luyện (Ask Coach & Plan Generation)
Luồng này thực hiện việc trò chuyện với PT ảo hoặc sinh lịch tập cá nhân hóa.

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
    alt Người dùng báo đau / chấn thương
        Safety-->>App: KÍCH HOẠT LUẬT AN TOÀN: Dừng tập, khuyên gặp bác sĩ ngay
    else Bình thường
        Safety->>Rules: Truy xuất thông số người dùng & Danh mục bài tập
        Rules->>Pseudo: Gói dữ liệu ẩn danh (Tuổi -> age_band, Cân nặng -> bmi_band)
        Note over Pseudo: Bỏ hoàn toàn: Tên, Email, SĐT, User ID thật
        Pseudo->>Gemini: Gửi Prompt có System Instruction & Structured Output Schema
        alt Gemini phản hồi thành công
            Gemini-->>Rules: JSON WorkoutPlan / Lời khuyên
            Rules->>Rules: Validate: Đảm bảo không bịa bài tập nguy hiểm
            Rules-->>App: Trả về kết quả hiển thị cho người dùng
        else Gemini bị Rate Limit (429) hoặc Lỗi Mạng (503)
            Fallback-->>App: Trả về câu tư vấn soạn sẵn / Lịch tập mẫu offline
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
2. **Gắn nhãn hạn chế (Condition Tagging):**
   - Khi phát hiện người dùng có vấn đề cột sống/khớp gối, hệ thống tự động gán nhãn `avoid_tags: ["spinal_load", "high_impact"]`.
   - Rules Engine sẽ tự động loại bỏ các bài như Barbell Squat, Deadlift, Jumping Jacks khỏi danh mục trước khi đề xuất cho người dùng.

### 3.2. Cơ chế Thích Ứng (Adaptive Pacing) & Đồng bộ thang RPE
Để giải quyết bài toán chống nản ngày đầu và tăng tiến bền vững (Progressive Overload):
1. **Đồng bộ Thang Đo Cảm Nhận RPE (UI 1–10 $\rightarrow$ Backend 3 Tầng):**
   - **Trên Giao diện Client (UI):** Sử dụng thanh trượt 1–10 theo chuẩn Borg CR10 để người dùng dễ kéo thả cảm nhận:
     - *1–3 (Light):* Vận động nhẹ nhàng, chưa mệt.
     - *4–6 (Moderate):* Nỗ lực vừa sức, kiểm soát tốt.
     - *7–10 (Hard / All-out):* Quá sức, kiệt sức, nhức mỏi.
   - **Xử lý tại Backend (Rules Engine):** Ánh xạ tự động 3 dải giá trị này để điều chỉnh giáo án tuần tiếp theo:
     - Dải 1–3 $\rightarrow$ Tăng +2 reps hoặc +5s giữ plank, giảm 10s nghỉ giữa hiệp.
     - Dải 4–6 $\rightarrow$ Giữ nguyên khối lượng để củng cố kỹ thuật thêm 1–2 buổi.
     - Dải 7–10 $\rightarrow$ Giảm 20–30% volume, tự động chuyển biến thể nhẹ hơn (vd: Barbell Squat $\rightarrow$ Goblet Squat / Chair Squat).

2. **Vòng Lặp Phản Hồi Chấn Thương (Injury Feedback Loop):**
   - Khi người dùng bấm *"Tôi bị đau"* hoặc chạm chọn vùng đau trên bản đồ cơ thể (*Body Map* ở màn hình Review), hệ thống tự động lưu vào bảng `health_conditions` (L3 Sensitive Health).
   - Bộ lọc `setup-plan-model` tự động thêm thẻ cấm (ví dụ: `avoid_tags: ["knees", "spinal_load"]`), lập tức **loại bỏ các bài tập gây áp lực lên vùng đó** khỏi lịch tập thích ứng tuần tiếp theo.

3. **Quyền Riêng Tư & Xóa Dữ Liệu Cá Nhân (Right to be Forgotten):**
   - Tuân thủ Luật Bảo vệ Dữ liệu Cá nhân Việt Nam (NĐ 13/2023/NĐ-CP): Không thu thập GPS, danh bạ; camera chỉ chạy trên RAM (`Zero Video Retention`).
   - Cung cấp tính năng xóa tài khoản (`Delete Personal Data`) với cơ chế `ON DELETE CASCADE` xóa sạch profile và log lịch sử tập luyện khỏi server.

### 3.3. Fallback khi lỗi API (Resilience & Zero-Downtime)
Vì sử dụng tầng miễn phí **Google Gemini API Free Tier**, hiện tượng nghẽn (HTTP 429) hoặc gián đoạn dịch vụ có thể xảy ra:
- **Tầng 1 (Client Cache):** Lịch tập của tuần hiện tại luôn được cache cục bộ trong SQLite/Hive. Mất mạng người dùng vẫn mở app tập bình thường.
- **Tầng 2 (Exponential Backoff):** Adapter gọi Gemini được cấu hình retry tối đa 5 lần với thời gian chờ tăng dần (`initial_delay = 2s`).
- **Tầng 3 (Curated Knowledge Fallback):** Nếu retry thất bại hoặc Gemini quá tải, hệ thống tự động trả về câu trả lời từ kho tri thức y khoa đối soát sẵn (`docs/reference/Note.md` / `medical_knowledge`) thay vì báo lỗi crash màn hình.


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
