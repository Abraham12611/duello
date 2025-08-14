import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Oracle = await ethers.getContractFactory("OptimisticResultOracle");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  console.log("Oracle:", await oracle.getAddress());

  const Factory = await ethers.getContractFactory("BetFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log("Factory:", await factory.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
