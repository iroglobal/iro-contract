import { parseEther } from "viem";

export const IRP_CONFIG = {
    FEE_AMOUNT: parseEther('0.1'),
    // tokenInfo: {
    //     totalSupply: parseEther('21000000000'),
    //     initPrice: parseEther('0.000005'),
    //     name: 'AAA',
    //     symbol: 'AAA',
    //     payAmount: parseEther('300'),
    // }

    tokenInfo: {
        totalSupply: parseEther('210000000'),
        initPrice: parseEther('0.005'),
        name: 'AAA',
        symbol: 'AAA',
        payAmount: parseEther('300'),
        softCap:parseEther('10000') ,
         tradingLimit:    parseEther('50000')
    },
    // 小额XOC版本
    // tokenInfo: {
    //     totalSupply: parseEther('10'),
    //     initPrice: parseEther('0.1'),
    //     name: 'AAA',
    //     symbol: 'AAA',
    //     softCap: parseEther('0.1'),
    //     tradingLimit: parseEther('0.2'),
    //     secendSub:parseEther('0.4'),
    //     createFee:parseEther('0.1')

    // },
    contracts:{
        WXOC:"0x34c2E220FC8474eFCFb2973047B82d11F97D9E25",
        swapFactory:"0xCE0fbec27B6F2A01F6f0cdb8F0eB5E6fd82ee4bB",
        initCodeHash:"0x696f94fb57449ab8f9c392242a90bc20165d2b851add445735323ad120c0e5be",
        swapRouter:"0x2eB1975ddA74f24C57664219EF40702e21ba40d8",
        USDX:"0xA6093C0dEF2b05c29D896a26aD56827D54c2a101",
        vaultContract:"0x23646B836eeF43030e884f9EfEa039d686E57ECF",
        ORGANIZATION:"0x44087Bb33EF384D9c7986184F12D94CF57498676",
        sellFeeContract:"0x35C776C4C6bb0361316A9B2C171b3c39B38be4Ef",
        multicallContract:"0xB0496b5A7c53f4165418fDBcff6D5d848dE9A1d0",
        OwnableContract:"0x6c873650F36c9F5CbD7faED2Afe42A24989eeB76",
        IROFactory:"0xc7cf916fa4905bedEA93F2ec7b89D2c9d714DF97",
    }
}