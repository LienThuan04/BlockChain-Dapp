# 📖 Hướng Dẫn Setup Dự Án BlockChain Marketplace

## 🎯 Yêu Cầu

Trước khi bắt đầu, đảm bảo bạn đã cài đặt:

- **Node.js** (v16 hoặc cao hơn): https://nodejs.org/
- **npm** (đi kèm với Node.js)
- **MySQL** (v8 hoặc cao hơn): https://www.mysql.com/
- **Git**: https://git-scm.com/

### Kiểm Tra Phiên Bản

```bash
node --version
npm --version
mysql --version
```

---

## 📋 Step 1: Clone & Install Dependencies

### 1.1 Clone Repository

```bash
git clone https://github.com/LienThuan04/BlockChain-Dapp.git
cd BlockChain-Dapp
```

### 1.2 Install Dependencies

```bash
npm install
```

**Lưu ý**: Nếu gặp lỗi liên quan đến peer dependencies, dùng:
```bash
npm install --legacy-peer-deps
```

---

## 🔧 Step 2: Cấu Hình Environment Variables

### 2.1 Tạo File `.env`

Copy file `.env.example` hoặc tạo file mới:

```bash
cp .env.example .env
```

### 2.2 Chỉnh Sửa `.env`

Mở file `.env` và cập nhật các giá trị sau:

```properties
# Server
NODE_ENV=development
PORT=8080
URL="http://localhost:8080"

# Database (MySQL)
DATABASE_URL="mysql://root:your_password@localhost:3306/NodeJS_Pro"

# PayPal Sandbox (lấy từ https://developer.paypal.com/)
PAYPAL_CLIENT_ID="your_sandbox_client_id"
PAYPAL_CLIENT_SECRET="your_sandbox_secret"

# Blockchain (Songbird/Coston Testnet)
NETWORK_RPC_URL="https://coston-api.flare.network/ext/bc/C/rpc"
CHAIN_ID=16
CONTRACT_ADDRESS="0x76A1F56a5a0a41f47eD6232e6605D795C4DcF153"

# Admin Wallet (for refunds)
ADMIN_WALLET_ADDRESS="0xeee8ba2b2774168aa7042cbd93ecde8d8cc7720f"
ADMIN_PRIVATE_KEY="your_admin_private_key"

# Other
PRICETOTALMORE=30000
```

**Các Thông Số Quan Trọng:**

| Tham Số | Mô Tả | Ví Dụ |
|---------|-------|-------|
| `PORT` | Port chạy server | `8080` |
| `DATABASE_URL` | Kết nối MySQL | `mysql://user:pass@localhost:3306/db` |
| `PAYPAL_CLIENT_ID` | Client ID Sandbox | `ASN...` (từ PayPal Developer) |
| `PAYPAL_CLIENT_SECRET` | Secret Sandbox | `EKI...` (từ PayPal Developer) |
| `ADMIN_WALLET_ADDRESS` | Ví admin (cho hoàn tiền crypto) | `0xeee8...` |
| `ADMIN_PRIVATE_KEY` | Private key admin | `8c86...` |

---

## 💾 Step 3: Cấu Hình Database

### 3.1 Tạo Database

```bash
# Vào MySQL command line
mysql -u root -p

# Trong MySQL:
CREATE DATABASE NodeJS_Pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 3.2 Chạy Prisma Migrations

```bash
# Tạo tables từ schema
npx prisma migrate deploy

# Hoặc nếu lần đầu:
npx prisma migrate dev --name init
```

### 3.3 Kiểm Tra Database

```bash
# Mở Prisma Studio để xem dữ liệu
npx prisma studio
```

---

## 🔑 Step 4: Cấu Hình PayPal Sandbox

### 4.1 Tạo PayPal Developer Account

1. Vào: https://developer.paypal.com/
2. Đăng nhập hoặc tạo account
3. Chọn **"Apps & Credentials"**

### 4.2 Lấy Sandbox Credentials

1. Chọn **"Sandbox"** environment (phía trên)
2. Tìm **"Default Application"** hoặc tạo app mới
3. Copy **Client ID** và **Secret**
4. Thay vào `.env`:
   ```properties
   PAYPAL_CLIENT_ID="your_client_id"
   PAYPAL_CLIENT_SECRET="your_secret"
   ```

### 4.3 Test Credentials

```bash
# Khởi động server
npm run dev

# Truy cập endpoint test
http://localhost:8080/debug/paypal
```

**Nếu thấy:**
```json
{
  "ok": true,
  "result": { "id": "...", "status": "CREATED" },
  "message": "PayPal credentials are valid and API is accessible"
}
```
✅ **Credentials OK!**

---

## 🌐 Step 5: Cấu Hình Blockchain

### 5.1 Network Settings

Dự án sử dụng **Songbird Testnet** (Flare Network):

```properties
NETWORK_RPC_URL="https://coston-api.flare.network/ext/bc/C/rpc"
CHAIN_ID=16
```

### 5.2 Tạo Wallet Admin

1. **Tạo wallet mới** (MetaMask, Hardhat, etc.)
2. **Lấy Private Key** (giữ bí mật!)
3. **Thêm vào `.env`:**
   ```properties
   ADMIN_WALLET_ADDRESS="0x..."
   ADMIN_PRIVATE_KEY="0x..."
   ```

### 5.3 Nhận Test Tokens

1. Vào: https://faucet.flare.network/
2. Nhập wallet address
3. Nhận test SGB tokens

---

## 🚀 Step 6: Khởi Động Server

### 6.1 Chạy Server

```bash
npm run dev
```

**Output mong đợi:**
```
🚀 Server is running on http://localhost:8080
✅ Connected to database
✅ [PAYPAL-CONFIG] Credentials loaded successfully
```

### 6.2 Truy Cập Website

1. Vào: http://localhost:8080
2. Tạo account mới
3. Đăng nhập

---

## 🧪 Step 7: Testing

### 7.1 Test Crypto Payment

1. Thêm sản phẩm vào cart
2. Chọn **"Thanh toán bằng Crypto"**
3. Connect MetaMask
4. Confirm transaction
5. Kiểm tra blockchain explorer

### 7.2 Test PayPal Payment

1. Thêm sản phẩm vào cart
2. Chọn **"Thanh toán bằng PayPal"**
3. Được chuyển hướng sang PayPal Sandbox
4. Đăng nhập Sandbox account
5. Approve payment
6. Được chuyển về website

### 7.3 Test Admin Panel

1. Vào: `http://localhost:8080/admin`
2. Đăng nhập với admin account
3. Xem orders, transactions, wallet

---

## 🛠️ Troubleshooting

### ❌ "Database connection failed"

**Giải pháp:**
- Kiểm tra MySQL running: `mysql -u root -p`
- Kiểm tra DATABASE_URL trong `.env`
- Chạy migrations: `npx prisma migrate deploy`

### ❌ "PayPal invalid_client"

**Giải pháp:**
- Kiểm tra Client ID/Secret đúng
- Đảm bảo là **Sandbox** credentials
- Truy cập `/debug/paypal` để test

### ❌ "MetaMask not connecting"

**Giải pháp:**
- Đảm bảo MetaMask extension cài đặt
- Switch sang **Songbird/Coston testnet**
- Có test tokens trong wallet

### ❌ "Port 8080 already in use"

**Giải pháp:**
```bash
# Thay đổi port trong .env
PORT=3000

# Hoặc kill process đang dùng port 8080
# Windows:
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Mac/Linux:
lsof -i :8080
kill -9 <PID>
```

### ❌ "npm install failed"

**Giải pháp:**
```bash
# Xóa node_modules
rm -rf node_modules package-lock.json

# Cài lại
npm install --legacy-peer-deps
```

---

## 📁 Cấu Trúc Dự Án

```
BlockChain-Dapp/
├── src/
│   ├── app.ts              # Express app
│   ├── config/             # Configuration files
│   │   ├── paypal.ts       # PayPal setup
│   │   ├── blockchain.ts   # Web3 setup
│   │   └── db.ts           # Database setup
│   ├── controllers/        # Business logic
│   │   ├── client/         # Client controllers
│   │   └── admin/          # Admin controllers
│   ├── routes/             # API routes
│   ├── services/           # Services/helpers
│   ├── middleware/         # Express middleware
│   ├── models/             # Prisma models
│   └── views/              # EJS templates
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── public/                 # Static files
│   ├── client/             # Client assets
│   └── admin/              # Admin assets
├── .env                    # Environment variables
├── package.json            # Dependencies
└── tsconfig.json           # TypeScript config
```

---

## 🔐 Security Checklist

- [ ] `.env` không commit vào Git
- [ ] Private keys giữ bí mật
- [ ] PayPal credentials chỉ dùng Sandbox khi dev
- [ ] Database password mạnh
- [ ] HTTPS khi deploy lên production
- [ ] Rate limiting cho APIs
- [ ] Input validation ở server

---

## 📚 Tài Liệu Tham Khảo

- **PayPal Docs**: https://developer.paypal.com/docs/
- **Prisma Docs**: https://www.prisma.io/docs/
- **Express Docs**: https://expressjs.com/
- **Web3.js Docs**: https://web3js.readthedocs.io/
- **Flare Network**: https://flare.network/

---

## 💡 Tips & Tricks

### Development Mode

```bash
# Watch for file changes
npm run dev

# TypeScript checking
npx tsc --noEmit
```

### Database

```bash
# View database GUI
npx prisma studio

# Reset database (⚠️ xóa tất cả dữ liệu)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

### Debugging

```bash
# Enable debug logs
DEBUG=* npm run dev

# View browser console (F12)
# View server console (terminal)
```

---

## 🆘 Cần Giúp?

Nếu gặp vấn đề:

1. **Kiểm tra server logs** để tìm error messages
2. **Xem browser console** (F12) để tìm frontend errors
3. **Kiểm tra `.env`** có đầy đủ variables không
4. **Chạy `npm run dev` lại** nếu code thay đổi
5. **Xóa cache** browser (Ctrl + Shift + Delete)

---

## ✅ Kiểm Tra Setup Hoàn Thành

- [ ] Node.js & npm cài đặt
- [ ] Dependencies cài đặt: `npm install`
- [ ] `.env` file tạo & cấu hình
- [ ] MySQL database tạo
- [ ] Prisma migrations chạy: `npx prisma migrate deploy`
- [ ] PayPal Sandbox credentials có
- [ ] `/debug/paypal` trả về `ok: true`
- [ ] Server chạy: `npm run dev`
- [ ] Website mở được: `http://localhost:8080`
- [ ] Có thể đăng nhập/đăng ký

---

**🎉 Chúc mừng! Setup hoàn tất. Happy coding!**
