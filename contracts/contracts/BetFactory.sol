// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BetMarket.sol";

contract BetFactory is Ownable {
    event MarketCreated(address indexed market, address token, uint256 startTime);

    address[] public markets;

    function createMarket(address token, uint256 startTime) external onlyOwner returns (address) {
        BetMarket m = new BetMarket(token, startTime, owner());
        markets.push(address(m));
        emit MarketCreated(address(m), token, startTime);
        return address(m);
    }

    function allMarkets() external view returns (address[] memory) {
        return markets;
    }
}
