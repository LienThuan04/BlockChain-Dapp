async function checkAndInstallMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        return true;
    }

    // Hiển thị modal hướng dẫn cài đặt MetaMask
    const modal = new bootstrap.Modal(document.getElementById('installMetamaskModal'));
    modal.show();
    return false;
}

// Thêm event listener cho nút cài đặt MetaMask
document.getElementById('installMetamask')?.addEventListener('click', () => {
    window.open('https://metamask.io/download/', '_blank');
});

// Export để sử dụng trong các file khác
window.checkAndInstallMetaMask = checkAndInstallMetaMask;