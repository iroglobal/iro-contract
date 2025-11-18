# IRO 项目合约开发文档

---

## 合约描述

|合约名称|描述|
|--|--|
|IROOwner|IRO权限控制合约|
|IROFactory|IRO工厂合约|
|IROToken|IRO代币合约|
|IROPool|IRO挖矿合约|
|IROSellFeeContract|IRO买卖税领取合约|
|Organization|IRO邀请关系合约|
|Vault|IRO 代币暂存贡献值合约|

## 合约部署流程

1、部署WXOC合约
2、部署swap工厂合约并获取initCodeHash
3、部署路由合约
4、部署USDX（可用ERC20合约替代）合约、Vault贡献值合约、
5、部署ORGANIZATION网体关系合约
6、替换Const里面的 swap工厂合约 路由合约、 WXOC合约，Organization合约、 以及顶级经济商钱包地址
7，部署IROOwner权限合约。需确认发币手续费地址、自动做市手续费地址、Vault贡献值合约地址
8、部署IRO工厂合约、sellFeeContract买卖税合约
9、权限合约设置IRO工厂合约（setIROFactoryAddress）、买卖税合约地址（setSellFeeAddress）
10、 买卖税合约设置权限合约地址 （setOwnerContract）
11、 权限合约设置申购币合约地址，USDX、WXOC
12、 确认发币手续费、经济商等级手续费、买卖税、每日自动做事区块间隔、计算天数为1 days无误
13、 开始发币
