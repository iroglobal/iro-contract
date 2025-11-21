//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;

import {_rootBroker} from "./Const.sol";

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

interface IOrganization {
    event AddInvite(address indexed presenter, address indexed account);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event StakeAmountUpdated(uint256 newAmount);

    error addressErr();
    error notRewrite();
    error notContract();
    error AlreadyStaked();
    error NotStaked();
    error TransferFail();
    error InvalidToken();
    error InvalidStakeAmount();

    struct UserStake {
        bool status;
        uint256 amount;
        uint256 validNum;
    }

    function getUserStake(address user) external view returns (UserStake memory);
    function presenter(address account) external view returns (address);
    function getInviteNum(address account) external view returns (uint256);
    function getInviteList(address account) external view returns (address[] memory);
    function getIndexInvite(address account, uint256 index) external view returns (address);

    function addInvite(address account) external;
}

interface IROStake {
    struct UserStake {
        bool status;
        uint256 amount;
        uint256 validNum;
    }

    function getUserStake(address user) external view returns (UserStake memory);
}

abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotZero();
    error NotOwner();

    constructor() {
        _transferOwnership(_msgSender());
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        if (owner() != _msgSender()) revert NotOwner();
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) revert NotZero();
        _transferOwnership(newOwner);
    }

    function getTime() public view returns (uint256) {
        return block.timestamp;
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

struct TokenWhiteListQuota {
    address account;
    uint256 quota;
}

interface IIROOwner {
    function feeTo() external view returns (address);
    function autoBuyFeeTo() external view returns (address);
    function contributionVault() external view returns (address);
    function sellFeeAddress() external view returns (address);
    function brokerMap(address addr) external view returns (uint256);
    function tokenAMap(address addr) external view returns (bool);
    function levelFee(uint256 level) external view returns (uint256);
    function isExcludedFromFee(address token, address account) external view returns (bool);
    function createFee() external view returns (uint256);
    function brokerBuySellFeeRate() external view returns (uint256);

    struct TokenWhiteListInfo {
        bool status;
        uint256 quota;
    }

    function setFeeTo(address) external;
    function setAutoBuyFeeTo(address) external;
    function setContributionVault(address) external;
    function setSellFeeAddress(address) external;
    function initTokenWhiteList(address token, TokenWhiteListQuota[] memory _whiteList) external;
    function decreaseQuota(address _whiteList, uint256 amount) external;
    function getTokenWhiteListInfo(address token, address addr) external view returns (TokenWhiteListInfo memory);
    function getTaxRate(uint256 stakeDay, uint256 pledgeDays) external view returns (uint256);
    function presenter(address account) external view returns (address);
}

interface IIROFactory {
    event CreateProject(
        uint256 indexed projectID, address indexed token, address indexed pool, address TKAAddr, uint256 len
    );

    function getPool(address token) external view returns (address poolAddress);
    function allToken(uint256) external view returns (address token);
    function allTokensLength() external view returns (uint256);
    function createProject(
        uint256 _projectID,
        uint256 _totalSupply,
        uint256 _initPrice,
        string memory _symbol,
        uint256[2] memory softAndHardCap,
        address coinAddr,
        uint256 pledgeDays,
        TokenWhiteListQuota[] memory _addressList
    ) external returns (address pool);
    function projectIDToken(uint256) external view returns (address);

    struct TokenInfo {
        string name;
        uint256 totalSupply;
        uint256 initPrice;
        address creator;
        uint256 softCap;
        uint256 hardCap;
        bool isWhitelisted;
        uint256 pledgeDays;
    }

    function tokenInfo(address token)
        external
        view
        returns (
            string memory name,
            uint256 totalSupply,
            uint256 initPrice,
            address creator,
            uint256 softCap,
            uint256 hardCap,
            bool isWhitelisted,
            uint256 pledgeDays
        );
}

contract IROOwner is Ownable, IIROOwner {
    address public override feeTo;
    address public override autoBuyFeeTo;
    address public override contributionVault;
    address public override sellFeeAddress;
    uint256 public override createFee = 200 ether;
    uint256 public override brokerBuySellFeeRate = 3;
    address public marketing;

    mapping(address => uint256) public override brokerMap;
    mapping(address => bool) public override tokenAMap;
    mapping(uint256 => uint256) public override levelFee;
    mapping(address => mapping(address => TokenWhiteListInfo)) public tokenWhiteListMap;
    mapping(address => mapping(address => bool)) internal _isExcludedFromFee;
    mapping(address => address[]) public excludedFromFeeArr;

    event ExcludedFromFee(address account);
    event IncludedToFee(address account);
    event ExcludedFromFee(address token, address account);
    event IncludedToFee(address token, address account);
    event MarketingshipTransferred(address token, address account);

    mapping(address => address[]) public tokenWhiteListArr;
    mapping(address => address) public override presenter;

    StakingTaxConfig public LPStakingTax;
    address[] public brokerGroup;
    address[] public tokenAGroup;
    address public factoryAddress;
    address public constant rootBroker = _rootBroker;

    event SetLunchBrokertLevel(address indexed account, uint256 level);
    event SetTokenA(address coinAddr, bool status);
    event AddTokenWhiteList(address indexed token, address indexed account, uint256 timestamp);
    event RemoveTokenWhiteList(address indexed token, address indexed account, uint256 timestamp);
    event FeeToUpdated(address indexed newFeeTo, address oldNewFeeTo);
    event AutoBuyFeeToUpdated(address indexed newAutoBuyFeeTo, address oldAutoBuyFeeTo);
    event ContributionVaultUpdated(address indexed newContributionVault, address oldContributionVault);
    event SellFeeAddressUpdated(address indexed newSellFeeAddress, address oldSellFeeAddress);
    event FactoryAddressUpdated(address indexed newFactoryAddress, address oldFactoryAddress);
    event CreateFeeUpdated(uint256 newCreateFee, uint256 oldCreateFee);
    event BrokerBuySellFeeRateUpdated(uint256 newFeeRate, uint256 oldFeeRate);
    event AddInvite(address indexed presenter, address indexed account);

    error NotWhitelist();
    error InvalidLevel();
    error FeeError();
    error notContract();
    error WhiteListFull();
    error AddressNotInWhiteList();
    error AddressAlreadyInWhiteList();
    error Err();
    error NotWhitelisted();
    error NotRewrite();
    error AddressErr();

    struct StakingTaxConfig {
        uint256 tax50;
        uint256 tax70;
        uint256 tax100;
    }

    modifier onlyCreator(address token) {
        (,,, address creator,,,,) = IIROFactory(factoryAddress).tokenInfo(token);
        if (msg.sender != creator) revert Err();
        _;
    }

    modifier onlyMarketing() {
        if (msg.sender != marketing) revert Err();
        _;
    }

    modifier onlyIROFactory() {
        if (msg.sender != factoryAddress) revert Err();
        _;
    }

    constructor(address _feeTo, address _autoBuyFeeTo, address _contributionVault, address _marketing) {
        feeTo = _feeTo;
        autoBuyFeeTo = _autoBuyFeeTo;
        contributionVault = _contributionVault;
        marketing = _marketing;
        levelFee[1] = 3;
        levelFee[2] = 6;
        levelFee[3] = 8;
        levelFee[4] = 10;

        LPStakingTax.tax100 = 3;
        LPStakingTax.tax70 = 10;
        LPStakingTax.tax50 = 15;

        brokerGroup.push(address(rootBroker));
        brokerMap[address(rootBroker)] = 4;
        _transferOwnership(_msgSender());
    }

    function transferMarketingship(address newMarketing) external onlyMarketing {
        if (isContract(newMarketing)) revert notContract();
        if (newMarketing == address(0)) revert NotZero();
        address oldMarketing = marketing;
        marketing = newMarketing;
        emit MarketingshipTransferred(oldMarketing, newMarketing);
    }

    function isExcludedFromFee(address token, address account) public view override returns (bool) {
        return _isExcludedFromFee[token][account];
    }

    function getExcludedFromFeeArr(address token) external view returns (address[] memory) {
        return excludedFromFeeArr[token];
    }

    function excludeFromFee(address token, address account) public onlyCreator(token) {
        if (isContract(account)) revert notContract();
        if (_isExcludedFromFee[token][account]) revert Err();
        _isExcludedFromFee[token][account] = true;
        excludedFromFeeArr[token].push(account);
        emit ExcludedFromFee(token, account);
    }

    function includeInFee(address token, address account) public onlyCreator(token) {
        if (!_isExcludedFromFee[token][account]) revert Err();
        _isExcludedFromFee[token][account] = false;
        for (uint256 i = 0; i < excludedFromFeeArr[token].length; i++) {
            if (excludedFromFeeArr[token][i] == account) {
                excludedFromFeeArr[token][i] = excludedFromFeeArr[token][excludedFromFeeArr[token].length - 1];
                excludedFromFeeArr[token].pop();
                emit IncludedToFee(token, account);
                break;
            }
        }
    }

    function initTokenWhiteList(address token, TokenWhiteListQuota[] memory _whiteList)
        external
        override
        onlyIROFactory
    {
        for (uint256 i = 0; i < _whiteList.length; i++) {
            _addTokenWhiteList(token, _whiteList[i].account, _whiteList[i].quota);
        }
    }

    function _addTokenWhiteList(address token, address addr, uint256 quota) internal {
        if (isContract(addr)) revert notContract();
        if (tokenWhiteListMap[token][addr].status) revert AddressAlreadyInWhiteList();
        (,,, address creator,,, bool isWhitelisted,) = IIROFactory(factoryAddress).tokenInfo(token);
        if (!isWhitelisted) revert NotWhitelisted();
        if (creator == addr) revert Err();
        if (addr == address(0)) revert NotZero();
        tokenWhiteListMap[token][addr].status = true;
        tokenWhiteListMap[token][addr].quota = quota;
        tokenWhiteListArr[token].push(addr);
        emit AddTokenWhiteList(token, addr, block.timestamp);
    }

    function getTokenWhiteListInfo(address token, address whiteList)
        external
        view
        override
        returns (TokenWhiteListInfo memory)
    {
        return tokenWhiteListMap[token][whiteList];
    }

    function addTokenWhiteList(address token, address addr, uint256 quota) external onlyCreator(token) {
        _addTokenWhiteList(token, addr, quota);
    }

    function removeTokenWhiteList(address token, address addr) external onlyCreator(token) {
        if (!tokenWhiteListMap[token][addr].status) revert AddressNotInWhiteList();
        tokenWhiteListMap[token][addr].status = false;
        tokenWhiteListMap[token][addr].quota = 0;
        for (uint256 i = 0; i < tokenWhiteListArr[token].length; i++) {
            if (tokenWhiteListArr[token][i] == addr) {
                tokenWhiteListArr[token][i] = tokenWhiteListArr[token][tokenWhiteListArr[token].length - 1];
                tokenWhiteListArr[token].pop();
                emit RemoveTokenWhiteList(token, addr, block.timestamp);
                break;
            }
        }
    }

    function getTaxRate(uint256 stakedDay, uint256 pledgeDays) public view override returns (uint256 taxRate) {
        uint256 percent = (stakedDay * 100) / pledgeDays;
        if (percent >= 100) {
            return LPStakingTax.tax100;
        } else if (percent >= 70) {
            return LPStakingTax.tax70;
        } else if (percent >= 50) {
            return LPStakingTax.tax50;
        } else {
            return 20;
        }
    }

    function decreaseQuota(address whiteList, uint256 amount) external override {
        if (factoryAddress == address(0)) revert Err();
        (,,, address creator,,, bool isWhitelisted,) = IIROFactory(factoryAddress).tokenInfo(msg.sender);
        if (creator == address(0) || tokenWhiteListMap[msg.sender][whiteList].quota < amount) {
            revert Err();
        }
        if (isWhitelisted) {
            tokenWhiteListMap[msg.sender][whiteList].quota -= amount;
        }
    }

    function getTokenWhiteList(address token) external view returns (address[] memory) {
        return tokenWhiteListArr[token];
    }

    function getBrokerGroup() external view returns (address[] memory) {
        return brokerGroup;
    }

    function getTokenAGroup() external view returns (address[] memory) {
        return tokenAGroup;
    }

    function setFeeTo(address _feeTo) external override onlyOwner {
        if (_feeTo == address(0)) revert NotZero();
        address old = feeTo;
        feeTo = _feeTo;
        emit FeeToUpdated(_feeTo, old);
    }

    function setAutoBuyFeeTo(address _autoBuyFeeTo) external override onlyOwner {
        if (_autoBuyFeeTo == address(0)) revert NotZero();
        address old = autoBuyFeeTo;
        autoBuyFeeTo = _autoBuyFeeTo;
        emit AutoBuyFeeToUpdated(_autoBuyFeeTo, old);
    }

    function setContributionVault(address _contributionVault) external override onlyOwner {
        if (_contributionVault == address(0)) revert NotZero();
        address old = contributionVault;
        contributionVault = _contributionVault;
        emit ContributionVaultUpdated(_contributionVault, old);
    }

    function setSellFeeAddress(address _sellFeeAddress) external override onlyOwner {
        if (_sellFeeAddress == address(0)) revert NotZero();
        address old = sellFeeAddress;
        sellFeeAddress = _sellFeeAddress;
        emit SellFeeAddressUpdated(_sellFeeAddress, old);
    }

    function setBrokerBuySellFeeRate(uint256 newRate) external onlyOwner {
        if (newRate < 3 || newRate > 40) revert Err();
        uint256 old = brokerBuySellFeeRate;
        brokerBuySellFeeRate = newRate;
        emit BrokerBuySellFeeRateUpdated(newRate, old);
    }

    function setBroker(address _address, uint256 level, address parent) external onlyMarketing {
        if (brokerMap[parent] == 0) revert Err();
        if (isContract(_address)) revert notContract();
        _setBrokerLevel(_address, level);
        addInvite(_address, parent);
    }

    function setBrokerLevel(address _address, uint256 level) external onlyMarketing {
        _setBrokerLevel(_address, level);
    }

    function _setBrokerLevel(address _address, uint256 level) internal {
        if (level > 4) revert InvalidLevel();
        if (level > 0 && brokerMap[_address] == 0) {
            brokerGroup.push(_address);
        } else if (level == 0) {
            for (uint256 i = 0; i < brokerGroup.length; i++) {
                if (brokerGroup[i] == _address) {
                    brokerGroup[i] = brokerGroup[brokerGroup.length - 1];
                    brokerGroup.pop();
                    break;
                }
            }
        }
        brokerMap[_address] = level;
        emit SetLunchBrokertLevel(_address, level);
    }

    function addInvite(address account, address parent) internal {
        if (presenter[account] != address(0)) revert NotRewrite();
        if (parent == account || parent == address(0)) revert AddressErr();
        if (isChild(account, parent, 10) == true) revert AddressErr();
        presenter[account] = parent;
        emit AddInvite(parent, account);
    }

    function isChild(address accountP, address accountN, uint256 level) public view returns (bool) {
        for (uint256 i = 0; i < level; ++i) {
            if (presenter[accountN] == address(0)) return false;
            if (presenter[accountN] == accountP) return true;
            accountN = presenter[accountN];
        }
        return false;
    }

    function setTokenA(address _address, bool status) external onlyMarketing {
        if (status) {
            if (tokenAMap[_address]) revert Err();
            tokenAGroup.push(_address);
        } else {
            if (!tokenAMap[_address]) revert Err();
            for (uint256 i = 0; i < tokenAGroup.length; i++) {
                if (tokenAGroup[i] == _address) {
                    tokenAGroup[i] = tokenAGroup[tokenAGroup.length - 1];
                    tokenAGroup.pop();
                    break;
                }
            }
        }
        tokenAMap[_address] = status;
        emit SetTokenA(_address, status);
    }

    function setLevelFee(uint256 level, uint256 _fee) external onlyOwner {
        if (level == 0 || level > 4) revert InvalidLevel();
        if (_fee > 10 || _fee < 3) revert FeeError();
        levelFee[level] = _fee;
    }

    function setIROFactoryAddress(address _factoryAddress) external onlyOwner {
        address old = factoryAddress;
        factoryAddress = _factoryAddress;
        emit FactoryAddressUpdated(_factoryAddress, old);
    }

    function setCreateFee(uint256 _createFee) external onlyOwner {
        uint256 old = createFee;
        createFee = _createFee;
        emit CreateFeeUpdated(_createFee, old);
    }

    function isContract(address _addr) private view returns (bool) {
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }
}
