# TLBB AI Manager V1.1

## Cập nhật
- Giữ giao diện quản lý 15 ô tài khoản và ngân hàng câu hỏi.
- OCR sử dụng Tesseract.js với lựa chọn tiếng Việt + tiếng Anh, tiếng Việt hoặc tiếng Anh.
- Có tùy chọn phóng to, chuyển ảnh sang thang xám và tăng tương phản trước OCR.
- Cải thiện so khớp câu hỏi bằng điểm Dice/độ bao phủ từ khóa sau chuẩn hóa dấu tiếng Việt.
- Nhập/xuất ngân hàng câu hỏi JSON.

## Cài đặt GitHub Pages
Tải lên và thay thế các file `index.html`, `style.css`, `app.js`, `README.md` tại thư mục gốc của nhánh `main`, sau đó Commit changes. GitHub Pages cần cấu hình branch `main` và folder `/(root)`.

## Lưu ý quan trọng
- Đây vẫn là prototype chạy trong trình duyệt, không phải ứng dụng Windows native.
- OCR tải Tesseract.js và dữ liệu ngôn ngữ từ CDN, cần Internet.
- OCR có thể nhận sai; hãy kiểm tra văn bản trước khi tra cứu.
- Điểm tương đồng là điểm so khớp văn bản, không phải xác suất đáp án đúng.
- Dữ liệu vẫn lưu trong localStorage của trình duyệt; chưa phải SQLite và không tự đồng bộ giữa thiết bị.
- 15 ô tài khoản chỉ đánh dấu thủ công, chưa kết nối hoặc điều khiển client game.
- Chưa tích hợp dịch vụ AI bên ngoài; không nhập API key bí mật vào mã nguồn công khai.
