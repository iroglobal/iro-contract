# Organization 合约审计说明文档

## 1. 合约名称
**Organization**

---

## 2. 合约概述（Description）
`Organization` 合约用于管理邀请关系，实现推荐人（Presenter）与被推荐人（Invitee）之间的绑定关系。
合约中每个账户最多只能设置一次推荐人，同时限制循环邀请关系（防止形成闭环）。

核心功能包括：

## 1. 添加邀请关系

- **方法**：`addInvite(address account)`
- **功能**：绑定调用者的推荐人为 `account`，形成推荐关系。
- **限制条件**：
  - 调用者和推荐人不能是合约。
  - 每个账户只能绑定一次推荐人。
  - 推荐人地址不能为零地址或自身。
  - 禁止循环推荐（检查最多 10 级）。
- **触发事件**：
  - `AddInvite(address indexed presenter, address indexed account)`


  ## 2. 查询邀请关系

- **方法**：
  - `getInviteNum(address account)`：获取指定账户的下级邀请人数。
  - `getInviteList(address account)`：获取指定账户的下级账户列表。
  - `getIndexInvite(address account, uint256 index)`：获取指定账户下某个下级账户的地址。
- **功能**：提供推荐关系的链上查询接口，方便统计和奖励分发。

---

## 3. 判断上下级关系

- **方法**：`isChild(address accountP, address accountN, uint256 level)`
- **功能**：判断 `accountN` 是否为 `accountP` 的下级账户，支持最多向上追溯 `level` 级。
- **用途**：
  - 防止循环绑定。
  - 校验推荐关系层级，用于奖励或权限判断。

---
