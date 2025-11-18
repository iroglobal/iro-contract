# IROToken 核心功能

`IROToken` 是 IRO 项目的核心代币合约，主要负责代币管理、质押、交易、自动流动性及订阅机制，核心功能如下：

---

## 1. 合约初始化

- **功能**：
  - 初始化代币属性（名称、符号、总量、价格等）。
  - 分配初始代币份额到池子、贡献金库和创始人。
  - 初始化对应的流动性池 `IROPool`。
  - 设置交易限制、质押天数和白名单状态。
- **核心方法**：
  - `initialize(address _ownerAddr, address _POOL, address _TKA, uint256 _pledgeDays)`

---

## 2. 代币基本 ERC20 功能

- **功能**：
  - 查询余额和授权额度。
  - 转账、批量转账和代他人转账。
  - 设置和更新授权额度。
- **核心方法**：
  - `balanceOf(address account)`
  - `allowance(address account, address spender)`
  - `transfer(address recipient, uint256 amount)`
  - `transferFrom(address sender, address recipient, uint256 amount)`
  - `approve(address spender, uint256 amount)`

---

## 3. 订阅机制（Subscribe）

- **功能**：
  - 用户在代币未开放交易可通过 `subscribe` 购买代币并加入流动性池。
  - 支持白名单验证和额度校验。
  - 自动分配代币及 TKA，部分金额转入手续费、创始人奖励。
  - 自动增加池子流动性。
- **核心方法**：
  - `subscribe(address _user, uint256 amount)`
- **相关逻辑**：
  - `_toAddLP`：将 TKA 与代币添加到流动性池，并调用 `IROPool.pledge`。

---

## 4. 质押机制（Pledge）

- **功能**：
  - 用户可在代币开放交易后质押 TKA 和代币。
  - 自动添加到流动性池，并计算份额。
- **核心方法**：
  - `pledge(address _user, uint256 amount)`

---

## 5. 交易与手续费管理

- **功能**：
  - 在交易对买卖代币时自动扣除手续费。
  - 手续费包括销毁部分和创始人费用。
  - 防止闪电交易或重复买入。
- **核心方法**：
  - `_transfer(address sender, address to, uint256 amount)`
  - `getSwapFee(uint256 amount)`
- **特殊逻辑**：
  - `_updateDayProduce`：每天触发池子产出增加。
  - `_updateDaySwap`：每天自动进行最大 40 次代币自动买入。

---

## 6. 自动流动性与价格管理

- **功能**：
  - 自动将部分资金加入流动性池。
  - 动态计算代币价格。
  - 达到交易阈值后，开启自由交易。
- **核心方法**：
  - `_toAddLP(address pledgeTo, uint256 share, uint256 TKAAmt, uint256 tokenAmt)`
  - `_toSwapToken(uint256 TKAAmount, address to)`
  - `getTokenPrice()`
  - `_checkOpenSwap()`

---

## 7. 白名单与额度控制

- **功能**：
  - 控制用户是否在初期可订阅代币。
  - 限制每个白名单可参与的购买额度。
- **核心逻辑**：
  - `isWhitelisted`
  - `IIROOwner.getTokenWhiteListInfo`

---

## 8. 安全与限制机制

- **功能**：
  - 防止合约调用或重复操作。
  - 避免超过交易限制或质押错误。
  - 锁重入保护 `lock`。
- **相关方法**：
  - `lock` 修饰符
  - `isContract(address _addr)`
  - `verifyAmount(uint256 amount)`

---

## 9. 收款和手续费地址

- **功能**：
  - 自动将手续费和创始人分红转到对应地址。
  - 支持 WXOC 特殊处理。
- **核心方法**：
  - `getAutoBuyFeeReceiver()`
  - `getContributionVault()`
  - `transferTokenATo(address to, uint256 amount)`

---
