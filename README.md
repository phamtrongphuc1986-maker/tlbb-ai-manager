# TLBB AI Manager V1.3 — OCR tiếng Việt

## Nâng cấp
- Mặc định bộ ngôn ngữ OCR `vie` (tiếng Việt có dấu); tùy chọn `vie+eng` hoặc `eng`.
- Có thể kéo trên ảnh xem trước để khoanh vùng hội thoại cần đọc; bỏ vùng chọn để đọc toàn ảnh.
- Tăng kích thước vùng ảnh nhỏ lên tối đa khoảng 4x, giới hạn số pixel để giảm nguy cơ tràn bộ nhớ trên Android.
- Bộ lọc chữ sáng/nền tối, chữ tối/nền sáng, thang xám, tăng tương phản và làm nét nhẹ.
- Tự thử nhiều bố cục Tesseract (PSM 6, 11, 12) và nhiều bộ lọc khi chọn Tự động.
- Giữ nguyên khóa LocalStorage `tlbb-ai-manager-bank-v1` để không làm mất ngân hàng câu hỏi hiện có trên cùng trình duyệt.

## Cập nhật trên GitHub
Thay thế 4 file tại thư mục gốc nhánh `main`: `index.html`, `app.js`, `style.css`, `README.md`.

## Lưu ý kỹ thuật
- Cần Internet để tải Tesseract.js và dữ liệu ngôn ngữ `vie` từ CDN. Lần chạy đầu có thể tải lâu.
- OCR không thể khôi phục chi tiết chữ đã mờ, bị che, bị nén mạnh hoặc có độ phân giải quá thấp.
- Confidence là điểm do engine cung cấp, không phải xác suất chính xác tuyệt đối.
- Nên dùng ảnh chụp trực tiếp từ game, không dùng ảnh chụp lại giao diện OCR.
- Đây là bản thử nghiệm; chưa xác minh độ chính xác trên mọi font TLBB. Cần ảnh game gốc để tinh chỉnh thêm.
- 15 ô tài khoản chỉ là trạng thái đánh dấu thủ công; không tự điều khiển client game.
