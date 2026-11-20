# TLBB AI Manager — bản prototype

## Đưa lên GitHub Pages
1. Trong repository, mở **Add file → Upload files**.
2. Tải lên 4 tệp trong gói này: `index.html`, `style.css`, `app.js`, `README.md`.
3. Nhập thông điệp commit, chọn **Commit changes**.
4. Mở **Settings → Pages**.
5. Chọn **Deploy from a branch**, branch `main`, folder `/(root)`, nhấn **Save**.
6. Đợi GitHub Pages triển khai rồi mở URL hiển thị tại trang Pages.

## Tính năng
- Bảng 15 ô tài khoản; trạng thái được đánh dấu thủ công.
- OCR ảnh tiếng Việt/Anh bằng Tesseract.js trong trình duyệt.
- Tra cứu câu hỏi gần đúng theo từ khóa.
- Thêm, tìm, xóa, nhập và xuất ngân hàng câu hỏi JSON.

## Giới hạn
- Đây là website prototype, không phải ứng dụng Windows native.
- Không tự động điều khiển 15 cửa sổ game, không tự đăng nhập, gửi phím, click NPC hoặc vượt CAPTCHA.
- OCR cần tải thư viện và dữ liệu ngôn ngữ từ CDN; cần Internet.
- Ngân hàng câu hỏi hiện lưu bằng `localStorage`, **chưa phải SQLite** và không tự đồng bộ giữa các trình duyệt/máy. Hãy xuất JSON để sao lưu.
- Điểm khớp là độ tương đồng từ khóa, không phải xác suất đáp án đúng.
- Kiểm tra lại văn bản OCR trước khi dùng đáp án.

Không liên kết chính thức với nhà phát hành Thiên Long Bát Bộ.
