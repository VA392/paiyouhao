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

// 已恢复原始助记词（请注意：这些字符串不能直接传给 fromSecret，除非它们是真正的 Secret Key）
const issuerSecret = "SC2UWPGWPPP7RHMJ5LS6KD6EYDQFWHOYCREGZEK2346LSVMCQIB6F76I";
const distributorSecret = "SDFNSQCHBYOFYU4ZS2KEIG47JOY7HELITCS64TN25IOBQANM5KBOHIQQ";

const issuerPublic = "GCFX2NHHA7NCB4FBKHCZCVCXMGCNV25EPCK4UZNKEE4HSNDPBZ66SPMN";
const distributorPublic = "GD7RUMSLWDZSDKB53R63MO25GYG7FNEJAK7L7UJNMZ4ESJOIU6AXX3NM";

// 想要的代币代码（<= 12 位字母数字）
const ASSET_CODE = "paiyouhao";

async function main() {
  try {
    console.log("Issuer:", issuerPublic);
    console.log("Distributor:", distributorPublic);

    // 验证密钥格式（简单检查）
    if (!distributorSecret.startsWith('S')) {
      console.warn("⚠️ 警告: distributorSecret 看起来不是以 'S' 开头的密钥。如果是助记词，直接运行会报错。");
    }

    const distributorKeypair = StellarSdk.Keypair.fromSecret(distributorSecret);

    // 1. 加载分发者账号
    console.log("正在加载分发者账号...");
    const distributorAccount = await server.loadAccount(distributorPublic);

    // 2. 获取当前网络费用
    const response = await server.ledgers().order("desc").limit(1).call();
    const latestBlock = response.records[0];
    const baseFee = latestBlock.base_fee_in_stroops || 100;
    const customFee = (parseInt(baseFee) * 2).toString(); // 使用 2 倍基础费用
    console.log("基础费用(stroops):", baseFee, "实际使用费用:", customFee);

    // 3. 创建信任线操作
    const asset = new StellarSdk.Asset(ASSET_CODE, issuerPublic);
    const trustOp = StellarSdk.Operation.changeTrust({
      asset,
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
