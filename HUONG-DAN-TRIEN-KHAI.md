# Triển khai: Vercel (hosting + API) + Firestore (CSDL)

Kiến trúc mới:
- **Giao diện**: Vite/React build ra `dist/`, Vercel phục vụ tĩnh.
- **API**: `api/index.ts` chạy như Vercel Function, dùng **Firebase Admin SDK** ghi/đọc Firestore `(default)`.
- **Quy tắc**: client chỉ đọc lịch sử của chính mình; vé, giải, ngân sách, nhận thưởng do server ghi (`firestore.rules`).
- Không còn `data/database.json` và không còn token admin cố định.

## 1. Firebase (miễn phí – gói Spark)
1. console.firebase.google.com → tạo dự án mới (tài khoản của bạn).
2. **Build → Firestore Database → Create database** → chọn **(default)**, chế độ *production*.
3. **Build → Authentication → Sign-in method**: bật **Google** và **Email/Password**.
   Tab **Settings → Authorized domains**: thêm tên miền Vercel (vd. `happy-day-xxxx.vercel.app`) và tên miền riêng nếu có.
4. **Project settings → General → Your apps → Web app** → copy `firebaseConfig`,
   dán vào `firebase-applet-config.json` (giữ `"firestoreDatabaseId": "(default)"`).
5. **Firestore → Rules** → dán toàn bộ nội dung `firestore.rules` → Publish.
   (Nếu muốn đổi email admin, sửa danh sách trong hàm `isAdmin()`.)
6. **Project settings → Service accounts → Generate new private key** → tải file JSON (giữ bí mật, KHÔNG commit).

## 2. Vercel – biến môi trường
Project `happy-day` → **Settings → Environment Variables** (Production + Preview):

| Tên | Giá trị |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | dán **nguyên nội dung** file JSON ở bước 1.6 |
| `ADMIN_PASSWORD` | mật khẩu admin dài, khó đoán (bắt buộc) |
| `GEMINI_API_KEY` | khóa Gemini (tùy chọn; không có thì dùng lời chúc mẫu) |
| `GEMINI_MODEL` | tùy chọn, mặc định `gemini-2.5-flash` |
| `WIN_RATE` | tùy chọn, xác suất trúng giải tiền mỗi lượt (mặc định `0.3`) |
| `MAX_SPINS_PER_USER` | tùy chọn, lượt/tài khoản/dịp (mặc định `3`) |

Build: Framework **Vite**, Build Command `npm run build`, Output `dist` (Vercel tự nhận). Sau khi đặt biến → **Redeploy**.

## 3. Kiểm tra sau khi deploy
1. Mở trang → vào Admin, đăng nhập bằng `ADMIN_PASSWORD`.
2. Tab Giải thưởng: đổi ngân sách → số tiền hiển thị phải đổi ngay (và còn lại = ngân sách − đã trao).
3. Đăng nhập một tài khoản thường → "Lấy vé nhanh" → quay thử → kiểm tra Admin thấy vé/lượt trúng/claim.
4. Firestore Console: có các collection `ev_config`, `ev_tickets`, `ev_claims`, `spins`, …

## 4. Lưu ý vận hành
- Dữ liệu cũ trong `data/database.json` (nếu còn) **không** được chuyển sang Firestore; sự kiện bắt đầu lại từ cấu hình mặc định
  (ngân sách 500.000đ, 4 mức giải). Chỉnh lại trong tab Giải thưởng.
- Admin xem dữ liệu qua trang Admin (mật khẩu). Quyền admin của Firestore rules (đọc trực tiếp bằng client) yêu cầu
  email **đã xác minh** – đăng nhập bằng Google là đơn giản nhất.
- Hạn mức lượt quay tính theo tài khoản và dịp lễ, lưu ở `ev_players`. Vé do nhà trường phát (Admin → Phát vé) dùng 1 lần/vé.
- Thường xuyên bấm **Xuất CSV** trong Admin để sao lưu (gói Spark không có sao lưu tự động).
- Gói Spark: Firestore ~50.000 lượt đọc & 20.000 lượt ghi/ngày – dư cho sự kiện cấp trường; xem lại bảng giá hiện hành của Firebase/Vercel.
- Chạy thử trên máy: tạo `.env.local` (theo `.env.example`), đặt `GOOGLE_APPLICATION_CREDENTIALS` hoặc `FIREBASE_SERVICE_ACCOUNT`, rồi `npm install && npm run dev`.
- Đã xóa `bun.lock` (lỗi thời) – Vercel sẽ dùng `npm install`; commit `package-lock.json` sau lần `npm install` đầu.
