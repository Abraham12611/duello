// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract OptimisticResultOracle is Ownable {
    enum Result { Pending, A, B, Void }

    struct Proposal {
        Result result;
        uint256 timestamp;
        bool disputed;
        bool finalized;
    }

    uint256 public disputeWindow = 1 days;
    mapping(bytes32 => Proposal) public proposals; // key: eventId

    event Proposed(bytes32 indexed eventId, Result result, uint256 timestamp);
    event Disputed(bytes32 indexed eventId);
    event Finalized(bytes32 indexed eventId, Result result);

    function setDisputeWindow(uint256 w) external onlyOwner { disputeWindow = w; }

    function propose(bytes32 eventId, Result result) external onlyOwner {
        Proposal storage p = proposals[eventId];
        require(!p.finalized, "Finalized");
        p.result = result;
        p.timestamp = block.timestamp;
        p.disputed = false;
        p.finalized = false;
        emit Proposed(eventId, result, block.timestamp);
    }

    function dispute(bytes32 eventId) external {
        Proposal storage p = proposals[eventId];
        require(p.timestamp != 0, "No proposal");
        require(block.timestamp < p.timestamp + disputeWindow, "Window passed");
        p.disputed = true;
        emit Disputed(eventId);
    }

    function finalize(bytes32 eventId) external {
        Proposal storage p = proposals[eventId];
        require(p.timestamp != 0, "No proposal");
        require(!p.finalized, "Already");
        require(block.timestamp >= p.timestamp + disputeWindow, "Too soon");
        require(!p.disputed, "Disputed");
        p.finalized = true;
        emit Finalized(eventId, p.result);
    }

    function getResult(bytes32 eventId) external view returns (Result, bool) {
        Proposal storage p = proposals[eventId];
        return (p.result, p.finalized);
    }
}
