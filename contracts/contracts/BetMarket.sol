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
    Side public winningSide; // valid only when state == Resolved

    // Per-side totals and user stakes (native MNT for MVP)
    uint256 public totalA;
    uint256 public totalB;
    mapping(address => uint256) private stakeA;
    mapping(address => uint256) private stakeB;

    // Minimal fee config (bps on winnings portion only)
    uint16 public feeBps; // e.g., 300 = 3.00%
    address public feeRecipient;

    event Deposited(address indexed user, Side side, uint256 amount);
    event Locked(uint256 when);
    event Resolved(Side winner);
    event Voided();
    event Claimed(address indexed user, uint256 amount);
    event FeeUpdated(uint16 feeBps, address feeRecipient);

    constructor(address _token, uint256 _startTime, address _owner) {
        token = IERC20(_token);
        startTime = _startTime;
        state = State.Open;
        _transferOwnership(_owner);
        feeRecipient = _owner;
        feeBps = 0; // start at 0% for MVP
    }

    function lock() external {
        require(block.timestamp >= startTime, "Too early");
        require(state == State.Open, "Not open");
        // If one side is empty at lock, void immediately
        if (totalA == 0 || totalB == 0) {
            state = State.Voided;
            emit Voided();
        } else {
            state = State.Locked;
            emit Locked(block.timestamp);
        }
    }

    // Native MNT deposit for MVP. Token must be native (address(0)).
    function deposit(Side side) external payable nonReentrant whenNotPaused {
        require(state == State.Open, "Not open");
        require(block.timestamp < startTime, "Market locked");
        require(msg.value > 0, "No value");
        require(address(token) == address(0), "ERC20 not supported yet");

        if (side == Side.A) {
            stakeA[msg.sender] += msg.value;
            totalA += msg.value;
        } else {
            stakeB[msg.sender] += msg.value;
            totalB += msg.value;
        }
        emit Deposited(msg.sender, side, msg.value);
    }

    function resolve(Side winner) external onlyOwner {
        require(state == State.Locked, "Not locked");
        winningSide = winner;
        state = State.Resolved;
        emit Resolved(winner);
    }

    function claim() external nonReentrant {
        require(state == State.Resolved || state == State.Voided, "Not claimable");

        uint256 refund;
        if (state == State.Voided) {
            // Refund full stakes
            uint256 a = stakeA[msg.sender];
            uint256 b = stakeB[msg.sender];
            require(a > 0 || b > 0, "Nothing to claim");
            stakeA[msg.sender] = 0;
            stakeB[msg.sender] = 0;
            refund = a + b;
            _payout(msg.sender, refund);
            emit Claimed(msg.sender, refund);
            return;
        }

        // Resolved path: winners get principal + pro-rata share of losing pool, fee on winnings portion
        if (winningSide == Side.A) {
            uint256 userStake = stakeA[msg.sender];
            require(userStake > 0, "No win stake");
            stakeA[msg.sender] = 0; // prevent re-claim
            uint256 winningsPortion = (totalB * userStake) / totalA; // pro-rata share of losing pool
            uint256 fee = (winningsPortion * feeBps) / 10_000;
            uint256 payoutAmt = userStake + (winningsPortion - fee);
            if (fee > 0 && feeRecipient != address(0)) {
                _payout(feeRecipient, fee);
            }
            _payout(msg.sender, payoutAmt);
            emit Claimed(msg.sender, payoutAmt);
        } else {
            uint256 userStake = stakeB[msg.sender];
            require(userStake > 0, "No win stake");
            stakeB[msg.sender] = 0; // prevent re-claim
            uint256 winningsPortion = (totalA * userStake) / totalB;
            uint256 fee = (winningsPortion * feeBps) / 10_000;
            uint256 payoutAmt = userStake + (winningsPortion - fee);
            if (fee > 0 && feeRecipient != address(0)) {
                _payout(feeRecipient, fee);
            }
            _payout(msg.sender, payoutAmt);
            emit Claimed(msg.sender, payoutAmt);
        }
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function setFee(uint16 _feeBps, address _recipient) external onlyOwner {
        require(_feeBps <= 1_000, "Fee too high"); // cap at 10% for safety
        feeBps = _feeBps;
        feeRecipient = _recipient;
        emit FeeUpdated(_feeBps, _recipient);
    }

    function stakeOf(address user, Side side) external view returns (uint256) {
        return side == Side.A ? stakeA[user] : stakeB[user];
    }

    function _payout(address to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Transfer failed");
    }
}
