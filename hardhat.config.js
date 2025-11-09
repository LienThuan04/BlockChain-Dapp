require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 1337
    },
    // Thêm cấu hình mạng testnet sau này (ví dụ Sepolia)
    // sepolia: {
    //   url: `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`,
    //   accounts: [PRIVATE_KEY]
    // }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};