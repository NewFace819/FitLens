# FitLens — Sơ Đồ Ca Sử Dụng (Use Case Diagram) Chuẩn UML 2.5

> **Đồ án:** FitLens (AI Virtual Personal Trainer & Habit Coach)  
> **Môn học:** CS252 / CSC10014 — Computational Thinking (fit@hcmus)  
> **Nhóm thực hiện:** Group_01  
> **Tài liệu gửi THA:** Báo cáo phân tích thiết kế Use Case Diagram  
> **Phạm vi tài liệu:** Tập trung vào các ca sử dụng nghiệp vụ cốt lõi (**F1–F7**: Onboarding/Hồ sơ, Lập lịch tập thích ứng, Tập luyện & Báo đau, Đánh giá RPE sau buổi, Gợi ý & Ghi nhận bữa ăn, Nhắc nhở lịch tập, Thống kê chuỗi & Mascot). Các luồng mở rộng như Đi bộ (Steps) hay Recap tháng thuộc giai đoạn hoàn thiện giao diện mở rộng.

---

> [!NOTE]
> **Lưu ý về trạng thái triển khai:**
> - **Hiện tại (Interactive UI Prototype):** Các màn hình giao diện, luồng tương tác của người dùng (kể cả mascot, review RPE 1–10, chọn vùng đau, camera mockup) đã được hiện thực hóa trong thư mục `prototype/` và PoC gọi Gemini API trong `poc/plan_generator/`.
> - **Kiến trúc dự kiến (Target Architecture):** Tầng AI backend (FastAPI), nhận diện khớp on-device (MediaPipe Pose), bộ nhớ SQLite offline-first và Supabase DB là thiết kế kỹ thuật cho giai đoạn tiếp theo (MVP). Bộ quy tắc an toàn y tế là tập luật đối soát tĩnh (curated rules), không phải hệ thống CSDL Medical RAG phức tạp.

---

## 1. Các Sơ Đồ Use Case Theo 3 Phân Hệ (Mermaid UML)

### 1.1. Phân Hệ 1: Lập Kế Hoạch Thích Ứng, Dinh Dưỡng & Tư Vấn An Toàn (Planning & Safety)
*Lập kế hoạch thích ứng theo thể trạng/mục tiêu; dinh dưỡng độc lập theo nhu cầu và dị ứng thực phẩm (hoàn toàn không có cơ chế bù calo).*

```mermaid
flowchart LR
    subgraph Subsys1 ["«subsystem» Lập Kế Hoạch, Dinh Dưỡng & Tư Vấn An Toàn"]
        direction TB
        UC_Plan(["Plan Adaptive Workout"])
        UC_Custom(["Customize by Health & Goal"])
        UC_Prog(["Progressively Scale Difficulty"])
        
        UC_Diet(["Suggest Meals & Log Nutrition"])
        
        UC_Consult(["Consult Fitness Safety"])
        UC_SafetyRules(["Query Curated Safety Rules"])
        UC_Doc(["Trigger Doctor Referral"])
    end

    User["👤 User / Student\n(Primary Actor)"]
    ExternalAI["☁️ External AI / Safety Rules\n(Gemini API & Rule Templates / Secondary Actor)"]

    User --- UC_Plan
    User --- UC_Diet
    User --- UC_Consult

    UC_Plan -.->|«include»| UC_Custom
    UC_Plan -.->|«include»| UC_Prog

    UC_Consult -.->|«include»| UC_SafetyRules
    UC_Doc -.->|«extend»| UC_Consult
    UC_SafetyRules --- ExternalAI
```

---

### 1.2. Phân Hệ 2: Luyện Tập, Kiểm Tra Kỹ Thuật & Chốt Chặn Báo Đau (Workout Execution & Safety Guard)
*Buổi tập có nút khẩn cấp **"Tôi bị đau" (Stop on Pain)** ngắt tập tức thì; camera chỉ bật khi cần (On-Demand); đánh giá RPE (1–10) sau buổi tập hoàn toàn độc lập với chấn thương.*

```mermaid
flowchart LR
    subgraph Subsys2 ["«subsystem» Luyện Tập & Chốt Chặn An Toàn"]
        direction TB
        UC_Workout(["Perform Workout"])
        UC_Save(["Save Workout Session"])
        UC_PainStop(["Report Pain (Stop on Pain)"])
        
        UC_CheckForm(["Check Posture with Camera (On-Demand)"])
        UC_Track(["Track 33-Joint Posture"])
        UC_Alert(["Emit Form Warning"])
        
        UC_RPE(["Provide Post-Workout RPE (1-10)"])
        UC_PostHeatmap(["View Workout Heatmap"])
    end

    User["👤 User / Student\n(Primary Actor)"]
    PoseTracker["📷 Device Camera / Vision Sensor\n(OS Subsystem / Secondary Actor)"]
    AudioSys["🔊 Device Audio & Haptics\n(OS Subsystem / Secondary Actor)"]

    User --- UC_Workout

    UC_Workout -.->|«include»| UC_Save
    UC_PainStop -.->|«extend»| UC_Workout
    UC_CheckForm -.->|«extend»| UC_Workout
    UC_RPE -.->|«extend»| UC_Workout
    UC_PostHeatmap -.->|«extend»| UC_Workout

    UC_CheckForm -.->|«include»| UC_Track
    UC_Alert -.->|«extend»| UC_CheckForm

    UC_Track --- PoseTracker
    UC_Alert --- AudioSys
```

---

### 1.3. Phân Hệ 3: Hồ Sơ, Thói Quen, Nhắc Lịch & Quyền Riêng Tư (Profile, Habit, Reminders & Privacy)
*Quản lý hồ sơ thể trạng; chủ động xem và sửa vùng cần tránh sau khi báo đau; theo dõi chuỗi tập và tiến hóa Mascot; tuân thủ Nghị định 13/2023/NĐ-CP.*

```mermaid
flowchart LR
    subgraph Subsys3 ["«subsystem» Hồ Sơ, Thói Quen & Quyền Riêng Tư"]
        direction TB
        UC_Profile(["Manage Profile & Health Baseline"])
        UC_ReviewAvoid(["Review & Edit Avoided Areas"])
        
        UC_Remind(["Set Workout Reminders"])
        
        UC_Dash(["View Progress Dashboard"])
        UC_MascotStreak(["Track Mascot Growth & Streak"])
        UC_CumHeatmap(["View Cumulative Heatmap"])
        
        UC_Privacy(["Manage Personal Privacy"])
        UC_Delete(["Delete Personal Data"])
    end

    User["👤 User / Student\n(Primary Actor)"]

    User --- UC_Profile
    User --- UC_Remind
    User --- UC_Dash
    User --- UC_Privacy

    UC_ReviewAvoid -.->|«extend»| UC_Profile
    UC_Dash -.->|«include»| UC_MascotStreak
    UC_CumHeatmap -.->|«extend»| UC_Dash
    UC_Delete -.->|«extend»| UC_Privacy
```

---

## 2. Mã Nguồn PlantUML (Chuẩn UML 2.5 Theo 3 Phân Hệ)

### 2.1. PlantUML — Phân Hệ 1: Lập Kế Hoạch, Dinh Dưỡng & Tư Vấn An Toàn
```plantuml
@startuml FitLens_Group1_Planning_Nutrition_Safety
title FitLens — Phân Hệ 1: Lập Kế Hoạch Thích Ứng, Dinh Dưỡng & Tư Vấn An Toàn
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome
skinparam roundcorner 10
skinparam defaultFontName "Segoe UI", Arial, sans-serif

actor "User / Student" as User #0284C7
actor "External AI / Safety Rules\n(Gemini & Templates)" as ExternalAI #8B5CF6

rectangle "FitLens — Planning, Nutrition & Safety Subsystem" {
  usecase "Plan Adaptive Workout" as UC_Plan
  usecase "Customize by Health & Goal" as UC_Custom
  usecase "Progressively Scale Difficulty" as UC_Prog
  usecase "Suggest Meals & Log Nutrition" as UC_Diet
  usecase "Consult Fitness Safety" as UC_Consult
  usecase "Query Curated Safety Rules" as UC_SafetyRules
  usecase "Trigger Doctor Referral" as UC_Doc
}

User --> UC_Plan
User --> UC_Diet
User --> UC_Consult

UC_Plan ..> UC_Custom : <<include>>
UC_Plan ..> UC_Prog : <<include>>

UC_Consult ..> UC_SafetyRules : <<include>>
UC_Doc ..> UC_Consult : <<extend>>
UC_SafetyRules --> ExternalAI
@enduml
```

### 2.2. PlantUML — Phân Hệ 2: Luyện Tập & Chốt Chặn An Toàn
```plantuml
@startuml FitLens_Group2_Workout_SafetyGuard
title FitLens — Phân Hệ 2: Luyện Tập, Kiểm Tra Kỹ Thuật & Chốt Chặn An Toàn
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome
skinparam roundcorner 10
skinparam defaultFontName "Segoe UI", Arial, sans-serif

actor "User / Student" as User #0284C7
actor "Camera / Vision Sensor\n(OS Subsystem)" as PoseTracker #10B981
actor "Audio & Haptics\n(OS Subsystem)" as AudioSys #F59E0B

rectangle "FitLens — Workout Execution Subsystem" {
  usecase "Perform Workout" as UC_Workout
  usecase "Save Workout Session" as UC_Save
  usecase "Report Pain (Stop on Pain)" as UC_PainStop
  usecase "Check Posture with Camera\n(On-Demand)" as UC_CheckForm
  usecase "Track 33-Joint Posture" as UC_Track
  usecase "Emit Form Warning" as UC_Alert
  usecase "Provide Post-Workout RPE (1-10)" as UC_RPE
  usecase "View Workout Heatmap" as UC_PostHeatmap
}

User --> UC_Workout

UC_Workout ..> UC_Save : <<include>>
UC_PainStop ..> UC_Workout : <<extend>>
UC_CheckForm ..> UC_Workout : <<extend>>
UC_RPE ..> UC_Workout : <<extend>>
UC_PostHeatmap ..> UC_Workout : <<extend>>

UC_CheckForm ..> UC_Track : <<include>>
UC_Alert ..> UC_CheckForm : <<extend>>

UC_Track --> PoseTracker
UC_Alert --> AudioSys
@enduml
```

### 2.3. PlantUML — Phân Hệ 3: Hồ Sơ, Thói Quen, Nhắc Lịch & Quyền Riêng Tư
```plantuml
@startuml FitLens_Group3_Profile_Habit_Privacy
title FitLens — Phân Hệ 3: Hồ Sơ, Thói Quen, Nhắc Lịch & Quyền Riêng Tư
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome
skinparam roundcorner 10
skinparam defaultFontName "Segoe UI", Arial, sans-serif

actor "User / Student" as User #0284C7

rectangle "FitLens — Profile, Habit & Privacy Subsystem" {
  usecase "Manage Profile & Health Baseline" as UC_Profile
  usecase "Review & Edit Avoided Areas" as UC_ReviewAvoid
  usecase "Set Workout Reminders" as UC_Remind
  usecase "View Progress Dashboard" as UC_Dash
  usecase "Track Mascot Growth & Streak" as UC_MascotStreak
  usecase "View Cumulative Heatmap" as UC_CumHeatmap
  usecase "Manage Personal Privacy" as UC_Privacy
  usecase "Delete Personal Data" as UC_Delete
}

User --> UC_Profile
User --> UC_Remind
User --> UC_Dash
User --> UC_Privacy

UC_ReviewAvoid ..> UC_Profile : <<extend>>
UC_Dash ..> UC_MascotStreak : <<include>>
UC_CumHeatmap ..> UC_Dash : <<extend>>
UC_Delete ..> UC_Privacy : <<extend>>
@enduml
```

---

## 3. Luận Điểm Thiết Kế & Chuẩn Hóa Quan Hệ UML

1. **Loại bỏ triệt để quan hệ sai ý nghĩa:**
   - **Lập kế hoạch vs Dinh dưỡng:** Tách độc lập (`Suggest Meals & Log Nutrition` là ca sử dụng riêng). Ứng dụng gợi ý món ăn theo mục tiêu thể hình và dị ứng cá nhân, **không có cơ chế "bù calo"** (ăn thêm thì phạt tập thêm).
   - **Quản lý quyền riêng tư vs Xóa dữ liệu:** Quan hệ `«extend»`. Việc xóa tài khoản/dữ liệu theo NĐ 13/2023/NĐ-CP chỉ thực hiện khi người dùng chủ động yêu cầu và xác nhận, không phải mỗi lần vào cài đặt là xóa.
   - **Kiểm tra form vs Cảnh báo:** Quan hệ `«extend»`. Cảnh báo âm thanh/rung chỉ kích hoạt khi góc khớp vượt ngưỡng ROM an toàn.
   - **Dashboard vs Heatmap tích lũy:** Quan hệ `«extend»`. Mở Dashboard luôn xem được streak và mascot (`«include»`), còn bản đồ nhiệt tích lũy là màn hình chi tiết mở thêm khi cần.

2. **Chức năng an toàn cốt lõi: Nút "Tôi bị đau" (`Stop on Pain`):**
   - Đặt trực tiếp làm quan hệ `«extend»` vào ca sử dụng `Perform Workout`. Khi bấm nút, hệ thống lập tức ngắt camera và dừng phiên tập ở client mà không cần chờ mạng, sau đó hiển thị hướng dẫn sơ cứu.
   - Người dùng sau đó có thể chủ động xem và sửa vùng cần tránh (`Review & Edit Avoided Areas`), hệ thống **không tự động biến vùng đau tức thời thành bệnh lý vĩnh viễn**.

3. **Thống nhất thang RPE 1–10 sau buổi tập:**
   - Tách biệt rõ giữa **mức độ gắng sức (RPE)** và **tín hiệu chấn thương (Pain Stop)**.
   - RPE được thu thập **duy nhất 1 lần sau khi kết thúc buổi tập** qua thanh trượt Borg CR10 (1–10). Mức 7–10 biểu thị nỗ lực cao/kiệt sức để điều chỉnh giảm volume tuần sau, không tự động quy chụp là chấn thương.

---

## 4. Bảng Tóm Tắt Đặc Tả Các Ca Sử Dụng (F1–F7)

| Mã UC | Tên Ca Sử Dụng | Tác Nhân | Quan Hệ | Nghiệp Vụ Thực Tế |
| :--- | :--- | :--- | :---: | :--- |
| **UC01** | `Manage Profile & Health Baseline` | User | **Base** | Đăng ký/đăng nhập, nhập chiều cao, cân nặng, mục tiêu và tiền sử chấn thương. |
| **UC01.1**| `Review & Edit Avoided Areas` | User | `«extend»` | Xem và chủ động bật/tắt các vùng cơ thể cần hạn chế vận động cho tuần tới. |
| **UC02** | `Plan Adaptive Workout` | User | **Base** | Tạo lịch tập tuần thích ứng theo thể trạng cá nhân (Progressive Overload). |
| **UC02.1**| `Customize by Health & Goal` | Hệ thống | `«include»` | Lọc bỏ các bài tập va chạm mạnh dựa trên thẻ hạn chế vận động của người dùng. |
| **UC02.2**| `Progressively Scale Difficulty`| Hệ thống | `«include»` | Điều chỉnh số rep/hiệp mượt mà theo dữ liệu buổi trước để chống nản. |
| **UC03** | `Suggest Meals & Log Nutrition` | User | **Base** | Gợi ý bữa ăn sinh viên theo mục tiêu/dị ứng và ghi chép lại bữa ăn (không bù calo). |
| **UC04** | `Consult Fitness Safety` | User, ExternalAI | **Base** | Hỏi đáp kiến thức bài tập và an toàn khớp với HLV ảo. |
| **UC04.1**| `Query Curated Safety Rules` | Hệ thống | `«include»` | Đối soát quy chuẩn y tế và câu trả lời soạn sẵn trước khi phản hồi. |
| **UC04.2**| `Trigger Doctor Referral` | Hệ thống | `«extend»` | Kích hoạt cảnh báo dừng tập, khuyên đi khám khi phát hiện báo đau cấp tính qua chat. |
| **UC05** | `Perform Workout` | User | **Base** | Tiến hành buổi tập theo giáo án cá nhân hóa. |
| **UC05.1**| `Save Workout Session` | Hệ thống | `«include»` | Tự động lưu số hiệp, rep hoàn thành và thời gian vào SQLite. |
| **UC05.2**| `Report Pain (Stop on Pain)` | User | `«extend»` | Nút khẩn cấp ngắt camera và dừng bài tập ngay lập tức trên máy khi bị đau. |
| **UC05.3**| `Check Posture with Camera` | User, PoseTracker | `«extend»` | Tùy chọn bật camera kiểm tra góc khớp khi gặp bài tập mới (On-Demand). |
| **UC05.4**| `Emit Form Warning` | AudioSys | `«extend»` | Rung và phát tiếng beep cảnh báo khi phát hiện lệch góc ROM. |
| **UC05.5**| `Provide Post-Workout RPE (1-10)`| User | `«extend»` | Đánh giá cảm nhận độ mệt sau buổi tập bằng thang Borg CR10 (1–10). |
| **UC05.6**| `View Workout Heatmap` | User | `«extend»` | Xem bản đồ nhiệt 2D cơ bắp được kích hoạt ngay sau buổi tập. |
| **UC06** | `Set Workout Reminders` | User | **Base** | Đặt lịch nhắc tập luyện để duy trì kỷ luật và chuỗi ngày tập. |
| **UC07** | `View Progress Dashboard` | User | **Base** | Xem tổng quan chuỗi ngày tập (streak), tổng volume và tiến độ. |
| **UC07.1**| `Track Mascot Growth & Streak` | Hệ thống | `«include»` | Hiển thị nhân vật Mascot tiến hóa theo chuỗi ngày tập và khối lượng. |
| **UC07.2**| `View Cumulative Heatmap` | User | `«extend»` | Xem bản đồ nhiệt tích lũy theo tuần/tháng khi người dùng muốn phân tích sâu. |
| **UC08** | `Manage Personal Privacy` | User | **Base** | Quản lý quyền riêng tư theo Nghị định 13/2023/NĐ-CP. |
| **UC08.1**| `Delete Personal Data` | Hệ thống | `«extend»` | Xóa sạch tài khoản và lịch sử cá nhân khi người dùng xác nhận yêu cầu. |
