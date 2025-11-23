// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol"; /*bảo vệ hàm tránh tấn công reentrancy (hack kinh điển trong Ethereum).*/
import "@openzeppelin/contracts/access/Ownable.sol";
//Ownable: cho phép gán quyền owner cho người deploy contract → chủ contract có thể sử dụng các hàm đặc quyền (như withdraw).

contract LaptopMarketplace is ReentrancyGuard, Ownable {
    struct Laptop {
        uint256 id;
        string name;
        uint256 price;
        bool available;
        address seller;
    }

    mapping(uint256 => Laptop) public laptops; /* lưu trữ thông tin laptop theo id */
    mapping(uint256 => address) public laptopToOwner; /* lưu trữ địa chỉ chủ sở hữu laptop theo id */
    uint256 public laptopCount; /* đếm số laptop đã được liệt kê */

    event LaptopListed(uint256 indexed id, string name, uint256 price, address seller); /* sự kiện khi một laptop được liệt kê */
    event LaptopPurchased(uint256 indexed id, address buyer, uint256 price); /* sự kiện khi một laptop được mua */
    event PaymentReceived(address indexed buyer, uint256 amount); /* sự kiện khi nhận thanh toán từ người mua */
    event SellerPaid(address indexed seller, uint256 amount); /* sự kiện khi thanh toán cho người bán */

    constructor() Ownable(msg.sender) {} /* gán chủ sở hữu contract là người deploy */

    function listLaptop(string memory _name, uint256 _price) public { 
        require(_price > 0, "Price must be greater than 0");
        
        laptopCount++;
        laptops[laptopCount] = Laptop(
            laptopCount,
            _name,
            _price,
            true,
            msg.sender
        );
        laptopToOwner[laptopCount] = msg.sender;

        emit LaptopListed(laptopCount, _name, _price, msg.sender);
    }

    function purchaseLaptop(uint256 _laptopId) public payable nonReentrant { /* mua laptop */
        Laptop storage laptop = laptops[_laptopId]; // lấy thông tin laptop từ mapping
        require(laptop.id != 0, "Laptop does not exist"); /* kiểm tra laptop tồn tại */
        require(laptop.available, "Laptop is not available"); /* kiểm tra laptop còn hàng */
        require(msg.value >= laptop.price, "Insufficient payment"); /* kiểm tra thanh toán đủ */
        require(msg.sender != laptop.seller, "Seller cannot buy their own laptop"); /* người bán không thể mua laptop của chính mình */

        laptop.available = false; // đánh dấu laptop là đã bán
        address seller = laptop.seller; // lấy địa chỉ người bán

        // Transfer payment to seller
        (bool success, ) = payable(seller).call{value: msg.value}(""); // chuyển tiền cho người bán
        require(success, "Failed to send payment to seller"); // kiểm tra chuyển tiền thành công

        laptopToOwner[_laptopId] = msg.sender; 

        emit LaptopPurchased(_laptopId, msg.sender, msg.value); // phát sự kiện khi laptop được mua
        emit PaymentReceived(msg.sender, msg.value); // phát sự kiện khi nhận thanh toán từ người mua
        emit SellerPaid(seller, msg.value); // phát sự kiện khi thanh toán cho người bán
    }

    function getLaptop(uint256 _laptopId) public view returns ( /* lấy thông tin laptop theo id */
        uint256 id,
        string memory name,
        uint256 price,
        bool available,
        address seller
    ) {
        Laptop memory laptop = laptops[_laptopId]; /* lấy thông tin laptop từ mapping */
        require(laptop.id != 0, "Laptop does not exist"); /* kiểm tra laptop tồn tại */
        return (
            laptop.id,
            laptop.name,
            laptop.price,
            laptop.available,
            laptop.seller
        );
    }

    function updateLaptopPrice(uint256 _laptopId, uint256 _newPrice) public { /* cập nhật giá laptop */
        require(laptops[_laptopId].seller == msg.sender, "Only seller can update price"); /* chỉ người bán mới có thể cập nhật giá */
        require(_newPrice > 0, "Price must be greater than 0"); /* giá phải lớn hơn 0 */
        laptops[_laptopId].price = _newPrice; /* cập nhật giá mới */
    }

    function withdrawBalance() public onlyOwner { /* rút số dư contract về cho chủ sở hữu */
        (bool success, ) = payable(owner()).call{value: address(this).balance}(""); // chuyển số dư contract về cho chủ sở hữu
        require(success, "Failed to withdraw balance"); // kiểm tra chuyển tiền thành công
    }
}