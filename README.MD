# 📚 Tài liệu Chi Tiết — Luồng gọi hàm khi Thanh toán bằng CRYPTO

Mục tiêu của tài liệu này là mô tả theo thứ tự các hàm (frontend → backend → dịch vụ → DB → blockchain) được gọi khi
người dùng bấm nút "Thanh toán" bằng phương thức CRYPTO trên trang Checkout (nhiều sản phẩm) hoặc nút "Buy with Crypto" trên trang Product (một sản phẩm).

Tài liệu tập trung vào luồng gọi hàm thực tế — tên hàm, file tham chiếu, và mô tả ngắn về nhiệm vụ của từng hàm theo trình tự thực thi.

Lưu ý: tên hàm và đường dẫn dựa trên cấu trúc hiện tại của dự án. Nếu bạn đổi tên file/hàm trong repo, hãy đối chiếu lại.

---

## Tóm tắt luồng cao cấp

1. Frontend: người dùng chọn `CRYPTO` và bấm nút thanh toán → frontend xử lý MetaMask, ký và gửi giao dịch.
2. Frontend nhận `transactionHash` → gọi API backend `POST /api/confirm-crypto-payment` (hoặc tương tự) kèm payload gồm `cartItems`, `vndAmount`, `transactionHash`, `fromAddress`, `amount`, `currency`.
3. Backend: xác thực user, xác minh giao dịch trên blockchain (Web3), tạo Order/OrderDetail, lưu CryptoTransaction, cập nhật kho và trả về kết quả.

---

## Luồng chi tiết theo thứ tự hàm (CRYPTO Checkout - nhiều sản phẩm)

Sau đây là sequence các hàm (frontend → server) — từ khi bấm nút CRYPTO cho tới khi order được tạo và lưu transaction:

1) Frontend: form submit / button handler
  - Vị trí: `public/client/js/...` hoặc trong template `checkout.ejs`
  - Hàm/handler: (tùy implementation) thường là sự kiện `submit` trên form hoặc `click` handler cho nút `#btnCheckoutPay` khi `paymentMethod === 'CRYPTO'`.
  - Nhiệm vụ: ngăn form gửi mặc định, kiểm tra MetaMask/Wallet trạng thái, gọi routine thanh toán crypto.

2) Frontend: init wallet & request accounts
  - File: `public/client/js/crypto-payment.js`
  - Hàm: `initWeb3()`
  - Nhiệm vụ: phát hiện MetaMask (window.ethereum), tạo `web3` instance, gọi `ethereum.request({ method: 'eth_requestAccounts' })` hoặc `web3.eth.getAccounts()` để lấy `fromAddress` (user wallet). Nếu không có MetaMask, hiển thị modal cài đặt.

3) Frontend: convert and display crypto amount (UX)
  - File: `public/client/js/crypto-payment.js` & view templates (`cart.ejs`, `checkout.ejs`)
  - Hàm: `convertVNDtoSGB()` (client helper) — tùy tên ở file client
  - Nhiệm vụ: chuyển `vndAmount` sang token amount theo `cryptoRate` (show cho user trước khi ký tx).

4) Frontend: prepare & send transaction via Web3/MetaMask
  - File: `public/client/js/crypto-payment.js`
  - Hàm: `sendCryptoPayment()` (hoặc inline handler) — sử dụng `web3.eth.sendTransaction` hoặc gọi contract `transfer(...)` nếu ERC20
  - Nhiệm vụ: build transaction (to = adminWallet, value hoặc token transfer), gọi `ethereum.request({ method: 'eth_sendTransaction', params: [...] })` hoặc `web3.eth.sendSignedTransaction(...)` nếu có signature
  - Kết quả: trả về `transactionHash` khi giao dịch được broadcast (thường trước khi mined).

5) Frontend: POST confirm request to backend
  - Endpoint: `POST /api/confirm-crypto-payment` (the doc and routes indicate this endpoint)
  - Payload: {
     cartItems, vndAmount, transactionHash, amount (token), currency (SGB/ETH), fromAddress, receiverName, receiverPhone, receiverAddress, ...
    }
  - Hàm: `confirmCryptoPaymentClient()` (in client script) or direct XHR/fetch call

6) Backend controller: receive confirm request
  - File: `src/controllers/crypto-payment.controller.ts` (or similar; doc refers to `crypto-payment.controller.ts`)
  - Handler function: `confirmCryptoPayment(req, res)`
  - Nhiệm vụ:
    - Lấy user (req.user) — kiểm tra authentication
    - Parse payload: `transactionHash`, `cartItems`, `vndAmount`, `fromAddress`, `amount`, `currency`.

7) Backend service: verify transaction on blockchain
  - File: a service using Web3 (could be in `services/crypto` or an on-chain helper)
  - Hàm: `verifyTransaction(transactionHash, expectedToAddress, expectedAmount, network)`
  - Nhiệm vụ: sử dụng `web3.eth.getTransaction` / `web3.eth.getTransactionReceipt` để
    - Check the transaction exists
    - Ensure `to` matches admin wallet
    - Ensure `value` or token transfer amount >= expected token amount
    - Optionally check confirmations or receipt.status === true
  - Nếu verification fail → return 4xx with message (frontend should show error)

8) Backend: fetch active crypto metadata and admin wallet
  - File / functions referenced in repo:
    - `getActiveCryptoInfo()` — returns `{ priceVND, decimals, code, ... }` (in `src/services/crypto/crypto.service.ts`)
    - `getAdminWallet()` — returns admin receiving address (either from DB CryptoWallet or fallback `ADMIN_WALLET_ADDRESS` env)
  - Nhiệm vụ: ensure we used the right token (SGB) and the admin wallet matches expected receiver

9) Backend: create Order (within DB transaction)
  - File: likely within `src/services/client/order.service.ts` or inside `confirmCryptoPayment` controller using prisma
  - Hàm: `createOrderForCrypto(userId, cartItems, totalVnd, paymentRef, receiverInfo)` (conceptual)
  - Nhiệm vụ:
    - Create `Order` record with fields: `userId`, `totalPrice: vndAmount`, `paymentMethod: 'CRYPTO'`, `paymentStatus: 'PAID'`, `paymentRef: transactionHash`, `statusOrder: 'PENDING'` (or `COMPLETED` for single-product flow)

10) Backend: record CryptoTransaction
   - Model: `CryptoTransaction` (Prisma model) — see schema in repo
   - Hàm: `createCryptoTransaction({ transactionHash, fromAddress, toAddress, amount, amountInFiat, status, orderId, cryptoId })`
   - Nhiệm vụ: persist blockchain record for auditing/reporting

11) Backend: create OrderDetails and update stock
   - For each cart item:
    - Determine variant and final price (product.price + variant.priceMore)
    - Create `OrderDetail` row
    - Update `ProductVariant` quantity & `sold`
    - Update `Product` quantity & `sold`
    - Remove cartdetail row from user's cart
   - These updates should be performed inside the same DB transaction when possible to avoid inconsistencies

12) Backend: commit transaction and respond
   - Return `{ success: true, orderId: newOrder.id }` (or error). Frontend will display success and redirect to order history

13) Frontend: post-confirm handling
   - On success, frontend shows confirmation and redirects user to orders list / detail page
   - On failure, show error and allow retry

---

## Các hàm/đơn vị chính (tập trung) — mapping tên thực tế trong repo

- `initWeb3()` — front-end helper to detect MetaMask and obtain accounts (`public/client/js/crypto-payment.js`).
- `convertVNDtoSGB(vndAmount)` — front-end helper show estimated token amount (client UI conversion).
- `sendCryptoPayment()` / `sendTransaction()` — front-end routine that calls MetaMask / web3 to broadcast the transaction and returns `transactionHash`.
- `POST /api/confirm-crypto-payment` → `confirmCryptoPayment(req, res)` — backend controller that coordinates verification and order creation (`src/controllers/crypto-payment.controller.ts` or equivalent).
- `verifyTransaction(transactionHash, expectedTo, expectedAmount)` — backend web3 helper to inspect on-chain tx and receipt.
- `getAdminWallet()` — returns active admin wallet (`src/controllers/crypto-payment.controller.ts` or `src/services/crypto/...`).
- `getActiveCryptoInfo()` — returns active `Cryptocurrency` row (priceVND, decimals, code).
- `convertVndToCrypto(amountVND, priceVND, decimals, displayDecimals)` — server-side helper to convert VND -> crypto (used to populate cart/checkout views consistently).
- `createOrderForCrypto(...)` (conceptual) — service that creates Order and OrderDetails, updates stock, and returns created `orderId`.
- `createCryptoTransaction(...)` — service inserting `CryptoTransaction` record in DB.
- `CancelOrderById(orderId, user)` — service that may attempt refunds (if order.paymentMethod === 'CRYPTO') and now returns a detailed refund result object.

### MetaMask / Web3 Call Sites (repo mapping)

Dưới đây là những nơi trong repo trực tiếp gọi MetaMask / provider (window.ethereum) hoặc dùng Web3 để gửi/gọi giao dịch, cùng đoạn mã trích dẫn để bạn dễ tham khảo và copy/paste.

- File: `public/client/js/crypto-payment.js`
  - `checkAndInstallMetaMask()` — hiển thị modal cài MetaMask nếu không có.
  - `initWeb3()` — tạo `web3` từ `window.ethereum`, gọi `eth_requestAccounts`, lấy `userAccount`, và gọi `wallet_switchEthereumChain` để chuyển sang Coston.
    ```js
    web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const accounts = await web3.eth.getAccounts();
    userAccount = accounts[0];
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x10' }] });
    ```

  - `convertVNDtoSGB(vndAmount)` — helper chuyển VND -> SGB (client-side display):
    ```js
    function convertVNDtoSGB(vndAmount) {
        return (parseInt(vndAmount) / VND_TO_SGB_RATE).toFixed(6);
    }
    ```

  - `showCryptoPaymentModal(options)` — dựng modal thanh toán, attach event listener cho nút xác nhận, truyền `adminWallet`, `weiValue`, `cartItems`, v.v.

  - `confirmCheckoutCryptoPayment(adminAddress, weiValue, vndAmount, ...)` — hàm chính gửi tx và confirm với server. Gửi giao dịch qua MetaMask bằng `eth_sendTransaction`:
    ```js
    const params = [{ from: userAccount, to: adminAddress, value: web3.utils.toHex(weiValue) }];
    txHash = await window.ethereum.request({ method: 'eth_sendTransaction', params });
    // fallback:
    const receipt = await web3.eth.sendTransaction({ from: userAccount, to: adminAddress, value: weiValue });
    txHash = receipt && (receipt.transactionHash || receipt);
    ```

  - Sau khi có `txHash`, hàm gọi API xác nhận với server (ví dụ `/api/crypto/confirm-payment`):
    ```js
    await fetch('/api/crypto/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ transactionHash: txHash, amount: ..., fromAddress: userAccount, vndAmount: ... })
    });
    ```

- File: `src/views/client/product/payment-section.ejs` and `src/views/client/product/checkout.ejs`
  - Template may include inlined calls to the client scripts and use data-attributes to pass `TotalPrice`, `cryptoRate`, etc. The client JS reads these attributes to compute `priceInSGB`.

- Routes / Server handlers that client calls:
  - `GET /api/get-admin-wallet` → `getAdminWallet` (server) — File: `src/controllers/ClientAPI/crypto-payment.controller.ts`.
    ```ts
    const activeWalletRecord = await prisma.cryptoWallet.findFirst({ where: { isActive: true } });
    const adminWallet = activeWalletRecord?.walletAddress || process.env.ADMIN_WALLET_ADDRESS;
    res.json({ adminWallet });
    ```

  - `POST /api/crypto/confirm-payment` and `POST /api/orders/confirm-crypto-payment` → `confirmCryptoPayment` (server) — same controller `src/controllers/ClientAPI/crypto-payment.controller.ts`.

    Important: current implementation in the controller records the crypto transaction and creates orders immediately without calling a server-side on-chain verification helper. Recommended improvement is to add `verifyTransaction(transactionHash, expectedTo, expectedAmount)` (server-side Web3) BEFORE creating the Order.

### Recommended server-side verifyTransaction (example)

Add a server helper (e.g., `src/services/crypto/onchain.service.ts`) to verify tx on-chain before persisting the order. Example conceptual code:

```js
// pseudo-code
async function verifyTransaction(web3, txHash, expectedTo, expectedWei) {
  const tx = await web3.eth.getTransaction(txHash);
  if (!tx) throw new Error('Transaction not found');
  if ((tx.to || '').toLowerCase() !== expectedTo.toLowerCase()) throw new Error('Recipient mismatch');
  // if native tx: compare tx.value (hex) with expectedWei
  // for token transfers, parse logs or call getTransactionReceipt and inspect logs
  const receipt = await web3.eth.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== true) throw new Error('Transaction not successful');
  return { tx, receipt };
}
```

Bạn có thể gọi helper này at the top of `confirmCryptoPayment` and only proceed to create the Order when verification passes.

---
---

## Hoàn tiền (Refund) — gọi hàm theo thứ tự

Khi admin hoặc user trigger cancel-order cho đơn đã thanh toán bằng crypto, sequence hàm thường là:

1. Controller endpoint: `POST /api/cancel-order/:id` → handler `PostCancelOrder(req, res)` in `src/controllers/client/client.controller.ts`
2. Service: `CancelOrderById(orderId, user)` (in `src/services/client/user.service.ts`)
  - Trước hết xác định `order.paymentMethod` và `order.paymentStatus`.
3. Nếu `paymentMethod === 'CRYPTO'` và trạng thái phù hợp → tìm `CryptoTransaction` gốc liên quan.
4. Tìm admin active wallet / private key (`getAdminWallet()` / `getActiveAdminWalletWithPrivateKey()`)
5. Ký tx hoàn tiền và gửi lên mạng (Web3) → `sendSignedTransaction(signedTx)` (thực hiện hoàn tiền on-chain)
6. Ghi một bản `CryptoTransaction` mới cho refund, cập nhật `CryptoTransaction` gốc trạng thái `REFUNDED`, và cập nhật `Order` (`statusOrder = 'CANCELLED'`, `paymentStatus = 'REFUNDED'`).
7. Trả về object chi tiết: `{ attempted: true|false, method: 'CRYPTO'|null, success: boolean, txHash?: string, message?: string }`.

---

## Lưu ý vận hành và kiểm tra

- Luôn verify on-chain: kiểm tra `to` address === admin wallet, `amount` >= expected.
- Giữ định dạng `amount` token dưới dạng `string` để tránh mất precision.
- Thực hiện các thao tác tạo đơn/ghi transaction/update stock trong cùng transaction DB khi có thể.
- Không lưu private key plaintext trong repo/DB production. Dùng KMS / Vault.

---

Nếu bạn muốn, tôi có thể:
- Liệt kê chính xác tên hàm trong từng file (scan repo và tạo mapping chính xác), hoặc
- Chạy search để chèn đường dẫn file và tên hàm chính xác vào mọi bước để tài liệu trở nên “clickable” (với đường dẫn file).

Bạn muốn tôi tiếp tục và tự động map mọi hàm thực tế trong repo (tên file + hàm)?
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

### **Quy trình Hoàn tiền (tóm tắt):**

**File:** `src/services/client/user.service.ts`

Dịch vụ `CancelOrderById` chỉ cố gắng thực hiện hoàn tiền khi phù hợp (chủ yếu cho các đơn thanh toán bằng crypto). Các điểm chính:

- Chỉ thực hiện hoàn tiền khi `order.paymentMethod === 'CRYPTO'` và `order.paymentStatus` là `PAID` hoặc `PAYMENT_PAID`.
- Hàm giờ trả về một đối tượng kết quả hoàn tiền có cấu trúc (thay vì boolean). Đối tượng này bao gồm các trường như `attempted` (đã cố gắng hay chưa), `method` (phương thức), `success` (thành công hay không), `txHash` (nếu có), và `message` (thông điệp) để frontend có thể hiện thông báo rõ ràng.

Ví dụ giá trị trả về:

1) Hoàn tiền crypto thành công

```json
{
  "attempted": true,
  "method": "CRYPTO",
  "success": true,
  "txHash": "0xabc123...",
  "message": "Đã hoàn tiền tới 0xCustomer..."
}
```

2) Không thực hiện hoàn tiền (không phải crypto hoặc trạng thái không phù hợp)

```json
{
  "attempted": false,
  "method": null,
  "success": false,
  "txHash": null,
  "message": "Không thực hiện hoàn tiền: paymentMethod != CRYPTO hoặc paymentStatus không phải PAID"
}
```

Tóm tắt cách hoạt động:

- Nếu có thể hoàn tiền bằng crypto thì dịch vụ sẽ:
  - Tìm `CryptoTransaction` gốc liên quan đến đơn (nếu có).
  - Tìm ví admin đang active (hoặc fallback về `ADMIN_WALLET_ADDRESS`).
  - Ký và gửi giao dịch hoàn tiền bằng private key admin (qua Web3).
  - Đánh dấu trạng thái của giao dịch gốc là `REFUNDED` và chèn một bản ghi `CryptoTransaction` mới cho giao dịch hoàn tiền (trạng thái `SUCCESS` khi thành công).
  - Cập nhật `Order` thành `statusOrder = 'CANCELLED'` và `paymentStatus = 'REFUNDED'` khi hoàn tiền hoàn tất.

- Khi xảy ra lỗi, dịch vụ trả về `success: false` kèm `message` giải thích và cố gắng không để hệ thống rơi vào trạng thái không nhất quán.

Ghi chú cho developer: lưu private key ở dạng plaintext là không an toàn. Nên dùng kho quản lý khóa (KMS) hoặc phần cứng ký (hardware wallet).

### **Trình tự hoàn tiền (chi tiết):**

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

### **Database after refund (example):**

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

---
---
---
---
---
# 📄 Copyright

All content in the LianHarman repository is copyrighted by the author.  

© 2025 [...] — All rights reserved.
- You are allowed to use this source code for personal or educational purposes.
- Commercial use or redistribution is not allowed without explicit written permission from the author.




## 🔗 Links contact me

[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/thuan.lien.79/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/LienThuan9697)
[![Email](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:lienthuan2004@gmail.com)
[![X (Twitter)](https://img.shields.io/badge/X-000000?style=for-the-badge&logo=twitter&logoColor=white)](https://x.com/harmanlian?s=21)


## Deployment

To project setup

```bash
  npm install
```

To deploy this project run

```bash
  npm start
```


## 📌Git code documentation i have with Vietnamese language
`lưu ý: -m kiểm tra trước mới thực hiện trong khi -M thực hiện mà không cần kiểm tra bằng cách ghi đè trực tiếp !!!`

    -m  # Dùng để thêm thông điệp commit
    -M  # Ghi đè nhánh cũ, sử dụng cẩn thận!
    -u  # Thiết lập upstream khi push/pull
    -v  # Hiện chi tiết quá trình thực hiện
    -b  # Tạo nhánh mới và chuyển ngay sang nhánh đó

___

**`# clone dự án về từ github có sẳn:`**
```bash
    git clone https://github.com/username/repository.git
```
___

**`# Điều hướng đến thư mục dự án`**
```bash
    cd path/to/your/project
```
___

**`# Khởi tạo kho lưu trữ Git `**
```bash
    git add .
```
___

**`# Cam kết các thay đổi`**
```bash
    git commit -m "Initial commit"
```
___

**`# Thêm kho lưu trữ GitHub làm remote repository(kết nối với dự án có trên git)`**
```bash
    git remote add origin ”https://github.com/username/repository.git”
```
___

**`# kiểm tra nhánh hiện tại`**
```bash
    git branch
```
___

**`# nếu tên nhánh của bạn là master thay vì main, bạn cần đổi tên nhánh thành main`**
```bash
    git branch -M main
```
___


**`# Xóa Nhánh `**  
**`Ví dụ: xóa nhánh master`**
```bash
    git push origin --delete master
```
___

**`# Đẩy mã lên GitHub`**
```bash
    'git push -u origin main' hoặc 'git push origin main' nếu muốn ghi đè hoặc thay thế tất cả thêm '--force' vào sau chữ 'main'
```
___

**`# Đổi tên nhánh từ master sang main`**
```bash
    git branch -M <tên_cũ> <tên_mới>  -> "ví dụ: git branch -M master main"
```
___

**`# Tạo nhánh mới nhanh và chuyển sang nhánh đó luôn`**
```bash
    git checkout -b ‘tên nhánh mới’  ==> `-b là branch tức là tạo nhánh mới`
```
___

**`# Check code tại qua tên nhánh đó`**
```bash
    git checkout  ‘tên nhánh check’
```
___

**`# quay lại code cũ với một commit bằng mã commit hash-ID`**
```bash
    git checkout ‘HashID‘
```
___

**`# Để quay lại commit cũ ta có`**  
1 xem lịch sử commit: 
```bash
    git log
```
2 Chọn commit muốn quay lại mà không xóa các commit khác:
```bash
    git revert [id-commit]
```
`Hoặc` quay lại và xóa commit khác:
```bash
    git revert --hard [id-commit]
```
**`- lưu ý: quay lại commit không đồng nghĩa remote trên git cũng quay lại theo, nó vẫn nằm ở đó bạn chỉ có thể thực hiện thủ công !!`**

___

**`# Coming soon 🧠`**
```bash
    let's wait 🚀
```
___

## Tạo BackEnd cơ bản:
**`tạo package quản lý npm`**
```bash
    npm init
```
___

## Tải thư viện:
**`Tải thư viện Express cho Backend`**
```bash
    npm i --save-exact express
```

- để chạy dự án này dùng câu lệnh: `node app.js`
___

## Setup TypeScript cho dự án Node.js:
**`Bản chất của việc setup TypeScript`**  
1. Bạn coding bằng cú pháp của TypeScript: mục đích là code được gợi ý, và code ít lỗi hơn  
2. Bạn cần sử dụng thư viện để dịch code từ typescript sang javascript  
3. Node.js sẽ thực thi code đã dịch (javascript)  

`Bước 1: Cài đặt thư viện:`
```bash
    npm i --save-exact --save-dev typescript @types/express @types/node
```
Thư viện typescript, giúp dịch code typescript, sang code javascript  
Thư viện @types/express, giúp bạn coding Express được gợi ý code  
Thư viện @types/node giúp bạn coding nodejs được gợi ý code  

và đổi đuôi file app.js thành .ts

`Bước 2: Cấu hình typescript:`
```bash
    npx tsc --init
```
tạo file: `tsconfig.json` tại root
```bash
    {
        "compilerOptions": {
            "module": "commonjs",
            "esModuleInterop": true,
            "target": "es6",
            "sourceMap": true,
            "skipLibCheck": true,
            "outDir": "dist"
        }
    }
```

//giải thích ý nghĩa
🔗 [Chi tiết, tham khảo](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)

`Bước 3: Dịch code TypeScript sang JavaScript`
```bash
    npx tsc
```

`Bước 4: Chạy dự án`
```bash
    node dist/app.js
```
___


## Setup Typescript
**`setup thêm cho dự án`**

Update `tsconfig.json`
```bash
    "rootDir": "src",
```

update `package.json`
```bash
    "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1",
        "start": "tsc && node dist/app.js",
        "dev": "tsc && node dist/app.js"
    }
```

Chạy dự án với câu lệnh:
```bash
    npm run dev
```
hoặc 
```bash 
    npm start
```
___


## Setup DevTool:
**`Mục tiêu: chạy project tại chế độ ‘watch’. Mỗi lần có file thay đổi, project sẽ tự động chạy lại`**
//Tài liệu:  
🔗 [tham khảo 1](https://www.npmjs.com/package/nodemon)  

Cài đặt thư viện
```bash
    npm i --save-exact --save-dev nodemon ts-node dotenv
    npm i --save-exact dotenv
```

thêm cấu hình này sao khi cài thư viện cho Backend vào file `package.json`:
```bash
    "nodemonConfig": {
        "watch": ["src"],
        "ext": "ts",
        "exec": "ts-node ./src/app.ts",
        "ignore": ["dist", "node_modules"]
    },
```
và đổi scripts trong file `package.json` thành như sau:
```bash 
    "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1",
        "start": "nodemon",
        "dev": "nodemon"
    },
```

tạo file `.env` và cấu hình trong file app.ts thêm thư viện này vô 
___

## Cấu hình EJS cho project (tức giao diện cho backend để chạy mô hình SSR)
**`Template: tức là bộ khung định hình sẵn ví dụ template wedding chẳng hạn, người bán hàng đưa sẵn template, bạn chỉ cần chọn và fill tên vào thôi.`**

🔗 [tham khảo](https://expressjs.com/en/guide/using-template-engines.html)  

cài đặt EJS cho backend:
```bash
    npm i --save-exact ejs
    npm i --save-exact --save-dev @types/ejs

```
tạo thêm folder cho views và file với tên mong muốn:
để hiển thị nội dung file đó lên giao diện web cần khai báo tên file và nguồn của file!
nó sẽ được hiển bằng phương thức get của express qua res:
```bash 
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');

    app.get('/', (req,res) => {
        res.render('home.ejs');
    });
```
___

# Mô hình MVC và File static
**`MVC là viết tắt của Model - View - Controlle`**
giúp viết code theo tổ chức, dễ dàng bảo trì (maintain) và mở rộng (scale) ứng dụng.  

- Tổ chức thư mục cho dự án  
`Tạo controllers`  
`Tạo models`  
`Tạo services`  
`Tạo routes`  

(tạo route)[https://expressjs.com/en/guide/routing.html]  

Tạo thêm các thư mục như models, routes, controllers và services để cấu hình dự án theo MVC.  
Trong folder routes tạo 1 file `web.ts` cho dự án với các url của trang web.
```bash
    import express, {Express} from 'express';

    const router = express.Router();

    const webroutes = (app: Express) => {

        router.get('/', (req, res) => {
            res.render('home.ejs');
        });

        router.get('/about', (req, res) => {
            res.send('About page this BackEnd !');
        });

        app.use('/' , router);
    }
    export default webroutes;

```
thay vì phải rander trực tiếp trong file `app.ts` ta chỉ cần rander các url của nó trong file này giúp ta dễ dàng quản lí hơn !

1. Sửa lại nội dung trong file `app.ts`:  
`thay nội dung dưới này`
```bash 
    router.get('/', (req, res) => {
        res.render('home.ejs');
    });
```
2. thành như này
```bash
    webroutes(app);
```
3. và import file `web.ts` vào trong `app.ts`:
```bash
    import webroutes from './routes/web';
```
Sau các bước trên ta tạo thêm thư mục `public` để làm nơi lưu static File.  
bên trong code `app.ts` cần thêm dòng code bên dưới để nó có thể đọc được các file của thư mục `public`:  
```bash 
    app.use(express.static('public'));
```
___

## Tải thư viên Tsconfig_paths
**`dùng thư viện này để thay đổi đường link absolute paths thành Relative Path `**

tải thư viện bằng code bên dưới:
```bash
    npm i --save-dev --save-exact tsconfig-paths
```
bổ sung thêm các dòng lệnh bên dưới để có thể lấy được có file theo đường dẫn khi khai báo cho các file.

```bash 
    "baseUrl": ".", 
    "paths": {
      "config/*":["./src/config/*"],
      "controllers/*" : ["./src/controllers/*"],
      "models/*" : ["./src/models/*"],
      "routes/*" : ["./src/routes/*"], 
      "services/*" : ["./src/services/*"],
      "views/*" : ["./src/views/*"],    
    },
```

và bổ sung thêm code cho file `package.jon`:
```bash 
    "exec": "ts-node -r tsconfig-paths/register ./src/app.ts",
```


___

## Thêm thư viện SQL2
**`thao tác với database mysql`**

cài thư viện sql2:
```bash 
    npm i --save-exact mysql2
```
tạo thêm thư mục `config` và file `db.ts` để kết nối với database   
trong file `db.ts` có các thông tin sau để kết nối với database:
```bash
    import mysql from 'mysql2/promise'

    const GetConnection = async () =>{
        const connection = await mysql.createConnection({
            port: 3306,
            host: 'your host ',
            user: ' name user ',
            password: ' your password',
            database:' your database',
        });
        // A simple SELECT query
        try {
            const [results, fields] = await connection.query(
                'SELECT * FROM `User`'
            );

            console.log(results); // results contains rows returned by server
            console.log(fields); // fields contains extra meta data about results, if available
        } catch (err) {
            console.log(err);
        };
        return connection;
    };

    export default GetConnection;
```

### Cài ORM Prisma cho môi trường.

- 1 cài thư viện prima cho dự án:
```bash
    npm i --save-dev --save-exact prisma
```
- 2 cài luôn extention prisma cho IDE visual code để được gợi ý code trong quá trình coding

- 3 sau các bước trên ta tiến hành setup prisma cho dự án cá nhân:
để xem tất cả các câu lệnh mà prisma hỗ trợ:
    ```bash 
        npx prisma
    ```
    để prisma tạo 1 file lưu code database để quản lý database, dùng cứu pháp sau:
    ```bash
        npx prisma init
    ```
    nó sẽ tạo ra 1 folder prisma có file schema và 1 file .env để lưu đường dẫn đến database kết nối.
    trong file schema lấy tên database theo cứu pháp prisma đưa "[prisma](https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project/relational-databases/connect-your-database-typescript-mysql)"

    ```bash
        // This is your Prisma schema file,
        // learn more about it in the docs: https://pris.ly/d/prisma-schema

        // Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?
        // Try Prisma Accelerate: https://pris.ly/cli/accelerate-init

        generator client {
        provider = "prisma-client-js"
        }

        datasource db {
        provider = "mysql"
        url      = env("DATABASE_URL")
        }
    ```
    và file .env setup như tài liệu của "[prisma](https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project/relational-databases/connect-your-database-typescript-mysql)"

    ```bash
        NODE_ENV=development
        PORT = 8080
        # This was inserted by `prisma init`:
        # Environment variables declared in this file are automatically made available to Prisma.
        # See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema

        # Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.
        # See the documentation for all the connection string options: https://pris.ly/d/connection-strings

        DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
    ```

- 4 sau khi setup tất cả các bước trên thì cần cái prisma client để nó thao tác với database:
    ```bash
        npm i @prisma/client
    ```
# các mối quan hệ trong "[Prisma](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/one-to-one-relations)"
  

# Cập nhật code cho typescript của prisma:
- 1 để được gợi ý code khi cập nhật lại database có câu lệnh sao:
    ```bash
        npx prisma generate
    ```
- 2 để đưa code trong file `schema.prisma` để tạo bảng vào database:
    ```bash
        npx prisma db push
    ```
- 3 kéo các bảng( hoặc lấy cấu trúc bảng đang có trong database để ghi vào file `schema.prisma` để tạo thành code khung. ) về file `schema.prisma`
    ```bash
        npx prisma db pull
    ```

- 4 đưa code đó vào database đồng thời tạo migrate cho prisma để lưu lại lịch sử cập nhật code của database ( lưu ý: code khung số 2 phải có trước mới chạy được lệnh này ).
    ```bash
        npx prisma migrate dev --name "tên phần cập nhật đó"
    ```

# Pagination with "[Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)":
  

- prisma it take keyword 'limit' and 'offset' replace with limit->take, offset->skip
- recipe take number skip: " Page * PageSize "
- With take you pass in as much as you want.


### Middleware của multer.ts
```bash
    import multer from 'multer'
    import path from 'path'
    import { v4 } from 'uuid';


    const fileUploadMiddleware = (fieldName: string /* tên trường file */, dir: string = 'images' /* thư mục lưu trữ */) => {
        return multer({
            storage: multer.diskStorage({
                destination: 'public/' + dir,// cấu hình nới lưu trữ file với thư mục public và dir là thư mục con
                filename: (req, file, cb) => {
                    const extension = path.extname(file.originalname); // lấy phần mở rộng của file
                    cb(null, v4() + extension); // tạo tên file duy nhất bằng cách sử dụng uuid
                }
            }),
            limits: {
                fileSize: 1024 * 1024 * 3 //3MB - giới hạn kích thước file
            },
            fileFilter: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
                if (
                    file.mimetype === 'image/png' ||
                    file.mimetype === 'image/jpg' ||
                    file.mimetype === 'image/jpeg' // kiểm tra loại file
                ) {
                    cb(null, true); // cho phép file nếu loại hợp lệ
                } else {
                    cb(new Error('Only JPEG and PNG images are allowed.'), false);
                }
            }
        }).single(fieldName); // sử dụng single để upload một file duy nhất


    }
    export default fileUploadMiddleware;
```

# Cài thư viện Json Web Token cho sever hỗ trợ xác thực người dùng.
```bash
    npm i --save-exact jsonwebtoken @types/jsonwebtoken
```
and
```bash
    npm i --save-exact --save-dev @types/jsonwebtoken
```
tài liệu tham khảo [JsonWebToken](https://www.npmjs.com/package/jsonwebtoken)
- jwt.sign(payload, secretOrPrivateKey, [options, callback])
  - payload: là dữ liệu gửi lên kèm request.
  - secretOrPrivateKey: là chữ ký mà sever ký để chỉ sever đó giải mã được token này
  - [options, callback]: ở đây có thể chuyền vào thời gian hết hạn của key token đó { expiresIn: "1d" } 1d ở đây được ghi theo cú pháp của thư viện vercel được ghi rõ trong tài liệu trên.

# Tạo 1 middleware để xác thực thông tin người dùng với token gửi lên header của req
- file middleware có tên **[jwt.middleware.ts](https://gitlab.com/LienThuan9697/nodejs_express/-/blob/master/src/middleware/jwt.middleware.ts?ref_type=heads)** có nội dung như sau:
    ```bash
        import { Request, Response, NextFunction } from "express";
        import jwt from 'jsonwebtoken';
        import "dotenv/config"; // Load environment variables from .env file

        const checkValidJWT = (req: Request, res: Response, next: NextFunction) => {
            const path = req.path; // Lấy đường dẫn của request hiện tại
            const whitelistPaths = [ // Thêm các endpoint công khai khác để không cần check JWT vào đây nếu cần
                '/add-product-to-cart',
                '/login',
            ];
            const isWhitelisted = whitelistPaths.includes(path);
            console.log(`Request path: ${path}, isWhitelisted: ${isWhitelisted}`);
            if (isWhitelisted === true) {
                next(); // Nếu đường dẫn nằm trong whitelist, bỏ qua kiểm tra JWT
                return;
            };

            const token = req.headers.authorization; // Lấy token từ header Authorization của request
            if (!token || !token.startsWith('Bearer ')) { // Kiểm tra token có tồn tại và đúng định dạng Bearer không
                res.status(401).json({ message: 'Unauthorized: No token provided' });
                return;
            } else {
                try {
                    const jwtToken = token.split(' ')[1]; // Lấy phần token sau "Bearer "
                    const dataDecoded: any = jwt.verify(jwtToken, process.env.JWT_SECRET_KEY as string); // Giải mã token sử dụng secret key từ biến môi trường .env
                    console.log("Decoded JWT data:", dataDecoded);
                    req.UserJWT = { //UserJWT này được định nghĩa trong src/types/index.dt.ts 
                        id: dataDecoded.id ?? dataDecoded.userId ?? 0,
                        fullName: dataDecoded.fullName ?? '',
                        email: dataDecoded.email ?? '',
                        avatar: dataDecoded.avatar ?? '',
                        roleId: dataDecoded.roleId ?? 0,
                        roleName: dataDecoded.roleName ?? '',
                        accountType: dataDecoded.accountType ?? '',
                    };
                    next(); // Tiếp tục xử lý request 
                } catch (error) {
                    console.error("JWT verification error:", error instanceof Error ? error.message : ''); // Ghi log lỗi xác thực JWT cụ thể
                    res.status(401).json({ message: 'Unauthorized: Invalid token', error: error instanceof Error ? error.message : '', data: null }); // Phản hồi lỗi xác thực JWT
                };
            };
        };

        export { checkValidJWT };
    ```
tài liệu tham khảo [JsonWebToken](https://www.npmjs.com/package/jsonwebtoken)
- jwt.verify(token, secretOrPublicKey, [options, callback])
  - token là key lúc đầu mã hóa dữ liệu.
  - secretOrPrivateKey là chữ ký mà sever ký để chỉ sever đó giải mã được token này

- Để định nghĩa được biến UserJWT như trên ta có code tham khảo sau:
Tạo kiểu dữ liệu mới và định nghĩa nó để dùng được trong phần req của express
    ```bash
        type UserJWT = { // Định nghĩa kiểu cho dữ liệu UserJWT
            id: number;
            fullName: string;
            email: string;
            avatar: string;
            roleId: number;
            accountType: string;
        };
        export type { UserJWT }; // Xuất kiểu UserRole và UserJWT
        declare global {
        namespace Express {
                interface Request { // Mở rộng Request để bao gồm UserJWT
                    UserJWT: UserJWT; // UserJWT này được định nghĩa ở trên
                }
            }
        };
    ```
    Chi tiết có thể tham khảo file ở **[src/types/index.dt.ts](https://gitlab.com/LienThuan9697/nodejs_express/-/blob/master/src/types/index.dt.ts?ref_type=heads)**

# Build docker compose với mysql:
- viết file docker-compose.yaml để build database bằng docker như sau:
```bash
version: '3.8' # phiên bản docker-compose
services: # định nghĩa các dịch vụ
  db: # tên dịch vụ
    image: mysql:8.0 # sử dụng image mysql phiên bản 8.0
    container_name: DbMysql_LaptopShop_blockchain # tên container
    restart: unless-stopped # tự động khởi động lại trừ khi bị dừng thủ công
    environment: # thiết lập biến môi trường
      MYSQL_ROOT_PASSWORD: LianHarman2049 # pass của user root
      MYSQL_DATABASE: LaptopShopDB # tên database muốn tạo
      MYSQL_USER: LianHarman # biến này đặt để tạo user mới và cấp quyền cho user đó
      MYSQL_PASSWORD: LianHarman2049 # pass của user mới tạo
    ports: # ánh xạ cổng
      - "3307:3306" # ánh xạ cổng 3306 trong container ra cổng 3307 trên host
    # volumes: # gắn volume để lưu trữ dữ liệu
    #   - db_data:/var/lib/mysql # lưu dữ liệu mysql vào volume db_data
    # networks: # Specify the network
    #   - mysql_network
```
- Sau đó chạy lệnh sau để build cơ sở dữ liệu từ file này(nhớ mở cmd ở file này !):
```bash
docker compose -p ~this_name_container~ up -d
```
docker compose: Đây là lệnh dùng để chạy docker-compose.yml. Nó sẽ tạo và quản lý nhiều container cùng 1 lúc theo cấu hình trong file.

-p: Nó dùng để đặt tên chung cho tất cả những thứ mà compose tạo ra từ Tên container,Tên network, Tên volume (nếu có).

up: Tạo container và chạy chúng, Nếu container chưa tồn tại → Docker sẽ build và chạy, Nếu container đã tồn tại → Docker chạy lại.

-d: detached mode (chạy ngầm) không chiếm cmd hiện tại đang gõ lệnh này.

 - Sau khi build có thể kiểm tra container có chạy hay chưa bằng lệnh:
 ```bash
 docker ps
```
hoặc vào docker để xem.

- Build Dockerfile cho dự án như thế nào có thể xem Docker file của dự án này [Dockerfile](https://github.com/LienThuan04/BlockChain-Dapp/blob/master/Dockerfile).

- cách tạo compose dự án backend này cùng với database mysql nằm ở đây: [docker-compose.yaml](https://github.com/LienThuan04/BlockChain-Dapp/blob/master/docker/nodejs/docker-compose.yaml).


# Cách chuyển file `.tar` cho người dùng docker khác cài container:

- Bước 1: commit images đó cần lưu share:
```bash
docker commit `id image` `tên mới của image của comit`:`tag name`
```
- Bước 2: kiểm tra lại commit mới lưu đó có tồn tại hay chưa:
```bash
docker images
```
- Bước 3: save images vào 1 file `.tar` cấu hình để gửi:
```bash
docker save -o `namefile.tar` `id images(có thể lưu nhiều images đó thành 1 file duy nhất bằng cách khoảng)`
```
khi chuyển file `.tar` cho người khác khi chạy lệnh `docker load -i (tên file tar đã share)` thì trong images của người nhận khi chạy lệnh này trong docker lại không có tag name nên ta cần đặt lại tên cho nó hoặc dùng id khỏi đặt tên củng được.

```bash
docker tag id_images name_new_for_this_images
```

- Sau cùng create docker-compose.yaml và setting cho nó:
```bash
services:
  db:
    image: 75081c5f7b17  # DÙNG TRỰC TIẾP IMAGE ID
    container_name: DbMysql_LaptopShop_blockchain # có thể thêm lại mục này nếu muốn đặt tên cho nó trong container
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: LianHarman2049
      MYSQL_DATABASE: LaptopShopDB
      MYSQL_USER: LianHarman
      MYSQL_PASSWORD: LianHarman2049
    ports:
      - "3307:3306"

  server:
    image: 80955feea3b8  # DÙNG TRỰC TIẾP IMAGE ID
    restart: unless-stopped
    container_name: Nodejs_LaptopShop_blockchain # có thể thêm lại mục này nếu muốn đặt tên cho nó trong container
    depends_on:
      - db
    environment:
      DATABASE_URL: "mysql://root:LianHarman2049@db:3306/LaptopShopDB"
    ports:
      - "8081:8080"
```

- Bước 4: chạy setup dự án bên người nhận:
```bash
docker load -i namefile.tar
docker-compose up -d
```
- tận hưởng thành quả!



































## <h3 align="left">Languages and Tools:</h3>

<p align="left"> <a href="https://getbootstrap.com" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/bootstrap/bootstrap-plain-wordmark.svg" alt="bootstrap" width="40" height="40"/> </a> <a href="https://www.w3schools.com/css/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/css3/css3-original-wordmark.svg" alt="css3" width="40" height="40"/> </a> <a href="https://www.docker.com/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original-wordmark.svg" alt="docker" width="40" height="40"/> </a> <a href="https://git-scm.com/" target="_blank" rel="noreferrer"> <img src="https://www.vectorlogo.zone/logos/git-scm/git-scm-icon.svg" alt="git" width="40" height="40"/> </a> <a href="https://www.w3.org/html/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original-wordmark.svg" alt="html5" width="40" height="40"/> </a> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" alt="javascript" width="40" height="40"/> </a> <a href="https://www.mysql.com/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/mysql/mysql-original-wordmark.svg" alt="mysql" width="40" height="40"/> </a> <a href="https://www.postgresql.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original-wordmark.svg" alt="postgresql" width="40" height="40"/> </a> <a href="https://postman.com" target="_blank" rel="noreferrer"> <img src="https://www.vectorlogo.zone/logos/getpostman/getpostman-icon.svg" alt="postman" width="40" height="40"/> </a> <a href="https://reactjs.org/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original-wordmark.svg" alt="react" width="40" height="40"/> </a> <a href="https://redux.js.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/redux/redux-original.svg" alt="redux" width="40" height="40"/> </a> <a href="https://sass-lang.com" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/sass/sass-original.svg" alt="sass" width="40" height="40"/> </a> <a href="https://tailwindcss.com/" target="_blank" rel="noreferrer"> <img src="https://www.vectorlogo.zone/logos/tailwindcss/tailwindcss-icon.svg" alt="tailwind" width="40" height="40"/> </a> </p>