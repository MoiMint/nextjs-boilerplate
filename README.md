# Blabla AI Command Simulator

## 1) Cài đặt

```bash
npm install
```

## 2) Cấu hình AI (Gemini)

Tạo file `.env.local`:

```bash
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODELS=gemini-2.0-flash,gemini-1.5-flash-latest,gemini-1.5-flash
SESSION_SECRET=replace-with-random-secret
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

> Nếu gặp lỗi model not found, hãy đổi thứ tự hoặc thay model trong `GEMINI_MODELS`.

- API AI hiện tự động thử nhiều model và cả `v1beta`/`v1` để tránh lỗi `model not found`.


### Lưu trữ production không bị mất dữ liệu (Vercel)
- Kết nối Vercel KV (Upstash) và set env:
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
- Khi có 2 biến này, app sẽ ưu tiên lưu toàn bộ DB vào KV thay vì file local.
- Điều này giúp tránh mất dữ liệu/sess/chat khi Vercel scale hoặc restart instance.

## 3) Chạy local

```bash
npm run dev
```

Mở: `http://localhost:3000`

## 4) Chạy trong LAN (máy khác cùng mạng truy cập)

```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Sau đó dùng IP máy host (ví dụ `http://192.168.1.20:3000`) để truy cập từ máy khác.

## 5) Muốn truy cập không cần chung mạng (internet)

### Cách nhanh nhất: deploy lên Vercel
1. Push code lên GitHub.
2. Vào Vercel -> Add New Project -> import repo.
3. Trong Project Settings -> Environment Variables, thêm:
   - `GEMINI_API_KEY`
   - `GEMINI_MODELS`
4. Deploy.
5. Bạn sẽ có domain dạng `https://ten-du-an.vercel.app`.

### Gắn domain riêng
1. Mua domain ở Cloudflare/Namecheap/GoDaddy.
2. Trong Vercel -> Domains -> Add domain (ví dụ `blabla.ai`).
3. Tạo DNS record theo hướng dẫn Vercel (A/CNAME).
4. Chờ DNS propagate, sau đó truy cập domain riêng.

## 6) Tài khoản mặc định

- Admin: `admin@blabla.ai`
- Password: `123456`

## 7) Kiến trúc dữ liệu online

- Dữ liệu được lưu trong `data/db.json` trên server.
- Bao gồm: `users`, `sessions`, `histories`, `posts`.
- Lịch sử đã tách theo `userId`, mỗi user chỉ xem lịch sử của mình.
- Tab Community cập nhật liên tục theo polling 3 giây/lần.


## 8) Khắc phục lỗi đăng nhập/đăng ký khi deploy online

- Nguyên nhân phổ biến: môi trường deploy không cho ghi file vĩnh viễn.
- Phiên bản hiện tại đã có fallback in-memory để tránh crash khi không ghi được file.
- Nếu cần dữ liệu bền vững production, nên chuyển sang Postgres/Supabase/Neon.



## 9) Dashboard & Khoá học AI

- Sau khi đăng nhập, người dùng vào Dashboard với các chỉ số:
  - điểm trung bình,
  - số ngày đăng nhập,
  - chuỗi đăng nhập,
  - số khoá học đã hoàn thành.
- Tab Courses gồm 3 lộ trình:
  - Prompt Master,
  - Clean Prompt Arena,
  - AI Auditor & Agent Architect.
- Mỗi khoá học có nhiều bước, có phần hỏi/trao đổi với AI và đánh giá cuối khoá.


## 10) Lộ trình học trong app
- Prompt Master: nhiều khóa học, mỗi khóa có đề bài/chủ đề/mẫu/thực hành và chấm bởi AI thật.
- Clean Prompt Arena: có challenge theo tuần + leaderboard theo Accuracy/Tokens.
- AI Auditor: người dùng phát hiện lỗi sai/ảo giác và viết prompt sửa, AI chấm điểm.
