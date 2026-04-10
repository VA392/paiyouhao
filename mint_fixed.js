const StellarSdk = require("@stellar/stellar-sdk");

/**
 * ⚠️ 注意：Stellar SDK 的 Keypair.fromSecret() 接收的是以 'S' 开头的密钥字符串。
 * 您提供的是助记词（Mnemonic），需要先将其转换为种子（Seed）。
 * 为了简单起见，这里先放回您的原始助记词。
 * 如果您要运行此脚本，请使用转换后的 Secret Key。
 */

// Pi 测试网配置
const server = new StellarSdk.Horizon.Server("https://api.testnet.minepi.com");
const NETWORK_PASSPHRASE = "Pi Testnet";

// 已恢复原始助记词
const issuerSecret = "SC2UWPGWPPP7RHMJ5LS6KD6EYDQFWHOYCREGZEK2346LSVMCQIB6F76I";
// 注意：原脚本中 distributorPublic 填写的也是助记词，这在逻辑上可能需要改为公钥
const distributorPublic = "GD7RUMSLWDZSDKB53R63MO25GYG7FNEJAK7L7UJNMZ4ESJOIU6AXX3NM";

// Token 信息
const ASSET_CODE = "paiyouhao";
const AMOUNT = "934444443987";  // 发行数量

async function main() {
  try {
    // 验证密钥格式
    if (!issuerSecret.startsWith('S')) {
      console.warn("⚠️ 警告: issuerSecret 看起来不是以 'S' 开头的密钥。如果是助记词，直接运行会报错。");
    }

    const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecret);
    const issuerPublic = issuerKeypair.publicKey();

    console.log("Issuer:", issuerPublic);
    console.log("Distributor:", distributorPublic);

    // 1. 加载发行者账户
    console.log("正在加载发行者账号...");
    const issuerAccount = await server.loadAccount(issuerPublic);

    // 2. 获取最新区块的手续费
    const latest = await server.ledgers().order("desc").limit(1).call();
    const latestBlock = latest.records[0];
    const baseFee = latestBlock.base_fee_in_stroops || 100;
    const customFee = (parseInt(baseFee) * 2).toString(); // 使用 2 倍基础费用
    console.log("基础费用(stroops):", baseFee, "实际使用费用:", customFee);

    // 3. 创建资产对象
    const asset = new StellarSdk.Asset(ASSET_CODE, issuerPublic);

    // 4. 构建支付操作（铸币 = 发行者转账给分发者）
    console.log(`正在构建铸造交易: 发行 ${AMOUNT} 个 ${ASSET_CODE}...`);
    const paymentOp = StellarSdk.Operation.payment({
      destination: distributorPublic,
      asset: asset,
      amount: AMOUNT,
    });

    const tx = new StellarSdk.TransactionBuilder(issuerAccount, {
      fee: customFee,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(paymentOp)
      .setTimeout(180)
      .build();

    // 5. 签名
    tx.sign(issuerKeypair);

    // 6. 提交交易
    console.log("正在提交交易...");
    const result = await server.submitTransaction(tx);
    console.log(`✅ ${ASSET_CODE} 铸造成功！`);
    console.log("交易哈希:", result.hash);

  } catch (err) {
    // 详细打印错误信息
    if (err.response && err.response.data) {
      console.error("❌ 提交失败:", JSON.stringify(err.response.data.extras.result_codes));
    } else {
      console.error("❌ 错误:", err.message || err);
    }
  }
}

main();
