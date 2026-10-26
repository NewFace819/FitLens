# FitLens — Sơ Đồ Ca Sử Dụng (Use Case Diagram) Chuẩn UML

> **Đồ án:** FitLens (AI Virtual Personal Trainer & Habit Coach)  
> **Môn học:** CS252 / CSC10014 — Computational Thinking (fit@hcmus)  
> **Nhóm thực hiện:** Group_01  
> **Tài liệu gửi THA:** Báo cáo phân tích thiết kế Use Case Diagram

---

## 1. Sơ Đồ Use Case Tổng Thể (Mermaid UML)

*Sơ đồ hiển thị trực tiếp trên GitHub, VS Code và các trình đọc Markdown hỗ trợ Mermaid.*

```mermaid
flowchart LR
    subgraph FitLens ["«system» FitLens Mobile System"]
        direction TB

        %% ==========================================
        %% NHÓM 1: LẬP KẾ HOẠCH & TƯ VẤN
        %% ==========================================
        subgraph G1 ["Nhóm 1: Lập Kế Hoạch Thích Ứng & Tư Vấn An Toàn"]
            UC_Plan(["Plan Adaptive Workout"])
            UC_Custom(["Customize by Health Condition & Goal"])
            UC_Prog(["Progressively Scale Difficulty"])
            UC_Diet(["Suggest Nutrition & Balance Calories"])
            UC_Consult(["Consult Fitness Safety"])
            UC_RAG(["Query Medical RAG"])
            UC_Doc(["Trigger Doctor Referral"])
        end

        %% ==========================================
        %% NHÓM 2: LUYỆN TẬP & KIỂM TRA KỸ THUẬT
        %% ==========================================
        subgraph G2 ["Nhóm 2: Luyện Tập & Kiểm Tra Kỹ Thuật"]
            UC_Workout(["Perform Workout"])
            UC_Save(["Save Workout Session"])
            UC_CheckForm(["Check Posture with Camera (On-Demand)"])
            UC_Space(["Check Space & Distance"])
            UC_Track(["Track 33-Joint Posture"])
            UC_Alert(["Emit Form Warning"])
            UC_RPE(["Provide Difficulty Feedback (RPE)"])
            UC_PostHeatmap(["View Workout Heatmap"])
        end

        %% ==========================================
        %% NHÓM 3: THỐNG KÊ & QUYỀN RIÊNG TƯ
        %% ==========================================
        subgraph G3 ["Nhóm 3: Thống Kê & Quyền Riêng Tư"]
            UC_Dash(["View Progress Dashboard"])
            UC_CumHeatmap(["View Cumulative Heatmap & Streak"])
            UC_Privacy(["Manage Personal Privacy"])
            UC_Delete(["Delete Personal Data"])
        end
    end

    %% ==========================================
    %% ACTORS
    %% ==========================================
    User["👤 User / Student\n(Primary Actor)"]
    PoseTracker["📷 Camera / Pose Tracker\n(Secondary Actor)"]
    AudioSys["🔊 Audio Alert System\n(Secondary Actor)"]
    MedicalDB["📚 Medical RAG Database\n(Secondary Actor)"]

    %% ==========================================
    %% QUAN HỆ NHÓM 1
    %% ==========================================
    User --- UC_Plan
    User --- UC_Consult
    UC_Plan -.->|«include»| UC_Custom
    UC_Plan -.->|«include»| UC_Prog
    UC_Plan -.->|«include»| UC_Diet
    UC_Consult -.->|«include»| UC_RAG
    UC_Doc -.->|«extend»| UC_Consult
    UC_RAG --- MedicalDB

    %% ==========================================
    %% QUAN HỆ NHÓM 2
    %% ==========================================
    User --- UC_Workout
    UC_Workout -.->|«include»| UC_Save
    UC_CheckForm -.->|«extend»| UC_Workout
    UC_RPE -.->|«extend»| UC_Workout
    UC_PostHeatmap -.->|«extend»| UC_Workout
    UC_CheckForm -.->|«include»| UC_Space
    UC_CheckForm -.->|«include»| UC_Track
    UC_CheckForm -.->|«include»| UC_Alert
    UC_Track --- PoseTracker
    UC_Alert --- AudioSys

    %% ==========================================
    %% QUAN HỆ NHÓM 3
    %% ==========================================
    User --- UC_Dash
    User --- UC_Privacy
    UC_Dash -.->|«include»| UC_CumHeatmap
    UC_Privacy -.->|«include»| UC_Delete
```

---

## 2. Mã Nguồn PlantUML (Chuẩn UML Quốc Tế)

*Có thể copy đoạn mã dưới đây vào [PlantText](https://www.planttext.com/) hoặc tiện ích PlantUML trong VS Code để kết xuất ảnh SVG/PNG vector chất lượng cao.*

```plantuml
@startuml FitLens_UseCase_Diagram
title FitLens — Use Case Diagram (Standard UML 2.5)
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome
skinparam roundcorner 10
skinparam defaultFontName "Segoe UI", Arial, sans-serif

skinparam rectangle {
    BackgroundColor #F8FAFC
    BorderColor #64748B
    FontColor #0F172A
}

skinparam usecase {
    BackgroundColor #FFFFFF
    BorderColor #0284C7
    ArrowColor #0369A1
    FontColor #0F172A
}

' ==========================================
' ACTORS
' ==========================================
actor "User / Student" as User #0284C7
actor "Camera / Pose Tracker" as PoseTracker #10B981
actor "Audio Alert System" as AudioSys #F59E0B
actor "Medical RAG Database" as MedicalDB #8B5CF6

' ==========================================
' SYSTEM BOUNDARY
' ==========================================
rectangle "FitLens Mobile System" {

  package "Group 1: Adaptive Planning & Safety" {
    usecase "Plan Adaptive Workout" as UC_Plan
    usecase "Customize by Health & Goal" as UC_Custom
    usecase "Progressively Scale Difficulty" as UC_Prog
    usecase "Suggest Nutrition & Balance Calories" as UC_Diet
    usecase "Consult Fitness Safety" as UC_Consult
    usecase "Query Medical RAG" as UC_RAG
    usecase "Trigger Doctor Referral" as UC_Doc
  }

  package "Group 2: Workout & Form Inspection" {
    usecase "Perform Workout" as UC_Workout
    usecase "Save Workout Session" as UC_Save
    usecase "Check Posture with Camera\n(On-Demand)" as UC_CheckForm
    usecase "Check Space & Distance" as UC_Space
    usecase "Track 33-Joint Posture" as UC_Track
    usecase "Emit Form Warning" as UC_Alert
    usecase "Provide Difficulty Feedback (RPE)" as UC_RPE
    usecase "View Workout Heatmap" as UC_PostHeatmap
  }

  package "Group 3: Analytics & User Rights" {
    usecase "View Progress Dashboard" as UC_Dash
    usecase "View Cumulative Heatmap & Streak" as UC_CumHeatmap
    usecase "Manage Personal Privacy" as UC_Privacy
    usecase "Delete Personal Data" as UC_Delete
  }
}

' ==========================================
' PRIMARY USER ASSOCIATIONS
' ==========================================
User --> UC_Plan
User --> UC_Consult
User --> UC_Workout
User --> UC_Dash
User --> UC_Privacy

' ==========================================
' GROUP 1 RELATIONSHIPS
' ==========================================
UC_Plan ..> UC_Custom : <<include>>
UC_Plan ..> UC_Prog : <<include>>
UC_Plan ..> UC_Diet : <<include>>
UC_Consult ..> UC_RAG : <<include>>
UC_Doc ..> UC_Consult : <<extend>>
UC_RAG --> MedicalDB

' ==========================================
' GROUP 2 RELATIONSHIPS
' ==========================================
UC_Workout ..> UC_Save : <<include>>
UC_CheckForm ..> UC_Workout : <<extend>>
UC_RPE ..> UC_Workout : <<extend>>
UC_PostHeatmap ..> UC_Workout : <<extend>>

UC_CheckForm ..> UC_Space : <<include>>
UC_CheckForm ..> UC_Track : <<include>>
UC_CheckForm ..> UC_Alert : <<include>>

UC_Track --> PoseTracker
UC_Alert --> AudioSys

' ==========================================
' GROUP 3 RELATIONSHIPS
' ==========================================
UC_Dash ..> UC_CumHeatmap : <<include>>
UC_Privacy ..> UC_Delete : <<include>>

@enduml
```

---

## 3. Luận Điểm Thiết Kế & Biện Luận Chuẩn UML (Gửi THA)

Bản thiết kế này giải quyết triệt để các bẫy thường gặp trong Use Case Diagram nhằm bảo vệ điểm số:

### 1. Phân định ranh giới hệ thống (System Boundary) & Actor
- **Tại sao không có Actor "AI Engine"?**  
  Theo chuẩn UML, Actor bắt buộc phải là thực thể **bên ngoài** hệ thống phần mềm đang xây dựng. FitLens bản chất là một phần mềm tích hợp AI, do đó các mô hình thuật toán và Rules Engine nằm **bên trong** ranh giới hệ thống (`FitLens System`).
- **Các External Systems thực sự:**
  - `Camera / Pose Tracker`: Giao tiếp phần cứng camera và API cảm biến thiết bị.
  - `Audio Alert System`: Hệ thống phát âm thanh cảnh báo của hệ điều hành.
  - `Medical RAG Database`: Cơ sở tri thức y khoa đối soát độc lập bên ngoài.

### 2. Quan hệ của Camera là `«extend»` thay vì `«include»`
- **Góc nhìn hành vi (Behavioral UX):** Camera **không phải là yêu cầu bắt buộc** cho toàn bộ buổi tập. Người dùng tập bình thường; chỉ khi gặp bài tập mới hoặc không chắc về tư thế, người dùng mới kích hoạt tính năng kiểm tra kỹ thuật.
- Do đó, `Check Posture with Camera` mở rộng (`«extend»`) vào `Perform Workout` khi có nhu cầu (On-Demand), giúp ứng dụng tiết kiệm pin, tránh làm nóng máy và giảm áp lực tâm lý cho người mới tập.

### 3. Cơ chế an toàn y tế (`Trigger Doctor Referral`) là `«extend»`
- Khi người dùng hỏi đáp tư vấn bài tập (`Consult Fitness Safety`), nếu người dùng đề cập đến chấn thương cấp tính hoặc đau nhói, kịch bản chuyển tuyến bác sĩ (`Trigger Doctor Referral`) mới được kích hoạt để ngắt hội thoại và khuyên đi khám chuyên khoa.

### 4. Tránh lỗi phân rã chức năng (Functional Decomposition)
- Tuyệt đối không đưa các thao tác giao diện như *"Lọc theo ngày/tuần/tháng"*, *"Đổi tab"* hay *"Nhập text"* thành Use Case con. Toàn bộ thao tác theo dõi tiến trình được gom chuẩn mực vào `View Progress Dashboard`.

---

## 4. Bảng Tóm Tắt Đặc Tả Các Ca Sử Dụng Trọng Tâm

| Mã UC | Tên Ca Sử Dụng | Tác Nhân | Loại Quan Hệ | Mô Tả Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :---: | :--- |
| **UC01** | `Plan Adaptive Workout` | User | **Base** | Tự động sinh lịch tập tuần thích ứng theo thể trạng và mục tiêu. |
| **UC01.1**| `Customize by Health & Goal` | Hệ thống | `«include»` | Lọc bỏ các bài tập va chạm mạnh nếu có tiền sử đau thắt lưng/khớp gối. |
| **UC01.2**| `Progressively Scale Difficulty`| Hệ thống | `«include»` | Tăng tiến độ khó mượt mà dựa trên dữ liệu phản hồi (chống nản ngày đầu). |
| **UC01.3**| `Suggest Nutrition & Balance Calories`| Hệ thống| `«include»` | Gợi ý bữa ăn sinh viên; tính toán hiệp tập bù trừ năng lượng thặng dư. |
| **UC02** | `Consult Fitness Safety` | User, MedicalDB | **Base** | Hỏi đáp kiến thức bài tập và bảo vệ khớp với HLV ảo. |
| **UC02.1**| `Trigger Doctor Referral` | Hệ thống | `«extend»` | Kích hoạt cảnh báo dừng tập, khuyên đi khám khi báo đau nặng. |
| **UC03** | `Perform Workout` | User | **Base** | Tiến hành buổi tập theo giáo án cá nhân hóa. |
| **UC03.1**| `Save Workout Session` | Hệ thống | `«include»` | Tự động lưu số hiệp, reps hoàn thành và thời gian vào SQLite. |
| **UC03.2**| `Check Posture with Camera` | User, PoseTracker, AudioSys | `«extend»` | Bật camera kiểm tra góc khớp khi người dùng có nhu cầu (On-Demand). |
| **UC03.3**| `Provide Difficulty Feedback` | User | `«extend»` | Đánh giá độ mệt RPE (1–10) sau buổi tập để AI điều chỉnh buổi sau. |
| **UC03.4**| `View Workout Heatmap` | User | `«extend»` | Xem bản đồ nhiệt 2D cơ bắp được kích hoạt ngay sau buổi tập. |
| **UC04** | `View Progress Dashboard` | User | **Base** | Theo dõi chuỗi streak, tổng volume và bản đồ nhiệt tích lũy. |
| **UC05** | `Manage Personal Privacy` | User | **Base** | Quyền riêng tư theo Nghị định 13/2023/NĐ-CP, cho phép xóa sạch dữ liệu. |
