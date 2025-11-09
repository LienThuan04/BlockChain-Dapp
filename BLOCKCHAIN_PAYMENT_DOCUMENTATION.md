# 📚 Tài liệu Chi tiết: Hệ thống Thanh toán bằng Blockchain (Cryptocurrency)

## 📋 Mục lục
1. [Tổng quan hệ thống](#tổng-quan)
2. [Quy trình thanh toán](#quy-trình-thanh-toán)
3. [Chi tiết từng hàm](#chi-tiết-từng-hàm)
4. [Database Models](#database-models)
5. [Luồng dữ liệu](#luồng-dữ-liệu)
6. [Xử lý Refund](#xử-lý-refund)

---

## 🔄 Tổng quan

Dự án này tích hợp hệ thống thanh toán bằng cryptocurrency (hiện tại hỗ trợ Ethereum, SGB, v.v.). 

**Các thành phần chính:**
- **Frontend**: MetaMask wallet (Web3.js v1.10.4)
- **Backend**: Node.js + Express (TypeScript)
- **Blockchain**: Ethereum-based networks (Coston testnet, Mainnet)
- **Database**: Prisma ORM + MySQL

**Luồng chung:**
```
Customer → MetaMask → Blockchain Transfer → Backend Confirmation → Database → Order Created
                                         ↓
                            CryptoTransaction Recorded
```

---

## 💳 Quy trình Thanh toán

### Quy trình 1: Thanh toán từ Trang Chi tiết Sản phẩm (Single Product)

```
1. Customer chọn sản phẩm → Click "Buy with Crypto"
2. Modal MetaMask popup
3. Customer nhập số tiền crypto
4. MetaMask sign transaction
5. Gửi transaction lên blockchain
6. Frontend nhận transactionHash
7. Frontend gọi API: POST /api/confirm-crypto-payment
   │
   └─> Backend xác minh
       │
       ├─ Check user auth
       ├─ Verify transaction on blockchain
       ├─ Get product info
       ├─ Get default variant
       ├─ Calculate final price = product.price + variant.priceMore
       ├─ Create Order (statusOrder: COMPLETED, paymentStatus: PAID)
       ├─ Create OrderDetail (sản phẩm + variant + giá)
       ├─ Record CryptoTransaction (lưu hash, số tiền, wallet, trạng thái)
       ├─ Update ProductVariant (stock -1, sold +1)
       ├─ Update Product (stock -1, sold +1)
       └─ Return success + orderId
8. Frontend nhận response
9. Thông báo success + redirect orders list
```

### Quy trình 2: Thanh toán từ Giỏ hàng (Checkout - Multiple Products)

```
1. Customer trong giỏ hàng → Click "Checkout"
2. Modal Checkout popup
3. Customer nhập địa chỉ giao hàng, thông tin
4. Chọn "Pay with Crypto"
5. MetaMask popup
6. Customer sign transaction
7. Frontend gọi API: POST /api/confirm-crypto-payment
   │
   └─> Backend xác minh (transaction)
       │
       ├─ Check user auth
       ├─ Validate transaction
       ├─ Create Order (statusOrder: PENDING, paymentStatus: PAID)
       │   - totalPrice = tổng giá từ tất cả items
       │   - paymentRef = transactionHash
       │
       ├─ Record CryptoTransaction
       │   - fromAddress = customer's wallet
       │   - toAddress = admin's wallet
       │   - amount = số token gửi
       │   - amountInFiat = giá tính bằng VND
       │   - status = SUCCESS
       │
       ├─ FOR EACH item in cartItems:
       │   ├─ Get cart detail
       │   ├─ Get product variant info
       │   ├─ Calculate final price
       │   ├─ Create OrderDetail (orderId, productId, variantId, qty, price)
       │   ├─ Update ProductVariant (stock -, sold +)
       │   ├─ Update Product (stock -, sold +)
       │   ├─ Update Cart quantity
       │   └─ Delete from cartdetail
       │
       └─ Return success + orderId
8. Frontend nhận response
9. Thông báo success + redirect
```

---

## 🔧 Chi tiết từng Hàm

### 📍 File: `crypto-payment.controller.ts`

#### **Hàm 1: `getAdminWallet()`**
```typescript
export const getAdminWallet = async (req: Request, res: Response)
```

**Mục đích:** Lấy địa chỉ ví admin để gửi tiền thanh toán

**Tham số:**
- `req`: HTTP request (không cần body)
- `res`: HTTP response

**Quy trình:**
```
1. Query database để tìm active wallet (isActive = true)
   └─ Nếu không có trong DB, dùng ADMIN_WALLET_ADDRESS từ .env
2. Kiểm tra wallet có tồn tại không
   ├─ Không → Trả về 500 error
   └─ Có → Trả về JSON { adminWallet: "0x..." }
```

**Return:**
```json
{
  "adminWallet": "0x76A1F56a5a0a41f47eD6232e6605D795C4DcF153"
}
```

**Sử dụng:** Frontend gọi khi load trang checkout để biết gửi tiền cho ai

---

#### **Hàm 2: `confirmCryptoPayment()` - Checkout (Multiple Products)**
```typescript
export const confirmCryptoPayment = async (req: Request, res: Response)
```

**Mục đích:** Xác nhận thanh toán từ giỏ hàng, tạo order với nhiều sản phẩm

**Tham số (Request Body):**
```typescript
{
  productId?: number,              // Nếu từ single product
  transactionHash: string,          // Hash transaction từ blockchain
  amount: string,                   // Số lượng token gửi
  currency: string,                 // Mã token (ETH, SGB, etc)
  receiverName: string,             // Tên người nhận
  receiverPhone: string,            // Điện thoại
  receiverAddress: string,          // Địa chỉ giao hàng
  receiverEmail?: string,           // Email
  receiverNote?: string,            // Ghi chú
  cartItems?: Array<{               // Danh sách items (từ giỏ hàng)
    id: number,                     // Cart detail ID
    productId: number,
    productVariantId: number,
    quantity: number
  }>,
  vndAmount: number,                // Tổng giá tính bằng VND
  fromAddress: string               // Wallet của customer
}
```

**Quy trình chi tiết:**

##### **Step 1: Xác thực người dùng**
```typescript
const userId = req.user?.id;
if (!userId) return 401 Unauthorized
```
- Kiểm tra user đã login
- Lấy `userId` từ JWT token

##### **Step 2: Xử lý Multiple Items (từ giỏ hàng)**
```typescript
if (cartItems && Array.isArray(cartItems) && cartItems.length > 0)
```

**2.1 Tạo Order trong transaction:**
```typescript
const newOrder = await prisma.order.create({
  data: {
    userId: userId,
    totalPrice: parseInt(vndAmount),          // Tổng giá VND
    receiverName: receiverName || '',
    receiverPhone: receiverPhone || '',
    receiverAddress: receiverAddress || '',
    receiverEmail: receiverEmail || '',
    receiverNote: receiverNote || '',
    statusOrder: 'PENDING',                   // Chờ xác nhận
    paymentMethod: 'CRYPTO',
    paymentStatus: 'PAID',                    // Đã thanh toán
    paymentRef: transactionHash               // Lưu hash
  }
});
```

| Field | Giá trị | Ý nghĩa |
|-------|--------|--------|
| `statusOrder` | PENDING | Đang chờ xác nhận từ admin |
| `paymentStatus` | PAID | Thanh toán đã xong (crypto đã gửi) |
| `paymentRef` | transactionHash | Tham chiếu blockchain |
| `totalPrice` | Tổng VND | Để tính chi phí logistics, báo cáo |

**2.2 Lưu CryptoTransaction (blockchain record):**
```typescript
await prisma.cryptoTransaction.create({
  data: {
    transactionHash: transactionHash,         // Hash từ blockchain
    fromAddress: req.body.fromAddress,        // Wallet khách hàng
    toAddress: toAddress,                     // Wallet admin
    amount: String(amount),                   // Số token (chuỗi để tránh mất chính xác)
    amountInFiat: Number(vndAmount),          // Giá VND
    status: 'SUCCESS',                        // Giao dịch thành công
    description: `Payment for order ${newOrder.id}`,
    orderId: newOrder.id,
    cryptoId: cryptoRecord.id                 // Loại token
  }
});
```

| Field | Giá trị | Ý nghĩa |
|-------|--------|--------|
| `status` | SUCCESS | Giao dịch blockchain thành công |
| `cryptoId` | ID token | Link đến bảng Cryptocurrency |
| `fromAddress` | User wallet | Địa chỉ khách hàng |
| `toAddress` | Admin wallet | Địa chỉ nhận tiền |

**2.3 Xử lý từng item trong giỏ hàng:**
```typescript
for (const item of cartItems) {
  // A. Lấy thông tin cart detail từ DB
  const cartItem = await prisma.cartdetail.findUnique({
    where: { id: parseInt(item.id) }
  });
  
  // B. Lấy thông tin variant (kiểm tra từ request hoặc DB)
  let variantId = parseInt(item.productVariantId);
  if (isNaN(variantId)) variantId = cartItem.productVariantId;
  
  const productVariant = await prisma.productVariant.findUnique({
    where: { id: variantId }
  });
  
  // C. Xác định productId
  const productId = productVariant?.productId || cartItem.productId;
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });
  
  // D. Tính giá cuối cùng
  const finalPrice = product.price + (productVariant?.priceMore || 0);
  
  // E. Tạo OrderDetail
  await prisma.orderDetail.create({
    data: {
      orderId: newOrder.id,
      productId: product.id,
      productVariantId: productVariant.id,
      quantity: cartItem.quantityProduct || 1,
      price: finalPrice                        // Giá = base + variant
    }
  });
  
  // F. Cập nhật stock variant
  if (productVariant) {
    await prisma.productVariant.update({
      where: { id: productVariant.id },
      data: {
        quantity: { decrement: cartItem.quantityProduct },
        sold: { increment: cartItem.quantityProduct }
      }
    });
  }
  
  // G. Cập nhật stock product
  await prisma.product.update({
    where: { id: product.id },
    data: {
      quantity: { decrement: cartItem.quantityProduct },
      sold: { increment: cartItem.quantityProduct }
    }
  });
  
  // H. Cập nhật giỏ hàng
  await prisma.cart.update({
    where: { id: cartItem.cartId },
    data: {
      quantity: { decrement: cartItem.quantityProduct }
    }
  });
  
  // I. Xóa khỏi cart detail
  await prisma.cartdetail.delete({
    where: { id: cartItem.id }
  });
}
```

**2.4 Return response:**
```json
{
  "success": true,
  "orderId": 123
}
```

##### **Step 3: Xử lý Single Product**
```typescript
if (productId)
```

Tương tự như trên nhưng:
- Chỉ lấy 1 product
- `statusOrder` = `COMPLETED` (không cần duyệt)
- Chỉ tạo 1 OrderDetail
- Lấy thông tin user mặc định nếu receiver info trống

---

### 📍 File: `eth-payment.controller.ts`

#### **Hàm: `confirmEthPayment()`**
```typescript
export const confirmEthPayment = async (req: Request, res: Response)
```

**Mục đích:** Xác nhận thanh toán Ethereum (không còn sử dụng, giữ cho tương thích ngược)

**Tham số:**
```typescript
{
  productId: number,
  transactionHash: string,
  blockNumber: number,
  ethAmount: string
}
```

**Quy trình:**
```
1. Verify transaction on blockchain using Web3.js
   └─ web3.eth.getTransaction(transactionHash)
2. Check nếu transaction không tồn tại → Return 400 error
3. Lấy ETH price (hardcoded = 2000 USD)
4. Tạo Order với thông tin:
   - totalPrice = ethAmount * ethPrice
   - paymentMethod = 'ETH'
   - Lưu txHash, ethAmount, ethPrice, blockNumber
5. Create OrderDetail
6. Update product stock
7. Return success + orderId
```

---

## 📊 Database Models

### **Model: CryptoTransaction**
```prisma
model CryptoTransaction {
  id              Int       @id @default(autoincrement())
  transactionHash String    @unique
  fromAddress     String    // Wallet khách hàng
  toAddress       String    // Wallet admin
  amount          String    // Số token (string để tránh mất độ chính xác)
  amountInFiat    Float     // Giá tính bằng VND/USD
  status          String    // SUCCESS, FAILED, PENDING, REFUNDED
  description     String?
  
  order           Order?    @relation(fields: [orderId], references: [id])
  orderId         Int?
  
  crypto          Cryptocurrency @relation(fields: [cryptoId], references: [id])
  cryptoId        Int
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

| Field | Kiểu | Ý nghĩa |
|-------|------|--------|
| `transactionHash` | String | Hash giao dịch blockchain (duy nhất) |
| `fromAddress` | String | Địa chỉ gửi (khách hàng) |
| `toAddress` | String | Địa chỉ nhận (admin) |
| `amount` | String | Số token gửi (string để tránh float mất chính xác) |
| `amountInFiat` | Float | Giá tính bằng tiền tệ thực |
| `status` | String | `SUCCESS` / `FAILED` / `PENDING` / `REFUNDED` |
| `orderId` | Int | Link đến Order |
| `cryptoId` | Int | Link đến Cryptocurrency |

**Statuses:**
- `SUCCESS`: Giao dịch thành công (lưu khi tạo order thành công)
- `REFUNDED`: Hoàn tiền (lưu khi admin hoàn lại tiền)
- `PENDING`: Đang chờ xác nhận (rất hiếm)
- `FAILED`: Giao dịch thất bại

### **Model: Cryptocurrency**
```prisma
model Cryptocurrency {
  id              Int       @id @default(autoincrement())
  name            String    @unique   // Bitcoin, Ethereum, Songbird
  code            String    @unique   // BTC, ETH, SGB
  symbol          String              // ฿, Ξ, ⚡
  priceVND        Float               // Giá VND (1 token = ?)
  chainName       String              // Bitcoin, Ethereum, Flare Coston
  rpcUrl          String              // RPC endpoint
  chainId         String              // 0x10 for Coston
  contractAddress String?             // Token contract (nếu là ERC-20)
  decimals        Int       @default(18)
  isActive        Boolean   @default(false)  // Token nào được enable
  description     String?
  
  cryptoTransactions CryptoTransaction[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### **Model: CryptoWallet**
```prisma
model CryptoWallet {
  id              Int       @id @default(autoincrement())
  walletAddress   String    @unique   // 0x...
  privateKey      String              // Private key (ảnh được mã hóa trong production)
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

---

## 📈 Luồng Dữ liệu

### **1. Khách hàng gửi tiền crypto**

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React/Vue)                                        │
│ 1. Get admin wallet: GET /api/admin-wallet                 │
│ 2. Show MetaMask modal                                      │
│ 3. User signs transaction                                  │
│ 4. POST /api/confirm-crypto-payment                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Blockchain (Ethereum/Flare/etc)                             │
│ 1. Transaction: Customer → Admin                           │
│ 2. Generate transactionHash                                │
│ 3. Mined in block                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend (Node.js)                                           │
│ 1. confirmCryptoPayment() nhận request                     │
│ 2. Verify transaction on blockchain                        │
│ 3. Create Order (statusOrder: PENDING, paymentStatus: PAID)│
│ 4. Create OrderDetails (từng sản phẩm)                    │
│ 5. Create CryptoTransaction (lưu blockchain record)        │
│ 6. Update stock (Product + ProductVariant)                 │
│ 7. Clear cart (delete cartdetails)                         │
│ 8. Return { success: true, orderId }                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Database (MySQL)                                            │
│ Tables Updated:                                             │
│ ├─ Order (new row)                                         │
│ ├─ OrderDetail (new rows for each item)                    │
│ ├─ CryptoTransaction (new row)                             │
│ ├─ Product (quantity -, sold +)                            │
│ ├─ ProductVariant (quantity -, sold +)                     │
│ └─ cartdetail (deleted rows)                               │
└─────────────────────────────────────────────────────────────┘
```

### **2. Database Relationships**

```
User (1) ──────────────── (N) Order
           ├─ id          ├─ userId
           └─ email       └─ totalPrice

Order (1) ──────────────── (N) OrderDetail
  ├─ id                    ├─ orderId
  └─ paymentRef            ├─ productId
                           └─ productVariantId

Order (1) ──────────────── (N) CryptoTransaction
  └─ id                    ├─ orderId
                           ├─ transactionHash
                           └─ fromAddress

CryptoTransaction (N) ──────────── (1) Cryptocurrency
  └─ cryptoId                      └─ id

Product (1) ──────────────── (N) ProductVariant
   ├─ id                    ├─ productId
   ├─ price                 ├─ priceMore (thêm vào price)
   └─ quantity              └─ quantity
```

---

## 💰 Xử lý Refund

### **Quy trình Hoàn tiền:**

**File:** `src/services/client/user.service.ts`

```typescript
export const CancelOrderById = async (orderId: number) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });
  
  if (order.paymentMethod === 'CRYPTO') {
    // 1. Tìm CryptoTransaction gốc
    const origTx = await prisma.cryptoTransaction.findFirst({
      where: { orderId: orderId }
    });
    
    // 2. Lấy wallet admin
    const activeWallet = await prisma.cryptoWallet.findFirst({
      where: { isActive: true }
    });
    const adminWallet = activeWallet?.walletAddress || process.env.ADMIN_WALLET_ADDRESS;
    
    // 3. Gọi Web3 để gửi tiền hoàn lại
    const web3 = new Web3(process.env.ETH_NODE_URL);
    const account = web3.eth.accounts.privateKeyToAccount(activeWallet.privateKey);
    
    // 4. Tạo transaction hoàn lại
    const txData = {
      to: origTx.fromAddress,                    // Gửi lại cho khách
      value: web3.utils.toWei(origTx.amount),   // Số tiền hoàn
      gas: 21000,
      gasPrice: await web3.eth.getGasPrice()
    };
    
    const signedTx = await account.signTransaction(txData);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    // 5. Cập nhật status CryptoTransaction gốc
    await prisma.cryptoTransaction.update({
      where: { id: origTx.id },
      data: { status: 'REFUNDED' }   // ← Ghi dấu đã hoàn tiền
    });
    
    // 6. Tạo CryptoTransaction record mới cho refund
    await prisma.cryptoTransaction.create({
      data: {
        transactionHash: receipt.transactionHash,
        fromAddress: adminWallet,
        toAddress: origTx.fromAddress,
        amount: origTx.amount,
        amountInFiat: origTx.amountInFiat,
        status: 'SUCCESS',
        description: `Refund for cancelled order ${orderId}`,
        orderId: orderId,
        cryptoId: origTx.cryptoId
      }
    });
  }
  
  // Update order status
  await prisma.order.update({
    where: { id: orderId },
    data: { 
      statusOrder: 'CANCELLED',
      paymentStatus: 'REFUNDED'
    }
  });
}
```

### **Trình tự hoàn tiền:**

```
1. Khách hàng yêu cầu hủy order
                ↓
2. Backend tìm CryptoTransaction gốc
                ↓
3. Kiểm tra có private key admin không
                ↓
4. Ký transaction hoàn tiền bằng private key
                ↓
5. Gửi transaction hoàn tiền lên blockchain
                ↓
6. Blockchain xác nhận (transaction success)
                ↓
7. Cập nhật CryptoTransaction gốc: status = 'REFUNDED'
                ↓
8. Tạo CryptoTransaction record mới cho hoàn tiền
                ↓
9. Update Order: statusOrder = 'CANCELLED', paymentStatus = 'REFUNDED'
                ↓
10. Admin Dashboard hiển thị "Đã hoàn tiền"
```

### **Database after refund:**

```
CryptoTransaction gốc (Thanh toán):
  transactionHash: 0x123...
  fromAddress: 0xCustomer...
  toAddress: 0xAdmin...
  amount: 1 ETH
  status: REFUNDED                    ← Đánh dấu đã hoàn

CryptoTransaction mới (Hoàn lại):
  transactionHash: 0x456...
  fromAddress: 0xAdmin...
  toAddress: 0xCustomer...
  amount: 1 ETH
  status: SUCCESS
  description: "Refund for cancelled order 123"
```

---

## 🔐 Bảo mật

### **⚠️ Cảnh báo**

1. **Private Key**: Hiện tại lưu plaintext trong DB - **NGUY HIỂM!**
   - ✅ Nên: Mã hóa bằng AES-256
   - ✅ Nên: Sử dụng AWS KMS / Azure Key Vault
   - ✅ Nên: Dùng hardware wallet (Ledger, Trezor)

2. **Transaction Verification**: Cần xác minh trên blockchain
   - ✅ Check `transaction.to === adminWallet`
   - ✅ Check `transaction.value >= expectedAmount`
   - ✅ Check transaction status = `success`

3. **Gas Price**: Web3 tự động estimate, nhưng nên set max
   - ✅ Đặt `maxGasPrice` để tránh overpay

4. **Rate Limiting**: Nên rate limit API endpoint
   - ✅ Max 5 payment requests/minute per user

---

## 🧪 Testing

### **Test Refund Flow:**
```bash
# 1. Create test order with crypto payment
POST /api/confirm-crypto-payment
Body: {
  "cartItems": [...],
  "transactionHash": "0x...",
  "fromAddress": "0xCustomerWallet",
  "amount": "1",
  "vndAmount": 50000000
}

# 2. Cancel order
POST /api/cancel-order/123

# 3. Check database
SELECT * FROM `crypto_transactions` WHERE orderId = 123;
```

**Expected result:**
- Original transaction: status = 'REFUNDED'
- New refund transaction: status = 'SUCCESS'
- Order: statusOrder = 'CANCELLED', paymentStatus = 'REFUNDED'

---

## 📞 Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-----------|---------|
| Transaction not found | Hash sai hoặc chưa mine | Kiểm tra blockchain.com |
| Cannot refund | Không có private key | Thêm wallet active |
| Wallet mismatch | Admin wallet sai | Update ADMIN_WALLET_ADDRESS |
| Gas estimation failed | Network quá tải | Thử lại sau |
| Amount precision lost | Float arithmetic | Dùng String cho amount |

---

## 📝 Tham khảo

- **Web3.js**: https://web3js.readthedocs.io/
- **Ethereum JSON-RPC**: https://eth.wiki/json-rpc/API
- **Prisma**: https://www.prisma.io/docs/
- **MetaMask**: https://docs.metamask.io/

---

**Cập nhật lần cuối:** November 9, 2025
**Phiên bản:** 1.0
