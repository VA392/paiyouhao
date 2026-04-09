// Pi Network SDK 初始化配置
// 📌 重要：请替换为你在 Pi 开发者平台申请的真实 API Key 和 App ID

declare global {
  interface Window {
    Pi: any;
  }
}

/**
 * 初始化 Pi SDK
 * @returns boolean 初始化是否成功
 */
export const initPiSDK = () => {
  if (window.Pi) {
    window.Pi.init({
      version: "2.0",
      sandbox: true, // 测试环境设为 true，正式上线改为 false
      apiKey: "oqjbmfgxgmt3gv9doqbdovo6bpdbsvuckwqkhruvehk9lbgizov5nrdcefvloq0i", // Pi API Key
      appId: "b99e254c06f37a78"    // Pi App ID
    });
    
    console.log("✅ Pi Network SDK 已初始化");
    return true;
  } else {
    console.warn("⚠️ Pi Network SDK 未加载，请检查网络连接或 SDK 引入方式");
    return false;
  }
};

/**
 * 获取当前 Pi 用户信息
 */
export const getPiUser = async () => {
  try {
    const user = await window.Pi.authenticate();
    console.log("👤 Pi 用户信息:", user);
    return user;
  } catch (error) {
    console.error("❌ 获取 Pi 用户失败:", error);
    return null;
  }
};

/**
 * 发起 Pi 支付 (Pi SDK v2)
 * 📌 支付流程：
 * 1. 客户端发起 createPayment
 * 2. 支付就绪后，回调 onReadyForServerApproval
 * 3. 你的服务器端调用 Pi API 批准支付
 * 4. 支付完成后，回调 onReadyForServerCompletion
 * 5. 你的服务器端调用 Pi API 完成支付
 */
export const createPiPayment = async (paymentData: {
  amount: number;
  memo: string;
  metadata?: Record<string, any>;
  onSuccess?: (payment: any) => void;
  onCancel?: (paymentId: string) => void;
  onError?: (error: Error, payment?: any) => void;
}) => {
  try {
    const payment = await window.Pi.createPayment({
      amount: paymentData.amount,
      memo: paymentData.memo,
      metadata: paymentData.metadata || {},
    }, {
      // 步骤 2: 当支付就绪时，需要你的后端去批准这个支付
      onReadyForServerApproval: (paymentId: string) => {
        console.log("🚀 支付待服务器批准, ID:", paymentId);
        // 这里必须向你的后端发送请求，后端调用 Pi API 进行批准
        // fetch('/api/approve-payment', { method: 'POST', body: JSON.stringify({ paymentId }) });
      },
      // 步骤 4: 支付被用户批准后，由你的后端完成该笔交易
      onReadyForServerCompletion: (paymentId: string, txid: string) => {
        console.log("✅ 支付已完成, TXID:", txid);
        if (paymentData.onSuccess) paymentData.onSuccess({ paymentId, txid });
      },
      onCancel: (paymentId: string) => {
        console.log("🛑 支付已取消, ID:", paymentId);
        if (paymentData.onCancel) paymentData.onCancel(paymentId);
      },
      onError: (error: Error, payment?: any) => {
        console.error("❌ 支付出错:", error, payment);
        if (paymentData.onError) paymentData.onError(error, payment);
      }
    });
    
    return payment;
  } catch (error) {
    console.error("❌ 创建 Pi 支付失败:", error);
    return null;
  }
};

/**
 * 检查 SDK 是否就绪
 */
export const isPiSDKReady = (): boolean => {
  return typeof window.Pi !== 'undefined' && window.Pi.init !== undefined;
};
