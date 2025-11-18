// Đồng bộ checkbox cart giữa 2 bảng theo id
document.addEventListener('DOMContentLoaded', function () {

    function syncCheckboxes(id, checked) {
        document.querySelectorAll('.cart-checkbox[value="' + id + '"]').forEach(function (cb) {
            cb.checked = checked;
        });
        updateSelectAllState();
    }


    // Cập nhật trạng thái selectAll dựa trên các checkbox con
    function updateSelectAllState() {
        var all = document.querySelectorAll('.cart-checkbox');
        var checked = document.querySelectorAll('.cart-checkbox:checked');
        document.querySelectorAll('#selectAll').forEach(function (selectAll) {
            selectAll.checked = (all.length > 0 && checked.length === all.length);
        });
    }

    // Khi click vào bất kỳ checkbox cart-checkbox nào
    document.querySelectorAll('.cart-checkbox').forEach(function (checkbox) {
        checkbox.addEventListener('change', function () {
            syncCheckboxes(this.value, this.checked);
            updateSelectAllState();
        });
    });

    // Khi click vào selectAll ở bảng trên hoặc dưới
    document.querySelectorAll('#selectAll').forEach(function (selectAll) {
        selectAll.addEventListener('change', function () {
            document.querySelectorAll('.cart-checkbox').forEach(function (cb) {
                cb.checked = selectAll.checked;
            });
            updateSelectAllState();
        });
    });
});


(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner(0);


    // Fixed Navbar
    $(window).scroll(function () {
        if ($(window).width() < 992) {
            if ($(this).scrollTop() > 55) {
                $('.fixed-top').addClass('shadow');
            } else {
                $('.fixed-top').removeClass('shadow');
            }
        } else {
            if ($(this).scrollTop() > 55) {
                $('.fixed-top').addClass('shadow').css('top', -55);
            } else {
                $('.fixed-top').removeClass('shadow').css('top', 0);
            }
        }
    });


    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({ scrollTop: 0 }, 1500, 'easeInOutExpo');
        return false;
    });


    // Testimonial carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 2500,
        center: false,
        dots: true,
        loop: true,
        margin: 25,
        nav: true,
        navText: [
            '<i class="bi bi-arrow-left"></i>',
            '<i class="bi bi-arrow-right"></i>'
        ],
        responsiveClass: true,
        responsive: {
            0: {
                items: 1
            },
            576: {
                items: 1
            },
            768: {
                items: 1
            },
            992: {
                items: 2
            },
            1200: {
                items: 2
            }
        }
    });


    // vegetable carousel
    $(".vegetable-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1500,
        center: false,
        dots: true,
        loop: true,
        margin: 25,
        nav: true,
        navText: [
            '<i class="bi bi-arrow-left"></i>',
            '<i class="bi bi-arrow-right"></i>'
        ],
        responsiveClass: true,
        responsive: {
            0: {
                items: 1
            },
            576: {
                items: 1
            },
            768: {
                items: 2
            },
            992: {
                items: 3
            },
            1200: {
                items: 4
            }
        }
    });


    // Modal Video
    $(document).ready(function () {
        var $videoSrc;
        $('.btn-play').click(function () {
            $videoSrc = $(this).data("src");
        });
        console.log($videoSrc);

        $('#videoModal').on('shown.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc + "?autoplay=1&amp;modestbranding=1&amp;showinfo=0");
        })

        $('#videoModal').on('hide.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc);
        })
    });



    // Product Quantity: Only allow changing quantity if the product is selected
    $('.quantity button').on('click', function () {
        var button = $(this);
        var input = button.parent().parent().find('input');
        // Find the checkbox in the same row
        var checkbox = button.closest('tr').find('.cart-checkbox');
        if (!checkbox.prop('checked')) {
            // If not selected, do nothing
            return;
        }
        let change = 0;
        var oldValue = parseInt(input.val()) || 1;
        var max = parseInt(input.attr('max')) || 9999;
        var newVal;
        if (button.hasClass('btn-plus')) {
            if (oldValue >= max) {
                newVal = max;
            } else {
                newVal = oldValue + 1;
            }
        } else {
            if (oldValue > 1) {
                newVal = oldValue - 1;
            } else {
                newVal = 1;
            }
        }
        input.val(newVal);

        //set quantity for input
        const quantityInput = input.attr('data-InputQuantityCartDetail-index');
        const IndexElement = document.getElementById(`cartDetails[${quantityInput}]`);
        $(IndexElement).val(newVal);

        // get base price and priceMore for correct total
        const basePrice = Number(input.attr('data-InputCartDetail-price')) || 0;
        // Try to get priceMore from the selected variant in the same row
        let priceMore = 0;
        const row = button.closest('tr');
        const variantSelect = row.find('select[name^="variantSelect-"]');
        if (variantSelect.length) {
            const selectedOption = variantSelect.find('option:selected');
            priceMore = Number(selectedOption.data('pricemore')) || 0;
        } else {
            // fallback: try to get from price display
            const priceDisplay = row.find('[id^="price-display-"]');
            if (priceDisplay.length) {
                priceMore = Number(priceDisplay.attr('data-selected-pricemore')) || 0;
            }
        }
        const id = input.attr('data-InputCartDetail-id');
        const priceElement = $(`p[data-OutPutCartDetail-id='${id}']`);
        const totalUnitPrice = basePrice + priceMore;
        if (priceElement) {
            const newPrice = totalUnitPrice * newVal;
            priceElement.text(newPrice.toLocaleString('vi-VN') + ' VND');
        }

        // Tính lại tổng tiền chỉ cho sản phẩm được chọn (bao gồm cả priceMore)
        let totalPrice = 0;
        $('.cart-checkbox:checked').each(function () {
            const row = $(this).closest('tr');
            const qtyInput = row.find('input[name="quantityProduct"]');
            const basePrice = Number(qtyInput.attr('data-InputCartDetail-price')) || 0;
            let priceMore = 0;
            const variantSelect = row.find('select[name^="variantSelect-"]');
            if (variantSelect.length) {
                const selectedOption = variantSelect.find('option:selected');
                priceMore = Number(selectedOption.data('pricemore')) || 0;
            } else {
                const priceDisplay = row.find('[id^="price-display-"]');
                if (priceDisplay.length) {
                    priceMore = Number(priceDisplay.attr('data-selected-pricemore')) || 0;
                }
            }
            const quantity = Number(qtyInput.val()) || 1;
            const totalUnitPrice = basePrice + priceMore;
            totalPrice += totalUnitPrice * quantity;
        });
        $(`p[data-TotalPrice]`).text(totalPrice.toLocaleString('vi-VN') + ' VND');

        // Tổng cộng (không còn phí ship cố định)
        const totalWithShip = totalPrice > 0 ? totalPrice : 0;
        $(`p[data-TotalPriceTT]`).text(totalWithShip.toLocaleString('vi-VN') + ' VND');
    });

    //active headers for client
    const navElement = $("#navbarCollapse");
    const currentUrl = window.location.pathname;
    navElement.find('a.nav-link').each(function () {
    const link = $(this); // Get the current link in the loop
    const href = link.attr('href'); // Get the href attribute of the link
    if (href === currentUrl) {
    link.addClass('active'); // Add 'active' class if the href matches the current URL
    } else {
    link.removeClass('active'); // Remove 'active' class if the href does not match
    }
    });

    // Filter and Sort functionality
    $('#apply-filters-btn').on('click', function (event) {
        event.preventDefault();
        const selectedFactories = [];
        $('#factory-filter input[type="checkbox"]:checked').each(function () {
            selectedFactories.push($(this).val());
        });

        const selectedTargets = [];
        $('#target-filter input[type="checkbox"]:checked').each(function () {
            selectedTargets.push($(this).val());
        });

        const selectedPriceRange = [];
        $('#price-filter input[type="checkbox"]:checked').each(function () {
            selectedPriceRange.push($(this).val());
        });

        let sortValue = $('input[name="radio-sort"]:checked').val();
        // Call the filter and sort functions with the selected values
        const currentUrl = new URL(window.location.href);
        const searchParams = currentUrl.searchParams;
        const currentPage = searchParams.get('Page') ?? '0';
        searchParams.set('Page', currentPage); // Giữ nguyên page hiện tại
        searchParams.set('sort', sortValue);

        //reset to page 1 when applying new filters
        searchParams.delete('factory');
        searchParams.delete('target');
        searchParams.delete('priceRange');

        if (selectedFactories.length > 0) {
            searchParams.set('factory', selectedFactories.join(','));
        };
        if (selectedTargets.length > 0) {
            searchParams.set('target', selectedTargets.join(','));
        };
        if (selectedPriceRange.length > 0) {
            searchParams.set('priceRange', selectedPriceRange.join(','));
        };


        currentUrl.searchParams.set('factory', selectedFactories.join(','));
        currentUrl.searchParams.set('target', selectedTargets.join(','));
        currentUrl.searchParams.set('priceRange', selectedPriceRange.join(','));
        currentUrl.searchParams.set('sort', sortValue);
        window.location.href = currentUrl.toString();

    });

    // save checkbox state using localStorage
    //load saved state on page load
    const params = new URLSearchParams(window.location.search);
    if (params.has('factory')) {
        const savedFactories = params.get('factory').split(',');
        $('#factory-filter input[type="checkbox"]').each(function () {
            const checkbox = $(this);
            if (savedFactories.includes(checkbox.val())) {
                checkbox.prop('checked', true);
            }
        });
    };
    if (params.has('target')) {
        const savedTargets = params.get('target').split(',');
        $('#target-filter input[type="checkbox"]').each(function () {
            const checkbox = $(this);
            if (savedTargets.includes(checkbox.val())) {
                checkbox.prop('checked', true);
            }
        });
    };
    if (params.has('priceRange')) {
        const savedPriceRange = params.get('priceRange').split(',');
        $('#price-filter input[type="checkbox"]').each(function () {
            const checkbox = $(this);
            if (savedPriceRange.includes(checkbox.val())) {
                checkbox.prop('checked', true);
            }
        });
    };
    if (params.has('sort')) {
        const savedSort = params.get('sort');
        $('input[name="radio-sort"]').each(function () {
            const radio = $(this);
            if (radio.val() === savedSort) {
                radio.prop('checked', true);
            }
        });
    };

    /////////////////////// End of use strict
    //handle add to cart with ajax
    $('.btnAddToCartProduct').click(function (event) {
        event.preventDefault();

        if (!isLogin()) {
            $.toast({
                heading: 'Lỗi thêm vào giỏ hàng',
                text: 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!',
                icon: 'error',
                position: 'bottom-right',
                stack: false,
            });
            return;
        }

    const productId = $(this).attr('data-product-id');
    // Find variant input within the same product card to avoid picking the first global input
    const card = $(this).closest('.product-card');
    // Prefer the checked radio (if any). Fall back to any input (hidden default) if not checked.
    const productVariantId = (card.find('input[name="productVariantId"]:checked').val() || card.find('input[name="productVariantId"]').val()) || null;
        $.ajax({
            url: `${window.location.origin}/api/add-product-to-cart`,
            type: 'POST',
            data: JSON.stringify({ productId: productId, productVariantId: productVariantId || null, quantity: 1 }),
            contentType: 'application/json',

            success: function (response) {
                // Handle success response
                const sum = +response.data.quantityCart;
                const message = response.message || 'Đã thêm sản phẩm vào giỏ hàng!';
                // Update cart count in navbar
                $('#cart-count').text(sum);
                // Show toast notification
                $.toast({
                    heading: 'Giỏ hàng',
                    text: message,
                    icon: 'success',
                    position: 'bottom-right',
                    stack: false
                });

            },
            error: function (response) {
                // Handle error response
                $.toast({
                    heading: 'Lỗi thêm vào giỏ hàng',
                    text: response.message || 'Không thể thêm sản phẩm vào giỏ hàng!',
                    icon: 'error',
                    position: 'top-right',
                    stack: false
                });
            }
        });
    });

    $('.btnAddToCartProductDetail').click(function (event) {
        event.preventDefault();
        if (!isLogin()) {
            $.toast({
                heading: 'Lỗi thêm vào giỏ hàng',
                text: 'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!',
                icon: 'error',
                position: 'top-right',
                stack: false
            });
            return;
        };
    const productId = $(this).attr('data-product-id');
    // On product detail page, find the variant input inside the nearest form
    const form = $(this).closest('form');
    // Use the checked radio value when present so the selected variant is sent (don't send default implicitly)
    const productVariantId = (form.find('input[name="productVariantId"]:checked').val() || form.find('input[name="productVariantId"]').val()) || null;
        const quantity = parseInt($('#quantityDetail').val()) || 1;
        $.ajax({
            url: `${window.location.origin}/api/add-product-to-cart`,
            type: 'POST',
            data: JSON.stringify({ productId: productId, productVariantId: productVariantId, quantity: quantity }),
            contentType: 'application/json',
            success: function (response) {
                // Handle success response
                const sum = +response.data.quantityCart;
                const message = response.message || 'Đã thêm sản phẩm vào giỏ hàng!';
                // Update cart count in navbar
                $('#cart-count').text(sum);
                // Show toast notification
                $.toast({
                    heading: 'Giỏ hàng',
                    text: message,
                    icon: 'success',
                    position: 'top-right',
                    stack: false
                });

            },
            error: function (response) {
                // Handle error response
                $.toast({
                    heading: 'Lỗi thêm vào giỏ hàng',
                    text: response.message || 'Không thể thêm sản phẩm vào giỏ hàng!',
                    icon: 'error',
                    position: 'top-right',
                    stack: false
                });
            }
        });
    });

    function isLogin() {
        const navElement = $("#navbarCollapse");
        const childLogin = navElement.find('a.a-login');
        if (childLogin.length > 0) {
            return false; // User is not logged in
        }
        return true; // User is logged in
    }

})(jQuery);

document.querySelectorAll('.product-card').forEach(function (card) {
    card.addEventListener('click', function () {
        window.location.href = card.getAttribute('data-href');
    });
});

// Khi người dùng nhập (input)
$(document).on('input', 'input[data-InputCartDetail-id]', function () {
    const input = $(this);
    const id = input.attr('data-InputCartDetail-id');
    const price = Number(input.attr('data-InputCartDetail-price'));
    let quantity = input.val();
    const max = parseInt(input.attr('max')) || 9999;

    // Nếu input rỗng thì không xử lý gì (cho phép xóa để nhập lại)
    if (quantity === "") return;

    quantity = Number(quantity);

    // Nếu nhập nhỏ hơn 1 thì set lại thành 1
    if (isNaN(quantity) || quantity < 1) {
        quantity = 1;
        input.val(1);
    }
    // Nếu nhập lớn hơn max thì set lại thành max
    if (quantity > max) {
        quantity = max;
        input.val(max);
    }

    // --- Thêm logic set lại giá trị cho IndexElement ---
    const quantityInput = input.attr('data-InputQuantityCartDetail-index');
    const IndexElement = document.getElementById(`cartDetails[${quantityInput}]`);
    if (IndexElement) {
        $(IndexElement).val(quantity);
    }
    // ---------------------------------------------------

    // Cập nhật tổng từng sản phẩm (bao gồm cả priceMore)
    let priceMore = 0;
    const row = input.closest('tr');
    const variantSelect = row.find('select[name^="variantSelect-"]');
    if (variantSelect.length) {
        const selectedOption = variantSelect.find('option:selected');
        priceMore = Number(selectedOption.data('pricemore')) || 0;
    } else {
        const priceDisplay = row.find('[id^="price-display-"]');
        if (priceDisplay.length) {
            priceMore = Number(priceDisplay.attr('data-selected-pricemore')) || 0;
        }
    }
    const totalUnitPrice = price + priceMore;
    const priceElement = $(`p[data-OutPutCartDetail-id='${id}']`);
    if (priceElement.length) {
        const newPrice = totalUnitPrice * quantity;
        priceElement.text(newPrice.toLocaleString('vi-VN') + ' VND');
    }

    // Nếu sản phẩm này không được chọn thì không tính lại tổng
    const checkbox = $(this).closest('tr').find('.cart-checkbox');
    if (!checkbox.prop('checked')) {
        // Nếu chưa chọn thì chỉ update giá từng sản phẩm, không update tổng
        return;
    }

    // Cập nhật tổng tiền chỉ cho sản phẩm được chọn (bao gồm cả priceMore)
    let totalPrice = 0;
    $('.cart-checkbox:checked').each(function () {
        const row = $(this).closest('tr');
        const qtyInput = row.find('input[name="quantityProduct"]');
        const basePrice = Number(qtyInput.attr('data-InputCartDetail-price')) || 0;
        let priceMore = 0;
        const variantSelect = row.find('select[name^="variantSelect-"]');
        if (variantSelect.length) {
            const selectedOption = variantSelect.find('option:selected');
            priceMore = Number(selectedOption.data('pricemore')) || 0;
        } else {
            const priceDisplay = row.find('[id^="price-display-"]');
            if (priceDisplay.length) {
                priceMore = Number(priceDisplay.attr('data-selected-pricemore')) || 0;
            }
        }
        const quantity = Number(qtyInput.val()) || 1;
        const totalUnitPrice = basePrice + priceMore;
        totalPrice += totalUnitPrice * quantity;
    });
    $(`p[data-TotalPrice]`).text(totalPrice.toLocaleString('vi-VN') + ' VND');

    // Cập nhật tổng cộng (không còn phí ship cố định)
    const totalWithShip = totalPrice > 0 ? totalPrice : 0;
    $(`p[data-TotalPriceTT]`).text(totalWithShip.toLocaleString('vi-VN') + ' VND');
});

// Khi input mất focus (blur), nếu rỗng thì set về 1
$(document).on('blur', 'input[data-InputCartDetail-id]', function () {
    const input = $(this);
    if (input.val() === "" || Number(input.val()) < 1) {
        input.val(1).trigger('input');
    }
});

// Xử lý riêng khi chọn PayPal hoặc Crypto, còn lại giữ nguyên logic cũ
document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('form[action="/place-order"]');
    const btnCheckout = document.getElementById('btnCheckoutPay');
    if (form && btnCheckout) {
        form.addEventListener('submit', async function (e) {
            const radioPaypal = form.querySelector('input[type="radio"][name="paymentMethod"][value="PAYPAL"]');
            const radioCrypto = form.querySelector('input[type="radio"][name="paymentMethod"][value="CRYPTO"]');
            
            if (radioPaypal && radioPaypal.checked) {
                e.preventDefault();
                btnCheckout.disabled = true;
                btnCheckout.innerText = 'Đang chuyển sang PayPal...';
                // Lấy dữ liệu form
                const formData = new FormData(form);
                // Gọi API backend tạo order PayPal
                try {
                    // Lấy danh sách id chi tiết cart đã chọn (ẩn trong form)
                    // Tìm tất cả input name="ListIdDetailCartPay[<index>][id]"
                    const listIdInputs = form.querySelectorAll('input[name^="ListIdDetailCartPay"][name$="[id]"]');
                    const listVariantInputs = form.querySelectorAll('input[name^="ListIdDetailCartPay"][name$="[productVariantId]"]');
                    const ListIdDetailCartPay = Array.from(listIdInputs).map((input, index) => ({
                        id: input.value,
                        productVariantId: listVariantInputs[index].value
                    }));
                    const res = await fetch('/api/paypal/create-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            totalPrice: formData.get('totalPrice'),
                            receiverName: formData.get('receiverName'),
                            receiverEmail: formData.get('receiverEmail'),
                            receiverAddress: formData.get('receiverAddress'),
                            receiverPhone: formData.get('receiverPhone'),
                            receiverNote: formData.get('receiverNote'),
                            paymentMethod: formData.get('paymentMethod'),
                            ListIdDetailCartPay: ListIdDetailCartPay
                        })
                    });
                    let data = null;
                    try {
                        data = await res.json();
                    } catch (parseErr) {
                        console.error('Failed to parse PayPal response as JSON', parseErr);
                        alert('Lỗi khi nhận phản hồi từ server PayPal. Xem console server để biết thêm chi tiết.');
                        btnCheckout.disabled = false;
                        btnCheckout.innerText = 'Tiến hành thanh toán';
                        return;
                    }

                    console.log('PayPal create-order response:', res.status, data);
                    if (res.ok && data && data.approvalUrl) {
                        console.log('Redirecting to PayPal:', data.approvalUrl);
                        window.location.href = data.approvalUrl; // Chuyển hướng sang PayPal
                    } else {
                        const serverMessage = data?.error || data?.message || 'Không tạo được đơn PayPal!';
                        alert(serverMessage);
                        btnCheckout.disabled = false;
                        btnCheckout.innerText = 'Tiến hành thanh toán';
                    }
                } catch (err) {
                    alert('Lỗi khi kết nối PayPal!');
                    btnCheckout.disabled = false;
                    btnCheckout.innerText = 'Tiến hành thanh toán';
                }
            } else if (radioCrypto && radioCrypto.checked) {
                e.preventDefault();
                btnCheckout.disabled = true;
                btnCheckout.innerText = 'Đang kết nối MetaMask...';
                
                const formData = new FormData(form);
                try {
                    console.log('=== CRYPTO PAYMENT FLOW START ===');
                    
                    // Lấy danh sách id chi tiết cart đã chọn
                    const listIdInputs = form.querySelectorAll('input[name^="ListIdDetailCartPay"][name$="[id]"]');
                    const listVariantInputs = form.querySelectorAll('input[name^="ListIdDetailCartPay"][name$="[productVariantId]"]');
                    const cartItems = Array.from(listIdInputs).map((input, index) => ({
                        id: input.value,
                        productVariantId: listVariantInputs[index].value
                    }));
                    console.log('Cart items:', cartItems);

                    // Gọi API để lấy thông tin ví admin
                    console.log('Fetching admin wallet from /api/crypto/admin-wallet...');
                    const adminWalletRes = await fetch('/api/crypto/admin-wallet');
                    console.log('Admin wallet response status:', adminWalletRes.status);
                    
                    if (!adminWalletRes.ok) {
                        const errorText = await adminWalletRes.text();
                        throw new Error(`Failed to fetch admin wallet (${adminWalletRes.status}): ${errorText}`);
                    }
                    
                    const adminData = await adminWalletRes.json();
                    console.log('Admin wallet data:', adminData);
                    
                    if (!adminData.adminWallet) {
                        throw new Error('Không tìm thấy ví admin trong response!');
                    }

                    // Lấy giá tiền điện tử hiện tại
                    console.log('Fetching cryptocurrency price from /api/cryptocurrency/active-price...');
                    const priceRes = await fetch('/api/cryptocurrency/active-price');
                    console.log('Price response status:', priceRes.status);
                    
                    if (!priceRes.ok) {
                        const errorText = await priceRes.text();
                        throw new Error(`Failed to fetch price (${priceRes.status}): ${errorText}`);
                    }
                    
                    const priceData = await priceRes.json();
                    console.log('Price data:', priceData);
                    
                    const exchangeRate = priceData.priceVND || 8750;
                    const totalVND = parseInt(formData.get('totalPrice'));
                    const totalSGB = (totalVND / exchangeRate).toFixed(4);

                    console.log('Calculated amounts:', {
                        totalVND,
                        exchangeRate,
                        totalSGB
                    });

                    // Check if showCryptoPaymentModal exists
                    if (typeof showCryptoPaymentModal !== 'function') {
                        throw new Error('showCryptoPaymentModal function not found! Make sure crypto-payment.js is loaded.');
                    }

                    // Hiển thị modal thanh toán
                    console.log('Calling showCryptoPaymentModal...');
                    showCryptoPaymentModal({
                        adminWallet: adminData.adminWallet,
                        amount: totalSGB,
                        vndAmount: totalVND,
                        receiverName: formData.get('receiverName'),
                        receiverPhone: formData.get('receiverPhone'),
                        receiverAddress: formData.get('receiverAddress'),
                        receiverEmail: formData.get('receiverEmail'),
                        receiverNote: formData.get('receiverNote'),
                        cartItems: cartItems
                    });

                    console.log('=== CRYPTO PAYMENT FLOW SUCCESS ===');
                    btnCheckout.disabled = false;
                    btnCheckout.innerText = 'Tiến hành thanh toán';
                } catch (err) {
                    console.error('=== CRYPTO PAYMENT ERROR ===');
                    console.error('Error object:', err);
                    console.error('Error message:', err.message);
                    console.error('Error stack:', err.stack);
                    
                    alert(`Lỗi khi chuẩn bị thanh toán tiền ảo!\n\n${err.message}`);
                    btnCheckout.disabled = false;
                    btnCheckout.innerText = 'Tiến hành thanh toán';
                }
            }
            // Nếu không phải PayPal hoặc Crypto thì để form submit như cũ
        });
    }
});

$(document).ready(() => {
    const avatarFile = $("#avatarFile");
    avatarFile.change(function (e) {
        const imgURL = URL.createObjectURL(e.target.files[0]);
        const $preview = $("#avatarPreview");
        $preview.attr("src", imgURL)
            .css({ "display": "block" })
            .addClass("rounded-circle img-thumbnail")
            .css({
                width: "160px",
                height: "160px",
                objectFit: "cover",
                margin: "0 auto",
                border: "3px solid #eee"
            });
    });
});


// Chỉ cho phép nhập số, bắt đầu bằng 0, tối đa 10 số
$(document).ready(function () {
    const $phone = $('#phone');
    $phone.on('input', function (e) {
        let val = $phone.val();
        // Loại bỏ ký tự không phải số
        val = val.replace(/[^0-9]/g, '');
        // Bắt đầu bằng 0
        if (val.length > 0 && val[0] !== '0') {
            val = '0' + val.replace(/^0+/, '');
        }
        // Giới hạn 10 số
        if (val.length > 10) {
            val = val.slice(0, 10);
        }
        $phone.val(val);
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const btnEdit = document.getElementById('btnEdit');
    const btnSave = document.getElementById('btnSave');
    const btnCancel = document.getElementById('btnCancel');
    const inputs = [
        document.getElementById('fullName'),
        document.getElementById('phone'),
        document.getElementById('address')
    ]; // Email luôn disabled
    const changeAvatarWrapper = document.getElementById('changeAvatarWrapper');

    // Ẩn nút đổi ảnh đại diện khi load trang
    if (changeAvatarWrapper) changeAvatarWrapper.style.display = 'none';

    btnEdit.addEventListener('click', function () {
        inputs.forEach(i => i.removeAttribute('disabled'));
        btnEdit.classList.add('d-none');
        btnSave.classList.remove('d-none');
        btnCancel.classList.remove('d-none');
        if (changeAvatarWrapper) changeAvatarWrapper.style.display = '';
    });

    btnCancel.addEventListener('click', function () {
        window.location.reload();
    });
});

document.addEventListener('DOMContentLoaded', function () {
    var btnChangePassword = document.getElementById('btnChangePassword');
    if (btnChangePassword) {
        btnChangePassword.addEventListener('click', function () {
            var modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
            modal.show();
        });
    }
    // Validate password match
    var changePasswordForm = document.querySelector('#changePasswordModal form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function (e) {
            var newPassword = document.getElementById('newPassword').value;
            var confirmPassword = document.getElementById('confirmPassword').value;
            // Remove old error if exists
            var oldAlert = document.getElementById('password-mismatch-alert');
            if (oldAlert) oldAlert.remove();
            if (newPassword !== confirmPassword) {
                e.preventDefault();
                var alert = document.createElement('div');
                alert.className = 'alert alert-danger mt-2';
                alert.id = 'password-mismatch-alert';
                alert.innerText = 'Mật khẩu mới và xác nhận mật khẩu không giống nhau!';
                var modalBody = changePasswordForm.querySelector('.modal-body');
                modalBody.appendChild(alert);
            }
        });
    }
});


document.addEventListener('DOMContentLoaded', function () {
    const qtyInput = document.querySelector('input[name="quantity"]');
    if (!qtyInput) return;
    const max = parseInt(qtyInput.getAttribute('max'));
    qtyInput.addEventListener('input', function (e) {
        let val = qtyInput.value;
        // Chỉ cho nhập số hoặc rỗng
        if (val === '') return;
        // Nếu nhập ký tự không phải số thì loại bỏ
        if (!/^\d+$/.test(val)) {
            qtyInput.value = val.replace(/\D/g, '');
            return;
        }
        // Nếu lớn hơn max thì reset về max
        if (parseInt(val) > max) {
            qtyInput.value = max;
        }
    });
    qtyInput.addEventListener('blur', function () {
        // Nếu rỗng thì về 1
        if (qtyInput.value === '' || parseInt(qtyInput.value) < 1) {
            qtyInput.value = 1;
        }
    });
});
//select cart

// --- Đồng bộ select variant với input variantId trong bảng checkout (cart page) ---
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('select[name^="variantSelect-"]').forEach(function(select) {
        select.addEventListener('change', function() {
            var cartDetailId = this.name.replace('variantSelect-', '');
            // Duyệt từng dòng trong bảng checkout để tìm đúng dòng có id tương ứng
            document.querySelectorAll('form[action="/handle-add-to-cart"] table tbody tr').forEach(function(tr) {
                var idInput = tr.querySelector('input[name$="[id]"]');
                var variantInput = tr.querySelector('input[name$="[variantId]"]');
                if (idInput && variantInput && idInput.value == cartDetailId) {
                    variantInput.value = select.value;
                }
            });
        });
    });
});
// --- Update price when variant select changes in cart ---
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('select[name^="variantSelect-"]').forEach(function(select) {
            select.addEventListener('change', function() {
                var cartDetailId = this.name.replace('variantSelect-', '');
                var selectedOption = this.options[this.selectedIndex];
                var priceMore = parseInt(selectedOption.getAttribute('data-pricemore')) || 0;
                // Lấy giá gốc sản phẩm từ thẻ input data-InputCartDetail-price
                var priceInput = document.querySelector('input[data-InputCartDetail-id="' + cartDetailId + '"]');
                var basePrice = priceInput ? parseInt(priceInput.getAttribute('data-InputCartDetail-price')) : 0;
                var quantityInput = document.querySelector('input[data-InputCartDetail-id="' + cartDetailId + '"]');
                var quantity = quantityInput ? parseInt(quantityInput.value) : 1;
                var totalUnitPrice = basePrice + priceMore;
                var totalLine = totalUnitPrice * quantity;
                // Cập nhật giá hiển thị
                var priceDisplay = document.getElementById('price-display-' + cartDetailId);
                if (priceDisplay) {
                    priceDisplay.textContent = totalUnitPrice.toLocaleString('vi-VN') + ' VND';
                    priceDisplay.setAttribute('data-selected-pricemore', priceMore);
                }
                // Cập nhật tổng cộng từng dòng
                var totalLineDisplay = document.querySelector('p[data-OutPutCartDetail-id="' + cartDetailId + '"]');
                if (totalLineDisplay) {
                    totalLineDisplay.textContent = totalLine.toLocaleString('vi-VN') + ' VND';
                }
                // Cập nhật tổng tiền toàn bộ cart
                updateCartTotals();
            });
        });

        // Hàm cập nhật tổng tiền toàn bộ cart (tạm tính và tổng cộng)
        function updateCartTotals() {
            var totalPrice = 0;
            // Lấy tất cả các checkbox đã checked
            document.querySelectorAll('.cart-checkbox:checked').forEach(function(checkbox) {
                var row = checkbox.closest('tr');
                if (!row) return;
                // Lấy id sản phẩm từ class detailCartId:<id>
                var classList = row.className.split(' ');
                var cartDetailId = null;
                classList.forEach(function(cls) {
                    if (cls.startsWith('detailCartId:')) {
                        cartDetailId = cls.split(':')[1];
                    }
                });
                if (!cartDetailId) return;
                var priceDisplay = document.getElementById('price-display-' + cartDetailId);
                var price = priceDisplay ? (parseInt(priceDisplay.getAttribute('data-base-price')) + parseInt(priceDisplay.getAttribute('data-selected-pricemore')) || 0) : 0;
                var quantityInput = document.querySelector('input[data-InputCartDetail-id="' + cartDetailId + '"]');
                var quantity = quantityInput ? parseInt(quantityInput.value) : 1;
                totalPrice += price * quantity;
            });
            var totalPriceEls = document.querySelectorAll('p[data-TotalPrice]');
            totalPriceEls.forEach(function(el) {
                el.textContent = totalPrice.toLocaleString('vi-VN') + ' VND';
            });
            var totalWithShip = totalPrice > 0 ? totalPrice : 0;
            var totalPriceTTEls = document.querySelectorAll('p[data-TotalPriceTT]');
            totalPriceTTEls.forEach(function(el) {
                el.textContent = totalWithShip.toLocaleString('vi-VN') + ' VND';
            });
        }
    });
// --- END ---
$(document).ready(function () {
    // Cart page logic ...existing code...
    function updateSelectedTotals() {
        let totalPrice = 0;
        $('.cart-checkbox:checked').each(function () {
                const row = $(this).closest('tr');
                // Get base price
                const qtyInput = row.find('input[name="quantityProduct"]');
                const basePrice = Number(qtyInput.attr('data-InputCartDetail-price')) || 0;
                let priceMore = 0;
                // Try to get priceMore from the selected variant in the same row
                const variantSelect = row.find('select[name^="variantSelect-"]');
                if (variantSelect.length) {
                    const selectedOption = variantSelect.find('option:selected');
                    priceMore = Number(selectedOption.data('pricemore')) || 0;
                } else {
                    // fallback: try to get from price display
                    const priceDisplay = row.find('[id^="price-display-"]');
                    if (priceDisplay.length) {
                        priceMore = Number(priceDisplay.attr('data-selected-pricemore')) || 0;
                    }
                }
                const quantity = Number(qtyInput.val()) || 1;
                const totalUnitPrice = basePrice + priceMore;
                totalPrice += totalUnitPrice * quantity;
        });
        $('p[data-TotalPrice]').text(totalPrice.toLocaleString('vi-VN') + ' VND');
        const totalWithShip = totalPrice > 0 ? totalPrice : 0;
        $('p[data-TotalPriceTT]').text(totalWithShip.toLocaleString('vi-VN') + ' VND');
    }
    function toggleCheckoutBtn() {
        if ($('.cart-checkbox:checked').length > 0) {
            $('#btnCheckout').prop('disabled', false);
        } else {
            $('#btnCheckout').prop('disabled', true);
        }
        updateSelectedTotals();
    }
    $('.cart-checkbox, #selectAll').on('change', toggleCheckoutBtn);
    toggleCheckoutBtn();
    $('#selectAll').on('change', function () {
        $('.cart-checkbox').prop('checked', this.checked);
        toggleCheckoutBtn();
    });

    // --- Product detail page: xử lý variant radio, số lượng và nút đặt hàng (jQuery only, không xung đột) ---
    const $variantRadios = $('input[type="radio"][name="productVariantId"], .variant-radio');
    const $qtyInput = $('input[name="quantity"]');
    const $orderBtn = $('.btn-shopping-bag, .btn-add-to-cart, .btn-order, .btn-primary, .btn.border.border-secondary.rounded-pill');
    let $submitBtn = $orderBtn.filter(function () {
        return $(this).text().includes('Thêm vào giỏ') || $(this).text().includes('Đặt hàng');
    }).first();
    const $btnMinus = $('.btn-minus');
    const $btnPlus = $('.btn-plus');
    let dynamicMaxQty = 1;
    if ($variantRadios.length && $qtyInput.length && $submitBtn.length) {
        $variantRadios.prop('checked', false);
        $qtyInput.prop('disabled', true);
        $submitBtn.prop('disabled', true);
        $btnMinus.prop('disabled', true);
        $btnPlus.prop('disabled', true);
        let $outOfStockMsg = $('#variant-out-of-stock-msg');
        if (!$outOfStockMsg.length) {
            $outOfStockMsg = $('<div id="variant-out-of-stock-msg" class="text-danger fw-bold mb-2" style="display:none;">Lựa chọn này đã hết hàng</div>');
            $qtyInput.closest('.input-group').before($outOfStockMsg);
        }
        function updatePriceByVariant() {
            const priceDisplay = $('#product-price-display');
            const basePrice = priceDisplay.length ? parseFloat(priceDisplay.attr('data-base-price')) : 0;
            const checkedRadio = $variantRadios.filter(':checked');
            const priceMore = checkedRadio.length ? parseInt(checkedRadio.attr('data-price-more')) || 0 : 0;
            const total = basePrice + priceMore;
            if (priceDisplay.length) priceDisplay.text(total.toLocaleString('vi-VN'));
        }
        $variantRadios.on('change', function () {
            $variantRadios.prop('checked', false);
            $(this).prop('checked', true);
            if ($(this).is(':checked')) {
                dynamicMaxQty = parseInt($(this).data('quantity'));
                if (isNaN(dynamicMaxQty)) dynamicMaxQty = 1;
                $qtyInput.attr('max', dynamicMaxQty);
                if (dynamicMaxQty === 0) {
                    $qtyInput.prop('disabled', true);
                    $submitBtn.prop('disabled', true);
                    $btnMinus.prop('disabled', true);
                    $btnPlus.prop('disabled', true);
                    $outOfStockMsg.show();
                } else {
                    $qtyInput.prop('disabled', false);
                    $submitBtn.prop('disabled', false);
                    $btnMinus.prop('disabled', false);
                    $btnPlus.prop('disabled', false);
                    $outOfStockMsg.hide();
                    let val = parseInt($qtyInput.val()) || 1;
                    if (val > dynamicMaxQty) $qtyInput.val(dynamicMaxQty);
                    if (val < 1) $qtyInput.val(1);
                }
                updatePriceByVariant();
            }
        });
        // Click vào card cũng trigger radio change
        $('.variant-card').on('click', function () {
            const radioId = $(this).data('variant-radio');
            const $radio = $('#' + radioId);
            if ($radio.length) {
                $variantRadios.prop('checked', false);
                $radio.prop('checked', true).trigger('change');
            }
        });
    }
    // --- END ---
    // Giữ lại logic tăng/giảm số lượng
    if ($qtyInput.length && !$qtyInput.closest('table').length) {
        const min = parseInt($qtyInput.attr('min')) || 1;
        $qtyInput.val(min);
        $qtyInput.on('input', function () {
            let val = $(this).val();
            if (val === '' || isNaN(val)) return;
            val = parseInt(val);
            let max = parseInt($qtyInput.attr('max')) || dynamicMaxQty || 9999;
            if (val < min) $(this).val(min);
            if (val > max) $(this).val(max);
        });
        // Nút tăng
        $btnPlus.on('click', function () {
            if ($qtyInput.prop('disabled')) return;
            if ($(this).closest('.quantity').find('input[name="quantity"]').length) {
                let val = parseInt($qtyInput.val()) || min;
                let max = parseInt($qtyInput.attr('max')) || dynamicMaxQty || 9999;
                if (val < max) $qtyInput.val(val + 1).trigger('input');
            }
        });
        // Nút giảm
        $btnMinus.on('click', function () {
            if ($qtyInput.prop('disabled')) return;
            if ($(this).closest('.quantity').find('input[name="quantity"]').length) {
                let val = parseInt($qtyInput.val()) || min;
                if (val > min) $qtyInput.val(val - 1).trigger('input');
            }
        });
    }

    // --- Xử lý enable/disable số lượng và nút thêm vào giỏ hàng khi chọn variant (dành cho trang home, list sản phẩm) ---
    document.querySelectorAll('.product-card').forEach(function (card) {
        var radios = card.querySelectorAll('.variant-radio');
        var qtyInput = card.querySelector('.quantity-input');
        var addBtn = card.querySelector('.add-to-cart-btn');
        var form = card.querySelector('.add-to-cart-form');
        var variantIdInput = card.querySelector('.variant-id-input');
        if (radios.length > 0 && qtyInput && addBtn && form && variantIdInput) {
            // Ban đầu disable
            qtyInput.disabled = true;
            addBtn.disabled = true;
            radios.forEach(function (radio) {
                radio.checked = false;
                radio.addEventListener('change', function () {
                    if (radio.checked) {
                        qtyInput.disabled = false;
                        addBtn.disabled = false;
                        variantIdInput.value = radio.value;
                    }
                });
            });
            // Khi submit nếu chưa chọn variant thì không cho submit
            form.addEventListener('submit', function (e) {
                if (!variantIdInput.value) {
                    e.preventDefault();
                    alert('Vui lòng chọn loại sản phẩm trước!');
                }
            });
        }
    });
    // --- END ---
});

document.addEventListener('DOMContentLoaded', function () {
    // Giá gốc sản phẩm lấy từ attribute data-base-price
    var priceDisplay = document.getElementById('product-price-display');
    var basePrice = priceDisplay ? parseFloat(priceDisplay.getAttribute('data-base-price')) : 0;
    // Hàm cập nhật giá khi chọn variant
    function updatePriceByVariant() {
        var checkedRadio = document.querySelector('.variant-radio:checked');
        var priceMore = checkedRadio ? parseInt(checkedRadio.getAttribute('data-price-more')) || 0 : 0;
        var total = basePrice + priceMore;
        if (priceDisplay) priceDisplay.textContent = total.toLocaleString('vi-VN');
    }
    // Khởi tạo giá đúng khi load trang
    updatePriceByVariant();
    document.querySelectorAll('.variant-card').forEach(function (card) {
        card.addEventListener('click', function (e) {
            // Chọn radio tương ứng
            var radioId = card.getAttribute('data-variant-radio');
            var radio = document.getElementById(radioId);
            if (radio && !radio.checked) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
            }
            // Đổi hiệu ứng chọn
            document.querySelectorAll('.variant-card').forEach(function (c) { c.classList.remove('selected'); });
            card.classList.add('selected');
            updatePriceByVariant();
        });
    });
    // Khi radio thay đổi (bấm trực tiếp vào label)
    document.querySelectorAll('.variant-radio').forEach(function (radio) {
        radio.addEventListener('change', function () {
            if (radio.checked) {
                document.querySelectorAll('.variant-card').forEach(function (card) {
                    if (card.getAttribute('data-variant-radio') === radio.id) card.classList.add('selected');
                    else card.classList.remove('selected');
                });
                updatePriceByVariant();
            }
        });
    });
    // Xử lý nút xem thêm variant
    var showMoreBtn = document.getElementById('show-more-variants');
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', function () {
            document.querySelectorAll('.variant-item.d-none').forEach(function (item) {
                item.classList.remove('d-none');
            });
            showMoreBtn.style.display = 'none';
        });
    }
});