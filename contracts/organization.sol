// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./Owner.sol";
import "./interfaces/IERC20.sol";

contract Organization is IOrganization, Ownable {
    mapping(address => address) public override presenter;
    mapping(address => address[]) public inviteList;

    uint256 public stakeAmount = 100 ether;
    IERC20 public stakeToken;

    mapping(address => UserStake) public isStaked;

    constructor(address _stakeToken) {
        require(_stakeToken != address(0), "Invalid token address");
        stakeToken = IERC20(_stakeToken);
        _transferOwnership(_msgSender());
    }

    modifier noContract() {
        if (isContract(msg.sender)) revert notContract();
        _;
    }

    function getInviteList(address account) external view override returns (address[] memory) {
        return inviteList[account];
    }

    function getInviteNum(address account) external view override returns (uint256) {
        return inviteList[account].length;
    }

    function getIndexInvite(address account, uint256 index) external view override returns (address) {
        return inviteList[account][index];
    }

    function addInvite(address account) external override noContract {
        if (isContract(account)) revert notContract();
        if (presenter[msg.sender] != address(0)) revert notRewrite();
        if (account == msg.sender || account == address(0)) revert addressErr();
        if (isChild(msg.sender, account, 10) == true) revert addressErr();
        presenter[msg.sender] = account;
        inviteList[account].push(msg.sender);
        if (isStaked[msg.sender].status) {
            isStaked[account].validNum += 1;
        }
        emit AddInvite(account, msg.sender);
    }

    function isChild(address accountP, address accountN, uint256 level) public view returns (bool) {
        for (uint256 i = 0; i < level; ++i) {
            if (presenter[accountN] == address(0)) return false;
            if (presenter[accountN] == accountP) return true;
            accountN = presenter[accountN];
        }

        return false;
    }

    function getUserStake(address user) external view override returns (UserStake memory) {
        UserStake memory userStakeInfo = isStaked[user];
        return userStakeInfo;
    }

    function setStakeAmount(uint256 newAmount) external onlyOwner {
        if (newAmount == 0) revert InvalidStakeAmount();
        stakeAmount = newAmount;
        emit StakeAmountUpdated(newAmount);
    }

    function stake() external noContract {
        if (isStaked[msg.sender].status) revert AlreadyStaked();

        bool success = stakeToken.transferFrom(msg.sender, address(this), stakeAmount);
        if (!success) revert TransferFail();

        isStaked[msg.sender].status = true;
        isStaked[msg.sender].amount = stakeAmount;
        if (presenter[msg.sender] != address(0)) {
            isStaked[presenter[msg.sender]].validNum += 1;
        }
        emit Staked(msg.sender, stakeAmount);
    }

    function unstake() external noContract {
        if (!isStaked[msg.sender].status) revert NotStaked();
        isStaked[msg.sender].status = false;
        uint256 amount = isStaked[msg.sender].amount;
        isStaked[msg.sender].amount = 0;

        if (presenter[msg.sender] != address(0)) {
            if (isStaked[presenter[msg.sender]].validNum > 0) {
                isStaked[presenter[msg.sender]].validNum -= 1;
            }
        }

        bool success = stakeToken.transfer(msg.sender, amount);
        if (!success) revert TransferFail();

        emit Unstaked(msg.sender, amount);
    }

    function isContract(address _addr) private view returns (bool) {
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }
}
