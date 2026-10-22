"""Generate the 3-slide Blueprint presentation for THA meeting."""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

DARK_BLUE = RGBColor(15, 23, 42)     # Slate 900
PRIMARY = RGBColor(14, 165, 233)     # Sky 500
TEXT_WHITE = RGBColor(248, 250, 252) # Slate 50
TEXT_MUTED = RGBColor(148, 163, 184) # Slate 400
CARD_BG = RGBColor(30, 41, 59)       # Slate 800
ACCENT = RGBColor(34, 197, 94)       # Emerald 500

def set_bg(slide):
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = DARK_BLUE

# ==================== SLIDE 1 ====================
slide1 = prs.slides.add_slide(blank_layout)
set_bg(slide1)

tb1 = slide1.shapes.add_textbox(Inches(0.8), Inches(0.6), Inches(11.7), Inches(1.3))
tf1 = tb1.text_frame
tf1.word_wrap = True
p = tf1.paragraphs[0]
p.text = "FITLENS — SYSTEM BLUEPRINT"
p.font.size = Pt(28)
p.font.bold = True
p.font.color.rgb = PRIMARY

p_sub = tf1.add_paragraph()
p_sub.text = "Tổng quan kiến trúc: On-Device Vision, Offline-First Mobile & Cloud AI 0đ (Nhóm 01 · CSC10014)"
p_sub.font.size = Pt(16)
p_sub.font.color.rgb = TEXT_MUTED

cards = [
    ("1. Mobile Client (Flutter)", 
     "• Offline-first với SQLite/Hive cache.\n• UI động kèm Growing Avatar tiến hóa theo volume/streak.\n• Haptic & Beep cảnh báo sai form tức thì."),
    ("2. On-Device Vision (MediaPipe)", 
     "• Xử lý khung hình 100% trên RAM thiết bị.\n• Trích xuất 33 keypoints đếm reps & tính góc ROM.\n• Zero Video Retention: Không upload video lên server."),
    ("3. Backend Core (FastAPI)", 
     "• API Gateway kiểm soát HTTPS + JWT.\n• Safety Router: Ngắt offline khi báo đau.\n• Rules Engine tính volume; Pseudonymizer lọc sạch PII."),
    ("4. Free Cloud Services", 
     "• Google Gemini 3.8 Flash (Free Tier) sinh JSON kế hoạch.\n• Supabase (PostgreSQL): 500MB, Auth tích hợp, Row-Level Security.\n• Push Notifications (FCM): Nhắc lịch tập chung.")
]

lefts = [0.8, 3.8, 6.8, 9.8]
for (title, desc), l in zip(cards, lefts):
    shape = slide1.shapes.add_shape(1, Inches(l), Inches(2.2), Inches(2.7), Inches(4.5))
    shape.fill.solid()
    shape.fill.fore_color.rgb = CARD_BG
    shape.line.color.rgb = PRIMARY
    shape.line.width = Pt(1.5)
    tf = shape.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = PRIMARY
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.size = Pt(12)
    p2.font.color.rgb = TEXT_WHITE

slide1.notes_slide.notes_text_frame.text = (
    "[SLIDE 1 - KỊCH BẢN THUYẾT TRÌNH THA (6-7 phút)]:\n"
    "Chào anh/thầy THA, em là Gia Huy đại diện Nhóm 01 trình bày System Blueprint của dự án FitLens.\n"
    "- FitLens là ứng dụng AI Virtual Personal Trainer trên mobile dành cho sinh viên và giới trẻ.\n"
    "- 4 trụ cột kiến trúc:\n"
    "  1. Mobile Client: Chọn Flutter giúp cross-platform, tích hợp SQLite offline-first và Growing Avatar tạo động lực.\n"
    "  2. On-Device Vision: Sử dụng MediaPipe Pose chạy thẳng trên RAM điện thoại. Cam kết Zero Video Retention: Khung hình chỉ trích xuất tọa độ 33 khớp xương rồi hủy ngay, backend không có endpoint nhận video.\n"
    "  3. Backend Core: Dùng FastAPI siêu nhẹ, gồm Safety Router ngắt khi có chấn thương, Rules Engine kiểm soát bài tập và bộ Pseudonymizer ẩn danh hóa dữ liệu trước khi gửi LLM.\n"
    "  4. Free Cloud: Tận dụng hoàn toàn Gemini 3.8 Flash Free Tier và Supabase Postgres (có sẵn Auth và RLS). Toàn bộ chi phí hạ tầng là 0đ."
)

# ==================== SLIDE 2 ====================
slide2 = prs.slides.add_slide(blank_layout)
set_bg(slide2)

tb2 = slide2.shapes.add_textbox(Inches(0.8), Inches(0.6), Inches(11.7), Inches(1.3))
tf2 = tb2.text_frame
tf2.word_wrap = True
p = tf2.paragraphs[0]
p.text = "HAI LUỒNG DỮ LIỆU & CƠ CHẾ AN TOÀN"
p.font.size = Pt(28)
p.font.bold = True
p.font.color.rgb = PRIMARY

p_sub2 = tf2.add_paragraph()
p_sub2.text = "Tập camera On-Demand, Hỏi Coach ẩn danh & Router xử lý chấn thương/lỗi API"
p_sub2.font.size = Pt(16)
p_sub2.font.color.rgb = TEXT_MUTED

col1 = slide2.shapes.add_shape(1, Inches(0.8), Inches(2.2), Inches(5.6), Inches(4.5))
col1.fill.solid()
col1.fill.fore_color.rgb = CARD_BG
col1.line.color.rgb = PRIMARY
col1.line.width = Pt(1.5)
tf = col1.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "Luồng 1: Tập Với Camera (On-Demand)"
p.font.size = Pt(16)
p.font.bold = True
p.font.color.rgb = PRIMARY
p2 = tf.add_paragraph()
p2.text = (
    "• Không ép bật camera: Chỉ kích hoạt khi muốn kiểm tra form động tác mới («extend» trong Use Case).\n"
    "• MediaPipe trên RAM trích xuất 33 điểm khớp -> Tính góc ROM -> Phát Beep/Rung sửa tư thế.\n"
    "• Kết thúc buổi: Chỉ gửi số reps, phút tập và đánh giá RPE (Dễ/Vừa/Mệt). Tuyệt đối không gửi ảnh/video.\n"
    "• Nút 'Tôi bị đau': Dừng buổi tập ngay lập tức trên máy (offline) và khuyên đi khám bác sĩ."
)
p2.font.size = Pt(13)
p2.font.color.rgb = TEXT_WHITE

col2 = slide2.shapes.add_shape(1, Inches(6.9), Inches(2.2), Inches(5.6), Inches(4.5))
col2.fill.solid()
col2.fill.fore_color.rgb = CARD_BG
col2.line.color.rgb = ACCENT
col2.line.width = Pt(1.5)
tf = col2.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "Luồng 2: Hỏi Coach & Router An Toàn / Fallback"
p.font.size = Pt(16)
p.font.bold = True
p.font.color.rgb = ACCENT
p2 = tf.add_paragraph()
p2.text = (
    "• The LLM Boundary (Ẩn danh hóa): Chuyển tuổi -> age_band, cân nặng -> bmi_band, bệnh lý -> thẻ tránh (avoid_tags). Không gửi tên, email hay chẩn đoán thật.\n"
    "• Safety Router: Bắt từ khóa chấn thương -> Trả về kịch bản an toàn chuẩn y khoa.\n"
    "• Fallback khi Gemini 429/Offline:\n"
    "  - Cache cục bộ kế hoạch tuần trong máy (SQLite).\n"
    "  - Tự động chuyển sang kho câu trả lời soạn sẵn (Curated Knowledge) khi mất mạng/quá tải."
)
p2.font.size = Pt(13)
p2.font.color.rgb = TEXT_WHITE

slide2.notes_slide.notes_text_frame.text = (
    "[SLIDE 2 - KỊCH BẢN THUYẾT TRÌNH THA (7-8 phút)]:\n"
    "Ở slide này em làm rõ 2 luồng dữ liệu cốt lõi:\n"
    "1. Luồng Camera On-Demand:\n"
    "   - Trong UML, ca sử dụng 'Check Posture with Camera' mở rộng («extend») vào 'Perform Workout'. Người dùng không bị ép soi camera suốt buổi, chỉ bật khi cần kiểm tra bài mới.\n"
    "   - Nhờ xử lý on-device, nút 'Tôi bị đau' ngắt tập ngay trên máy không phụ thuộc internet.\n"
    "2. Luồng Hỏi Coach & Sinh Lịch:\n"
    "   - LLM không tự ý chọn bài tập nguy hiểm. Rules Engine chọn bài, LLM chỉ đóng vai trò diễn giải lời văn.\n"
    "   - Cơ chế bảo vệ dữ liệu: Dữ liệu gửi sang Gemini được ẩn danh hoàn toàn (age_band, bmi_band, restriction tags).\n"
    "   - Cơ chế dự phòng: Nếu API Free bị nghẽn 429, hệ thống có Exponential Backoff 5 lần và tự động kích hoạt câu trả lời soạn sẵn, đảm bảo ứng dụng không bao giờ bị đơ."
)

# ==================== SLIDE 3 ====================
slide3 = prs.slides.add_slide(blank_layout)
set_bg(slide3)

tb3 = slide3.shapes.add_textbox(Inches(0.8), Inches(0.6), Inches(11.7), Inches(1.3))
tf3 = tb3.text_frame
tf3.word_wrap = True
p = tf3.paragraphs[0]
p.text = "LỰA CHỌN CÔNG NGHỆ & TÍNH KHẢ THI 0 ĐỒNG"
p.font.size = Pt(28)
p.font.bold = True
p.font.color.rgb = PRIMARY

p_sub3 = tf3.add_paragraph()
p_sub3.text = "Minh chứng kiến trúc khả thi, đáp ứng tiêu chí hoàn thiện và sáng tạo của đồ án"
p_sub3.font.size = Pt(16)
p_sub3.font.color.rgb = TEXT_MUTED

rows, cols = 6, 4
table_shape = slide3.shapes.add_table(rows, cols, Inches(0.8), Inches(2.2), Inches(11.7), Inches(4.5))
table = table_shape.table
table.columns[0].width = Inches(2.2)
table.columns[1].width = Inches(2.8)
table.columns[2].width = Inches(4.3)
table.columns[3].width = Inches(2.4)

headers = ["Thành phần", "Công nghệ chọn", "Lý do & Lợi ích", "Chi phí"]
data = [
    ["Mobile Client", "Flutter (Dart)", "1 codebase iOS/Android, camera native mượt, offline SQLite/Hive", "0đ (Open source)"],
    ["Pose Tracking", "MediaPipe Pose (Google)", "Chạy 100% on-device trên RAM, 33 keypoints, zero video retention", "0đ (On-device)"],
    ["Backend API", "FastAPI (Python)", "Nhẹ, async, tích hợp trực tiếp SDK Gemini & Pydantic validation", "0đ (Local/Render free)"],
    ["Cơ sở dữ liệu", "Supabase (PostgreSQL)", "Free tier: 500MB (~1.000 user-năm), 50k MAU, tích hợp sẵn Auth & RLS", "0đ (Free tier)"],
    ["AI Coach (LLM)", "Gemini 3.8 Flash", "Tốc độ phản hồi cao, structured JSON output, đã verify qua PoC", "0đ (AI Studio)"]
]

for col_idx, h in enumerate(headers):
    cell = table.cell(0, col_idx)
    cell.text = h
    cell.fill.solid()
    cell.fill.fore_color.rgb = CARD_BG
    p = cell.text_frame.paragraphs[0]
    p.font.bold = True
    p.font.size = Pt(13)
    p.font.color.rgb = PRIMARY

for row_idx, row_data in enumerate(data, 1):
    for col_idx, text in enumerate(row_data):
        cell = table.cell(row_idx, col_idx)
        cell.text = text
        cell.fill.solid()
        cell.fill.fore_color.rgb = CARD_BG
        p = cell.text_frame.paragraphs[0]
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_WHITE if col_idx != 3 else ACCENT
        if col_idx == 3:
            p.font.bold = True

slide3.notes_slide.notes_text_frame.text = (
    "[SLIDE 3 - KỊCH BẢN THUYẾT TRÌNH THA (5-6 phút)]:\n"
    "Slide cuối cùng chứng minh tính khả thi về công nghệ và bài toán chi phí:\n"
    "- Cam kết 0 đồng: Toàn bộ stack được lựa chọn đều có Free Tier dồi dào, không đòi hỏi thẻ tín dụng hay chi phí phát sinh.\n"
    "- Tính khả thi của dữ liệu: 1 người dùng tập 1 năm chỉ tốn khoảng 0.5 MB dữ liệu văn bản. Gói 500 MB của Supabase dư sức chứa 1.000 user-năm.\n"
    "- Tính sáng tạo: Kết hợp giữa On-device Computer Vision bảo vệ quyền riêng tư, giải thuật bù trừ calo thông minh theo RPE, và LLM Coach có cơ chế guardrail chống hallucination.\n"
    "Em xin kết thúc bài báo cáo và sẵn sàng nhận góp ý từ anh/thầy THA."
)

prs.save("docs/FitLens_Blueprint_THA.pptx")
print("Successfully generated docs/FitLens_Blueprint_THA.pptx")
