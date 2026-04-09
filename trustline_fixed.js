const StellarSdk = require("@stellar/stellar-sdk");

/**
 * 注意：Stellar SDK 的 Keypair.fromSecret() 接收的是以 'S' 开头的密钥字符串。
 * 如果你使用的是助记词（Mnemonic），需要先将其转换为种子（Seed）。
 * 为了简单起见，这里假设你使用的是密钥。如果是助记词，请使用 bip39 和 stellar-hd-wallet 库转换。
 */

// Pi 测试网配置
const server = new StellarSdk.Horizon.Server("https://api.testnet.minepi.com");
const NETWORK_PASSPHRASE = "Pi Testnet";

// ⚠️ 警告：请确保这里填入的是以 'S' 开头的 Secret Key，而不是助记词字符串
// 如果必须使用助记词，需要额外引入处理助记词的库
const issuerSecret = "YOUR_ISSUER_SECRET_KEY"; 
const distributorSecret = "YOUR_DISTRIBUTOR_SECRET_KEY";

const issuerPublic = "GD7RUMSLWDZSDKB53R63MO25GYG7FNEJAK7L7UJNMZ4ESJOIU6AXX3NM";
const distributorPublic = "GCFX2NHHA7NCB4FBKHCZCVCXMGCNV25EPCK4UZNKEE4HSNDPBZ66SPMN";

// 想要的代币代码（<= 12 位字母数字）
const ASSET_CODE = "paiyouhao";

async function main() {
  try {
    console.log("Issuer:", issuerPublic);
    console.log("Distributor:", distributorPublic);

    // 验证密钥格式（简单检查）
    if (!distributorSecret.startsWith('S')) {
      throw new Error("distributorSecret 必须是以 'S' 开头的 Stellar 密钥。如果你使用的是助记词，请先转换。");
    }

    const distributorKeypair = StellarSdk.Keypair.fromSecret(distributorSecret);

    // 1. 加载分发者账号
    console.log("正在加载分发者账号...");
    const distributorAccount = await server.loadAccount(distributorPublic);

    // 2. 获取当前网络费用（建议在 base fee 基础上增加一点以确保交易成功）
    const response = await server.ledgers().order("desc").limit(1).call();
    const latestBlock = response.records[0];
    const baseFee = latestBlock.base_fee_in_stroops || 100;
    const customFee = (parseInt(baseFee) * 2).toString(); // 使用 2 倍基础费用
    console.log("基础费用(stroops):", baseFee, "实际使用费用:", customFee);

    // 3. 创建信任线操作
    const asset = new StellarSdk.Asset(ASSET_CODE, issuerPublic);
    const trustOp = StellarSdk.Operation.changeTrust({
      asset,
      // limit: "1000000000" // 可选：设置信任上限，不填默认为最大值
    });

    // 4. 构建交易
    const tx = new StellarSdk.TransactionBuilder(distributorAccount, {
      fee: customFee,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(trustOp)
      .setTimeout(180)
      .build();

    // 5. 签名
    tx.sign(distributorKeypair);

    // 6. 提交交易
    console.log("正在提交交易...");
    const result = await server.submitTransaction(tx);
    console.log(`✅ ${ASSET_CODE} 信任线创建成功！`);
    console.log("交易哈希:", result.hash);
  } catch (e) {
    // 详细打印错误信息
    if (e.response && e.response.data) {
      console.error("❌ 提交失败:", JSON.stringify(e.response.data.extras.result_codes));
    } else {
      console.error("❌ 错误:", e.message || e);
    }
  }
}

main();
