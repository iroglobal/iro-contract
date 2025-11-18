# Vault 合约审计说明文档

## 1. 合约名称
**Vault.sol**

---

## 2. 合约概述（Description）
Vault 合约是一个由 Owner 控制的贡献值代币保管合约，用于将代币总发行量的40%迁移到指定的 Contribution 合约地址。迁移操作仅在目标合约的 `codehash` 与预设的 `CONTRIBUTION_CODE_HASH` 完全匹配时才能执行，提供了一层基础验证机制，避免代币被迁移到恶意地址。

核心功能包括：

- 存储与更新合法 Contribution 合约的 codehash
- 校验迁移目标合约代码是否匹配
- 将本合约持有的全部指定代币迁移至目标合约
- 通过事件记录关键操作
- 所有敏感操作仅限 Owner 执行

---
