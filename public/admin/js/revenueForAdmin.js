document.addEventListener('DOMContentLoaded', async function () {
    // Khởi tạo biểu đồ và xử lý filter bằng AJAX
    const input = document.getElementById('revenueDataInput');
    let revenueObj = {};
    if (input && input.value) {
        try {
            revenueObj = JSON.parse(input.value);
        } catch (e) {
            console.error('Error parsing revenue data:', e);
        }
    }
    var ctx = document.getElementById('myAreaChart').getContext('2d');
    let chart;
    function renderChart(dataObj) {
        const labels = Object.keys(dataObj);
        const data = Object.values(dataObj);
        if (chart) chart.destroy();
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue by month (VNĐ)',
                    data: data,
                    fill: true,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    tension: 0.3
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('vi-VN') + ' VNĐ';
                            }
                        }
                    }
                }
            }
        });
    }

    // Render lần đầu với dữ liệu ban đầu
    renderChart(revenueObj);

    // Xử lý sự kiện chọn filter
    const filterSelect = document.getElementById('revenueFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', function () {
            const filterValue = this.value;
            fetch(`/api/admin/revenue/${filterValue}`)
                .then(res => res.json())
                .then(data => {
                    // Nếu object rỗng thì xóa chart và hiển thị thông báo
                    if (!data || Object.keys(data).length === 0) {
                        if (chart) chart.destroy();
                        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                        // Hiển thị thông báo
                        let info = document.getElementById('noRevenueInfo');
                        if (!info) {
                            info = document.createElement('div');
                            info.id = 'noRevenueInfo';
                            info.style.textAlign = 'center';
                            info.style.color = 'red';
                            info.style.marginTop = '20px';
                            ctx.canvas.parentNode.appendChild(info);
                        }
                        info.textContent = 'Không có dữ liệu doanh thu cho lựa chọn này.';
                        return;
                    } else {
                        // Xóa thông báo nếu có
                        const info = document.getElementById('noRevenueInfo');
                        if (info) info.remove();
                        renderChart(data);
                    }
                })
                .catch(err => {
                    console.error('Lỗi lấy dữ liệu:', err);
                });
        });
    };

    //Best Sell Pie Chart------------------------------------------------------------------------------------------------------
    // Gọi API lấy top 5 sản phẩm bán chạy nhất
    try {
        const res = await fetch('/api/admin/best-sell-products');
        const data = await res.json();
        // data: [{ productId, quantitySold, product: { name, ... } }]
        const labels = data.map(item => item.product ? item.product.name : 'Unknown');
        const values = data.map(item => item.quantitySold);
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
        ];
        const ctx = document.getElementById('myPieChart').getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    } catch (err) {
        console.error('Không thể lấy dữ liệu pie chart:', err);
    };

    //Top Contributors Bar Chart------------------------------------------------------------------------------------------------------
    // Gọi API lấy top 8 người dùng mua nhiều nhất
    try {
        const res = await fetch('/api/admin/top-contributors');
        const data = await res.json();
        // data: [{ userId, quantityBought, user: { fullName, email, ... } }]
        const labels = data.map(item => item.user ? (item.user.fullName || item.user.email || 'Unknown') : 'Unknown');
        const values = data.map(item => item.quantityBought);
        const colors = [
            '#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8F94FB'
        ];
        const ctx = document.getElementById('myBarChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Số lượng sản phẩm đã mua',
                    data: values,
                    backgroundColor: colors,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Không thể lấy dữ liệu bar chart:', err);
    };

    
});