# IROFactory 核心功能

`IROFactory` 合约是 IRO 项目的核心工厂合约，负责代币和项目池的创建与管理，核心功能如下：

---

## 1. 项目与代币管理

- **功能**：
  - 创建新的 IRO 项目及对应的代币（FDT）。
  - 生成对应的流动性池（IROPool）。
  - 记录项目代币信息和池地址。
- **核心变量**：
  - `allToken`：所有代币地址列表
  - `allTokensLength`：代币总数量
  - `pools[token]`：代币对应的池地址
  - `projectIDToken[projectID]`：项目 ID 对应的代币地址
  - `tokenInfo[token]`：代币详细信息（名称、总量、初始价格、软硬顶、质押天数等）
- **核心方法**：
  - `createProject(uint256 projectID, uint256 _totalSupply, uint256 _initPrice, string memory _symbol, uint256[2] memory softAndHardCap, address coinAddr, uint256 pledgeDays, TokenWhiteListQuota[] memory _addressList)`

---

## 2. 项目创建条件校验

- **功能**：
  - 校验调用者是否有经纪商资格。
  - 校验质押天数、币种是否有效。
  - 校验项目 ID 是否已存在。
  - 校验支付的创建费用是否正确。
  - 校验软顶和硬顶参数是否有效。
- **相关错误**：
  - `NotBroker()`：调用者不是经纪商
  - `ErrDays()`：质押天数不在允许范围
  - `ErrCoinAddr()`：币种不在允许范围
  - `IdExisted()`：项目 ID 已存在
  - `IncorrectFee()`：支付费用错误
  - `Err()`：其他参数错误

---

## 3. 白名单初始化

- **功能**：
  - 在项目创建时，初始化代币白名单。
  - 调用 `IROOwner.initTokenWhiteList` 完成白名单额度配置。
- **核心变量/方法**：
  - `_addressList`：白名单及额度列表
  - `IIROOwner(ownerAddr).initTokenWhiteList(tokenAddress, _addressList)`

---

## 4. 资金收取与转移

- **功能**：
  - 收取项目创建手续费。
  - 将手续费转入 IROOwner 配置的 `feeTo` 地址。
- **核心操作**：
  - `payable(IIROOwner(ownerAddr).feeTo()).transfer(address(this).balance)`

---

## 5. 池地址生成

- **功能**：
  - 使用 `CREATE2` 部署代币对应的流动性池 (`IROPool`)。
  - 确保每个代币有唯一对应池地址。
- **核心方法**：
  - `assembly { poolAddress := create2(0, add(bytecode, 32), mload(bytecode), salt) }`
  - `pools[tokenAddress] = poolAddress`

---

## 6. 代币信息记录

- **功能**：
  - 记录每个代币的项目属性，包括：
    - 名称 `_symbol`
    - 总供应量 `_totalSupply`
    - 初始价格 `_initPrice`
    - 创建者地址
    - 软顶和硬顶
    - 是否使用白名单
    - 质押天数
- **核心结构体**：
  ```solidity
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
