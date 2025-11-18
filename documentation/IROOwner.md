# IROOwner 核心功能

`IROOwner` 合约是 IRO 项目的核心管理合约，负责管理手续费地址、经纪商等级、白名单、代币创建及分润规则。其核心功能如下：

---

## 1. 权限管理

- **继承**：`Ownable`
- **功能**：
  - 拥有者可以转移或放弃合约所有权。
  - 部分方法仅允许合约拥有者调用 (`onlyOwner`)。
- **相关方法**：
  - `transferOwnership(address newOwner)`
  - `renounceOwnership()`
  - `_transferOwnership(address newOwner)`

---

## 2. 手续费管理

- **功能**：
  - 管理 IRO 项目相关手续费地址。
  - 可动态设置交易分润比例。
- **核心变量**：
  - `feeTo`：手续费收取地址
  - `autoBuyFeeTo`：自动购买手续费地址
  - `contributionVault`：贡献金库地址
  - `sellFeeAddress`：买卖税手续费地址
  - `brokerBuySellFeeRate`：经纪商分润比例
- **核心方法**：
  - `setFeeTo()`
  - `setAutoBuyFeeTo()`
  - `setContributionVault()`
  - `setSellFeeAddress()`
  - `setBrokerBuySellFeeRate(uint256 newRate)`

---

## 3. 经纪商及推荐关系管理

- **功能**：
  - 设置经纪商等级（1-4 级）。
  - 管理推荐关系（邀请人体系）。
  - 判断用户是否为上级/下级，避免循环推荐。
- **核心变量**：
  - `brokerMap`：记录每个地址的经纪商等级
  - `presenter`：记录推荐关系
  - `brokerGroup`：经纪商地址列表
- **核心方法**：
  - `setBroker(address _address, uint256 level, address parent)`
  - `setBrokerLevel(address _address, uint256 level)`
  - `addInvite(address account, address parent)`
  - `isChild(address accountP, address accountN, uint256 level)`

---

## 4. 代币白名单管理

- **功能**：
  - 管理项目代币的白名单及额度。
  - 支持添加、移除和查询白名单信息。
- **核心变量**：
  - `tokenWhiteListMap[token][address]`：白名单状态及额度
  - `tokenWhiteListArr[token]`：白名单地址列表
- **核心方法**：
  - `initTokenWhiteList(address token, TokenWhiteListQuota[] memory _whiteList)`
  - `addTokenWhiteList(address token, address addr, uint256 quota)`
  - `removeTokenWhiteList(address token, address addr)`
  - `getTokenWhiteListInfo(address token, address whiteList)`
  - `decreaseQuota(address whiteList, uint256 amount)`

---

## 5. 项目代币与 Factory 管理

- **功能**：
  - 设置 IRO Factory 合约地址。
  - 获取代币信息及项目池地址。
  - 管理 TokenA 代币组。
- **核心变量**：
  - `factoryAddress`：Factory 合约地址
  - `tokenAMap`：TokenA 状态
  - `tokenAGroup`：TokenA 地址数组
- **核心方法**：
  - `setIROFactoryAddress(address _factoryAddress)`
  - `setTokenA(address _address, bool status)`
  - `getTokenWhiteList(address token)`
  - `getBrokerGroup()`
  - `getTokenAGroup()`

---

## 6. LP 抵押税率计算

- **功能**：
  - 根据质押天数和质押总天数计算解押税率。
- **核心变量**：
  - `LPStakingTax`：抵押税率配
