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
    const productPrice = document.getElementById('product-price').dataset.price;
    const priceInSGB = convertVNDtoSGB(productPrice);
    document.querySelector('.crypto-amount').textContent = priceInSGB;

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