/*!
    * Start Bootstrap - SB Admin v7.0.7 (https://startbootstrap.com/template/sb-admin)
    * Copyright 2013-2023 Start Bootstrap
    * Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-sb-admin/blob/master/LICENSE)
    */
// 
// Scripts
// 

window.addEventListener('DOMContentLoaded', event => {

    // Toggle the side navigation
    const sidebarToggle = document.body.querySelector('#sidebarToggle');
    if (sidebarToggle) {
        // Uncomment Below to persist sidebar toggle between refreshes
        // if (localStorage.getItem('sb|sidebar-toggle') === 'true') {
        //     document.body.classList.toggle('sb-sidenav-toggled');
        // }
        sidebarToggle.addEventListener('click', event => {
            event.preventDefault();
            document.body.classList.toggle('sb-sidenav-toggled');
            localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
        });
    }

});

//set value for quantity input
document.addEventListener('DOMContentLoaded', function () {
    // Tăng/giảm số lượng
    document.querySelectorAll('.btn-plus, .btn-minus').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const input = btn.closest('.quantity').querySelector('input[type="number"]');
            let value = parseInt(input.value) || 1;
            const max = parseInt(input.getAttribute('max')) || 9999;
            if (btn.classList.contains('btn-plus')) {
                if (value < max) value++;
            } else {
                if (value > 1) value--;
            }
            input.value = value;
            input.dispatchEvent(new Event('input'));
        });
    });

    // Khi nhập số lượng trực tiếp
    document.querySelectorAll('input[name^="detailOrder"][name$="[quantity]"]').forEach(function (input) {
        input.addEventListener('input', function () {
            // Cho phép input rỗng để người dùng nhập lại số khác
            if (input.value === '') {
                updateTableQuantity(input, '');
                updateTotal();
                return;
            }
            let value = parseInt(input.value);
            const max = parseInt(input.getAttribute('max')) || 9999;
            if (isNaN(value)) value = 1;
            if (value < 1) value = 1;
            if (value > max) value = max;
            input.value = value;
            // Cập nhật tổng từng sản phẩm
            const price = Number(input.getAttribute('data-InputCartDetail-price'));
            const priceMore = Number(input.getAttribute('data-InputCartDetail-priceMore')) || 0;
            const id = input.getAttribute('data-InputCartDetail-id');
            const priceElement = document.querySelector(`[data-OutPutCartDetail-id='${id}']`);
            if (priceElement) {
                const newPrice = (price + priceMore) * value;
                priceElement.textContent = newPrice.toLocaleString('vi-VN') + ' VND';
            }
            updateTableQuantity(input, value);
            updateTotal();
        });
        // Khi mất focus nếu rỗng thì set về 1
        input.addEventListener('blur', function () {
            if (input.value === '' || Number(input.value) < 1) {
                input.value = 1;
                input.dispatchEvent(new Event('input'));
            }
        });
    });

    // Hàm đồng bộ số lượng vào input ẩn trong table (nếu cần)
    function updateTableQuantity(input, value) {
        // Không cần thiết nếu không có input ẩn
    }

    function updateTotal() {
        let totalQty = 0;
        let totalPrice = 0;
        document.querySelectorAll('input[name^="detailOrder"][name$="[quantity]"]').forEach(function (input) {
            const qty = parseInt(input.value) || 1;
            const price = Number(input.getAttribute('data-InputCartDetail-price'));
            const priceMore = Number(input.getAttribute('data-InputCartDetail-priceMore')) || 0;
            totalQty += qty;
            totalPrice += qty * (price + priceMore);
        });
        // Removed fixed 30k surcharge - totals should reflect actual item sums
        // totalPrice remains as computed from item lines
        const totalQtyInput = document.getElementById('total-quantity');
        const totalPriceInput = document.getElementById('total-price');
        if (totalQtyInput) totalQtyInput.value = totalQty;
        if (totalPriceInput) totalPriceInput.value = totalPrice.toLocaleString('vi-VN') + ' VNĐ';
    }

    // Khởi tạo tổng ban đầu
    updateTotal();
});

setTimeout(function () {
    var alert = document.getElementById('order-success-alert');
    if (alert) {
        var bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
        bsAlert.close();
    }
}, 5000);


setTimeout(function () {
    var alert = document.getElementById('factory-error-alert');
    if (alert) {
        var bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
        bsAlert.close();
    }
}, 10000);


setTimeout(function () {
    var alert = document.getElementById('target-error-alert');
    if (alert) {
        var bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
        bsAlert.close();
    }
}, 10000);



let variantIdx = 0;
// Lưu id các variant bị xóa (chỉ với variant đã có id)
let variantsToDelete = [];

// Khi vào trang edit, set variantIdx = số lượng variant hiện có (tránh trùng name)
function initVariantIdx() {
    const rows = document.querySelectorAll('#variants-list .variant-row');
    let maxIdx = -1;
    rows.forEach(row => {
        const idx = parseInt(row.getAttribute('data-idx'));
        if (!isNaN(idx) && idx > maxIdx) maxIdx = idx;
    });
    variantIdx = maxIdx + 1;
}

function addVariantRow(cpu = '', memory = '', color = '', priceMore = '', quantity = '', id = '') {
    const isFirst = variantIdx === 0 && $('#variants-list .variant-row').length === 0;
    // Các option bộ nhớ: 8/512, 16/512, 32/1024, 32/2048
    const memoryOptions = [
        { value: '8GB/512GB', label: '8GB/512GB' },
        { value: '16GB/512GB', label: '16GB/512GB' },
        { value: '32GB/1024GB', label: '32GB/1024GB' },
        { value: '32GB/2048GB', label: '32GB/2048GB' }
    ];
    // Nếu có id thì thêm input hidden id
    const idInput = id ? `<input type="hidden" name="variants[${variantIdx}][id]" value="${id}">` : '';
    const html = `
                <div class="row g-2 align-items-end variant-row mb-2" data-idx="${variantIdx}" ${id ? `data-variant-id="${id}"` : ''}>
                    ${idInput}
                    <div class="col-md-2">
                        <input type="text" class="form-control" name="variants[${variantIdx}][cpu]" placeholder="Chip" value="${cpu}" required>
                    </div>
                    <div class="col-md-2">
                        <select class="form-select" name="variants[${variantIdx}][memory]" required>
                            ${memoryOptions.map(opt => `<option value="${opt.value}" ${memory == opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-2">
                        <input type="text" class="form-control" name="variants[${variantIdx}][color]" placeholder="Color" value="${color}" required>
                    </div>
                    <div class="col-md-2" style="min-width: 25%">
                        <input type="number" class="form-control" name="variants[${variantIdx}][priceMore]" placeholder="Additional Price" value="${priceMore}" min="0" required>
                    </div>
                    <div class="col-md-2">
                        <input type="number" class="form-control variant-qty" name="variants[${variantIdx}][quantity]" placeholder="Quantity" value="${quantity}" min="0" required>
                    </div>
                    <div class="col-md-2">
                        ${isFirst ? '' : '<button type="button" class="btn btn-danger btn-sm" onclick="removeVariantRow(this)">Delete</button>'}
                    </div>
                </div>`;
    $('#variants-list').append(html);
    variantIdx++;
    // Hàm giới hạn giá trị cho input số lượng và giá cộng thêm
    function limitInputValue(input, max) {
        let val = $(input).val();
        val = val.replace(/[^\d]/g, '');
        if (val === '') val = '0';
        let num = Number(val);
        if (num < 0) num = 0;
        if (num > max) num = max;
        $(input).val(num);
    }
    // Gắn lại sự kiện input/change/wheel/paste cho quantity
    $('.variant-qty').off('input change wheel paste').on('input change wheel paste', function () {
        limitInputValue(this, 1000);
        updateTotalQuantity();
    });
    // Gắn lại sự kiện input/change/wheel/paste cho priceMore
    $('input[name*="[priceMore]"]').off('input change wheel paste').on('input change wheel paste', function () {
        limitInputValue(this, 2100000000);
    });
    updateTotalQuantity();
}
function removeVariantRow(btn) {
    const row = $(btn).closest('.variant-row');
    // Nếu có id (tức là variant đã tồn tại trong DB), lưu vào mảng variantsToDelete
    const idInput = row.find('input[name$="[id]"]');
    if (idInput.length > 0) {
        const id = idInput.val();
        if (id) {
            variantsToDelete.push(id);
            // Thêm input hidden vào form để submit lên backend
            if ($(`#variantsToDelete input[value='${id}']`).length === 0) {
                $('#variantsToDelete').append(`<input type='hidden' name='variantsToDelete[]' value='${id}'>`);
            }
        }
    }
    row.remove();
    updateTotalQuantity();
}
function updateTotalQuantity() {
    let total = 0;
    $('.variant-qty').each(function () {
        const val = parseInt($(this).val());
        if (!isNaN(val)) total += val;
    });
    $('#Quantity').val(total);
}
// Chỉ tự động thêm dòng variant mặc định ở trang tạo mới sản phẩm (create.ejs),
// còn ở trang cập nhật (view.ejs) thì KHÔNG tự động thêm dòng nào cả.
function attachVariantInputEvents() {
    function limitInputValue(input, max) {
        let val = $(input).val();
        val = val.replace(/[^\d]/g, '');
        if (val === '') val = '0';
        let num = Number(val);
        if (num < 0) num = 0;
        if (num > max) num = max;
        $(input).val(num);
    }
    $('.variant-qty').off('input change wheel paste').on('input change wheel paste', function () {
        limitInputValue(this, 1000);
        updateTotalQuantity();
    });
    // Đảm bảo mọi trường quantity đều được kiểm soát giá trị ngay khi load
    $('.variant-qty').each(function() {
        limitInputValue(this, 1000);
    });
    $('input[name*="[priceMore]"]').off('input change wheel paste').on('input change wheel paste', function () {
        limitInputValue(this, 2100000000);
    });
    // Đảm bảo mọi trường priceMore đều được kiểm soát giá trị ngay khi load
    $('input[name*="[priceMore]"]').each(function() {
        limitInputValue(this, 2100000000);
    });
}

if (window.location.pathname.includes('/admin/create-product')) {
    $(document).ready(function () {
        addVariantRow();
        attachVariantInputEvents();
        $('.variant-qty').off('input change').on('input change', updateTotalQuantity);
    });
} else if (window.location.pathname.includes('/admin/view_product')) {
    // Khi vào trang edit sản phẩm, cập nhật tổng số lượng ngay khi load
    $(document).ready(function () {
        initVariantIdx();
        updateTotalQuantity();
        attachVariantInputEvents();
        // Đảm bảo khi thay đổi số lượng variant cũng cập nhật tổng
        $('.variant-qty').off('input change').on('input change', updateTotalQuantity);
    });
}

// Multi-image upload preview, safe for reuse
function initMultiImageUpload(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;
    let filesArr = [];

    input.addEventListener('change', function (e) {
        const newFiles = Array.from(e.target.files);
        filesArr = filesArr.concat(newFiles);
        renderPreview();
        updateInputFiles();
    });

    function renderPreview() {
        preview.innerHTML = '';
        filesArr.forEach((file, idx) => {
            const url = URL.createObjectURL(file);
            const imgDiv = document.createElement('div');
            imgDiv.className = 'position-relative m-2';
            imgDiv.style.width = '120px';
            imgDiv.innerHTML = `
                <img src="${url}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;">
                <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0" style="width:30px;height:30px;border-radius:50%;" data-idx="${idx}">&times;</button>
            `;
            preview.appendChild(imgDiv);
        });
        preview.querySelectorAll('button[data-idx]').forEach(btn => {
            btn.onclick = function () {
                const idx = Number(btn.getAttribute('data-idx'));
                filesArr.splice(idx, 1);
                updateInputFiles();
                renderPreview();
            };
        });
    }

    function updateInputFiles() {
        const dt = new DataTransfer();
        filesArr.forEach(f => dt.items.add(f));
        input.files = dt.files;
    }
}

function initProductImageGallery(galleryId, inputId, deletedDivId) {
    const gallery = document.getElementById(galleryId);
    const form = document.querySelector('form');
    const deletedDiv = document.getElementById(deletedDivId);
    // Xử lý xóa ảnh cũ
    if (gallery) {
        gallery.addEventListener('click', function (e) {
            if (e.target.matches('button[data-img-id]')) {
                const imgDiv = e.target.closest('.position-relative');
                const imgId = e.target.getAttribute('data-img-id');
                if (imgDiv) {
                    imgDiv.remove();
                }
                // Thêm input hidden deletedImageIds[] vào div ẩn nếu chưa có
                if (imgId && deletedDiv && !deletedDiv.querySelector(`input[value='${imgId}']`)) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'deletedImageIds[]';
                    input.value = Number(imgId);
                    deletedDiv.appendChild(input);
                }
            }
        });
    }
    // Preview và xóa ảnh mới
    const newImagesInput = document.getElementById(inputId);
    let newFilesArr = [];
    if (newImagesInput && gallery) {
        newImagesInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            newFilesArr = newFilesArr.concat(files);
            renderNewImages();
        });
        function renderNewImages() {
            Array.from(gallery.querySelectorAll('.new-image-preview')).forEach(el => el.remove());
            newFilesArr.forEach((file, idx) => {
                const url = URL.createObjectURL(file);
                const imgDiv = document.createElement('div');
                imgDiv.className = 'position-relative m-2 new-image-preview';
                imgDiv.style.width = '120px';
                imgDiv.innerHTML = `
                    <img src="${url}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;">
                    <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0" style="width:30px;height:30px;border-radius:50%;" data-new-idx="${idx}">&times;</button>
                `;
                gallery.appendChild(imgDiv);
            });
            const dt = new DataTransfer();
            newFilesArr.forEach(f => dt.items.add(f));
            newImagesInput.files = dt.files;
        }
        gallery.addEventListener('click', function(e) {
            if (e.target.matches('button[data-new-idx]')) {
                const idx = Number(e.target.getAttribute('data-new-idx'));
                newFilesArr.splice(idx, 1);
                renderNewImages();
            }
        });
    }
}