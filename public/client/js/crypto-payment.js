// Cấu hình tỷ giá
const VND_TO_SGB_RATE = 1000000; // 1,000,000 VND = 1 SGB

let web3;
let userAccount;

// Hàm kiểm tra và cài đặt MetaMask
async function checkAndInstallMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        return true;
    }

    // Hiển thị modal hướng dẫn cài đặt MetaMask
    const modal = new bootstrap.Modal(document.getElementById('installMetamaskModal'));
    modal.show();
    return false;
}

// Hàm kiểm tra địa chỉ ETH hợp lệ
function isValidEthereumAddress(address) {
    if (!web3) return false;
    return web3.utils.isAddress(address);
}

// Hàm chuyển đổi VND sang SGB
function convertVNDtoSGB(vndAmount) {
    // Công thức: số tiền VND / 1,000,000
    return (parseInt(vndAmount) / VND_TO_SGB_RATE).toFixed(6);
}

// Hiển thị thông báo modal
function showCryptoMessage(message) {
    const modalElement = document.getElementById('cryptoModal');
    if (!modalElement) {
        console.error('Modal element not found');
        return;
    }
    
    document.getElementById('cryptoMessage').innerHTML = message;
    
    // Xóa backdrop cũ nếu còn
    try {
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            if (backdrop && backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
            }
        });
    } catch (e) {
        console.warn('Error removing old backdrops:', e);
    }
    
    // Đóng modal cũ nếu có
    try {
        const existingModal = bootstrap.Modal.getInstance(modalElement);
        if (existingModal) {
            existingModal.dispose();
        }
    } catch (e) {
        console.warn('Error disposing old modal:', e);
    }
    
    // Xóa lớp modal-open khỏi body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    
    // Tạo modal mới
    try {
        const modal = new bootstrap.Modal(modalElement, {
            backdrop: false,
            keyboard: true
        });
        modal.show();
    } catch (e) {
        console.error('Error showing modal:', e);
    }
}

// Đóng modal hoàn toàn
function closeCryptoModal() {
    const modalElement = document.getElementById('cryptoModal');
    if (!modalElement) {
        console.error('Modal element not found');
        return;
    }
    
    // Sử dụng Bootstrap API để đóng modal
    try {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    } catch (e) {
        console.warn('Error hiding modal:', e);
    }
    
    // Đợi animation hoàn tất rồi xóa backdrop
    setTimeout(() => {
        try {
            // Xóa tất cả backdrop
            document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
                if (backdrop && backdrop.parentNode) {
                    backdrop.parentNode.removeChild(backdrop);
                }
            });
            
            // Xóa lớp modal-open khỏi body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        } catch (e) {
            console.warn('Error cleaning up after modal close:', e);
        }
    }, 300);
}

// Chuyển đổi mạng sang Coston
async function switchToCoston() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x10' }], // 16 in hex
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x10',
                        chainName: 'Songbird Coston Testnet',
                        nativeCurrency: {
                            name: 'Songbird',
                            symbol: 'SGB',
                            decimals: 18
                        },
                        rpcUrls: ['https://coston-api.flare.network/ext/bc/C/rpc'],
                        blockExplorerUrls: ['https://coston-explorer.flare.network']
                    }]
                });
            } catch (addError) {
                throw new Error('Không thể thêm mạng Coston vào Metamask');
            }
        } else {
            throw switchError;
        }
    }
}

// Khởi tạo Web3 và kết nối Metamask
async function initWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            web3 = new Web3(window.ethereum);
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            const accounts = await web3.eth.getAccounts();
            userAccount = accounts[0];

            await switchToCoston();
            return true;
        } catch (error) {
            console.error('Lỗi kết nối Metamask:', error);
            showCryptoMessage('Lỗi: ' + error.message);
            return false;
        }
    } else {
        showCryptoMessage('Vui lòng cài đặt Metamask để thanh toán bằng cryptocurrency');
        return false;
    }
}

// Hàm để hiển thị modal thanh toán từ checkout page
async function showCryptoPaymentModal(options) {
    const {
        adminWallet,
        amount,
        vndAmount,
        receiverName,
        receiverPhone,
        receiverAddress,
        receiverEmail,
        receiverNote,
        cartItems
    } = options;

    console.log('Show crypto payment modal with options:', options);
    
    try {
        // 0. Kiểm tra MetaMask đã được cài đặt
        if (!await checkAndInstallMetaMask()) {
            return;
        }

        // 1. Kiểm tra và khởi tạo Web3
        showCryptoMessage(`
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Đang kết nối...</span>
                </div>
                <div>Đang kết nối ví Metamask...</div>
            </div>
        `);

        const connected = await initWeb3();
        if (!connected) {
            throw new Error('Không thể kết nối với Metamask');
        }

        const adminAddress = adminWallet.toLowerCase();
        if (!isValidEthereumAddress(adminAddress)) {
            throw new Error('Địa chỉ ví admin không hợp lệ');
        }

        // 2. Kiểm tra tài khoản người dùng
        if (userAccount.toLowerCase() === adminAddress) {
            throw new Error('Bạn không thể thanh toán cho chính mình bằng ví admin!');
        }

        // 3. Tính toán số tiền
        const priceInSGB = amount;
        const weiValue = web3.utils.toWei(priceInSGB.toString(), 'ether');

        console.log('Payment details:', {
            vndAmount,
            priceInSGB,
            weiValue,
            adminAddress,
            userAccount
        });

        // 4. Hiển thị thông tin giao dịch và yêu cầu xác nhận
        // Use data-* attributes and attach event listener to avoid inline onclick escaping issues
        const encodedCart = encodeURIComponent(JSON.stringify(cartItems || []));
        const encodedReceiverName = encodeURIComponent(receiverName || '');
        const encodedReceiverPhone = encodeURIComponent(receiverPhone || '');
        const encodedReceiverAddress = encodeURIComponent(receiverAddress || '');
        const encodedReceiverEmail = encodeURIComponent(receiverEmail || '');
        const encodedReceiverNote = encodeURIComponent(receiverNote || '');

        showCryptoMessage(`
            <div class="text-center mb-4">
                <h5>Chi tiết giao dịch</h5>
                <div class="table-responsive">
                    <table class="table table-borderless">
                        <tr>
                            <td class="text-end">Số tiền (VND):</td>
                            <td class="text-start fw-bold">${new Intl.NumberFormat('vi-VN').format(vndAmount)} VND</td>
                        </tr>
                        <tr>
                            <td class="text-end">Số tiền (SGB):</td>
                            <td class="text-start fw-bold">${priceInSGB} SGB</td>
                        </tr>
                        <tr>
                            <td class="text-end">Ví nhận:</td>
                            <td class="text-start fw-bold text-break" style="font-size: 0.9rem;">${adminAddress}</td>
                        </tr>
                        <tr>
                            <td class="text-end">Ví gửi:</td>
                            <td class="text-start fw-bold text-break" style="font-size: 0.9rem;">${userAccount}</td>
                        </tr>
                    </table>
                </div>
                <div class="alert alert-info mt-3" role="alert">
                    <small>Vui lòng xác nhận giao dịch trên ví Metamask của bạn</small>
                </div>
            </div>
            <div class="d-flex gap-2">
                <button type="button" id="cryptoConfirmBtn" class="btn btn-primary flex-grow-1"
                    data-admin="${adminAddress}"
                    data-wei="${weiValue}"
                    data-vnd="${vndAmount}"
                    data-cart="${encodedCart}"
                    data-rname="${encodedReceiverName}"
                    data-rphone="${encodedReceiverPhone}"
                    data-raddress="${encodedReceiverAddress}"
                    data-remail="${encodedReceiverEmail}"
                    data-rnote="${encodedReceiverNote}">Xác nhận thanh toán</button>
                <button type="button" class="btn btn-secondary" id="cryptoCancelBtn">Hủy</button>
            </div>
        `);

        // Attach event listeners after modal is rendered
        setTimeout(() => {
            try {
                const confirmBtn = document.getElementById('cryptoConfirmBtn');
                const cancelBtn = document.getElementById('cryptoCancelBtn');
                if (confirmBtn) {
                    confirmBtn.addEventListener('click', async function () {
                        // parse data attributes
                        const admin = this.getAttribute('data-admin');
                        const wei = this.getAttribute('data-wei');
                        const vnd = this.getAttribute('data-vnd');
                        const cartStr = decodeURIComponent(this.getAttribute('data-cart') || '[]');
                        const rname = decodeURIComponent(this.getAttribute('data-rname') || '');
                        const rphone = decodeURIComponent(this.getAttribute('data-rphone') || '');
                        const raddress = decodeURIComponent(this.getAttribute('data-raddress') || '');
                        const remail = decodeURIComponent(this.getAttribute('data-remail') || '');
                        const rnote = decodeURIComponent(this.getAttribute('data-rnote') || '');

                        let cartItemsParsed = [];
                        try {
                            cartItemsParsed = JSON.parse(cartStr);
                        } catch (e) {
                            console.warn('Failed to parse cart items from dataset', e);
                        }

                        // Call confirm function
                        await confirmCheckoutCryptoPayment(admin, wei, vnd, JSON.stringify(cartItemsParsed), rname, rphone, raddress, remail, rnote);
                    });
                }
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', function () {
                        closeCryptoModal();
                    });
                }
            } catch (e) {
                console.error('Error attaching crypto modal buttons:', e);
            }
        }, 50);
    } catch (error) {
        console.error('Error in showCryptoPaymentModal:', error);
        showCryptoMessage(`<div class="alert alert-danger" role="alert">Lỗi: ${error.message}</div><button type="button" class="btn btn-secondary mt-3" onclick="closeCryptoModal()">Đóng</button>`);
    }
}

// Hàm xác nhận thanh toán crypto từ checkout
async function confirmCheckoutCryptoPayment(adminAddress, weiValue, vndAmount, cartItemsStr, receiverName, receiverPhone, receiverAddress, receiverEmail, receiverNote) {
    try {
        console.log('Confirming checkout crypto payment...', { adminAddress, weiValue, vndAmount });

        // Phân tích cartItems
        let cartItems = [];
        try {
            cartItems = typeof cartItemsStr === 'string' ? JSON.parse(cartItemsStr) : (cartItemsStr || []);
        } catch (e) {
            console.warn('Could not parse cartItems:', e);
        }

        // Ensure web3 and userAccount are available; try to init if missing
        if (!web3 || !userAccount) {
            console.log('web3 or userAccount missing, attempting to initWeb3');
            const ok = await initWeb3();
            if (!ok) throw new Error('Không thể kết nối tới MetaMask');
        }

        console.log('web3 ready, userAccount:', userAccount);

        // 5. Gửi giao dịch (use window.ethereum.request for a direct MetaMask prompt)
        showCryptoMessage(`
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Đang gửi giao dịch...</span>
                </div>
                <div>Đang gửi giao dịch... Vui lòng xác nhận trong MetaMask</div>
            </div>
        `);

        let txHash = null;
        try {
            // eth_sendTransaction expects hex value for 'value'
            const params = [{
                from: userAccount,
                to: adminAddress,
                value: web3.utils.toHex(weiValue)
            }];

            console.log('Calling window.ethereum.request eth_sendTransaction with params', params);

            if (window.ethereum && window.ethereum.request) {
                txHash = await window.ethereum.request({ method: 'eth_sendTransaction', params });
                console.log('eth_sendTransaction returned txHash:', txHash);
            } else {
                // Fallback to web3 if ethereum.request not available
                console.warn('window.ethereum.request not available, falling back to web3.eth.sendTransaction');
                const receipt = await web3.eth.sendTransaction({ from: userAccount, to: adminAddress, value: weiValue });
                txHash = receipt && (receipt.transactionHash || receipt);
                console.log('web3 sendTransaction result:', receipt);
            }
        } catch (txError) {
            console.error('Transaction error:', txError);
            throw txError;
        }

        console.log('Transaction hash:', txHash);

        // 6. Gửi thông tin giao dịch đến server
        showCryptoMessage(`
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Đang xác nhận...</span>
                </div>
                <div>Đang xác nhận giao dịch với server...</div>
            </div>
        `);

        console.log('Sending confirmation to server...');
        const response = await fetch('/api/crypto/confirm-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // include cookies/session so server can authenticate req.user
            body: JSON.stringify({
                transactionHash: txHash,
                amount: parseFloat(web3.utils.fromWei(weiValue, 'ether')),
                vndAmount: vndAmount,
                currency: 'SGB',
                receiverName: receiverName,
                receiverPhone: receiverPhone,
                receiverAddress: receiverAddress,
                receiverEmail: receiverEmail,
                receiverNote: receiverNote,
                cartItems: cartItems
            })
        });

        console.log('Server confirmation HTTP status:', response.status);
        const data = await response.json();
        console.log('Server response body:', data);

        if (data.success) {
            // 7. Hiển thị thành công
            showCryptoMessage(`
                <div class="text-center">
                    <div class="mb-3">
                        <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
                    </div>
                    <h5>Thanh toán thành công!</h5>
                    <p>Mã giao dịch: <small class="text-break">${txHash}</small></p>
                    <p class="small">Đơn hàng của bạn đang được xử lý. Vui lòng chờ chuyển hướng...</p>
                </div>
            `);

            // 8. Chuyển hướng sau 2 giây
            setTimeout(() => {
                window.location.href = '/paypal-success?orderId=' + data.orderId;
            }, 2000);
        } else {
            throw new Error(data.error || 'Lỗi thanh toán');
        }
    } catch (error) {
        console.error('Error in confirmCheckoutCryptoPayment:', error);
        showCryptoMessage(`
            <div class="alert alert-danger" role="alert">
                <strong>Lỗi:</strong> ${error.message}
            </div>
            <button type="button" class="btn btn-secondary mt-3" onclick="closeCryptoModal()">Đóng</button>
        `);
    }
}

// Main crypto payment functionality

async function purchaseWithCrypto(productId, priceInVND) {
    console.log('Bắt đầu purchaseWithCrypto với:', { productId, priceInVND });
    
    try {
        // 0. Kiểm tra MetaMask đã được cài đặt
        if (!await checkAndInstallMetaMask()) {
            return;
        }

        // 1. Kiểm tra và khởi tạo Web3
        showCryptoMessage(`
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Đang kết nối...</span>
                </div>
                <div>Đang kết nối ví Metamask...</div>
            </div>
        `);

        const connected = await initWeb3();
        if (!connected) {
            throw new Error('Không thể kết nối với Metamask');
        }

        // 2. Lấy địa chỉ ví admin từ server
        console.log('Fetching admin wallet from /api/get-admin-wallet');
        const response = await fetch('/api/get-admin-wallet', {
            credentials: 'include'
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            if (response.status === 401) {
                throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            }
            throw new Error(`Lỗi khi lấy thông tin ví admin (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        const { adminWallet } = data;
        console.log('Admin wallet from response:', adminWallet);
        if (!adminWallet) {
            throw new Error('Không nhận được địa chỉ ví admin từ server');
        }

        const adminAddress = adminWallet.toLowerCase();
        if (!isValidEthereumAddress(adminAddress)) {
            throw new Error('Địa chỉ ví admin không hợp lệ');
        }

        // 3. Kiểm tra tài khoản người dùng
        if (userAccount.toLowerCase() === adminAddress) {
            throw new Error('Bạn không thể thanh toán cho chính mình bằng ví admin!');
        }

        // 4. Tính toán số tiền
        const priceInSGB = convertVNDtoSGB(priceInVND);
        const weiValue = web3.utils.toWei(priceInSGB.toString(), 'ether');

        // 5. Hiển thị thông tin giao dịch và yêu cầu xác nhận
        showCryptoMessage(`
            <div class="text-center mb-4">
                <h5>Chi tiết giao dịch</h5>
                <div class="table-responsive">
                    <table class="table table-borderless">
                        <tr>
                            <td class="text-end">Số tiền (VND):</td>
                            <td class="text-start fw-bold">${new Intl.NumberFormat('vi-VN').format(priceInVND)} VND</td>
                        </tr>
                        <tr>
                            <td class="text-end">Số tiền (SGB):</td>
                            <td class="text-start fw-bold">${priceInSGB} SGB</td>
                        </tr>
                        <tr>
                            <td class="text-end">Ví người dùng:</td>
                            <td class="text-start"><small>${userAccount}</small></td>
                        </tr>
                        <tr>
                            <td class="text-end">Ví nhận tiền:</td>
                            <td class="text-start"><small>${adminAddress}</small></td>
                        </tr>
                    </table>
                </div>
                <div class="d-grid gap-2 mt-4">
                    <button id="confirmCryptoPayment" class="btn btn-primary btn-lg">Xác nhận thanh toán</button>
                    <button type="button" class="btn btn-secondary" onclick="closeCryptoModal()">Hủy</button>
                </div>
            </div>
        `);

        // 6. Đợi người dùng xác nhận
        await new Promise((resolve, reject) => {
            document.getElementById('confirmCryptoPayment').onclick = () => resolve();
            document.querySelector('[data-bs-dismiss="modal"]').onclick = () => reject(new Error('Người dùng đã hủy giao dịch'));
        });

        // 7. Gửi giao dịch
        showCryptoMessage(`
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Đang xử lý...</span>
                </div>
                <div>Đang xử lý giao dịch qua Metamask...</div>
                <div class="small text-muted">Vui lòng xác nhận trong ví Metamask của bạn</div>
            </div>
        `);

        const result = await web3.eth.sendTransaction({
            from: userAccount,
            to: adminAddress,
            value: weiValue,
            gas: '21000'
        });

        if (!result.status) {
            throw new Error('Giao dịch thất bại');
        }

        // 8. Xác nhận giao dịch với server
        showCryptoMessage(`
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Đang xác nhận...</span>
                </div>
                <div>Đang xác nhận giao dịch với server...</div>
            </div>
        `);

        const confirmResponse = await fetch('/api/orders/confirm-crypto-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                productId,
                transactionHash: result.transactionHash,
                amount: priceInSGB,
                currency: 'SGB'
            })
        });

        console.log('Confirm response status:', confirmResponse.status);

        if (!confirmResponse.ok) {
            const errorText = await confirmResponse.text();
            console.error('Confirm response error:', errorText);
            throw new Error(`Lỗi xác nhận giao dịch: ${confirmResponse.status} - ${errorText}`);
        }

        const confirmResult = await confirmResponse.json();
        console.log('Confirm result:', confirmResult);

        if (!confirmResult.success) {
            throw new Error('Không thể xác nhận giao dịch với server');
        }

        // 9. Hoàn tất
        showCryptoMessage(`
            <div class="text-center">
                <div class="text-success mb-3">
                    <i class="fas fa-check-circle fa-3x"></i>
                </div>
                <h5 class="text-success">Thanh toán thành công!</h5>
                <p>Đơn hàng của bạn đã được xác nhận.</p>
                <p class="small text-muted">Đang chuyển hướng...</p>
            </div>
        `);
        
        setTimeout(() => {
            window.location.href = '/orders';
        }, 2000);

    } catch (error) {
        console.error('Lỗi:', error);
        showCryptoMessage(`
            <div class="text-center">
                <div class="text-danger mb-3">
                    <i class="fas fa-exclamation-circle fa-3x"></i>
                </div>
                <h5 class="text-danger">Lỗi</h5>
                <p>${error.message}</p>
                <button type="button" class="btn btn-secondary mt-3" onclick="closeCryptoModal()">Đóng</button>
            </div>
        `);
    }
}

// Tính và hiển thị giá crypto khi trang tải
document.addEventListener('DOMContentLoaded', () => {
    const productPriceEl = document.getElementById('product-price');
    if (productPriceEl && productPriceEl.dataset) {
        const productPrice = productPriceEl.dataset.price;
        const priceInSGB = convertVNDtoSGB(productPrice);
        const cryptoAmountEl = document.querySelector('.crypto-amount');
        if (cryptoAmountEl) cryptoAmountEl.textContent = priceInSGB;
    } else {
        console.warn('product-price element or dataset not found; skipping crypto amount display');
    }

    // Thêm event listener để xóa backdrop khi modal bị đóng
    const cryptoModal = document.getElementById('cryptoModal');
    if (cryptoModal) {
        cryptoModal.addEventListener('hidden.bs.modal', function () {
            try {
                // Xóa tất cả backdrop
                document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
                    if (backdrop && backdrop.parentNode) {
                        backdrop.parentNode.removeChild(backdrop);
                    }
                });
                
                // Xóa lớp modal-open khỏi body
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
            } catch (e) {
                console.warn('Error in modal hidden event:', e);
            }
        });
    }
});