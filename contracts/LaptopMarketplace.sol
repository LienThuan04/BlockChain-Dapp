// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LaptopMarketplace is ReentrancyGuard, Ownable {
    struct Laptop {
        uint256 id;
        string name;
        uint256 price;
        bool available;
        address seller;
    }

    mapping(uint256 => Laptop) public laptops;
    mapping(uint256 => address) public laptopToOwner;
    uint256 public laptopCount;

    event LaptopListed(uint256 indexed id, string name, uint256 price, address seller);
    event LaptopPurchased(uint256 indexed id, address buyer, uint256 price);
    event PaymentReceived(address indexed buyer, uint256 amount);
    event SellerPaid(address indexed seller, uint256 amount);

    constructor() Ownable(msg.sender) {}

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

    function purchaseLaptop(uint256 _laptopId) public payable nonReentrant {
        Laptop storage laptop = laptops[_laptopId];
        require(laptop.id != 0, "Laptop does not exist");
        require(laptop.available, "Laptop is not available");
        require(msg.value >= laptop.price, "Insufficient payment");
        require(msg.sender != laptop.seller, "Seller cannot buy their own laptop");

        laptop.available = false;
        address seller = laptop.seller;

        // Transfer payment to seller
        (bool success, ) = payable(seller).call{value: msg.value}("");
        require(success, "Failed to send payment to seller");

        laptopToOwner[_laptopId] = msg.sender;

        emit LaptopPurchased(_laptopId, msg.sender, msg.value);
        emit PaymentReceived(msg.sender, msg.value);
        emit SellerPaid(seller, msg.value);
    }

    function getLaptop(uint256 _laptopId) public view returns (
        uint256 id,
        string memory name,
        uint256 price,
        bool available,
        address seller
    ) {
        Laptop memory laptop = laptops[_laptopId];
        require(laptop.id != 0, "Laptop does not exist");
        return (
            laptop.id,
            laptop.name,
            laptop.price,
            laptop.available,
            laptop.seller
        );
    }

    function updateLaptopPrice(uint256 _laptopId, uint256 _newPrice) public {
        require(laptops[_laptopId].seller == msg.sender, "Only seller can update price");
        require(_newPrice > 0, "Price must be greater than 0");
        laptops[_laptopId].price = _newPrice;
    }

    function withdrawBalance() public onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Failed to withdraw balance");
    }
}