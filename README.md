# TLBB AI Manager V1.2

## Thay đổi OCR
- Chọn riêng ngôn ngữ `vie`, `vie+eng` hoặc `eng`; mặc định `vie` để ưu tiên hội thoại tiếng Việt.
- Phóng to ảnh đầu vào đến cạnh tối đa 2200 px (giới hạn hệ số phóng 3x).
- Chế độ tự động thử nhiều bản ảnh: tăng tương phản thang xám, ngưỡng đen-trắng và ảnh gốc.
- Thử bố cục Tesseract: một khối chữ (PSM 6) và chữ rời rạc (PSM 11).
- Chọn kết quả theo confidence do OCR trả về, hiển thị confidence và thời gian xử lý.
- Giới hạn ảnh đầu vào 12 MB, báo lỗi tải thư viện hoặc xử lý ảnh rõ hơn.

## Cài đặt
Thay thế 4 file ở thư mục gốc nhánh `main`: `index.html`, `app.js`, `style.css`, `README.md`. Không tải ZIP lên thay cho các file này.

## Lưu ý
- OCR vẫn có thể sai dấu, chữ hoa/thường, số và ký tự đặc biệt. Luôn soát văn bản trước khi tra cứu.
- Confidence do engine OCR cung cấp không đồng nghĩa xác suất văn bản đúng.
- Chất lượng phụ thuộc độ phân giải ảnh, font trong game, độ tương phản, hiệu ứng nền và ngôn ngữ.
- Tesseract.js và dữ liệu ngôn ngữ được tải từ CDN; cần Internet. Lần chạy đầu có thể tải dữ liệu lâu.
- Dữ liệu câu hỏi tiếp tục dùng khóa localStorage `tlbb-ai-manager-bank-v1` để giữ dữ liệu V1.1 trên cùng trình duyệt/nguồn website.
- Chưa có AI trả lời câu hỏi mới; chưa có SQLite; chưa đồng bộ dữ liệu.
- 15 ô tài khoản chỉ đánh dấu thủ công, chưa điều khiển client game.
