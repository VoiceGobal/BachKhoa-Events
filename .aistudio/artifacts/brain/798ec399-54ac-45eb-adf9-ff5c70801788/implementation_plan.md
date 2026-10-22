# Kế Hoạch Tái Cấu Trúc Toàn Diện: Bảo Mật Vòng Quay, Giao Dịch Backend Nguyên Tử & Kiến Trúc Module Chuẩn Mực

Kế hoạch này thiết lập kiến trúc backend-authoritative tuyệt đối cho hệ thống sự kiện và trao thưởng MoMo, siết chặt Firestore Rules, chuẩn hóa xác thực và rate-limit, đồng thời tái cấu trúc toàn diện codebase thành các module độc lập, dễ bảo trì và an toàn 100% trước khi triển khai với giải thưởng thật.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Các quyết định đã thống nhất với người dùng trong Phase 1:**
> - **Kiến trúc triển khai chính**: Cloud Run chạy Express backend kết nối Cloud Firestore bền vững làm Single Source of Truth cho toàn bộ dữ liệu.
> - **Chính sách xác thực người dùng**: Cho phép quay thưởng bằng mã vé nhà trường cấp (không bắt buộc đăng nhập), nhưng **bắt buộc đăng nhập và xác minh email Google (`email_verified: true`)** khi nộp thông tin nhận thưởng MoMo tiền mặt.
> - **Phạm vi tái cấu trúc**: Thực hiện tái cấu trúc toàn diện cả backend (router, service, middleware) và frontend (custom hooks, UI sub-components).

---

## 1. Overview & Core Concept

- **Mục tiêu**: Xóa bỏ hoàn toàn mọi lỗ hổng bảo mật do client-authoritative gây ra (khách tự sinh mã trúng, tự tạo claim, tự trừ kho giải, bypass lượt quay). Toàn bộ nghiệp vụ sinh kết quả, trừ tồn kho giải thưởng, ghi nhận vé và tạo mã claim được chuyển 100% vào backend với **Firestore Transactions** chống tranh chấp đồng thời (race condition).
- **Đối tượng sử dụng**: Học sinh, sinh viên, cán bộ giáo viên tham gia sự kiện ngày lễ (20/10, 20/11, Tết...) và Ban Giám Hiệu / Ban Quản Trị hệ thống trao thưởng MoMo của Trường Trung Cấp Công Nghiệp Bách Khoa Sầm Sơn – Thanh Hóa.
- **Giá trị cốt lõi**: An toàn tuyệt đối về ngân sách tài chính, minh bạch trong trao thưởng MoMo, bảo vệ quyền riêng tư cá nhân (PII), giao diện mượt mà và mã nguồn phân lớp chuyên nghiệp.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Quay số bằng mã vé (Không cần đăng nhập trước)**:
   - Người dùng nhập mã vé 8 ký tự (hoặc chọn vé từ trường cấp).
   - Bấm "Quay Số": Frontend gửi mã vé lên `/api/spin/play`.
   - Backend thực thi Transaction: kiểm tra vé hợp lệ, kiểm tra tồn kho các mức giải, tính xác suất giải thưởng, trừ kho 1 giải (nếu trúng tiền), cập nhật vé `isUsed = true`, sinh `claimCode` bảo mật và trả kết quả về client.
   - Vòng quay trên màn hình quay và dừng chính xác ở ô do backend chỉ định.

2. **Quy trình nhận thưởng MoMo (Bắt buộc xác minh email)**:
   - Nếu trúng tiền mặt MoMo, mở modal nhận thưởng.
   - Người dùng được yêu cầu đăng nhập tài khoản Google và xác minh email.
   - Backend xác thực token Firebase: nếu `email_verified !== true`, từ chối nhận thưởng và yêu cầu xác minh email.
   - Thông tin số điện thoại MoMo và họ tên được lưu với trạng thái `pending` để Admin phê duyệt.

3. **Tra cứu giải thưởng công khai (Ẩn dữ liệu PII)**:
   - Khi tra cứu danh sách người trúng giải hoặc mã claim, số điện thoại được che giấu (`098****321`), họ tên được ẩn một phần (`N*** V*** A***`) để bảo vệ dữ liệu cá nhân.

4. **Cổng Quản Trị Hệ Thống MoMo**:
   - Chỉ cho phép Admin chính thức (`tuancuong241298@gmail.com` hoặc tài khoản trong collection `admins/`) đăng nhập.
   - Quản trị viên duyệt hồ sơ, điền mã giao dịch MoMo thật, thu hồi vé hoặc cấu hình ngân sách/giải thưởng thông qua backend API được bảo vệ nghiêm ngặt.

### Interactive Feedback & Visual Design
- Tiếp tục tuân thủ Anti-AI Slop và thiết kế tinh tế: không sử dụng pill badges bừa bãi, typographic hierarchy rõ ràng với font Serif tiêu đề và Sans-serif nội dung, hiệu ứng âm thanh dịu nhẹ, chuyển động vòng quay mượt mà với kim chỉ rung động cơ học.
- Nút "Lên đầu trang" hiển thị linh hoạt khi cuộn trang, menu đa tầng có thể mở rộng/thu gọn và đóng tự động khi click ra ngoài.

---

## 3. Key Product Decisions & Trade-Offs

### Quyết định 1: Loại bỏ hoàn toàn Client-authoritative Spin & Claim Fallback
- **Cách tiếp cận**: Xóa bỏ `executeClientSpin` và việc client tự ghi vào collection `claims` hay `prize_tiers`. Mọi request phải đi qua Express API. Nếu backend mất kết nối, hiển thị thông báo lỗi thân thiện thay vì để client tự biên tự diễn kết quả trúng tiền.
- **Lý do**: Ngăn chặn triệt để nguy cơ người dùng can thiệp DevTools để tự tạo mã claim 100.000đ giả mạo rút cạn ngân sách nhà trường.

### Quyết định 2: Firestore Transactions cho mọi giao dịch Kho & Vé
- **Cách tiếp cận**: Sử dụng `firestore.runTransaction()` trong Node.js backend. Trong transaction:
  1. Đọc document vé và document các mức giải `prize_tiers`.
  2. Xác nhận vé chưa dùng và mức giải còn `remainingQuantity > 0`.
  3. Cập nhật vé `isUsed: true`, trừ `remainingQuantity = remainingQuantity - 1`.
  4. Tạo document `claims/{claimId}` với status `pending`.
- **Lý do**: Giải quyết triệt để vấn đề 2 người cùng quay trúng giải đặc biệt cuối cùng tại cùng một microsecond, đảm bảo không bao giờ bị âm tồn kho giải thưởng.

### Quyết định 3: Siết chặt tuyệt đối Firestore Security Rules
- **Cách tiếp cận**:
  - `claims`: `allow create, update, delete: if false;` đối với mọi client (kể cả đã đăng nhập). Chỉ backend server sử dụng Firebase Admin SDK hoặc service role mới được phép ghi nhận và cập nhật claim. Client chỉ có quyền `get` / `list` claim do chính `userId` của mình tạo.
  - `prize_tiers` & `event_config`: `allow write: if false;` từ client. Mọi điều chỉnh từ Cổng Quản Trị phải gửi lên endpoint `/api/admin/*` với token xác thực của admin.
  - Loại bỏ hoàn toàn email khách hoặc email test khỏi rules.

### Quyết định 4: Sửa lỗi rewrite Vercel và phân tách môi trường
- **Cách tiếp cận**: Cập nhật `vercel.json` để chỉ rewrite các trang web SPA, không rewrite các đường dẫn `/api/*` thành `index.html`. Với backend Cloud Run, client cấu hình biến môi trường `VITE_API_BASE_URL` (nếu tách domain) hoặc proxy trong dev.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (SPA)                              │
│                                                                        │
│   ┌────────────────────┐     ┌─────────────────────┐     ┌───────────┐ │
│   │    LuckyWheel      │     │  ClaimRewardModal   │     │ AdminModal│ │
│   │ (useLuckyWheel hook)│     │  (Email Verified)   │     │ (useAdmin)│ │
│   └─────────┬──────────┘     └──────────┬──────────┘     └─────┬─────┘ │
└─────────────┼───────────────────────────┼──────────────────────┼───────┘
              │ POST /api/spin/play       │ POST /api/claim      │ /api/admin/*
              │ (Ticket + Rate Limit)     │ (Auth Token verified)│ (Admin Auth)
              ▼                           ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS BACKEND (Cloud Run)                     │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Middleware Layer: Rate Limiter, CORS, Auth & Email Verification│   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────┴────────────────────────────────┐   │
│   │ Routers: spinRouter.ts │ claimRouter.ts │ adminRouter.ts       │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────┴────────────────────────────────┐   │
│   │ PrizeEngine & Transaction Service (runTransaction)             │   │
│   │ - Ticket validation & lock                                     │   │
│   │ - Inventory check & atomic decrement                           │   │
│   │ - Secure claim code generation & PII Masking                   │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ Backend Admin SDK
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        GOOGLE CLOUD FIRESTORE                          │
│                                                                        │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────┐   │
│   │    tickets    │ │  prize_tiers  │ │    claims     │ │event_cfg │   │
│   │(Server update)│ │ (Atomic lock) │ │ (Server only) │ │(Admin API)   │
│   └───────────────┘ └───────────────┘ └───────────────┘ └──────────┘   │
│   [Firestore Rules: Client WRITE = FALSE on all sensitive collections] │
└────────────────────────────────────────────────────────────────────────┘
```

### Module Refactoring Plan

#### Backend Structure (`server/`):
- `server/server.ts`: Khởi chạy Express, mount middlewares và routes.
- `server/middleware/rateLimiter.ts`: Giới hạn tần suất gọi API (chống spam spin, brute-force ticket).
- `server/middleware/authMiddleware.ts`: Kiểm tra Firebase Auth token, bắt buộc `email_verified: true`, kiểm tra quyền Admin.
- `server/services/firestoreAdmin.ts`: Khởi tạo Firebase Admin SDK với Firestore database `(default)`.
- `server/services/prizeEngine.ts`: Logic quay số ngẫu nhiên theo trọng số xác suất, xử lý transaction trừ kho giải và khóa vé.
- `server/routes/spinRoutes.ts`: Các endpoint `/api/spin/check-ticket`, `/api/spin/play`, `/api/spin/claim-ticket`, `/api/spin/public-tickets`.
- `server/routes/claimRoutes.ts`: Các endpoint `/api/spin/submit-claim`, `/api/spin/claim-info` (có PII masking).
- `server/routes/adminRoutes.ts`: Các endpoint `/api/admin/event-data`, `/api/admin/update-prize-pool`, `/api/admin/update-budget`, `/api/admin/update-claim`, `/api/admin/generate-tickets`.
- `server/routes/geminiRoutes.ts`: `/api/gemini/generate-wish` với Gemini 3.8 Flash, `thinkingLevel: LOW` và timeout 25s.

#### Frontend Structure (`src/`):
- `src/hooks/useLuckyWheel.ts`: Quản lý toàn bộ state quay số, âm thanh tick, tính góc quay toán học, gọi backend API.
- `src/components/wheel/`:
  - `WheelCanvas.tsx`: Vẽ và animate vòng quay 8 cánh.
  - `TicketInputBox.tsx`: Ô nhập mã vé, kiểm tra trạng thái vé và nút quay số.
  - `WinningCelebrationModal.tsx`: Popup chúc mừng khi trúng giải và nút mở nhận thưởng.
- `src/hooks/useAdminDashboard.ts`: Quản lý fetch data, lưu cấu hình mức thưởng, duyệt trao thưởng MoMo.
- `src/components/admin/`:
  - `AdminClaimsTab.tsx`, `AdminPrizesTab.tsx`, `AdminTicketsTab.tsx`, `AdminAuditLogsTab.tsx`.

---

## 5. Security & Concurrency Verification Plan

1. **Kiểm thử Firestore Rules**:
   - Sử dụng client token thường cố tình gọi `setDoc(doc(db, 'claims', 'fake-claim'))` -> Kết quả mong đợi: `PERMISSION_DENIED`.
   - Cố tình gọi `updateDoc(doc(db, 'prize_tiers', 'tier-100k'))` từ client -> Kết quả: `PERMISSION_DENIED`.
2. **Kiểm thử Concurrency & Race Condition**:
   - Tạo script giả lập 10 requests cùng lúc sử dụng cùng 1 mã vé `/api/spin/play` -> Chỉ duy nhất 1 request thành công, 9 requests còn lại nhận lỗi "Vé đã được sử dụng".
   - Giả lập 20 requests quay số tranh chấp 1 giải thưởng cuối cùng (`remainingQuantity: 1`) -> Chỉ 1 người trúng giải, kho về 0, 19 người còn lại chuyển sang ô lời chúc hoặc giải khác, tồn kho không bao giờ bị âm.
3. **Kiểm thử Xác minh Email**:
   - Gửi yêu cầu nhận thưởng với tài khoản chưa xác minh email (`email_verified: false`) -> Backend trả về lỗi 403 yêu cầu xác minh email trước.
