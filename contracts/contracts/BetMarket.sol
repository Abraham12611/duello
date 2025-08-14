// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BetMarket is ReentrancyGuard, Pausable, Ownable {
    enum Side { A, B }
    enum State { Open, Locked, Resolved, Voided }

    IERC20 public immutable token;
    uint256 public startTime;
    State public state;

    event Deposited(address indexed user, Side side, uint256 amount);
    event Locked(uint256 when);
    event Resolved(Side winner);
    event Voided();
    event Claimed(address indexed user, uint256 amount);

    constructor(address _token, uint256 _startTime, address _owner) {
        token = IERC20(_token);
        startTime = _startTime;
        state = State.Open;
        _transferOwnership(_owner);
    }

    function lock() external {
        require(block.timestamp >= startTime, "Too early");
        require(state == State.Open, "Not open");
        state = State.Locked;
        emit Locked(block.timestamp);
    }

    // MVP placeholders (to be fully implemented):
    function deposit(Side /* side */, uint256 /* amount */) external payable nonReentrant whenNotPaused {
        revert("Not implemented");
    }

    function resolve(Side /* winner */) external onlyOwner {
        require(state == State.Locked, "Not locked");
        state = State.Resolved;
        emit Resolved(Side.A); // placeholder
    }

    function claim() external nonReentrant {
        revert("Not implemented");
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
