# 20/10 – Trao Lời Yêu Thương

Website chúc mừng các dịp lễ (20/10, 20/11, 8/3, Tết, Valentine) của
Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn – Thanh Hóa: lời chúc AI (Gemini),
thiệp điện tử, kho lời chúc, vòng quay may mắn (giải MoMo) và trang quản trị.

## Chạy thử

```bash
npm install
cp .env.example .env      # rồi điền GEMINI_API_KEY và ADMIN_PASSWORD (>= 8 ký tự)
npm run dev               # http://localhost:3000
```

## Triển khai

```bash
npm run build
npm start                 # NODE_ENV=production
```

- Đặt `DATA_DIR` trỏ tới ổ đĩa **bền vững** (vé, giải thưởng và yêu cầu nhận thưởng lưu ở `DATA_DIR/database.json`).
- Triển khai Firestore Rules: `firebase deploy --only firestore:rules`.
- Bật đăng nhập Google trong Firebase Authentication.

## Cơ chế vòng quay (an toàn)

- **Mọi kết quả liên quan đến tiền do server quyết định** (`/api/spin/play`), chọn giải có trọng số theo số suất còn lại, bằng `crypto`.
- **Vé**: admin phát hành hàng loạt, hoặc người dùng đã đăng nhập (email đã xác minh) tự nhận **1 vé / dịp lễ** qua `/api/spin/claim-ticket`.
- **Quay miễn phí** (3 lượt / tài khoản) do server đếm, chỉ trúng lời chúc, không có tiền.
- Mã nhận thưởng 10 ký tự ngẫu nhiên; yêu cầu nhận thưởng khóa chỉnh sửa sau khi admin xử lý.
- Admin: mật khẩu bắt buộc từ `ADMIN_PASSWORD`, token ngẫu nhiên hết hạn sau 4 giờ, giới hạn 5 lần đăng nhập sai / 15 phút.
- Firestore chỉ dùng để hiển thị hồ sơ/lịch sử; **việc chi trả chỉ dựa trên dữ liệu server**.

## Ghi chú

- Danh sách email admin (Firestore Rules và `AuthContext.tsx`) cần giữ khớp nhau.
- Dự án có sử dụng công cụ AI hỗ trợ xây dựng; nội dung cần được người biên soạn kiểm tra trước khi dùng chính thức.
