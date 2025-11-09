// Web3 integration for laptop marketplace
let web3;
let contract;
let userAccount;

const CONTRACT_ADDRESS = ''; // Sẽ được cập nhật sau khi deploy smart contract
const CONTRACT_ABI = [
    // ABI sẽ được thêm sau khi biên dịch smart contract
];

async function initWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Yêu cầu quyền truy cập tài khoản
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // Khởi tạo Web3
            web3 = new Web3(window.ethereum);
            
            // Lấy tài khoản hiện tại
            const accounts = await web3.eth.getAccounts();
            userAccount = accounts[0];
            
            // Khởi tạo contract
            contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
            
            // Lắng nghe sự thay đổi tài khoản
            window.ethereum.on('accountsChanged', function (accounts) {
                userAccount = accounts[0];
                updateUI();
            });

            return true;
        } catch (error) {
            console.error('Lỗi khi kết nối với Metamask:', error);
            return false;
        }
    } else {
        console.error('Vui lòng cài đặt Metamask!');
        return false;
    }
}

async function purchaseLaptopWithEth(laptopId, priceInEth) {
    try {
        if (!userAccount) {
            throw new Error('Vui lòng kết nối ví Metamask');
        }

        const weiValue = web3.utils.toWei(priceInEth.toString(), 'ether');
        
        // Gọi hàm purchaseLaptop trong smart contract
        const result = await contract.methods.purchaseLaptop(laptopId)
            .send({
                from: userAccount,
                value: weiValue,
                gas: 300000
            });

        // Trả về thông tin giao dịch
        return {
            success: true,
            transactionHash: result.transactionHash,
            blockNumber: result.blockNumber
        };
    } catch (error) {
        console.error('Lỗi khi mua laptop:', error);
        throw error;
    }
}

async function updateUI() {
    // Cập nhật giao diện người dùng khi có thay đổi
    const ethAddressElement = document.getElementById('eth-address');
    if (ethAddressElement && userAccount) {
        ethAddressElement.textContent = userAccount;
    }
}

// Thêm nút thanh toán ETH vào trang chi tiết sản phẩm
function addEthPaymentButton(productId, priceInEth) {
    const paymentContainer = document.querySelector('.payment-methods');
    if (paymentContainer) {
        const ethButton = document.createElement('button');
        ethButton.className = 'btn btn-primary eth-payment-btn';
        ethButton.innerHTML = '<img src="/client/img/metamask-logo.png" alt="Metamask" /> Thanh toán bằng ETH';
        ethButton.onclick = async () => {
            try {
                const connected = await initWeb3();
                if (!connected) {
                    alert('Vui lòng kết nối Metamask để tiếp tục!');
                    return;
                }

                const result = await purchaseLaptopWithEth(productId, priceInEth);
                if (result.success) {
                    // Gửi thông tin giao dịch lên server
                    await fetch('/api/orders/confirm-eth-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            productId,
                            transactionHash: result.transactionHash,
                            blockNumber: result.blockNumber,
                            ethAmount: priceInEth
                        })
                    });

                    alert('Thanh toán thành công!');
                    window.location.href = '/orders';
                }
            } catch (error) {
                alert('Lỗi khi thanh toán: ' + error.message);
            }
        };
        paymentContainer.appendChild(ethButton);
    }
}