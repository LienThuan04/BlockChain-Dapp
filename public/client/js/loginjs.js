
const wrapper = document.querySelector('.wrapper');
const loginlink = document.querySelector('.login-link');
const registerlink = document.querySelector('.register-link');
const IconClose = document.querySelector('.icon-close');
const LoginPopup = document.querySelector('.btnLogin-popup');

// Sau 0,5 giây khi load trang thì mở popup
window.addEventListener("load", () => {
    setTimeout(() => {
        wrapper.classList.add('active-popup');
    }, 500); // 500ms = 0.5s
});


registerlink.addEventListener('click', () => {
    wrapper.classList.add('active');
});

loginlink.addEventListener('click', () => {
    wrapper.classList.remove('active');
});


LoginPopup.addEventListener('click', () => {
    if(wrapper.classList.contains('active-popup')){
        wrapper.classList.remove('active-popup');
    }
    else if(wrapper.classList.contains('wrapper')){
        wrapper.classList.add('active-popup');
    }
});

IconClose.addEventListener('click', () => {
    wrapper.classList.remove('active-popup');
});


// Close alert messages
// public/js/alert.js

document.addEventListener("DOMContentLoaded", function () {
    const alerts = document.querySelectorAll(".alert");

    alerts.forEach((alert) => {
        const closeBtn = alert.querySelector(".close-btn");

        // Bấm nút X thì tắt ngay
        closeBtn.addEventListener("click", () => {
            alert.style.opacity = "0";
            alert.style.transform = "translateX(100%)";
            setTimeout(() => alert.remove(), 5000);
        });

        // Tự động biến mất sau 5 giây
        setTimeout(() => {
            if (document.body.contains(alert)) {
                alert.style.opacity = "0";
                alert.style.transform = "translateX(100%)";
                setTimeout(() => alert.remove(), 5000);
            }
        }, 3000);
    });
});
