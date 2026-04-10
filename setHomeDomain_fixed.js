const StellarSDK = require("@stellar/stellar-sdk");

/**
 * ⚠️ 注意：Stellar SDK 的 Keypair.fromSecret() 接收的是以 'S' 开头的密钥字符串。
 * 您提供的是助记词（Mnemonic），需要先将其转换为种子（Seed）。
 * 为了简单起见，这里先放回您的原始助记词。
 * 如果您要运行此脚本，请使用转换后的 Secret Key。
 */

// Pi 测试网配置
const server = new StellarSDK.Horizon.Server("https://api.testnet.minepi.com");
const NETWORK_PASSPHRASE = "Pi Testnet";

// 已恢复原始助记词
const issuerSecret = "aware enter birth glad arch emerge release two nasty mass coast about thumb sick biology ivory tide craft wolf thrive congress purse attend trouble";

// 要绑定的域名
const HOME_DOMAIN = "b7f3mh.space"; // 通常不带 https://，只填域名

async function main() {
  try {
    // 验证密钥格式
    if (!issuerSecret.startsWith('S')) {
      console.warn("⚠️ 警告: issuerSecret 看起来不是以 'S' 开头的密钥。如果是助记词，直接运行会报错。");
    }

    const issuerKeypair = StellarSDK.Keypair.fromSecret(issuerSecret);
    const issuerPublic = issuerKeypair.publicKey();

    console.log("Issuer:", issuerPublic);

    // 1. 加载发行者账户
    console.log("正在加载发行者账号...");
    const account = await server.loadAccount(issuerPublic);

    // 2. 获取当前网络费用
    const response = await server.ledgers().order("desc").limit(1).call();
    const latestBlock = response.records[0];
    const baseFee = latestBlock.base_fee_in_stroops || 100;
    const customFee = (parseInt(baseFee) * 2).toString(); // 使用 2 倍基础费用
    console.log("基础费用(stroops):", baseFee, "实际使用费用:", customFee);

    // 3. 构建设置 homeDomain 的交易
    console.log(`正在设置 Home Domain 为: ${HOME_DOMAIN}...`);
    const tx = new StellarSDK.TransactionBuilder(account, {
      fee: customFee,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSDK.Operation.setOptions({
          homeDomain: HOME_DOMAIN,
        })
      )
      .setTimeout(180)
      .build();

    // 4. 签名
    tx.sign(issuerKeypair);

    // 5. 提交交易
    console.log("正在提交交易...");
    const result = await server.submitTransaction(tx);
    console.log("✅ Home domain 已成功设置！");
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
