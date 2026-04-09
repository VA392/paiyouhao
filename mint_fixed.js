const StellarSdk = require("@stellar/stellar-sdk");

/**
 * 注意：Stellar SDK 的 Keypair.fromSecret() 接收的是以 'S' 开头的密钥字符串。
 * 如果你使用的是助记词（Mnemonic），需要先将其转换为种子（Seed）。
 */

// Pi 测试网配置
const server = new StellarSdk.Horizon.Server("https://api.testnet.minepi.com");
const NETWORK_PASSPHRASE = "Pi Testnet";

// ⚠️ 警告：请确保这里填入的是以 'S' 开头的 Secret Key，而不是助记词字符串
// 如果必须使用助记词，需要额外引入处理助记词的库（如 bip39）
const issuerSecret = "YOUR_ISSUER_SECRET_KEY"; 
const distributorPublic = "GCFX2NHHA7NCB4FBKHCZCVCXMGCNV25EPCK4UZNKEE4HSNDPBZ66SPMN";

// Token 信息
const ASSET_CODE = "paiyouhao";
const AMOUNT = "934444443987";  // 发行数量

async function main() {
  try {
    // 验证密钥格式
    if (!issuerSecret.startsWith('S')) {
      throw new Error("issuerSecret 必须是以 'S' 开头的 Stellar 密钥。如果你使用的是助记词，请先转换。");
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
