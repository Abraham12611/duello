import { ethers } from "hardhat";

async function main() {
  const factoryAddr = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  const newOwner = process.env.NEW_OWNER;
  if (!factoryAddr) throw new Error("FACTORY_ADDRESS env var is required");
  if (!newOwner) throw new Error("NEW_OWNER env var is required");

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  console.log("Factory:", factoryAddr);
  console.log("New owner:", newOwner);

  const factory = await ethers.getContractAt("BetFactory", factoryAddr);
  const currentOwner: string = await factory.owner();
  console.log("Current owner:", currentOwner);

  if (currentOwner.toLowerCase() === newOwner.toLowerCase()) {
    console.log("Already owned by target. Nothing to do.");
    return;
  }

  const tx = await factory.transferOwnership(newOwner);
  console.log("transferOwnership tx:", tx.hash);
  await tx.wait();
  console.log("Ownership transferred.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
