const hre = require("hardhat");

async function main() {
  const LaptopMarketplace = await hre.ethers.getContractFactory("LaptopMarketplace");
  const laptopMarketplace = await LaptopMarketplace.deploy();

  await laptopMarketplace.deployed();

  console.log("LaptopMarketplace deployed to:", laptopMarketplace.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});