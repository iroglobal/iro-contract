import { loadFixture, time, mine, setBalance, reset, impersonateAccount } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import { expect } from 'chai';
import { viem } from 'hardhat';
import { describe } from 'mocha';
import { formatEther, getAddress, maxUint256, parseEther, zeroAddress, Hash, isAddressEqual, keccak256 } from 'viem';
import { IRP_CONFIG } from '../constants';

describe("IRO", () => {
    const deployContract = async () => {
        const [owner, feeToSetter, feeTo, autoBuyAddress, excessTokenReceiver, creatorAddress, transferAwardAddress, whiteAccount0, tokenWhiteAccount0, tokenWhiteAccount1, tokenWhiteAccount2, pledgeTo] = await viem.getWalletClients();

        console.log(owner.account.address, 'owner', getAddress(owner.account.address));
        console.log(feeToSetter.account.address, 'feeToSetter');
        console.log(feeTo.account.address, 'feeTo');
        console.log(autoBuyAddress.account.address, 'autoBuyAddress');
        console.log(creatorAddress.account.address, 'creatorAddress');
        console.log(transferAwardAddress.account.address, 'transferAwardAddress');
        console.log(tokenWhiteAccount0.account.address, 'tokenWhiteAccount0');
        console.log(tokenWhiteAccount1.account.address, 'tokenWhiteAccount1');
        console.log(tokenWhiteAccount2.account.address, 'tokenWhiteAccount2');


        const publicClient = await viem.getPublicClient();
        console.log(await publicClient.getBlockNumber());

        console.log(`owner: ${owner.account.address}`);
        console.log(`feeToSetter: ${feeToSetter.account.address} `);
        console.log(`feeTo: ${feeTo.account.address} `);
        console.log(`autoBuyAddress: ${autoBuyAddress.account.address} `);
        console.log(`creatorAddress: ${creatorAddress.account.address} `);
        console.log(`transferAwardAddress: ${transferAwardAddress.account.address} `);
        console.log(`whiteAccount0: ${whiteAccount0.account.address} `);
        console.log(getAddress('0x5fbdb2315678afecb367f032d93f642f64180aa3'), '-----');

        // test localhost
        const swapFactory = await viem.getContractAt('UniswapV2Factory', '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512');
        const WETH = await viem.getContractAt('contracts/UniswapV2/WXOC.sol:WXOC', '0x5fbdb2315678afecb367f032d93f642f64180aa3');
        const swapRouter = await viem.getContractAt('UniswapV2Router02', '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9');
        const USDTContract = await viem.getContractAt('contracts/ERC20.sol:ERC20Token', '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9');
        //coverage
        // const swapFactory = await viem.deployContract('UniswapV2Factory', [owner.account.address]);
        // const WETH = await viem.deployContract('WBNB');
        // const swapRouter = await viem.deployContract('UniswapV2Router02', [swapFactory.address, WETH.address]);

        // test fork
        // const swapFactory = await viem.getContractAt('UniswapV2Factory', '0x50b1DB5e535642cc94Bd1863c1F40896CD3B1830');
        // const WETH = await viem.getContractAt('WBNB', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c');
        // const swapRouter = await viem.getContractAt('UniswapV2Router02', '0x8bb302C68741fe1fabca85a285de3dCb0Bc63F39');
        // const USDTContract = await viem.getContractAt('ERC20Token', '0x55d398326f99059fF775485246999027B3197955');

        const vaultContract = await viem.deployContract('contracts/Vault.sol:Vault');
        console.log('🚀 ~ deployContract ~ vaultContract:', vaultContract.address);


        const Ownable = await viem.deployContract('contracts/Owner.sol:IROOwner', [feeTo.account.address, autoBuyAddress.account.address, vaultContract.address,owner.account.address])
        console.log('🚀 ~ deployContract ~ Ownable:', Ownable.address);


        const fomoFactory = await viem.deployContract('IROFactory', [Ownable.address]);
        // const fomoFactory = await viem.getContractAt('IROFactory', '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707');

        // const fomoOranContract = await viem.deployContract('Organization');
        const fomoOranContract = await viem.getContractAt('Organization', '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707');
        // console.log('🚀 ~ deployContract ~ swapFactory:', swapFactory.address);
        // console.log('🚀 ~ deployContract ~ WETH:', WETH.address);
        // console.log('🚀 ~ deployContract ~ swapRouter:', swapRouter.address, getAddress(swapRouter.address));
        console.log('🚀 ~ deployContract ~ fomoOranContract:', fomoOranContract.address, getAddress(fomoOranContract.address));
        console.log(await swapFactory.read.INIT_CODE_HASH(), 'INIT_CODE_HASH');

        console.log('🚀 ~ deployContract ~ fomoFactory:', fomoFactory.address);

        const sellFeeContract = await viem.deployContract('contracts/IRO.sol:IROSellFeeContract')
        console.log('🚀 ~ deployContract ~ sellFeeContract:', sellFeeContract.address);

        const { FEE_AMOUNT, tokenInfo } = IRP_CONFIG;

        return {
            swapFactory,
            swapRouter,
            WETH,
            owner,
            feeToSetter,
            feeTo,
            autoBuyAddress,
            creatorAddress,
            transferAwardAddress,
            fomoFactory,
            Ownable,
            FEE_AMOUNT,
            publicClient,
            USDTContract,
            fomoOranContract,
            tokenInfo,
            whiteAccount0,
            tokenWhiteAccount0,
            tokenWhiteAccount1,
            tokenWhiteAccount2,
            pledgeTo,
            excessTokenReceiver,
            sellFeeContract,
            vaultContract
        };
    };

    it("验证邀请与质押逻辑", async () => {
        // return;
        const {
            fomoOranContract: organization,
            owner,
            feeTo: user1,
            feeToSetter: user2,
            creatorAddress: user3,
            autoBuyAddress: other,
            publicClient,
        } = await loadFixture(deployContract);

        // const { Ownable, fomoFactory, owner, feeTo, feeToSetter, creatorAddress, autoBuyAddress, excessTokenReceiver, sellFeeContract, vaultContract } = await loadFixture(deployContract);

        console.log("验证默认管理员");
        expect(await organization.read.owner()).to.equal(getAddress(owner.account.address));

        // 创建带钱包权限的 Organization 合约实例
        const OrgOwner = await viem.getContractAt("contracts/organization.sol:Organization", organization.address, {
            client: { wallet: owner }
        });

        const OrgUser1 = await viem.getContractAt("contracts/organization.sol:Organization", organization.address, {
            client: { wallet: user1 }
        });

        const OrgUser2 = await viem.getContractAt("contracts/organization.sol:Organization", organization.address, {
            client: { wallet: user2 }
        });

        const OrgUser3 = await viem.getContractAt("contracts/organization.sol:Organization", organization.address, {
            client: { wallet: user3 }
        });

        // ====== 邀请绑定 user2 → user1 ======
        console.log("绑定邀请关系 user1 → user2");

        await expect(
            OrgUser2.write.addInvite([user1.account.address])
        )
            .to.emit(organization, "AddInvite")
            .withArgs(getAddress(user1.account.address), getAddress(user2.account.address));

        expect(await organization.read.presenter([user2.account.address]))
            .to.equal(getAddress(user1.account.address));

        // ====== 重复绑定，应报 NotRewrite ======
        await expect(
            OrgUser2.write.addInvite([user3.account.address])
        ).to.be.rejectedWith("notRewrite");

        // ====== 邀请自己 ======
        await expect(
            OrgUser1.write.addInvite([user1.account.address])
        ).to.be.rejectedWith("addressErr");

        // ====== 邀请 Address(0) ======
        await expect(
            OrgUser1.write.addInvite([zeroAddress])
        ).to.be.rejectedWith("addressErr");

        // ====== 循环邀请（user1 被 user2 邀请后不能再反向邀请） ======
        await expect(
            OrgUser1.write.addInvite([user2.account.address])
        ).to.be.rejectedWith("addressErr");

        // ====== stake 操作 user2 ======
        console.log("user2 开始 stake");

        const stakeAmount = await organization.read.stakeAmount();
        console.log(stakeAmount,formatEther(stakeAmount), 'stakeAmount');

        await expect(
            OrgUser2.write.stake({ value: parseEther('1') })
        ).to.be.rejectedWith("InvalidStakeAmount");

        await expect(
            OrgUser2.write.stake({
                value: stakeAmount
            })
        )
            .to.emit(organization, "Staked")
            .withArgs(getAddress(user2.account.address), stakeAmount);

        // 验证 user1.validNum 增加
        const user1Stake = await organization.read.isStaked([user1.account.address]);
        console.log(user1Stake);
        // return;

        expect(user1Stake[2]).to.equal(1);

        // ====== 重复 stake 报错 ======
        await expect(
            OrgUser2.write.stake({ value: stakeAmount })
        ).to.be.rejectedWith("AlreadyStaked");

        // ====== user3 绑定 user2，stake ======
        console.log("user3 绑定 user2 并质押");

        await OrgUser3.write.addInvite([user2.account.address]);
        await OrgUser3.write.stake({ value: stakeAmount });

        const user2Stake = await organization.read.isStaked([user2.account.address]);
        console.log(user2Stake,'user2Stake');

        expect(user2Stake[2]).to.equal(1);

        const user3Stake = await organization.read.isStaked([user3.account.address]);
        console.log(user3Stake,'user3Stake');

        expect(await publicClient.getBalance({address:organization.address})).equals(stakeAmount * 2n)


        // ====== user3 解除质押 ======
        console.log("user3 执行 unstake");

        await expect(
            OrgUser3.write.unstake()
        )
            .to.emit(organization, "Unstaked")
            .withArgs(getAddress(user3.account.address), stakeAmount);
        expect(await publicClient.getBalance({address:organization.address})).equals(stakeAmount)

        const user2StakeAfter = await organization.read.isStaked([user2.account.address]);
        console.log(user2StakeAfter,'user2StakeAfter');
        const user3StakeAfter = await organization.read.isStaked([user3.account.address]);
        console.log(user3StakeAfter,'user3StakeAfter');


        expect(user2StakeAfter[2]).to.equal(0);

        // ====== 未质押用户 unstake 报错 ======
        const OrgOther = await viem.getContractAt("contracts/organization.sol:Organization", organization.address, {
            client: { wallet: other }
        });

        await expect(
            OrgOther.write.unstake()
        ).to.be.rejectedWith("NotStaked");

        // ====== 测试修改 stakeAmount ======
        console.log("修改 stakeAmount");

        await expect(
            OrgOwner.write.setStakeAmount([parseEther("0.2")])
        )
            .to.emit(organization, "StakeAmountUpdated")
            .withArgs(parseEther("0.2"));



        expect(await organization.read.stakeAmount()).to.equal(parseEther("0.2"));

        console.log("getBalance",await publicClient.getBalance({address:organization.address}));

         await expect(
            OrgUser2.write.unstake()
        )
            .to.emit(organization, "Unstaked")
            .withArgs(getAddress(user2.account.address), stakeAmount);
        console.log("getBalance",await publicClient.getBalance({address:organization.address}));

        console.log(await organization.read.isStaked([user1.account.address]));
        console.log(await organization.read.isStaked([user2.account.address]));
        console.log(await organization.read.isStaked([user3.account.address]));

        await OrgUser2.write.stake({ value: parseEther("0.2") });
        console.log("getBalance",await publicClient.getBalance({address:organization.address}));

        console.log(await organization.read.isStaked([user1.account.address]));
        console.log(await organization.read.isStaked([user2.account.address]));
        console.log(await organization.read.isStaked([user3.account.address]));
        console.log(await organization.read.isStaked([other.account.address]));
        console.log("其他账户验证先质押，再绑定关系");

        await OrgOther.write.stake({ value: parseEther("0.2") });

        console.log(await organization.read.isStaked([user1.account.address]));
        console.log(await organization.read.isStaked([user2.account.address]));
        console.log(await organization.read.isStaked([user3.account.address]));
        console.log(await organization.read.isStaked([other.account.address]));
        console.log("绑定关系");

        await OrgOther.write.addInvite([user3.account.address]);

        console.log(await organization.read.isStaked([user1.account.address]));
        console.log(await organization.read.isStaked([user2.account.address]));
        console.log(await organization.read.isStaked([user3.account.address]));
        console.log(await organization.read.isStaked([other.account.address]));
        // 非 owner 不允许修改
        await expect(
            OrgUser1.write.setStakeAmount([parseEther("0.3")])
        ).to.be.rejectedWith("NotOwner");


        console.log("邀请 + 质押 测试完成");
    });

    it('验证权限合约权限', async () => {
        const { Ownable, fomoFactory, owner, feeTo, feeToSetter, creatorAddress, autoBuyAddress, excessTokenReceiver, sellFeeContract, vaultContract } = await loadFixture(deployContract);
        expect(await Ownable.read.owner()).to.be.equal(getAddress(owner.account.address))
        expect(await Ownable.read.feeTo()).to.be.equal(getAddress(feeTo.account.address))
        expect(await Ownable.read.autoBuyFeeTo()).to.be.equal(getAddress(autoBuyAddress.account.address))
        expect(await Ownable.read.contributionVault()).to.be.equal(getAddress(vaultContract.address))
        console.log("修改权限");
        await Ownable.write.transferOwnership([feeToSetter.account.address])
        expect(await Ownable.read.owner()).to.be.equal(getAddress(feeToSetter.account.address))

        const OwnerCreator = await viem.getContractAt('contracts/Owner.sol:IROOwner', Ownable.address, {
            client: {
                wallet: creatorAddress,
            },
        });

        await expect(OwnerCreator.write.setFeeTo([feeTo.account.address])).to.be.rejectedWith('1');

        const OwnerFeeSetter = await viem.getContractAt('contracts/Owner.sol:IROOwner', Ownable.address, {
            client: {
                wallet: feeToSetter,
            },
        });


        await expect(OwnerFeeSetter.write.setFeeTo([zeroAddress])).to.be.rejectedWith('NotZero');
        await expect(OwnerFeeSetter.write.setAutoBuyFeeTo([zeroAddress])).to.be.rejectedWith('NotZero');
        await expect(OwnerFeeSetter.write.setContributionVault([zeroAddress])).to.be.rejectedWith('NotZero');
        await expect(OwnerFeeSetter.write.setAutoBuyFeeTo([feeTo.account.address]))
            .to.emit(Ownable, 'AutoBuyFeeToUpdated')
            .withArgs(getAddress(feeTo.account.address), getAddress(autoBuyAddress.account.address));

        await expect(OwnerFeeSetter.write.setFeeTo([feeTo.account.address]))
            .to.emit(Ownable, 'FeeToUpdated')
            .withArgs(getAddress(feeTo.account.address), getAddress(feeTo.account.address));

        await expect(OwnerFeeSetter.write.setContributionVault([feeTo.account.address]))
            .to.emit(Ownable, 'ContributionVaultUpdated')
            .withArgs(getAddress(feeTo.account.address), getAddress(vaultContract.address));


        expect(await OwnerFeeSetter.read.autoBuyFeeTo()).to.be.equal(getAddress(feeTo.account.address));
        expect(await OwnerFeeSetter.read.feeTo()).to.be.equal(getAddress(feeTo.account.address));
        expect(await OwnerFeeSetter.read.contributionVault()).to.be.equal(getAddress(feeTo.account.address));



        console.log(await Ownable.read.sellFeeAddress());
        await expect(OwnerFeeSetter.write.setSellFeeAddress([sellFeeContract.address]))
            .to.emit(Ownable, 'SellFeeAddressUpdated')
            .withArgs(getAddress(sellFeeContract.address), getAddress(zeroAddress));
        expect(await Ownable.read.sellFeeAddress()).to.be.equal(getAddress(sellFeeContract.address));

        console.log(await Ownable.read.sellFeeAddress());

        console.log("验证设置LP赎回手续费");


        await expect(Ownable.write.decreaseQuota(['0x0fe4223AD99dF788A6Dcad148eB4086E6389cEB6', parseEther('100')])).rejectedWith()





    });

    it('验证券商合约设置券商列表以及对应手续费', async () => {
        const { Ownable, fomoFactory, whiteAccount0, fomoOranContract, } = await loadFixture(deployContract);
        expect((await Ownable.read.getBrokerGroup()).length).to.be.equal(1)
        let whiteAccount0Level = await Ownable.read.brokerMap([whiteAccount0.account.address])
        expect(whiteAccount0Level).to.be.equal(0n);
        console.log('marketing',await Ownable.read.marketing());

        await Ownable.write.setBroker([whiteAccount0.account.address, 0n, await Ownable.read.rootBroker()])
        expect(whiteAccount0Level).to.be.equal(0n);
        await expect(Ownable.write.setBroker([whiteAccount0.account.address, 5n, await Ownable.read.rootBroker()])).to.be.rejectedWith('InvalidLevel');
        await expect(Ownable.write.setBroker([whiteAccount0.account.address, 3n, await Ownable.read.rootBroker()])).to.be.rejectedWith('NotRewrite');
        whiteAccount0Level = await Ownable.read.brokerMap([whiteAccount0.account.address])
        expect(whiteAccount0Level).to.be.equal(0n);

        // await Ownable.write.setBroker([whiteAccount0.account.address, 4n,await Ownable.read.rootBroker()])

        let whiteList = await Ownable.read.getBrokerGroup()

        expect(whiteList[0]).to.be.equal(await Ownable.read.rootBroker())
        await Ownable.write.setBrokerLevel([whiteAccount0.account.address, 4n])
        whiteList = await Ownable.read.getBrokerGroup()
        expect(whiteList[1]).to.be.equal(getAddress(whiteAccount0.account.address))

        for (let item of whiteList) {
            console.log(await Ownable.read.brokerMap([item]));
        }

        await Ownable.write.setBrokerLevel([whiteAccount0.account.address, 0n])
        whiteList = await Ownable.read.getBrokerGroup();
        console.log(whiteList);
        expect(whiteList.length).to.be.equal(1)
        await expect(Ownable.write.setBroker([fomoOranContract.address, 1n, await Ownable.read.rootBroker()])).to.be.rejectedWith('notContract')


        await Ownable.write.transferMarketingship([whiteAccount0.account.address]);
        console.log('marketing',await Ownable.read.marketing());
        expect(await Ownable.read.marketing()).equals(getAddress(whiteAccount0.account.address))
        await expect(Ownable.write.setBrokerLevel([whiteAccount0.account.address, 0n])).rejectedWith('Err')

        expect(await Ownable.read.createFee()).equal(parseEther('0.1'))

        await Ownable.write.setCreateFee([parseEther('0.2')])

        expect(await Ownable.read.createFee()).equal(parseEther('0.2'))

        console.log("获取券商等级");

        for (let i = 0; i < 5; i++) {
            console.log(await Ownable.read.levelFee([BigInt(i)]));
        }

        await expect(Ownable.write.setLevelFee([0n, 30n])).rejectedWith('InvalidLevel')
        await expect(Ownable.write.setLevelFee([5n, 30n])).rejectedWith('InvalidLevel')
        await expect(Ownable.write.setLevelFee([1n, 2n])).rejectedWith('FeeError')
        await expect(Ownable.write.setLevelFee([1n, 2n])).rejectedWith('FeeError')

        console.log("设置券商等级");

        await Ownable.write.setLevelFee([1n, 4n])
        await Ownable.write.setLevelFee([2n, 6n])
        await Ownable.write.setLevelFee([3n, 8n])
        await Ownable.write.setLevelFee([4n, 9n])


        for (let i = 0; i < 5; i++) {
            console.log(await Ownable.read.levelFee([BigInt(i)]));
        }
        await Ownable.write.setLevelFee([1n, 3n])
        await Ownable.write.setLevelFee([2n, 5n])
        await Ownable.write.setLevelFee([3n, 7n])
        await Ownable.write.setLevelFee([4n, 10n])

        console.log(await Ownable.read.factoryAddress());
        await Ownable.write.setIROFactoryAddress([fomoFactory.address]);
        console.log(await Ownable.read.factoryAddress());

        let brokerBuySellFeeRate = await Ownable.read.brokerBuySellFeeRate();
        expect(brokerBuySellFeeRate).equal(3n)

        await expect(Ownable.write.setBrokerBuySellFeeRate([2n])).rejectedWith('Err')
        await expect(Ownable.write.setBrokerBuySellFeeRate([41n])).rejectedWith('Err')
        await Ownable.write.setBrokerBuySellFeeRate([40n])
        brokerBuySellFeeRate = await Ownable.read.brokerBuySellFeeRate();
        expect(brokerBuySellFeeRate).equal(40n);
    });

    it('验证工厂发行代币', async () => {
        return;
        const { Ownable, USDTContract, fomoFactory, sellFeeContract, swapRouter, owner, whiteAccount0, fomoOranContract, tokenInfo, FEE_AMOUNT, tokenWhiteAccount0,
            tokenWhiteAccount1,
            tokenWhiteAccount2, publicClient, feeTo } = await loadFixture(deployContract);
        // return;
        const id = 1n;
        const { totalSupply, initPrice, symbol } = tokenInfo;

        await Ownable.write.setIROFactoryAddress([fomoFactory.address]);
        await Ownable.write.setSellFeeAddress([sellFeeContract.address]);
        console.log(await Ownable.read.contributionVault());


        await expect(Ownable.write.initTokenWhiteList([fomoFactory.address, [{ account: feeTo.account.address, quota: parseEther('100000') }]])).rejectedWith('Err')
        console.log(await Ownable.read.factoryAddress(), await Ownable.read.sellFeeAddress());
        await USDTContract.write.approve([fomoFactory.address, maxUint256])

        // await expect(fomoFactory.write.createProject([id,totalSupply,initPrice,  symbol, [parseEther('10000'),parseEther('100000')], USDTContract.address, 180n,[]],{
        //     value:parseEther('0.1')
        // })).rejectedWith('NotWhitelist')

        // await Ownable.write.setBroker([owner.account.address, 1n]);

        await expect(fomoFactory.write.createProject([id, totalSupply, initPrice, symbol, [parseEther('10000'), parseEther('100000')], USDTContract.address, 800n, []])).rejectedWith('ErrDays')
        // await expect(fomoFactory.write.createProject([id, symbol, [parseEther('10000'),parseEther('100000')], []])).rejectedWith('IncorrectFee')

        await expect(fomoFactory.write.createProject([id, totalSupply, initPrice, symbol, [parseEther('10000'), parseEther('19999')], USDTContract.address, 180n, []])).rejectedWith('ErrCoinAddr')

        // console.log(await Ownable.read.tokenAGroup([0n]));

        expect((await Ownable.read.getTokenAGroup()).length).equal(0)

        await Ownable.write.setTokenA([USDTContract.address, true]);

        console.log(await Ownable.read.getTokenAGroup());


        await expect(fomoFactory.write.createProject([id, totalSupply, initPrice, symbol, [parseEther('10000'), parseEther('9999')], USDTContract.address, 180n, []])).rejectedWith('Err')

        console.log("验证关闭USDT代币的发币方式");

        await Ownable.write.setTokenA([USDTContract.address, false]);

        await expect(fomoFactory.write.createProject([id, totalSupply, initPrice, symbol, [parseEther('10000'), parseEther('19999')], USDTContract.address, 180n, []])).rejectedWith('ErrCoinAddr')


        await Ownable.write.setTokenA([USDTContract.address, true]);


        await expect(fomoFactory.write.createProject([id, totalSupply, initPrice, symbol, [parseEther('10000'), parseEther('50000')], USDTContract.address, 180n, [tokenWhiteAccount0.account.address,
        tokenWhiteAccount0.account.address,
        tokenWhiteAccount0.account.address,
        tokenWhiteAccount0.account.address,
        tokenWhiteAccount0.account.address,
        tokenWhiteAccount0.account.address
        ].map(item => ({ account: item, quota: parseEther('100000') }))])).rejectedWith('Err')
        // return;


        await expect(fomoFactory.write.createProject([id, totalSupply, initPrice, symbol, [parseEther('10000'), parseEther('50000')], USDTContract.address, 180n, [tokenWhiteAccount0.account.address,
            zeroAddress
        ].map(item => ({ account: item, quota: parseEther('100000') }))])).rejectedWith('')
        await expect(fomoFactory.write.createProject([id, totalSupply, initPrice, symbol, [parseEther('10000'), parseEther('50000')], USDTContract.address, 180n, [tokenWhiteAccount0.account.address,
        fomoFactory.address
        ].map(item => ({ account: item, quota: parseEther('100000') }))])).rejectedWith('err')

        let beforeFeeTo =  await USDTContract.read.balanceOf([feeTo.account.address])
        console.log(beforeFeeTo, 111);

        await expect(fomoFactory.write.createProject([id, totalSupply, initPrice, symbol, [parseEther('10000'), parseEther('50000')], USDTContract.address, 180n, [tokenWhiteAccount0.account.address,
        tokenWhiteAccount0.account.address,
        tokenWhiteAccount0.account.address,
        tokenWhiteAccount0.account.address,
        tokenWhiteAccount0.account.address,
        ].map(item => ({ account: item, quota: parseEther('100000') }))])).to.rejectedWith('')


        await expect(fomoFactory.write.createProject([id, totalSupply, initPrice, symbol, [parseEther('10000'), parseEther('50000')], USDTContract.address, 180n, [tokenWhiteAccount0.account.address,
        tokenWhiteAccount1.account.address
        ].map(item => ({ account: item, quota: parseEther('100000') }))])).to.emit(fomoFactory, 'CreateProject')


        let afterFeeTobal = await USDTContract.read.balanceOf([feeTo.account.address])
        expect(afterFeeTobal).equal(beforeFeeTo + parseEther('0.1'))
        expect(await fomoFactory.read.allTokensLength()).equal(1n)
        // expect(await fomoFactory.read.isExisted([id])).equal(true)
        const token = await fomoFactory.read.projectIDToken([id])
        const pool = await fomoFactory.read.getPool([token])

        console.log("验证设置代币白名单地址");

        console.log(await Ownable.read.getTokenWhiteList([token]));
        await expect(Ownable.write.addTokenWhiteList([token, tokenWhiteAccount0.account.address, parseEther('100000')])).rejectedWith('AddressAlreadyInWhiteList')

        const feeToOwnable = await viem.getContractAt("contracts/Owner.sol:IROOwner", Ownable.address, {
            client: {
                wallet: feeTo
            }
        })
        await expect(feeToOwnable.write.addTokenWhiteList([token, tokenWhiteAccount0.account.address, parseEther('100000')])).rejectedWith('Err')

        await Ownable.write.addTokenWhiteList([token, tokenWhiteAccount2.account.address, parseEther('100000')])

        console.log(await Ownable.read.getTokenWhiteList([token]));

        await Ownable.write.removeTokenWhiteList([token, tokenWhiteAccount0.account.address])
        console.log(await Ownable.read.getTokenWhiteList([token]));

    })

    it("验证USDT订阅", async () => {
        // return;
        const { Ownable, fomoFactory, sellFeeContract, owner, whiteAccount0, fomoOranContract, tokenInfo, FEE_AMOUNT, tokenWhiteAccount0,
            tokenWhiteAccount1, WETH, swapFactory, swapRouter,
            tokenWhiteAccount2,fomoOranContract:Organization, publicClient, vaultContract, feeTo, USDTContract, pledgeTo } = await loadFixture(deployContract);

        const id = 1n;
        const { totalSupply, initPrice, symbol } = tokenInfo;
        // await Ownable.write.setBroker([owner.account.address, 1n,await Ownable.read.rootBroker()]);
        await Ownable.write.setIROFactoryAddress([fomoFactory.address]);
        await Ownable.write.setSellFeeAddress([sellFeeContract.address]);
        console.log("券商地址", await Ownable.read.getBrokerGroup());

        await USDTContract.write.approve([fomoFactory.address, maxUint256])

        await Ownable.write.setTokenA([USDTContract.address, true]);
        await Ownable.write.setTokenA([WETH.address, true]);


        await fomoFactory.write.createProject([id, totalSupply, initPrice, symbol, [parseEther('10000'), parseEther('20000')], USDTContract.address, 180n, [
            tokenWhiteAccount0.account.address,
        ].map(item => ({ account: item, quota: parseEther('100000') }))])


        const tokenAddress = await fomoFactory.read.projectIDToken([id])
        const poolAddress = await fomoFactory.read.getPool([tokenAddress])
        console.log(tokenAddress, poolAddress);
        const tokenContract = await viem.getContractAt('contracts/IRO.sol:IROToken', tokenAddress);
        const poolConrtact = await viem.getContractAt('contracts/IRO.sol:IROPool', poolAddress);
        expect(await tokenContract.read.balanceOf([tokenAddress])).equal(totalSupply * 40n / 100n)
        expect(await tokenContract.read.balanceOf([poolAddress])).equal(totalSupply * 20n / 100n)
        expect(await tokenContract.read.balanceOf([vaultContract.address])).equal(totalSupply * 40n / 100n)

        console.log(await Ownable.read.getTokenWhiteList([tokenAddress]));


        const creator = await tokenContract.read.creator()

        const isWXOC = await tokenContract.read.isWXOC();
        console.log('isWXOC', isWXOC);
        expect(isWXOC).equals(false);

        console.log("软顶，", await tokenContract.read.softCap());
        console.log("硬顶，", await tokenContract.read.tradingLimit());
        expect(await tokenContract.read.softCap()).equals(parseEther('10000'))
        expect(await tokenContract.read.tradingLimit()).equals(parseEther('20000'))


        await expect(Ownable.write.addTokenWhiteList([tokenAddress, tokenWhiteAccount0.account.address, parseEther('100000')])).rejectedWith('AddressAlreadyInWhiteList')

        await Ownable.write.addTokenWhiteList([tokenAddress, '0x028d9ff364825fcf6ebf125456c5Fa26d0945f88', parseEther('100000')])
        await Ownable.write.addTokenWhiteList([tokenAddress, '0x0d223816B1A54EF5EB999196EBa703525fFd0731', parseEther('100000')])
        await Ownable.write.addTokenWhiteList([tokenAddress, '0xd205581e92301A7D7A35Be635cFD65e3d75EF73B', parseEther('100000')])
        await Ownable.write.addTokenWhiteList([tokenAddress, '0x62e9763c76b41d4Db574fc12e40f8B7c7Ec8231b', parseEther('100000')])
        console.log(await Ownable.read.getTokenWhiteList([tokenAddress]));
        // await expect(Ownable.write.addTokenWhiteList([tokenAddress, '0xc18147bc6d88Af7cc8491f8aBa2A71a729aEcF7c'])).rejectedWith('WhiteListFull')

        // return;
        await Ownable.write.removeTokenWhiteList([tokenAddress, '0x0d223816B1A54EF5EB999196EBa703525fFd0731'])
        console.log(await Ownable.read.getTokenWhiteList([tokenAddress]));
        console.log(await Ownable.read.sellFeeAddress());

        console.log("查询券商账户等级");
        console.log(await Ownable.read.brokerMap([creator]));

        await expect(await tokenContract.read.isOpen()).equal(false);

        const usdtBal = await USDTContract.read.balanceOf([owner.account.address])
        console.log(formatEther(usdtBal), pledgeTo.account.address);

        await expect(tokenContract.write.pledge([pledgeTo.account.address, parseEther('100')])).rejectedWith("") // isNoOpened

        await USDTContract.write.transfer([tokenWhiteAccount0.account.address, parseEther('10000000')])

        // return;
        await USDTContract.write.approve([tokenAddress, maxUint256])

        await expect(tokenContract.write.subscribe([owner.account.address, parseEther('100')])).rejectedWith("") // noPermission
        let [_white0USDTContract, _white1USDTContract, _white2USDTContract] = [tokenWhiteAccount0, tokenWhiteAccount1, tokenWhiteAccount2].map(async (wallet) => {
            return await viem.getContractAt('contracts/ERC20.sol:ERC20Token', USDTContract.address, {
                client: {
                    wallet
                }
            })
        })

        const [_white0TokenContract, _white1TokenContract, _white2TokenContract] = [tokenWhiteAccount0, tokenWhiteAccount1, tokenWhiteAccount2].map(async (wallet) => {
            return await viem.getContractAt('contracts/IRO.sol:IROToken', tokenAddress, {
                client: {
                    wallet
                }
            })
        })

        const [_white0RouterContract, _white1RouterContract, _white2RouterContract] = [tokenWhiteAccount0, tokenWhiteAccount1, tokenWhiteAccount2].map(async (wallet) => {
            return await viem.getContractAt('contracts/UniswapV2/interfaces/IUniswapV2Router02.sol:IUniswapV2Router02', swapRouter.address, {
                client: {
                    wallet
                }
            })
        })

        const [_white0PoolContract, _white1PoolContract, _white2PoolContract] = [tokenWhiteAccount0, tokenWhiteAccount1, tokenWhiteAccount2].map(async (wallet) => {
            return await viem.getContractAt('contracts/IRO.sol:IROPool', poolAddress, {
                client: {
                    wallet
                }
            })
        })

        const [_white0OriContract, _white1OriContract, _white2OriContract] = [tokenWhiteAccount0, tokenWhiteAccount1, tokenWhiteAccount2].map(async (wallet) => {
            return await viem.getContractAt('contracts/organization.sol:Organization', fomoOranContract.address, {
                client: {
                    wallet
                }
            })
        })

        const white0USDTContract = await _white0USDTContract
        const white1USDTContract = await _white1USDTContract
        const white2USDTContract = await _white2USDTContract

        const white0TokenContract = await _white0TokenContract
        const white1TokenContract = await _white1TokenContract
        const white2TokenContract = await _white2TokenContract

        const white0PoolContract = await _white0PoolContract
        const white1PoolContract = await _white1PoolContract
        const white2PoolContract = await _white2PoolContract

        const white0RouterContract = await _white0RouterContract
        const white1RouterContract = await _white1RouterContract
        const white2RouterContract = await _white2RouterContract


        const white0OriContract = await _white0OriContract
        const white1OriContract = await _white1OriContract
        const white2OriContract = await _white2OriContract

        // await white0OriContract.write.addInvite([owner.account.address])

        // await white1OriContract.write.addInvite([tokenWhiteAccount0.account.address])
        // return;
        console.log("查询绑定关系");

        console.log(await white0OriContract.read.presenter([tokenWhiteAccount1.account.address]));
        console.log(await white0OriContract.read.presenter([tokenWhiteAccount0.account.address]));
        console.log(await white0OriContract.read.presenter([owner.account.address]));
        // return;

        console.log(formatEther(await white0USDTContract.read.balanceOf([tokenWhiteAccount0.account.address])));
        console.log(formatEther(await USDTContract.read.balanceOf([feeTo.account.address])));
        console.log(formatEther(await USDTContract.read.balanceOf([tokenAddress])));
        await USDTContract.write.approve([tokenAddress, maxUint256])
        await tokenContract.write.approve([tokenAddress, maxUint256]);
        await tokenContract.write.approve([swapRouter.address, maxUint256]);
        await white0USDTContract.write.approve([tokenAddress, maxUint256])
        await white0USDTContract.write.approve([swapRouter.address, maxUint256])
        await white0TokenContract.write.approve([tokenAddress, maxUint256]);
        await white0TokenContract.write.approve([swapRouter.address, maxUint256]);
        await white1USDTContract.write.approve([tokenAddress, maxUint256])
        await white1TokenContract.write.approve([tokenAddress, maxUint256]);
        await white1TokenContract.write.approve([swapRouter.address, maxUint256]);
        await white1USDTContract.write.approve([swapRouter.address, maxUint256])


        console.log(await white0TokenContract.read.allowance([tokenWhiteAccount0.account.address, tokenAddress]));

        console.log("开始认购", await time.latest());
        // return;

        await white0TokenContract.write.subscribe([tokenWhiteAccount0.account.address, parseEther('10000')])
        // return;
        await time.increaseTo(BigInt((await time.latest()) + 60 * 24 * 60))
        console.log("触发自动做市USDT余额：", await USDTContract.read.balanceOf([tokenAddress]));
        let isOpen = await tokenContract.read.isOpen();
        console.log(isOpen, 'isOpen');

        if (!isOpen) {
            await white0TokenContract.write.subscribe([tokenWhiteAccount0.account.address, parseEther('40000')])
        }
        console.log(await poolConrtact.read.totalShare(), tokenWhiteAccount0.account.address);
        console.log("触发自动做市USDT余额：", await USDTContract.read.balanceOf([tokenAddress]));

        // const day = ~~((await time.latest()) / 600);
        // console.log(await tokenContract.read.daySwapCount([BigInt(day)]));
        // console.log(await tokenContract.read.daySwapAmount([BigInt(day)]));
        // await time.increaseTo(BigInt((await time.latest()) + 60 * 24 * 60))
        // await mine(4);
        // await white0TokenContract.write.pledge([tokenWhiteAccount0.account.address, parseEther('250')])
        // for(var i = 0; i < 50; i++) {
        //     console.log(await tokenContract.read.daySwapCount([BigInt(day)]));
        //     await white0TokenContract.write.approve([tokenAddress, maxUint256]);
        //     await mine(4);
        // }
        // return;


        const [status, quota] = await Ownable.read.tokenWhiteListMap([tokenAddress, tokenWhiteAccount0.account.address])
        expect(status).equal(true);
        expect(quota).equal(parseEther('100000') - parseEther('50000'));
        // return;

        let white0UserInfo = await poolConrtact.read.getUserInfo([tokenWhiteAccount0.account.address])
        // console.log(white0UserInfo);
        expect(white0UserInfo[0]).equal(parseEther('50000'))
        expect(await poolConrtact.read.totalShare()).equal(parseEther('50000'))
        isOpen = await tokenContract.read.isOpen()
        console.log(isOpen, 'isOpen');

        if (isOpen) {
            await expect(white0TokenContract.write.subscribe([tokenWhiteAccount0.account.address, parseEther('50')])).rejectedWith('') // isOpened
        }
        // return;
        const pairAddress = await swapFactory.read.getPair([USDTContract.address, tokenContract.address]);
        console.log('🚀 ~ it ~ pairAddress:', pairAddress, 'tokenAddress', tokenAddress);
        const pairContract = await viem.getContractAt('UniswapV2Pair', pairAddress);

        /**
         * 添加代币免手续费钱包地址
         */

        let tokenWhiteAccount2FeeStatus = await Ownable.read.isExcludedFromFee([tokenContract.address,tokenWhiteAccount2.account.address])
        console.log('tokenWhiteAccount2FeeStatus: ', tokenWhiteAccount2FeeStatus, await await Ownable.read.getExcludedFromFeeArr([tokenContract.address]));

        await Ownable.write.excludeFromFee([tokenContract.address,tokenWhiteAccount2.account.address])

        tokenWhiteAccount2FeeStatus = await Ownable.read.isExcludedFromFee([tokenContract.address,tokenWhiteAccount2.account.address])
        console.log('tokenWhiteAccount2FeeStatus: ', tokenWhiteAccount2FeeStatus, await await Ownable.read.getExcludedFromFeeArr([tokenContract.address]));
        await expect(Ownable.write.excludeFromFee([tokenContract.address,tokenWhiteAccount2.account.address])).rejectedWith('Err')

        await Ownable.write.excludeFromFee([tokenContract.address,tokenWhiteAccount1.account.address])

        await Ownable.write.excludeFromFee([tokenContract.address,tokenWhiteAccount0.account.address])
        console.log(await Ownable.read.getExcludedFromFeeArr([tokenContract.address]));

        console.log("移除tokenWhiteAccount1免手续费");

        await Ownable.write.includeInFee([tokenContract.address,tokenWhiteAccount1.account.address])

        console.log(await Ownable.read.getExcludedFromFeeArr([tokenContract.address]));

        //  /** 借贷开始 */
        const resver = await pairContract.read.getReserves()

        console.log(formatEther(resver[0]), formatEther(resver[1]));

        console.log("借贷开始");
        const flashContract = await viem.deployContract('FlashLoanArbitrage', [tokenContract.address, USDTContract.address])
        console.log(flashContract.address, 'flashContract.address');

        console.log(pairContract.address, formatEther(await USDTContract.read.balanceOf([owner.account.address])));
        await USDTContract.write.transfer([flashContract.address, parseEther('60000')])
        console.log(formatEther(await USDTContract.read.balanceOf([flashContract.address])));

        await time.increaseTo(BigInt((await time.latest()) + 60 * 24 * 60))
        // return;
        const amounts = [parseEther('0.1'), parseEther('3900000000')];
        const token0 = await pairContract.read.token0();
        const data = isAddressEqual(USDTContract.address, token0) ? amounts : amounts.reverse()
        // await flashContract.write.sellTow([pairContract.address]);
        await expect(flashContract.write.sellTow([pairContract.address])).rejectedWith()

        console.log(formatEther(await USDTContract.read.balanceOf([flashContract.address])));
        console.log("借贷结束");
        // /** 借贷结束 */

        // return

        // .to.emit(USDTContract,'Transfer')
        // .withArgs(tokenAddress,creator, parseEther('100') * 6n / 100n)
        //  .to.emit(USDTContract,'Transfer')
        // .withArgs(tokenAddress,feeTo.account.address, parseEther('100') * 1n / 100n)
        const sellFeeAddress = await Ownable.read.sellFeeAddress()
        console.log(formatEther(await USDTContract.read.balanceOf([tokenWhiteAccount0.account.address])));
        console.log(formatEther(await USDTContract.read.balanceOf([feeTo.account.address])));
        console.log(formatEther(await USDTContract.read.balanceOf([tokenAddress])));


        // console.log(await poolConrtact.read.getUserAllInfo([tokenWhiteAccount0.account.address]));
        console.log(await poolConrtact.read.accShareRewards());
        console.log(await tokenContract.read.getTokenPrice());

        // return;
        console.log("开始采用第二种方式认购");
        await white0TokenContract.write.pledge([tokenWhiteAccount1.account.address, parseEther('100')])
        // await tokenContract.write.pledge([owner.account.address, parseEther('100')])

        console.log(await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));

        console.log(formatEther(await USDTContract.read.balanceOf([tokenWhiteAccount0.account.address])));
        console.log(formatEther(await USDTContract.read.balanceOf([feeTo.account.address])));
        console.log(formatEther(await USDTContract.read.balanceOf([tokenAddress])));
        // return;
        let allInfo = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount0.account.address])
        let allInfo1 = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount1.account.address])
        let allInfoOwner = await poolConrtact.read.getUserAllInfo([owner.account.address])
        console.log(allInfo);
        console.log(allInfo1);
        console.log(allInfoOwner);
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount1", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount1.account.address])));
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount0", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount0.account.address])));
        console.log("getUserPledgeLpForUsdt-owner", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([owner.account.address])));
        // return;
        console.log("开始转移权益");

        // await white1OriContract.write.addInvite([tokenWhiteAccount0.account.address])
        console.log(await fomoOranContract.read.presenter([tokenWhiteAccount0.account.address]));
        console.log(await fomoOranContract.read.presenter([tokenWhiteAccount1.account.address]));

        // console.log(await poolConrtact.read.UserInfos([owner.account.address]));

        // return;
        // await white0PoolContract.write.transferAward([tokenWhiteAccount1.account.address,parseEther('24120')])


        allInfo = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount0.account.address])
        allInfo1 = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount1.account.address])
        console.log(allInfo);
        console.log(allInfo1);
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount1", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount1.account.address])));
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount0", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount0.account.address])));

        await white1PoolContract.write.transferAwards([[tokenWhiteAccount0.account.address, tokenWhiteAccount0.account.address], [parseEther('10'), parseEther('10')]])


        allInfo = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount0.account.address])
        allInfo1 = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount1.account.address])
        console.log(allInfo);
        console.log(allInfo1);
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount1", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount1.account.address])));
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount0", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount0.account.address])));

        // console.log(await poolConrtact.read.UserInfos([owner.account.address]));
        // return;
        await white0PoolContract.write.transferAwards([[tokenWhiteAccount1.account.address], [parseEther('100')]])
        console.log('-------');
        // console.log(await poolConrtact.read.UserInfos([owner.account.address]));
        console.log(formatEther(204529866175371810493n), formatEther(79853052870790211484n));
        allInfo = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount0.account.address])
        allInfo1 = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount1.account.address])
        // console.log(allInfo);
        // console.log(allInfo1);
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount1", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount1.account.address])));
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount0", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount0.account.address])));

        await white0PoolContract.write.transferAwards([[tokenWhiteAccount1.account.address], [parseEther('40000')]])
        // console.log(await poolConrtact.read.UserInfos([owner.account.address]));
        console.log(formatEther(204529866175371810493n), formatEther(79853052870790211484n));
        allInfo = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount0.account.address])
        allInfo1 = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount1.account.address])
        // console.log(allInfo);
        // console.log(allInfo1);
        // return;
        console.log("查询奖励");
        console.log("accShareRewards", await poolConrtact.read.accShareRewards());
        console.log("getDeposit tokenWhiteAccount0", await poolConrtact.read.getDeposit([tokenWhiteAccount0.account.address]));
        console.log("getDeposit tokenWhiteAccount1", await poolConrtact.read.getDeposit([tokenWhiteAccount1.account.address]));
        console.log("getDeposit owner", await poolConrtact.read.getDeposit([owner.account.address]));
        await time.increaseTo(BigInt((await time.latest()) + 31 * 60));

        console.log("触发产出奖励");

        await expect(tokenContract.write.approve([swapFactory.address, maxUint256]))
            .to.emit(poolConrtact, 'AddProduce');

        console.log("accShareRewards", await poolConrtact.read.accShareRewards());
        console.log("getDeposit tokenWhiteAccount0", await poolConrtact.read.getDeposit([tokenWhiteAccount0.account.address]));
        console.log("getDeposit tokenWhiteAccount1", await poolConrtact.read.getDeposit([tokenWhiteAccount1.account.address]));
        console.log("getDeposit owner", await poolConrtact.read.getDeposit([owner.account.address]));

        console.log("领取奖励前查看用户信息");

        // console.log(await poolConrtact.read.UserInfos([tokenWhiteAccount0.account.address]));
        // return;
        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));

        const white1Reward = await poolConrtact.read.getDeposit([tokenWhiteAccount1.account.address])
        /**验证最多4层经济商级差奖励开始 */

         const arr = [
            '0x2013dE79c7868fd50De86C544512563e9756671b',
            '0x575AC6beCC9eB9BC76791E3b97e5b08f9441c315',
            '0xA286F13e8E0C1C1a1fd101C3D44F9aDdBb735bba',
            '0xEbFEb40C1B1EB583e1EAeC0a844C21aca82c8bb3',
            '0x2933195BA36FA7ceE647fD6e02A617ecf94C4ed1',
            '0x266cFAA723B0F431998978223EC4d9eAcD03e57B',
            '0x4211F58A712b2b0042C27571E30C36cd1EA3E164',
            '0x6c9dfB7cfFC7A823394Fbeb65B56cFBF4621612A',
            '0x9377fd86E92e5AcB090Bc5491437657BdF90B158',
            '0x963176d1A22546F44Be99e137a58F13A811139Ee',
            '0x5F3Efe0241AB31c8f8748a2f5Cb56dDcEa07406f'
        ];
        // await fomoOranContract.write.upadteAddInvite([tokenWhiteAccount1.account.address, arr[0] as Hash,true])

        // for(var i = 0; i < arr.length - 1; i++) {
        //     await fomoOranContract.write.upadteAddInvite([(arr[i] as Hash), (arr[i+1] as Hash), i < 20 ? true : false])
        // }
        console.log('tokenWhiteAccount1',tokenWhiteAccount1.account.address,await white0OriContract.read.presenter([tokenWhiteAccount1.account.address]));
        for(var i = 0; i < arr.length; i++) {
            console.log(arr[i],await Organization.read.presenter([arr[i] as Hash]));
        }

        let statkeConfig = [
            [true,1n],
            [true,2n],
            [false,2n],
            [false,3n],
            [false,5n],
            [true,6n],
            [true,7n],
            [true,8n],
            [true,9n],
            [true,10n],
            [true,8n],
        ]

        // for(var i = 0; i < arr.length; i++) {
        //     console.log((arr[i] as Hash),statkeConfig[i][0] as boolean,0n, statkeConfig[i][1] as bigint);
        //     await fomoOranContract.write.updateStakeInfo([(arr[i] as Hash),statkeConfig[i][0] as boolean,0n, statkeConfig[i][1] as bigint])
        // }

        for(var i = 0; i < arr.length; i++) {
            console.log(arr[i],await fomoOranContract.read.isStaked([(arr[i] as Hash)]));
        }



        /**验证最多4层经济商级差奖励结束 */

        await white1PoolContract.write.extract([white1Reward])
        // return;

        await expect(await tokenContract.read.balanceOf([tokenWhiteAccount1.account.address])).equal(white1Reward)

        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));
        console.log("tokenWhiteAccount1Bal", await tokenContract.read.balanceOf([tokenWhiteAccount1.account.address]));

        // await white1TokenContract.write.transfer([tokenWhiteAccount0.account.address,parseEther('1')])
        // await expect(white1TokenContract.write.transfer([tokenWhiteAccount0.account.address,parseEther('1')]))
        //     .to.emit(poolConrtact, 'AddProduce');
        // return;
        // await white0PoolContract.write.extract([white1Reward])

        // return;
        console.log("creator", await tokenContract.read.creator());
        console.log(await Ownable.read.brokerMap([await tokenContract.read.creator()]));
        await Ownable.write.setBrokerLevel([owner.account.address, 1n])
        console.log("开始验证买卖税到池子里面");
        console.log("sellFeeContract", await tokenContract.read.balanceOf([sellFeeContract.address]));
        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));

        console.log(formatEther(await USDTContract.read.balanceOf([tokenWhiteAccount1.account.address])));
        console.log(formatEther(await USDTContract.read.balanceOf([tokenWhiteAccount0.account.address])));
        await Ownable.write.includeInFee([tokenContract.address, tokenWhiteAccount0.account.address])

        const path = [USDTContract.address, tokenContract.address] as const;
        console.log(await tokenContract.read.balanceOf([poolAddress]));

        await white0RouterContract.write.swapExactTokensForTokens([
            parseEther('100'),
            1n,
            path,
            tokenWhiteAccount1.account.address,
            BigInt(await time.latest()) + 100000n,
        ]);
        console.log(await tokenContract.read.balanceOf([poolAddress]));



        await white1RouterContract.write.swapExactTokensForTokensSupportingFeeOnTransferTokens([
            parseEther('10'),
            1n,
            [tokenContract.address,USDTContract.address,],
            tokenWhiteAccount1.account.address,
            BigInt(await time.latest()) + 100000n,
        ]);
        console.log(await tokenContract.read.balanceOf([poolAddress]));


        console.log("sellFeeContract", await tokenContract.read.balanceOf([sellFeeContract.address]));
        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));
        await Ownable.write.excludeFromFee([tokenContract.address, tokenWhiteAccount0.account.address])

        await white1RouterContract.write.swapExactTokensForTokensSupportingFeeOnTransferTokens([
            parseEther('1000'),
            1n,
            [tokenContract.address, USDTContract.address],
            tokenWhiteAccount0.account.address,
            BigInt(await time.latest()) + 100000n,
        ]);
        console.log("sellFeeContract", formatEther(await tokenContract.read.balanceOf([sellFeeContract.address])));
        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));
        // return;
        await expect(sellFeeContract.write.claim([tokenAddress])).rejectedWith('Err');
        await sellFeeContract.write.setOwnerContract([Ownable.address])

        /**验证最多4层经济商级差奖励开始 */
        // const arr = [
        //     '0x2013dE79c7868fd50De86C544512563e9756671b',
        //     '0x575AC6beCC9eB9BC76791E3b97e5b08f9441c315',
        //     '0xA286F13e8E0C1C1a1fd101C3D44F9aDdBb735bba',
        //     '0xEbFEb40C1B1EB583e1EAeC0a844C21aca82c8bb3',
        //     '0x2933195BA36FA7ceE647fD6e02A617ecf94C4ed1',
        //     '0x266cFAA723B0F431998978223EC4d9eAcD03e57B'
        // ];
        // const level = [
        //     1n,
        //     0n,
        //     0n,
        //     0n,
        //     0n,
        //     0n
        // ]
        // await Ownable.write.setBrokerLevel([arr[0] as Hash,1n])
        // console.log(arr[0] as Hash,' level',await Ownable.read.brokerMap([arr[0] as Hash]));

        // console.log('owner level',await Ownable.read.brokerMap([owner.account.address]));
        // for(var i = 0; i < arr.length; i++) {
        //     console.log([i == 0 ? await Ownable.read.rootBroker() : arr[i - 1] as Hash,level[i],arr[i] as Hash] );
        //     await Ownable.write.setBroker([i == 0 ? await Ownable.read.rootBroker() : arr[i - 1] as Hash,level[i],arr[i] as Hash] )
        // }
        // await Ownable.write.setBrokerLevel([owner.account.address,0n])

        // console.log('owner level',await Ownable.read.brokerMap([owner.account.address]),await Ownable.read.presenter([owner.account.address]));

        // for(var i = 0; i < arr.length; i++) {
        //     console.log(arr[i],'level',await Ownable.read.brokerMap([arr[i] as Hash]),await Ownable.read.presenter([arr[i] as Hash]));
        // }
        /**验证最多4层经济商级差奖励结束 */


        await sellFeeContract.write.claim([tokenAddress])
        return;
        await expect(sellFeeContract.write.claim([tokenAddress])).rejectedWith('Err');
        // return;
        console.log("买币");

        await white0RouterContract.write.swapExactTokensForTokens([
            parseEther('100'),
            1n,
            path,
            tokenWhiteAccount0.account.address,
            BigInt(await time.latest()) + 100000n,
        ]);

        // return;
        console.log("sellFeeContract", await tokenContract.read.balanceOf([sellFeeContract.address]));
        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));
        const whiteSellContract = await viem.getContractAt('contracts/IRO.sol:IROSellFeeContract', sellFeeAddress, {
            client: {
                wallet: tokenWhiteAccount0
            }
        })

        await expect(whiteSellContract.write.claim([tokenAddress])).rejectedWith('Err')
        await time.increaseTo(BigInt((await time.latest()) + 31 * 60));

        await sellFeeContract.write.claim([tokenAddress])
        // return;

        console.log("sellFeeContract", formatEther(await tokenContract.read.balanceOf([sellFeeContract.address])));
        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));
        await expect(sellFeeContract.write.claim([tokenAddress])).rejectedWith('Err');

    })

    it("验证WXOC订阅", async () => {
        let { Ownable, fomoFactory, sellFeeContract, owner, whiteAccount0, fomoOranContract, tokenInfo, FEE_AMOUNT, tokenWhiteAccount0,
            tokenWhiteAccount1, WETH, swapFactory, swapRouter,
            tokenWhiteAccount2,fomoOranContract:Organization, publicClient, vaultContract, feeTo, USDTContract, pledgeTo } = await loadFixture(deployContract);

        const id = 1n;
        const { totalSupply, initPrice, symbol, softCap, tradingLimit, createFee, secendSub } = tokenInfo;
        // await Ownable.write.setBroker([owner.account.address, 1n,await Ownable.read.rootBroker()]);
        await Ownable.write.setIROFactoryAddress([fomoFactory.address]);
        await Ownable.write.setSellFeeAddress([sellFeeContract.address]);
        console.log("券商地址", await Ownable.read.getBrokerGroup());

        await USDTContract.write.approve([fomoFactory.address,maxUint256])

        await Ownable.write.setTokenA([USDTContract.address, true]);
        await Ownable.write.setTokenA([WETH.address, true]);

        await Ownable.write.setBroker([whiteAccount0.account.address, 2n, await Ownable.read.rootBroker()])
        await Ownable.write.setBroker([tokenWhiteAccount1.account.address, 1n, whiteAccount0.account.address])
        await Ownable.write.setBroker([tokenWhiteAccount2.account.address, 1n, tokenWhiteAccount1.account.address])
        // await Ownable.write.setBrokerLevel([tokenWhiteAccount1.account.address, 0n])
        await Ownable.write.setBrokerLevel([owner.account.address, 3n])

        const brokerList = await Ownable.read.getBrokerGroup()
        console.log("经济商列表", brokerList);
        for (var item of brokerList) {
            const level = await Ownable.read.brokerMap([item])
            console.log(`等级：${level}, 手续费：${await Ownable.read.levelFee([level])},地址： ${item}`);
        }
        console.log(USDTContract.address,await USDTContract.read.balanceOf([owner.account.address]));
        console.log(await USDTContract.read.allowance([owner.account.address,fomoFactory.address]));



        // fomoFactory = await viem.getContractAt('IROFactory', fomoFactory.address, {
        //     client: {
        //         wallet: tokenWhiteAccount2
        //     }
        // })

        await fomoFactory.write.createProject([id, totalSupply, initPrice, symbol, [softCap, tradingLimit], WETH.address, 180n, [tokenWhiteAccount0.account.address,

        ].map(item => ({ account: item, quota: parseEther('100000') }))])

        // return;

        const tokenAddress = await fomoFactory.read.projectIDToken([id])
        const poolAddress = await fomoFactory.read.getPool([tokenAddress])
        console.log("代币合约", tokenAddress, "挖矿合约", poolAddress);
        const tokenContract = await viem.getContractAt('contracts/IRO.sol:IROToken', tokenAddress);
        const poolConrtact = await viem.getContractAt('contracts/IRO.sol:IROPool', poolAddress);
        expect(await tokenContract.read.balanceOf([tokenAddress])).equal(totalSupply * 40n / 100n)
        expect(await tokenContract.read.balanceOf([poolAddress])).equal(totalSupply * 20n / 100n)
        expect(await tokenContract.read.balanceOf([vaultContract.address])).equal(totalSupply * 40n / 100n)

        console.log(await Ownable.read.getTokenWhiteList([tokenAddress]));


        const creator = await tokenContract.read.creator()

        const isWXOC = await tokenContract.read.isWXOC();
        console.log('isWXOC', isWXOC);
        expect(isWXOC).equals(true);

        console.log("软顶，", await tokenContract.read.softCap());
        console.log("硬顶，", await tokenContract.read.tradingLimit());
        expect(await tokenContract.read.softCap()).equals(softCap)
        expect(await tokenContract.read.tradingLimit()).equals(tradingLimit)

        // await expect(Ownable.write.addTokenWhiteList([tokenAddress, tokenWhiteAccount0.account.address,parseEther('100000')])).rejectedWith('AddressAlreadyInWhiteList')

        // await Ownable.write.addTokenWhiteList([tokenAddress, '0x028d9ff364825fcf6ebf125456c5Fa26d0945f88',parseEther('100000')])
        // await Ownable.write.addTokenWhiteList([tokenAddress, '0x0d223816B1A54EF5EB999196EBa703525fFd0731',parseEther('100000')])
        // await Ownable.write.addTokenWhiteList([tokenAddress, '0xd205581e92301A7D7A35Be635cFD65e3d75EF73B',parseEther('100000')])
        // await Ownable.write.addTokenWhiteList([tokenAddress, '0x62e9763c76b41d4Db574fc12e40f8B7c7Ec8231b',parseEther('100000')])
        console.log(await Ownable.read.getTokenWhiteList([tokenAddress]));
        // await expect(Ownable.write.addTokenWhiteList([tokenAddress, '0xc18147bc6d88Af7cc8491f8aBa2A71a729aEcF7c'])).rejectedWith('WhiteListFull')


        // await Ownable.write.removeTokenWhiteList([tokenAddress, '0x0d223816B1A54EF5EB999196EBa703525fFd0731'])
        console.log(await Ownable.read.getTokenWhiteList([tokenAddress]));
        console.log(await Ownable.read.sellFeeAddress());

        console.log("查询券商账户等级");
        console.log(await Ownable.read.brokerMap([creator]));

        await expect(await tokenContract.read.isOpen()).equal(false);
        await setBalance(owner.account.address, parseEther('100000000'))
        await setBalance(tokenWhiteAccount0.account.address, parseEther('100000000'))
        await setBalance(tokenWhiteAccount1.account.address, parseEther('100000000'))
        const usdtBal = await publicClient.getBalance({ address: owner.account.address })
        console.log(formatEther(usdtBal), pledgeTo.account.address);

        await expect(tokenContract.write.pledge([pledgeTo.account.address, parseEther('100')])).rejectedWith("") // isNoOpened



        await expect(tokenContract.write.subscribe([owner.account.address, parseEther('100')])).rejectedWith("") // noPermission
        let [_white0USDTContract, _white1USDTContract, _white2USDTContract] = [tokenWhiteAccount0, tokenWhiteAccount1, tokenWhiteAccount2].map(async (wallet) => {
            return await viem.getContractAt('contracts/ERC20.sol:ERC20Token', USDTContract.address, {
                client: {
                    wallet
                }
            })
        })

        const [_white0TokenContract, _white1TokenContract, _white2TokenContract] = [tokenWhiteAccount0, tokenWhiteAccount1, tokenWhiteAccount2].map(async (wallet) => {
            return await viem.getContractAt('contracts/IRO.sol:IROToken', tokenAddress, {
                client: {
                    wallet
                }
            })
        })

        const [_white0RouterContract, _white1RouterContract, _white2RouterContract] = [tokenWhiteAccount0, tokenWhiteAccount1, tokenWhiteAccount2].map(async (wallet) => {
            return await viem.getContractAt('contracts/UniswapV2/interfaces/IUniswapV2Router02.sol:IUniswapV2Router02', swapRouter.address, {
                client: {
                    wallet
                }
            })
        })

        const [_white0PoolContract, _white1PoolContract, _white2PoolContract] = [tokenWhiteAccount0, tokenWhiteAccount1, tokenWhiteAccount2].map(async (wallet) => {
            return await viem.getContractAt('contracts/IRO.sol:IROPool', poolAddress, {
                client: {
                    wallet
                }
            })
        })

        const [_white0OriContract, _white1OriContract, _white2OriContract] = [tokenWhiteAccount0, tokenWhiteAccount1, tokenWhiteAccount2].map(async (wallet) => {
            return await viem.getContractAt('contracts/organization.sol:Organization', fomoOranContract.address, {
                client: {
                    wallet
                }
            })
        })
        // const white0USDTContract = await _white0USDTContract
        // const white1USDTContract = await _white1USDTContract
        // const white2USDTContract = await _white2USDTContract

        const white0TokenContract = await _white0TokenContract
        const white1TokenContract = await _white1TokenContract
        const white2TokenContract = await _white2TokenContract

        const white0PoolContract = await _white0PoolContract
        const white1PoolContract = await _white1PoolContract
        const white2PoolContract = await _white2PoolContract

        const white0RouterContract = await _white0RouterContract
        const white1RouterContract = await _white1RouterContract
        const white2RouterContract = await _white2RouterContract


        const white0OriContract = await _white0OriContract
        const white1OriContract = await _white1OriContract
        const white2OriContract = await _white2OriContract
        // return;

        // await white0OriContract.write.addInvite([owner.account.address])

        // await white1OriContract.write.addInvite([tokenWhiteAccount0.account.address])
        // return;
        console.log("查询绑定关系");

        console.log(await white0OriContract.read.presenter([tokenWhiteAccount1.account.address]));
        console.log(await white0OriContract.read.presenter([tokenWhiteAccount0.account.address]));
        console.log(await white0OriContract.read.presenter([owner.account.address]));
        // return;

        console.log(formatEther(await publicClient.getBalance({ address: feeTo.account.address })));
        console.log(formatEther(await publicClient.getBalance({ address: tokenAddress })));
        await USDTContract.write.approve([tokenAddress, maxUint256])
        await tokenContract.write.approve([tokenAddress, maxUint256]);
        await tokenContract.write.approve([swapRouter.address, maxUint256]);
        await white0TokenContract.write.approve([tokenAddress, maxUint256]);
        await white0TokenContract.write.approve([swapRouter.address, maxUint256]);
        await white1TokenContract.write.approve([swapRouter.address, maxUint256]);


        console.log(await white0TokenContract.read.allowance([tokenWhiteAccount0.account.address, tokenAddress]));

        console.log("开始认购", await time.latest());
        // return;

        await white0TokenContract.write.subscribe([tokenWhiteAccount0.account.address, softCap], {
            value: softCap
        })
        // return;
        await time.increaseTo(BigInt((await time.latest()) + 60 * 24 * 60))
        console.log("触发自动做市USDT余额：", await publicClient.getBalance({ address: tokenAddress }));

        let isOpen = await tokenContract.read.isOpen();
        console.log(isOpen, 'isOpen');

        if (!isOpen) {
            await white0TokenContract.write.subscribe([tokenWhiteAccount0.account.address, secendSub], {
                value: secendSub
            })
        }

        console.log(await poolConrtact.read.totalShare(), tokenWhiteAccount0.account.address);
        console.log("触发自动做市USDT余额：", await publicClient.getBalance({ address: tokenAddress }));
        // return;
        const day = ~~((await time.latest()) / 600);
        console.log(await tokenContract.read.daySwapCount([BigInt(day)]));
        console.log(await tokenContract.read.daySwapAmount([BigInt(day)]));
        // await time.increaseTo(BigInt((await time.latest()) + 60 * 24 * 60))
        // await mine(4);
        console.log("tokenWhiteAccount0.account.address", formatEther(await publicClient.getBalance({ address: tokenWhiteAccount0.account.address })));

        // await white0TokenContract.write.pledge([tokenWhiteAccount0.account.address, parseEther('250')],{
        //     value:parseEther('250')
        // })
        // for(var i = 0; i < 50; i++) {
        //     console.log(await tokenContract.read.daySwapCount([BigInt(day)]));
        //     await white0TokenContract.write.approve([tokenAddress, maxUint256]);
        //     await mine(4);
        // }

        // return;
        const [status, quota] = await Ownable.read.tokenWhiteListMap([tokenAddress, tokenWhiteAccount0.account.address])
        expect(status).equal(true);
        expect(quota).equal(parseEther('100000') - (softCap + secendSub));
        // return;

        let white0UserInfo = await poolConrtact.read.getUserInfo([tokenWhiteAccount0.account.address])
        // console.log(white0UserInfo);
        expect(white0UserInfo[0]).equal(softCap + secendSub)
        expect(await poolConrtact.read.totalShare()).equal(softCap + secendSub)
        isOpen = await tokenContract.read.isOpen()
        console.log(isOpen, 'isOpen');

        if (isOpen) {
            await expect(white0TokenContract.write.subscribe([tokenWhiteAccount0.account.address, parseEther('50')])).rejectedWith('') // isOpened
        }
        // return;
        const pairAddress = await swapFactory.read.getPair([WETH.address, tokenContract.address]);
        console.log('🚀 ~ it ~ pairAddress:', pairAddress, 'tokenAddress', tokenAddress);
        const pairContract = await viem.getContractAt('UniswapV2Pair', pairAddress);


        /**
         * 添加代币免手续费钱包地址
         */

        // let tokenWhiteAccount2FeeStatus = await Ownable.read.isExcludedFromFee([tokenContract.address,tokenWhiteAccount2.account.address])
        // console.log('tokenWhiteAccount2FeeStatus: ', tokenWhiteAccount2FeeStatus, await await Ownable.read.getExcludedFromFeeArr([tokenContract.address]));

        // await Ownable.write.excludeFromFee([tokenContract.address,tokenWhiteAccount2.account.address])

        // tokenWhiteAccount2FeeStatus = await Ownable.read.isExcludedFromFee([tokenContract.address,tokenWhiteAccount2.account.address])
        // console.log('tokenWhiteAccount2FeeStatus: ', tokenWhiteAccount2FeeStatus, await await Ownable.read.getExcludedFromFeeArr([tokenContract.address]));
        // await expect(Ownable.write.excludeFromFee([tokenContract.address,tokenWhiteAccount2.account.address])).rejectedWith('Err')

        // await Ownable.write.excludeFromFee([tokenContract.address,tokenWhiteAccount1.account.address])

        // await Ownable.write.excludeFromFee([tokenContract.address,tokenWhiteAccount0.account.address])
        // console.log(await Ownable.read.getExcludedFromFeeArr([tokenContract.address]));

        // console.log("移除tokenWhiteAccount1免手续费");

        // await Ownable.write.includeInFee([tokenContract.address,tokenWhiteAccount1.account.address])

        // console.log(await Ownable.read.getExcludedFromFeeArr([tokenContract.address]));

        //  /** 借贷开始 */
        const resver = await pairContract.read.getReserves()

        console.log(formatEther(resver[0]), formatEther(resver[1]));

        console.log("借贷开始");
        const flashContract = await viem.deployContract('FlashLoanArbitrage', [tokenContract.address, WETH.address])
        console.log(flashContract.address, 'flashContract.address');

        console.log(pairContract.address, formatEther(await USDTContract.read.balanceOf([owner.account.address])));
        // await USDTContract.write.transfer([flashContract.address, parseEther('60000')])
        await setBalance(flashContract.address, parseEther('60000'))
        console.log(formatEther(await USDTContract.read.balanceOf([flashContract.address])));

        await time.increaseTo(BigInt((await time.latest()) + 60 * 24 * 60))
        // return;
        const amounts = [parseEther('0.1'), parseEther('3900000000')];
        const token0 = await pairContract.read.token0();
        const data = isAddressEqual(USDTContract.address, token0) ? amounts : amounts.reverse()
        // await flashContract.write.sellTow([pairContract.address]);
        await expect(flashContract.write.sellTow([pairContract.address])).rejectedWith()

        console.log(formatEther(await USDTContract.read.balanceOf([flashContract.address])));
        console.log("借贷结束");
        // /** 借贷结束 */

        // return

        // .to.emit(USDTContract,'Transfer')
        // .withArgs(tokenAddress,creator, parseEther('100') * 6n / 100n)
        //  .to.emit(USDTContract,'Transfer')
        // .withArgs(tokenAddress,feeTo.account.address, parseEther('100') * 1n / 100n)
        const sellFeeAddress = await Ownable.read.sellFeeAddress()
        console.log(formatEther(await USDTContract.read.balanceOf([tokenWhiteAccount0.account.address])));
        console.log(formatEther(await USDTContract.read.balanceOf([feeTo.account.address])));
        console.log(formatEther(await USDTContract.read.balanceOf([tokenAddress])));


        // console.log(await poolConrtact.read.getUserAllInfo([tokenWhiteAccount0.account.address]));
        console.log(await poolConrtact.read.accShareRewards());
        console.log(await tokenContract.read.getTokenPrice());

        // return;
        console.log("开始采用第二种方式认购");
        await white0TokenContract.write.pledge([tokenWhiteAccount1.account.address, parseEther('250')], {
            value: parseEther('250')
        })
        // await tokenContract.write.pledge([owner.account.address, parseEther('100')])
        // return
        console.log(await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));

        console.log(formatEther(await USDTContract.read.balanceOf([tokenWhiteAccount0.account.address])));
        console.log(formatEther(await USDTContract.read.balanceOf([feeTo.account.address])));
        console.log(formatEther(await USDTContract.read.balanceOf([tokenAddress])));
        // return;
        let allInfo = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount0.account.address])
        let allInfo1 = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount1.account.address])
        let allInfoOwner = await poolConrtact.read.getUserAllInfo([owner.account.address])
        console.log(allInfo);
        console.log(allInfo1);
        console.log(allInfoOwner);
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount1", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount1.account.address])));
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount0", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount0.account.address])));
        console.log("getUserPledgeLpForUsdt-owner", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([owner.account.address])));
        // return;
        console.log("开始转移权益");

        // await white1OriContract.write.addInvite([tokenWhiteAccount0.account.address])
        console.log(await fomoOranContract.read.presenter([tokenWhiteAccount0.account.address]));
        console.log(await fomoOranContract.read.presenter([tokenWhiteAccount1.account.address]));

        // console.log(await poolConrtact.read.UserInfos([owner.account.address]));

        // return;
        // await white0PoolContract.write.transferAward([tokenWhiteAccount1.account.address,parseEther('24120')])


        allInfo = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount0.account.address])
        allInfo1 = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount1.account.address])
        console.log(allInfo);
        console.log(allInfo1);
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount1", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount1.account.address])));
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount0", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount0.account.address])));

        // await white1PoolContract.write.transferAwards([[tokenWhiteAccount0.account.address, tokenWhiteAccount0.account.address], [parseEther('10'), parseEther('10')]])


        allInfo = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount0.account.address])
        allInfo1 = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount1.account.address])
        console.log(allInfo);
        console.log(allInfo1);
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount1", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount1.account.address])));
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount0", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount0.account.address])));

        // console.log(await poolConrtact.read.UserInfos([owner.account.address]));
        // return;
        // await white0PoolContract.write.transferAwards([[tokenWhiteAccount1.account.address], [parseEther('100')]])
        console.log('-------');
        // console.log(await poolConrtact.read.UserInfos([owner.account.address]));        console.log(formatEther(204529866175371810493n), formatEther(79853052870790211484n));
        allInfo = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount0.account.address])
        allInfo1 = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount1.account.address])
        // console.log(allInfo);
        // console.log(allInfo1);
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount1", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount1.account.address])));
        console.log("getUserPledgeLpForUsdt-tokenWhiteAccount0", formatEther(await poolConrtact.read.getUserPledgeLpForUsdt([tokenWhiteAccount0.account.address])));

        // await white0PoolContract.write.transferAwards([[tokenWhiteAccount1.account.address], [parseEther('40000')]])
        // console.log(await poolConrtact.read.UserInfos([owner.account.address]));
        console.log(formatEther(204529866175371810493n), formatEther(79853052870790211484n));
        allInfo = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount0.account.address])
        allInfo1 = await poolConrtact.read.getUserAllInfo([tokenWhiteAccount1.account.address])
        // console.log(allInfo);
        // console.log(allInfo1);
        // return;
        console.log("查询奖励");
        console.log("accShareRewards", await poolConrtact.read.accShareRewards());
        console.log("getDeposit tokenWhiteAccount0", await poolConrtact.read.getDeposit([tokenWhiteAccount0.account.address]));
        console.log("getDeposit tokenWhiteAccount1", await poolConrtact.read.getDeposit([tokenWhiteAccount1.account.address]));
        console.log("getDeposit owner", await poolConrtact.read.getDeposit([owner.account.address]));
        await time.increaseTo(BigInt((await time.latest()) + 31 * 60));

        console.log("触发产出奖励");

        await expect(tokenContract.write.approve([swapFactory.address, maxUint256]))
            .to.emit(poolConrtact, 'AddProduce');

        console.log("accShareRewards", await poolConrtact.read.accShareRewards());
        console.log("getDeposit tokenWhiteAccount0", await poolConrtact.read.getDeposit([tokenWhiteAccount0.account.address]));
        console.log("getDeposit tokenWhiteAccount1", await poolConrtact.read.getDeposit([tokenWhiteAccount1.account.address]));
        console.log("getDeposit owner", await poolConrtact.read.getDeposit([owner.account.address]));

        console.log("领取奖励前查看用户信息");

        // console.log(await poolConrtact.read.UserInfos([tokenWhiteAccount0.account.address]));
        // return;
        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));

        const white1Reward = await poolConrtact.read.getDeposit([tokenWhiteAccount1.account.address])
         /**验证最多4层经济商级差奖励开始 */

         const arr = [
            '0x2013dE79c7868fd50De86C544512563e9756671b',
            '0x575AC6beCC9eB9BC76791E3b97e5b08f9441c315',
            '0xA286F13e8E0C1C1a1fd101C3D44F9aDdBb735bba',
            '0xEbFEb40C1B1EB583e1EAeC0a844C21aca82c8bb3',
            '0x2933195BA36FA7ceE647fD6e02A617ecf94C4ed1',
            '0x266cFAA723B0F431998978223EC4d9eAcD03e57B',
            '0x4211F58A712b2b0042C27571E30C36cd1EA3E164',
            '0x6c9dfB7cfFC7A823394Fbeb65B56cFBF4621612A',
            '0x9377fd86E92e5AcB090Bc5491437657BdF90B158',
            '0x963176d1A22546F44Be99e137a58F13A811139Ee',
            '0x5F3Efe0241AB31c8f8748a2f5Cb56dDcEa07406f'
        ];
        // await fomoOranContract.write.upadteAddInvite([tokenWhiteAccount1.account.address, arr[0] as Hash,true])

        // for(var i = 0; i < arr.length - 1; i++) {
        //     await fomoOranContract.write.upadteAddInvite([(arr[i] as Hash), (arr[i+1] as Hash), i < 20 ? true : false])
        // }
        console.log('tokenWhiteAccount1',tokenWhiteAccount1.account.address,await white0OriContract.read.presenter([tokenWhiteAccount1.account.address]));
        for(var i = 0; i < arr.length; i++) {
            console.log(arr[i],await Organization.read.presenter([arr[i] as Hash]));
        }

        let statkeConfig = [
            [true,1n],
            [true,1n],
            [false,2n],
            [false,3n],
            [false,5n],
            [true,6n],
            [true,7n],
            [true,8n],
            [false,9n],
            [false,10n],
            [false,8n],
        ]

        // for(var i = 0; i < arr.length; i++) {
        //     console.log((arr[i] as Hash),statkeConfig[i][0] as boolean,0n, statkeConfig[i][1] as bigint);
        //     await fomoOranContract.write.updateStakeInfo([(arr[i] as Hash),statkeConfig[i][0] as boolean,0n, statkeConfig[i][1] as bigint])
        // }

        for(var i = 0; i < arr.length; i++) {
            console.log(arr[i],await fomoOranContract.read.isStaked([(arr[i] as Hash)]));
        }

        /**验证最多4层经济商级差奖励结束 */

        await white1PoolContract.write.extract([white1Reward])
        console.log(formatEther(white1Reward));

        // return;
        await expect(await tokenContract.read.balanceOf([tokenWhiteAccount1.account.address])).equal(white1Reward)

        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));
        console.log("tokenWhiteAccount1Bal", await tokenContract.read.balanceOf([tokenWhiteAccount1.account.address]));

        // await white1TokenContract.write.transfer([tokenWhiteAccount0.account.address,parseEther('1')])
        // await expect(white1TokenContract.write.transfer([tokenWhiteAccount0.account.address,parseEther('1')]))
        //     .to.emit(poolConrtact, 'AddProduce');
        // return;
        // await white0PoolContract.write.extract([white1Reward])

        // return;
        console.log("creator", await tokenContract.read.creator());
        console.log(await Ownable.read.brokerMap([await tokenContract.read.creator()]));
        // await Ownable.write.setBrokerLevel([owner.account.address,1n])
        console.log("开始验证买卖税到池子里面");
        console.log("sellFeeContract", await tokenContract.read.balanceOf([sellFeeContract.address]));
        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));

        console.log(formatEther(await USDTContract.read.balanceOf([tokenWhiteAccount1.account.address])));
        console.log(formatEther(await USDTContract.read.balanceOf([tokenWhiteAccount0.account.address])));
        // await Ownable.write.includeInFee([tokenContract.address, tokenWhiteAccount0.account.address])

        const path = [WETH.address, tokenContract.address] as const;
        await white0RouterContract.write.swapExactETHForTokens([
            1n,
            path,
            tokenWhiteAccount1.account.address,
            BigInt(await time.latest()) + 100000n,
        ], {
            value: parseEther('100')
        });
        console.log("sellFeeContract", await tokenContract.read.balanceOf([sellFeeContract.address]));
        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));
        console.log("tokenWhiteAccount1", await tokenContract.read.balanceOf([tokenWhiteAccount1.account.address]));


        console.log(await tokenContract.read.allowance([tokenWhiteAccount1.account.address,swapRouter.address]));
        // return;

        console.log(formatEther(await publicClient.getBalance({
            address:tokenWhiteAccount1.account.address
        })));

        await white1RouterContract.write.swapExactTokensForETHSupportingFeeOnTransferTokens([
            parseEther('0.00001'),
            1n,
            [tokenContract.address, WETH.address],
            tokenWhiteAccount1.account.address,
            BigInt(await time.latest()) + 100000n,
        ]);
         console.log(formatEther(await publicClient.getBalance({
            address:tokenWhiteAccount1.account.address
        })));

        return;

        console.log("sellFeeContract", formatEther(await tokenContract.read.balanceOf([sellFeeContract.address])));
        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount0.account.address]));
        await expect(sellFeeContract.write.claim([tokenAddress])).rejectedWith('Err');
        await sellFeeContract.write.setOwnerContract([Ownable.address])
        await sellFeeContract.write.claim([tokenAddress])
        return;
        await expect(sellFeeContract.write.claim([tokenAddress])).rejectedWith('Err');
        // return;
        console.log("买币");


        await white0RouterContract.write.swapExactETHForTokens([
            // parseEther('100'),
            1n,
            path,
            tokenWhiteAccount0.account.address,
            BigInt(await time.latest()) + 100000n,
        ], {
            value: parseEther('100')
        });
        console.log(await Ownable.read.brokerBuySellFeeRate());

        console.log("sellFeeContract", await tokenContract.read.balanceOf([sellFeeContract.address]));
        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount2.account.address]));
        const whiteSellContract = await viem.getContractAt('contracts/IRO.sol:IROSellFeeContract', sellFeeAddress, {
            client: {
                wallet: tokenWhiteAccount2
            }
        })

        await expect(whiteSellContract.write.claim([tokenAddress])).rejectedWith('Err')
        await time.increaseTo(BigInt((await time.latest()) + 31 * 60));

        await sellFeeContract.write.claim([tokenAddress])
        // return;

        console.log("sellFeeContract", formatEther(await tokenContract.read.balanceOf([sellFeeContract.address])));
        console.log("tokenWhiteAccount0Bal", await tokenContract.read.balanceOf([tokenWhiteAccount2.account.address]));
        await expect(sellFeeContract.write.claim([tokenAddress])).rejectedWith('Err');

    })

    it("验证暂存贡献值合约", async () => {
        let { publicClient, vaultContract, feeTo, USDTContract, pledgeTo } = await loadFixture(deployContract);

        const codeHash = keccak256(await publicClient.getBytecode({
            address: vaultContract.address
        }) as Hash)
        console.log(vaultContract.address, "keccak256", codeHash);

        console.log(await vaultContract.read.codeHash());

        expect(codeHash).equals(await vaultContract.read.codeHash())
    })

})