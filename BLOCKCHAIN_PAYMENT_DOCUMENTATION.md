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

Tôi đã giữ phần trên (flow & DB models) nguyên vẹn — phần này bổ sung bản đồ chi tiết các hàm gọi MetaMask/Web3 và ví dụ mã để dễ áp dụng. Nếu bạn muốn, tôi có thể:

- (A) Tự động chèn `file:line` cho từng hàm trong phần này (scan repo và map chính xác), hoặc
- (B) Thêm ví dụ code server-side `verifyTransaction` và chỉnh `confirmCryptoPayment` để gọi verify trước khi tạo order (tôi có thể tạo patch cho controller).

Chọn A hoặc B hoặc cả hai.
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
