const hre = require("hardhat");

async function main() { /* triển khai hợp đồng LaptopMarketplace */
  const LaptopMarketplace = await hre.ethers.getContractFactory("LaptopMarketplace"); /* lấy đối tượng hợp đồng */
  const laptopMarketplace = await LaptopMarketplace.deploy(); /* triển khai hợp đồng */

  await laptopMarketplace.deployed(); /* chờ hợp đồng được triển khai */

  console.log("LaptopMarketplace deployed to:", laptopMarketplace.address); /* in ra địa chỉ hợp đồng */
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});