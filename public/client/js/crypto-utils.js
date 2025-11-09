// Cấu hình mạng Coston
const COSTON_NETWORK = {
    chainId: '0x10', // 16 in hex
    chainName: 'Songbird Coston Testnet',
    nativeCurrency: {
        name: 'Songbird',
        symbol: 'SGB',
        decimals: 18
    },
    rpcUrls: ['https://coston-api.flare.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://coston-explorer.flare.network']
};

// Kiểm tra số dư của ví
async function checkWalletBalance(address) {
    try {
        const balance = await web3.eth.getBalance(address);
        return web3.utils.fromWei(balance, 'ether');
    } catch (error) {
        console.error('Lỗi khi kiểm tra số dư:', error);
        return '0';
    }
}

// Kiểm tra và chuyển sang mạng Coston
async function switchToCoston() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: COSTON_NETWORK.chainId }]
        });
        return true;
    } catch (error) {
        if (error.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [COSTON_NETWORK]
                });
                return true;
            } catch (addError) {
                console.error('Lỗi khi thêm mạng Coston:', addError);
                // Hiển thị modal hướng dẫn thêm mạng
                const modal = new bootstrap.Modal(document.getElementById('switchNetworkModal'));
                modal.show();
                return false;
            }
        }
        console.error('Lỗi khi chuyển mạng:', error);
        return false;
    }
}

// Tạo mã QR cho địa chỉ ví
function generateWalletQR(address) {
    const qrContainer = document.querySelector('#getTestTokensModal .qr-code');
    qrContainer.innerHTML = ''; // Xóa nội dung cũ
    
    new QRCode(qrContainer, {
        text: address,
        width: 200,
        height: 200
    });
}

// Copy địa chỉ ví vào clipboard
document.getElementById('copyWalletAddress')?.addEventListener('click', function() {
    const addressInput = document.getElementById('userWalletAddress');
    addressInput.select();
    document.execCommand('copy');
    
    // Hiển thị thông báo đã copy
    this.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
        this.innerHTML = '<i class="fas fa-copy"></i>';
    }, 2000);
});

// Thêm mạng Coston khi nhấn nút trong modal
document.getElementById('addCostonNetwork')?.addEventListener('click', async function() {
    try {
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [COSTON_NETWORK]
        });
        bootstrap.Modal.getInstance(document.getElementById('switchNetworkModal')).hide();
    } catch (error) {
        console.error('Lỗi khi thêm mạng:', error);
        alert('Không thể thêm mạng. Vui lòng thử lại sau.');
    }
});

// Export các hàm để sử dụng trong các file khác
window.checkWalletBalance = checkWalletBalance;
window.switchToCoston = switchToCoston;
window.generateWalletQR = generateWalletQR;