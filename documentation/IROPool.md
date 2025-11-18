# IROPool 核心功能

`IROPool` 合约是 IRO 项目的流动性池与质押管理核心合约，负责用户质押、赎回、奖励分配、邀请奖励及提取逻辑，核心功能如下：

---

## 1. 初始化池子

- **功能**：
  - 初始化流动性池，绑定代币地址和 TKA 地址。
  - 设置初始价格和质押天数。
  - 确保池子只初始化一次。
- **核心方法**：
  - `initialize(address _uniswapFactory, address _TKA, uint256 initPrice, uint256 _pledgeDays)`

---

## 2. 用户质押（Pledge）

- **功能**：
  - 用户将 LP 或代币质押到池子。
  - 计算用户的 share 并更新 `accShareRewards`。
  - 更新用户质押信息和邀请者信息。
- **核心方法**：
  - `pledge(address user, uint256 amount, uint256 TKAAmount)`
- **数据结构**：
  - `Award`：记录用户质押、债务、分享、奖励、邀请奖励等。
  - `UserInfo`：记录用户是否有效、有效直推数量和质押总量。

---

## 3. 奖励转移（Transfer）

- **功能**：
  - 支持用户间的奖励或质押份额转移。
  - 更新发送方和接收方的 `Award` 和 `UserInfo`。
  - 防止转给合约地址或自己。
- **核心方法**：
  - `transferAward(address to, uint256 TKAAmount)`
  - `transferAwards(address[] calldata recipients, uint256[] calldata TKAAmounts)`

---

## 4. 提取与移除质押

- **功能**：
  - 用户提取可用奖励或 LP。
  - 支持部分提取（`extract`）或全部移除质押（`removePledge`）。
  - 自动计算质押天数税率（通过 `IROOwner.getTaxRate`）。
  - 支持分发邀请奖励。
- **核心方法**：
  - `removePledge()`
  - `extract(uint256 amount)`

---

## 5. 奖励累积与分配

- **功能**：
  - 根据市场价格变化增加产出（`produceNum`）。
  - 计算累计分享奖励 `accShareRewards`，用于按质押份额分配。
  - 更新最后价格与增量。
- **核心方法**：
  - `addProduceNum()`

---

## 6. 邀请奖励机制

- **功能**：
  - 用户提取奖励时，向邀请链上多级邀请人分发奖励。
  - 分配比例根据 `proxyRatios` 决定。
  - 未分配奖励会烧毁。
- **核心变量**：
  - `proxyRatios`：多级邀请奖励比例
- **核心逻辑**：
  - 在 `extract` 内按邀请链计算并分发奖励。

---

## 7. 查询接口

- **功能**：
  - 获取用户质押、奖励和邀请奖励信息。
  - 查询用户的全部质押信息。
  - 查询 LP 对应的 USDT 价值。
- **核心方法**：
  - `getUserProperty(address account)`
  - `getUserInfo(address account)`
  - `getUserAllInfo(address account)`
  - `getDeposit(address account)`
  - `getUserPledgeLpForUsdt(address _user)`

---

## 8. 内部工具方法

- **功能**：
  - 计算用户质押份额价值。
  - 获取代币交易对地址。
  - 判断地址是否为合约。
- **核心方法**：
  - `getPair()`
  - `getLPValueForUSDTValue(uint256 targetTKAValue)`
  - `isContract(address _addr)`

---
