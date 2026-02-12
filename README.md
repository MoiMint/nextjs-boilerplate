# Blabla AI Command Simulator

## 1) Cài đặt

```bash
npm install
```

## 2) Cấu hình AI (Gemini)

Tạo file `.env.local`:

```bash
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

> Bạn có thể thay `YOUR_GEMINI_API_KEY` bằng key bạn đang dùng.

## 3) Chạy local

```bash
npm run dev
```

Mở: `http://localhost:3000`

## 4) Chạy chế độ online trong mạng LAN (máy khác truy cập được)

```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Sau đó dùng IP máy host (ví dụ `http://192.168.1.20:3000`) để truy cập từ máy khác.

## 5) Tài khoản mặc định

- Admin: `admin@blabla.ai`
- Password: `123456`

## 6) Kiến trúc dữ liệu online

- Dữ liệu được lưu trong `data/db.json` trên server.
- Bao gồm: `users`, `sessions`, `histories`, `posts`.
- Lịch sử đã tách theo `userId`, mỗi user chỉ xem lịch sử của mình.
- Tab Community cho phép các user tương tác bằng post chung.
