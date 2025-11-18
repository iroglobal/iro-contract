//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;

interface IOrganization {
    event AddInvite(address indexed presenter, address indexed account);

    error addressErr();
    error notRewrite();
    error notContract();

    function presenter(address account) external view returns (address);
    function getInviteNum(address account) external view returns (uint256);
    function getInviteList(address account) external view returns (address[] memory);
    function getIndexInvite(address account, uint256 index) external view returns (address);

    function addInvite(address account) external;
}

contract Organization is IOrganization {
    mapping(address => address) public override presenter;
    mapping(address => address[]) public inviteList;

    function getInviteList(address account) external view override returns (address[] memory) {
        return inviteList[account];
    }

    function getInviteNum(address account) external view override returns (uint256) {
        return inviteList[account].length;
    }

    function getIndexInvite(address account, uint256 index) external view override returns (address) {
        return inviteList[account][index];
    }

    function addInvite(address account) external override {
        if(isContract(msg.sender)) revert notContract();
        if(isContract(account)) revert notContract();
        if (presenter[msg.sender] != address(0)) revert notRewrite();
        if (account == msg.sender || account == address(0)) revert addressErr();
        if (isChild(msg.sender, account, 10) == true) revert addressErr();
        presenter[msg.sender] = account;
        inviteList[account].push(msg.sender);
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

    function isContract(address _addr) private view returns (bool) {
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }
}
