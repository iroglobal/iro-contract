// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./interfaces/IERC20.sol";
import "./Owner.sol";

contract Vault is Ownable {
    event CodeHashUpdated(bytes32 oldHash, bytes32 newHash);
    event TokenMigrated(address indexed token, address indexed to, uint256 amount);

    bytes32 public CONTRIBUTION_CODE_HASH;

    constructor() {
        _transferOwnership(_msgSender());
    }

    function codeHash() external view returns (bytes32) {
        return address(this).codehash;
    }

    function setCodeHash(bytes32 _hash) external onlyOwner {
        bytes32 oldHash = CONTRIBUTION_CODE_HASH;
        CONTRIBUTION_CODE_HASH = _hash;
        emit CodeHashUpdated(oldHash, _hash);
    }

    function migrateToken(address token, address contribution) external onlyOwner {
        require(CONTRIBUTION_CODE_HASH != 0, "codehash not set");
        require(contribution.codehash == CONTRIBUTION_CODE_HASH, "Invalid contribution contract");
        uint256 amount = IERC20(token).balanceOf(address(this));
        require(amount > 0, "no token");
        IERC20(token).transfer(contribution, amount);
        emit TokenMigrated(token, contribution, amount);
    }
}
