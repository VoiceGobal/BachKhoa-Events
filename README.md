# Bách Khoa Events

Ứng dụng Vite/React phục vụ các sự kiện của Trường Trung cấp Công nghiệp Bách Khoa Sầm Sơn: thiệp điện tử, lời chúc, đăng nhập Firebase, vòng quay, vé dự thưởng và quản trị giải MoMo.

## Kiến trúc triển khai

- Giao diện tĩnh được build bằng Vite và phân phối từ `dist/` trên Vercel.
- Mỗi endpoint trong `api/` là một Vercel Function với URL khớp trực tiếp; các function dùng chung handler trong `lib/apiHandler.ts`.
- Firebase Authentication xác thực người dùng. Function xác minh Firebase ID token bằng Firebase Admin SDK.
- Firestore Admin SDK là nơi lưu hồ sơ, vé, tồn kho giải, lượt quay, yêu cầu nhận thưởng và nhật ký.
- Các thao tác quay vé, trừ tồn kho, tạo claim và tiêu lượt miễn phí chạy trong Firestore transaction.
- Firestore Rules chặn client ghi trực tiếp vào vé, kho giải, claim, lượt quay và nhật ký. Backend dùng service account để ghi dữ liệu.

## Cấu hình Firebase

`firebase-applet-config.json` chứa cấu hình web hiện có của dự án Firebase. Giữ file này để Firebase Auth phía trình duyệt kết nối đúng project.

Backend cần một service account riêng; web config không cấp quyền server. Trong Firebase Console, tạo private key cho service account của đúng project, sau đó thêm toàn bộ JSON vào Vercel Project → Settings → Environment Variables:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: nội dung JSON service account, đặt cho Production và Preview.
- `FIREBASE_ADMIN_EMAILS`: danh sách email quản trị bổ sung, phân cách bằng dấu phẩy (không bắt buộc).
- `VITE_FIREBASE_ADMIN_EMAILS`: cùng danh sách email bổ sung để giao diện hiện bảng quản trị (không bắt buộc).
- `GEMINI_API_KEY`: tùy chọn; không có key, chức năng lời chúc dùng nội dung dự phòng.
- `GEMINI_MODEL`: tùy chọn, mặc định `gemini-2.5-flash`.

Service account cần quyền đọc/ghi Firestore trên project. Không commit private key vào Git, không dùng JSON service account làm biến `VITE_*`.

## Quản trị viên

Đăng nhập bằng Firebase Authentication với email đã xác minh. Các email quản trị cũ được giữ trong backend; thêm email mới qua `FIREBASE_ADMIN_EMAILS` và `VITE_FIREBASE_ADMIN_EMAILS`, rồi tạo deployment mới. Không còn đăng nhập bằng mật khẩu hard-code trong giao diện.

## Chạy và triển khai

```bash
npm install
npm run dev
```

`npm run dev` chạy giao diện Vite. Để chạy cả Vercel Functions khi phát triển cục bộ, dùng Vercel CLI với `vercel dev` sau khi liên kết project. Trên Vercel, đặt Build Command là `npm run build`, Output Directory là `dist`; cấu hình đã được khai báo trong `vercel.json`.

Triển khai rules cho đúng Firebase project:

```bash
firebase deploy --only firestore:rules
```

Sau khi deploy, kiểm tra `GET /api/health`; phản hồi `{"ok":true,...}` xác nhận function kết nối được Firestore. Nếu thiếu service account, endpoint trả 503 cùng tên biến môi trường cần cấu hình.

## Ghi chú dữ liệu

Các collection đang sử dụng gồm `users`, `admins`, `event_config`, `prize_tiers`, `ticket_owners`, `tickets`, `spins`, `claims` và `audit_logs`. Function không lưu trạng thái trên ổ đĩa tạm của Vercel. Dữ liệu cũ trong những collection Firestore giữ nguyên; tài liệu local từng nằm trong `data/database.json` không tự được nhập vào Firestore.
