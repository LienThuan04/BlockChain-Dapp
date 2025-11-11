# chuẩn bị môi trường NodeJs với phiên bản 23, alpine là phiên bản nhẹ hơn :
FROM node:23-alpine

# thiết lập thư mục làm việc trong container, nếu thư mục chưa tồn tại thì lệnh này sẽ tạo mới thư mục:
WORKDIR /app/SeverSSR 
# sao chép toàn bộ file từ thư mục hiện tại vào thư mục làm việc trong container:
COPY package*.json ./
# cài đặt các thư viện được liệt kê trong file package.json, sử dụng --legacy-peer-deps để tránh xung đột phụ thuộc:
RUN npm install --legacy-peer-deps

# sao chép toàn bộ mã nguồn từ thư mục hiện tại vào thư mục làm việc trong container:
COPY . . 
# lí do: tránh sao chép thư mục node_modules từ máy host vào container và chỉ chạy lệnh run trên khi file package.json thay đổi
# dấu . là đại diện cho thư mục hiện tại trên máy host và thư mục làm việc trong container
# dấu . ở cuối lệnh COPY chỉ định sao chép tất cả các file và thư mục từ thư mục hiện tại trên máy host vào thư mục làm việc trong container

# xây dựng ứng dụng cho môi trường production:
RUN npx prisma generate
RUN npm run build:linux
# lệnh này sẽ tạo ra thư mục build chứa mã nguồn đã được tối ưu hóa cho môi trường production

# lệnh này sẽ được chạy khi container được khởi động:
    # sh -c: cho phép chạy các lệnh shell phức tạp
    # npx prisma db pull: đồng bộ mô hình Prisma với cơ sở dữ liệu hiện tại
    # &&: đảm bảo lệnh thứ hai chỉ chạy nếu lệnh đầu tiên thành công
CMD sh -c "npx prisma db push && npm run start" 

# lệnh này sẽ chạy ứng dụng Node.js ở chế độ production bằng cách sử dụng script "start" được định nghĩa trong file package.json