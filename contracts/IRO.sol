// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./Owner.sol";
import "./interfaces/IERC20.sol";
import {_UNISWAP_V2_ROUTER, _UNISWAP_V2_FACTORY, _WXOC, _USDT, _ORGANIZATION} from "./Const.sol";

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Router {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)
        external
        payable
        returns (uint256[] memory amounts);
}

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function approve(address spender, uint256 value) external returns (bool);
    function totalSupply() external view returns (uint256);
}

interface IIROToken is IERC20 {
    event Subscribe(address account, uint256 amount, address to);
    event OpenSwap(uint256 timestamp, uint256 amount);

    error isInitialized();
    error valueIsZero();
    error zeroAddress();
    error balanceNotEnough();
    error quotaNotEnough();
    error isOpened();
    error isNoOpened();
    error noPermission();
    error addLiquidityFail();
    error notContract();
    error Err();

    function decimals() external override view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tradingLimit() external view returns (uint256);
    function price() external view returns (uint256);
    function creator() external view returns (address);

    function isOpen() external view returns (bool);
    function isWXOC() external view returns (bool);
    function isWhitelisted() external view returns (bool);
    function getTokenPrice() external view returns (uint256, uint256, uint256 newPrice);
    function dayProduce(uint256 day) external view returns (bool);
    function subscribe(address to, uint256 amount) external payable;
    function initialize(address _OwnerAdd, address _POOL, address TKAAddr, uint256 pledgeDays) external;
}

contract IROToken is IIROToken {
    string public override name;
    string public override symbol;
    uint8 public constant override decimals = 18;
    uint256 public override totalSupply;
    uint256 public override tradingLimit;
    address public override creator;
    uint256 public override price;
    bool public override isOpen;
    bool public override isWhitelisted;
    uint256 public totalCreatorFee;
    uint256 pledgeDays;

    address constant UNISWAP_V2_ROUTER = _UNISWAP_V2_ROUTER;
    address constant UNISWAP_V2_FACTORY = _UNISWAP_V2_FACTORY;
    address constant WXOC = _WXOC;

    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) allowances;
    mapping(uint256 => bool) public override dayProduce;
    mapping(uint256 => uint256) public daySwapCount;
    mapping(uint256 => uint256)  daySwapAmount;
    mapping(address => uint256) public lastBuyBlock;
    uint256 public lastSwapBlockNumber;
    bool noSwapFee;
    bool isTeamFee;
    address public ownerAddr;
    uint256 public softCap;
    bool public TKAAboveSoftCap;
    uint256 private unlocked = 1;
    bool public override isWXOC;
    address FACTORY;
    address public POOL;
    address public TKA;
    uint8 TKADecimals = 18;

    modifier lock() {
        require(unlocked == 1, "LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    function _currentDay() internal view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function _updateDayProduce() internal {
        uint256 day = _currentDay();
        address pair = getPair();
        if (pair != address(0) && !dayProduce[day]) {
            dayProduce[day] = true;
            IIROPool(POOL).addProduceNum();
        }
    }

    function _updateDaySwap() internal {
        uint256 day = _currentDay();
        address pair = getPair();
        if (pair != address(0) && daySwapCount[day] < 40 && block.number >= lastSwapBlockNumber + 200) {
            if (daySwapCount[day] == 0) {
                uint256 balanceTKA = isWXOC ? address(this).balance : IERC20(TKA).balanceOf(address(this));
                daySwapAmount[day] = (balanceTKA * 375) / 1000000;
            }
            daySwapCount[day] += 1;

            address autoBuyReceiver = IIROOwner(ownerAddr).autoBuyFeeTo();
            _toSwapToken(daySwapAmount[day], autoBuyReceiver);
            lastSwapBlockNumber = block.number;
        }
    }

    function initialize(address _ownerAddr, address _POOL, address _TKA, uint256 _pledgeDays) external override {
        if (totalSupply > 0) revert isInitialized();
        FACTORY = msg.sender;
        ownerAddr = _ownerAddr;
        (name, totalSupply, price, creator, softCap, tradingLimit, isWhitelisted,) =
            IIROFactory(FACTORY).tokenInfo(address(this));
        symbol = name;
        daySwapCount[_currentDay()] = 40;
        dayProduce[_currentDay()] = true;
        pledgeDays = _pledgeDays;
        balances[address(this)] = totalSupply;
        emit Transfer(address(0), address(this), totalSupply);
        TKA = _TKA;
        POOL = _POOL;
        isWXOC = WXOC == TKA;
        allowances[address(this)][address(UNISWAP_V2_ROUTER)] = type(uint256).max;
        if (!isWXOC) {
            IERC20(TKA).approve(address(UNISWAP_V2_ROUTER), type(uint256).max);
            TKADecimals = IERC20(TKA).decimals();
        }
        if (TKADecimals < 18) {
            price = price * (10 ** (18 - TKADecimals));
        }

        this.transfer(_POOL, (totalSupply * 20) / 100);
        (, , , address contributionVaultAddr, ) = IIROOwner(ownerAddr).getCoreAddresses();
        this.transfer(contributionVaultAddr, (totalSupply * 40) / 100);
        IIROPool(POOL).initialize(UNISWAP_V2_FACTORY, TKA, price, pledgeDays);
    }

    function balanceOf(address account) external view override returns (uint256 balance) {
        balance = balances[account];
    }

    function allowance(address account, address spender) external view override returns (uint256) {
        return allowances[account][spender];
    }

    function transfer(address recipient, uint256 amount) public override returns (bool success) {
        if (amount == 0) revert valueIsZero();
        if (balances[msg.sender] < amount) revert balanceNotEnough();

        _transfer(msg.sender, recipient, amount);
        success = true;
    }

    function approve(address spender, uint256 amount) external override returns (bool success) {
        _approve(msg.sender, spender, amount);
        success = true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool success) {
        if (amount == 0) revert valueIsZero();
        if (allowances[sender][msg.sender] < amount) revert quotaNotEnough();
        if (balances[sender] < amount) revert balanceNotEnough();
        allowances[sender][msg.sender] -= amount;
        _transfer(sender, recipient, amount);
        success = true;
    }

    function transferTokenATo(address to, uint256 amount) internal {
        if (isWXOC) {
            payable(to).transfer(amount);
        } else {
            IERC20(TKA).transfer(to, amount);
        }
    }

    function subscribe(address _user, uint256 amount) external payable override lock {
        if (isContract(msg.sender) || isContract(_user)) revert notContract();
        if (isOpen) revert isOpened();
        IIROOwner owner = IIROOwner(ownerAddr);
        if (isWhitelisted && !owner.getTokenWhiteListInfo(address(this), msg.sender).status) {
            revert noPermission();
        }
        verifyAmount(amount);
        uint256 TKAAmount = amount;
        uint256 balanceToken = balances[address(this)];
        (,, uint256 tokenPrice) = getTokenPrice();
        uint256 e18 = 1e18;
        uint256 tkaDecimals = 10 ** TKADecimals;

        uint256 balanceTokenTKA = ((balanceToken * tokenPrice / e18) * tkaDecimals * 100) / (40 * e18);
        if (balanceTokenTKA < TKAAmount) {
            unchecked {
                transferTokenATo(msg.sender, TKAAmount - balanceTokenTKA);
            }
            TKAAmount = balanceTokenTKA;
        }

        (address feeTo, , , , address autoBuyReceiver) = owner.getCoreAddresses();

        uint256 tokenTKA;
        {
            transferTokenATo(feeTo, TKAAmount / 100);
            uint256 level = owner.brokerMap(creator);
            if (level > 0) {
                uint256 creatorFee = TKAAmount * 4 / 100;
                transferTokenATo(creator, creatorFee);
                totalCreatorFee += creatorFee;
            }
            tokenTKA = (TKAAmount * 40) / 100;
        }
        uint256 tokenAmount = ((tokenTKA * e18 / tkaDecimals) * e18) / tokenPrice;

        if (tokenAmount > balanceToken) {
            tokenAmount = balanceToken;
        }

        noSwapFee = true;
        if (isWhitelisted) {
            owner.decreaseQuota(msg.sender, TKAAmount);
        }

        _toAddLP(_user, TKAAmount, tokenTKA, tokenAmount);

        if (TKAAboveSoftCap) {
            unchecked {
                _toSwapToken((TKAAmount * 15) / 100, autoBuyReceiver);
            }
        }

        noSwapFee = false;
        _checkOpenSwap();
    }

    function _checkOpenSwap() internal {
        (, uint256 pairTKA,) = getTokenPrice();
        if (!TKAAboveSoftCap && pairTKA > softCap) {
            TKAAboveSoftCap = true;
        }
        uint256 bal = balances[address(this)];
        if (bal < 1 * 10 ** 18 || pairTKA >= tradingLimit) {
            isOpen = true;

            (, , , address contributionVaultAddr, ) = IIROOwner(ownerAddr).getCoreAddresses();
            _transfer(address(this), contributionVaultAddr, bal);
            emit OpenSwap(block.timestamp, bal);
        }
    }

    function verifyAmount(uint256 amount) internal {
        if (isWXOC) {
            if (msg.value != amount) revert Err();
        } else {
            TransferHelper.safeTransferFrom(TKA, msg.sender, address(this), amount);
        }
    }

    function pledge(address _user, uint256 amount) external payable lock {
        if (isContract(msg.sender) || isContract(_user)) revert notContract();
        if (!isOpen) revert isNoOpened();
        verifyAmount(amount);
        noSwapFee = true;
        uint256 buyAmount = amount / 2;
        uint256[] memory amounts = _toSwapToken(buyAmount, msg.sender);
        uint256 amountOut = (amounts[amounts.length - 1]);

        TransferHelper.safeTransferFrom(address(this), msg.sender, address(this), amountOut);

        _toAddLP(_user, amount, amount - buyAmount, amountOut);
        if (balances[address(this)] > 0) {
            _transfer(address(this), address(0), balances[address(this)]);
        }
        noSwapFee = false;
    }

    function getTokenPrice() public view override returns (uint256 pairToken, uint256 pairTKA, uint256 newPrice) {
        address pair = getPair();
        if (pair == address(0)) return (0, 0, price);
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        address token0 = IUniswapV2Pair(pair).token0();
        bool isToken0TKA = (token0 == TKA);
        pairTKA = isToken0TKA ? reserve0 : reserve1;
        pairToken = isToken0TKA ? reserve1 : reserve0;
        if (pairToken == 0) {
            return (pairToken, pairTKA, price);
        }
        if (TKADecimals == 18) {
            newPrice = (uint256(pairTKA) * 1e18) / pairToken;
        } else {
            newPrice = uint256(pairTKA) * 1e18 * 1e18 / (uint256(pairToken) * (10 ** TKADecimals));
        }
    }

    function isContract(address _addr) private view returns (bool) {
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }

    function getPair() internal view returns (address) {
        return IUniswapV2Factory(UNISWAP_V2_FACTORY).getPair(TKA, address(this));
    }

    function _toSwapToken(uint256 TKAAmount, address to) internal returns (uint256[] memory amounts) {
        address[] memory path = new address[](2);
        path[0] = TKA;
        path[1] = address(this);
        if (isWXOC) {
            amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactETHForTokens{value: TKAAmount}(
                1, path, to, block.timestamp
            );
        } else {
            amounts =
                IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(TKAAmount, 1, path, to, block.timestamp);
        }
    }

    function _toAddLP(address pledgeTo, uint256 share, uint256 TKAAmt, uint256 tokenAmt) internal {
        uint256 lp;
        if (isWXOC) {
            (,, lp) = IUniswapV2Router(UNISWAP_V2_ROUTER).addLiquidityETH{value: TKAAmt}(
                address(this), tokenAmt, 1, 1, address(this), block.timestamp
            );
        } else {
            (,, lp) = IUniswapV2Router(UNISWAP_V2_ROUTER).addLiquidity(
                TKA, address(this), TKAAmt, tokenAmt, 1, 1, address(this), block.timestamp
            );
        }
        if (lp == 0) revert addLiquidityFail();
        emit Subscribe(msg.sender, share, pledgeTo);
        IUniswapV2Pair(getPair()).approve(POOL, lp);
        IIROPool(POOL).pledge(pledgeTo, lp, share);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        if (owner == address(0) || spender == address(0)) revert zeroAddress();
        _updateDayProduce();
        _updateDaySwap();
        allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function getSwapFee(uint256 amount)
        internal
        pure
        returns (uint256 fee, uint256 daoFee, uint256 creatorFee, uint256 teamFee)
    {
        fee = (amount * 3) / 100;
        creatorFee = amount / 100;
        teamFee = amount * 14 / 1000;
        daoFee = fee - creatorFee - teamFee;
    }

    function _transfer(address sender, address to, uint256 amount) internal {
        _updateDayProduce();
        address pair = getPair();
        if (sender != pair && to != pair && !isTeamFee && !noSwapFee) {
            _updateDaySwap();
        }
        if (sender == pair) {
            lastBuyBlock[to] = block.number;
        }

        IIROOwner owner = IIROOwner(ownerAddr);
        (address feeTo, address sellFeeAddr, address daoAddr, , address autoBuyReceiver) = owner.getCoreAddresses();

        if (sender == pair && to != UNISWAP_V2_ROUTER && to != autoBuyReceiver && to != address(0) && !isOpen) {
            balances[sender] -= amount;
            balances[address(0)] += amount;
            emit Transfer(sender, address(0), amount);
            return;
        }

        if (
            (to == pair || sender == pair) && !noSwapFee && to != autoBuyReceiver
                && (!owner.isExcludedFromFee(address(this), sender)
                    && !owner.isExcludedFromFee(address(this), to))
        ) {
            if (block.number <= lastBuyBlock[sender]) revert Err();
            (uint256 fee, uint256 daoFee, uint256 creatorFee, uint256 teamFee) = getSwapFee(amount);
            amount -= fee;
            balances[sender] -= fee;
            balances[daoAddr] += daoFee;
            emit Transfer(sender, daoAddr, daoFee);
            address currentUser = to == pair ? sender : to;
            balances[POOL] += teamFee;
            emit Transfer(sender, POOL, teamFee);
            isTeamFee = true;
            IIROPool(POOL).teamReward(currentUser, teamFee, false);
            isTeamFee = false;
            balances[sellFeeAddr] += creatorFee;
            emit Transfer(sender, sellFeeAddr, creatorFee);
        }

        balances[sender] -= amount;
        balances[to] += amount;
        emit Transfer(sender, to, amount);
    }

    receive() external payable {}
}

interface IIROPool {
    event Pledge(address indexed account, uint256 amount, uint256 power);
    event RemovePledge(address indexed account, uint256 amount, uint256 power, uint256 keepDays);
    event Extract(address indexed account, uint256 amount);
    event InviteReward(address indexed spend, address indexed presenter, uint256 amount);
    event AddProduce(
        uint256 amount, uint256 pairTokenBal, uint256 lastPrice, uint256 newPrice, uint256 amplitude, uint256 totalShare
    );
    event AwardTransferred(
        address indexed from,
        address indexed to,
        uint256 share,
        uint256 lpAmount,
        uint256 TKAAmount,
        uint256 transferCount
    );

    error isInitialized();
    error noPair();
    error notEnoughAmount();
    error needExtract();
    error InvalidAddress();
    error TransferToSelf();
    error Pledged();
    error Excess();
    error notContract();
    error Err();

    function getDeposit(address account) external view returns (uint256);
    function increaseRateMap(uint256) external view returns (bool status, uint256 rate);
    function produceNum() external view returns (uint256);
    function accShareRewards() external view returns (uint256);
    function produceLpNum() external view returns (uint256);
    function produceLimit() external view returns (uint256);
    function totalShare() external view returns (uint256);

    function initialize(address _uniswapFactory, address _TKA, uint256 initPrice, uint256 pledgeDays) external;
    function pledge(address _user, uint256 amount, uint256 share) external;
    function removePledge() external;
    function extract(uint256 amount) external;
    function addProduceNum() external;
    function teamReward(address user, uint256 totalReward, bool isExtract) external;
    function lastAddProduce() external view returns (uint256);
    function lastPrice() external view returns (uint256);
}

contract IROPool is IIROPool {
    uint256 public override accShareRewards;
    uint256 public override totalShare;
    uint256 public override produceNum;
    uint256 public override produceLimit;
    uint256 public override produceLpNum;
    uint256 public override lastAddProduce;
    address payable token;
    uint256 public override lastPrice;
    uint256 transferCount;
    address constant ORGANIZATION = _ORGANIZATION;

    uint256 constant ONEDAY = 1 days;
    uint256 constant ENLARGE = 10 ** 18;
    uint256 pledgeDays;
    address uniswapV2Factory;
    address TKA;

    mapping(address => Award) public userAward;
    mapping(uint256 => Rate) public override increaseRateMap;
    uint256[7] proxyRatios = [200, 155, 112, 66, 112, 155, 200];

    struct Rate {
        bool status;
        uint256 rate;
    }

    struct Award {
        uint256 deposit;
        uint256 debt;
        uint256 share;
        uint256 lastTimestamp;
        uint256 totalDeposit;
        uint256 totalInviteReward;
        uint256 lastInviteReward;
        uint256 pledgeNum;
    }

    bool initialized;

    function initialize(address _uniswapFactory, address _TKA, uint256 initPrice, uint256 _pledgeDays)
        external
        override
    {
        if (initialized) revert isInitialized();
        initialized = true;
        token = payable(msg.sender);
        pledgeDays = _pledgeDays;
        lastPrice = initPrice;
        produceLimit = IIROToken(token).balanceOf(address(this));
        uniswapV2Factory = _uniswapFactory;
        TKA = _TKA;
    }

    function getDeposit(address account) public view override returns (uint256) {
        Award memory userProperty = userAward[account];
        return (userProperty.share * accShareRewards) / ENLARGE + userProperty.deposit - userProperty.debt;
    }

    function pledge(address user, uint256 amount, uint256 TKAAmount) external override {
        if (msg.sender != token) revert Err();
        address pair = getPair();
        if (pair == address(0)) revert noPair();
        Award storage userProperty = userAward[user];
        TransferHelper.safeTransferFrom(pair, msg.sender, address(this), amount);
        uint256 share = TKAAmount;
        userProperty.deposit = getDeposit(user);
        userProperty.share += share;
        userProperty.debt = (userProperty.share * accShareRewards) / ENLARGE;

        userProperty.lastTimestamp = _updateLastTimestamp(userProperty.pledgeNum, amount, userProperty.lastTimestamp);
        totalShare += share;
        userProperty.pledgeNum += amount;
        emit Pledge(user, amount, share);
    }

    function getUserPledgeLpForUsdt(address _user) external view returns (uint256 lpForUsdt) {
        Award storage userProperty = userAward[_user];
        address pair = getPair();
        if (pair == address(0)) return 0;
        (, uint256 pairTKA,) = IROToken(token).getTokenPrice();
        uint256 totalSupply = IUniswapV2Pair(pair).totalSupply();
        lpForUsdt = userProperty.pledgeNum * pairTKA * 2 / totalSupply;
    }

    function getLPValueForUSDTValue(uint256 targetTKAValue) public view returns (uint256 valueInTKA) {
        address pair = getPair();
        (, uint256 pairTKA,) = IROToken(token).getTokenPrice();
        uint256 totalSupply = IUniswapV2Pair(pair).totalSupply();
        valueInTKA = (targetTKAValue * totalSupply) / (pairTKA * 2);
    }

    function _updateLastTimestamp(uint256 currentAmount, uint256 newAmount, uint256 lastTimestamp)
        internal
        view
        returns (uint256)
    {
        if (lastTimestamp == 0) return block.timestamp;
        return (currentAmount * lastTimestamp + newAmount * block.timestamp) / (currentAmount + newAmount);
    }

    function _transferAward(address from, address to, uint256 TKAAmount) internal {
        if (isContract(to)) revert notContract();
        if (to == address(0)) revert InvalidAddress();
        if (from == to) revert TransferToSelf();
        uint256 pledgeNum = getLPValueForUSDTValue(TKAAmount);
        Award storage userProperty = userAward[from];
        if (pledgeNum > userProperty.pledgeNum) revert Excess();
        if (pledgeNum == 0) revert Err();
        uint256 share = pledgeNum * userProperty.share / userProperty.pledgeNum;
        userProperty.deposit = getDeposit(from);
        userProperty.share -= share;
        userProperty.debt = (userProperty.share * accShareRewards) / ENLARGE;
        userProperty.pledgeNum -= pledgeNum;

        Award storage toProperty = userAward[to];
        toProperty.deposit = getDeposit(to);
        toProperty.share += share;
        toProperty.debt = (toProperty.share * accShareRewards) / ENLARGE;

        toProperty.lastTimestamp = _updateLastTimestamp(toProperty.pledgeNum, pledgeNum, toProperty.lastTimestamp);
        toProperty.pledgeNum += pledgeNum;
        transferCount++;
        emit AwardTransferred(from, to, share, pledgeNum, TKAAmount, transferCount);
    }

    function transferAwards(address[] calldata recipients, uint256[] calldata TKAAmounts) external {
        if (recipients.length != TKAAmounts.length) revert Err();
        for (uint256 i = 0; i < recipients.length; i++) {
            _transferAward(msg.sender, recipients[i], TKAAmounts[i]);
        }
    }

    function removePledge() external override {
        Award storage userProperty = userAward[msg.sender];
        uint256 userDeposit = getDeposit(msg.sender);
        if (userProperty.share == 0) revert notEnoughAmount();
        if (userDeposit > 0 && IERC20(token).balanceOf(address(this)) > userDeposit) revert needExtract();
        uint256 share = userProperty.share;
        uint256 pledgeNum = userProperty.pledgeNum;
        userProperty.deposit = 0;
        userProperty.share = 0;
        userProperty.debt = 0;
        userProperty.pledgeNum = 0;

        uint256 keepDays = (block.timestamp - userProperty.lastTimestamp) / ONEDAY;
        uint256 rate = IIROOwner(IROToken(token).ownerAddr()).getTaxRate(keepDays, pledgeDays);
        uint256 feeAmount = pledgeNum * rate / 100;
        uint256 userAmount = pledgeNum - feeAmount;
        userProperty.lastTimestamp = 0;

        address pair = getPair();
        TransferHelper.safeTransfer(pair, address(0), feeAmount);
        TransferHelper.safeTransfer(pair, msg.sender, userAmount);
        totalShare -= share;
        emit RemovePledge(msg.sender, pledgeNum, share, rate);
    }

    function extract(uint256 amount) external override {
        if (isContract(msg.sender)) revert notContract();
        uint256 userDeposit = getDeposit(msg.sender);
        if (userDeposit < amount || amount == 0) revert notEnoughAmount();
        userAward[msg.sender].debt += amount;
        userAward[msg.sender].totalDeposit += amount;
        TransferHelper.safeTransfer(token, msg.sender, amount);
        emit Extract(msg.sender, amount);
        _teamReward(msg.sender, amount * 45 / 100, true);
    }

    function teamReward(address currentUser, uint256 totalReward, bool isExtract) external override {
        if (msg.sender != token) return;
        _teamReward(currentUser, totalReward, isExtract);
    }

    function _teamReward(address currentUser, uint256 totalReward, bool isExtract) internal {
        uint256 burnReward = totalReward;
        uint256 i = 1;
        uint256 count = 0;
        while (i < 8 && count < 50) {
            address preAccount = IOrganization(ORGANIZATION).presenter(currentUser);
            if (preAccount == address(0)) break;
            IOrganization.UserStake memory preAccountInfo = IOrganization(ORGANIZATION).getUserStake(preAccount);
            if (preAccountInfo.status) {
                if (preAccountInfo.validNum >= i) {
                    uint256 reward = totalReward * (isExtract ? proxyRatios[i - 1] : 140) / 1000;
                    TransferHelper.safeTransfer(token, preAccount, reward);
                    burnReward -= reward;
                    if (isExtract) {
                        userAward[preAccount].totalInviteReward += reward;
                        userAward[preAccount].lastInviteReward = reward;
                        emit InviteReward(msg.sender, preAccount, reward);
                    }
                }
                i++;
            }
            currentUser = preAccount;
            count++;
        }
        if (burnReward > 0) {
            TransferHelper.safeTransfer(token, address(0), burnReward);
        }
    }

    function addProduceNum() external override {
        if (msg.sender != token) return;
        (uint256 pairToken,, uint256 newPrice) = IROToken(token).getTokenPrice();
        if (newPrice == 0) return;

        uint256 amplitude;
        if (newPrice > lastPrice) {
            uint256 _increaseRate = (((newPrice - lastPrice) * 10000) / lastPrice);
            increaseRateMap[block.timestamp / ONEDAY].rate = _increaseRate;
            amplitude = _increaseRate + 200;
            amplitude = amplitude > 5000 ? 5000 : amplitude;
        } else {
            amplitude = 200;
        }
        increaseRateMap[block.timestamp / ONEDAY].status = true;
        uint256 addAmount = (pairToken * amplitude) / 100000;
        uint256 surplusAmount = produceLimit - produceNum;
        if (surplusAmount == 0) return;
        if (addAmount > surplusAmount) {
            addAmount = surplusAmount;
        }
        produceNum += addAmount;
        lastAddProduce = addAmount;

        emit AddProduce(addAmount, pairToken, lastPrice, newPrice, amplitude, totalShare);
        uint256 addProduceLpNum = (addAmount * 100) / 145;
        produceLpNum += addProduceLpNum;
        if (totalShare != 0) {
            accShareRewards += (addProduceLpNum * ENLARGE) / totalShare;
        }
        lastPrice = newPrice;
    }

    function getPair() internal view returns (address pair) {
        pair = IUniswapV2Factory(uniswapV2Factory).getPair(TKA, token);
    }

    function isContract(address _addr) private view returns (bool) {
        uint32 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }
}

contract IROFactory is IIROFactory {
    address public ownerAddr;
    uint256 public override allTokensLength;
    address[] public override allToken;
    address constant USDT = _USDT;

    mapping(address => address) pools;
    mapping(uint256 => address) public override projectIDToken;
    mapping(address => TokenInfo) public override tokenInfo;

    error IdExisted();
    error ErrDays();
    error ErrCoinAddr();
    error NotBroker();
    error Err();

    constructor(address _ownerAddr) {
        ownerAddr = _ownerAddr;
    }

    function getPool(address token) external view override returns (address) {
        return pools[token];
    }

    function createProject(
        uint256 projectID,
        uint256 _totalSupply,
        uint256 _initPrice,
        string memory _symbol,
        uint256[2] memory softAndHardCap,
        address coinAddr,
        uint256 pledgeDays,
        TokenWhiteListQuota[] memory _addressList
    ) external override returns (address poolAddress) {
        if (IIROOwner(ownerAddr).brokerMap(msg.sender) == 0) revert NotBroker();
        if (pledgeDays < 30 || pledgeDays > 720) revert ErrDays();
        if (!IIROOwner(ownerAddr).tokenAMap(coinAddr)) revert ErrCoinAddr();
        if (projectIDToken[projectID] != address(0)) revert IdExisted();
        IERC20(USDT).transferFrom(msg.sender, IIROOwner(ownerAddr).feeTo(), IIROOwner(ownerAddr).createFee());
        if (softAndHardCap[1] < softAndHardCap[0] || _initPrice == 0) revert Err();
        IROToken FDT = new IROToken();
        address tokenAddress = address(FDT);
        allToken.push(tokenAddress);
        bytes memory bytecode = type(IROPool).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(tokenAddress));
        assembly {
            poolAddress := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        pools[tokenAddress] = poolAddress;
        projectIDToken[projectID] = tokenAddress;
        tokenInfo[tokenAddress] = TokenInfo(
            _symbol,
            _totalSupply,
            _initPrice,
            msg.sender,
            softAndHardCap[0],
            softAndHardCap[1],
            _addressList.length > 0,
            pledgeDays
        );
        FDT.initialize(ownerAddr, poolAddress, coinAddr, pledgeDays);

        IIROOwner(ownerAddr).initTokenWhiteList(tokenAddress, _addressList);
        emit CreateProject(projectID, tokenAddress, poolAddress, coinAddr, allTokensLength);

        ++allTokensLength;
        return poolAddress;
    }
}

contract IROSellFeeContract is Ownable {
    address public ownerContract;
    mapping(address => mapping(uint256 => bool)) public dayClaim;

    event Claim(address indexed creator, address indexed token, uint256 bal, uint256 amount);
    event OwnerContractUpdated(address indexed oldOwnerContract, address indexed newOwnerContract);

    error Err();

    constructor() {
        _transferOwnership(_msgSender());
    }

    function setOwnerContract(address _ownerContract) external onlyOwner {
        address oldOwner = ownerContract;
        ownerContract = _ownerContract;
        emit OwnerContractUpdated(oldOwner, _ownerContract);
    }

    function _currentDay() internal view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function claim(address token) external {
        if (ownerContract == address(0)) revert Err();
        uint256 bal = IIROToken(token).balanceOf(address(this));

        uint256 day = _currentDay();
        if (dayClaim[token][day]) revert Err();
        if (!dayClaim[token][day]) {
            dayClaim[token][day] = true;
            uint256 amount = bal * IIROOwner(ownerContract).brokerBuySellFeeRate() / 100;
            address user = IIROToken(token).creator();
            uint256 totalFeeRate = 10;
            uint256 level = IIROOwner(ownerContract).brokerMap(user);
            uint256 parentLevel;
            uint256 preRate = 0;
            uint256 i = 0;
            uint256 count = 0;
            while (i < 4 && count < 20) {
                if (totalFeeRate > 0 && ((count == 0 && level > 0) || (count > 0 && parentLevel > level))) {
                    uint256 levelFee = IIROOwner(ownerContract).levelFee(count == 0 ? level : parentLevel);
                    uint256 levelFeeRate = totalFeeRate > (levelFee - preRate) ? levelFee - preRate : totalFeeRate;
                    totalFeeRate -= levelFeeRate;
                    preRate = levelFee;
                    if (levelFeeRate > 0) {
                        uint256 brokerFee = amount * levelFeeRate / 10;
                        IIROToken(token).transfer(user, brokerFee);
                        emit Claim(user, token, bal, brokerFee);
                    }
                    i++;
                }
                count++;
                address parent = IIROOwner(ownerContract).presenter(user);
                if (parent == address(0)) break;
                level = parentLevel > level ? parentLevel : level;
                user = parent;
                parentLevel = IIROOwner(ownerContract).brokerMap(user);
            }
            if (totalFeeRate > 0) {
                IIROToken(token).transfer(address(0), amount * totalFeeRate / 10);
                emit Claim(address(0), token, bal, amount * totalFeeRate / 10);
            }
        }
    }
}

library TransferHelper {
    function safeApprove(address token, address to, uint256 value) internal {
        // bytes4(keccak256(bytes('approve(address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x095ea7b3, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TransferHelper: APPROVE_FAILED");
    }

    function safeTransfer(address token, address to, uint256 value) internal {
        // bytes4(keccak256(bytes('transfer(address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TransferHelper: TRANSFER_FAILED");
    }

    function safeTransferFrom(address token, address from, address to, uint256 value) internal {
        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TransferHelper: TRANSFER_FROM_FAILED");
    }

    function safeTransferETH(address to, uint256 value) internal {
        (bool success,) = to.call{value: value}(new bytes(0));
        require(success, "TransferHelper: ETH_TRANSFER_FAILED");
    }
}
